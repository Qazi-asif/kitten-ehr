import { Router } from 'express';
import {
  createWishlist,
  deleteWishlist,
  deleteWishlistGroup,
  getWishlists,
  renameWishlistGroup,
} from '../controllers/wishlistController.js';
import { requireAnyPermission } from '../middleware/authMiddleware.js';

const router = Router();

const canView = requireAnyPermission('kittens.view', 'fosters.view', 'settings.manage');
const canEdit = requireAnyPermission('kittens.edit', 'fosters.manage', 'settings.manage');

router.get('/', canView, getWishlists);
router.post('/', canEdit, createWishlist);

// CR-109: named-list operations. Registered before '/:id' so "groups" is not
// parsed as a wishlist id.
router.patch('/groups/rename', canEdit, renameWishlistGroup);
router.delete('/groups', canEdit, deleteWishlistGroup);

router.delete('/:id', canEdit, deleteWishlist);

export default router;
