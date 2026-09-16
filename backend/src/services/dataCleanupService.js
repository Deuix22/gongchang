import AttendanceHistory from '../models/AttendanceHistory.js';
import AttendanceRecord from '../models/AttendanceRecord.js';

const RETENTION_DAYS = 60; // 数据保留天数

/**
 * 获取数据保留期限的截止日期
 * @returns {Date} 截止日期
 */
function getRetentionCutoffDate () {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - RETENTION_DAYS);
  cutoffDate.setHours(0, 0, 0, 0); // 设置为当天的开始时间
  return cutoffDate;
}

/**
 * 清理超过保留期限的历史记录
 * @returns {Promise<{deleted: number, before: number, after: number}>}
 */
export async function cleanupOldHistoryRecords () {
  const cutoffDate = getRetentionCutoffDate();
  
  // 记录清理前的数据量
  const countBefore = await AttendanceHistory.countDocuments();
  
  // 清理超过保留期限的记录（基于 changedAt）
  const result = await AttendanceHistory.deleteMany({
    changedAt: { $lt: cutoffDate }
  });
  
  const deletedCount = result.deletedCount || 0;
  const countAfter = countBefore - deletedCount;
  
  console.log('[DataCleanup] 历史记录清理完成:', {
    cutoffDate: cutoffDate.toISOString(),
    deleted: deletedCount,
    before: countBefore,
    after: countAfter
  });
  
  return {
    deleted: deletedCount,
    before: countBefore,
    after: countAfter
  };
}

/**
 * 清理超过保留期限的出勤记录
 * @returns {Promise<{deleted: number, before: number, after: number}>}
 */
export async function cleanupOldAttendanceRecords () {
  const cutoffDate = getRetentionCutoffDate();
  
  // 记录清理前的数据量
  const countBefore = await AttendanceRecord.countDocuments();
  
  // 清理超过保留期限的记录（基于 submittedAt）
  const result = await AttendanceRecord.deleteMany({
    submittedAt: { $lt: cutoffDate }
  });
  
  const deletedCount = result.deletedCount || 0;
  const countAfter = countBefore - deletedCount;
  
  console.log('[DataCleanup] 出勤记录清理完成:', {
    cutoffDate: cutoffDate.toISOString(),
    deleted: deletedCount,
    before: countBefore,
    after: countAfter
  });
  
  return {
    deleted: deletedCount,
    before: countBefore,
    after: countAfter
  };
}

/**
 * 执行完整的数据清理任务
 * @returns {Promise<{history: object, records: object}>}
 */
export async function cleanupOldData () {
  console.log('[DataCleanup] 开始执行数据清理任务...');
  
  const [historyResult, recordsResult] = await Promise.all([
    cleanupOldHistoryRecords(),
    cleanupOldAttendanceRecords()
  ]);
  
  console.log('[DataCleanup] 数据清理任务完成:', {
    history: historyResult,
    records: recordsResult,
    totalDeleted: historyResult.deleted + recordsResult.deleted
  });
  
  return {
    history: historyResult,
    records: recordsResult
  };
}

/**
 * 获取数据保留状态（用于监控）
 * @returns {Promise<{history: object, records: object}>}
 */
export async function getRetentionStatus () {
  const cutoffDate = getRetentionCutoffDate();
  
  const [historyCount, historyOldest, recordsCount, recordsOldest] = await Promise.all([
    AttendanceHistory.countDocuments(),
    AttendanceHistory.findOne().sort({ changedAt: 1 }).select('changedAt').lean(),
    AttendanceRecord.countDocuments(),
    AttendanceRecord.findOne().sort({ submittedAt: 1 }).select('submittedAt').lean()
  ]);
  
  const historyOldestDate = historyOldest?.changedAt || null;
  const recordsOldestDate = recordsOldest?.submittedAt || null;
  
  // 检查是否有超过保留期限的数据
  const historyHasOldData = historyOldestDate && historyOldestDate < cutoffDate;
  const recordsHasOldData = recordsOldestDate && recordsOldestDate < cutoffDate;
  
  return {
    retentionDays: RETENTION_DAYS,
    cutoffDate: cutoffDate.toISOString(),
    history: {
      total: historyCount,
      oldestDate: historyOldestDate?.toISOString() || null,
      hasOldData: historyHasOldData,
      needsCleanup: historyHasOldData
    },
    records: {
      total: recordsCount,
      oldestDate: recordsOldestDate?.toISOString() || null,
      hasOldData: recordsHasOldData,
      needsCleanup: recordsHasOldData
    }
  };
}

