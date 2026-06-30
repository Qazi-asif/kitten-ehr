import { Router } from 'express';
import {
  createTransaction,
  deleteTransaction,
  getAllTransactions,
  getDashboardFinanceStats,
} from '../controllers/financeController.js';

const router = Router();

router.get('/stats', getDashboardFinanceStats);
router.get('/', getAllTransactions);
router.post('/', createTransaction);
router.delete('/:id', deleteTransaction);

export default router;
