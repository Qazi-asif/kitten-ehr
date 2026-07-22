import { Router } from 'express';
import {
  deleteDocument,
  getDocumentsByKitten,
  getPhotosByKitten,
  setPrimaryPhoto,
  streamDocumentFile,
  uploadDocument,
  uploadPhoto,
} from '../controllers/documentController.js';
import { upload } from '../middleware/uploadMiddleware.js';
import { requirePermission } from '../middleware/authMiddleware.js';

const router = Router({ mergeParams: true });

router.get('/photos', requirePermission('documents.view'), getPhotosByKitten);
router.post('/photos', requirePermission('documents.manage'), upload.single('file'), uploadPhoto);
router.patch('/:id/set-primary', requirePermission('documents.manage'), setPrimaryPhoto);
router.get('/:id/file', requirePermission('documents.view'), streamDocumentFile);
router.get('/', requirePermission('documents.view'), getDocumentsByKitten);
router.post('/', requirePermission('documents.manage'), upload.single('file'), uploadDocument);
router.delete('/:id', requirePermission('documents.manage'), deleteDocument);

export default router;
