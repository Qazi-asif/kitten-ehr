import prisma from '../lib/prisma.js';
import { DEFAULT_ROLES, PERMISSIONS } from '../constants/permissions.js';
import { clearAllCachedAuth } from './authCache.js';

/**
 * Upserts all permission rows and additively grants each system role the
 * keys listed in DEFAULT_ROLES. Does not strip custom grants from roles.
 * Safe to run on every Hostinger boot after deploy.
 */
export async function syncPermissionsFromDefaults() {
  for (const perm of PERMISSIONS) {
    await prisma.permission.upsert({
      where: { key: perm.key },
      create: { key: perm.key, label: perm.label, module: perm.module },
      update: { label: perm.label, module: perm.module },
    });
  }

  const permissionRecords = await prisma.permission.findMany();
  const permissionByKey = Object.fromEntries(permissionRecords.map((p) => [p.key, p.id]));

  for (const roleDef of DEFAULT_ROLES) {
    const role = await prisma.role.findUnique({ where: { name: roleDef.name } });
    if (!role) continue;

    for (const key of roleDef.permissions) {
      const permissionId = permissionByKey[key];
      if (!permissionId) continue;

      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: role.id,
            permissionId,
          },
        },
        create: {
          roleId: role.id,
          permissionId,
        },
        update: {},
      });
    }
  }

  // New grants must take effect immediately on Hostinger (auth cache is on).
  clearAllCachedAuth();

  return {
    permissionCount: PERMISSIONS.length,
    roleCount: DEFAULT_ROLES.length,
  };
}
