import crypto from 'crypto';
import prisma from '../lib/prisma.js';
import { paginatedResponse, parsePagination, wantsPagination } from '../utils/pagination.js';
import { buildContractAgreementText, getAgreementTemplateBySlug } from '../utils/contractAgreementText.js';
import { sendContractAgreementEmail, sendSignedContractPdfEmail } from '../services/emailService.js';
import { getClientIp } from '../utils/requestIp.js';
import { generateContractPdf, storeContractPdf } from '../utils/contractPdf.js';
import { getPublicSiteBase } from '../services/socialMediaService.js';

const SIGNING_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

function createSigningToken() {
  return crypto.randomBytes(32).toString('hex');
}

async function ensureContractSigningToken(contractId) {
  const existing = await prisma.contract.findUnique({
    where: { id: contractId },
    select: { id: true, status: true, signingToken: true, signingTokenExpiresAt: true },
  });
  if (!existing) return null;
  if (existing.status === 'SIGNED' || existing.status === 'VOID') {
    return existing;
  }

  const stillValid =
    existing.signingToken
    && existing.signingTokenExpiresAt
    && existing.signingTokenExpiresAt.getTime() > Date.now();

  if (stillValid) return existing;

  return prisma.contract.update({
    where: { id: contractId },
    data: {
      signingToken: createSigningToken(),
      signingTokenExpiresAt: new Date(Date.now() + SIGNING_TOKEN_TTL_MS),
    },
    select: { id: true, status: true, signingToken: true, signingTokenExpiresAt: true },
  });
}

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
    const existing = await prisma.contract.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Contract not found' });

    const contract = await applyContractSignature(existing, req.body, req, {
      signedVia: 'ContractSigningPad',
    });
    res.json(contract);
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ error: error.message });
    }
    if (error.code === 'P2025') return res.status(404).json({ error: 'Contract not found' });
    next(error);
  }
}

export async function getPublicContractBySigningToken(req, res, next) {
  try {
    const token = typeof req.params.token === 'string' ? req.params.token.trim() : '';
    if (!token || token.length < 32) {
      return res.status(404).json({ error: 'Signing link not found' });
    }

    const contract = await prisma.contract.findFirst({
      where: { signingToken: token },
      select: {
        id: true,
        type: true,
        templateSlug: true,
        documentVersion: true,
        signerName: true,
        signerEmail: true,
        signerPhone: true,
        signerAddress: true,
        microchipNumber: true,
        kittenName: true,
        kittenId: true,
        emergencyContactName: true,
        emergencyContactPhone: true,
        status: true,
        signingTokenExpiresAt: true,
        kitten: { select: { id: true, name: true, microchipNumber: true } },
      },
    });

    if (!contract) {
      return res.status(404).json({ error: 'Signing link not found or expired' });
    }
    if (contract.status === 'VOID') {
      return res.status(400).json({ error: 'This agreement has been voided' });
    }
    if (contract.status === 'SIGNED') {
      return res.status(400).json({ error: 'This agreement has already been signed' });
    }
    if (contract.signingTokenExpiresAt && contract.signingTokenExpiresAt.getTime() < Date.now()) {
      return res.status(400).json({ error: 'This signing link has expired. Please contact us for a new link.' });
    }

    const agreementText = await buildContractAgreementText(contract);
    res.json({
      id: contract.id,
      type: contract.type,
      templateSlug: contract.templateSlug,
      signerName: contract.signerName,
      signerEmail: contract.signerEmail,
      kittenName: contract.kittenName || contract.kitten?.name || '',
      agreementText,
    });
  } catch (error) {
    next(error);
  }
}

export async function signPublicContractByToken(req, res, next) {
  try {
    const token = typeof req.params.token === 'string' ? req.params.token.trim() : '';
    if (!token || token.length < 32) {
      return res.status(404).json({ error: 'Signing link not found' });
    }

    const existing = await prisma.contract.findFirst({
      where: { signingToken: token },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Signing link not found or expired' });
    }
    if (existing.signingTokenExpiresAt && existing.signingTokenExpiresAt.getTime() < Date.now()) {
      return res.status(400).json({ error: 'This signing link has expired. Please contact us for a new link.' });
    }

    const contract = await applyContractSignature(existing, req.body, req, {
      signedVia: 'PublicSigningLink',
    });

    // Invalidate token after successful sign so the link cannot be reused.
    await prisma.contract.update({
      where: { id: contract.id },
      data: { signingToken: null, signingTokenExpiresAt: null },
    });

    res.json({
      ok: true,
      id: contract.id,
      status: contract.status,
      signedAt: contract.signedAt,
    });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ error: error.message });
    }
    next(error);
  }
}

