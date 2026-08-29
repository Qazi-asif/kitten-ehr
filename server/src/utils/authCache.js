const CACHE_TTL_MS = 5 * 60 * 1000;
const MAX_CACHE_SIZE = 500;
const cache = new Map();

function evictIfNeeded() {
  if (cache.size < MAX_CACHE_SIZE) return;
  const oldestKey = cache.keys().next().value;
  if (oldestKey !== undefined) cache.delete(oldestKey);
}

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
  evictIfNeeded();
  cache.set(userId, { data, cachedAt: Date.now() });
}

export function clearCachedAuth(userId) {
  cache.delete(userId);
}

export function clearAllCachedAuth() {
  cache.clear();
}
