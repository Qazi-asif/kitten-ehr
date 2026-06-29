import { Router } from 'express';
import {
  createSponsorship,
  getSponsorshipsByKittenId,
} from '../controllers/sponsorshipController.js';

const router = Router({ mergeParams: true });

router.get('/', getSponsorshipsByKittenId);
router.post('/', createSponsorship);

export default router;
