import '../src/loadEnv.js';
import prisma from '../src/lib/prisma.js';

const legacyPattern = await prisma.contract.findMany({
  where: {
    signedPdfUrl: { startsWith: 'data:image/' },
    signatureImageUrl: null,
    frozenAgreementText: null,
  },
  orderBy: { id: 'asc' },
  select: {
    id: true,
    type: true,
    status: true,
    signerName: true,
    signerEmail: true,
    kittenId: true,
    fosterId: true,
    kittenName: true,
    signedAt: true,
    createdAt: true,
  },
});

console.log(JSON.stringify(legacyPattern, null, 2));

const placements2527 = await prisma.placement.findMany({
  where: { kittenId: { in: [25, 27] } },
  orderBy: { id: 'asc' },
  select: {
    id: true,
    kittenId: true,
    fosterId: true,
    intakeDate: true,
    dischargeDate: true,
    dischargeType: true,
  },
});

console.log('\n--- placements for kittens 25, 27 ---\n');
console.log(JSON.stringify(placements2527, null, 2));

await prisma.$disconnect();
