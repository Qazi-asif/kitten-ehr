import { Router } from 'express';
import {
  createOnboarding,
  getOnboardingById,
  getOnboardingList,
  updateChecklistItem,
} from '../controllers/onboardingController.js';
import { requirePermission } from '../middleware/authMiddleware.js';

const router = Router();

router.get('/', requirePermission('onboarding.view'), getOnboardingList);
router.get('/:id', requirePermission('onboarding.view'), getOnboardingById);
router.post('/', requirePermission('onboarding.manage'), createOnboarding);
router.patch('/:onboardingId/checklist/:itemId', requirePermission('onboarding.manage'), updateChecklistItem);

export default router;
