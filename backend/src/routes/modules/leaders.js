import { Router } from 'express';

import { authenticate, requireRoles } from '../../middlewares/auth.js';
import { updateLeaderDepartment, removeLeaderDepartment, getAllLeaders } from '../../controllers/leaderController.js';
import { listMembers, createMember, updateMember, deleteMember } from '../../controllers/memberController.js';
import { listAttendanceRecords, upsertAttendanceRecords, deleteAttendanceRecord } from '../../controllers/attendanceController.js';
import { saveMonthlyAttendance } from '../../controllers/monthlyAttendanceController.js';

const router = Router();

router.get('/', authenticate, requireRoles('admin', 'manager'), getAllLeaders);

router.put('/:leaderId/department', authenticate, requireRoles('leader', 'admin'), updateLeaderDepartment);
router.delete('/:leaderId/department', authenticate, requireRoles('leader', 'admin'), removeLeaderDepartment);

router.get('/:leaderId/members', authenticate, requireRoles('leader', 'admin', 'manager'), listMembers);
router.post('/:leaderId/members', authenticate, requireRoles('leader', 'admin'), createMember);
router.put('/:leaderId/members/:memberId', authenticate, requireRoles('leader', 'admin'), updateMember);
router.delete('/:leaderId/members/:memberId', authenticate, requireRoles('leader', 'admin'), deleteMember);

router.get('/:leaderId/attendance', authenticate, requireRoles('leader', 'admin', 'manager'), listAttendanceRecords);
router.post('/:leaderId/attendance', authenticate, requireRoles('leader', 'admin'), upsertAttendanceRecords);
router.delete('/:leaderId/attendance/:recordId', authenticate, requireRoles('leader', 'admin'), deleteAttendanceRecord);

router.post('/:leaderId/monthly-attendance', authenticate, requireRoles('leader', 'admin'), saveMonthlyAttendance);

export default router;

