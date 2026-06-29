import prisma from '../lib/prisma.js';
import { hashPassword, sanitizeUser } from '../utils/authUtils.js';

export async function listUsers(req, res) {
  const users = await prisma.user.findMany({
    include: { role: true },
    orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
  });

  return res.json(users.map(sanitizeUser));
}

export async function createUser(req, res) {
  const { email, password, firstName, lastName, roleId, isActive = true, fosterId } = req.body;

  if (!email?.trim() || !password || !firstName?.trim() || !lastName?.trim() || !roleId) {
    return res.status(400).json({ error: 'Email, password, name, and role are required' });
  }

  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' });
  }

  const role = await prisma.role.findUnique({ where: { id: Number.parseInt(roleId, 10) } });
  if (!role) {
    return res.status(400).json({ error: 'Invalid role' });
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
        fosterId: fosterId ? Number.parseInt(fosterId, 10) : null,
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
  if (fosterId !== undefined) data.fosterId = fosterId ? Number.parseInt(fosterId, 10) : null;

  if (password) {
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }
    data.passwordHash = await hashPassword(password);
  }

  try {
    const user = await prisma.user.update({
      where: { id },
      data,
      include: { role: true },
    });

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

  return res.json({ message: 'User deactivated' });
}
