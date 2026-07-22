import { Router } from 'express';
import {
  getSettings,
  testEmailSettings,
  testSocialSettings,
  updateSettings,
} from '../controllers/settingsController.js';
import { requireAuth, requireAnyPermission, requirePermission } from '../middleware/authMiddleware.js';

const router = Router();

// Organization secrets stay redacted; users.view/roles.manage can open Settings
// for account tabs without needing full settings.manage.
router.get(
  '/',
  requireAuth,
  requireAnyPermission('settings.manage', 'users.view', 'roles.manage'),
  getSettings,
);
router.patch('/', requireAuth, requirePermission('settings.manage'), updateSettings);
router.post('/social/test', requireAuth, requirePermission('settings.manage'), testSocialSettings);
router.post('/email/test', requireAuth, requirePermission('settings.manage'), testEmailSettings);

export default router;
