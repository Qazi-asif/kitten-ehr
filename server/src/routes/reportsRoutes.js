import { Router } from 'express';
import {
  exportKittensCsv,
  getReportsCatalog,
  getReportsSummary,
  runReportHandler,
} from '../controllers/reportsController.js';
import { requirePermission } from '../middleware/authMiddleware.js';

const router = Router();

router.get('/summary', requirePermission('reports.view'), getReportsSummary);
router.get('/catalog', requirePermission('reports.view'), getReportsCatalog);
router.get('/kittens.csv', requirePermission('reports.view'), exportKittensCsv);
// Keep last: `:reportKey` would otherwise swallow the static paths above.
router.get('/run/:reportKey', requirePermission('reports.view'), runReportHandler);

export default router;
