/**
 * Authorisation for cron-triggered endpoints.
 *
 * A cron invocation has no user session, so the only credential it can present is
 * a shared secret: either `Authorization: Bearer $CRON_SECRET` or an
 * `x-cron-secret` header.
 *
 * The secret is REQUIRED: with CRON_SECRET unset the endpoint refuses to run
 * rather than standing open, because an open endpoint would let anyone on the
 * internet trigger publishing to the organisation's Facebook page.
 */
import crypto from 'crypto';

function safeEqual(a, b) {
  const left = Buffer.from(String(a));
  const right = Buffer.from(String(b));
  if (left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
}

export function requireCronSecret(req, res, next) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) {
    return res.status(503).json({
      error: 'Scheduler is not configured: CRON_SECRET is not set on this deployment.',
    });
  }

  const header = req.get('authorization') || '';
  const bearer = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  // x-cron-secret lets a plain crontab / uptime pinger authenticate without
  // shell-quoting an Authorization header.
  const alternate = req.get('x-cron-secret')?.trim() || '';

  if ((bearer && safeEqual(bearer, secret)) || (alternate && safeEqual(alternate, secret))) {
    return next();
  }

  return res.status(401).json({ error: 'Unauthorized' });
}
