import { Router } from 'express';
import {
  getAllFosters,
  createFoster,
  getFosterById,
  resendPortalSetupLink,
  provisionFosterFromApplication,
} from '../controllers/fosterController.js';
import {
  createFosterPlacement,
  dischargePlacement,
  getFosterPlacements,
} from '../controllers/placementController.js';
import {
  createFosterWishlist,
  getFosterWishlists,
} from '../controllers/wishlistController.js';
import { requirePermission } from '../middleware/authMiddleware.js';

const router = Router();

router.get('/', requirePermission('fosters.view'), getAllFosters);
router.post('/', requirePermission('fosters.manage'), createFoster);
router.post(
  '/from-application/:applicationId',
  requirePermission('fosters.manage'),
  provisionFosterFromApplication,
);
router.get('/:id/placements', requirePermission('fosters.view'), getFosterPlacements);
router.post('/:id/placements', requirePermission('fosters.manage'), createFosterPlacement);
router.post('/:id/placements/:placementId/discharge', requirePermission('fosters.manage'), dischargePlacement);
router.get('/:id/wishlists', requirePermission('fosters.view'), getFosterWishlists);
router.post('/:id/wishlists', requirePermission('fosters.manage'), createFosterWishlist);
router.get('/:id', requirePermission('fosters.view'), getFosterById);
router.post(
  '/:id/portal-account/resend-setup',
  requirePermission('fosters.manage'),
  resendPortalSetupLink,
);

export default router;
