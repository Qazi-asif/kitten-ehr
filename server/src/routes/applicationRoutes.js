import { Router } from 'express';
import {
  createApplication,
  deleteApplicationDocument,
  getApplicationById,
  getApplications,
  updateApplicationStatus,
  uploadApplicationDocument,
} from '../controllers/applicationController.js';
import { upload } from '../middleware/uploadMiddleware.js';

const router = Router();

router.get('/', getApplications);
router.get('/:id', getApplicationById);
router.post('/', upload.array('photos', 3), createApplication);
router.post('/:id/documents', upload.single('file'), uploadApplicationDocument);
router.delete('/:id/documents/:uploadId', deleteApplicationDocument);
router.patch('/:id', updateApplicationStatus);

export default router;
