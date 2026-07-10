import { Router } from 'express';
import {
  createContractDraft,
  deleteContract,
  emailContractAgreement,
  emailSignedContractPdf,
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
router.post('/:id/email', emailContractAgreement);
router.post('/:id/email-pdf', emailSignedContractPdf);
router.post('/:id/sign', markContractSigned);

export default router;
