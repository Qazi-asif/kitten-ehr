import { Router } from 'express';
import {
  activateProtocol,
  getKittenActiveProtocols,
  getKittenProtocolDoses,
  markProtocolDoseGiven,
} from '../controllers/protocolController.js';
import { requirePermission } from '../middleware/authMiddleware.js';

const router = Router({ mergeParams: true });

router.get('/', requirePermission('medical.view'), getKittenActiveProtocols);
router.get('/doses', requirePermission('medical.view'), getKittenProtocolDoses);
router.patch('/doses/:doseId', requirePermission('medical.manage'), markProtocolDoseGiven);
router.post('/activate', requirePermission('medical.manage'), activateProtocol);

export default router;
