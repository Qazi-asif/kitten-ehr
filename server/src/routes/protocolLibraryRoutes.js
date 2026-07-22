import { Router } from 'express';
import {
  createProtocol,
  deactivateProtocol,
  getAllProtocols,
  updateProtocol,
} from '../controllers/protocolController.js';
import { requirePermission } from '../middleware/authMiddleware.js';

const router = Router();

router.get('/', requirePermission('medical.view'), getAllProtocols);
router.post('/', requirePermission('medical.manage'), createProtocol);
router.patch('/:id', requirePermission('medical.manage'), updateProtocol);
router.delete('/:id', requirePermission('medical.manage'), deactivateProtocol);

export default router;
