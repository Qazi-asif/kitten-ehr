/**
 * Resolves the real client IP address from an Express request running behind
 * Vercel's proxy. Vercel sets x-forwarded-for reliably; the first address in
 * that comma-separated list is the original client (subsequent entries are
 * intermediate proxies). Falls back to the raw socket address for local dev,
 * where no proxy header is present.
 *
 * Never trust a client-supplied IP field in the request body - this reads
 * only from the connection/headers, which the client cannot control.
 */
export function getClientIp(req) {
  const forwardedFor = req.headers?.['x-forwarded-for'];

  if (typeof forwardedFor === 'string' && forwardedFor.trim()) {
    const first = forwardedFor.split(',')[0].trim();
    if (first) return first;
  }

  if (Array.isArray(forwardedFor) && forwardedFor.length > 0) {
    const first = forwardedFor[0]?.split(',')[0]?.trim();
    if (first) return first;
  }

  return req.socket?.remoteAddress || req.connection?.remoteAddress || 'unknown';
}
