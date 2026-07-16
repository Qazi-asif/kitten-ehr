import prisma from '../lib/prisma.js';
import { paginatedResponse, parsePagination, wantsPagination } from '../utils/pagination.js';
import { buildContractAgreementText, getAgreementTemplateBySlug } from '../utils/contractAgreementText.js';
import { sendContractAgreementEmail, sendSignedContractPdfEmail } from '../services/emailService.js';
import { getClientIp } from '../utils/requestIp.js';
import { generateContractPdf, storeContractPdf } from '../utils/contractPdf.js';

const CONTRACT_INCLUDE = {
  application: {
    select: { id: true, type: true, status: true, kittenOfInterest: true },
  },
  kitten: {
    select: { id: true, name: true, microchipNumber: true, status: true },
  },
  foster: {
    select: { id: true, name: true, email: true },
  },
  householdAcknowledgments: {
    select: { id: true, name: true, signatureImageUrl: true, signedAt: true },
  },
};

// List-only projection (GET /contracts, used by ContractsPage's table and
// PersonContractsSection's linked/fuzzy lookups) - deliberately a `select`,
// not `include`, so it does NOT inherit every scalar field the way
// CONTRACT_INCLUDE does. Omits signatureImageUrl, signedPdfUrl,
// frozenAgreementText, signatureAudit (all can carry a full base64
// image/PDF/text blob per row - see contractPdf.js's base64 fallback, used
// since S3/R2 isn't configured) and householdAcknowledgments.signatureImageUrl,
// none of which the list view ever displays. pdfUrl IS selected here, but
// only to compute the `hasPdf` boolean below - the raw value is stripped
// before the response goes out via toContractListItem(). Every other
// endpoint (getContractById, createContractDraft, updateContract,
// markContractSigned, emailContractAgreement, emailSignedPdf) keeps using
// CONTRACT_INCLUDE unchanged - they operate on one contract at a time and
// genuinely need the full record, and getContractById is what
// ContractsPage's "View" modal now always calls fresh (see
// ContractsPage.jsx) instead of reusing a list row.
const CONTRACT_LIST_SELECT = {
  id: true,
  type: true,
  templateSlug: true,
  signerName: true,
  signerEmail: true,
  signerAddress: true,
  signerPhone: true,
  microchipNumber: true,
  kittenName: true,
  kittenId: true,
  fosterId: true,
  applicationId: true,
  emergencyContactName: true,
  emergencyContactPhone: true,
  documentVersion: true,
  signerNameAtSigning: true,
  signedIpAddress: true,
  status: true,
  signedAt: true,
  createdAt: true,
  pdfUrl: true,
  application: {
    select: { id: true, type: true, status: true, kittenOfInterest: true },
  },
  kitten: {
    select: { id: true, name: true, microchipNumber: true, status: true },
  },
  foster: {
    select: { id: true, name: true, email: true },
  },
  householdAcknowledgments: {
    select: { id: true, name: true, signedAt: true },
  },
};

// Replaces the (possibly huge) raw pdfUrl with a lightweight boolean before
// the list response is serialized - the only thing the UI checks is
// truthiness (to enable/disable the "Email Signed PDF" button), it never
// renders the value itself.
function toContractListItem(contract) {
  const { pdfUrl, ...rest } = contract;
  return { ...rest, hasPdf: Boolean(pdfUrl) };
}

const VALID_TEMPLATE_SLUGS = new Set([
  'foster_supplies_provided',
  'foster_supplies_not_provided',
  'adoption',
]);

async function resolveTemplate(templateSlug, fallbackType = 'FOSTER') {
  if (templateSlug) {
    try {
      const template = await getAgreementTemplateBySlug(templateSlug);
      if (template) {
        return { templateSlug: template.slug, type: template.type };
      }
    } catch {
      // fall through to legacy defaults
    }
  }

  const slug = VALID_TEMPLATE_SLUGS.has(templateSlug)
    ? templateSlug
    : (fallbackType === 'ADOPTION' ? 'adoption' : 'foster_supplies_provided');

  return {
    templateSlug: slug,
    type: slug === 'adoption' ? 'ADOPTION' : 'FOSTER',
  };
}

