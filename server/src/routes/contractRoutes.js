import { Router } from 'express';
import {
  createContractDraft,
  getContractById,
  getContracts,
  markContractSigned,
} from '../controllers/contractController.js';

const router = Router();

router.get('/', getContracts);
router.get('/:id', getContractById);
router.post('/', createContractDraft);
router.post('/:id/sign', markContractSigned);

export default router;
