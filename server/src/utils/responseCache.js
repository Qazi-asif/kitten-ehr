const caches = new Map();

export function getCachedResponse(key, ttlMs) {
  const entry = caches.get(key);
  if (!entry) return null;
  if (Date.now() - entry.cachedAt > ttlMs) {
    caches.delete(key);
    return null;
  }
  return entry.data;
}

export function setCachedResponse(key, data) {
  caches.set(key, { data, cachedAt: Date.now() });
}
