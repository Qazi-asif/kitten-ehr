import '../src/loadEnv.js';
import prisma from '../src/lib/prisma.js';
import { normalizeKittenPhotoUrl } from '../src/utils/resolveKittenPhotoUrl.js';

function parseDataUrl(dataUrl) {
  const match = /^data:([^;,]+);base64,(.+)$/s.exec(dataUrl);
  if (!match) return null;
  return { mime: match[1], buffer: Buffer.from(match[2], 'base64') };
}

const kitten = await prisma.kitten.findUnique({
  where: { id: 25 },
  select: { id: true, name: true, primaryPhotoUrl: true },
});

const resolved = normalizeKittenPhotoUrl(kitten.primaryPhotoUrl, kitten.name);
console.log('resolved prefix:', resolved?.slice(0, 80));
console.log('is data url:', resolved?.startsWith('data:image/'));

const start = Date.now();
const parsed = parseDataUrl(resolved);
console.log('parse ms:', Date.now() - start);
console.log('parsed:', parsed ? { mime: parsed.mime, bytes: parsed.buffer.length } : null);

await prisma.$disconnect();
