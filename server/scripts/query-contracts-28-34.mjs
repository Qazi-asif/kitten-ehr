import { PrismaClient } from '../src/generated/prisma/index.js';

const prisma = new PrismaClient();
const IDS = [28, 30, 32, 34];

function summarizeField(name, value) {
  if (value === null || value === undefined) return { value: null, note: 'null' };
  if (typeof value !== 'string') {
    return { value, note: typeof value };
  }
  const trimmed = value.trim();
  if (trimmed === '') return { value: '', note: 'empty string' };
  if (trimmed.startsWith('data:image/')) {
    const comma = trimmed.indexOf(',');
    const header = comma > 0 ? trimmed.slice(0, comma) : trimmed.slice(0, 80);
    const payloadLen = comma > 0 ? trimmed.length - comma - 1 : 0;
    return {
      value: `${header},…[${payloadLen} base64 chars]`,
      note: 'data-URL signature image (legacy signedPdfUrl)',
      fullLength: trimmed.length,
      isLegacySignatureImage: true,
    };
  }
  if (trimmed.length > 200) {
    return {
      value: `${trimmed.slice(0, 120)}…[truncated, total ${trimmed.length} chars]`,
      note: 'long string truncated for display',
      fullLength: trimmed.length,
    };
  }
  return { value: trimmed, note: 'plain string', fullLength: trimmed.length };
}

const rows = await prisma.contract.findMany({
  where: { id: { in: IDS } },
  orderBy: { id: 'asc' },
});

console.log(`Found ${rows.length} contracts (requested: ${IDS.join(', ')})\n`);

for (const row of rows) {
  const out = {};
  for (const [key, val] of Object.entries(row)) {
    if (key === 'signedAt' || key === 'createdAt') {
      out[key] = val ? val.toISOString() : null;
    } else if (['signedPdfUrl', 'signatureImageUrl', 'frozenAgreementText', 'pdfUrl', 'signatureAudit'].includes(key)) {
      out[key] = summarizeField(key, val);
    } else {
      out[key] = val;
    }
  }
  console.log('--- Contract', row.id, '---');
  console.log(JSON.stringify(out, null, 2));
  console.log('');
}

await prisma.$disconnect();
