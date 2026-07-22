import { Router } from 'express';
import {
  getConversations,
  getMessages,
  getStaffMembers,
  postClear,
  postDirectConversation,
  postGroupConversation,
  postMessage,
  postRead,
} from '../controllers/staffChatController.js';
import { requirePermission } from '../middleware/authMiddleware.js';

const router = Router();

router.get('/conversations', requirePermission('chat.view'), getConversations);
router.post('/conversations/direct', requirePermission('chat.view'), postDirectConversation);
router.post('/conversations/group', requirePermission('chat.view'), postGroupConversation);
router.get('/conversations/:conversationId/messages', requirePermission('chat.view'), getMessages);
router.post('/conversations/:conversationId/messages', requirePermission('chat.view'), postMessage);
router.post('/conversations/:conversationId/read', requirePermission('chat.view'), postRead);
router.post('/conversations/:conversationId/clear', requirePermission('chat.view'), postClear);
router.get('/staff', requirePermission('chat.view'), getStaffMembers);

// Back-compat shims used by older client builds
router.get('/messages', requirePermission('chat.view'), async (req, res, next) => {
  try {
    const { ensureAllStaffConversation, listMessages } = await import('../controllers/staffChatController.js');
    const allStaff = await ensureAllStaffConversation();
    const messages = await listMessages(allStaff.id, req.user.id, {
      limit: req.query.limit,
      after: req.query.after,
    });
    return res.json(messages);
  } catch (error) {
    return next(error);
  }
});

router.post('/messages', requirePermission('chat.view'), async (req, res, next) => {
  try {
    const { ensureAllStaffConversation, createMessage } = await import('../controllers/staffChatController.js');
    const { broadcastToConversation } = await import('../websocket/staffChat.js');
    const allStaff = await ensureAllStaffConversation();
    const message = await createMessage({
      conversationId: allStaff.id,
      senderId: req.user.id,
      content: req.body?.content,
    });
    broadcastToConversation(message.conversationId, { type: 'message', message });
    return res.status(201).json(message);
  } catch (error) {
    if (error.status) return res.status(error.status).json({ error: error.message });
    return next(error);
  }
});

export default router;
