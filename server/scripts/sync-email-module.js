import { PrismaClient } from '../src/generated/prisma/index.js';
import { DEFAULT_EMAIL_TEMPLATES } from '../src/constants/emailTemplates.js';
import { PERMISSIONS } from '../src/constants/permissions.js';

const prisma = new PrismaClient();

async function syncPermissions() {
  for (const perm of PERMISSIONS) {
    await prisma.permission.upsert({
      where: { key: perm.key },
      create: perm,
      update: { label: perm.label, module: perm.module },
    });
  }

  const emailPermKeys = ['emails.view', 'emails.manage'];
  const permissionRecords = await prisma.permission.findMany({
    where: { key: { in: emailPermKeys } },
  });

  const roles = await prisma.role.findMany({
    where: { name: { in: ['Super Admin', 'Admin', 'Read Only'] } },
  });

  for (const role of roles) {
    for (const perm of permissionRecords) {
      const shouldHave =
        role.name === 'Read Only'
          ? perm.key === 'emails.view'
          : true;

      if (!shouldHave) continue;

      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: role.id,
            permissionId: perm.id,
          },
        },
        create: {
          roleId: role.id,
          permissionId: perm.id,
        },
        update: {},
      });
    }
  }

  console.log('Synced email permissions for admin roles');
}

async function syncTemplates() {
  for (const template of DEFAULT_EMAIL_TEMPLATES) {
    await prisma.emailTemplate.upsert({
      where: { key: template.key },
      create: template,
      update: {
        name: template.name,
        category: template.category,
        description: template.description,
        isSystem: template.isSystem,
      },
    });
  }
  console.log(`Synced ${DEFAULT_EMAIL_TEMPLATES.length} email templates`);
}

async function main() {
  await syncPermissions();
  await syncTemplates();
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
