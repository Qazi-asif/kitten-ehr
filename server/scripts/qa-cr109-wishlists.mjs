/**
 * CR-109 / CR-96 acceptance check. Boots the real app in-process on an
 * ephemeral port, exercises the named-wishlist CRUD surface against ORG
 * settings, and removes every row it created.
 *
 * Read-only for foster/kitten wishlists. Never touches pre-existing rows.
 */
import 'dotenv/config';
import app from '../src/app.js';
import prisma from '../src/lib/prisma.js';
import { signToken } from '../src/utils/authUtils.js';

const LIST_A = 'QA Temp List';
const LIST_A_RENAMED = 'QA Temp List Renamed';
const LIST_B = 'QA Temp List Two';
const TEST_NAMES = new Set([LIST_A, LIST_A_RENAMED, LIST_B]);

const results = [];
function check(name, pass, detail = '') {
  results.push({ name, pass, detail });
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
}

const server = app.listen(0);
await new Promise((resolve) => server.once('listening', resolve));
const base = `http://127.0.0.1:${server.address().port}`;

const user = await prisma.user.findFirst({
  where: { isActive: true, role: { isPortalRole: false } },
  include: {
    role: { include: { permissions: { include: { permission: true } } } },
  },
});
if (!user) throw new Error('No active staff user available to mint a test token.');
const role = user.role;
const permissions = role.permissions.map((rp) => rp.permission.key);
for (const needed of ['settings.manage', 'kittens.view', 'fosters.view']) {
  if (!permissions.includes(needed)) {
    throw new Error(`Selected staff role lacks ${needed}; cannot run this check.`);
  }
}
console.log(`Using staff role "${role.name}" with ${permissions.length} permissions.`);
const token = signToken({
  userId: user.id,
  email: user.email,
  roleId: role.id,
  roleName: role.name,
  permissions,
});

