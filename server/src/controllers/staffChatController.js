import prisma from '../lib/prisma.js';

export const MAX_MESSAGE_LENGTH = 2000;
export const MAX_HISTORY = 100;
export const ALL_STAFF_NAME = 'All Staff';

const userSelect = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
};

function displayName(user) {
  if (!user) return 'Staff';
  return `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email || 'Staff';
}

function serializeSender(user) {
  if (!user) return null;
  return {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    displayName: displayName(user),
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

function directKeyFor(userA, userB) {
  const [a, b] = [Number(userA), Number(userB)].sort((x, y) => x - y);
  return `direct:${a}:${b}`;
}

export async function listActiveStaffUsers() {
  return prisma.user.findMany({
    where: { isActive: true, role: { isPortalRole: false } },
    orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
    select: {
      ...userSelect,
      role: { select: { name: true } },
    },
  });
}

export async function ensureAllStaffConversation() {
  let conversation = await prisma.staffChatConversation.findFirst({
    where: { isSystem: true, type: 'GROUP', name: ALL_STAFF_NAME },
  });

  if (!conversation) {
    conversation = await prisma.staffChatConversation.create({
      data: {
        type: 'GROUP',
        name: ALL_STAFF_NAME,
        isSystem: true,
      },
    });
  }

  const staff = await listActiveStaffUsers();
  const existing = await prisma.staffChatMember.findMany({
    where: { conversationId: conversation.id },
    select: { userId: true },
  });
  const existingIds = new Set(existing.map((m) => m.userId));
  const toAdd = staff.filter((u) => !existingIds.has(u.id));
  if (toAdd.length) {
    await prisma.staffChatMember.createMany({
      data: toAdd.map((u) => ({ conversationId: conversation.id, userId: u.id })),
      skipDuplicates: true,
    });
  }

  return conversation;
}

async function assertMember(conversationId, userId) {
  const member = await prisma.staffChatMember.findUnique({
    where: {
      conversationId_userId: { conversationId, userId },
    },
  });
  if (!member) {
    const err = new Error('Not a member of this conversation');
    err.status = 403;
    throw err;
  }
  return member;
}

function serializeMessage(row) {
  return {
    id: row.id,
    conversationId: row.conversationId,
    content: row.content,
    senderId: row.senderId,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    sender: serializeSender(row.sender),
  };
}

async function serializeConversation(conversation, currentUserId, onlineIds = new Set()) {
  const members = conversation.members || [];
  const otherMembers = members.filter((m) => m.userId !== currentUserId);
  let title = conversation.name;
  if (conversation.type === 'DIRECT') {
    title = displayName(otherMembers[0]?.user) || 'Direct message';
  }

  const lastMessage = conversation.messages?.[0] || null;
  const myMembership = members.find((m) => m.userId === currentUserId);
  const lastReadAt = myMembership?.lastReadAt ? new Date(myMembership.lastReadAt).getTime() : 0;
  const unreadCount = conversation._count?.messages ?? 0;

  // Prefer precomputed unread when provided via _unreadCount
  const unread = conversation._unreadCount != null ? conversation._unreadCount : unreadCount;

  const onlineMemberIds = members
    .map((m) => m.userId)
    .filter((id) => onlineIds.has(id) && id !== currentUserId);

  return {
    id: conversation.id,
    type: conversation.type,
    name: conversation.name,
    title,
    isSystem: conversation.isSystem,
    createdAt: conversation.createdAt,
    updatedAt: conversation.updatedAt,
    memberCount: members.length,
    members: members.map((m) => ({
      userId: m.userId,
      displayName: displayName(m.user),
      firstName: m.user?.firstName,
      lastName: m.user?.lastName,
      email: m.user?.email,
      lastReadAt: m.lastReadAt,
      online: onlineIds.has(m.userId),
    })),
    onlineMemberIds,
    lastMessage: lastMessage
      ? {
          id: lastMessage.id,
          content: lastMessage.content,
          senderId: lastMessage.senderId,
          createdAt: lastMessage.createdAt,
          senderName: displayName(lastMessage.sender),
        }
      : null,
    unreadCount: unread,
  };
}

export async function listConversationsForUser(userId, onlineIds = new Set()) {
  await ensureAllStaffConversation();

  const conversations = await prisma.staffChatConversation.findMany({
    where: { members: { some: { userId } } },
    include: {
      members: { include: { user: { select: userSelect } } },
      messages: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        include: { sender: { select: userSelect } },
      },
    },
    orderBy: { updatedAt: 'desc' },
  });

  const withUnread = await Promise.all(
    conversations.map(async (c) => {
      const mine = c.members.find((m) => m.userId === userId);
      const lastReadAt = mine?.lastReadAt || new Date(0);
      const unread = await prisma.staffChatMessage.count({
        where: {
          conversationId: c.id,
          createdAt: { gt: lastReadAt },
          senderId: { not: userId },
        },
      });
      return serializeConversation({ ...c, _unreadCount: unread }, userId, onlineIds);
    }),
  );

  return withUnread;
}

export async function getOrCreateDirectConversation(currentUserId, otherUserId) {
  const otherId = Number(otherUserId);
  if (!Number.isInteger(otherId) || otherId === currentUserId) {
    const err = new Error('Invalid recipient');
    err.status = 400;
    throw err;
  }

  const other = await prisma.user.findFirst({
    where: { id: otherId, isActive: true, role: { isPortalRole: false } },
    select: { id: true },
  });
  if (!other) {
    const err = new Error('Staff member not found');
    err.status = 404;
    throw err;
  }

  const key = directKeyFor(currentUserId, otherId);
  let conversation = await prisma.staffChatConversation.findUnique({
    where: { directKey: key },
    include: {
      members: { include: { user: { select: userSelect } } },
      messages: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        include: { sender: { select: userSelect } },
      },
    },
  });

  if (!conversation) {
    conversation = await prisma.staffChatConversation.create({
      data: {
        type: 'DIRECT',
        directKey: key,
        members: {
          create: [
            { userId: currentUserId },
            { userId: otherId },
          ],
        },
      },
      include: {
        members: { include: { user: { select: userSelect } } },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: { sender: { select: userSelect } },
        },
      },
    });
  }

  return serializeConversation(conversation, currentUserId);
}

export async function createGroupConversation(currentUserId, { name, memberIds = [] }) {
  const title = String(name || '').trim();
  if (!title) {
    const err = new Error('Group name is required');
    err.status = 400;
    throw err;
  }

  const ids = [...new Set([currentUserId, ...memberIds.map(Number).filter(Number.isInteger)])];
  const staff = await prisma.user.findMany({
    where: { id: { in: ids }, isActive: true, role: { isPortalRole: false } },
    select: { id: true },
  });
  if (staff.length < 2) {
    const err = new Error('A group needs at least two staff members');
    err.status = 400;
    throw err;
  }

  const conversation = await prisma.staffChatConversation.create({
    data: {
      type: 'GROUP',
      name: title,
      createdById: currentUserId,
      isSystem: false,
      members: {
        create: staff.map((u) => ({ userId: u.id })),
      },
    },
    include: {
      members: { include: { user: { select: userSelect } } },
      messages: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        include: { sender: { select: userSelect } },
      },
    },
  });

  return serializeConversation(conversation, currentUserId);
}

export async function listMessages(conversationId, userId, { limit = MAX_HISTORY, after = null } = {}) {
  await assertMember(conversationId, userId);
  const take = Math.min(Math.max(Number(limit) || MAX_HISTORY, 1), MAX_HISTORY);

  const where = { conversationId };
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
    include: { sender: { select: userSelect } },
  });

  const ordered = after ? rows : rows.reverse();
  return ordered.map(serializeMessage);
}

export async function createMessage({ conversationId, senderId, content }) {
  await assertMember(conversationId, senderId);
  const normalized = normalizeMessageContent(content);

  const row = await prisma.$transaction(async (tx) => {
    const message = await tx.staffChatMessage.create({
      data: {
        conversationId,
        senderId,
        content: normalized,
      },
      include: { sender: { select: userSelect } },
    });
    await tx.staffChatConversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });
    await tx.staffChatMember.update({
      where: {
        conversationId_userId: { conversationId, userId: senderId },
      },
      data: { lastReadAt: new Date() },
    });
    return message;
  });

  return serializeMessage(row);
}

export async function markConversationRead(conversationId, userId) {
  await assertMember(conversationId, userId);
  await prisma.staffChatMember.update({
    where: {
      conversationId_userId: { conversationId, userId },
    },
    data: { lastReadAt: new Date() },
  });
  return { ok: true };
}

export async function clearConversation(conversationId, userId, { isSuperAdmin }) {
  await assertMember(conversationId, userId);
  if (!isSuperAdmin) {
    const err = new Error('Only Super Admin can clear chat for everyone');
    err.status = 403;
    throw err;
  }

  await prisma.staffChatMessage.deleteMany({ where: { conversationId } });
  await prisma.staffChatConversation.update({
    where: { id: conversationId },
    data: { updatedAt: new Date() },
  });
  return { ok: true };
}

export async function getConversationMemberIds(conversationId) {
  const members = await prisma.staffChatMember.findMany({
    where: { conversationId },
    select: { userId: true },
  });
  return members.map((m) => m.userId);
}

// ─── HTTP handlers ───────────────────────────────────────────────────────────

export async function getConversations(req, res, next) {
  try {
    const onlineIds = req.app.get('staffChatOnlineIds')?.() || new Set();
    const list = await listConversationsForUser(req.user.id, onlineIds);
    return res.json(list);
  } catch (error) {
    return next(error);
  }
}

export async function postDirectConversation(req, res, next) {
  try {
    const conversation = await getOrCreateDirectConversation(req.user.id, req.body?.userId);
    return res.status(201).json(conversation);
  } catch (error) {
    if (error.status) return res.status(error.status).json({ error: error.message });
    return next(error);
  }
}

export async function postGroupConversation(req, res, next) {
  try {
    const conversation = await createGroupConversation(req.user.id, {
      name: req.body?.name,
      memberIds: Array.isArray(req.body?.memberIds) ? req.body.memberIds : [],
    });
    return res.status(201).json(conversation);
  } catch (error) {
    if (error.status) return res.status(error.status).json({ error: error.message });
    return next(error);
  }
}

export async function getMessages(req, res, next) {
  try {
    const messages = await listMessages(req.params.conversationId, req.user.id, {
      limit: req.query.limit,
      after: req.query.after,
    });
    return res.json(messages);
  } catch (error) {
    if (error.status) return res.status(error.status).json({ error: error.message });
    return next(error);
  }
}

export async function postMessage(req, res, next) {
  try {
    const message = await createMessage({
      conversationId: req.params.conversationId,
      senderId: req.user.id,
      content: req.body?.content,
    });

    try {
      const { broadcastToConversation } = await import('../websocket/staffChat.js');
      broadcastToConversation(message.conversationId, { type: 'message', message });
    } catch (err) {
      console.error('[staff-chat] REST broadcast failed', err?.message || err);
    }

    return res.status(201).json(message);
  } catch (error) {
    if (error.status) return res.status(error.status).json({ error: error.message });
    return next(error);
  }
}

export async function postRead(req, res, next) {
  try {
    const result = await markConversationRead(req.params.conversationId, req.user.id);
    return res.json(result);
  } catch (error) {
    if (error.status) return res.status(error.status).json({ error: error.message });
    return next(error);
  }
}

export async function postClear(req, res, next) {
  try {
    const isSuperAdmin = req.user?.role?.name === 'Super Admin';
    const result = await clearConversation(req.params.conversationId, req.user.id, { isSuperAdmin });

    try {
      const { broadcastToConversation } = await import('../websocket/staffChat.js');
      broadcastToConversation(req.params.conversationId, {
        type: 'cleared',
        conversationId: req.params.conversationId,
        clearedBy: req.user.id,
      });
    } catch (err) {
      console.error('[staff-chat] clear broadcast failed', err?.message || err);
    }

    return res.json(result);
  } catch (error) {
    if (error.status) return res.status(error.status).json({ error: error.message });
    return next(error);
  }
}

export async function getStaffMembers(req, res, next) {
  try {
    await ensureAllStaffConversation();
    const staff = await listActiveStaffUsers();
    return res.json(
      staff.map((u) => ({
        id: u.id,
        firstName: u.firstName,
        lastName: u.lastName,
        email: u.email,
        roleName: u.role?.name || '',
        displayName: displayName(u),
      })),
    );
  } catch (error) {
    return next(error);
  }
}
