import prisma from '../lib/prisma.js';
import { comparePassword, hashPassword, sanitizeUser, signToken } from '../utils/authUtils.js';
import { validatePasswordStrength } from '../utils/passwordPolicy.js';

function userPermissions(user) {
  return user.role.permissions.map((rp) => rp.permission.key);
}

function formatAuthResponse(user) {
  const permissions = userPermissions(user);
  const safeUser = sanitizeUser(user);

  return {
    token: signToken({
      userId: user.id,
      email: user.email,
      roleId: user.roleId,
      roleName: user.role.name,
      permissions,
    }),
    user: {
      ...safeUser,
      roleName: user.role.name,
      permissions,
    },
  };
}

export async function login(req, res, next) {
  try {
    const { email, password, flow } = req.body;

    if (!email?.trim() || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
      include: {
        role: {
          include: {
            permissions: { include: { permission: true } },
          },
        },
      },
    });

    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const valid = await comparePassword(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Two flows share this one endpoint - portalAuthApi.js deliberately
    // posts here (with flow: 'portal') instead of a separate portal route.
    // `flow` is the only signal distinguishing which frontend sent the
    // request, so the isPortalRole check must be symmetric and flow-aware,
    // not a blanket rejection. A blanket rejection was the exact regression:
    // legitimate portal accounts got rejected even when submitting through
    // /portal/login itself, because the check didn't know which page it was.
    //
    // Checked only after password validation, so an invalid password never
    // reveals an email's account type. This mirrors the isPortalRole check
    // requireAuth already performs on every subsequent staff API call - the
    // gap this closes is that, before this check, a portal account could
    // still receive a valid *staff* token right here at login and only find
    // out something was wrong once every admin page came back empty/403.
    const isPortalFlow = flow === 'portal';

    if (isPortalFlow && !user.role.isPortalRole) {
      return res.status(403).json({
        error: 'This account uses the staff login, not the Foster Portal login.',
      });
    }

    if (!isPortalFlow && user.role.isPortalRole) {
      return res.status(403).json({
        error: 'This account uses the Foster Portal login. Please sign in at /portal/login instead.',
        portalLoginUrl: '/portal/login',
      });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    let authResponse;
    try {
      authResponse = formatAuthResponse(user);
    } catch (error) {
      if (error.message?.includes('JWT_SECRET')) {
        return res.status(503).json({ error: 'Server misconfigured: JWT_SECRET is not set. Add it to server/.env and restart the API.' });
      }
      throw error;
    }

    return res.json(authResponse);
  } catch (error) {
    next(error);
  }
}

export async function getMe(req, res, next) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: {
        role: {
          include: {
            permissions: { include: { permission: true } },
          },
        },
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const permissions = userPermissions(user);
    return res.json({
      ...sanitizeUser(user),
      roleName: user.role.name,
      permissions,
    });
  } catch (error) {
    next(error);
  }
}

export async function changePassword(req, res, next) {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current and new password are required' });
    }

    const passwordError = validatePasswordStrength(newPassword);
    if (passwordError) {
      return res.status(400).json({ error: passwordError });
    }

    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const valid = await comparePassword(currentPassword, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    await prisma.user.update({
      where: { id: req.user.id },
      data: { passwordHash: await hashPassword(newPassword) },
    });

    return res.json({ message: 'Password updated' });
  } catch (error) {
    next(error);
  }
}
