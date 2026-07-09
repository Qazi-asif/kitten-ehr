const cache = new Map();

export function getCachedValue(key, ttlMs) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.fetchedAt > ttlMs) return null;
  return entry.data;
}

export function setCachedValue(key, data) {
  cache.set(key, { data, fetchedAt: Date.now() });
}

export function invalidateCache(keyPrefix) {
  for (const key of cache.keys()) {
    if (key.startsWith(keyPrefix)) {
      cache.delete(key);
    }
  }
}

export async function cachedRequest(key, fetcher, ttlMs = 60_000) {
  const cached = getCachedValue(key, ttlMs);
  if (cached != null) {
    return cached;
  }

  const pending = cache.get(`${key}:pending`);
  if (pending?.promise) {
    return pending.promise;
  }

  const promise = Promise.resolve()
    .then(fetcher)
    .then((data) => {
      setCachedValue(key, data);
      cache.delete(`${key}:pending`);
      return data;
    })
    .catch((error) => {
      cache.delete(`${key}:pending`);
      throw error;
    });

  cache.set(`${key}:pending`, { promise });
  return promise;
}
