/**
 * 出勤统计API服务
 */
import { get, post, del } from './request.js'
import {
  calculateAttendanceDuration,
  normalizeShiftType,
  parseDurationTextToMinutes
} from '../attendanceDuration.js'

/**
 * 获取组长当前出勤记录
 */
export const getAttendanceRecords = async (leaderId) => {
  return await get(`/leaders/${leaderId}/attendance`, {
    showLoading: false,
    showError: true
  })
}

/**
 * 提交/更新出勤记录
 */
export const submitAttendance = async (leaderId, records, department = '') => {
  // 获取提交时间（系统时间，精确到分钟）
  // 返回本地时间字符串格式，用于显示
  const getSubmittedTimeDisplay = () => {
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    const hours = String(now.getHours()).padStart(2, '0')
    const minutes = String(now.getMinutes()).padStart(2, '0')
    return `${year}-${month}-${day} ${hours}:${minutes}`
  }
  
  // 获取提交时间（ISO格式，UTC），用于后端存储
  const getSubmittedTimeISO = () => {
    return new Date().toISOString()
  }
  
  const submittedTimeDisplay = getSubmittedTimeDisplay() // 用于显示
  const submittedTimeISO = getSubmittedTimeISO() // 用于后端存储
  
  // 转换数据格式：将前端的时间字符串转换为ISO格式，时长转换为分钟
  const formatDateOnly = (date) => {
    if (!date) return ''
    const d = new Date(date)
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  const formattedRecords = records
    .map(record => {
      // 解析时间字符串（支持 "08:00" 和 "YYYY-MM-DD HH:mm" 格式）并转换为ISO格式
      const parseTime = (timeStr) => {
        if (!timeStr) return null
        
        // 如果是 "YYYY-MM-DD HH:mm" 格式
        if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(timeStr)) {
          const [datePart, timePart] = timeStr.split(' ')
          const [year, month, day] = datePart.split('-').map(Number)
          const [hour, minute] = timePart.split(':').map(Number)
          const date = new Date(year, month - 1, day, hour, minute, 0, 0)
          return date.toISOString()
        }
        
        // 如果是旧的 "HH:mm" 格式，使用今天日期
        if (/^\d{2}:\d{2}$/.test(timeStr)) {
          const [hour, minute] = timeStr.split(':').map(Number)
          const date = new Date()
          date.setHours(hour, minute, 0, 0)
          return date.toISOString()
        }
        
        // 如果已经是 ISO 格式，直接返回
        if (timeStr.includes('T')) {
          return timeStr
        }
        
        return null
      }
      
      // 解析时长字符串（如 "9小时" 或 "9小时30分钟"）并转换为分钟
      const parseDuration = (durationStr) => parseDurationTextToMinutes(durationStr)
      
      // 获取组员的shiftType
      const teamMembers = uni.getStorageSync('teamMembers') || []
      const memberInfo = Array.isArray(teamMembers) 
        ? teamMembers.find(m => m.name === record.name)
        : null
      const shiftType = normalizeShiftType(memberInfo?.shiftType || 'day')
      const dept = memberInfo?.department || department || ''
      
      // 提交时按最新规则重新计算出勤时长，不使用 record.duration 缓存
      const duration = parseDuration(
        calculateAttendanceDuration(record.startTime, record.endTime, dept, shiftType)
      )
      
      // 解析开始时间和结束时间
      let startTime = parseTime(record.startTime)
      let endTime = parseTime(record.endTime)
      
      // 先从原始输入中提取 recordDate（基于用户输入的上班日期）
      // 这样即使夜班跨天调整了 startTime，recordDate 仍然保持用户输入的日期
      let recordDate = ''
      if (record.startTime) {
        // 如果输入是 "YYYY-MM-DD HH:mm" 格式，直接提取日期部分
        if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(record.startTime)) {
          const [datePart] = record.startTime.split(' ')
          recordDate = datePart
        } else if (startTime) {
          // 否则从解析后的 startTime 提取日期（在调整之前）
          recordDate = formatDateOnly(startTime)
        }
      }
      
      // 处理夜班跨天情况：
      // 白班：8:00-20:00，都是当天（23号）
      // 夜班：20:00-8:00，是当天晚上到第二天早上（18号20:00到19号8:00）
      // 注意：startTime 保持用户输入的日期不变，只调整 endTime 确保时间顺序正确
      if (shiftType === 'night' && startTime && endTime) {
        const startDate = new Date(startTime)
        const endDate = new Date(endTime)
        
        // 确保结束时间晚于开始时间
        // 如果结束时间早于或等于开始时间，说明跨天了，将结束时间加1天
        if (endDate <= startDate) {
          endDate.setDate(endDate.getDate() + 1)
          endTime = endDate.toISOString()
          console.log(`夜班跨天处理: ${record.name} 结束时间 ${record.endTime} -> ${endTime} (跨天调整)`)
        }
        // startTime 保持不变，使用用户输入的原始时间
      } else if (!recordDate && startTime) {
        // 非夜班或没有从输入中提取到日期，从 startTime 提取
        recordDate = formatDateOnly(startTime)
      }

      return {
        memberId: memberInfo?.id || record.memberId,
        startTime: startTime,
        endTime: endTime,
        duration: duration,
        shiftType: shiftType,
        department: memberInfo?.department || department || '',
        memberName: record.name || memberInfo?.name || '',
        leaderId,
        recordDate,
        submittedAt: submittedTimeISO // 使用 ISO 格式（UTC），便于后端正确处理时区
      }
    })
    // 过滤掉无效记录：必须有姓名、开始时间、结束时间，且 duration > 0
    .filter(record => {
      const isValid = record.memberName && 
                     record.startTime && 
                     record.endTime && 
                     record.duration > 0
      if (!isValid) {
        console.warn('过滤掉无效的出勤记录:', record)
      }
      return isValid
    })
  
  // 如果没有有效记录，抛出错误
  if (formattedRecords.length === 0) {
    throw new Error('没有有效的出勤记录可提交，请确保所有记录都包含姓名、上班时间、下班时间，且出勤时长大于0')
  }
  
  // 调试日志：确认发送的时间格式
  console.log('提交时间（ISO格式，UTC）:', submittedTimeISO)
  console.log('提交时间（显示格式，本地）:', submittedTimeDisplay)
  
  return await post(`/leaders/${leaderId}/attendance`, {
    records: formattedRecords,
    submittedAt: submittedTimeISO // 使用 ISO 格式（UTC），便于后端正确处理时区
  }, {
    showLoading: true,
    loadingText: '提交中...',
    showError: true
  })
}

