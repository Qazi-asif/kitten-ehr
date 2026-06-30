import { Router } from 'express';
import {
  createUpdate,
  deleteUpdate,
  getUpdatesByKitten,
  updateUpdate,
} from '../controllers/updateController.js';

const router = Router({ mergeParams: true });

router.get('/', getUpdatesByKitten);
router.post('/', createUpdate);
router.patch('/:updateId', updateUpdate);
router.delete('/:updateId', deleteUpdate);

export default router;
