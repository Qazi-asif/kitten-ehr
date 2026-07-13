import '../src/loadEnv.js';
import prisma from '../src/lib/prisma.js';

const rows = await prisma.contract.findMany({
  where: {
    signedPdfUrl: { startsWith: 'data:image/' },
    signatureImageUrl: null,
    frozenAgreementText: null,
    pdfUrl: null,
  },
  orderBy: { id: 'asc' },
  select: {
    id: true,
    signerName: true,
    signerEmail: true,
    kittenId: true,
    fosterId: true,
    applicationId: true,
  },
});

console.log(`Found ${rows.length} matching contract(s)\n`);
console.log(JSON.stringify(rows, null, 2));

await prisma.$disconnect();
