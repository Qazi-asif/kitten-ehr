/**
 * QA smoke + regression tests for Kitten-EHR API.
 * Run: node scripts/qa-test.js [baseUrl]
 */
import prisma from '../src/lib/prisma.js';

const BASE = process.argv[2] || 'http://localhost:5000';
const ADMIN = { email: 'admin@pawsitivetransformations.org', password: 'Admin123!' };

const results = [];
let token = '';
let createdTxId = null;

function pass(name) {
  results.push({ name, ok: true });
  console.log(`  PASS  ${name}`);
}

function fail(name, detail) {
  results.push({ name, ok: false, detail });
  console.log(`  FAIL  ${name}: ${detail}`);
}

async function api(path, { method = 'GET', body, auth = true, expectStatus } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth && token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (expectStatus !== undefined && response.status !== expectStatus) {
    throw new Error(`${method} ${path} expected ${expectStatus}, got ${response.status}: ${text.slice(0, 200)}`);
  }

  return { response, data };
}

async function run() {
  console.log(`\nKitten-EHR QA — ${BASE}\n`);

  // Health
  try {
    const { data } = await api('/api/health', { auth: false });
    if (data?.status === 'ok') pass('GET /api/health');
    else fail('GET /api/health', JSON.stringify(data));
  } catch (e) {
    fail('GET /api/health', e.message);
  }

  // Auth
  try {
    const { response } = await api('/api/auth/login', {
      auth: false,
      method: 'POST',
      body: { email: 'bad@example.com', password: 'wrong' },
      expectStatus: 401,
    });
    if (response.status === 401) pass('POST /api/auth/login rejects bad credentials');
  } catch (e) {
    fail('POST /api/auth/login rejects bad credentials', e.message);
  }

  try {
    const { data } = await api('/api/auth/login', {
      auth: false,
      method: 'POST',
      body: ADMIN,
    });
    token = data.token;
    if (token && data.user?.email === ADMIN.email) pass('POST /api/auth/login admin');
    else fail('POST /api/auth/login admin', 'missing token');
  } catch (e) {
    fail('POST /api/auth/login admin', e.message);
    printSummary();
    process.exit(1);
  }

  try {
    const { data } = await api('/api/auth/me');
    if (data?.email === ADMIN.email) pass('GET /api/auth/me');
    else fail('GET /api/auth/me', JSON.stringify(data));
  } catch (e) {
    fail('GET /api/auth/me', e.message);
  }

  // Public
  for (const path of [
    '/api/public/kittens',
    '/api/public/stats',
    '/api/public/settings',
    '/api/public/content',
    '/api/public/events',
  ]) {
    try {
      await api(path, { auth: false, expectStatus: 200 });
      pass(`GET ${path}`);
    } catch (e) {
      fail(`GET ${path}`, e.message);
    }
  }

  // Settings
  try {
    const { data } = await api('/api/settings');
    if (data?.orgName) pass('GET /api/settings');
    else fail('GET /api/settings', 'missing orgName');
  } catch (e) {
    fail('GET /api/settings', e.message);
  }

  try {
    await api('/api/settings', { method: 'PATCH', body: { orgName: '' }, expectStatus: 400 });
    pass('PATCH /api/settings rejects empty orgName');
  } catch (e) {
    fail('PATCH /api/settings rejects empty orgName', e.message);
  }

  // Kittens dashboard
  try {
    const { data } = await api('/api/kittens/dashboard/stats');
    if (typeof data.activeKittens === 'number') pass('GET /api/kittens/dashboard/stats');
    else fail('GET /api/kittens/dashboard/stats', JSON.stringify(data));
  } catch (e) {
    fail('GET /api/kittens/dashboard/stats', e.message);
  }

  try {
    const { data } = await api('/api/kittens');
    if (Array.isArray(data)) pass(`GET /api/kittens (${data.length} records)`);
    else fail('GET /api/kittens', 'not array');
  } catch (e) {
    fail('GET /api/kittens', e.message);
  }

  // Finance stats
  try {
    const { data } = await api('/api/transactions/stats');
    const ok =
      typeof data.income?.month === 'number' &&
      typeof data.expenses?.month === 'number' &&
      typeof data.netProfitMonth === 'number' &&
      typeof data.donations?.month === 'number';
    if (ok) pass(`GET /api/transactions/stats (income=$${data.income.month}, net=$${data.netProfitMonth})`);
    else fail('GET /api/transactions/stats', JSON.stringify(data));
  } catch (e) {
    fail('GET /api/transactions/stats', e.message);
  }

  // Finance list + filters
  try {
    const { data } = await api('/api/transactions');
    if (Array.isArray(data)) pass(`GET /api/transactions (${data.length} records)`);
    else fail('GET /api/transactions', 'not array');
  } catch (e) {
    fail('GET /api/transactions', e.message);
  }

  try {
    await api('/api/transactions?type=INVALID', { expectStatus: 400 });
    pass('GET /api/transactions rejects invalid type');
  } catch (e) {
    fail('GET /api/transactions rejects invalid type', e.message);
  }

  try {
    await api('/api/transactions?startDate=not-a-date', { expectStatus: 400 });
    pass('GET /api/transactions rejects invalid startDate');
  } catch (e) {
    fail('GET /api/transactions rejects invalid startDate', e.message);
  }

  // Finance create validation
  try {
    await api('/api/transactions', {
      method: 'POST',
      body: { type: 'INCOME', category: 'Donation', amount: -5, date: '2026-06-01' },
      expectStatus: 400,
    });
    pass('POST /api/transactions rejects negative amount');
  } catch (e) {
    fail('POST /api/transactions rejects negative amount', e.message);
  }

  try {
    await api('/api/transactions', {
      method: 'POST',
      body: { type: 'BOGUS', category: 'Donation', amount: 10, date: '2026-06-01' },
      expectStatus: 400,
    });
    pass('POST /api/transactions rejects invalid type');
  } catch (e) {
    fail('POST /api/transactions rejects invalid type', e.message);
  }

  // Finance CRUD round-trip
  try {
    const { data, response } = await api('/api/transactions', {
      method: 'POST',
      body: {
        type: 'INCOME',
        category: 'Donation',
        amount: 99.99,
        date: '2026-06-30',
        description: 'QA test transaction',
      },
    });
    if (response.status === 201 && data.id) {
      createdTxId = data.id;
      pass(`POST /api/transactions created id=${createdTxId}`);
    } else fail('POST /api/transactions create', JSON.stringify(data));
  } catch (e) {
    fail('POST /api/transactions create', e.message);
  }

  if (createdTxId) {
    try {
      await api(`/api/transactions/${createdTxId}`, { method: 'DELETE', expectStatus: 204 });
      pass(`DELETE /api/transactions/${createdTxId}`);
    } catch (e) {
      fail('DELETE /api/transactions', e.message);
    }
  }

  try {
    await api('/api/transactions/999999', { method: 'DELETE', expectStatus: 404 });
    pass('DELETE /api/transactions returns 404 for missing id');
  } catch (e) {
    fail('DELETE /api/transactions 404', e.message);
  }

  // Public application
  try {
    await api('/api/public/applications', {
      auth: false,
      method: 'POST',
      body: { type: 'Adoption', formData: { name: 'QA Tester', email: 'qa@test.com' } },
      expectStatus: 201,
    });
    pass('POST /api/public/applications');
  } catch (e) {
    fail('POST /api/public/applications', e.message);
  }

  // Roles
  try {
    const { data } = await api('/api/roles');
    if (Array.isArray(data) && data.length > 0) pass(`GET /api/roles (${data.length} roles)`);
    else fail('GET /api/roles', JSON.stringify(data));
  } catch (e) {
    fail('GET /api/roles', e.message);
  }

  await prisma.$disconnect();
  printSummary();
  process.exit(results.some((r) => !r.ok) ? 1 : 0);
}

function printSummary() {
  const passed = results.filter((r) => r.ok).length;
  const failed = results.filter((r) => !r.ok);
  console.log(`\n${'='.repeat(50)}`);
  console.log(`QA Summary: ${passed}/${results.length} passed`);
  if (failed.length) {
    console.log('\nFailures:');
    failed.forEach((f) => console.log(`  - ${f.name}: ${f.detail}`));
  }
  console.log('');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
