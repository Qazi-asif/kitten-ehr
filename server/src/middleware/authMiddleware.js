import prisma from '../lib/prisma.js';
import { verifyToken } from '../utils/authUtils.js';
import { getCachedAuth, setCachedAuth } from '../utils/authCache.js';

async function loadUserWithPermissions(userId) {
  const cached = getCachedAuth(userId);
  if (cached) return cached;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      role: {
        include: {
          permissions: {
            include: { permission: true },
          },
        },
      },
    },
  });

  if (!user || !user.isActive) return null;

  const permissions = user.role.permissions.map((rp) => rp.permission.key);
  const result = { user, permissions };
  setCachedAuth(userId, result);
  return result;
}

// Shared by requireAuth and requirePortalAuth: verifies the bearer token and
// loads the user + permissions. Returns either { result } or an
// { error, message } pair describing the 401 to send. Deliberately preserves
// the original single try/catch around both verifyToken and
// loadUserWithPermissions, so a DB error during the user lookup still comes
// back as "Invalid or expired token" rather than an unhandled 500, matching
// this middleware's pre-existing behavior.
async function authenticateRequest(req) {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    return { error: 401, message: 'Authentication required' };
  }

  const token = authHeader.slice(7);

  try {
    const decoded = verifyToken(token);
    const result = await loadUserWithPermissions(decoded.userId);

    if (!result) {
      return { error: 401, message: 'Invalid or inactive user' };
    }

    return { result };
  } catch {
    return { error: 401, message: 'Invalid or expired token' };
  }
}

// Staff/admin auth. Blanket-rejects Foster Portal accounts here, in the one
// middleware every existing /api/* staff route already runs through -
// closes the gap where a route had requireAuth but no requirePermission
// (e.g. GET /api/fosters, GET /api/settings), which would otherwise let a
// portal-scoped token read staff-only data just by being authenticated.
export async function requireAuth(req, res, next) {
  const auth = await authenticateRequest(req);
  if (auth.error) {
    return res.status(auth.error).json({ error: auth.message });
  }

  if (auth.result.user.role.isPortalRole) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  req.user = auth.result.user;
  req.permissions = auth.result.permissions;
  return next();
}

// Foster Portal auth. Mirror image of requireAuth: only accepts a Foster
// Portal role, rejects staff tokens, and additionally requires the account
// to actually be linked to a Foster record - a portal-role user with no
// fosterId can't be scoped to anything, so it's rejected explicitly here
// rather than silently falling through to scoped queries that return
// nothing.
export async function requirePortalAuth(req, res, next) {
  const auth = await authenticateRequest(req);
  if (auth.error) {
    return res.status(auth.error).json({ error: auth.message });
  }

  if (!auth.result.user.role.isPortalRole) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  if (!auth.result.user.fosterId) {
    return res.status(403).json({ error: 'This account is not linked to a foster record' });
  }

  req.user = auth.result.user;
  req.permissions = auth.result.permissions;
  return next();
}

export function requirePermission(...required) {
  return (req, res, next) => {
    const granted = req.permissions || [];
    const hasAll = required.every((p) => granted.includes(p));

    if (!hasAll) {
      return res.status(403).json({
        error: 'Forbidden',
        message: `Missing permission: ${required.join(', ')}`,
      });
    }

    return next();
  };
}

export function requireAnyPermission(...required) {
  return (req, res, next) => {
    const granted = req.permissions || [];
    const hasAny = required.some((p) => granted.includes(p));

    if (!hasAny) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    return next();
  };
}
