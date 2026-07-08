import { Router } from 'express';
import { activateProtocol } from '../controllers/protocolController.js';

const router = Router({ mergeParams: true });

router.post('/activate', activateProtocol);

export default router;
