import { parseISO, isValid, startOfMonth, endOfMonth, eachDayOfInterval, format } from 'date-fns';

import MonthlyAttendance from '../models/MonthlyAttendance.js';
import User from '../models/User.js';
import { badRequest, forbidden } from '../utils/errors.js';

/**
 * 验证日期格式（YYYY-MM-DD）
 */
function validateDateString (dateStr) {
  if (!dateStr || typeof dateStr !== 'string') {
    return false;
  }
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(dateStr)) {
    return false;
  }
  const date = parseISO(dateStr);
  return isValid(date);
}

/**
 * 验证年月格式（YYYY-MM）
 */
function validateYearMonthString (yearMonthStr) {
  if (!yearMonthStr || typeof yearMonthStr !== 'string') {
    return false;
  }
  const regex = /^\d{4}-\d{2}$/;
  if (!regex.test(yearMonthStr)) {
    return false;
  }
  const date = parseISO(`${yearMonthStr}-01`);
  return isValid(date);
}

/**
 * 从日期字符串提取年月（YYYY-MM）
 */
function extractYearMonth (dateStr) {
  if (!validateDateString(dateStr)) {
    throw badRequest('日期格式不正确，应为 YYYY-MM-DD 格式');
  }
  return dateStr.substring(0, 7); // 提取前7个字符（YYYY-MM）
}

/**
 * 保存月度统计表数据
 */
export async function saveMonthlyAttendance (req, res) {
  const { leaderId } = req.params;
  const { date, records, submittedAt } = req.body;

  // 权限检查：只有组长本人或 admin 可以保存
  if (req.user.role !== 'admin' && req.user.userId !== leaderId) {
    throw forbidden('无权操作其他组的月度统计表');
  }

  // 验证必填字段
  if (!date) {
    throw badRequest('date 字段必填');
  }
  if (!records || !Array.isArray(records) || records.length === 0) {
    throw badRequest('records 字段必填且不能为空数组');
  }
  if (!submittedAt) {
    throw badRequest('submittedAt 字段必填');
  }

  // 验证日期格式
  if (!validateDateString(date)) {
    throw badRequest('日期格式不正确，应为 YYYY-MM-DD 格式');
  }

  // 验证 submittedAt 格式
  const submittedAtDate = parseISO(submittedAt);
  if (!isValid(submittedAtDate)) {
    throw badRequest('submittedAt 格式不正确，应为 ISO 8601 格式');
  }

  // 提取年月
  const yearMonth = extractYearMonth(date);

  // 验证 records 数组中的每条记录
  for (const record of records) {
    if (!record.memberId) {
      throw badRequest('records 中每条记录必须包含 memberId');
    }
    if (!record.memberName) {
      throw badRequest('records 中每条记录必须包含 memberName');
    }
    if (!record.startTime) {
      throw badRequest('records 中每条记录必须包含 startTime');
    }
    if (!record.endTime) {
      throw badRequest('records 中每条记录必须包含 endTime');
    }
    if (typeof record.duration !== 'number') {
      throw badRequest('records 中每条记录必须包含 duration（数字类型）');
    }
    if (!record.shiftType || !['day', 'night'].includes(record.shiftType)) {
      throw badRequest('records 中每条记录必须包含 shiftType（day 或 night）');
    }

    // 验证时间格式
    const startTimeDate = parseISO(record.startTime);
    const endTimeDate = parseISO(record.endTime);
    if (!isValid(startTimeDate) || !isValid(endTimeDate)) {
      throw badRequest('records 中的时间格式不正确，应为 ISO 8601 格式');
    }
  }

  // 生成唯一ID：yearMonth_leaderId_date
  const id = `${yearMonth}_${leaderId}_${date}`;

  // 使用 upsert 操作：如果存在则更新，不存在则创建
  const monthlyAttendance = await MonthlyAttendance.findOneAndUpdate(
    { id },
    {
      id,
      yearMonth,
      leaderId,
      date,
      records,
      submittedAt: submittedAtDate
    },
    {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true
    }
  );

  res.json({
    success: true,
    yearMonth,
    date,
    recordCount: records.length
  });
}

/**
 * 查询月度统计表
 */
export async function getMonthlyAttendance (req, res) {
  const { yearMonth, leaderId } = req.query;

  // 权限检查：只有 admin 和 manager 可以查询
  if (req.user.role !== 'admin' && req.user.role !== 'manager') {
    throw forbidden('权限不足，仅管理员和管理员可以查询月度统计表');
  }

  // 验证 yearMonth 参数
  if (!yearMonth) {
    throw badRequest('yearMonth 参数必填');
  }
  if (!validateYearMonthString(yearMonth)) {
    throw badRequest('yearMonth 参数格式不正确，应为 YYYY-MM 格式');
  }

  // 构建查询条件
  const filter = { yearMonth };
  if (leaderId) {
    filter.leaderId = leaderId;
  }

  // 查询数据库中的记录
  const records = await MonthlyAttendance.find(filter).sort({ date: 1 });

  // 获取该月的所有日期（从1号到最后一天）
  const monthStart = startOfMonth(parseISO(`${yearMonth}-01`));
  const monthEnd = endOfMonth(monthStart);
  const allDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // 如果指定了 leaderId，只返回该组长的数据
  if (leaderId) {
    // 获取组长信息
    const leader = await User.findOne({ userId: leaderId }).select(['nickName', 'department']).lean();
    const leaderName = leader?.nickName || leaderId;
    const department = leader?.department || null;

    // 构建该月所有日期的数据
    const data = allDays.map(day => {
      const dateStr = format(day, 'yyyy-MM-dd');
      const record = records.find(r => r.date === dateStr);

      return {
        date: dateStr,
        leaderId,
        leaderName,
        department,
        records: record ? record.records : [],
        submittedAt: record ? record.submittedAt : null
      };
    });

    res.json({
      yearMonth,
      data
    });
  } else {
    // 如果没有指定 leaderId，返回所有组长的数据
    // 需要获取所有组长，然后为每个组长生成该月所有日期的数据

    // 获取所有组长信息
    const leaders = await User.find({ role: 'leader' }).select(['userId', 'nickName', 'department']).lean();
    const leaderMap = new Map();
    leaders.forEach(leader => {
      leaderMap.set(leader.userId, {
        leaderName: leader.nickName || leader.userId,
        department: leader.department || null
      });
    });

    // 为每个组长构建该月所有日期的数据
    const data = [];
    for (const leader of leaders) {
      const leaderInfo = leaderMap.get(leader.userId);
      const leaderRecords = records.filter(r => r.leaderId === leader.userId);

      for (const day of allDays) {
        const dateStr = format(day, 'yyyy-MM-dd');
        const record = leaderRecords.find(r => r.date === dateStr);

        data.push({
          date: dateStr,
          leaderId: leader.userId,
          leaderName: leaderInfo.leaderName,
          department: leaderInfo.department,
          records: record ? record.records : [],
          submittedAt: record ? record.submittedAt : null
        });
      }
    }

    // 按日期和组长ID排序
    data.sort((a, b) => {
      if (a.date !== b.date) {
        return a.date.localeCompare(b.date);
      }
      return a.leaderId.localeCompare(b.leaderId);
    });

    res.json({
      yearMonth,
      data
    });
  }
}

