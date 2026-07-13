import { Router } from 'express';
import {
  getSettings,
  testEmailSettings,
  testSocialSettings,
  updateSettings,
} from '../controllers/settingsController.js';
import { requireAuth, requirePermission } from '../middleware/authMiddleware.js';

const router = Router();

router.get('/', requireAuth, getSettings);
router.patch('/', requireAuth, requirePermission('settings.manage'), updateSettings);
router.post('/social/test', requireAuth, requirePermission('settings.manage'), testSocialSettings);
router.post('/email/test', requireAuth, requirePermission('settings.manage'), testEmailSettings);

export default router;
