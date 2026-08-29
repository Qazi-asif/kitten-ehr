function addOrigin(set, value) {
  if (value) set.add(value.replace(/\/$/, ''));
}

export function createOriginValidator() {
  const allowed = new Set();

  addOrigin(allowed, process.env.CLIENT_URL);
  addOrigin(allowed, process.env.PUBLIC_SITE_URL);

  if (process.env.CLIENT_URLS) {
    for (const origin of process.env.CLIENT_URLS.split(',')) {
      addOrigin(allowed, origin.trim());
    }
  }

  addOrigin(allowed, 'http://localhost:5173');
  addOrigin(allowed, 'http://127.0.0.1:5173');

  // Production site. Both hosts answer on their own (neither redirects to the
  // other), so both must be trusted or one of them loses every API call.
  addOrigin(allowed, 'https://pawsitivetransformations.org');
  addOrigin(allowed, 'https://www.pawsitivetransformations.org');

  // The Hostinger-assigned hostname for this same site, still reachable and
  // still used to check a deploy before the custom domain is looked at.
  // Exact match only: a `*.hostingersite.com` pattern would trust every other
  // Hostinger customer's subdomain against this API.
  addOrigin(allowed, 'https://mediumslateblue-hornet-819977.hostingersite.com');

  return function isOriginAllowed(origin) {
    if (!origin) return true;
    if (allowed.has(origin)) return true;

    try {
      const url = new URL(origin);
      const { hostname, protocol } = url;

      if (protocol === 'http:' && (hostname === 'localhost' || hostname === '127.0.0.1')) {
        return true;
      }
    } catch {
      return false;
    }

    return false;
  };
}
