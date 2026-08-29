/**
 * Scheduled publishing for SocialPost records.
 *
 * Marking a post SCHEDULED used to do nothing: there was no worker, so a post
 * sat at SCHEDULED forever while staff believed it would send. This module is
 * the worker. In production (Hostinger, a long-running Node process under
 * Passenger) it is driven by the in-process interval below; the HTTP trigger at
 * /api/cron/social-posts is an optional fallback for an external pinger or for
 * manual triggering while debugging.
 *
 * Nothing here assumes a single process. Passenger may run several app processes
 * for the same site, and an external pinger can overlap with the interval, so the
 * guard against double-posting to Facebook is a conditional status transition in
 * the database, never an in-memory flag: a post is claimed by updating it only
 * while it is still SCHEDULED, and a claim that returns zero rows means another
 * runner already owns it.
 */
import prisma from '../lib/prisma.js';
import { getSocialPostingConfig, publishSocialPostToTargets } from './socialMediaService.js';
import {
  MAX_ATTEMPTS,
  MAX_OVERDUE_MS,
  MAX_POSTS_PER_RUN,
  STALE_CLAIM_MS,
  isTooOverdue,
  resolveIntervalConfig,
  splitPlatforms,
  statusAfterFailedAttempt,
} from './socialPostSchedulerPolicy.js';

export * from './socialPostSchedulerPolicy.js';

function serializeLog(entries) {
  return JSON.stringify(entries);
}

/**
 * Publish one already-loaded post to its auto-publishable platforms and record
 * the outcome. Shared by the manual "Publish now" endpoint and the scheduler so
 * the Graph API call path exists exactly once.
 *
 * `publisher` is injectable purely so tests can exercise the claim/idempotency
 * logic without touching the live org's social accounts. `onFailureStatus`
 * decides where a failed attempt lands; it defaults to the post's current
 * status so the manual "Publish now" button never reclassifies a draft.
 */
export async function publishStoredSocialPost(post, {
  publisher = publishSocialPostToTargets,
  configLoader = getSocialPostingConfig,
  onFailureStatus = null,
} = {}) {
  const { targets, unsupported } = splitPlatforms(post.platforms);

  // Platforms with no integration are reported, never fatal: a post targeting
  // Facebook + X still publishes to Facebook and records why X did not go.
  const unsupportedResults = unsupported.map((platform) => ({
    platform,
    status: 'skipped',
    message: `${platform} has no API integration — share this post manually.`,
    shareUrl: '',
    postId: '',
  }));

  // A precondition failure short-circuits before any Graph API call. When the
  // caller is the scheduler (it supplies onFailureStatus) the reason is written
  // to the record so staff can see it; the manual endpoint gets the message back
  // as a 400 and the record is left untouched, as before.
  async function precondition(reason, message, statusOverride) {
    if (onFailureStatus) {
      const results = [
        { platform: 'SCHEDULER', status: 'failed', message, shareUrl: '', postId: '' },
        ...unsupportedResults,
      ];
      await prisma.socialPost.update({
        where: { id: post.id },
        data: { status: statusOverride || onFailureStatus, deliveryLog: serializeLog(results) },
      }).catch(() => {});
      return { ok: false, reason, error: message, results };
    }
    return { ok: false, reason, error: message, results: unsupportedResults };
  }

  if (targets.length === 0) {
    // No amount of retrying gives X or TikTok an API, so this is terminal.
    return precondition(
      'no_auto_platforms',
      'Only Facebook and Instagram support automatic publishing. Add Facebook or Instagram to this post\'s platforms — X/TikTok must be shared manually.',
      'FAILED',
    );
  }

  const config = await configLoader();
  if (!config.enabled || !config.pageId || !config.accessToken) {
    return precondition(
      'not_configured',
      'Facebook/Instagram posting is not configured. Add a Facebook Page ID and Page Access Token in Settings → Organization, then enable social posting.',
    );
  }

  let results;
  try {
    ({ results } = await publisher({
      caption: post.body,
      imageUrl: post.imageUrl || '',
      targets,
    }));
  } catch (error) {
    // The publisher already catches per-platform errors; reaching here means
    // something outside the per-platform loop failed (config lookup, network).
    results = targets.map((platform) => ({
      platform,
      status: 'failed',
      message: error.message || 'Publish failed.',
      shareUrl: '',
      postId: '',
    }));
  }

  const allResults = [...results, ...unsupportedResults];
  const anyPosted = allResults.some((result) => result.status === 'posted');

  const updated = await prisma.socialPost.update({
    where: { id: post.id },
    data: {
      status: anyPosted ? 'POSTED' : (onFailureStatus || post.status),
      ...(anyPosted ? { postedAt: new Date() } : {}),
      deliveryLog: serializeLog(allResults),
    },
  });

  return { ok: anyPosted, results: allResults, post: updated };
}

/**
 * Atomically take ownership of a scheduled post.
 *
 * `updateMany` with `status: 'SCHEDULED'` in the WHERE clause is a single
 * conditional UPDATE: exactly one concurrent caller can move the row out of
 * SCHEDULED, and everyone else gets count 0 and walks away. This is the whole
 * idempotency guarantee, and it lives in the database precisely because separate
 * app processes (Passenger workers, an external pinger) share no memory.
 */
async function claimPost(id, now) {
  const { count } = await prisma.socialPost.updateMany({
    where: { id, status: 'SCHEDULED' },
    data: {
      status: 'PUBLISHING',
      attemptCount: { increment: 1 },
      lastAttemptAt: now,
    },
  });
  return count === 1;
}

