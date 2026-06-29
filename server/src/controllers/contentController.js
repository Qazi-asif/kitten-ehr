import prisma from '../lib/prisma.js';

function slugify(text) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export async function getAllContent(_req, res, next) {
  try {
    const content = await prisma.content.findMany({ orderBy: { createdAt: 'desc' } });
    res.json(content);
  } catch (error) {
    next(error);
  }
}

export async function getContentById(req, res, next) {
  try {
    const id = Number.parseInt(req.params.id, 10);
    const item = await prisma.content.findUnique({ where: { id } });
    if (!item) return res.status(404).json({ error: 'Content not found' });
    res.json(item);
  } catch (error) {
    next(error);
  }
}

export async function createContent(req, res, next) {
  try {
    const { title, slug, body, category } = req.body;
    if (!title) return res.status(400).json({ error: 'title is required' });

    const item = await prisma.content.create({
      data: {
        title,
        slug: slug || slugify(title),
        body: body ?? '',
        category: category ?? '',
      },
    });

    res.status(201).json(item);
  } catch (error) {
    next(error);
  }
}

export async function updateContent(req, res, next) {
  try {
    const id = Number.parseInt(req.params.id, 10);
    const { title, slug, body, category } = req.body;

    const item = await prisma.content.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(slug !== undefined && { slug }),
        ...(body !== undefined && { body }),
        ...(category !== undefined && { category }),
      },
    });

    res.json(item);
  } catch (error) {
    if (error.code === 'P2025') return res.status(404).json({ error: 'Content not found' });
    next(error);
  }
}

export async function deleteContent(req, res, next) {
  try {
    const id = Number.parseInt(req.params.id, 10);
    await prisma.content.delete({ where: { id } });
    res.status(204).send();
  } catch (error) {
    if (error.code === 'P2025') return res.status(404).json({ error: 'Content not found' });
    next(error);
  }
}