function parseSignatureAudit(raw) {
  if (!raw) return {};
  if (typeof raw === 'object') return raw;
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function buildContractWhere(query) {
  const { search, status, dateFrom, dateTo, dateField, signedOnly, kittenId, applicationId, fosterId } = query;
  const where = {};

  if (status && ['SENT', 'SIGNED', 'VOID'].includes(status)) {
    where.status = status;
  } else if (signedOnly === 'true') {
    where.status = 'SIGNED';
  }

  const parsedKittenId = Number.parseInt(kittenId, 10);
  if (Number.isInteger(parsedKittenId)) {
    where.kittenId = parsedKittenId;
  }

  // Exact relational filters - deliberately separate from the fuzzy `search`
  // OR-match below. Used by PersonContractsSection to fetch the trusted,
  // genuinely-linked list for a specific Application or Foster record,
  // rather than relying on an email text match that can pull in unrelated
  // contracts that merely share a signerEmail.
  const parsedApplicationId = Number.parseInt(applicationId, 10);
  if (Number.isInteger(parsedApplicationId)) {
    where.applicationId = parsedApplicationId;
  }

  const parsedFosterId = Number.parseInt(fosterId, 10);
  if (Number.isInteger(parsedFosterId)) {
    where.fosterId = parsedFosterId;
  }

  const trimmedSearch = search?.trim();
  if (trimmedSearch) {
    where.OR = [
      { kittenName: { contains: trimmedSearch, mode: 'insensitive' } },
      { signerName: { contains: trimmedSearch, mode: 'insensitive' } },
      { signerEmail: { contains: trimmedSearch, mode: 'insensitive' } },
      { kitten: { name: { contains: trimmedSearch, mode: 'insensitive' } } },
      { application: { kittenOfInterest: { contains: trimmedSearch, mode: 'insensitive' } } },
    ];
  }

  const field = dateField === 'signed' ? 'signedAt' : 'createdAt';
  if (dateFrom || dateTo) {
    where[field] = {};
    if (dateFrom) where[field].gte = new Date(`${dateFrom}T00:00:00.000Z`);
    if (dateTo) where[field].lte = new Date(`${dateTo}T23:59:59.999Z`);
  }

  return where;
}

export async function getContracts(req, res, next) {
  try {
    const where = buildContractWhere(req.query);

    if (!wantsPagination(req.query)) {
      const contracts = await prisma.contract.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        select: CONTRACT_LIST_SELECT,
        take: 100,
      });
      return res.json(contracts.map(toContractListItem));
    }

    const { page, limit, skip } = parsePagination(req.query, 50);
    const [total, contracts] = await Promise.all([
      prisma.contract.count({ where }),
      prisma.contract.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        select: CONTRACT_LIST_SELECT,
        skip,
        take: limit,
      }),
    ]);

    return res.json(paginatedResponse(contracts.map(toContractListItem), total, page, limit));
  } catch (error) {
    next(error);
  }
}

export async function getContractStats(_req, res, next) {
  try {
    const [total, sent, signed, voided, recentSigned] = await Promise.all([
      prisma.contract.count(),
      prisma.contract.count({ where: { status: 'SENT' } }),
      prisma.contract.count({ where: { status: 'SIGNED' } }),
      prisma.contract.count({ where: { status: 'VOID' } }),
      prisma.contract.findMany({
        where: { status: 'SIGNED' },
        orderBy: { signedAt: 'desc' },
        take: 5,
        select: {
          id: true,
          type: true,
          signerName: true,
          kittenName: true,
          status: true,
          signedAt: true,
          createdAt: true,
        },
      }),
    ]);

    res.json({ total, sent, signed, void: voided, recentSigned });
  } catch (error) {
    next(error);
  }
}

export async function getContractById(req, res, next) {
  try {
    const id = Number.parseInt(req.params.id, 10);
    const contract = await prisma.contract.findUnique({
      where: { id },
      include: CONTRACT_INCLUDE,
    });

    if (!contract) return res.status(404).json({ error: 'Contract not found' });

    const agreementText = await buildContractAgreementText(contract);
    res.json({ ...contract, agreementText });
  } catch (error) {
    next(error);
  }
}