async function failPost(id, message, now) {
  await prisma.socialPost.update({
    where: { id },
    data: {
      status: 'FAILED',
      lastAttemptAt: now,
      deliveryLog: serializeLog([{
        platform: 'SCHEDULER',
        status: 'failed',
        message,
        shareUrl: '',
        postId: '',
      }]),
    },
  });
}

/**
 * Return posts stuck in PUBLISHING past STALE_CLAIM_MS to SCHEDULED (or FAILED
 * if attempts are spent), so a process restarted mid-publish does not leave a
 * post permanently invisible to the runner.
 */
async function recoverStaleClaims(now) {
  const cutoff = new Date(now.getTime() - STALE_CLAIM_MS);
  const stale = await prisma.socialPost.findMany({
    where: { status: 'PUBLISHING', lastAttemptAt: { lt: cutoff } },
    select: { id: true, attemptCount: true },
  });

  for (const post of stale) {
    await prisma.socialPost.updateMany({
      where: { id: post.id, status: 'PUBLISHING' },
      data: { status: post.attemptCount >= MAX_ATTEMPTS ? 'FAILED' : 'SCHEDULED' },
    });
  }

  return stale.length;
}

/**
 * One scheduler pass. Safe to call concurrently and safe to call far more often
 * than posts are due; it is a no-op when nothing is claimable.
 */
export async function runScheduledSocialPosts({
  now = new Date(),
  publisher,
  configLoader,
  limit = MAX_POSTS_PER_RUN,
} = {}) {
  const summary = {
    ranAt: now.toISOString(),
    recovered: await recoverStaleClaims(now),
    considered: 0,
    claimed: 0,
    published: 0,
    failed: 0,
    skippedTooOld: 0,
    skippedClaimedElsewhere: 0,
    posts: [],
  };

  const due = await prisma.socialPost.findMany({
    where: { status: 'SCHEDULED', scheduledFor: { not: null, lte: now } },
    orderBy: { scheduledFor: 'asc' },
    take: limit,
  });

  summary.considered = due.length;

  for (const candidate of due) {
    if (isTooOverdue(candidate.scheduledFor, now)) {
      // Claim it first so the FAILED write cannot race a concurrent publish.
      if (!await claimPost(candidate.id, now)) {
        summary.skippedClaimedElsewhere += 1;
        continue;
      }
      await failPost(
        candidate.id,
        `Not published: scheduled time was more than ${Math.round(MAX_OVERDUE_MS / 3600000)} hours ago. Review the copy and re-schedule.`,
        now,
      );
      summary.skippedTooOld += 1;
      summary.failed += 1;
      summary.posts.push({ id: candidate.id, outcome: 'too_old' });
      continue;
    }

    if (!await claimPost(candidate.id, now)) {
      summary.skippedClaimedElsewhere += 1;
      continue;
    }
    summary.claimed += 1;

    const attempts = (candidate.attemptCount || 0) + 1;

    try {
      const outcome = await publishStoredSocialPost(
        { ...candidate, attemptCount: attempts },
        { publisher, configLoader, onFailureStatus: statusAfterFailedAttempt(attempts) },
      );

      if (outcome.ok) {
        summary.published += 1;
        summary.posts.push({ id: candidate.id, outcome: 'posted' });
      } else {
        summary.failed += 1;
        summary.posts.push({
          id: candidate.id,
          outcome: 'failed',
          message: outcome.error || outcome.results?.find((r) => r.status === 'failed')?.message || '',
        });
      }
    } catch (error) {
      // One bad post must never abort the run: release the claim (bounded by
      // MAX_ATTEMPTS) and carry on with the rest of the batch.
      await prisma.socialPost.update({
        where: { id: candidate.id },
        data: {
          status: statusAfterFailedAttempt(attempts),
          deliveryLog: serializeLog([{
            platform: 'SCHEDULER',
            status: 'failed',
            message: error.message || 'Unexpected scheduler error.',
            shareUrl: '',
            postId: '',
          }]),
        },
      }).catch(() => {});
      summary.failed += 1;
      summary.posts.push({ id: candidate.id, outcome: 'error', message: error.message || '' });
    }
  }

  return summary;
}

let intervalHandle = null;

/**
 * The primary scheduler mechanism: an in-process loop in the long-running
 * Hostinger Node app. ON by default — see resolveIntervalConfig for the env
 * overrides. Running alongside an external pinger is safe: the database claim,
 * not process count, is what prevents double-posting.
 */
export function startInProcessSocialScheduler() {
  if (intervalHandle) return { started: false, reason: 'already_running' };

  const config = resolveIntervalConfig();
  if (!config.enabled) return { started: false, reason: config.reason };

  const { intervalMs } = config;
  intervalHandle = setInterval(() => {
    runScheduledSocialPosts()
      .then((summary) => {
        if (summary.claimed || summary.failed || summary.recovered) {
          console.log('[social-scheduler]', JSON.stringify(summary));
        }
      })
      .catch((error) => console.error('[social-scheduler] run failed:', error.message || error));
  }, intervalMs);
  intervalHandle.unref?.();

  return { started: true, intervalMs };
}

export function stopInProcessSocialScheduler() {
  if (!intervalHandle) return false;
  clearInterval(intervalHandle);
  intervalHandle = null;
  return true;
}
