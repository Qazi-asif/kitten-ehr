import { PrismaClient } from '@prisma/client';
import { comparePassword, hashPassword, sanitizeUser, signToken } from '../utils/authUtils.js';

const prisma = new PrismaClient();

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

export async function login(req, res) {
  const { email, password } = req.body;

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

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  return res.json(formatAuthResponse(user));
}

export async function getMe(req, res) {
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
}

export async function changePassword(req, res) {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword || newPassword.length < 8) {
    return res.status(400).json({ error: 'New password must be at least 8 characters' });
  }

  const user = await prisma.user.findUnique({ where: { id: req.user.id } });
  const valid = await comparePassword(currentPassword, user.passwordHash);

  if (!valid) {
    return res.status(401).json({ error: 'Current password is incorrect' });
  }

  await prisma.user.update({
    where: { id: req.user.id },
    data: { passwordHash: await hashPassword(newPassword) },
  });

  return res.json({ message: 'Password updated' });
}
