import prisma from '../lib/prisma.js';
import {
  isAllowedContentCategory,
  normalizeContentCategory,
} from '../utils/contentCategories.js';
import { normalizePublishTargets } from '../utils/publishTargets.js';

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

export async function getFosterChecklistContent(_req, res, next) {
  try {
    const content = await prisma.content.findMany({
      where: { publishTargets: { has: 'FOSTER_CHECKLIST' } },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        slug: true,
        category: true,
        body: true,
        publishTargets: true,
        createdAt: true,
      },
    });
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
    const { title, slug, body, category, publishTargets } = req.body;
    if (!title) return res.status(400).json({ error: 'title is required' });

    const normalizedCategory = normalizeContentCategory(category);
    if (!isAllowedContentCategory(normalizedCategory)) {
      return res.status(400).json({ error: 'Invalid content category' });
    }

    const item = await prisma.content.create({
      data: {
        title,
        slug: slug || slugify(title),
        body: body ?? '',
        category: normalizedCategory,
        publishTargets: normalizePublishTargets(publishTargets),
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
    const { title, slug, body, category, publishTargets } = req.body;

    if (category !== undefined) {
      const normalizedCategory = normalizeContentCategory(category);
      if (!isAllowedContentCategory(normalizedCategory)) {
        return res.status(400).json({ error: 'Invalid content category' });
      }
    }

    const item = await prisma.content.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(slug !== undefined && { slug }),
        ...(body !== undefined && { body }),
        ...(category !== undefined && { category: normalizeContentCategory(category) }),
        ...(publishTargets !== undefined && { publishTargets: normalizePublishTargets(publishTargets) }),
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

export async function markContentComplete(req, res, next) {
  try {
    const contentId = Number.parseInt(req.params.id, 10);
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const content = await prisma.content.findUnique({ where: { id: contentId } });
    if (!content) return res.status(404).json({ error: 'Content not found' });

    const completion = await prisma.contentCompletion.upsert({
      where: {
        userId_contentId: { userId, contentId },
      },
      update: {
        completedAt: new Date(),
      },
      create: {
        userId,
        contentId,
      },
    });

    res.status(201).json(completion);
  } catch (error) {
    next(error);
  }
}
