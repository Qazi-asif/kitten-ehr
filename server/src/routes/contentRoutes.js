import { Router } from 'express';
import {
  createContent,
  deleteContent,
  getAllContent,
  getContentById,
  updateContent,
} from '../controllers/contentController.js';

const router = Router();

router.get('/', getAllContent);
router.get('/:id', getContentById);
router.post('/', createContent);
router.put('/:id', updateContent);
router.delete('/:id', deleteContent);

export default router;
