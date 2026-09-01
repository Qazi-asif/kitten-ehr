import { Router } from 'express';
import {
  activateLitter,
  createLitter,
  deactivateLitter,
  deleteLitter,
  getAllLitters,
  getLitterById,
  updateLitter,
} from '../controllers/litterController.js';
import { requirePermission } from '../middleware/authMiddleware.js';

const router = Router();

router.get('/', requirePermission('litters.view'), getAllLitters);
router.post('/', requirePermission('litters.manage'), createLitter);
router.patch('/:id', requirePermission('litters.manage'), updateLitter);
router.post('/:id/deactivate', requirePermission('litters.manage'), deactivateLitter);
router.post('/:id/activate', requirePermission('litters.manage'), activateLitter);
router.delete('/:id', requirePermission('litters.manage'), deleteLitter);
router.get('/:id', requirePermission('litters.view'), getLitterById);

export default router;
