import { Router } from 'express';
import {
  createWishlist,
  deleteWishlist,
  getWishlists,
} from '../controllers/wishlistController.js';

const router = Router();

router.get('/', getWishlists);
router.post('/', createWishlist);
router.delete('/:id', deleteWishlist);

export default router;
