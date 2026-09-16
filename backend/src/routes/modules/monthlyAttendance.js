import { Router } from 'express';

import { authenticate, requireRoles } from '../../middlewares/auth.js';
import { getMonthlyAttendance } from '../../controllers/monthlyAttendanceController.js';

const router = Router();

router.get('/', authenticate, requireRoles('admin', 'manager'), getMonthlyAttendance);

export default router;

