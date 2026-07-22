/**
 * Phase 2.1 RBAC smoke matrix — local only.
 *
 * Usage:  node scripts/smoke-rbac-matrix.mjs [baseUrl]
 * Default baseUrl: http://127.0.0.1:5000
 *
 * - Uses DATABASE_URL + JWT_SECRET from server/.env
 * - Mints JWTs for real (or auto-provisioned smoke) users per role
 * - Safe: write checks expect 403, or 400 after permission (no intentional mutations)
 * - Refuses non-local base URLs
 */
import '../src/loadEnv.js';
import fs from 'fs/promises';
import path from 'path';
import prisma from '../src/lib/prisma.js';
import { hashPassword, signToken } from '../src/utils/authUtils.js';
import { syncPermissionsFromDefaults } from '../src/utils/syncPermissions.js';
import { getUploadRoot } from '../src/utils/fileStorage.js';

const BASE = (process.argv[2] || 'http://127.0.0.1:5000').replace(/\/$/, '');
const SMOKE_PASSWORD = 'SmokeTest1!Aa';

const LOCAL_HOSTS = new Set(['127.0.0.1', 'localhost']);

function assertLocalBase() {
  let url;
  try {
    url = new URL(BASE);
  } catch {
    throw new Error(`Invalid base URL: ${BASE}`);
  }
  if (!LOCAL_HOSTS.has(url.hostname)) {
    throw new Error(
      `Refusing to run against non-local host "${url.hostname}". `
      + 'This smoke matrix is local-only (not Hostinger / production).',
    );
  }
}

const results = [];

function record(role, name, ok, detail = '') {
  results.push({ role, name, ok, detail });
  const mark = ok ? 'PASS' : 'FAIL';
  const suffix = detail ? ` — ${detail}` : '';
  console.log(`  ${mark}  [${role}] ${name}${suffix}`);
}

async function api(path, { method = 'GET', token = null, body = undefined } = {}) {
  const headers = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  return { status: response.status, data, text };
}

function expectStatus(role, name, status, allowed) {
  const ok = allowed.includes(status);
  record(
    role,
    name,
    ok,
    ok ? `status ${status}` : `expected ${allowed.join('|')}, got ${status}`,
  );
  return ok;
}

async function ensureRoleUser(roleName, { portal = false } = {}) {
  const role = await prisma.role.findUnique({
    where: { name: roleName },
    include: {
      permissions: { include: { permission: true } },
    },
  });
  if (!role) {
    throw new Error(`Role not found in DB: ${roleName}. Run permission sync / seed first.`);
  }

  const email = `smoke.${roleName.toLowerCase().replace(/\s+/g, '.')}@rbac-smoke.local`;

  let fosterId = null;
  if (portal) {
    if (!role.isPortalRole) {
      throw new Error(`Role ${roleName} is not isPortalRole=true`);
    }
    let foster = await prisma.foster.findFirst({
      where: { email },
      orderBy: { id: 'asc' },
    });
    if (!foster) {
      foster = await prisma.foster.create({
        data: {
          name: 'RBAC Smoke Portal Foster',
          phone: '000-000-0000',
          email,
          address: 'Smoke Test Address',
          maxKittens: 2,
          notes: 'RBAC smoke foster',
        },
      });
    }
    fosterId = foster.id;
  }

  let user = await prisma.user.findUnique({
    where: { email },
    include: { role: true },
  });

  if (!user) {
    user = await prisma.user.create({
      data: {
        email,
        passwordHash: await hashPassword(SMOKE_PASSWORD),
        firstName: 'Smoke',
        lastName: roleName.slice(0, 40),
        roleId: role.id,
        isActive: true,
        fosterId,
      },
    });
  } else {
    await prisma.user.update({
      where: { id: user.id },
      data: {
        roleId: role.id,
        isActive: true,
        fosterId: portal ? fosterId : null,
        passwordHash: await hashPassword(SMOKE_PASSWORD),
      },
    });
  }

  const permissions = role.permissions.map((rp) => rp.permission.key);
  const token = signToken({
    userId: user.id,
    email: user.email,
    roleId: role.id,
    roleName: role.name,
    permissions,
  });

  return {
    roleName,
    email,
    userId: user.id,
    fosterId,
    token,
    permissions,
  };
}

async function pickKittenId() {
  const kitten = await prisma.kitten.findFirst({
    orderBy: { id: 'asc' },
    select: { id: true },
  });
  return kitten?.id ?? null;
}

async function pickPublicKittenId() {
  const kitten = await prisma.kitten.findFirst({
    where: {
      OR: [
        { status: 'Available for Adoption' },
        { status: 'In Foster Care' },
      ],
    },
    orderBy: { id: 'asc' },
    select: { id: true },
  });
  return kitten?.id ?? null;
}

