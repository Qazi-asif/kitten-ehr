/**
 * Staff chat conversations smoke (REST + WS).
 * Usage: node scripts/smoke-staff-chat.mjs [baseUrl]
 */
import '../src/loadEnv.js';
import prisma from '../src/lib/prisma.js';
import { signToken } from '../src/utils/authUtils.js';
import { syncPermissionsFromDefaults } from '../src/utils/syncPermissions.js';
import { ensureAllStaffConversation } from '../src/controllers/staffChatController.js';
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
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  return { status: res.status, data };
}

function waitForWsMessage(ws, predicate, timeoutMs = 5000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => { cleanup(); reject(new Error('WS timeout')); }, timeoutMs);
    function onMessage(raw) {
      let payload;
      try { payload = JSON.parse(String(raw)); } catch { return; }
      if (predicate(payload)) { cleanup(); resolve(payload); }
    }
    function cleanup() { clearTimeout(timer); ws.off('message', onMessage); }
    ws.on('message', onMessage);
  });
}

async function main() {
  await syncPermissionsFromDefaults();
  const allStaff = await ensureAllStaffConversation();

  const staff = await prisma.user.findFirst({
    where: { isActive: true, role: { isPortalRole: false, name: { in: ['Super Admin', 'Admin'] } } },
    include: { role: true },
  });
  if (!staff) {
    record('find staff user', false, 'none');
    process.exit(1);
  }

  const other = await prisma.user.findFirst({
    where: {
      isActive: true,
      id: { not: staff.id },
      role: { isPortalRole: false },
    },
  });

  const token = signToken({ userId: staff.id });
  record('mint JWT', true, staff.email);

  const unauth = await api('/api/chat/conversations');
  record('GET conversations without auth → 401', unauth.status === 401, `status ${unauth.status}`);

  const list = await api('/api/chat/conversations', { token });
  record(
    'GET conversations includes All Staff',
    list.status === 200 && Array.isArray(list.data) && list.data.some((c) => c.isSystem || c.title === 'All Staff'),
    `count ${Array.isArray(list.data) ? list.data.length : 0}`,
  );

  const content = `conv-smoke ${Date.now()}`;
  const posted = await api(`/api/chat/conversations/${allStaff.id}/messages`, {
    token,
    method: 'POST',
    body: { content },
  });
  record('POST message to All Staff → 201', posted.status === 201 && posted.data?.content === content, posted.data?.id || '');

  if (other) {
    const dm = await api('/api/chat/conversations/direct', {
      token,
      method: 'POST',
      body: { userId: other.id },
    });
    record('POST direct conversation → 201', dm.status === 201 && dm.data?.type === 'DIRECT', dm.data?.id || '');

    const group = await api('/api/chat/conversations/group', {
      token,
      method: 'POST',
      body: { name: `Smoke Group ${Date.now()}`, memberIds: [other.id] },
    });
    record('POST group conversation → 201', group.status === 201 && group.data?.type === 'GROUP', group.data?.id || '');
  } else {
    record('POST direct/group skipped', true, 'only one staff user');
  }

  const wsUrl = BASE.replace(/^http/, 'ws') + `/ws/staff-chat?token=${encodeURIComponent(token)}`;
  let wsOk = false;
  let wsDetail = '';
  try {
    const ws = new WebSocket(wsUrl);
    await new Promise((resolve, reject) => {
      const t = setTimeout(() => reject(new Error('connect timeout')), 5000);
      ws.once('open', () => { clearTimeout(t); resolve(); });
      ws.once('error', (err) => { clearTimeout(t); reject(err); });
    });
    await waitForWsMessage(ws, (p) => p.type === 'online');
    const wsContent = `ws-conv ${Date.now()}`;
    const msgPromise = waitForWsMessage(ws, (p) => p.type === 'message' && p.message?.content === wsContent);
    ws.send(JSON.stringify({ type: 'message', conversationId: allStaff.id, content: wsContent }));
    const msg = await msgPromise;
    wsOk = Boolean(msg?.message?.id);
    wsDetail = msg.message.id;
    ws.close();
  } catch (err) {
    wsDetail = err.message || String(err);
  }
  record('WS send/receive in conversation', wsOk, wsDetail);

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
