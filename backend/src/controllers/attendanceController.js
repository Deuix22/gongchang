import { parseISO, isValid } from 'date-fns';

import AttendanceRecord from '../models/AttendanceRecord.js';
import AttendanceHistory from '../models/AttendanceHistory.js';
import Member from '../models/Member.js';
import User from '../models/User.js';
import { badRequest, forbidden, notFound } from '../utils/errors.js';

async function ensurePermission (req, leaderId) {
  if (req.user.role === 'admin' || req.user.role === 'manager') {
    return;
  }
  if (leaderId !== req.user.userId) {
    throw forbidden('无权操作其他组的出勤记录');
  }
}

function toDate (value) {
  if (value instanceof Date) return value;
  const parsed = parseISO(value);
  if (!isValid(parsed)) {
    throw badRequest('时间格式需为 ISO 字符串');
  }
  return parsed;
}

/**
 * 解析日期字符串（支持 YYYY-MM-DD 格式）
 * @param {string} dateStr - 日期字符串，格式：YYYY-MM-DD 或 ISO 字符串
 * @returns {Date} 日期对象
 */
function parseDateString (dateStr) {
  if (!dateStr) return null;
  
  // 如果是 YYYY-MM-DD 格式，转换为 ISO 字符串（设置为当天的开始时间）
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return new Date(`${dateStr}T00:00:00.000Z`);
  }
  
  // 否则使用 ISO 格式解析
  return toDate(dateStr);
}

/**
 * 获取数据保留期限的截止日期（60天前）
 * @returns {Date} 截止日期
 */
function getRetentionCutoffDate () {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - 60); // 保留60天
  cutoffDate.setHours(0, 0, 0, 0); // 设置为当天的开始时间
  return cutoffDate;
}

/** 组员变动历史需长期可查，不受出勤类 60 天保留限制 */
const LONG_RETENTION_HISTORY_FIELDS = new Set(['member_change']);

