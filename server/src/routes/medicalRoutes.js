import { Router } from 'express';
import {
  createMedicalRecord,
  createMedication,
  createVetAppointment,
  createVaccine,
  deleteMedication,
  deleteVaccine,
  deleteVetAppointment,
  getMedicalByKittenId,
  updateMedication,
  updateVaccine,
  updateVetAppointment,
} from '../controllers/medicalController.js';
import { requirePermission } from '../middleware/authMiddleware.js';

const router = Router();

router.get('/kitten/:kittenId', requirePermission('medical.view'), getMedicalByKittenId);
router.post('/vaccines', requirePermission('medical.manage'), createVaccine);
router.patch('/vaccines/:id', requirePermission('medical.manage'), updateVaccine);
router.delete('/vaccines/:id', requirePermission('medical.manage'), deleteVaccine);
router.post('/medications', requirePermission('medical.manage'), createMedication);
router.patch('/medications/:id', requirePermission('medical.manage'), updateMedication);
router.delete('/medications/:id', requirePermission('medical.manage'), deleteMedication);
router.post('/vet-appointments', requirePermission('medical.manage'), createVetAppointment);
router.patch('/vet-appointments/:id', requirePermission('medical.manage'), updateVetAppointment);
router.delete('/vet-appointments/:id', requirePermission('medical.manage'), deleteVetAppointment);
router.post('/', requirePermission('medical.manage'), createMedicalRecord);

export default router;
