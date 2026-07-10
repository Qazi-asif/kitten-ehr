import { Router } from 'express';
import {
  createContractTemplate,
  deleteContractTemplate,
  getContractTemplateBySlug,
  listContractTemplates,
  resetContractTemplate,
  updateContractTemplate,
} from '../controllers/contractTemplateController.js';

const router = Router();

router.get('/', listContractTemplates);
router.post('/', createContractTemplate);
router.get('/:slug', getContractTemplateBySlug);
router.put('/:slug', updateContractTemplate);
router.delete('/:slug', deleteContractTemplate);
router.post('/:slug/reset', resetContractTemplate);

export default router;
