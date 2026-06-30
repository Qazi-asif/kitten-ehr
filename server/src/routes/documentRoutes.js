import { Router } from 'express';
import {
  deleteDocument,
  getDocumentsByKitten,
  getPhotosByKitten,
  setPrimaryPhoto,
  uploadDocument,
  uploadPhoto,
} from '../controllers/documentController.js';
import { upload } from '../middleware/uploadMiddleware.js';

const router = Router({ mergeParams: true });

router.get('/photos', getPhotosByKitten);
router.post('/photos', uploadPhoto);
router.patch('/:id/set-primary', setPrimaryPhoto);
router.get('/', getDocumentsByKitten);
router.post('/', upload.single('file'), uploadDocument);
router.delete('/:id', deleteDocument);

export default router;
