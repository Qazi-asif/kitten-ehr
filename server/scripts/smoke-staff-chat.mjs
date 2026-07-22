/**
 * Local smoke for staff chat REST + WebSocket.
 * Usage: node scripts/smoke-staff-chat.mjs [baseUrl]
 * Default: http://127.0.0.1:5000
 */
import '../src/loadEnv.js';
import prisma from '../src/lib/prisma.js';
import { signToken } from '../src/utils/authUtils.js';
import { syncPermissionsFromDefaults } from '../src/utils/syncPermissions.js';
import WebSocket from 'ws';

const BASE = (process.argv[2] || 'http://127.0.0.1:5000').replace(/\/$/, '');
const results = [];

function record(name, ok, detail = '') {
  results.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
}

async function api(path, { method = 'GET', token, body } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  return { status: res.status, data };
}

function waitForWsMessage(ws, predicate, timeoutMs = 5000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error('WS timeout'));
    }, timeoutMs);

    function onMessage(raw) {
      let payload;
      try {
        payload = JSON.parse(String(raw));
      } catch {
        return;
      }
      if (predicate(payload)) {
        cleanup();
        resolve(payload);
      }
    }

    function cleanup() {
      clearTimeout(timer);
      ws.off('message', onMessage);
    }

    ws.on('message', onMessage);
  });
}

async function main() {
  await syncPermissionsFromDefaults();

  const staff = await prisma.user.findFirst({
    where: {
      isActive: true,
      role: { isPortalRole: false, name: { in: ['Super Admin', 'Admin'] } },
    },
    include: { role: true },
  });

  if (!staff) {
    record('find staff user', false, 'no Super Admin/Admin user');
    process.exit(1);
  }

  const token = signToken({ userId: staff.id });
  record('mint JWT', true, `${staff.email} (${staff.role.name})`);

  const unauth = await api('/api/chat/messages');
  record('GET /api/chat/messages without auth → 401', unauth.status === 401, `status ${unauth.status}`);

  const list = await api('/api/chat/messages', { token });
  record('GET /api/chat/messages → 200', list.status === 200, `count ${Array.isArray(list.data) ? list.data.length : '?'}`);

  const members = await api('/api/chat/staff', { token });
  record(
    'GET /api/chat/staff → 200',
    members.status === 200 && Array.isArray(members.data) && members.data.length > 0,
    `count ${Array.isArray(members.data) ? members.data.length : 0}`,
  );

  const content = `smoke-chat ${Date.now()}`;
  const posted = await api('/api/chat/messages', {
    token,
    method: 'POST',
    body: { content },
  });
  record(
    'POST /api/chat/messages → 201',
    posted.status === 201 && posted.data?.content === content,
    `id ${posted.data?.id || 'n/a'}`,
  );

  const empty = await api('/api/chat/messages', {
    token,
    method: 'POST',
    body: { content: '   ' },
  });
  record('POST empty message → 400', empty.status === 400, `status ${empty.status}`);

  // WebSocket round-trip
  const wsUrl = BASE.replace(/^http/, 'ws') + `/ws/staff-chat?token=${encodeURIComponent(token)}`;
  let wsOk = false;
  let wsDetail = '';
  try {
    const ws = new WebSocket(wsUrl);
    await new Promise((resolve, reject) => {
      const t = setTimeout(() => reject(new Error('connect timeout')), 5000);
      ws.once('open', () => {
        clearTimeout(t);
        resolve();
      });
      ws.once('error', (err) => {
        clearTimeout(t);
        reject(err);
      });
    });

    const online = await waitForWsMessage(ws, (p) => p.type === 'online');
    record('WS online event', Array.isArray(online.users), `users ${online.users?.length ?? 0}`);

    const wsContent = `ws-smoke ${Date.now()}`;
    const msgPromise = waitForWsMessage(
      ws,
      (p) => p.type === 'message' && p.message?.content === wsContent,
    );
    ws.send(JSON.stringify({ type: 'message', content: wsContent }));
    const msg = await msgPromise;
    wsOk = Boolean(msg?.message?.id);
    wsDetail = `id ${msg.message.id}`;
    ws.close();
  } catch (err) {
    wsDetail = err.message || String(err);
  }
  record('WS send/receive message', wsOk, wsDetail);

  // Confirm persisted
  const after = await api('/api/chat/messages?limit=100', { token });
  const found = Array.isArray(after.data) && after.data.some((m) => m.content === content);
  record('REST message persisted', found);

  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} passed`);
  await prisma.$disconnect();
  process.exit(failed.length ? 1 : 0);
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect().catch(() => {});
  process.exit(1);
});
