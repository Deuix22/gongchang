import { Router } from 'express';

import { authenticate, requireRoles } from '../../middlewares/auth.js';
import { createUser, getCurrentUser, updateCurrentUser, getAllUsers, promoteUser, demoteUser, deleteUser } from '../../controllers/userController.js';

const router = Router();

// 注意：具体路由（/me）必须在参数路由（/:userId）之前注册
router.post('/', authenticate, requireRoles('admin'), createUser);
router.get('/me', authenticate, getCurrentUser);
router.put('/me', authenticate, updateCurrentUser);
router.get('/', authenticate, getAllUsers);
router.post('/:userId/promote', authenticate, requireRoles('admin'), promoteUser);
router.post('/:userId/demote', authenticate, requireRoles('admin'), demoteUser);
router.delete('/:userId', authenticate, requireRoles('admin'), deleteUser);

export default router;

