import { Router } from 'express';
import { createApplication } from '../controllers/applicationController.js';
import { createPublicDonation } from '../controllers/donationController.js';
import {
  getPublicContent,
  getPublicContentBySlug,
  getPublicEvents,
  getPublicKittenById,
  getPublicKittenPhotos,
  getPublicKittenUpdates,
  getPublicKittens,
  getPublicSettings,
  getPublicStats,
} from '../controllers/publicController.js';

const router = Router();

router.get('/kittens', getPublicKittens);
router.get('/kittens/:id/photos', getPublicKittenPhotos);
router.get('/kittens/:id/updates', getPublicKittenUpdates);
router.get('/kittens/:id', getPublicKittenById);
router.get('/stats', getPublicStats);
router.get('/settings', getPublicSettings);
router.get('/content', getPublicContent);
router.get('/content/:slug', getPublicContentBySlug);
router.get('/events', getPublicEvents);
router.post('/applications', createApplication);
router.post('/donations', createPublicDonation);

export default router;