export async function createContractDraft(req, res, next) {
  try {
    const {
      type,
      templateSlug,
      signerName,
      signerEmail,
      signerAddress,
      signerPhone,
      microchipNumber,
      kittenName,
      kittenId,
      fosterId,
      applicationId,
      emergencyContactName,
      emergencyContactPhone,
      documentVersion,
    } = req.body;

    const resolvedTemplate = await resolveTemplate(templateSlug, type);
    if (!signerName?.trim()) return res.status(400).json({ error: 'signerName is required' });
    if (!signerEmail?.trim()) return res.status(400).json({ error: 'signerEmail is required' });

    let resolvedKittenName = kittenName?.trim() || '';
    let resolvedKittenId = kittenId ? Number.parseInt(kittenId, 10) : null;
    let resolvedFosterId = fosterId ? Number.parseInt(fosterId, 10) : null;
    let resolvedApplicationId = applicationId ? Number.parseInt(applicationId, 10) : null;

    if (resolvedKittenId) {
      const kitten = await prisma.kitten.findUnique({
        where: { id: resolvedKittenId },
        select: { name: true, microchipNumber: true },
      });
      if (!kitten) return res.status(400).json({ error: 'kittenId not found' });
      if (!resolvedKittenName) resolvedKittenName = kitten.name;
    }

    if (resolvedFosterId) {
      const foster = await prisma.foster.findUnique({
        where: { id: resolvedFosterId },
        select: { id: true },
      });
      if (!foster) return res.status(400).json({ error: 'fosterId not found' });
    }

    if (resolvedApplicationId) {
      const application = await prisma.application.findUnique({
        where: { id: resolvedApplicationId },
        select: { id: true },
      });
      if (!application) return res.status(400).json({ error: 'applicationId not found' });
    }

    const contract = await prisma.contract.create({
      data: {
        type: resolvedTemplate.type,
        templateSlug: resolvedTemplate.templateSlug,
        signerName: signerName.trim(),
        signerEmail: signerEmail.trim(),
        signerAddress: signerAddress?.trim() || '',
        signerPhone: signerPhone?.trim() || '',
        microchipNumber: microchipNumber?.trim() || '',
        kittenName: resolvedKittenName,
        kittenId: resolvedKittenId,
        fosterId: resolvedFosterId,
        applicationId: resolvedApplicationId,
        emergencyContactName: emergencyContactName?.trim() || '',
        emergencyContactPhone: emergencyContactPhone?.trim() || '',
        documentVersion: documentVersion?.trim() || '2026.1',
        status: 'SENT',
      },
      include: CONTRACT_INCLUDE,
    });

    res.status(201).json(contract);
  } catch (error) {
    next(error);
  }
}

export async function updateContract(req, res, next) {
  try {
    const id = Number.parseInt(req.params.id, 10);
    const existing = await prisma.contract.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Contract not found' });

    if (existing.status !== 'SENT') {
      return res.status(400).json({ error: 'Only pending (SENT) contracts can be edited' });
    }

    const {
      type,
      templateSlug,
      signerName,
      signerEmail,
      signerAddress,
      signerPhone,
      microchipNumber,
      kittenName,
      kittenId,
      fosterId,
      documentVersion,
      status,
    } = req.body;

    const data = {};

    if (templateSlug !== undefined) {
      const resolvedTemplate = await resolveTemplate(templateSlug, type || existing.type);
      data.templateSlug = resolvedTemplate.templateSlug;
      data.type = resolvedTemplate.type;
    } else if (type !== undefined) {
      const resolvedTemplate = await resolveTemplate(existing.templateSlug, type);
      data.type = resolvedTemplate.type;
    }
    if (signerName !== undefined) {
      if (!signerName?.trim()) return res.status(400).json({ error: 'signerName is required' });
      data.signerName = signerName.trim();
    }
    if (signerEmail !== undefined) {
      if (!signerEmail?.trim()) return res.status(400).json({ error: 'signerEmail is required' });
      data.signerEmail = signerEmail.trim();
    }
    if (signerAddress !== undefined) data.signerAddress = signerAddress.trim();
    if (signerPhone !== undefined) data.signerPhone = signerPhone.trim();
    if (microchipNumber !== undefined) data.microchipNumber = microchipNumber.trim();
    if (documentVersion !== undefined) {
      if (!documentVersion?.trim()) return res.status(400).json({ error: 'documentVersion is required' });
      data.documentVersion = documentVersion.trim();
    }
    if (kittenName !== undefined) data.kittenName = kittenName.trim();
    if (fosterId !== undefined) {
      const parsedFosterId = fosterId ? Number.parseInt(fosterId, 10) : null;
      if (parsedFosterId) {
        const foster = await prisma.foster.findUnique({
          where: { id: parsedFosterId },
          select: { id: true },
        });
        if (!foster) return res.status(400).json({ error: 'fosterId not found' });
        data.fosterId = parsedFosterId;
      } else {
        data.fosterId = null;
      }
    }
    if (kittenId !== undefined) {
      const parsedKittenId = kittenId ? Number.parseInt(kittenId, 10) : null;
      if (parsedKittenId) {
        const kitten = await prisma.kitten.findUnique({
          where: { id: parsedKittenId },
          select: { name: true, microchipNumber: true },
        });
        if (!kitten) return res.status(400).json({ error: 'kittenId not found' });
        data.kittenId = parsedKittenId;
        if (!kittenName?.trim()) data.kittenName = kitten.name;
      } else {
        data.kittenId = null;
      }
    }
    if (status === 'VOID') data.status = 'VOID';

    const contract = await prisma.contract.update({
      where: { id },
      data,
      include: CONTRACT_INCLUDE,
    });

    res.json(contract);
  } catch (error) {
    if (error.code === 'P2025') return res.status(404).json({ error: 'Contract not found' });
    next(error);
  }
}

