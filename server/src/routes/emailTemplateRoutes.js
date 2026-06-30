import { Router } from 'express';
import {
  createEmailTemplate,
  deleteEmailTemplate,
  getEmailLogs,
  getEmailTemplates,
  updateEmailSettings,
  updateEmailTemplate,
} from '../controllers/emailTemplateController.js';
import { requireAuth, requireAnyPermission, requirePermission } from '../middleware/authMiddleware.js';

const router = Router();

router.use(requireAuth);

router.get('/', requirePermission('emails.view'), getEmailTemplates);
router.get('/logs', requirePermission('emails.view'), getEmailLogs);
router.patch('/settings', requireAnyPermission('emails.manage', 'settings.manage'), updateEmailSettings);
router.post('/', requirePermission('emails.manage'), createEmailTemplate);
router.patch('/:id', requirePermission('emails.manage'), updateEmailTemplate);
router.delete('/:id', requirePermission('emails.manage'), deleteEmailTemplate);

export default router;