function escapeRegExp (str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export async function listAttendanceRecords (req, res) {
  const { leaderId } = req.params;
  await ensurePermission(req, leaderId);

  const { memberId, startDate, endDate } = req.query ?? {};

  const filter = { leaderId };
  if (memberId) {
    filter.memberId = memberId;
  }
  if (startDate || endDate) {
    filter.startTime = {};
    if (startDate) {
      filter.startTime.$gte = toDate(startDate);
    }
    if (endDate) {
      filter.startTime.$lte = toDate(endDate);
    }
  } else {
    // 如果不提供日期参数，应用数据保留限制（至少保留60天，基于submittedAt）
    const retentionCutoff = getRetentionCutoffDate();
    filter.submittedAt = { $gte: retentionCutoff };
  }

  const [records, leaderProfile] = await Promise.all([
    AttendanceRecord.find(filter).sort({ memberId: 1, startTime: -1 }),
    User.findOne({ userId: leaderId }).select(['nickName', 'username', 'department']).lean()
  ]);

  const fallbackLeaderName = leaderProfile?.nickName ?? leaderProfile?.username ?? leaderId;
  const fallbackDepartment = leaderProfile?.department ?? '';

  res.json({
    records: records.map(record => ({
      recordId: record.recordId,
      leaderId: record.leaderId,
      leaderName: record.leaderName || fallbackLeaderName,
      department: record.department || fallbackDepartment,
      recordDate: record.recordDate,
      memberId: record.memberId,
      name: record.name,
      shiftType: record.shiftType,
      startTime: record.startTime,
      endTime: record.endTime,
      duration: record.duration,
      submittedAt: record.submittedAt,
      lastUpdatedBy: record.lastUpdatedBy,
      updatedAt: record.updatedAt,
      createdAt: record.createdAt,
      notes: record.notes ?? null
    })),
    stats: {
      total: records.length
    }
  });
}

/**
 * 管理员查询所有组长的出勤记录
 * 用于管理员查看所有组长的数据，支持按leaderId、memberId、时间范围过滤
 */
export async function listAllAttendanceRecords (req, res) {
  // 仅管理员和manager可以访问
  if (req.user.role !== 'admin' && req.user.role !== 'manager') {
    throw forbidden('仅管理员可以查询所有出勤记录');
  }

  const { leaderId, memberId, startDate, endDate } = req.query ?? {};

  const filter = {};
  if (leaderId) {
    filter.leaderId = leaderId;
  }
  if (memberId) {
    filter.memberId = memberId;
  }
  if (startDate || endDate) {
    filter.startTime = {};
    if (startDate) {
      filter.startTime.$gte = toDate(startDate);
    }
    if (endDate) {
      filter.startTime.$lte = toDate(endDate);
    }
  } else {
    // 如果不提供日期参数，应用数据保留限制（至少保留60天，基于submittedAt）
    const retentionCutoff = getRetentionCutoffDate();
    filter.submittedAt = { $gte: retentionCutoff };
  }

  const records = await AttendanceRecord.find(filter).sort({ leaderId: 1, memberId: 1, startTime: -1 });

  // 获取所有涉及的leader信息
  const leaderIds = [...new Set(records.map(r => r.leaderId))];
  const leaders = await User.find({ userId: { $in: leaderIds } })
    .select(['userId', 'nickName', 'username', 'department'])
    .lean();
  const leaderMap = new Map(leaders.map(l => [l.userId, l]));

  res.json({
    records: records.map(record => {
      const leader = leaderMap.get(record.leaderId);
      const fallbackLeaderName = leader?.nickName ?? leader?.username ?? record.leaderId;
      const fallbackDepartment = leader?.department ?? '';

      return {
        recordId: record.recordId,
        leaderId: record.leaderId,
        leaderName: record.leaderName || fallbackLeaderName,
        department: record.department || fallbackDepartment,
        recordDate: record.recordDate,
        memberId: record.memberId,
        name: record.name,
        shiftType: record.shiftType,
        startTime: record.startTime,
        endTime: record.endTime,
        duration: record.duration,
        submittedAt: record.submittedAt,
        lastUpdatedBy: record.lastUpdatedBy,
        updatedAt: record.updatedAt,
        createdAt: record.createdAt,
        notes: record.notes ?? null
      };
    }),
    stats: {
      total: records.length,
      leaderCount: leaderIds.length
    }
  });
}

export async function upsertAttendanceRecords (req, res) {
  const { leaderId } = req.params;
  await ensurePermission(req, leaderId);

  const { records, submittedAt } = req.body ?? {};
  if (!Array.isArray(records) || records.length === 0) {
    throw badRequest('records 不能为空');
  }

  const leader = await User.findOne({ userId: leaderId });
  if (!leader) {
    throw notFound('组长不存在');
  }

  const normalizedRecords = records.map((record, index) => {
    if (!record || typeof record !== 'object') {
      throw badRequest(`records[${index}] 必须为对象`);
    }
    const memberId = typeof record.memberId === 'string' ? record.memberId.trim() : '';
    if (!memberId) {
      throw badRequest(`records[${index}].memberId 必填`);
    }
    const recordDate =
      typeof record.recordDate === 'string' && record.recordDate.trim().length > 0
        ? record.recordDate.trim()
        : '';
    if (!/^\d{4}-\d{2}-\d{2}$/.test(recordDate)) {
      throw badRequest(`records[${index}].recordDate 必填且格式为 YYYY-MM-DD`);
    }
    const recordDateObj = parseDateString(recordDate);
    if (!recordDateObj) {
      throw badRequest(`records[${index}].recordDate 格式不正确，应为 YYYY-MM-DD`);
    }
    if (!record.startTime || !record.endTime) {
      throw badRequest(`records[${index}] startTime 与 endTime 必填`);
    }
    if (record.duration === undefined || record.duration === null || Number.isNaN(Number(record.duration))) {
      throw badRequest(`records[${index}].duration 必须为数字`);
    }
    const duration = Number(record.duration);
    if (duration <= 0) {
      throw badRequest(`records[${index}].duration 必须大于 0`);
    }
    const shiftType = record.shiftType;
    if (!['day', 'night'].includes(shiftType)) {
      throw badRequest(`records[${index}].shiftType 必须为 day 或 night`);
    }
    const startDate = toDate(record.startTime);
    const endDate = toDate(record.endTime);
    if (endDate <= startDate) {
      throw badRequest(`records[${index}].endTime 必须晚于 startTime`);
    }

    return {
      ...record,
      memberId,
      recordDate,
      duration,
      shiftType,
      startDate,
      endDate,
      submittedAt: record.submittedAt ? toDate(record.submittedAt) : undefined
    };
  });

  const memberIds = [...new Set(normalizedRecords.map(record => record.memberId))];
  const recordDates = [...new Set(normalizedRecords.map(record => record.recordDate))];
  const [members, existingRecords] = await Promise.all([
    Member.find({ leaderId, memberId: { $in: memberIds } }),
    AttendanceRecord.find({ leaderId, memberId: { $in: memberIds }, recordDate: { $in: recordDates } })
  ]);

  const memberMap = new Map(members.map(member => [member.memberId, member]));
  const existingRecordMap = new Map(existingRecords.map(record => [`${record.memberId}_${record.recordDate}`, record]));

  const now = new Date();
  const defaultSubmittedAt = submittedAt ? toDate(submittedAt) : now;
  const leaderName = (leader.nickName ?? leader.username ?? leader.userId) || leaderId;
  const leaderDepartment = typeof leader.department === 'string' ? leader.department : '';

  let insertedCount = 0;
  let updatedCount = 0;
  let skippedCount = 0;

  for (const recordInput of normalizedRecords) {
    const recordKey = `${recordInput.memberId}_${recordInput.recordDate}`;
    const member = memberMap.get(recordInput.memberId);
    if (!member) {
      throw badRequest(`成员 ${recordInput.memberId} 未找到`);
    }

    const rawDepartment = recordInput.department ?? member.department ?? leaderDepartment ?? '';
    const normalizedDepartment = typeof rawDepartment === 'string' ? rawDepartment.trim() : '';
    const rawMemberName = recordInput.name ?? member.name ?? '';
    const normalizedMemberName = typeof rawMemberName === 'string' ? rawMemberName.trim() : '';

    const payload = {
      leaderId,
      leaderName,
      department: normalizedDepartment,
      memberId: recordInput.memberId,
      name: normalizedMemberName,
      shiftType: recordInput.shiftType,
      recordDate: recordInput.recordDate,
      startTime: recordInput.startDate,
      endTime: recordInput.endDate,
      duration: recordInput.duration,
      submittedAt: recordInput.submittedAt ?? defaultSubmittedAt,
      lastUpdatedBy: req.user.userId,
      notes:
        typeof recordInput.notes === 'string' && recordInput.notes.trim().length > 0
          ? recordInput.notes.trim()
          : undefined
    };

    if (!payload.department) {
      payload.department = leaderDepartment;
    }
    if (!payload.name) {
      payload.name = member.name;
    }

    const existingRecord = existingRecordMap.get(recordKey);
    if (existingRecord) {
      // 仅当提交时间更新（或相同）时才覆盖，避免旧提交覆盖最新
      const incomingSubmittedAt = payload.submittedAt?.getTime?.() ?? defaultSubmittedAt.getTime();
      const existingSubmittedAt = existingRecord.submittedAt?.getTime?.() ?? 0;
      if (incomingSubmittedAt < existingSubmittedAt) {
        skippedCount += 1;
        continue;
      }

      await AttendanceHistory.create({
        leaderId,
        department: payload.department,
        memberId: recordInput.memberId,
        memberName: existingRecord.name,
        field: 'record',
        oldValue: {
          recordDate: existingRecord.recordDate,
          startTime: existingRecord.startTime,
          endTime: existingRecord.endTime,
          duration: existingRecord.duration,
          shiftType: existingRecord.shiftType
        },
        newValue: {
          recordDate: payload.recordDate,
          startTime: payload.startTime,
          endTime: payload.endTime,
          duration: payload.duration,
          shiftType: payload.shiftType
        },
        changedBy: req.user.userId,
        changedByName: req.user.nickName,
        groupName: leaderDepartment ? `${leaderDepartment}-${leader.userId}` : leader.userId,
        changedAt: now
      });

      existingRecord.leaderName = payload.leaderName;
      existingRecord.department = payload.department;
      existingRecord.name = payload.name;
      existingRecord.shiftType = payload.shiftType;
      existingRecord.recordDate = payload.recordDate;
      existingRecord.startTime = payload.startTime;
      existingRecord.endTime = payload.endTime;
      existingRecord.duration = payload.duration;
      existingRecord.submittedAt = payload.submittedAt;
      existingRecord.lastUpdatedBy = payload.lastUpdatedBy;
      existingRecord.notes = payload.notes ?? existingRecord.notes;
      await existingRecord.save();
      existingRecordMap.set(recordKey, existingRecord);
      updatedCount += 1;
    } else {
      const created = await AttendanceRecord.create({
        ...payload,
        createdBy: req.user.userId
      });
      existingRecordMap.set(recordKey, created);
      insertedCount += 1;
    }
  }

  res.json({
    success: true,
    updatedCount,
    insertedCount,
    skippedCount,
    total: updatedCount + insertedCount
  });
}

export async function deleteAttendanceRecord (req, res) {
  const { leaderId, recordId } = req.params;
  await ensurePermission(req, leaderId);

  const record = await AttendanceRecord.findOne({ leaderId, recordId });
  if (!record) {
    throw notFound('出勤记录不存在');
  }

  await record.deleteOne();

  res.json({ success: true });
}

export async function createHistoryRecord (req, res) {
  const {
    leaderId,
    department,
    memberId,
    memberName,
    groupName,
    field,
    oldValue,
    newValue,
    changedBy,
    changedAt
  } =
    req.body ?? {};

  if (!leaderId || !memberName || !field || !changedBy) {
    throw badRequest('缺少必要字段');
  }

  const normalizedField = typeof field === 'string' ? field.trim() : '';
  if (!normalizedField) {
    throw badRequest('field 不能为空');
  }

  const user = await User.findOne({ userId: changedBy });
  const history = await AttendanceHistory.create({
    leaderId,
    department,
    memberId,
    memberName,
    groupName: groupName ?? (department ? `${department}-${leaderId}` : leaderId),
    field: normalizedField,
    oldValue,
    newValue,
    changedBy,
    changedByName: user?.nickName ?? null,
    changedAt: changedAt ? toDate(changedAt) : new Date()
  });

  res.status(201).json({
    historyId: history.historyId,
    saved: true
  });
}

export async function listHistoryRecords (req, res) {
  const { department, leaderId, memberName, start, end, field } = req.query ?? {};
  const isLeader = req.user.role === 'leader';

  const filter = {};
  if (department) filter.department = department;
  if (memberName) {
    const trimmed = String(memberName).trim();
    // 组员履历查询：field=member_change 时按姓名包含匹配（不区分大小写）
    if (field === 'member_change') {
      filter.memberName = new RegExp(escapeRegExp(trimmed), 'i');
    } else {
      filter.memberName = trimmed;
    }
  }
  
  // 权限控制：组长只能查看自己的记录，管理员/manager可以查看所有记录
  if (isLeader) {
    // 组长自动过滤为自己的记录
    filter.leaderId = req.user.userId;
  } else if (leaderId) {
    // 管理员/manager可以指定leaderId过滤
    filter.leaderId = leaderId;
  }
  // 如果不传leaderId且不是组长，则不添加leaderId过滤，返回所有记录
  
  // 日期范围查询（支持 YYYY-MM-DD 格式）
  // 根据文档要求：
  // - 如果只提供 start，返回从该日期到现在的所有记录
  // - 如果只提供 end，返回从最早记录到该日期的所有记录
  // - 如果同时提供 start 和 end，返回该日期范围内的记录
  // - 如果不提供日期参数，返回所有可用的记录（受保留期限限制）
  if (start || end) {
    filter.changedAt = {};
    if (start) {
      const startDate = parseDateString(start);
      if (startDate) {
        filter.changedAt.$gte = startDate;
      }
    }
    if (end) {
      const endDate = parseDateString(end);
      if (endDate) {
        // 文档要求：如果后端使用 >= start AND < end 的逻辑，前端会将结束日期加一天
        // 为了包含结束日期当天的数据，我们使用 <= endDate + 1天
        const endDateInclusive = new Date(endDate);
        endDateInclusive.setDate(endDateInclusive.getDate() + 1);
        filter.changedAt.$lt = endDateInclusive;
      }
    }
  } else if (!field || field === 'all' || !LONG_RETENTION_HISTORY_FIELDS.has(field)) {
    // 如果不提供日期参数，出勤类历史默认保留 60 天
    // member_change 等长期字段不截断，便于数据查询页合并历史入组记录
    const retentionCutoff = getRetentionCutoffDate();
    filter.changedAt = { $gte: retentionCutoff };
  }
  
  // 字段过滤：只有明确指定field参数时才过滤
  // - 如果传了 field 且不是 'all'，则按指定字段过滤
  // - 如果不传 field 或 field='all'，则返回所有类型的记录
  // 注意：前端需要查询缺勤汇总时，应显式传 field=daily_report
  if (field && field !== 'all') {
    filter.field = field;
  }
  // 如果不传 field 或 field='all'，不添加 field 过滤，返回所有类型的记录

  const histories = await AttendanceHistory.find(filter).sort({ changedAt: -1 });
  res.json(
    histories.map(history => ({
      historyId: history.historyId,
      leaderId: history.leaderId,
      department: history.department,
      groupName: history.groupName,
      memberId: history.memberId,
      memberName: history.memberName,
      field: history.field,
      oldValue: history.oldValue,
      newValue: history.newValue,
      changedBy: history.changedBy,
      changedByName: history.changedByName,
      changedAt: history.changedAt
    }))
  );
}

