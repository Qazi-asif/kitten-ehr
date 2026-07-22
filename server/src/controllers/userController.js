import prisma from '../lib/prisma.js';
import { hashPassword, sanitizeUser } from '../utils/authUtils.js';
import { validatePasswordStrength } from '../utils/passwordPolicy.js';
import { paginatedResponse, parsePagination, wantsPagination } from '../utils/pagination.js';
import { clearCachedAuth } from '../utils/authCache.js';

async function validateFosterId(fosterId) {
  if (fosterId == null || fosterId === '') return null;
  const parsed = Number.parseInt(fosterId, 10);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return { error: 'Invalid foster id' };
  }
  const foster = await prisma.foster.findUnique({ where: { id: parsed }, select: { id: true } });
  if (!foster) return { error: 'Foster not found' };
  return { id: parsed };
}

export async function listUsers(req, res) {
  if (!wantsPagination(req.query)) {
    const users = await prisma.user.findMany({
      include: { role: true },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
      take: 200,
    });
    return res.json(users.map(sanitizeUser));
  }

  const { page, limit, skip } = parsePagination(req.query, 50);
  const [total, users] = await Promise.all([
    prisma.user.count(),
    prisma.user.findMany({
      include: { role: true },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
      skip,
      take: limit,
    }),
  ]);

  return res.json(paginatedResponse(users.map(sanitizeUser), total, page, limit));
}

export async function createUser(req, res) {
  const { email, password, firstName, lastName, roleId, isActive = true, fosterId } = req.body;

  if (!email?.trim() || !password || !firstName?.trim() || !lastName?.trim() || !roleId) {
    return res.status(400).json({ error: 'Email, password, name, and role are required' });
  }

  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' });
  }

  const passwordError = validatePasswordStrength(password);
  if (passwordError) {
    return res.status(400).json({ error: passwordError });
  }

  const role = await prisma.role.findUnique({ where: { id: Number.parseInt(roleId, 10) } });
  if (!role) {
    return res.status(400).json({ error: 'Invalid role' });
  }

  const fosterResult = await validateFosterId(fosterId);
  if (fosterResult?.error) {
    return res.status(400).json({ error: fosterResult.error });
  }

  try {
    const user = await prisma.user.create({
      data: {
        email: email.trim().toLowerCase(),
        passwordHash: await hashPassword(password),
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        roleId: role.id,
        isActive: Boolean(isActive),
        fosterId: fosterResult?.id ?? null,
      },
      include: { role: true },
    });

    return res.status(201).json(sanitizeUser(user));
  } catch (err) {
    if (err.code === 'P2002') {
      return res.status(409).json({ error: 'Email already in use' });
    }
    throw err;
  }
}

export async function updateUser(req, res) {
  const id = Number.parseInt(req.params.id, 10);
  const { email, password, firstName, lastName, roleId, isActive, fosterId } = req.body;

  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing) {
    return res.status(404).json({ error: 'User not found' });
  }

  const data = {};

  if (email !== undefined) data.email = email.trim().toLowerCase();
  if (firstName !== undefined) data.firstName = firstName.trim();
  if (lastName !== undefined) data.lastName = lastName.trim();
  if (roleId !== undefined) data.roleId = Number.parseInt(roleId, 10);
  if (isActive !== undefined) data.isActive = Boolean(isActive);
  if (fosterId !== undefined) {
    const fosterResult = await validateFosterId(fosterId);
    if (fosterResult?.error) {
      return res.status(400).json({ error: fosterResult.error });
    }
    data.fosterId = fosterResult?.id ?? null;
  }

  if (password) {
    const passwordError = validatePasswordStrength(password);
    if (passwordError) {
      return res.status(400).json({ error: passwordError });
    }
    data.passwordHash = await hashPassword(password);
  }

  try {
    const user = await prisma.user.update({
      where: { id },
      data,
      include: { role: true },
    });

    // Role, foster linkage, and active flag drive auth middleware. All three
    // are read from the cached user record on Hostinger (cache is enabled when
    // VERCEL is unset), so invalidate immediately on any of these changes.
    if (
      data.roleId !== undefined
      || data.fosterId !== undefined
      || data.isActive !== undefined
      || data.passwordHash !== undefined
    ) {
      clearCachedAuth(id);
    }

    return res.json(sanitizeUser(user));
  } catch (err) {
    if (err.code === 'P2002') {
      return res.status(409).json({ error: 'Email already in use' });
    }
    throw err;
  }
}

export async function deleteUser(req, res) {
  const id = Number.parseInt(req.params.id, 10);

  if (id === req.user.id) {
    return res.status(400).json({ error: 'You cannot deactivate your own account' });
  }

  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing) {
    return res.status(404).json({ error: 'User not found' });
  }

  await prisma.user.update({
    where: { id },
    data: { isActive: false },
  });

  clearCachedAuth(id);

  return res.json({ message: 'User deactivated' });
}
