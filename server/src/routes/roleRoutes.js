import { Router } from 'express';
import {
  createRole,
  deleteRole,
  listPermissions,
  listRoles,
  updateRole,
} from '../controllers/roleController.js';
import { requireAuth, requireAnyPermission } from '../middleware/authMiddleware.js';

const router = Router();

router.use(requireAuth);
router.get('/permissions', requireAnyPermission('roles.manage', 'users.view'), listPermissions);
router.get('/', requireAnyPermission('roles.manage', 'users.view'), listRoles);
router.post('/', requireAnyPermission('roles.manage'), createRole);
router.put('/:id', requireAnyPermission('roles.manage'), updateRole);
router.delete('/:id', requireAnyPermission('roles.manage'), deleteRole);

export default router;
