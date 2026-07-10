import prisma from '../lib/prisma.js';
import { paginatedResponse, parsePagination, wantsPagination } from '../utils/pagination.js';
import { buildContractAgreementText, getAgreementTemplateBySlug } from '../utils/contractAgreementText.js';
import { sendContractAgreementEmail } from '../services/emailService.js';
import { getClientIp } from '../utils/requestIp.js';
import { generateContractPdf, storeContractPdf } from '../utils/contractPdf.js';

const CONTRACT_INCLUDE = {
  application: {
    select: { id: true, type: true, status: true, kittenOfInterest: true },
  },
  kitten: {
    select: { id: true, name: true, microchipNumber: true },
  },
  foster: {
    select: { id: true, name: true, email: true },
  },
};

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
  const { search, status, dateFrom, dateTo, dateField, signedOnly } = query;
  const where = {};

  if (status && ['SENT', 'SIGNED', 'VOID'].includes(status)) {
    where.status = status;
  } else if (signedOnly === 'true') {
    where.status = 'SIGNED';
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
        include: CONTRACT_INCLUDE,
        take: 100,
      });
      return res.json(contracts);
    }

    const { page, limit, skip } = parsePagination(req.query, 50);
    const [total, contracts] = await Promise.all([
      prisma.contract.count({ where }),
      prisma.contract.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: CONTRACT_INCLUDE,
        skip,
        take: limit,
      }),
    ]);

    return res.json(paginatedResponse(contracts, total, page, limit));
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
      documentVersion,
    } = req.body;

    const resolvedTemplate = await resolveTemplate(templateSlug, type);
    if (!signerName?.trim()) return res.status(400).json({ error: 'signerName is required' });
    if (!signerEmail?.trim()) return res.status(400).json({ error: 'signerEmail is required' });

    let resolvedKittenName = kittenName?.trim() || '';
    let resolvedKittenId = kittenId ? Number.parseInt(kittenId, 10) : null;
    let resolvedFosterId = fosterId ? Number.parseInt(fosterId, 10) : null;

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
        applicationId: applicationId ? Number.parseInt(applicationId, 10) : null,
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

    // Logo lookup for the PDF header: non-blocking and independent of PDF
    // generation itself. A failure here costs only the logo - the PDF
    // still generates without one, since logoImageDataUrl is optional.
    let logoImageDataUrl = null;
    try {
      const settings = await prisma.settings.findUnique({ where: { id: 1 } });
      logoImageDataUrl = settings?.orgLogoUrl || null;
    } catch (error) {
      console.warn('[markContractSigned] Failed to fetch org logo, continuing without it:', error.message);
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
      });
      pdfUrl = await storeContractPdf(existing.id, pdfBytes);
    } catch (error) {
      console.warn('[markContractSigned] PDF generation/storage failed, continuing without it:', error.message);
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

export { parseSignatureAudit };
