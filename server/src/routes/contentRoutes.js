import { Router } from 'express';
import {
  createContent,
  deleteContent,
  getAllContent,
  getContentById,
  getFosterChecklistContent,
  markContentComplete,
  updateContent,
} from '../controllers/contentController.js';
import { requirePermission } from '../middleware/authMiddleware.js';

const router = Router();

router.get('/', requirePermission('content.view'), getAllContent);
router.get('/foster-checklist', requirePermission('content.view'), getFosterChecklistContent);
router.get('/:id', requirePermission('content.view'), getContentById);
router.post('/', requirePermission('content.manage'), createContent);
router.post('/:id/complete', requirePermission('content.manage'), markContentComplete);
router.put('/:id', requirePermission('content.manage'), updateContent);
router.delete('/:id', requirePermission('content.manage'), deleteContent);

export default router;
