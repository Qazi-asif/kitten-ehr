import { Router } from 'express';
import {
  createMedicalRecord,
  createMedication,
  createVetAppointment,
  createVaccine,
  getMedicalByKittenId,
} from '../controllers/medicalController.js';

const router = Router();

/**
 * @swagger
 * /api/medical/kitten/{kittenId}:
 *   get:
 *     summary: Get medical records for a kitten
 *     tags:
 *       - Medical
 *     parameters:
 *       - in: path
 *         name: kittenId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: List of medical records
 *       404:
 *         description: Kitten not found
 */
router.get('/kitten/:kittenId', getMedicalByKittenId);
router.post('/vaccines', createVaccine);
router.post('/medications', createMedication);
router.post('/vet-appointments', createVetAppointment);
router.post('/', createMedicalRecord);

export default router;