async function pickApplicationUploadPath() {
  const upload = await prisma.applicationUpload.findFirst({
    orderBy: { id: 'asc' },
    select: { fileUrl: true },
  });
  if (upload?.fileUrl?.startsWith('/uploads/')) return upload.fileUrl;
  // Probe path — even if missing, must not be a successful public file serve (200 with body).
  // Express.static returns 404 for missing; we treat any 2xx as FAIL for this check.
  return '/uploads/applications/999999/smoke-probe.bin';
}

async function ensurePortalPlacement(fosterId, kittenId) {
  if (!fosterId || !kittenId) return null;
  const open = await prisma.placement.findFirst({
    where: { fosterId, kittenId, dischargeDate: null },
  });
  if (open) return open;
  return prisma.placement.create({
    data: {
      fosterId,
      kittenId,
      intakeDate: new Date(),
      notes: 'RBAC smoke placement (temporary)',
    },
  });
}

async function runReadOnly(token) {
  const role = 'Read Only';
  const kittenId = await pickKittenId();

  let r = await api('/api/kittens', { token });
  expectStatus(role, 'GET /api/kittens → 200', r.status, [200]);

  r = await api('/api/applications', { token });
  expectStatus(role, 'GET /api/applications → 200', r.status, [200]);

  r = await api('/api/medical/kitten/1', { token });
  expectStatus(role, 'GET /api/medical/kitten/:id → 200|404', r.status, [200, 404]);

  r = await api('/api/contracts', { token });
  expectStatus(role, 'GET /api/contracts → 200', r.status, [200]);

  r = await api('/api/onboarding', { token });
  expectStatus(role, 'GET /api/onboarding → 200', r.status, [200]);

  r = await api('/api/kittens', { method: 'POST', token, body: { name: 'x' } });
  expectStatus(role, 'POST /api/kittens → 403', r.status, [403]);

  r = await api('/api/kittens/1', { method: 'PATCH', token, body: { name: 'x' } });
  expectStatus(role, 'PATCH /api/kittens/:id → 403', r.status, [403]);

  r = await api('/api/kittens/1', { method: 'DELETE', token });
  expectStatus(role, 'DELETE /api/kittens/:id → 403', r.status, [403]);

  r = await api('/api/medical/vaccines', { method: 'POST', token, body: {} });
  expectStatus(role, 'POST /api/medical/vaccines → 403', r.status, [403]);

  if (kittenId) {
    r = await api(`/api/kittens/${kittenId}/documents`, {
      method: 'POST',
      token,
      body: {},
    });
    expectStatus(role, 'POST /api/kittens/:id/documents → 403', r.status, [403]);
  }

  r = await api('/api/applications/1', { method: 'PATCH', token, body: { status: 'Approved' } });
  expectStatus(role, 'PATCH /api/applications/:id → 403', r.status, [403]);

  r = await api('/api/users', { method: 'POST', token, body: { email: 'x@y.z' } });
  expectStatus(role, 'POST /api/users → 403', r.status, [403]);

  r = await api('/api/settings', { method: 'PATCH', token, body: { orgName: 'Nope' } });
  expectStatus(role, 'PATCH /api/settings → 403', r.status, [403]);
}

async function runMedical(token) {
  const role = 'Medical Staff';
  const kittenId = await pickKittenId();

  if (kittenId) {
    let r = await api(`/api/medical/kitten/${kittenId}`, { token });
    expectStatus(role, 'GET medical → 200', r.status, [200]);

    r = await api(`/api/kittens/${kittenId}/documents`, { token });
    expectStatus(role, 'GET documents → 200', r.status, [200]);
  }

  let r = await api('/api/medical/vaccines', { method: 'POST', token, body: {} });
  expectStatus(role, 'POST vaccine not 403 (expect 400)', r.status, [400]);

  r = await api('/api/kittens/1', { method: 'PATCH', token, body: { __smoke: true } });
  // Permission must pass; Zod/validation should reject unknown/invalid payload without persisting smoke fields
  expectStatus(role, 'PATCH kitten edit allowed (not 403)', r.status, [400, 200]);

  r = await api('/api/users', { token });
  expectStatus(role, 'GET /api/users → 403', r.status, [403]);

  r = await api('/api/roles', { token });
  expectStatus(role, 'GET /api/roles → 403', r.status, [403]);

  r = await api('/api/settings', { token });
  expectStatus(role, 'GET /api/settings → 403', r.status, [403]);

  r = await api('/api/settings', { method: 'PATCH', token, body: { orgName: 'Nope' } });
  expectStatus(role, 'PATCH /api/settings → 403', r.status, [403]);
}

