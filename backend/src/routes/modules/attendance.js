import { Router } from 'express';

import { authenticate, requireRoles } from '../../middlewares/auth.js';
import { createHistoryRecord, listHistoryRecords, listAllAttendanceRecords } from '../../controllers/attendanceController.js';

const router = Router();

// 历史记录接口
router.post('/history', authenticate, requireRoles('leader', 'admin', 'manager'), createHistoryRecord);
router.get('/history', authenticate, requireRoles('leader', 'admin', 'manager'), listHistoryRecords);

// 管理员查询所有出勤记录（不传leaderId时返回所有组长的记录）
router.get('/', authenticate, requireRoles('admin', 'manager'), listAllAttendanceRecords);

export default router;

