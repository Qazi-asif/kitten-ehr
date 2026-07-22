import { Router } from 'express';
import {
  createSocialPost,
  deleteSocialPost,
  getSocialPosts,
  publishSocialPost,
  updateSocialPost,
} from '../controllers/socialPostController.js';
import { requirePermission } from '../middleware/authMiddleware.js';

const router = Router();

router.get('/', requirePermission('events.view'), getSocialPosts);
router.post('/', requirePermission('events.manage'), createSocialPost);
router.patch('/:id', requirePermission('events.manage'), updateSocialPost);
router.post('/:id/publish', requirePermission('events.manage'), publishSocialPost);
router.delete('/:id', requirePermission('events.manage'), deleteSocialPost);

export default router;
