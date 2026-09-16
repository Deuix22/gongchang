import { Router } from 'express';

import { authenticate, requireRoles } from '../../middlewares/auth.js';
import { sendWechatNotification } from '../../controllers/notificationController.js';

const router = Router();

router.post('/wechat', authenticate, requireRoles('admin', 'manager', 'leader'), sendWechatNotification);

export default router;

