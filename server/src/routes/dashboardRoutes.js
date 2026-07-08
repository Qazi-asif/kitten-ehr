import { Router } from 'express';
import { getDashboardMetrics } from '../controllers/dashboardController.js';
import { requirePermission } from '../middleware/authMiddleware.js';

const router = Router();

router.get('/metrics', requirePermission('dashboard.view'), getDashboardMetrics);

export default router;
