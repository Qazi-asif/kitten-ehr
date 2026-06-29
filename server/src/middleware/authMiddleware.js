import { PrismaClient } from '@prisma/client';
import { verifyToken } from '../utils/authUtils.js';

const prisma = new PrismaClient();

async function loadUserWithPermissions(userId) {
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
  return { user, permissions };
}

export async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const token = authHeader.slice(7);

  try {
    const decoded = verifyToken(token);
    const result = await loadUserWithPermissions(decoded.userId);

    if (!result) {
      return res.status(401).json({ error: 'Invalid or inactive user' });
    }

    req.user = result.user;
    req.permissions = result.permissions;
    return next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
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
