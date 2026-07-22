import '../src/loadEnv.js';
import { syncPermissionsFromDefaults } from '../src/utils/syncPermissions.js';
import prisma from '../src/lib/prisma.js';

async function main() {
  const result = await syncPermissionsFromDefaults();
  console.log(
    `Synced ${result.permissionCount} permissions across ${result.roleCount} default roles (additive).`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
