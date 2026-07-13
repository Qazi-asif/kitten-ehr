import '../src/loadEnv.js';
import prisma from '../src/lib/prisma.js';

const existing = await prisma.placement.findMany({
  where: { kittenId: { in: [25, 27] } },
  orderBy: { id: 'asc' },
});

console.log(JSON.stringify(existing, null, 2));
await prisma.$disconnect();
