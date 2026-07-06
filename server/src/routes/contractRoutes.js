import { Router } from 'express';
import {
  createContractDraft,
  deleteContract,
  getContractById,
  getContracts,
  getContractStats,
  markContractSigned,
  updateContract,
} from '../controllers/contractController.js';

const router = Router();

router.get('/stats', getContractStats);
router.get('/', getContracts);
router.get('/:id', getContractById);
router.post('/', createContractDraft);
router.patch('/:id', updateContract);
router.delete('/:id', deleteContract);
router.post('/:id/sign', markContractSigned);

export default router;
