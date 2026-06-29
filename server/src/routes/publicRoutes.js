import { Router } from 'express';
import { createApplication } from '../controllers/applicationController.js';
import {
  getPublicContent,
  getPublicContentBySlug,
  getPublicEvents,
  getPublicKittenById,
  getPublicKittens,
  getPublicStats,
} from '../controllers/publicController.js';

const router = Router();

router.get('/kittens', getPublicKittens);
router.get('/kittens/:id', getPublicKittenById);
router.get('/stats', getPublicStats);
router.get('/content', getPublicContent);
router.get('/content/:slug', getPublicContentBySlug);
router.get('/events', getPublicEvents);
router.post('/applications', createApplication);

export default router;