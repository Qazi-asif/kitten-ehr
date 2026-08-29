import prisma from '../lib/prisma.js';
import { publishStoredSocialPost } from '../services/socialPostScheduler.js';
import {
  MAX_ATTEMPTS,
  MAX_OVERDUE_MS,
  resolveIntervalConfig,
} from '../services/socialPostSchedulerPolicy.js';
import { normalizeDateField } from '../utils/dateFields.js';

const STATUS_MAP = {
  draft: 'DRAFT',
  scheduled: 'SCHEDULED',
  publishing: 'PUBLISHING',
  posted: 'POSTED',
  failed: 'FAILED',
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

// PUBLISHING is owned by the scheduler's claim transition and FAILED is set by a
// failed attempt; neither may be assigned from a request, or a client could
// steal or forge a claim.
const CLIENT_SETTABLE_STATUSES = new Set(['DRAFT', 'SCHEDULED', 'POSTED']);

function normalizeStatus(value, scheduledFor) {
  if (typeof value === 'string') {
    const mapped = STATUS_MAP[value.trim().toLowerCase()];
    if (mapped && CLIENT_SETTABLE_STATUSES.has(mapped)) return mapped;
  }

  if (scheduledFor instanceof Date && scheduledFor.getTime() > Date.now()) {
    return 'SCHEDULED';
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

    const parsedScheduledFor = normalizeDateField('SocialPost.scheduledFor', scheduledFor);
    if (scheduledFor && !parsedScheduledFor) {
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
      parsedScheduledFor = normalizeDateField('SocialPost.scheduledFor', scheduledFor);
      if (scheduledFor && !parsedScheduledFor) {
        return res.status(400).json({ error: 'scheduledFor must be a valid date' });
      }
      data.scheduledFor = parsedScheduledFor;
    }

    if (status !== undefined || scheduledFor !== undefined) {
      data.status = normalizeStatus(status, parsedScheduledFor);
      // Re-scheduling is an explicit staff decision to try again, so the retry
      // budget and the stale failure log from the previous attempt are cleared.
      if (data.status === 'SCHEDULED') {
        data.attemptCount = 0;
        data.deliveryLog = '';
      }
    }

    const post = await prisma.socialPost.update({ where: { id }, data });
    res.json(post);
  } catch (error) {
    if (error.code === 'P2025') return res.status(404).json({ error: 'Social post not found' });
    next(error);
  }
}

// POST /:id/publish - "Publish now". The actual publish lives in
// socialPostScheduler.publishStoredSocialPost, shared with the cron runner so
// the Graph API path is not duplicated. Only FACEBOOK and INSTAGRAM support
// automatic publishing; a post targeting only X/TikTok is rejected with a clear
// error rather than silently doing nothing.
export async function publishSocialPost(req, res, next) {
  try {
    const id = Number.parseInt(req.params.id, 10);

    const post = await prisma.socialPost.findUnique({ where: { id } });
    if (!post) return res.status(404).json({ error: 'Social post not found' });

    if (post.status === 'PUBLISHING') {
      return res.status(409).json({
        error: 'The scheduler is publishing this post right now. Refresh in a moment.',
      });
    }

    const outcome = await publishStoredSocialPost(post);

    if (!outcome.ok && outcome.reason) {
      return res.status(400).json({ error: outcome.error });
    }

    res.json({ ...(outcome.post || post), results: outcome.results });
  } catch (error) {
    if (error.code === 'P2025') return res.status(404).json({ error: 'Social post not found' });
    next(error);
  }
}

// GET /scheduler - what the Marketing page needs to tell staff the truth about
// scheduling: whether a runner is configured at all, and the pending queue.
export async function getSchedulerStatus(req, res, next) {
  try {
    // Same resolver the boot path uses, so the Marketing page cannot disagree
    // with what the process is actually doing.
    const interval = resolveIntervalConfig();
    const inProcess = interval.enabled;
    const cronConfigured = Boolean(process.env.CRON_SECRET?.trim());

    const [nextDue, overdue, failed] = await Promise.all([
      prisma.socialPost.findFirst({
        where: { status: 'SCHEDULED', scheduledFor: { not: null } },
        orderBy: { scheduledFor: 'asc' },
        select: { id: true, scheduledFor: true },
      }),
      prisma.socialPost.count({
        where: { status: 'SCHEDULED', scheduledFor: { not: null, lte: new Date() } },
      }),
      prisma.socialPost.count({ where: { status: 'FAILED' } }),
    ]);

    res.json({
      enabled: cronConfigured || inProcess,
      mode: inProcess ? 'interval' : (cronConfigured ? 'cron' : 'none'),
      intervalMinutes: inProcess ? Math.round(interval.intervalMs / 60_000) : null,
      maxAttempts: MAX_ATTEMPTS,
      maxOverdueHours: Math.round(MAX_OVERDUE_MS / 3_600_000),
      nextScheduledFor: nextDue?.scheduledFor || null,
      dueNowCount: overdue,
      failedCount: failed,
    });
  } catch (error) {
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
