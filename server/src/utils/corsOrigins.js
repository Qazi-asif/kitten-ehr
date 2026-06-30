function addOrigin(set, value) {
  if (value) set.add(value.replace(/\/$/, ''));
}

export function createOriginValidator() {
  const allowed = new Set();

  addOrigin(allowed, process.env.CLIENT_URL);

  if (process.env.CLIENT_URLS) {
    for (const origin of process.env.CLIENT_URLS.split(',')) {
      addOrigin(allowed, origin.trim());
    }
  }

  addOrigin(allowed, 'http://localhost:5173');
  addOrigin(allowed, 'http://127.0.0.1:5173');
  addOrigin(allowed, 'https://kitten-ehr.vercel.app');

  if (process.env.VERCEL_URL) {
    addOrigin(allowed, `https://${process.env.VERCEL_URL}`);
  }

  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    addOrigin(allowed, `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`);
  }

  return function isOriginAllowed(origin) {
    if (!origin) return true;
    if (allowed.has(origin)) return true;

    try {
      const url = new URL(origin);
      const { hostname, protocol } = url;

      if (protocol === 'http:' && (hostname === 'localhost' || hostname === '127.0.0.1')) {
        return true;
      }

      if (protocol === 'https:' && hostname.endsWith('.vercel.app')) {
        return true;
      }
    } catch {
      return false;
    }

    return false;
  };
}
