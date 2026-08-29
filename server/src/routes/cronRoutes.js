import { Router } from 'express';
import { runSocialPostScheduler } from '../controllers/cronController.js';
import { requireCronSecret } from '../middleware/cronAuth.js';

const router = Router();

router.all('/social-posts', requireCronSecret, runSocialPostScheduler);

export default router;