async function runFosterCoordinator(token) {
  const role = 'Foster Coordinator';

  let r = await api('/api/fosters', { token });
  expectStatus(role, 'GET /api/fosters → 200', r.status, [200]);

  r = await api('/api/applications', { token });
  expectStatus(role, 'GET /api/applications → 200', r.status, [200]);

  r = await api('/api/kittens', { token });
  expectStatus(role, 'GET /api/kittens → 200', r.status, [200]);

  r = await api('/api/contracts', { token });
  expectStatus(role, 'GET /api/contracts → 200', r.status, [200]);

  r = await api('/api/onboarding', { token });
  expectStatus(role, 'GET /api/onboarding → 200', r.status, [200]);

  r = await api('/api/fosters', { method: 'POST', token, body: {} });
  expectStatus(role, 'POST /api/fosters not 403 (expect 400)', r.status, [400]);

  r = await api('/api/roles', { token });
  expectStatus(role, 'GET /api/roles → 403', r.status, [403]);

  r = await api('/api/roles', { method: 'POST', token, body: { name: 'Hack' } });
  expectStatus(role, 'POST /api/roles → 403', r.status, [403]);
}

async function runAdminLike(token, role) {
  let r = await api('/api/kittens', { token });
  expectStatus(role, 'GET /api/kittens → 200', r.status, [200]);

  r = await api('/api/users', { token });
  expectStatus(role, 'GET /api/users → 200', r.status, [200]);

  r = await api('/api/settings', { token });
  expectStatus(role, 'GET /api/settings → 200', r.status, [200]);

  if (role === 'Super Admin') {
    r = await api('/api/roles', { token });
    expectStatus(role, 'GET /api/roles → 200', r.status, [200]);
    r = await api('/api/roles', { method: 'POST', token, body: { name: '' } });
    expectStatus(role, 'POST /api/roles not 403 (expect 400)', r.status, [400]);
  } else {
    // Admin has users.view, so role LIST is allowed (user-management UI);
    // roles.manage is required to mutate.
    r = await api('/api/roles', { token });
    expectStatus(role, 'GET /api/roles → 200 (users.view)', r.status, [200]);
    r = await api('/api/roles', { method: 'POST', token, body: { name: 'Hack' } });
    expectStatus(role, 'POST /api/roles → 403 (no roles.manage)', r.status, [403]);
  }
}

async function runPortal(portal) {
  const role = 'Portal foster';
  const kittenId = await pickKittenId();
  await ensurePortalPlacement(portal.fosterId, kittenId);

  let r = await api('/api/kittens', { token: portal.token });
  expectStatus(role, 'GET /api/kittens staff → 403', r.status, [403]);

  r = await api('/api/fosters', { token: portal.token });
  expectStatus(role, 'GET /api/fosters staff → 403', r.status, [403]);

  r = await api('/api/users', { token: portal.token });
  expectStatus(role, 'GET /api/users staff → 403', r.status, [403]);

  r = await api('/api/settings', { token: portal.token });
  expectStatus(role, 'GET /api/settings staff → 403', r.status, [403]);

  r = await api('/api/portal/placements', { token: portal.token });
  expectStatus(role, 'GET /api/portal/placements → 200', r.status, [200]);

  if (kittenId) {
    r = await api(`/api/portal/kittens/${kittenId}/documents`, { token: portal.token });
    expectStatus(role, 'GET portal kitten documents → 200', r.status, [200]);
  }
}

