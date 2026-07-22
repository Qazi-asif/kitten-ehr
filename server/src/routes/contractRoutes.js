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
import { requirePermission } from '../middleware/authMiddleware.js';

const router = Router();

router.get('/stats', requirePermission('contracts.view'), getContractStats);
router.get('/', requirePermission('contracts.view'), getContracts);
router.get('/:id', requirePermission('contracts.view'), getContractById);
router.post('/', requirePermission('contracts.manage'), createContractDraft);
router.patch('/:id', requirePermission('contracts.manage'), updateContract);
router.delete('/:id', requirePermission('contracts.manage'), deleteContract);
router.post('/:id/email', requirePermission('contracts.manage'), emailContractAgreement);
router.post('/:id/email-pdf', requirePermission('contracts.manage'), emailSignedContractPdf);
router.post('/:id/sign', requirePermission('contracts.manage'), markContractSigned);

export default router;
