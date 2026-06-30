import { Router } from 'express';
import {
  createSocialPost,
  createUpdate,
  deleteUpdate,
  getUpdatesByKitten,
  updateUpdate,
} from '../controllers/updateController.js';

const router = Router({ mergeParams: true });

router.get('/', getUpdatesByKitten);
router.post('/', createUpdate);
router.post('/social', createSocialPost);
router.patch('/:updateId', updateUpdate);
router.delete('/:updateId', deleteUpdate);

export default router;
