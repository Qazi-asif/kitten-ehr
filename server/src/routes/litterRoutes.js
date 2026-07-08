import { Router } from 'express';
import {
  createLitter,
  getAllLitters,
  getLitterById,
} from '../controllers/litterController.js';
import { requirePermission } from '../middleware/authMiddleware.js';

const router = Router();

router.get('/', requirePermission('litters.view'), getAllLitters);
router.post('/', requirePermission('litters.manage'), createLitter);
router.get('/:id', requirePermission('litters.view'), getLitterById);

export default router;
