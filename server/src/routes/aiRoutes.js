import { Router } from 'express';
import { generateCaption } from '../controllers/aiController.js';
import { requireAnyPermission } from '../middleware/authMiddleware.js';

const router = Router();

router.post(
  '/generate-caption',
  requireAnyPermission('content.manage', 'kittens.edit', 'events.manage'),
  generateCaption,
);

export default router;
