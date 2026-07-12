import { Router } from 'express';
import { createApplication } from '../controllers/applicationController.js';
import { upload } from '../middleware/uploadMiddleware.js';
import { createPublicDonation } from '../controllers/donationController.js';
import {
  getPublicContent,
  getPublicContentBySlug,
  getPublicEvents,
  getPublicKittenById,
  getPublicKittenPhoto,
  getPublicKittenPhotos,
  getPublicKittenUpdates,
  getPublicKittens,
  getPublicSettings,
  getPublicStats,
  submitContactForm,
} from '../controllers/publicController.js';
import { getPublicEventBySlug, rsvpForEvent } from '../controllers/eventController.js';
import { getPublicWishlists, getPublicFosterWishlists, getPublicKittenWishlists } from '../controllers/wishlistController.js';

const router = Router();

router.use((req, res, next) => {
  if (req.method === 'GET') {
    res.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
  }
  next();
});

router.get('/wishlists', getPublicWishlists);
router.get('/kittens', getPublicKittens);
router.get('/kittens/:id/wishlists', getPublicKittenWishlists);
router.get('/kittens/:id/photos', getPublicKittenPhotos);
router.get('/kittens/:id/photo', getPublicKittenPhoto);
router.get('/kittens/:id/updates', getPublicKittenUpdates);
router.get('/kittens/:id', getPublicKittenById);
router.get('/stats', getPublicStats);
router.get('/settings', getPublicSettings);
router.get('/content', getPublicContent);
router.get('/content/:slug', getPublicContentBySlug);
router.get('/events', getPublicEvents);
router.get('/events/:slug', getPublicEventBySlug);
router.post('/events/:slug/rsvp', rsvpForEvent);
router.post('/applications', upload.array('photos', 3), createApplication);
router.post('/donations', createPublicDonation);
router.post('/contact', submitContactForm);

export default router;