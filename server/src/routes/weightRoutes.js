import { Router } from 'express';
import {
  createWeightLog,
  getWeightsByKittenId,
} from '../controllers/weightController.js';

const router = Router();

/**
 * @swagger
 * /api/weights/kitten/{kittenId}:
 *   get:
 *     summary: Get weight logs for a kitten
 *     tags:
 *       - Weight
 *     parameters:
 *       - in: path
 *         name: kittenId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: List of weight logs
 *       404:
 *         description: Kitten not found
 */
router.get('/kitten/:kittenId', getWeightsByKittenId);

/**
 * @swagger
 * /api/weights:
 *   post:
 *     summary: Create a weight log entry
 *     tags:
 *       - Weight
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - kittenId
 *               - weight
 *               - date
 *             properties:
 *               kittenId:
 *                 type: integer
 *               weight:
 *                 type: number
 *                 example: 450
 *               date:
 *                 type: string
 *                 example: 2026-03-01
 *               notes:
 *                 type: string
 *     responses:
 *       201:
 *         description: Weight log created
 *       400:
 *         description: Invalid input
 *       404:
 *         description: Kitten not found
 */
router.post('/', createWeightLog);

export default router;