function httpError(status, message) {
  return Object.assign(new Error(message), { status });
}

async function applyContractSignature(existing, body, req, { signedVia }) {
  const {
    signatureImage,
    signedAt,
    signedPdfUrl,
    signatureAudit,
    householdAcknowledgments,
  } = body || {};

  if (existing.status === 'VOID') {
    throw httpError(400, 'Cannot sign a void contract');
  }

  if (existing.status === 'SIGNED') {
    throw httpError(400, 'Contract is already signed');
  }

  const resolvedSignature = signatureImage || signedPdfUrl || '';
  if (!resolvedSignature?.startsWith('data:')) {
    throw httpError(400, 'signatureImage is required');
  }

  const clientIp = getClientIp(req);
  const resolvedSignedAt = signedAt ? new Date(signedAt) : new Date();
  const id = existing.id;

  const auditPayload = signatureAudit && typeof signatureAudit === 'object'
    ? { ...signatureAudit, ipAddress: clientIp }
    : {
        signatureImage: resolvedSignature,
        signedAt: resolvedSignedAt.toISOString(),
        ipAddress: clientIp,
        signedVia,
      };

  const frozenAgreementText = await buildContractAgreementText(existing);
  const signerNameAtSigning = existing.signerName;

  let logoImageDataUrl = null;
  let orgSignatureImageDataUrl = null;
  let orgName = null;
  try {
    const settings = await prisma.settings.findUnique({ where: { id: 1 } });
    logoImageDataUrl = settings?.orgLogoUrl || null;
    orgSignatureImageDataUrl = settings?.orgSignatureUrl || null;
    orgName = settings?.orgName || null;
  } catch (error) {
    console.warn('[applyContractSignature] Failed to fetch org logo/signature, continuing without them:', error.message);
  }

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
    console.warn('[applyContractSignature] PDF generation/storage failed, continuing without it:', error.message);
  }

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
      console.warn('[applyContractSignature] Failed to save household acknowledgment(s), continuing without them:', error.message);
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

  if (existing.type === 'ADOPTION' && existing.kittenId) {
    try {
      await prisma.$transaction(async (tx) => {
        const kitten = await tx.kitten.findUnique({
          where: { id: existing.kittenId },
          select: { outcomeDate: true },
        });
        if (!kitten) return;

        await tx.placement.updateMany({
          where: { kittenId: existing.kittenId, dischargeDate: null },
          data: { dischargeDate: resolvedSignedAt, dischargeType: 'Adopted' },
        });

        await tx.kitten.update({
          where: { id: existing.kittenId },
          data: {
            status: 'Adopted',
            currentFosterId: null,
            outcomeDate: kitten.outcomeDate ?? resolvedSignedAt,
          },
        });
      });
    } catch (error) {
      console.warn('[applyContractSignature] Auto-discharge on Adoption contract signing failed, continuing:', error.message);
    }
  }

  return contract;
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
    if (contract.status === 'SIGNED') {
      return res.status(400).json({ error: 'Contract is already signed. Email the signed PDF instead.' });
    }
    if (!contract.signerEmail?.trim()) {
      return res.status(400).json({ error: 'Contract has no signer email' });
    }

    const tokenRow = await ensureContractSigningToken(contract.id);
    const signingUrl = tokenRow?.signingToken
      ? `${getPublicSiteBase(req)}/sign/${tokenRow.signingToken}`
      : '';

    const agreementText = await buildContractAgreementText(contract);
    const result = await sendContractAgreementEmail({
      contract,
      agreementText,
      note: req.body?.note?.trim() || '',
      signingUrl,
    });

    if (result.skipped) {
      return res.status(400).json({ error: result.errorMessage || 'Email was not sent' });
    }
    if (!result.ok) {
      return res.status(500).json({ error: result.error || 'Failed to send agreement email' });
    }

    res.json({ ok: true, messageId: result.messageId, signingUrl: signingUrl || undefined });
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
