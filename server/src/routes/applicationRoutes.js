import { Router } from 'express';
import {
  createApplication,
  deleteApplicationDocument,
  getApplicationById,
  getApplications,
  streamApplicationUploadFile,
  updateApplicationStatus,
  uploadApplicationDocument,
} from '../controllers/applicationController.js';
import { upload } from '../middleware/uploadMiddleware.js';
import { requirePermission } from '../middleware/authMiddleware.js';

const router = Router();

router.get('/', requirePermission('applications.view'), getApplications);
router.get('/:id', requirePermission('applications.view'), getApplicationById);
router.get(
  '/:id/documents/:uploadId/file',
  requirePermission('applications.view'),
  streamApplicationUploadFile,
);
router.post('/', requirePermission('applications.manage'), upload.array('photos', 3), createApplication);
router.post('/:id/documents', requirePermission('applications.manage'), upload.single('file'), uploadApplicationDocument);
router.delete('/:id/documents/:uploadId', requirePermission('applications.manage'), deleteApplicationDocument);
router.patch('/:id', requirePermission('applications.manage'), updateApplicationStatus);

export default router;
