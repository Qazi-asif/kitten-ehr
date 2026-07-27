import { Router } from 'express';
import {
  createWeightLog,
  deleteWeightLog,
  getWeightsByKittenId,
  updateWeightLog,
} from '../controllers/weightController.js';
import { requirePermission } from '../middleware/authMiddleware.js';

const router = Router();

router.get('/kitten/:kittenId', requirePermission('medical.view'), getWeightsByKittenId);
router.post('/', requirePermission('medical.manage'), createWeightLog);
router.patch('/:id', requirePermission('medical.manage'), updateWeightLog);
router.delete('/:id', requirePermission('medical.manage'), deleteWeightLog);

export default router;
