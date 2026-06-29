import { Router } from 'express';
import {
  createApplication,
  getApplications,
  updateApplicationStatus,
} from '../controllers/applicationController.js';

const router = Router();

router.get('/', getApplications);
router.post('/', createApplication);
router.patch('/:id', updateApplicationStatus);

export default router;
