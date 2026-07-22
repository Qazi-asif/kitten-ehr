import { Router } from 'express';
import { sendKittenDocumentsEmail } from '../controllers/emailController.js';
import { requirePermission } from '../middleware/authMiddleware.js';

const router = Router();

router.post('/:id/send-email', requirePermission('emails.manage'), sendKittenDocumentsEmail);

export default router;
