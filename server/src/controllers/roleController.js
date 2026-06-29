import { PrismaClient } from '@prisma/client';
import { PERMISSIONS } from '../constants/permissions.js';

const prisma = new PrismaClient();

export async function listPermissions(req, res) {
  return res.json(PERMISSIONS);
}

export async function listRoles(req, res) {
  const roles = await prisma.role.findMany({
    include: {
      permissions: { include: { permission: true } },
      _count: { select: { users: true } },
    },
    orderBy: { name: 'asc' },
  });

  return res.json(
    roles.map((role) => ({
      id: role.id,
      name: role.name,
      description: role.description,
      isSystem: role.isSystem,
      userCount: role._count.users,
      permissions: role.permissions.map((rp) => rp.permission.key),
    })),
  );
}

export async function createRole(req, res) {
  const { name, description = '', permissions = [] } = req.body;

  if (!name?.trim()) {
    return res.status(400).json({ error: 'Role name is required' });
  }

  const validKeys = new Set(PERMISSIONS.map((p) => p.key));
  const permissionKeys = permissions.filter((k) => validKeys.has(k));

  const permissionRecords = await prisma.permission.findMany({
    where: { key: { in: permissionKeys } },
  });

  const role = await prisma.role.create({
    data: {
      name: name.trim(),
      description: description.trim(),
      isSystem: false,
      permissions: {
        create: permissionRecords.map((p) => ({ permissionId: p.id })),
      },
    },
    include: {
      permissions: { include: { permission: true } },
      _count: { select: { users: true } },
    },
  });

  return res.status(201).json({
    id: role.id,
    name: role.name,
    description: role.description,
    isSystem: role.isSystem,
    userCount: role._count.users,
    permissions: role.permissions.map((rp) => rp.permission.key),
  });
}

export async function updateRole(req, res) {
  const id = Number.parseInt(req.params.id, 10);
  const { name, description, permissions } = req.body;

  const existing = await prisma.role.findUnique({ where: { id } });
  if (!existing) {
    return res.status(404).json({ error: 'Role not found' });
  }

  const data = {};
  if (name !== undefined) data.name = name.trim();
  if (description !== undefined) data.description = description.trim();

  await prisma.role.update({ where: { id }, data });

  if (Array.isArray(permissions)) {
    const validKeys = new Set(PERMISSIONS.map((p) => p.key));
    const permissionKeys = permissions.filter((k) => validKeys.has(k));
    const permissionRecords = await prisma.permission.findMany({
      where: { key: { in: permissionKeys } },
    });

    await prisma.rolePermission.deleteMany({ where: { roleId: id } });
    if (permissionRecords.length > 0) {
      await prisma.rolePermission.createMany({
        data: permissionRecords.map((p) => ({ roleId: id, permissionId: p.id })),
      });
    }
  }

  const role = await prisma.role.findUnique({
    where: { id },
    include: {
      permissions: { include: { permission: true } },
      _count: { select: { users: true } },
    },
  });

  return res.json({
    id: role.id,
    name: role.name,
    description: role.description,
    isSystem: role.isSystem,
    userCount: role._count.users,
    permissions: role.permissions.map((rp) => rp.permission.key),
  });
}

export async function deleteRole(req, res) {
  const id = Number.parseInt(req.params.id, 10);

  const existing = await prisma.role.findUnique({
    where: { id },
    include: { _count: { select: { users: true } } },
  });

  if (!existing) {
    return res.status(404).json({ error: 'Role not found' });
  }

  if (existing.isSystem) {
    return res.status(400).json({ error: 'System roles cannot be deleted' });
  }

  if (existing._count.users > 0) {
    return res.status(400).json({ error: 'Reassign users before deleting this role' });
  }

  await prisma.role.delete({ where: { id } });
  return res.json({ message: 'Role deleted' });
}
