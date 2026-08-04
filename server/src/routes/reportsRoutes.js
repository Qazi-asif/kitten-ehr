import { Router } from 'express';
import { exportKittensCsv, getReportsSummary } from '../controllers/reportsController.js';
import { requirePermission } from '../middleware/authMiddleware.js';

const router = Router();

router.get('/summary', requirePermission('reports.view'), getReportsSummary);
router.get('/kittens.csv', requirePermission('reports.view'), exportKittensCsv);

export default router;
