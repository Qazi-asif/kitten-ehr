import { Router } from 'express';
import {
  createContractTemplate,
  deleteContractTemplate,
  getContractTemplateBySlug,
  listContractTemplates,
  resetContractTemplate,
  updateContractTemplate,
} from '../controllers/contractTemplateController.js';
import { requirePermission } from '../middleware/authMiddleware.js';

const router = Router();

router.get('/', requirePermission('contracts.view'), listContractTemplates);
router.post('/', requirePermission('contracts.manage'), createContractTemplate);
router.get('/:slug', requirePermission('contracts.view'), getContractTemplateBySlug);
router.put('/:slug', requirePermission('contracts.manage'), updateContractTemplate);
router.delete('/:slug', requirePermission('contracts.manage'), deleteContractTemplate);
router.post('/:slug/reset', requirePermission('contracts.manage'), resetContractTemplate);

export default router;
