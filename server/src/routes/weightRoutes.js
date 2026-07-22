import { Router } from 'express';
import {
  createWeightLog,
  getWeightsByKittenId,
} from '../controllers/weightController.js';
import { requirePermission } from '../middleware/authMiddleware.js';

const router = Router();

router.get('/kitten/:kittenId', requirePermission('medical.view'), getWeightsByKittenId);
router.post('/', requirePermission('medical.manage'), createWeightLog);

export default router;
