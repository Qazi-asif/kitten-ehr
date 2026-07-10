import { Router } from 'express';
import { handleGivebutterWebhook } from '../controllers/givebutterWebhookController.js';

const router = Router();

router.post('/givebutter', handleGivebutterWebhook);

export default router;
