import { Router } from 'express';
import { getAllFosters, createFoster, getFosterById } from '../controllers/fosterController.js';

const router = Router();

/**
 * @swagger
 * /api/fosters:
 *   get:
 *     summary: Get all fosters
 *     description: Returns a list of all foster homes
 *     tags:
 *       - Fosters
 *     responses:
 *       200:
 *         description: A list of fosters
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
 *                     example: Jane Smith
 *                   phone:
 *                     type: string
 *                     example: 555-0100
 *                   email:
 *                     type: string
 *                     example: jane@example.com
 *                   address:
 *                     type: string
 *                     example: 123 Main St
 *                   capabilityFlags:
 *                     type: string
 *                     example: bottle,big_cats
 *                   notes:
 *                     type: string
 *                     example: Has a spare room for kittens
 */
router.get('/', getAllFosters);

/**
 * @swagger
 * /api/fosters:
 *   post:
 *     summary: Create a new foster
 *     description: Adds a new foster home to the system
 *     tags:
 *       - Fosters
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - phone
 *               - email
 *               - address
 *             properties:
 *               name:
 *                 type: string
 *                 example: Jane Smith
 *               phone:
 *                 type: string
 *                 example: 555-0100
 *               email:
 *                 type: string
 *                 example: jane@example.com
 *               address:
 *                 type: string
 *                 example: 123 Main St
 *               capabilityFlags:
 *                 type: string
 *                 example: bottle,big_cats
 *               notes:
 *                 type: string
 *                 example: Has a spare room for kittens
 *     responses:
 *       201:
 *         description: Foster created successfully
 *       400:
 *         description: Missing required fields
 */
router.post('/', createFoster);

/**
 * @swagger
 * /api/fosters/{id}:
 *   get:
 *     summary: Get a foster by ID
 *     description: Returns a foster home with linked kittens
 *     tags:
 *       - Fosters
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Foster found
 *       404:
 *         description: Foster not found
 */
router.get('/:id', getFosterById);

export default router;
