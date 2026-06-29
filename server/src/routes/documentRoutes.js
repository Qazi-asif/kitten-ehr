import { Router } from 'express';
import {
  deleteDocument,
  getDocumentsByKitten,
  uploadDocument,
} from '../controllers/documentController.js';
import { upload } from '../middleware/uploadMiddleware.js';

const router = Router({ mergeParams: true });

router.get('/', getDocumentsByKitten);
router.post('/', upload.single('file'), uploadDocument);
router.delete('/:id', deleteDocument);

export default router;
