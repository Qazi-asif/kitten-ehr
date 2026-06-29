import { Router } from 'express';
import {
  createUser,
  deleteUser,
  listUsers,
  updateUser,
} from '../controllers/userController.js';
import { requireAuth, requirePermission } from '../middleware/authMiddleware.js';

const router = Router();

router.use(requireAuth);
router.get('/', requirePermission('users.view'), listUsers);
router.post('/', requirePermission('users.manage'), createUser);
router.put('/:id', requirePermission('users.manage'), updateUser);
router.delete('/:id', requirePermission('users.manage'), deleteUser);

export default router;
