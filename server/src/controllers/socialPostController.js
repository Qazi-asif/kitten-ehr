import prisma from '../lib/prisma.js';
import { getSocialPostingConfig, publishSocialPostToTargets } from '../services/socialMediaService.js';

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

export async function updateSocialPost(req, res, next) {
  try {
    const id = Number.parseInt(req.params.id, 10);
    const { body, imageUrl, platforms, scheduledFor, status } = req.body;

    const data = {};

    if (body !== undefined) {
      const trimmedBody = typeof body === 'string' ? body.trim() : '';
      if (!trimmedBody) return res.status(400).json({ error: 'body is required' });
      data.body = trimmedBody;
    }

    if (imageUrl !== undefined) {
      data.imageUrl = typeof imageUrl === 'string' ? imageUrl.trim() : '';
    }

    if (platforms !== undefined) {
      const normalizedPlatforms = normalizePlatforms(platforms);
      if (normalizedPlatforms.length === 0) {
        return res.status(400).json({ error: 'At least one platform is required' });
      }
      data.platforms = normalizedPlatforms;
    }

    let parsedScheduledFor;
    if (scheduledFor !== undefined) {
      parsedScheduledFor = scheduledFor ? new Date(scheduledFor) : null;
      if (scheduledFor && Number.isNaN(parsedScheduledFor?.getTime())) {
        return res.status(400).json({ error: 'scheduledFor must be a valid date' });
      }
      data.scheduledFor = parsedScheduledFor;
    }

    if (status !== undefined || scheduledFor !== undefined) {
      data.status = normalizeStatus(status, parsedScheduledFor);
    }

    const post = await prisma.socialPost.update({ where: { id }, data });
    res.json(post);
  } catch (error) {
    if (error.code === 'P2025') return res.status(404).json({ error: 'Social post not found' });
    next(error);
  }
}

// POST /:id/publish - "Publish now" for a draft/scheduled post. Only
// FACEBOOK and INSTAGRAM support automatic publishing today (via the Graph
// API helpers in socialMediaService). X/TikTok have no API integration, so
// a post whose platforms are X/TikTok only is rejected with a clear error
// rather than silently doing nothing.
export async function publishSocialPost(req, res, next) {
  try {
    const id = Number.parseInt(req.params.id, 10);

    const post = await prisma.socialPost.findUnique({ where: { id } });
    if (!post) return res.status(404).json({ error: 'Social post not found' });

    const platforms = Array.isArray(post.platforms) ? post.platforms : [];
    const autoPublishTargets = platforms.filter((platform) => platform === 'FACEBOOK' || platform === 'INSTAGRAM');

    if (autoPublishTargets.length === 0) {
      return res.status(400).json({
        error: 'Only Facebook and Instagram support automatic publishing. Add Facebook or Instagram to this post\'s platforms - X/TikTok must be shared manually.',
      });
    }

    const config = await getSocialPostingConfig();
    if (!config.enabled || !config.pageId || !config.accessToken) {
      return res.status(400).json({
        error: 'Facebook/Instagram posting is not configured. Add a Facebook Page ID and Page Access Token in Settings \u2192 Organization, then enable social posting.',
      });
    }

    const { results } = await publishSocialPostToTargets({
      caption: post.body,
      imageUrl: post.imageUrl || '',
      targets: autoPublishTargets,
    });

    const anyPosted = results.some((result) => result.status === 'posted');
    const deliveryLog = JSON.stringify(results);

    const updated = await prisma.socialPost.update({
      where: { id },
      data: {
        ...(anyPosted ? { status: 'POSTED', postedAt: new Date() } : {}),
        deliveryLog,
      },
    });

    res.json({ ...updated, results });
  } catch (error) {
    if (error.code === 'P2025') return res.status(404).json({ error: 'Social post not found' });
    next(error);
  }
}

export async function deleteSocialPost(req, res, next) {
  try {
    const id = Number.parseInt(req.params.id, 10);
    await prisma.socialPost.delete({ where: { id } });
    res.status(204).send();
  } catch (error) {
    if (error.code === 'P2025') return res.status(404).json({ error: 'Social post not found' });
    next(error);
  }
}
