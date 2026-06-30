import { Router } from 'express';
import { getSettings, updateSettings } from '../controllers/settingsController.js';
import { requireAuth, requirePermission } from '../middleware/authMiddleware.js';

const router = Router();

router.get('/', requireAuth, getSettings);
router.patch('/', requireAuth, requirePermission('settings.manage'), updateSettings);

export default router;
