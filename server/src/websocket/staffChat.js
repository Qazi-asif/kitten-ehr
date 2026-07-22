import { WebSocketServer } from 'ws';
import prisma from '../lib/prisma.js';
import { verifyToken } from '../utils/authUtils.js';
import {
  createMessage,
  getConversationMemberIds,
} from '../controllers/staffChatController.js';

const WS_PATH = '/ws/staff-chat';
const MAX_SOCKETS_TOTAL = 40;
const MAX_SOCKETS_PER_USER = 3;
const PING_INTERVAL_MS = 30_000;
const MESSAGE_RATE_WINDOW_MS = 1000;
const MESSAGE_RATE_MAX = 5;

/** @type {Map<import('ws').WebSocket, { userId: number, name: string, lastMessageAt: number[], lastTypingAt: number }>} */
const clients = new Map();

function getOnlineUserIds() {
  return new Set([...clients.values()].map((m) => m.userId));
}

function getOnlineUsers() {
  const byId = new Map();
  for (const meta of clients.values()) {
    byId.set(meta.userId, { id: meta.userId, name: meta.name });
  }
  return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name));
}

function send(socket, payload) {
  if (socket.readyState === 1) {
    socket.send(JSON.stringify(payload));
  }
}

export function broadcastToConversation(conversationId, payload, exceptUserId = null) {
  getConversationMemberIds(conversationId)
    .then((memberIds) => {
      const memberSet = new Set(memberIds);
      const raw = JSON.stringify(payload);
      for (const [socket, meta] of clients) {
        if (!memberSet.has(meta.userId)) continue;
        if (exceptUserId != null && meta.userId === exceptUserId) continue;
        if (socket.readyState === 1) socket.send(raw);
      }
    })
    .catch((err) => console.error('[staff-chat] broadcast failed', err?.message || err));
}

function broadcastOnline() {
  const payload = JSON.stringify({ type: 'online', users: getOnlineUsers() });
  for (const [socket] of clients) {
    if (socket.readyState === 1) socket.send(payload);
  }
}

function allowMessageRate(meta) {
  const now = Date.now();
  meta.lastMessageAt = (meta.lastMessageAt || []).filter((t) => now - t < MESSAGE_RATE_WINDOW_MS);
  if (meta.lastMessageAt.length >= MESSAGE_RATE_MAX) return false;
  meta.lastMessageAt.push(now);
  return true;
}

async function authenticateSocket(req) {
  const url = new URL(req.url || '', 'http://localhost');
  const token = url.searchParams.get('token') || '';
  if (!token) return null;

  let decoded;
  try {
    decoded = verifyToken(token);
  } catch {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { id: decoded.userId },
    include: {
      role: {
        include: {
          permissions: { include: { permission: true } },
        },
      },
    },
  });

  if (!user?.isActive || user.role?.isPortalRole) return null;
  const permissions = user.role.permissions.map((rp) => rp.permission.key);
  if (!permissions.includes('chat.view')) return null;

  return {
    id: user.id,
    name: `${user.firstName} ${user.lastName}`.trim() || user.email,
  };
}

export function attachStaffChatWebSocket(server) {
  const wss = new WebSocketServer({
    server,
    path: WS_PATH,
    maxPayload: 8 * 1024,
  });

  // Expose online set to REST serializers
  if (server && typeof server.on === 'function') {
    // no-op placeholder
  }

  const pingTimer = setInterval(() => {
    for (const [socket] of clients) {
      if (socket.isAlive === false) {
        clients.delete(socket);
        try {
          socket.terminate();
        } catch {
          /* ignore */
        }
        continue;
      }
      socket.isAlive = false;
      try {
        socket.ping();
      } catch {
        /* ignore */
      }
    }
    broadcastOnline();
  }, PING_INTERVAL_MS);
  if (typeof pingTimer.unref === 'function') pingTimer.unref();

  wss.on('connection', async (socket, req) => {
    let user;
    try {
      user = await authenticateSocket(req);
    } catch (err) {
      console.error('[staff-chat] auth error', err);
      socket.close(1011, 'Auth failed');
      return;
    }

    if (!user) {
      socket.close(1008, 'Unauthorized');
      return;
    }

    const userSockets = [...clients.entries()].filter(([, m]) => m.userId === user.id);
    if (userSockets.length >= MAX_SOCKETS_PER_USER) {
      const [oldSocket] = userSockets[0];
      clients.delete(oldSocket);
      try {
        oldSocket.close(1000, 'Replaced');
      } catch {
        /* ignore */
      }
    } else if (clients.size >= MAX_SOCKETS_TOTAL) {
      socket.close(1013, 'Too many connections');
      return;
    }

    socket.isAlive = true;
    clients.set(socket, {
      userId: user.id,
      name: user.name,
      lastMessageAt: [],
      lastTypingAt: 0,
    });

    send(socket, { type: 'online', users: getOnlineUsers() });
    broadcastOnline();

    socket.on('pong', () => {
      socket.isAlive = true;
    });

    socket.on('message', async (data) => {
      const meta = clients.get(socket);
      if (!meta) return;

      let payload;
      try {
        payload = JSON.parse(String(data));
      } catch {
        send(socket, { type: 'error', message: 'Invalid JSON' });
        return;
      }

      if (payload?.type === 'typing') {
        const conversationId = payload.conversationId;
        if (!conversationId) return;
        const now = Date.now();
        if (now - meta.lastTypingAt < 800) return;
        meta.lastTypingAt = now;
        broadcastToConversation(
          conversationId,
          { type: 'typing', conversationId, userId: meta.userId, name: meta.name },
          meta.userId,
        );
        return;
      }

      if (payload?.type === 'message') {
        if (!allowMessageRate(meta)) {
          send(socket, { type: 'error', message: 'Slow down — too many messages' });
          return;
        }
        if (!payload.conversationId) {
          send(socket, { type: 'error', message: 'conversationId required' });
          return;
        }

        try {
          const message = await createMessage({
            conversationId: payload.conversationId,
            senderId: meta.userId,
            content: payload.content,
          });
          broadcastToConversation(message.conversationId, { type: 'message', message });
        } catch (err) {
          console.error('[staff-chat] message error', err);
          send(socket, {
            type: 'error',
            message: err.status ? err.message : 'Failed to send message',
          });
        }
        return;
      }

      send(socket, { type: 'error', message: 'Unknown event type' });
    });

    socket.on('close', () => {
      clients.delete(socket);
      broadcastOnline();
    });

    socket.on('error', (err) => {
      console.error('[staff-chat] socket error', err?.message || err);
      clients.delete(socket);
    });
  });

  console.log(`[staff-chat] WebSocket ready at ${WS_PATH}`);
  return wss;
}

export function getStaffChatOnlineIds() {
  return getOnlineUserIds();
}

/** Notify WS clients after a REST-created message (same process). */
export function broadcastStaffChatMessage(message) {
  if (!message?.conversationId) return;
  broadcastToConversation(message.conversationId, { type: 'message', message });
}
