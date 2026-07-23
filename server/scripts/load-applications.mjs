/**
 * Pressure / load test for public Adoption + Foster application POSTs.
 *
 * Safe defaults:
 * - Refuses production Hostinger URLs unless ALLOW_PROD_LOAD=1
 * - Uses @loadtest.kitten-ehr.invalid emails and cleans them up afterward
 * - Expects SKIP_APPLICATION_EMAILS=1 on the target server (no SMTP blast)
 *
 * Usage:
 *   node scripts/load-applications.mjs [baseUrl]
 *
 * Env:
 *   TOTAL=200           total submissions (default 200)
 *   CONCURRENCY=25      in-flight requests (default 25)
 *   ADOPTION_RATIO=0.5  fraction that are Adoption (rest Foster)
 *   CLEANUP=1           delete load-test rows after (default 1)
 *   ALLOW_PROD_LOAD=1   required to hit a non-local host
 *   UNIQUE_IPS=1        send distinct X-Forwarded-For (default 1)
 */
import '../src/loadEnv.js';
import prisma from '../src/lib/prisma.js';

const BASE = (process.argv[2] || process.env.LOAD_BASE_URL || 'http://127.0.0.1:5000').replace(/\/$/, '');
const TOTAL = Math.max(1, Number.parseInt(process.env.TOTAL || '200', 10) || 200);
const CONCURRENCY = Math.max(1, Number.parseInt(process.env.CONCURRENCY || '25', 10) || 25);
const ADOPTION_RATIO = Math.min(1, Math.max(0, Number.parseFloat(process.env.ADOPTION_RATIO || '0.5')));
const CLEANUP = process.env.CLEANUP !== '0';
const UNIQUE_IPS = process.env.UNIQUE_IPS !== '0';
const MARKER = 'loadtest.kitten-ehr.invalid';
const RUN_ID = `lt-${Date.now()}`;

function isLocalBase(url) {
  try {
    const host = new URL(url).hostname;
    return host === '127.0.0.1' || host === 'localhost' || host === '::1';
  } catch {
    return false;
  }
}

function percentile(sorted, p) {
  if (sorted.length === 0) return 0;
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return sorted[idx];
}

function adoptionPayload(i) {
  return {
    fullName: `Load Test Adopter ${i}`,
    email: `adopter.${RUN_ID}.${i}@${MARKER}`,
    phone: `+1 555-010-${String(i).padStart(4, '0').slice(-4)}`,
    address: `${100 + i} Load Test Ave, Test City, ST 00000`,
    kittenOfInterest: i % 3 === 0 ? 'Load Test Kitten' : '',
    ownOrRent: i % 2 === 0 ? 'Own' : 'Rent',
    currentPets: i % 4 === 0
      ? [{ name: 'Buddy', species: 'Dog', age: '3 years', fixed: 'Yes', goodWithOtherAnimals: 'Yes' }]
      : [],
    experience: 'Some, I\'ve had cats of my own before',
    message: `Load test adoption ${RUN_ID} #${i}`,
  };
}

function fosterPayload(i) {
  return {
    fullName: `Load Test Foster ${i}`,
    email: `foster.${RUN_ID}.${i}@${MARKER}`,
    phone: `+1 555-020-${String(i).padStart(4, '0').slice(-4)}`,
    address: `${200 + i} Foster Load St, Test City, ST 00000`,
    kittenOfInterest: '',
    ownOrRent: 'Rent',
    currentPets: [],
    experienceLevel: 'None (first-time foster)',
    homeType: 'Apartment',
    availability: 'Work from home / home most of the day',
    capacity: ['Kittens (weaned)', '1 adult cat'],
    maxKittens: 2,
    isolationRoom: 'Yes',
    vehicleAccess: 'Yes',
    unexpectedStopPlan: 'Contact the rescue immediately and arrange return transport.',
    message: `Load test foster ${RUN_ID} #${i}`,
  };
}

async function postApplication(i) {
  const isAdoption = i / TOTAL < ADOPTION_RATIO;
  const type = isAdoption ? 'Adoption' : 'Foster';
  const formData = isAdoption ? adoptionPayload(i) : fosterPayload(i);
  const headers = { 'Content-Type': 'application/json' };
  if (UNIQUE_IPS) {
    const a = 10 + Math.floor(i / 65025);
    const b = Math.floor(i / 255) % 255;
    const c = i % 255;
    headers['X-Forwarded-For'] = `${a}.${b}.${c}.1`;
  }

  const started = performance.now();
  let status = 0;
  let error = '';
  let id = null;
  try {
    const res = await fetch(`${BASE}/api/public/applications`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        type,
        formData: JSON.stringify(formData),
        kittenOfInterest: formData.kittenOfInterest || undefined,
      }),
    });
    status = res.status;
    const payload = await res.json().catch(() => ({}));
    if (!res.ok) {
      error = payload.error || `HTTP ${res.status}`;
    } else {
      id = payload.id ?? null;
    }
  } catch (err) {
    error = err.message || String(err);
  }
  return {
    i,
    type,
    status,
    error,
    id,
    ms: Math.round(performance.now() - started),
  };
}

async function runPool(total, concurrency, worker) {
  const results = new Array(total);
  let next = 0;
  async function run() {
    while (true) {
      const idx = next;
      next += 1;
      if (idx >= total) return;
      results[idx] = await worker(idx);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, total) }, () => run()));
  return results;
}

