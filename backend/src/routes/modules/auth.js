import { Router } from 'express';

import { login, loginAdmin, loginWechat, refreshToken, logout } from '../../controllers/authController.js';

const router = Router();

// 统一登录接口（所有用户使用）
router.post('/login', login);

// 保留旧接口用于向后兼容（可选）
router.post('/login-admin', loginAdmin);
router.post('/login-wechat', loginWechat);

router.post('/refresh', refreshToken);
router.post('/logout', logout);

export default router;

