import { Router } from 'express';
import { createProtocol, getAllProtocols } from '../controllers/protocolController.js';
import { requirePermission } from '../middleware/authMiddleware.js';

const router = Router();

router.get('/', requirePermission('medical.view'), getAllProtocols);
router.post('/', requirePermission('medical.manage'), createProtocol);

export default router;
