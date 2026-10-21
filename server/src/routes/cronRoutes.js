import { Router } from 'express';
import {
  runSocialPostScheduler,
  runSyndicationOutbox,
  runSyndicationReconcile,
} from '../controllers/cronController.js';
import { requireCronSecret } from '../middleware/cronAuth.js';

const router = Router();

router.all('/social-posts', requireCronSecret, runSocialPostScheduler);
router.all('/syndication-outbox', requireCronSecret, runSyndicationOutbox);
router.all('/syndication-reconcile', requireCronSecret, runSyndicationReconcile);

export default router;
