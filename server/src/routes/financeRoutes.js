import { Router } from 'express';
import {
  createTransaction,
  deleteTransaction,
  getAllTransactions,
  getDashboardFinanceStats,
} from '../controllers/financeController.js';
import { requirePermission } from '../middleware/authMiddleware.js';

const router = Router();

router.get('/stats', requirePermission('donations.view'), getDashboardFinanceStats);
router.get('/', requirePermission('donations.view'), getAllTransactions);
router.post('/', requirePermission('donations.manage'), createTransaction);
router.delete('/:id', requirePermission('donations.manage'), deleteTransaction);

export default router;
