/**
 * Handlers for scheduled (cron) triggers.
 *
 * These run with no user session, so they are not behind requireAuth /
 * requirePermission. Authorisation is the shared CRON_SECRET instead — see
 * requireCronSecret in ../middleware/cronAuth.js.
 */
import { runScheduledSocialPosts } from '../services/socialPostScheduler.js';
import { processOutbox, reconcileListings } from '../services/syndicationService.js';

export async function runSocialPostScheduler(req, res, next) {
  try {
    const summary = await runScheduledSocialPosts();
    console.log('[cron:social-posts]', JSON.stringify(summary));
    res.json({ ok: true, ...summary });
  } catch (error) {
    next(error);
  }
}

export async function runSyndicationOutbox(req, res, next) {
  try {
    const summary = await processOutbox();
    console.log('[cron:syndication-outbox]', JSON.stringify(summary));
    res.json({ ok: true, ...summary });
  } catch (error) {
    next(error);
  }
}

export async function runSyndicationReconcile(req, res, next) {
  try {
    const summary = await reconcileListings();
    console.log('[cron:syndication-reconcile]', JSON.stringify(summary));
    res.json({ ok: true, ...summary });
  } catch (error) {
    next(error);
  }
}
