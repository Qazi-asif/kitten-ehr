import prisma from '../lib/prisma.js';
import { paginatedResponse, parsePagination, wantsPagination } from '../utils/pagination.js';

const CONTRACT_INCLUDE = {
  application: {
    select: { id: true, type: true, status: true, kittenOfInterest: true },
  },
  kitten: {
    select: { id: true, name: true },
  },
};

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
    res.json(contract);
  } catch (error) {
    next(error);
  }
}

export async function createContractDraft(req, res, next) {
  try {
    const {
      type,
      signerName,
      signerEmail,
      kittenName,
      kittenId,
      applicationId,
      documentVersion,
    } = req.body;

    if (!type || !['FOSTER', 'ADOPTION'].includes(type)) {
      return res.status(400).json({ error: 'type must be FOSTER or ADOPTION' });
    }
    if (!signerName?.trim()) return res.status(400).json({ error: 'signerName is required' });
    if (!signerEmail?.trim()) return res.status(400).json({ error: 'signerEmail is required' });
    if (!documentVersion?.trim()) return res.status(400).json({ error: 'documentVersion is required' });

    let resolvedKittenName = kittenName?.trim() || '';
    let resolvedKittenId = kittenId ? Number.parseInt(kittenId, 10) : null;

    if (resolvedKittenId) {
      const kitten = await prisma.kitten.findUnique({
        where: { id: resolvedKittenId },
        select: { name: true },
      });
      if (!kitten) return res.status(400).json({ error: 'kittenId not found' });
      if (!resolvedKittenName) resolvedKittenName = kitten.name;
    }

    const contract = await prisma.contract.create({
      data: {
        type,
        signerName: signerName.trim(),
        signerEmail: signerEmail.trim(),
        kittenName: resolvedKittenName,
        kittenId: resolvedKittenId,
        applicationId: applicationId ? Number.parseInt(applicationId, 10) : null,
        documentVersion: documentVersion.trim(),
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
      signerName,
      signerEmail,
      kittenName,
      kittenId,
      documentVersion,
      status,
    } = req.body;

    const data = {};

    if (type !== undefined) {
      if (!['FOSTER', 'ADOPTION'].includes(type)) {
        return res.status(400).json({ error: 'type must be FOSTER or ADOPTION' });
      }
      data.type = type;
    }
    if (signerName !== undefined) {
      if (!signerName?.trim()) return res.status(400).json({ error: 'signerName is required' });
      data.signerName = signerName.trim();
    }
    if (signerEmail !== undefined) {
      if (!signerEmail?.trim()) return res.status(400).json({ error: 'signerEmail is required' });
      data.signerEmail = signerEmail.trim();
    }
    if (documentVersion !== undefined) {
      if (!documentVersion?.trim()) return res.status(400).json({ error: 'documentVersion is required' });
      data.documentVersion = documentVersion.trim();
    }
    if (kittenName !== undefined) data.kittenName = kittenName.trim();
    if (kittenId !== undefined) {
      const parsedKittenId = kittenId ? Number.parseInt(kittenId, 10) : null;
      if (parsedKittenId) {
        const kitten = await prisma.kitten.findUnique({
          where: { id: parsedKittenId },
          select: { name: true },
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
      ipAddress,
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

    const auditPayload = signatureAudit && typeof signatureAudit === 'object'
      ? signatureAudit
      : {
          signatureImage: resolvedSignature,
          signedAt: signedAt || new Date().toISOString(),
          ipAddress: ipAddress || 'unknown',
          signedVia: 'ContractSigningPad',
        };

    const contract = await prisma.contract.update({
      where: { id },
      data: {
        status: 'SIGNED',
        signedPdfUrl: resolvedSignature,
        signatureAudit: JSON.stringify(auditPayload),
        signedAt: signedAt ? new Date(signedAt) : new Date(),
      },
      include: CONTRACT_INCLUDE,
    });

    res.json(contract);
  } catch (error) {
    if (error.code === 'P2025') return res.status(404).json({ error: 'Contract not found' });
    next(error);
  }
}

export { parseSignatureAudit };
