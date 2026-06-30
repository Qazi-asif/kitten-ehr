import prisma from '../lib/prisma.js';

export async function getDocumentsByKitten(req, res, next) {
  try {
    const kittenId = Number.parseInt(req.params.kittenId, 10);

    const kitten = await prisma.kitten.findUnique({ where: { id: kittenId } });
    if (!kitten) return res.status(404).json({ error: 'Kitten not found' });

    const documents = await prisma.document.findMany({
      where: { kittenId },
      orderBy: { uploadedAt: 'desc' },
    });

    res.json(documents);
  } catch (error) {
    next(error);
  }
}

export async function uploadDocument(req, res, next) {
  try {
    const kittenId = Number.parseInt(req.params.kittenId, 10);

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const kitten = await prisma.kitten.findUnique({ where: { id: kittenId } });
    if (!kitten) return res.status(404).json({ error: 'Kitten not found' });

    const { docType, description } = req.body;
    const fileUrl = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;

    const document = await prisma.document.create({
      data: {
        kittenId,
        fileName: req.file.originalname,
        fileUrl,
        docType: docType ?? '',
        description: description ?? '',
      },
    });

    res.status(201).json(document);
  } catch (error) {
    next(error);
  }
}

export async function deleteDocument(req, res, next) {
  try {
    const kittenId = Number.parseInt(req.params.kittenId, 10);
    const id = Number.parseInt(req.params.id, 10);

    const document = await prisma.document.findFirst({
      where: { id, kittenId },
    });

    if (!document) return res.status(404).json({ error: 'Document not found' });

    await prisma.document.delete({ where: { id } });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}
