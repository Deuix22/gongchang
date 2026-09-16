import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import AttendanceRecord from '../models/AttendanceRecord.js';
import ExportTask from '../models/ExportTask.js';
import Member from '../models/Member.js';
import UploadTask from '../models/UploadTask.js';
import User from '../models/User.js';
import config from '../config/env.js';
import { badRequest, notFound } from '../utils/errors.js';
import { cleanupOldData, getRetentionStatus } from '../services/dataCleanupService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function getAttendanceGroups (req, res) {
  const leaders = await User.find({ role: 'leader' }).sort({ department: 1, createdAt: 1 });
  const leaderIds = leaders.map(l => l.userId);

  const members = await Member.find({ leaderId: { $in: leaderIds } });
  const attendanceRecords = await AttendanceRecord.find({ leaderId: { $in: leaderIds } }).sort({
    updatedAt: -1
  });

  const recordMap = new Map();
  attendanceRecords.forEach(record => {
    if (!recordMap.has(record.memberId)) {
      recordMap.set(record.memberId, record);
    }
  });

  const memberMap = new Map();
  members.forEach(member => {
    if (!memberMap.has(member.leaderId)) {
      memberMap.set(member.leaderId, []);
    }
    const latestRecord = recordMap.get(member.memberId);
    memberMap.get(member.leaderId).push({
      memberId: member.memberId,
      name: member.name,
      shiftType: member.shiftType,
      latestRecord: latestRecord
        ? {
            recordId: latestRecord.recordId,
            startTime: latestRecord.startTime,
            endTime: latestRecord.endTime,
            duration: latestRecord.duration,
            updatedAt: latestRecord.updatedAt
          }
        : null
    });
  });

  const response = leaders.map(leader => ({
    department: leader.department,
    groupName: leader.department ? `${leader.department}-${leader.userId}` : leader.userId,
    leaderId: leader.userId,
    leaderName: leader.nickName,
    members: memberMap.get(leader.userId) ?? []
  }));

  res.json(response);
}

const SUPPORTED_EXPORT_FORMATS = ['xlsx', 'csv'];

function normalizeExportFormat (format) {
  if (!format) return 'xlsx';
  const normalized = String(format).toLowerCase();
  if (!SUPPORTED_EXPORT_FORMATS.includes(normalized)) {
    throw badRequest(`format 必须为 ${SUPPORTED_EXPORT_FORMATS.join('/')}`);
  }
  return normalized;
}

export async function requestGroupExport (req, res) {
  const { department, groupName, leaderId, startDate, endDate, includeHistory, format } = req.body ?? {};
  if (!department || !leaderId || !startDate || !endDate) {
    throw badRequest('缺少必要字段');
  }

  const exportFormat = normalizeExportFormat(format);

  const task = await ExportTask.create({
    type: 'group',
    params: { department, groupName, leaderId, startDate, endDate, includeHistory: !!includeHistory, format: exportFormat },
    status: 'processing',
    progress: 10,
    createdBy: req.user.userId
  });

  res.status(202).json({
    taskId: task.taskId,
    status: task.status,
    format: exportFormat
  });
}

export async function requestAllExport (req, res) {
  const { startDate, endDate, format } = req.body ?? {};
  if (!startDate || !endDate) {
    throw badRequest('startDate 与 endDate 必填');
  }

  const exportFormat = normalizeExportFormat(format);

  const task = await ExportTask.create({
    type: 'all',
    params: { startDate, endDate, format: exportFormat },
    status: 'processing',
    progress: 5,
    createdBy: req.user.userId
  });

  res.status(202).json({
    taskId: task.taskId,
    status: task.status,
    format: exportFormat
  });
}

export async function getExportTask (req, res) {
  const { taskId } = req.params;
  const task = await ExportTask.findOne({ taskId });
  if (!task) {
    throw notFound('导出任务不存在');
  }
  res.json({
    taskId: task.taskId,
    status: task.status,
    progress: task.progress,
    format: task.params?.format ?? 'xlsx',
    downloadUrl: task.downloadUrl,
    expiredAt: task.expiredAt
  });
}

export async function handleUpload (req, res) {
  if (!req.file) {
    throw badRequest('缺少上传文件');
  }

  const { startDate, endDate } = req.body ?? {};

  const parsedRows = Math.floor(Math.random() * 20) + 5;
  const anomalies = [
    {
      memberId: 'member_demo',
      name: '示例组员',
      reason: '上班时间晚于8:00',
      manualStartTime: '2024-01-01 09:00',
      manualDuration: 540,
      uploadedDuration: 480
    }
  ];

  // 获取基础URL（从环境变量或使用默认值）
  const baseUrl = process.env.API_BASE_URL || 'https://hvoqpnuvbtfp.sealosbja.site';
  
  const uploadTask = await UploadTask.create({
    fileName: req.file.originalname,
    startDate: startDate ? new Date(startDate) : undefined,
    endDate: endDate ? new Date(endDate) : undefined,
    parsedRows,
    anomalies,
    anomalyReportUrl: `${baseUrl}/files/${path.parse(req.file.originalname).name}_anomalies.xlsx`,
    status: 'finished',
    createdBy: req.user.userId
  });

  res.status(201).json({
    uploadId: uploadTask.uploadId,
    parsedRows: uploadTask.parsedRows,
    anomalies: uploadTask.anomalies,
    anomalyReportUrl: uploadTask.anomalyReportUrl
  });
}

/**
 * 获取数据保留状态
 */
export async function getDataRetentionStatus (req, res) {
  try {
    const status = await getRetentionStatus();
    res.json(status);
  } catch (error) {
    console.error('[Admin] 获取数据保留状态失败:', error);
    throw badRequest('获取数据保留状态失败', {
      error: error.message
    });
  }
}

/**
 * 执行数据清理任务
 */
export async function cleanupData (req, res) {
  try {
    const result = await cleanupOldData();
    res.json({
      success: true,
      message: '数据清理完成',
      ...result
    });
  } catch (error) {
    console.error('[Admin] 数据清理失败:', error);
    throw badRequest('数据清理失败', {
      error: error.message
    });
  }
}

export async function downloadUploadReport (req, res) {
  const { uploadId } = req.params;
  const uploadTask = await UploadTask.findOne({ uploadId });
  if (!uploadTask) {
    throw notFound('上传记录不存在');
  }

  if (!uploadTask.anomalyReportUrl) {
    throw notFound('暂无异常报告');
  }

  // 这里模拟返回一个占位文件
  const dummyFilePath = path.join(__dirname, '../../templates/dummy-report.xlsx');
  if (!fs.existsSync(dummyFilePath)) {
    fs.mkdirSync(path.dirname(dummyFilePath), { recursive: true });
    fs.writeFileSync(dummyFilePath, '占位文件');
  }

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${path.basename(dummyFilePath)}"`);
  fs.createReadStream(dummyFilePath).pipe(res);
}

