import { Router } from 'express';

import authRouter from './modules/auth.js';
import userRouter from './modules/users.js';
import leaderRouter from './modules/leaders.js';
import attendanceRouter from './modules/attendance.js';
import adminRouter from './modules/admin.js';
import notificationRouter from './modules/notifications.js';
import monthlyAttendanceRouter from './modules/monthlyAttendance.js';
import performanceRouter from './modules/performance.js';
import warehouseRouter from './modules/warehouse.js';

const router = Router();

router.use('/auth', authRouter);
router.use('/users', userRouter);
router.use('/leaders', leaderRouter);
router.use('/attendance', attendanceRouter);
router.use('/admin', adminRouter);
router.use('/notifications', notificationRouter);
router.use('/monthly-attendance', monthlyAttendanceRouter);
router.use('/performance', performanceRouter);
router.use('/warehouse', warehouseRouter);

export default router;

