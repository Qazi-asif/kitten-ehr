import { Router } from 'express';
import { getAllFosters, createFoster, getFosterById } from '../controllers/fosterController.js';
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

router.get('/', getAllFosters);
router.post('/', createFoster);
router.get('/:id/placements', getFosterPlacements);
router.post('/:id/placements', createFosterPlacement);
router.post('/:id/placements/:placementId/discharge', requirePermission('fosters.manage'), dischargePlacement);
router.get('/:id/wishlists', requirePermission('fosters.view'), getFosterWishlists);
router.post('/:id/wishlists', requirePermission('fosters.manage'), createFosterWishlist);
router.get('/:id', getFosterById);

export default router;
