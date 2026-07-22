import { Router } from 'express';
import {
  createWishlist,
  deleteWishlist,
  getWishlists,
} from '../controllers/wishlistController.js';
import { requireAnyPermission } from '../middleware/authMiddleware.js';

const router = Router();

router.get(
  '/',
  requireAnyPermission('kittens.view', 'fosters.view', 'settings.manage'),
  getWishlists,
);
router.post(
  '/',
  requireAnyPermission('kittens.edit', 'fosters.manage', 'settings.manage'),
  createWishlist,
);
router.delete(
  '/:id',
  requireAnyPermission('kittens.edit', 'fosters.manage', 'settings.manage'),
  deleteWishlist,
);

export default router;
