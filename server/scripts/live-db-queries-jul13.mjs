import '../src/loadEnv.js';
import prisma from '../src/lib/prisma.js';

console.log('=== QUERY 1: Foster currentKittens _count vs open Placement count ===\n');

const fosters = await prisma.foster.findMany({
  orderBy: { id: 'asc' },
  select: {
    id: true,
    name: true,
    maxKittens: true,
    _count: { select: { currentKittens: true } },
    currentKittens: {
      select: { id: true, name: true, status: true, currentFosterId: true },
      orderBy: { id: 'asc' },
    },
  },
});

const openPlacementsByFoster = await prisma.placement.groupBy({
  by: ['fosterId'],
  where: { dischargeDate: null },
  _count: { _all: true },
});

const openPlacementMap = new Map(
  openPlacementsByFoster.map((row) => [row.fosterId, row._count._all]),
);

for (const foster of fosters) {
  const openPlacementCount = openPlacementMap.get(foster.id) ?? 0;
  const currentKittenCount = foster._count.currentKittens;
  const openPlacements = await prisma.placement.findMany({
    where: { fosterId: foster.id, dischargeDate: null },
    select: {
      id: true,
      kittenId: true,
      intakeDate: true,
      kitten: { select: { id: true, name: true, status: true, currentFosterId: true } },
    },
    orderBy: { id: 'asc' },
  });

  console.log(JSON.stringify({
    fosterId: foster.id,
    name: foster.name,
    maxKittens: foster.maxKittens,
    listPageCapacity: `${currentKittenCount}/${foster.maxKittens}`,
    detailPageCapacity: `${openPlacementCount}/${foster.maxKittens}`,
    _count_currentKittens: currentKittenCount,
    openPlacementCount,
    mismatch: currentKittenCount !== openPlacementCount,
    currentKittens_via_relation: foster.currentKittens,
    openPlacements,
  }, null, 2));
  console.log('');
}

console.log('=== QUERY 2: Settings.orgSignatureUrl (id=1) ===\n');

const settings = await prisma.settings.findUnique({
  where: { id: 1 },
  select: { id: true, orgSignatureUrl: true },
});

if (!settings) {
  console.log('RAW: Settings row id=1 NOT FOUND');
} else {
  const val = settings.orgSignatureUrl;
  const trimmed = typeof val === 'string' ? val.trim() : val;
  console.log('RAW orgSignatureUrl value:', JSON.stringify(val));
  console.log('Assessment:', !trimmed ? 'NULL/EMPTY' : `HAS VALUE (${trimmed.length} chars)`);
  if (trimmed) {
    console.log('Preview:', trimmed.length > 120 ? `${trimmed.slice(0, 120)}...` : trimmed);
  }
}

console.log('\n=== QUERY 3: Contracts 28, 30, 32, 34 + pattern scan ===\n');

const IDS = [28, 30, 32, 34];

function summarizeField(name, value) {
  if (value === null || value === undefined) return { value: null, note: 'null' };
  if (typeof value !== 'string') return { value, note: typeof value };
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

console.log(`Requested IDs: ${IDS.join(', ')}`);
console.log(`Found ${rows.length} rows\n`);

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
    kittenId: true,
    fosterId: true,
    signerName: true,
    signerEmail: true,
    kittenName: true,
    signedAt: true,
    createdAt: true,
    signedPdfUrl: true,
    signatureImageUrl: true,
    frozenAgreementText: true,
  },
});

console.log('=== Pattern scan: legacy data-URL signedPdfUrl, new e-sign fields null ===');
console.log(`Total matching contracts: ${legacyPattern.length}`);
console.log('IDs:', legacyPattern.map((c) => c.id).join(', '));

const unexpected = legacyPattern.filter((c) => !IDS.includes(c.id));
if (unexpected.length === 0) {
  console.log('No additional production contracts match this legacy QA pattern beyond 28/30/32/34.');
} else {
  console.log('ADDITIONAL matches beyond requested four:');
  for (const c of unexpected) {
    console.log(JSON.stringify({
      id: c.id,
      type: c.type,
      status: c.status,
      kittenId: c.kittenId,
      fosterId: c.fosterId,
      adopterName: c.adopterName,
      signedAt: c.signedAt?.toISOString() ?? null,
      createdAt: c.createdAt?.toISOString() ?? null,
      signedPdfUrl: summarizeField('signedPdfUrl', c.signedPdfUrl),
      signatureImageUrl: c.signatureImageUrl,
      frozenAgreementText: c.frozenAgreementText,
    }, null, 2));
  }
}

await prisma.$disconnect();
