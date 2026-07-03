import { Router } from 'express';
import { sendKittenDocumentsEmail } from '../controllers/emailController.js';

const router = Router();

router.post('/:id/send-email', sendKittenDocumentsEmail);

export default router;
