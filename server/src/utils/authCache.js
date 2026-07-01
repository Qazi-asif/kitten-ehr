const CACHE_TTL_MS = 5 * 60 * 1000;
const cache = new Map();

export function getCachedAuth(userId) {
  const entry = cache.get(userId);
  if (!entry) return null;
  if (Date.now() - entry.cachedAt > CACHE_TTL_MS) {
    cache.delete(userId);
    return null;
  }
  return entry.data;
}

export function setCachedAuth(userId, data) {
  cache.set(userId, { data, cachedAt: Date.now() });
}

export function clearCachedAuth(userId) {
  cache.delete(userId);
}
