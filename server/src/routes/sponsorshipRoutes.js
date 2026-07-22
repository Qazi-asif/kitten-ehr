import { Router } from 'express';
import {
  createSponsorship,
  getSponsorshipsByKittenId,
} from '../controllers/sponsorshipController.js';
import { requirePermission } from '../middleware/authMiddleware.js';

const router = Router({ mergeParams: true });

router.get('/', requirePermission('sponsorships.view'), getSponsorshipsByKittenId);
router.post('/', requirePermission('sponsorships.manage'), createSponsorship);

export default router;
