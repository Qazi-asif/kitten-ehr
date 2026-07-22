import { Router } from 'express';
import {
  getMessages,
  getStaffMembers,
  postMessage,
} from '../controllers/staffChatController.js';
import { requirePermission } from '../middleware/authMiddleware.js';

const router = Router();

router.get('/messages', requirePermission('chat.view'), getMessages);
router.post('/messages', requirePermission('chat.view'), postMessage);
router.get('/staff', requirePermission('chat.view'), getStaffMembers);

export default router;