/**
 * 删除单条出勤记录
 */
export const deleteAttendanceRecord = async (leaderId, recordId) => {
  return await del(`/leaders/${leaderId}/attendance/${recordId}`, {
    showLoading: true,
    loadingText: '删除中...',
    showError: true
  })
}

/**
 * 保存月度统计表数据（当日最后一次提交）
 */
export const saveMonthlyAttendance = async (leaderId, date, records, submittedAt) => {
  return await post(`/leaders/${leaderId}/monthly-attendance`, {
    date,
    records,
    submittedAt
  }, {
    showLoading: false,
    showError: false  // 不显示错误，避免影响主流程
  })
}

/**
 * 查询月度统计表
 */
export const getMonthlyAttendance = async (yearMonth, leaderId = null) => {
  // 构建查询参数（兼容小程序环境，不使用 URLSearchParams）
  const params = []
  if (yearMonth) {
    params.push(`yearMonth=${encodeURIComponent(yearMonth)}`)
  }
  if (leaderId) {
    params.push(`leaderId=${encodeURIComponent(leaderId)}`)
  }
  const queryString = params.length > 0 ? `?${params.join('&')}` : ''
  return await get(`/monthly-attendance${queryString}`, {
    showLoading: true,
    loadingText: '加载中...',
    showError: true
  })
}

