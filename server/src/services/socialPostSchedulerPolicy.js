/**
 * Scheduling policy for SocialPost auto-publishing: the decisions, with no
 * database or network involved.
 *
 * Kept separate from socialPostScheduler.js so these rules — which are the ones
 * that decide whether the organisation's Facebook page gets posted to — can be
 * unit tested without a database connection or any risk of a live publish.
 */

/** Platforms with a real Graph API implementation. X/TikTok have none. */
export const AUTO_PUBLISH_PLATFORMS = ['FACEBOOK', 'INSTAGRAM'];

/**
 * A post more overdue than this is never published. If the scheduler is down
 * for a week we must not suddenly blast a backlog of stale copy at followers;
 * such a post is marked FAILED so staff re-schedule it deliberately.
 */
export const MAX_OVERDUE_MS = 48 * 60 * 60 * 1000;

/**
 * Attempts before a post is given up on, so a permanently broken post (revoked
 * token, an image Instagram rejects) is not retried forever.
 */
export const MAX_ATTEMPTS = 3;

/**
 * A PUBLISHING claim older than this is presumed abandoned — the process was
 * restarted mid-publish. Recovery returns it to SCHEDULED.
 */
export const STALE_CLAIM_MS = 15 * 60 * 1000;

/** Posts handled per run, so one pass cannot run unboundedly long. */
export const MAX_POSTS_PER_RUN = 10;

/** Floor for the interval, so a typo cannot hammer the database. */
export const MIN_INTERVAL_MS = 60_000;

/**
 * Default poll interval. A pass with nothing due is two indexed reads against
 * the [status, scheduledFor] index, so polling this often is cheap, and staff
 * schedule posts to the minute — a longer interval would just publish late.
 */
export const DEFAULT_INTERVAL_MS = 60_000;

/**
 * Where a failed scheduler attempt leaves the post: FAILED once attempts are
 * spent, otherwise back to SCHEDULED so a later run picks it up.
 */
export function statusAfterFailedAttempt(attemptCount) {
  return attemptCount >= MAX_ATTEMPTS ? 'FAILED' : 'SCHEDULED';
}

/** True when the scheduled time is so long past that publishing is wrong. */
export function isTooOverdue(scheduledFor, now, maxOverdueMs = MAX_OVERDUE_MS) {
  if (!scheduledFor) return false;
  return new Date(scheduledFor).getTime() < now.getTime() - maxOverdueMs;
}

/** Split a post's platforms into those we can publish and those we cannot. */
export function splitPlatforms(platforms) {
  const list = Array.isArray(platforms) ? platforms : [];
  return {
    targets: list.filter((platform) => AUTO_PUBLISH_PLATFORMS.includes(platform)),
    unsupported: list.filter((platform) => !AUTO_PUBLISH_PLATFORMS.includes(platform)),
  };
}

/** Env values that mean "off" for SOCIAL_SCHEDULER_ENABLED. */
const OFF_VALUES = new Set(['0', 'false', 'off', 'no']);

/**
 * Decide whether the in-process interval runner should start, from environment
 * alone.
 *
 * The deployment target is Hostinger: a long-running Node process under
 * Passenger. The interval runner is therefore the primary mechanism and is ON by
 * default — a scheduler that only works when someone remembers to set an env var
 * is a scheduler that silently does not work.
 *
 * SOCIAL_SCHEDULER_ENABLED=false turns it off; SOCIAL_SCHEDULER_INTERVAL_MS
 * overrides the interval (floored at MIN_INTERVAL_MS).
 */
export function resolveIntervalConfig(env = process.env) {
  const flag = env.SOCIAL_SCHEDULER_ENABLED?.trim().toLowerCase();
  if (flag && OFF_VALUES.has(flag)) return { enabled: false, reason: 'disabled_by_env' };

  const raw = Number.parseInt(env.SOCIAL_SCHEDULER_INTERVAL_MS || '', 10);
  const requested = Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_INTERVAL_MS;
  return { enabled: true, intervalMs: Math.max(MIN_INTERVAL_MS, requested) };
}
