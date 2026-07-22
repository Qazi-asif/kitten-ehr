import prisma from '../lib/prisma.js';

export const DEFAULT_CHAT_CHANNEL = 'general';
export const MAX_MESSAGE_LENGTH = 2000;
export const MAX_HISTORY = 100;

const senderSelect = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
};

function serializeMessage(row) {
  return {
    id: row.id,
    content: row.content,
    channelId: row.channelId,
    senderId: row.senderId,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    sender: row.sender
      ? {
          id: row.sender.id,
          firstName: row.sender.firstName,
          lastName: row.sender.lastName,
          email: row.sender.email,
          displayName: `${row.sender.firstName} ${row.sender.lastName}`.trim(),
        }
      : null,
  };
}

export function normalizeMessageContent(raw) {
  const content = String(raw ?? '').trim();
  if (!content) {
    const err = new Error('Message content is required');
    err.status = 400;
    throw err;
  }
  if (content.length > MAX_MESSAGE_LENGTH) {
    const err = new Error(`Message must be ${MAX_MESSAGE_LENGTH} characters or fewer`);
    err.status = 400;
    throw err;
  }
  return content;
}

export async function createStaffChatMessage({ content, senderId, channelId = DEFAULT_CHAT_CHANNEL }) {
  const normalized = normalizeMessageContent(content);
  const channel = String(channelId || DEFAULT_CHAT_CHANNEL).trim() || DEFAULT_CHAT_CHANNEL;

  const row = await prisma.staffChatMessage.create({
    data: {
      content: normalized,
      senderId,
      channelId: channel,
    },
    include: { sender: { select: senderSelect } },
  });

  return serializeMessage(row);
}

export async function listStaffChatMessages({
  channelId = DEFAULT_CHAT_CHANNEL,
  limit = MAX_HISTORY,
  after = null,
} = {}) {
  const take = Math.min(Math.max(Number(limit) || MAX_HISTORY, 1), MAX_HISTORY);
  const channel = String(channelId || DEFAULT_CHAT_CHANNEL).trim() || DEFAULT_CHAT_CHANNEL;

  const where = { channelId: channel };
  if (after) {
    const afterDate = new Date(after);
    if (!Number.isNaN(afterDate.getTime())) {
      where.createdAt = { gt: afterDate };
    }
  }

  const rows = await prisma.staffChatMessage.findMany({
    where,
    orderBy: { createdAt: after ? 'asc' : 'desc' },
    take,
    include: { sender: { select: senderSelect } },
  });

  const ordered = after ? rows : rows.reverse();
  return ordered.map(serializeMessage);
}

export async function listStaffChatMembers() {
  const users = await prisma.user.findMany({
    where: {
      isActive: true,
      role: { isPortalRole: false },
    },
    orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      role: { select: { name: true } },
    },
  });

  return users.map((u) => ({
    id: u.id,
    firstName: u.firstName,
    lastName: u.lastName,
    email: u.email,
    roleName: u.role?.name || '',
    displayName: `${u.firstName} ${u.lastName}`.trim(),
  }));
}

export async function getMessages(req, res, next) {
  try {
    const messages = await listStaffChatMessages({
      channelId: req.query.channelId,
      limit: req.query.limit,
      after: req.query.after,
    });
    return res.json(messages);
  } catch (error) {
    return next(error);
  }
}

export async function postMessage(req, res, next) {
  try {
    const message = await createStaffChatMessage({
      content: req.body?.content,
      senderId: req.user.id,
      channelId: req.body?.channelId,
    });

    try {
      const { broadcastStaffChatMessage } = await import('../websocket/staffChat.js');
      broadcastStaffChatMessage(message);
    } catch (err) {
      console.error('[staff-chat] REST broadcast failed', err?.message || err);
    }

    return res.status(201).json(message);
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ error: error.message });
    }
    return next(error);
  }
}

export async function getStaffMembers(req, res, next) {
  try {
    const staff = await listStaffChatMembers();
    return res.json(staff);
  } catch (error) {
    return next(error);
  }
}
