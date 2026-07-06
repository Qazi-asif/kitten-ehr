import { Router } from 'express';
import {
  createOnboarding,
  getOnboardingById,
  getOnboardingList,
  updateChecklistItem,
} from '../controllers/onboardingController.js';

const router = Router();

router.get('/', getOnboardingList);
router.get('/:id', getOnboardingById);
router.post('/', createOnboarding);
router.patch('/:onboardingId/checklist/:itemId', updateChecklistItem);

export default router;
