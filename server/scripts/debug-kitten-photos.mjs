import '../src/loadEnv.js';
import prisma from '../src/lib/prisma.js';

const kittens = await prisma.kitten.findMany({
  where: { status: 'Available for Adoption' },
  select: { id: true, name: true, primaryPhotoUrl: true, publishTargets: true },
  orderBy: { id: 'asc' },
});

function preview(url) {
  if (!url) return null;
  if (url.startsWith('data:')) return `data:image/...(${url.length} chars)`;
  return url.length > 120 ? `${url.slice(0, 120)}...` : url;
}

console.log('=== Available kittens ===');
for (const k of kittens) {
  console.log({
    id: k.id,
    name: k.name,
    primaryPhotoUrl: preview(k.primaryPhotoUrl),
    publishTargets: k.publishTargets,
  });
}

const docs = await prisma.document.findMany({
  where: { kittenId: { in: kittens.map((k) => k.id) } },
  select: { kittenId: true, docType: true, isPrimaryPhoto: true, fileUrl: true },
  orderBy: [{ isPrimaryPhoto: 'desc' }, { uploadedAt: 'desc' }],
});

console.log('\n=== Photo documents ===');
for (const d of docs) {
  console.log({
    kittenId: d.kittenId,
    docType: d.docType,
    isPrimaryPhoto: d.isPrimaryPhoto,
    fileUrl: preview(d.fileUrl),
  });
}

await prisma.$disconnect();
