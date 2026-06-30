import { Router } from 'express';
import { getAllFosters, createFoster, getFosterById } from '../controllers/fosterController.js';
import { createFosterPlacement, getFosterPlacements } from '../controllers/placementController.js';

const router = Router();

router.get('/', getAllFosters);
router.post('/', createFoster);
router.get('/:id/placements', getFosterPlacements);
router.post('/:id/placements', createFosterPlacement);
router.get('/:id', getFosterById);

export default router;