export async function deleteContract(req, res, next) {
  try {
    const id = Number.parseInt(req.params.id, 10);
    const existing = await prisma.contract.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Contract not found' });

    if (existing.status === 'SIGNED') {
      return res.status(400).json({ error: 'Signed contracts cannot be deleted. Void the contract instead.' });
    }

    await prisma.contract.delete({ where: { id } });
    res.status(204).send();
  } catch (error) {
    if (error.code === 'P2025') return res.status(404).json({ error: 'Contract not found' });
    next(error);
  }
}

export async function markContractSigned(req, res, next) {
  try {
    const id = Number.parseInt(req.params.id, 10);
    const {
      signatureImage,
      signedAt,
      signedPdfUrl,
      signatureAudit,
      householdAcknowledgments,
    } = req.body;

    const existing = await prisma.contract.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Contract not found' });

    if (existing.status === 'VOID') {
      return res.status(400).json({ error: 'Cannot sign a void contract' });
    }

    if (existing.status === 'SIGNED') {
      return res.status(400).json({ error: 'Contract is already signed' });
    }

    const resolvedSignature = signatureImage || signedPdfUrl || '';
    if (!resolvedSignature?.startsWith('data:')) {
      return res.status(400).json({ error: 'signatureImage is required' });
    }

    // Server-derived only. A client-supplied IP is never trusted, whether
    // sent as a flat body field (no longer even read, above) or smuggled
    // inside a client-supplied signatureAudit object (guarded below).
    const clientIp = getClientIp(req);
    const resolvedSignedAt = signedAt ? new Date(signedAt) : new Date();

    const auditPayload = signatureAudit && typeof signatureAudit === 'object'
      ? { ...signatureAudit, ipAddress: clientIp }
      : {
          signatureImage: resolvedSignature,
          signedAt: resolvedSignedAt.toISOString(),
          ipAddress: clientIp,
          signedVia: 'ContractSigningPad',
        };

    // Freeze the agreement text and signer name at the moment of signing.
    // A failure here is a real data-integrity problem (broken template,
    // bad data) and is allowed to fail the request loudly - not wrapped in
    // a fallback, unlike the PDF/logo steps below.
    const frozenAgreementText = await buildContractAgreementText(existing);
    const signerNameAtSigning = existing.signerName;

    // Logo + org signature lookup for the PDF: non-blocking and independent
    // of PDF generation itself, one shared settings fetch. A failure here
    // costs only the logo/org-signature block - the PDF still generates
    // without them, since both are optional generateContractPdf params.
    let logoImageDataUrl = null;
    let orgSignatureImageDataUrl = null;
    let orgName = null;
    try {
      const settings = await prisma.settings.findUnique({ where: { id: 1 } });
      logoImageDataUrl = settings?.orgLogoUrl || null;
      orgSignatureImageDataUrl = settings?.orgSignatureUrl || null;
      orgName = settings?.orgName || null;
    } catch (error) {
      console.warn('[markContractSigned] Failed to fetch org logo/signature, continuing without them:', error.message);
    }

    // PDF generation and storage: never allowed to block signing. pdfUrl is
    // initialized to null before the try so it always has a safe value,
    // whether generation succeeds, fails, or storage fails after a
    // successful generation. The catch only logs - no rethrow, no next(),
    // no return - so execution always continues to the update below with
    // signing succeeding regardless of PDF outcome.
    let pdfUrl = null;
    try {
      const title = existing.type === 'ADOPTION' ? 'Cat Adoption Agreement' : 'Foster Care Agreement';
      const pdfBytes = await generateContractPdf({
        title,
        agreementText: frozenAgreementText,
        signatureImageDataUrl: resolvedSignature,
        signerName: signerNameAtSigning,
        signerEmail: existing.signerEmail,
        signedAt: resolvedSignedAt.toISOString(),
        logoImageDataUrl,
        orgSignatureImageDataUrl,
        orgName,
      });
      pdfUrl = await storeContractPdf(existing.id, pdfBytes);
    } catch (error) {
      console.warn('[markContractSigned] PDF generation/storage failed, continuing without it:', error.message);
    }

    // Adult household member acknowledgments (Foster Care Agreement only,
    // optional): name + signature image + server-set timestamp, nothing
    // more. These are acknowledgments, not the primary signer - no IP
    // capture, no name confirmation, no signatureAudit merge - and a
    // failure to save them must never block the actual signing below, same
    // spirit as the logo/PDF steps above. Only well-formed entries (both a
    // non-empty name and a data-URL signature image) are persisted; the
    // client already withholds incomplete entries before submitting.
    if (Array.isArray(householdAcknowledgments) && householdAcknowledgments.length > 0) {
      try {
        const validEntries = householdAcknowledgments
          .filter((entry) => entry && typeof entry === 'object')
          .filter((entry) => entry.name?.trim() && entry.signatureImage?.startsWith('data:'))
          .map((entry) => ({
            contractId: id,
            name: entry.name.trim(),
            signatureImageUrl: entry.signatureImage,
            signedAt: resolvedSignedAt,
          }));

        if (validEntries.length > 0) {
          await prisma.contractHouseholdAcknowledgment.createMany({ data: validEntries });
        }
      } catch (error) {
        console.warn('[markContractSigned] Failed to save household acknowledgment(s), continuing without them:', error.message);
      }
    }

    const contract = await prisma.contract.update({
      where: { id },
      data: {
        status: 'SIGNED',
        signatureImageUrl: resolvedSignature,
        signerNameAtSigning,
        signedIpAddress: clientIp,
        frozenAgreementText,
        pdfUrl,
        signatureAudit: JSON.stringify(auditPayload),
        signedAt: resolvedSignedAt,
      },
      include: CONTRACT_INCLUDE,
    });

    res.json(contract);
  } catch (error) {
    if (error.code === 'P2025') return res.status(404).json({ error: 'Contract not found' });
    next(error);
  }
}

