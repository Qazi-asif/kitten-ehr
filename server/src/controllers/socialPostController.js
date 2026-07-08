import prisma from '../lib/prisma.js';

const STATUS_MAP = {
  draft: 'DRAFT',
  scheduled: 'SCHEDULED',
  posted: 'POSTED',
};

const ALLOWED_PLATFORMS = new Set(['FACEBOOK', 'INSTAGRAM', 'X', 'TIKTOK']);

function normalizePlatforms(platforms) {
  if (!Array.isArray(platforms)) return [];
  return [...new Set(
    platforms
      .map((platform) => (typeof platform === 'string' ? platform.trim().toUpperCase() : ''))
      .filter((platform) => ALLOWED_PLATFORMS.has(platform)),
  )];
}

function normalizeStatus(value, scheduledFor) {
  if (typeof value === 'string') {
    const mapped = STATUS_MAP[value.trim().toLowerCase()];
    if (mapped) return mapped;
  }

  if (scheduledFor) {
    const scheduledDate = new Date(scheduledFor);
    if (!Number.isNaN(scheduledDate.getTime()) && scheduledDate.getTime() > Date.now()) {
      return 'SCHEDULED';
    }
  }

  return 'DRAFT';
}

export async function getSocialPosts(req, res, next) {
  try {
    const statusFilter = typeof req.query.status === 'string'
      ? STATUS_MAP[req.query.status.trim().toLowerCase()]
      : undefined;

    const posts = await prisma.socialPost.findMany({
      where: statusFilter ? { status: statusFilter } : undefined,
      orderBy: [{ scheduledFor: 'asc' }, { createdAt: 'desc' }],
    });

    res.json(posts);
  } catch (error) {
    next(error);
  }
}

export async function createSocialPost(req, res, next) {
  try {
    const { body, imageUrl, platforms, scheduledFor, status } = req.body;
    const trimmedBody = typeof body === 'string' ? body.trim() : '';

    if (!trimmedBody) {
      return res.status(400).json({ error: 'body is required' });
    }

    const normalizedPlatforms = normalizePlatforms(platforms);
    if (normalizedPlatforms.length === 0) {
      return res.status(400).json({ error: 'At least one platform is required' });
    }

    const parsedScheduledFor = scheduledFor ? new Date(scheduledFor) : null;
    if (scheduledFor && Number.isNaN(parsedScheduledFor?.getTime())) {
      return res.status(400).json({ error: 'scheduledFor must be a valid date' });
    }

    const post = await prisma.socialPost.create({
      data: {
        body: trimmedBody,
        imageUrl: typeof imageUrl === 'string' ? imageUrl.trim() : '',
        platforms: normalizedPlatforms,
        scheduledFor: parsedScheduledFor,
        status: normalizeStatus(status, parsedScheduledFor),
      },
    });

    res.status(201).json(post);
  } catch (error) {
    next(error);
  }
}
