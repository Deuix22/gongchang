import { Router } from 'express';
import multer from 'multer';
import path from 'path';

import { authenticate, requireRoles } from '../../middlewares/auth.js';
import {
  getAttendanceGroups,
  requestGroupExport,
  requestAllExport,
  getExportTask,
  handleUpload,
  downloadUploadReport,
  getDataRetentionStatus,
  cleanupData
} from '../../controllers/adminController.js';
import config from '../../config/env.js';

const router = Router();

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, config.uploadDir);
  },
  filename: (_req, file, cb) => {
    const timestamp = Date.now();
    const ext = path.extname(file.originalname);
    cb(null, `${timestamp}-${file.originalname}${ext}`);
  }
});

const upload = multer({ storage });

router.get('/attendance/groups', authenticate, requireRoles('admin', 'manager'), getAttendanceGroups);
router.post('/attendance/export', authenticate, requireRoles('admin', 'manager'), requestGroupExport);
router.post('/attendance/export/all', authenticate, requireRoles('admin', 'manager'), requestAllExport);
router.get('/attendance/export/:taskId', authenticate, requireRoles('admin', 'manager'), getExportTask);
router.post('/attendance/upload', authenticate, requireRoles('admin', 'manager'), upload.single('file'), handleUpload);
router.get('/attendance/upload/:uploadId/report', authenticate, requireRoles('admin', 'manager'), downloadUploadReport);

// 数据保留管理接口
router.get('/data/retention/status', authenticate, requireRoles('admin'), getDataRetentionStatus);
router.post('/data/retention/cleanup', authenticate, requireRoles('admin'), cleanupData);

export default router;