export async function emailContractAgreement(req, res, next) {
  try {
    const id = Number.parseInt(req.params.id, 10);
    const contract = await prisma.contract.findUnique({
      where: { id },
      include: CONTRACT_INCLUDE,
    });

    if (!contract) return res.status(404).json({ error: 'Contract not found' });
    if (contract.status === 'VOID') {
      return res.status(400).json({ error: 'Cannot email a void contract' });
    }
    if (!contract.signerEmail?.trim()) {
      return res.status(400).json({ error: 'Contract has no signer email' });
    }

    const agreementText = await buildContractAgreementText(contract);
    const result = await sendContractAgreementEmail({
      contract,
      agreementText,
      note: req.body?.note?.trim() || '',
    });

    if (result.skipped) {
      return res.status(400).json({ error: result.errorMessage || 'Email was not sent' });
    }
    if (!result.ok) {
      return res.status(500).json({ error: result.error || 'Failed to send agreement email' });
    }

    res.json({ ok: true, messageId: result.messageId });
  } catch (error) {
    next(error);
  }
}

export async function emailSignedContractPdf(req, res, next) {
  try {
    const id = Number.parseInt(req.params.id, 10);
    const contract = await prisma.contract.findUnique({
      where: { id },
      include: CONTRACT_INCLUDE,
    });

    if (!contract) return res.status(404).json({ error: 'Contract not found' });
    if (contract.status !== 'SIGNED') {
      return res.status(400).json({ error: 'Only signed contracts have a PDF to email' });
    }
    if (!contract.signerEmail?.trim()) {
      return res.status(400).json({ error: 'Contract has no signer email' });
    }
    if (!contract.pdfUrl) {
      return res.status(400).json({
        error: 'No PDF is available for this contract. PDF generation may have failed at signing time.',
      });
    }

    const result = await sendSignedContractPdfEmail({ contract });

    if (result.skipped) {
      return res.status(400).json({ error: result.errorMessage || 'Email was not sent' });
    }
    if (!result.ok) {
      return res.status(500).json({ error: result.error || 'Failed to send signed PDF email' });
    }

    res.json({ ok: true, messageId: result.messageId, previewUrl: result.previewUrl || null });
  } catch (error) {
    next(error);
  }
}

export { parseSignatureAudit };
