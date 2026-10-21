import { Router } from 'express';
import { sendKittenDocumentsEmail } from '../controllers/emailController.js';
import { requirePermission } from '../middleware/authMiddleware.js';
import { requireAccessibleKitten } from '../middleware/kittenAccess.js';

const router = Router();

router.post('/:id/send-email', requirePermission('emails.manage'), requireAccessibleKitten, sendKittenDocumentsEmail);

export default router;
