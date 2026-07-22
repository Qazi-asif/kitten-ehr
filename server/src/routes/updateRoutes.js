import { Router } from 'express';
import {
  createSocialPost,
  createUpdate,
  deleteUpdate,
  getUpdatesByKitten,
  updateUpdate,
} from '../controllers/updateController.js';
import { requirePermission } from '../middleware/authMiddleware.js';

const router = Router({ mergeParams: true });

router.get('/', requirePermission('kittens.view'), getUpdatesByKitten);
router.post('/', requirePermission('kittens.edit'), createUpdate);
router.post('/social', requirePermission('events.manage'), createSocialPost);
router.patch('/:updateId', requirePermission('kittens.edit'), updateUpdate);
router.delete('/:updateId', requirePermission('kittens.edit'), deleteUpdate);

export default router;
