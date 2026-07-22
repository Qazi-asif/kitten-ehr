import { Router } from 'express';
import {
  createMedicalRecord,
  createMedication,
  createVetAppointment,
  createVaccine,
  getMedicalByKittenId,
} from '../controllers/medicalController.js';
import { requirePermission } from '../middleware/authMiddleware.js';

const router = Router();

router.get('/kitten/:kittenId', requirePermission('medical.view'), getMedicalByKittenId);
router.post('/vaccines', requirePermission('medical.manage'), createVaccine);
router.post('/medications', requirePermission('medical.manage'), createMedication);
router.post('/vet-appointments', requirePermission('medical.manage'), createVetAppointment);
router.post('/', requirePermission('medical.manage'), createMedicalRecord);

export default router;