async function api(path, options = {}) {
  const res = await fetch(`${base}/api${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });
  const text = await res.text();
  let body = null;
  try { body = text ? JSON.parse(text) : null; } catch { body = text; }
  return { status: res.status, body };
}

const orgQuery = 'ownerType=ORG&ownerId=1';
const orgRows = () => api(`/wishlists?${orgQuery}`);

function inList(rows, groupName) {
  return rows.filter((r) => r.groupName === groupName);
}

function snapshotKey(rows) {
  return rows
    .map((r) => `${r.id}|${r.ownerType}|${r.ownerId}|${r.groupName}|${r.retailer}|${r.url}|${r.label}|${r.sortOrder}`)
    .sort()
    .join('\n');
}

let created = [];

try {
  const before = await prisma.wishlist.findMany({ orderBy: { id: 'asc' } });
  const beforeKey = snapshotKey(before);
  console.log(`\nBEFORE: ${before.length} wishlist rows total`);
  for (const r of before) {
    console.log(`  #${r.id} ${r.ownerType}/${r.ownerId} "${r.groupName}" ${r.retailer} sort=${r.sortOrder}`);
  }
  const preExistingTest = before.filter((r) => TEST_NAMES.has(r.groupName));
  if (preExistingTest.length) {
    throw new Error('Test group names already exist in the table; aborting to avoid touching real data.');
  }
  console.log('');

  // 1. Create list A with an Amazon link.
  const a1 = await api('/wishlists', {
    method: 'POST',
    body: JSON.stringify({
      ownerType: 'ORG', ownerId: 1, groupName: LIST_A, retailer: 'AMAZON', url: 'https://example.com/qa-amazon-1',
    }),
  });
  check('create named list with Amazon link', a1.status === 201, `status ${a1.status}`);
  created.push(a1.body?.id);

  // 2. Add Chewy to the SAME list; Amazon must survive untouched.
  const a2 = await api('/wishlists', {
    method: 'POST',
    body: JSON.stringify({
      ownerType: 'ORG', ownerId: 1, groupName: LIST_A, retailer: 'CHEWY', url: 'https://example.com/qa-chewy-1',
    }),
  });
  created.push(a2.body?.id);
  let rows = (await orgRows()).body;
  let listA = inList(rows, LIST_A);
  const amazonAfterChewy = listA.find((r) => r.retailer === 'AMAZON');
  check(
    'adding Chewy does not disturb Amazon in the same list',
    a2.status === 201 && listA.length === 2 && amazonAfterChewy?.url === 'https://example.com/qa-amazon-1',
    `${listA.length} links, amazon url=${amazonAfterChewy?.url}`,
  );

  // 3. Add Walmart; all three must coexist.
  const a3 = await api('/wishlists', {
    method: 'POST',
    body: JSON.stringify({
      ownerType: 'ORG', ownerId: 1, groupName: LIST_A, retailer: 'WALMART', url: 'https://example.com/qa-walmart-1',
    }),
  });
  created.push(a3.body?.id);
  rows = (await orgRows()).body;
  listA = inList(rows, LIST_A);
  check(
    'Amazon + Chewy + Walmart coexist in one named list',
    a3.status === 201 && new Set(listA.map((r) => r.retailer)).size === 3,
    listA.map((r) => `${r.retailer}=${r.url}`).join(', '),
  );

  // 4. Rename the list; all three links must move with correct URLs.
  const ren = await api('/wishlists/groups/rename', {
    method: 'PATCH',
    body: JSON.stringify({ ownerType: 'ORG', ownerId: 1, from: LIST_A, to: LIST_A_RENAMED }),
  });
  rows = (await orgRows()).body;
  let renamed = inList(rows, LIST_A_RENAMED);
  const urlsOk = renamed.every((r) => r.url === `https://example.com/qa-${r.retailer.toLowerCase()}-1`);
  check(
    'rename list keeps all three links with correct URLs',
    ren.status === 200 && renamed.length === 3 && urlsOk && inList(rows, LIST_A).length === 0,
    `renamed ${ren.body?.renamed} rows`,
  );

  // 5. Edit one link's URL; the other two must be unchanged.
  const target = renamed.find((r) => r.retailer === 'CHEWY');
  const patched = await api(`/wishlists/${target.id}`, {
    method: 'PATCH',
    body: JSON.stringify({ url: 'https://example.com/qa-chewy-EDITED', label: 'QA Chewy Edited' }),
  });
  rows = (await orgRows()).body;
  renamed = inList(rows, LIST_A_RENAMED);
  const chewy = renamed.find((r) => r.retailer === 'CHEWY');
  const others = renamed.filter((r) => r.retailer !== 'CHEWY');
  check(
    'editing one link URL leaves the other two untouched',
    patched.status === 200
      && chewy.url === 'https://example.com/qa-chewy-EDITED'
      && chewy.label === 'QA Chewy Edited'
      && others.every((r) => r.url === `https://example.com/qa-${r.retailer.toLowerCase()}-1`),
    `patch status ${patched.status}; others=${others.map((r) => r.url).join(', ')}`,
  );

  // 6. CR-96 collision scenario: a second list with its own Amazon link.
  const b1 = await api('/wishlists', {
    method: 'POST',
    body: JSON.stringify({
      ownerType: 'ORG', ownerId: 1, groupName: LIST_B, retailer: 'AMAZON', url: 'https://example.com/qa-amazon-2',
    }),
  });
  created.push(b1.body?.id);
  rows = (await orgRows()).body;
  const listAAmazon = inList(rows, LIST_A_RENAMED).find((r) => r.retailer === 'AMAZON');
  const listBAmazon = inList(rows, LIST_B).find((r) => r.retailer === 'AMAZON');
  check(
    'second list\'s Amazon link does not overwrite the first list\'s',
    b1.status === 201
      && listAAmazon?.url === 'https://example.com/qa-amazon-1'
      && listBAmazon?.url === 'https://example.com/qa-amazon-2'
      && listAAmazon.id !== listBAmazon.id,
    `list A amazon=${listAAmazon?.url}, list B amazon=${listBAmazon?.url}`,
  );

  // 7. Public endpoint grouping.
  const pub = await fetch(`${base}/api/public/wishlists?${orgQuery}`);
  const pubRows = await pub.json();
  const pubA = pubRows.filter((r) => r.groupName === LIST_A_RENAMED);
  const pubB = pubRows.filter((r) => r.groupName === LIST_B);
  const sortedOk = pubRows.every((r, i) => i === 0 || pubRows[i - 1].sortOrder <= r.sortOrder);
  check(
    'public endpoint returns both lists grouped and ordered',
    pub.status === 200 && pubA.length === 3 && pubB.length === 1 && sortedOk,
    `${pubRows.length} public rows; groups=${[...new Set(pubRows.map((r) => r.groupName))].join(' | ')}`,
  );
  check(
    'public payload exposes no internal fields',
    pubRows.every((r) => !('ownerId' in r) && !('ownerType' in r)),
  );

  // 8. Read-only foster / kitten checks.
  const foster = await prisma.foster.findFirst({ select: { id: true } });
  if (foster) {
    const fw = await api(`/fosters/${foster.id}/wishlists`);
    check('foster wishlist endpoint returns 200', fw.status === 200, `${(fw.body || []).length} rows`);
  }
  const kitten = await prisma.kitten.findFirst({ select: { id: true } });
  if (kitten) {
    const kw = await api(`/kittens/${kitten.id}/wishlists`);
    check('kitten wishlist endpoint returns 200', kw.status === 200, `${(kw.body || []).length} rows`);
    const pk = await fetch(`${base}/api/public/kittens/${kitten.id}/wishlists`);
    check('public kitten wishlist endpoint returns 200', pk.status === 200);
  }

  // 9. Delete a single link inside a list, then the whole lists.
  const walmart = inList(rows, LIST_A_RENAMED).find((r) => r.retailer === 'WALMART');
  const delOne = await api(`/wishlists/${walmart.id}`, { method: 'DELETE' });
  rows = (await orgRows()).body;
  check(
    'delete a single link leaves the rest of the list intact',
    delOne.status === 204 && inList(rows, LIST_A_RENAMED).length === 2,
    `${inList(rows, LIST_A_RENAMED).length} links remain`,
  );

  for (const name of [LIST_A_RENAMED, LIST_B]) {
    const params = new URLSearchParams({ ownerType: 'ORG', ownerId: '1', groupName: name });
    const del = await api(`/wishlists/groups?${params}`, { method: 'DELETE' });
    check(`delete whole named list "${name}"`, del.status === 200, `deleted ${del.body?.deleted}`);
  }

  // 10. Prove no residue.
  const after = await prisma.wishlist.findMany({ orderBy: { id: 'asc' } });
  console.log(`\nAFTER: ${after.length} wishlist rows total`);
  for (const r of after) {
    console.log(`  #${r.id} ${r.ownerType}/${r.ownerId} "${r.groupName}" ${r.retailer} sort=${r.sortOrder}`);
  }
  check(
    'table restored to exact pre-test contents',
    snapshotKey(after) === beforeKey,
    `${before.length} rows before, ${after.length} after`,
  );
} finally {
  // Belt and braces: remove anything our test names left behind.
  const leftover = await prisma.wishlist.deleteMany({
    where: { ownerType: 'ORG', ownerId: 1, groupName: { in: [...TEST_NAMES] } },
  });
  if (leftover.count) console.log(`\nCleanup removed ${leftover.count} leftover test row(s).`);

  server.close();
  await prisma.$disconnect();

  const failed = results.filter((r) => !r.pass);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed.`);
  process.exit(failed.length ? 1 : 0);
}
