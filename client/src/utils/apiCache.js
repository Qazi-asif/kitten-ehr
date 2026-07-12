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

// Safety-net ceiling for any single request routed through cachedRequest.
// Cleared on settle, so it never affects requests that resolve normally -
// it only exists to recover a request that would otherwise stay pending
// for the life of the tab (e.g. a stalled connection or wedged function).
const DEFAULT_TIMEOUT_MS = 20_000;

export async function cachedRequest(key, fetcher, ttlMs = 60_000, timeoutMs = DEFAULT_TIMEOUT_MS) {
  const cached = getCachedValue(key, ttlMs);
  if (cached != null) {
    return cached;
  }

  const pending = cache.get(`${key}:pending`);
  if (pending?.promise) {
    return pending.promise;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  const promise = Promise.resolve()
    .then(() => fetcher(controller.signal))
    .then((data) => {
      clearTimeout(timeoutId);
      setCachedValue(key, data);
      cache.delete(`${key}:pending`);
      return data;
    })
    .catch((error) => {
      clearTimeout(timeoutId);
      cache.delete(`${key}:pending`);
      if (error?.name === 'AbortError') {
        throw new Error('Request timed out. Please try again.');
      }
      throw error;
    });

  cache.set(`${key}:pending`, { promise });
  return promise;
}
