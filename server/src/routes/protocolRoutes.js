import { Router } from 'express';
import {
  activateProtocol,
  deleteActiveProtocol,
  getKittenActiveProtocols,
  getKittenProtocolDoses,
  markProtocolDoseGiven,
  updateActiveProtocol,
} from '../controllers/protocolController.js';
import { requirePermission } from '../middleware/authMiddleware.js';

const router = Router({ mergeParams: true });

router.get('/', requirePermission('medical.view'), getKittenActiveProtocols);
router.get('/doses', requirePermission('medical.view'), getKittenProtocolDoses);
router.patch('/doses/:doseId', requirePermission('medical.manage'), markProtocolDoseGiven);
router.post('/activate', requirePermission('medical.manage'), activateProtocol);
router.patch('/:activeId', requirePermission('medical.manage'), updateActiveProtocol);
router.delete('/:activeId', requirePermission('medical.manage'), deleteActiveProtocol);

export default router;