async function ensureSmokeApplicationUpload() {
  const existing = await prisma.applicationUpload.findFirst({
    where: { fileUrl: { startsWith: '/uploads/applications/' } },
    orderBy: { id: 'asc' },
    select: { id: true, applicationId: true, fileUrl: true },
  });
  if (existing) {
    const relative = existing.fileUrl.replace(/^\/uploads\//, '');
    const absolutePath = path.join(getUploadRoot(), relative);
    try {
      await fs.access(absolutePath);
      return existing;
    } catch {
      // DB row exists but file missing — recreate file contents for smoke.
      await fs.mkdir(path.dirname(absolutePath), { recursive: true });
      await fs.writeFile(absolutePath, 'rbac-smoke-application-upload\n', 'utf8');
      return existing;
    }
  }

  const application = await prisma.application.create({
    data: {
      type: 'Foster',
      status: 'New',
      formData: JSON.stringify({ smoke: true }),
      kittenOfInterest: 'RBAC Smoke',
    },
  });

  const dir = path.join(getUploadRoot(), 'applications', String(application.id));
  await fs.mkdir(dir, { recursive: true });
  const fileName = 'smoke-rbac.txt';
  const absolutePath = path.join(dir, fileName);
  await fs.writeFile(absolutePath, 'rbac-smoke-application-upload\n', 'utf8');
  const fileUrl = `/uploads/applications/${application.id}/${fileName}`;

  const upload = await prisma.applicationUpload.create({
    data: {
      applicationId: application.id,
      fileName,
      docLabel: 'RBAC Smoke',
      fileUrl,
      fileType: 'text/plain',
    },
  });

  return { id: upload.id, applicationId: application.id, fileUrl };
}

async function runApplicationFileAccess(readOnlyToken, medicalToken) {
  const smokeUpload = await ensureSmokeApplicationUpload();
  const authPath = `/api/applications/${smokeUpload.applicationId}/documents/${smokeUpload.id}/file`;

  let r = await api(authPath, { token: readOnlyToken });
  expectStatus(
    'Read Only',
    `GET ${authPath} → 200 (authenticated stream)`,
    r.status,
    [200],
  );

  r = await api(authPath, { token: medicalToken });
  expectStatus(
    'Medical Staff',
    `GET ${authPath} → 403 (no applications.view)`,
    r.status,
    [403],
  );

  r = await api(smokeUpload.fileUrl, { token: null });
  expectStatus(
    'Unauthenticated',
    `GET raw ${smokeUpload.fileUrl} → 401`,
    r.status,
    [401],
  );

  r = await api(smokeUpload.fileUrl, { token: readOnlyToken });
  expectStatus(
    'Read Only',
    `GET raw ${smokeUpload.fileUrl} still blocked → 401`,
    r.status,
    [401],
  );
}

async function runUnauthenticated() {
  const role = 'Unauthenticated';

  const pathToCheck = '/uploads/applications/999999/smoke-probe.bin';
  const rUpload = await api(pathToCheck, { token: null });
  expectStatus(role, `GET ${pathToCheck} blocked`, rUpload.status, [401, 403, 404]);

  const publicId = await pickPublicKittenId();
  if (publicId) {
    const r = await api(`/api/public/kittens/${publicId}/photo`, { token: null });
    expectStatus(role, `GET /api/public/kittens/${publicId}/photo reachable`, r.status, [200, 302, 404]);
  } else {
    record(role, 'GET public kitten photo', false, 'no public-eligible kitten in DB');
  }

  const r = await api('/api/kittens', { token: null });
  expectStatus(role, 'GET /api/kittens → 401', r.status, [401]);
}

function printSummary() {
  const passed = results.filter((x) => x.ok).length;
  const failed = results.filter((x) => !x.ok).length;

  console.log('\n========== RBAC SMOKE MATRIX ==========');
  console.log(`Base: ${BASE}`);
  console.log(`Total: ${results.length}  PASS: ${passed}  FAIL: ${failed}\n`);

  const byRole = new Map();
  for (const row of results) {
    if (!byRole.has(row.role)) byRole.set(row.role, []);
    byRole.get(row.role).push(row);
  }

  for (const [role, rows] of byRole) {
    console.log(`--- ${role} ---`);
    for (const row of rows) {
      console.log(`  ${row.ok ? 'PASS' : 'FAIL'}  ${row.name}${row.detail ? ` (${row.detail})` : ''}`);
    }
    console.log('');
  }

  if (failed) {
    console.log('RESULT: FAIL — do not commit/push until fixed.\n');
    process.exitCode = 1;
  } else {
    console.log('RESULT: ALL PASS — safe to proceed with commit/push.\n');
  }
}

async function main() {
  assertLocalBase();
  console.log(`\nRBAC smoke matrix → ${BASE}\n`);

  // Health first
  try {
    const health = await api('/api/health');
    if (health.status !== 200) {
      throw new Error(`Local server not healthy (status ${health.status}). Start with: cd server && npm run start`);
    }
  } catch (err) {
    throw new Error(
      `Cannot reach local API at ${BASE}. Start the server first (cd server && npm run start). ${err.message}`,
    );
  }

  console.log('Syncing permissions (additive)...');
  await syncPermissionsFromDefaults();

  console.log('Provisioning smoke users (or refreshing tokens)...');
  const superAdmin = await ensureRoleUser('Super Admin');
  const admin = await ensureRoleUser('Admin');
  const fosterCoord = await ensureRoleUser('Foster Coordinator');
  const medical = await ensureRoleUser('Medical Staff');
  const readOnly = await ensureRoleUser('Read Only');
  const portal = await ensureRoleUser('Foster Self-Service Portal', { portal: true });

  console.log('\nRunning checks...\n');

  await runAdminLike(superAdmin.token, 'Super Admin');
  await runAdminLike(admin.token, 'Admin');
  await runFosterCoordinator(fosterCoord.token);
  await runMedical(medical.token);
  await runReadOnly(readOnly.token);
  await runPortal(portal);
  await runApplicationFileAccess(readOnly.token, medical.token);
  await runUnauthenticated();

  printSummary();
}

main()
  .catch((err) => {
    console.error('\nSMOKE SCRIPT ERROR:', err.message || err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
