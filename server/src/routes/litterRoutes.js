import { Router } from 'express';
import {
  createLitter,
  getAllLitters,
  getLitterById,
} from '../controllers/litterController.js';

const router = Router();

/**
 * @swagger
 * /api/litters:
 *   get:
 *     summary: Get all litters
 *     description: Returns a list of all kitten litters
 *     tags:
 *       - Litters
 *     responses:
 *       200:
 *         description: A list of litters
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
 *                     example: Spring Alley Litter
 *                   intakeDate:
 *                     type: string
 *                     example: 2026-03-15
 *                   source:
 *                     type: string
 *                     example: Shelter transfer
 *                   kittenCount:
 *                     type: integer
 *                     example: 4
 *                   status:
 *                     type: string
 *                     example: Active
 *                   notes:
 *                     type: string
 *                     example: Needs bottle feeding
 */
router.get('/', getAllLitters);

/**
 * @swagger
 * /api/litters:
 *   post:
 *     summary: Create a new litter
 *     description: Adds a new kitten litter to the system
 *     tags:
 *       - Litters
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - intakeDate
 *               - source
 *             properties:
 *               name:
 *                 type: string
 *                 example: Spring Alley Litter
 *               intakeDate:
 *                 type: string
 *                 example: 2026-03-15
 *               source:
 *                 type: string
 *                 example: Shelter transfer
 *               kittenCount:
 *                 type: integer
 *                 example: 4
 *               status:
 *                 type: string
 *                 example: Active
 *               notes:
 *                 type: string
 *                 example: Needs bottle feeding
 *     responses:
 *       201:
 *         description: Litter created successfully
 *       400:
 *         description: Missing required fields
 */
router.post('/', createLitter);

/**
 * @swagger
 * /api/litters/{id}:
 *   get:
 *     summary: Get a litter by ID
 *     description: Returns a single litter by its ID
 *     tags:
 *       - Litters
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         example: 1
 *     responses:
 *       200:
 *         description: Litter found
 *       404:
 *         description: Litter not found
 */
router.get('/:id', getLitterById);

export default router;
