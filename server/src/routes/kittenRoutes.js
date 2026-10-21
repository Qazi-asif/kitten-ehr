import { Router } from 'express';
import {
  getAllKittens,
  createKitten,
  getKittenById,
  getDashboardStats,
  updateKitten,
  deleteKitten,
} from '../controllers/kittenController.js';
import { getKittenPlacements } from '../controllers/placementController.js';
import {
  createKittenWishlist,
  getKittenWishlists,
} from '../controllers/wishlistController.js';
import { getSpreadsheet, patchSpreadsheetCell } from '../controllers/kittenSpreadsheetController.js';
import { requirePermission } from '../middleware/authMiddleware.js';
import { requireAccessibleKitten } from '../middleware/kittenAccess.js';

const router = Router();

/**
 * @swagger
 * /api/kittens:
 *   get:
 *     summary: Get all kittens
 *     description: Returns a list of all kittens in the foster system
 *     tags:
 *       - Kittens
 *     responses:
 *       200:
 *         description: A list of kittens
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                     example: 1
 *                   name:
 *                     type: string
 *                     example: Biscuit
 *                   status:
 *                     type: string
 *                     example: In Foster Care
 *                   age:
 *                     type: string
 *                     example: 8 weeks
 *                   breed:
 *                     type: string
 *                     example: Domestic Shorthair
 *                   litterId:
 *                     type: integer
 *                     nullable: true
 *                     example: 1
 *                   litter:
 *                     type: object
 *                     nullable: true
 *                     properties:
 *                       id:
 *                         type: integer
 *                       name:
 *                         type: string
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Failed to fetch kittens
 */
router.get('/', requirePermission('kittens.view'), getAllKittens);
router.post('/', requirePermission('kittens.create'), createKitten);
router.get('/dashboard/stats', requirePermission('dashboard.view'), getDashboardStats);
router.get('/spreadsheet', requirePermission('kittens.view'), getSpreadsheet);
router.patch('/spreadsheet', requirePermission('kittens.edit'), patchSpreadsheetCell);
router.get('/:id/placements', requirePermission('kittens.view'), requireAccessibleKitten, getKittenPlacements);
router.get('/:id/wishlists', requirePermission('kittens.view'), requireAccessibleKitten, getKittenWishlists);
router.post('/:id/wishlists', requirePermission('kittens.edit'), requireAccessibleKitten, createKittenWishlist);
router.get('/:id', requirePermission('kittens.view'), requireAccessibleKitten, getKittenById);
router.patch('/:id', requirePermission('kittens.edit'), requireAccessibleKitten, updateKitten);
router.delete('/:id', requirePermission('kittens.delete'), requireAccessibleKitten, deleteKitten);

export default router;
