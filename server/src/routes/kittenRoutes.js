import { Router } from 'express';
import { getAllKittens, createKitten, getKittenById, getDashboardStats, updateKitten } from '../controllers/kittenController.js';

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
router.get('/', getAllKittens);

/**
 * @swagger
 * /api/kittens:
 *   post:
 *     summary: Create a new kitten
 *     description: Adds a new kitten to the foster system
 *     tags:
 *       - Kittens
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - status
 *               - age
 *               - breed
 *             properties:
 *               name:
 *                 type: string
 *                 example: Nugget
 *               status:
 *                 type: string
 *                 example: In Foster Care
 *               age:
 *                 type: string
 *                 example: 10 weeks
 *               breed:
 *                 type: string
 *                 example: Domestic Shorthair
 *               litterId:
 *                 type: integer
 *                 example: 1
 *                 description: Optional litter to assign this kitten to
 *               fosterId:
 *                 type: integer
 *                 example: 1
 *                 description: Optional foster home to assign this kitten to
 *     responses:
 *       201:
 *         description: Kitten created successfully
 *       400:
 *         description: Missing required fields or litter not found
 */
router.post('/', createKitten);

/**
 * @swagger
 * /api/kittens/dashboard/stats:
 *   get:
 *     summary: Get dashboard statistics
 *     description: Returns kitten and foster counts for the admin dashboard
 *     tags:
 *       - Kittens
 *     responses:
 *       200:
 *         description: Dashboard stats
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 activeKittens:
 *                   type: integer
 *                   example: 127
 *                 availableForAdoption:
 *                   type: integer
 *                   example: 43
 *                 pendingAdoptions:
 *                   type: integer
 *                   example: 12
 *                 activeFosters:
 *                   type: integer
 *                   example: 38
 */
router.get('/dashboard/stats', getDashboardStats);

/**
 * @swagger
 * /api/kittens/{id}:
 *   get:
 *     summary: Get a kitten by ID
 *     description: Returns a single kitten by its ID
 *     tags:
 *       - Kittens
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         example: 1
 *     responses:
 *       200:
 *         description: Kitten found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                   example: 1
 *                 name:
 *                   type: string
 *                   example: Biscuit
 *                 status:
 *                   type: string
 *                   example: In Foster Care
 *                 age:
 *                   type: string
 *                   example: 8 weeks
 *                 breed:
 *                   type: string
 *                   example: Domestic Shorthair
 *       404:
 *         description: Kitten not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Kitten not found
 */
router.get('/:id', getKittenById);

router.patch('/:id', updateKitten);

export default router;
