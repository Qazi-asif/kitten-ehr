import { Router } from 'express';
import { getAllReminders, getDashboardMetrics } from '../controllers/dashboardController.js';
import { requirePermission } from '../middleware/authMiddleware.js';

const router = Router();

router.get('/metrics', requirePermission('dashboard.view'), getDashboardMetrics);
router.get('/reminders', requirePermission('dashboard.view'), getAllReminders);

export default router;
