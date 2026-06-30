import prisma from '../lib/prisma.js';

export async function getUpdatesByKitten(req, res, next) {
  try {
    const kittenId = Number.parseInt(req.params.kittenId, 10);

    const kitten = await prisma.kitten.findUnique({ where: { id: kittenId } });
    if (!kitten) return res.status(404).json({ error: 'Kitten not found' });

    const updates = await prisma.update.findMany({
      where: { kittenId },
      orderBy: { createdAt: 'desc' },
    });

    res.json(updates);
  } catch (error) {
    next(error);
  }
}

export async function createUpdate(req, res, next) {
  try {
    const kittenId = Number.parseInt(req.params.kittenId, 10);
    const { content, isPublic } = req.body;

    if (!content?.trim()) {
      return res.status(400).json({ error: 'content is required' });
    }

    const kitten = await prisma.kitten.findUnique({ where: { id: kittenId } });
    if (!kitten) return res.status(404).json({ error: 'Kitten not found' });

    const update = await prisma.update.create({
      data: {
        kittenId,
        content: content.trim(),
        isPublic: Boolean(isPublic),
      },
    });

    res.status(201).json(update);
  } catch (error) {
    next(error);
  }
}

export async function updateUpdate(req, res, next) {
  try {
    const kittenId = Number.parseInt(req.params.kittenId, 10);
    const updateId = Number.parseInt(req.params.updateId, 10);
    const { content, isPublic } = req.body;

    const existing = await prisma.update.findFirst({
      where: { id: updateId, kittenId },
    });

    if (!existing) return res.status(404).json({ error: 'Update not found' });

    const data = {};
    if (content !== undefined) data.content = content.trim();
    if (isPublic !== undefined) data.isPublic = Boolean(isPublic);

    const update = await prisma.update.update({
      where: { id: updateId },
      data,
    });

    res.json(update);
  } catch (error) {
    next(error);
  }
}

export async function deleteUpdate(req, res, next) {
  try {
    const kittenId = Number.parseInt(req.params.kittenId, 10);
    const updateId = Number.parseInt(req.params.updateId, 10);

    const existing = await prisma.update.findFirst({
      where: { id: updateId, kittenId },
    });

    if (!existing) return res.status(404).json({ error: 'Update not found' });

    await prisma.update.delete({ where: { id: updateId } });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}
