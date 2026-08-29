/**
 * Handlers for scheduled (cron) triggers.
 *
 * These run with no user session, so they are not behind requireAuth /
 * requirePermission. Authorisation is the shared CRON_SECRET instead — see
 * requireCronSecret in ../middleware/cronAuth.js.
 */
import { runScheduledSocialPosts } from '../services/socialPostScheduler.js';

export async function runSocialPostScheduler(req, res, next) {
  try {
    const summary = await runScheduledSocialPosts();
    console.log('[cron:social-posts]', JSON.stringify(summary));
    res.json({ ok: true, ...summary });
  } catch (error) {
    next(error);
  }
}
