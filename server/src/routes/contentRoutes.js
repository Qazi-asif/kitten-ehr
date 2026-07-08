import { Router } from 'express';
import {
  createContent,
  deleteContent,
  getAllContent,
  getContentById,
  getFosterChecklistContent,
  markContentComplete,
  updateContent,
} from '../controllers/contentController.js';

const router = Router();

router.get('/', getAllContent);
router.get('/foster-checklist', getFosterChecklistContent);
router.get('/:id', getContentById);
router.post('/', createContent);
router.post('/:id/complete', markContentComplete);
router.put('/:id', updateContent);
router.delete('/:id', deleteContent);

export default router;
