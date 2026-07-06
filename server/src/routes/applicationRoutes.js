import { Router } from 'express';
import {
  createApplication,
  getApplications,
  updateApplicationStatus,
} from '../controllers/applicationController.js';
import { upload } from '../middleware/uploadMiddleware.js';

const router = Router();

router.get('/', getApplications);
router.post('/', upload.array('photos', 3), createApplication);
router.patch('/:id', updateApplicationStatus);

export default router;
