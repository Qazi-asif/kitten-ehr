import { Router } from 'express';
import {
  getMyKittenDocuments,
  getMyPlacements,
  getMyProfile,
  updateMyProfile,
  uploadMyKittenDocument,
} from '../controllers/portalDataController.js';
import { upload } from '../middleware/uploadMiddleware.js';

// Foster Portal data routes. Mounted behind requirePortalAuth in app.js, so
// every handler here can trust req.user.fosterId is present and belongs to
// a real, active portal account. Every handler added must filter exclusively
// by req.user.fosterId, never a client-supplied foster/placement/kitten id,
// per the approved data-scoping plan - see portalDataController.js for how
// each handler enforces this.
const router = Router();

router.get('/me', getMyProfile);
router.patch('/me', updateMyProfile);
router.get('/placements', getMyPlacements);
router.get('/kittens/:kittenId/documents', getMyKittenDocuments);
router.post('/kittens/:kittenId/documents', upload.single('file'), uploadMyKittenDocument);

export default router;
