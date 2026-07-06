import prisma from '../lib/prisma.js';

export async function getContracts(_req, res, next) {
  try {
    const contracts = await prisma.contract.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        application: {
          select: { id: true, type: true, status: true },
        },
      },
    });
    res.json(contracts);
  } catch (error) {
    next(error);
  }
}

export async function getContractById(req, res, next) {
  try {
    const id = Number.parseInt(req.params.id, 10);
    const contract = await prisma.contract.findUnique({
      where: { id },
      include: {
        application: {
          select: { id: true, type: true, status: true },
        },
      },
    });

    if (!contract) return res.status(404).json({ error: 'Contract not found' });
    res.json(contract);
  } catch (error) {
    next(error);
  }
}

export async function createContractDraft(req, res, next) {
  try {
    const { type, signerName, signerEmail, applicationId, documentVersion } = req.body;

    if (!type || !['FOSTER', 'ADOPTION'].includes(type)) {
      return res.status(400).json({ error: 'type must be FOSTER or ADOPTION' });
    }
    if (!signerName?.trim()) return res.status(400).json({ error: 'signerName is required' });
    if (!signerEmail?.trim()) return res.status(400).json({ error: 'signerEmail is required' });
    if (!documentVersion?.trim()) return res.status(400).json({ error: 'documentVersion is required' });

    const contract = await prisma.contract.create({
      data: {
        type,
        signerName: signerName.trim(),
        signerEmail: signerEmail.trim(),
        applicationId: applicationId ? Number.parseInt(applicationId, 10) : null,
        documentVersion: documentVersion.trim(),
        status: 'SENT',
      },
    });

    res.status(201).json(contract);
  } catch (error) {
    next(error);
  }
}

export async function markContractSigned(req, res, next) {
  try {
    const id = Number.parseInt(req.params.id, 10);
    const { signedPdfUrl, signatureAudit } = req.body;

    const existing = await prisma.contract.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Contract not found' });

    if (existing.status === 'VOID') {
      return res.status(400).json({ error: 'Cannot sign a void contract' });
    }

    const contract = await prisma.contract.update({
      where: { id },
      data: {
        status: 'SIGNED',
        signedPdfUrl: signedPdfUrl ?? existing.signedPdfUrl,
        signatureAudit: typeof signatureAudit === 'string'
          ? signatureAudit
          : JSON.stringify(signatureAudit ?? {}),
        signedAt: new Date(),
      },
    });

    res.json(contract);
  } catch (error) {
    if (error.code === 'P2025') return res.status(404).json({ error: 'Contract not found' });
    next(error);
  }
}
