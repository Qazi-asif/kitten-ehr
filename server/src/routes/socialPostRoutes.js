import { Router } from 'express';
import { createSocialPost, getSocialPosts } from '../controllers/socialPostController.js';
import { requirePermission } from '../middleware/authMiddleware.js';

const router = Router();

router.get('/', requirePermission('events.view'), getSocialPosts);
router.post('/', requirePermission('events.manage'), createSocialPost);

export default router;