async function cleanupLoadTestRows() {
  const apps = await prisma.application.findMany({
    where: { formData: { contains: MARKER } },
    select: { id: true },
  });
  if (apps.length === 0) return 0;
  const ids = apps.map((a) => a.id);
  await prisma.applicationUpload.deleteMany({ where: { applicationId: { in: ids } } });
  await prisma.emailLog.deleteMany({
    where: { relatedType: 'Application', relatedId: { in: ids } },
  }).catch(() => {});
  await prisma.application.deleteMany({ where: { id: { in: ids } } });
  return ids.length;
}

async function smokeCheck() {
  const checks = [];

  async function one(name, type, formData) {
    const res = await fetch(`${BASE}/api/public/applications`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Forwarded-For': '203.0.113.50',
      },
      body: JSON.stringify({ type, formData: JSON.stringify(formData) }),
    });
    const payload = await res.json().catch(() => ({}));
    const ok = res.status === 201 && payload.id;
    checks.push({ name, ok, status: res.status, error: payload.error || '' });
    console.log(`${ok ? 'PASS' : 'FAIL'}  smoke ${name} — HTTP ${res.status}${payload.error ? ` (${payload.error})` : ''}`);
  }

  await one('Adoption', 'Adoption', adoptionPayload(900001));
  await one('Foster', 'Foster', fosterPayload(900002));
  return checks;
}

async function main() {
  if (!isLocalBase(BASE) && process.env.ALLOW_PROD_LOAD !== '1') {
    console.error(`Refusing to load-test non-local URL ${BASE}. Set ALLOW_PROD_LOAD=1 to override.`);
    process.exit(2);
  }

  console.log(`Target: ${BASE}`);
  console.log(`Plan: ${TOTAL} posts, concurrency=${CONCURRENCY}, adoptionRatio=${ADOPTION_RATIO}, uniqueIps=${UNIQUE_IPS}`);
  console.log(`Run id: ${RUN_ID}`);
  console.log('');

  const health = await fetch(`${BASE}/api/health`).catch((err) => ({ ok: false, status: 0, error: err.message }));
  if (health.ok === false && health.status === 0) {
    console.error(`Server not reachable: ${health.error || 'unknown'}`);
    process.exit(1);
  }
  if (typeof health.status === 'number' && health.status >= 500) {
    console.error(`Health check failed: HTTP ${health.status}`);
    process.exit(1);
  }
  console.log(`Health: HTTP ${health.status || 200}`);

  console.log('\n--- Smoke (Adoption + Foster) ---');
  const smoke = await smokeCheck();
  if (smoke.some((c) => !c.ok)) {
    console.error('Smoke failed — aborting load run.');
    if (CLEANUP) {
      const n = await cleanupLoadTestRows();
      console.log(`Cleanup removed ${n} smoke rows.`);
    }
    await prisma.$disconnect();
    process.exit(1);
  }

  console.log('\n--- Load ---');
  const started = performance.now();
  const results = await runPool(TOTAL, CONCURRENCY, postApplication);
  const elapsedMs = Math.round(performance.now() - started);

  const ok = results.filter((r) => r.status === 201);
  const rateLimited = results.filter((r) => r.status === 429);
  const failed = results.filter((r) => r.status !== 201);
  const latencies = results.map((r) => r.ms).sort((a, b) => a - b);
  const byType = {
    Adoption: results.filter((r) => r.type === 'Adoption'),
    Foster: results.filter((r) => r.type === 'Foster'),
  };

  console.log('');
  console.log('=== Results ===');
  console.log(`Total:          ${results.length}`);
  console.log(`Success (201):  ${ok.length}`);
  console.log(`Rate limited:   ${rateLimited.length}`);
  console.log(`Failed:         ${failed.length}`);
  console.log(`Wall time:      ${elapsedMs} ms (${(results.length / (elapsedMs / 1000)).toFixed(1)} req/s)`);
  console.log(`Latency p50:    ${percentile(latencies, 50)} ms`);
  console.log(`Latency p95:    ${percentile(latencies, 95)} ms`);
  console.log(`Latency p99:    ${percentile(latencies, 99)} ms`);
  console.log(`Latency max:    ${latencies[latencies.length - 1] || 0} ms`);
  console.log(`Adoption ok:    ${byType.Adoption.filter((r) => r.status === 201).length}/${byType.Adoption.length}`);
  console.log(`Foster ok:      ${byType.Foster.filter((r) => r.status === 201).length}/${byType.Foster.length}`);

  if (failed.length) {
    const sample = failed.slice(0, 8).map((r) => `#${r.i} ${r.type} HTTP ${r.status} ${r.error}`).join('\n  ');
    console.log(`\nFailure sample:\n  ${sample}`);
  }

  if (CLEANUP) {
    console.log('\n--- Cleanup ---');
    const removed = await cleanupLoadTestRows();
    console.log(`Deleted ${removed} load-test applications (and uploads).`);
  }

  await prisma.$disconnect();

  const successRate = ok.length / results.length;
  if (successRate < 0.98 || rateLimited.length > 0) {
    console.error('\nLOAD TEST FAILED: success rate below 98% or rate limits hit.');
    process.exit(1);
  }
  console.log('\nLOAD TEST PASSED');
}

main().catch(async (err) => {
  console.error(err);
  try { await prisma.$disconnect(); } catch { /* ignore */ }
  process.exit(1);
});
