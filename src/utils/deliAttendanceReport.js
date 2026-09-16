/**
 * 得力考勤报表数据处理
 */
import { queryAllCheckinRecords, queryDepartments, queryEmployees } from '@/utils/api/delicloud.js'

const pad = (n) => String(n).padStart(2, '0')

export const formatDate = (date) => {
  const d = date instanceof Date ? date : new Date(date)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export const formatDateCompact = (dateStr) => dateStr.replace(/-/g, '')

export const parseCheckData = (raw) => {
  if (!raw) return {}
  if (typeof raw === 'object') return raw
  try {
    return JSON.parse(raw)
  } catch {
    return {}
  }
}

export const formatCheckTime = (timestamp) => {
  if (!timestamp) return '-'
  const d = new Date(Number(timestamp) * 1000)
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}

const diffHours = (startTs, endTs) => {
  if (!startTs || !endTs || endTs <= startTs) return 0
  return Number(((endTs - startTs) / 3600).toFixed(1))
}

const getEmployeeDeptName = (employee, deptMap) => {
  const deptId = employee?.department_infos?.[0]?.id
  return deptMap[deptId] || '-'
}

const buildEmployeeMap = (employees) => {
  const byExt = {}
  const byUser = {}
  employees.forEach((emp) => {
    if (emp.ext_id) byExt[emp.ext_id] = emp
    if (emp.id) byUser[emp.id] = emp
  })
  return { byExt, byUser }
}

const resolveRecordPerson = (record, employeeMaps) => {
  const extra = parseCheckData(record.check_data)
  const emp =
    employeeMaps.byExt[record.ext_id] ||
    employeeMaps.byUser[record.user_id] ||
    null
  return {
    name: emp?.name || extra.member_name || '-',
    employeeNum: emp?.employee_num || extra.employee_num || '-',
    deptName: extra.dept_name || '-',
    title: emp?.department_infos?.[0]?.title || '-',
    extId: record.ext_id || emp?.ext_id || '',
    userKey: record.ext_id || record.user_id || extra.member_name || record.id
  }
}

const groupCheckins = (records, employeeMaps) => {
  const groups = {}

  records.forEach((record) => {
    const person = resolveRecordPerson(record, employeeMaps)
    const date = formatDate(Number(record.check_time) * 1000)
    const key = `${person.userKey}_${date}`
    if (!groups[key]) {
      groups[key] = {
        ...person,
        date,
        dateCompact: formatDateCompact(date),
        punches: []
      }
    }
    groups[key].punches.push(record)
    if (person.deptName && person.deptName !== '-') {
      groups[key].deptName = person.deptName
    }
  })

  return Object.values(groups).map((item) => {
    const sorted = item.punches.sort((a, b) => Number(a.check_time) - Number(b.check_time))
    const clockIn = sorted[0]
    const clockOut = sorted.length > 1 ? sorted[sorted.length - 1] : null
    const actualHours = diffHours(clockIn?.check_time, clockOut?.check_time)
    const missingOut = sorted.length === 1
    const lateMinutes = 0
    const earlyMinutes = 0

    return {
      ...item,
      clockInTime: formatCheckTime(clockIn?.check_time),
      clockOutTime: clockOut ? formatCheckTime(clockOut?.check_time) : '-',
      attendanceResult: missingOut ? '缺卡' : '正常',
      scheduleHours: 8,
      paidHours: actualHours > 0 ? actualHours : 0,
      actualHours: actualHours > 0 ? actualHours : 0,
      lateHours: lateMinutes / 60,
      earlyHours: earlyMinutes / 60,
      overtimeHours: actualHours > 8 ? Number((actualHours - 8).toFixed(1)) : 0,
      leaveHours: 0,
      leaveType: '-',
      tripDays: 0,
      outHours: 0,
      isAbnormal: missingOut || lateMinutes > 0 || earlyMinutes > 0,
      abnormalStatus: missingOut ? '缺卡' : lateMinutes > 0 ? '迟到' : earlyMinutes > 0 ? '早退' : '正常',
      ruleName: '默认规则',
      shiftName: '08:00-17:00'
    }
  })
}

const getDateRange = (startDate, endDate) => {
  if (!startDate || !endDate) return [startDate || endDate || getToday()].filter(Boolean)
  const dates = []
  const cur = new Date(`${startDate}T00:00:00`)
  const end = new Date(`${endDate}T00:00:00`)
  if (cur > end) return [startDate]
  while (cur <= end) {
    dates.push(formatDate(cur))
    cur.setDate(cur.getDate() + 1)
  }
  return dates
}

const buildEmployeePlaceholderRows = (employees, deptMap, startDate, endDate) => {
  const dates = getDateRange(startDate, endDate)
  const rows = []

  employees.forEach((emp) => {
    const deptId = emp.department_infos?.[0]?.id
    const deptName = emp._deptName || deptMap[deptId] || '-'
    const title = emp.department_infos?.[0]?.title || '-'
    dates.forEach((date) => {
      rows.push({
        name: emp.name || '-',
        employeeNum: emp.employee_num || '-',
        deptName,
        title,
        extId: emp.ext_id || '',
        userKey: emp.ext_id || emp.id || emp.name,
        date,
        dateCompact: formatDateCompact(date),
        clockInTime: '-',
        clockOutTime: '-',
        attendanceResult: '-',
        scheduleHours: 8,
        paidHours: 0,
        actualHours: 0,
        lateHours: 0,
        earlyHours: 0,
        overtimeHours: 0,
        leaveHours: 0,
        leaveType: '-',
        tripDays: 0,
        outHours: 0,
        isAbnormal: false,
        abnormalStatus: '正常',
        ruleName: '默认规则',
        shiftName: '08:00-17:00'
      })
    })
  })

  return rows
}

let cache = null

export const loadAttendanceBaseData = async (force = false) => {
  if (cache && !force) return cache

  uni.showLoading({ title: '加载中...', mask: true })

  try {
    const [departments, employees] = await Promise.all([
      queryDepartments(),
      queryEmployees()
    ])

    let checkins = []
    try {
      checkins = await queryAllCheckinRecords()
    } catch (error) {
      console.warn('打卡记录获取失败，将使用人员基础数据:', error)
    }

    const deptMap = {}
    departments.forEach((d) => {
      deptMap[d.id] = d.name
    })
    employees.forEach((emp) => {
      const deptId = emp.department_infos?.[0]?.id
      if (deptId && deptMap[deptId]) {
        emp._deptName = deptMap[deptId]
      }
    })

    const employeeMaps = buildEmployeeMap(employees)
    let dailyRows = groupCheckins(checkins, employeeMaps).map((row) => ({
      ...row,
      deptName: row.deptName !== '-' ? row.deptName : employees.find(
        (e) => e.ext_id === row.extId || e.name === row.name
      )?._deptName || '-'
    }))

    cache = { departments, employees, checkins, deptMap, dailyRows }
    return cache
  } finally {
    uni.hideLoading()
  }
}

export const getDailyRowsForRange = (base, startDate, endDate) => {
  const rows = filterByDateRange(base.dailyRows, startDate, endDate)
  if (rows.length) {
    return { rows, fromCheckin: true }
  }
  return {
    rows: buildEmployeePlaceholderRows(
      base.employees,
      base.deptMap,
      startDate || getToday(),
      endDate || startDate || getToday()
    ),
    fromCheckin: false
  }
}

export const clearAttendanceCache = () => {
  cache = null
}

export const filterByDateRange = (rows, startDate, endDate) => {
  if (!startDate && !endDate) return rows
  return rows.filter((row) => {
    if (startDate && row.date < startDate) return false
    if (endDate && row.date > endDate) return false
    return true
  })
}

export const filterByKeyword = (rows, keyword) => {
  const kw = (keyword || '').trim()
  if (!kw) return rows
  return rows.filter(
    (row) =>
      (row.name || '').includes(kw) ||
      (row.employeeNum || '').includes(kw) ||
      (row.deptName || '').includes(kw)
  )
}

export const buildDailyReport = (rows) => rows

export const buildAbnormalReport = (rows, status = '全部') => {
  const abnormal = rows.filter((row) => row.isAbnormal)
  if (status === '全部') return abnormal
  return abnormal.filter((row) => row.abnormalStatus === status)
}

export const buildMonthlyReport = (rows) => {
  const map = {}
  rows.forEach((row) => {
    const key = `${row.userKey}_${row.deptName}`
    if (!map[key]) {
      map[key] = {
        name: row.name,
        employeeNum: row.employeeNum,
        deptName: row.deptName,
        title: row.title,
        expectDays: 0,
        actualDays: 0,
        expectHours: 0,
        actualHours: 0,
        paidHours: 0,
        lateCount: 0,
        lateHours: 0,
        earlyCount: 0,
        earlyHours: 0,
        missingCount: 0,
        absentCount: 0,
        tripCount: 0,
        outCount: 0,
        manualCount: 0,
        overtimeHours: 0,
        leaveHours: 0,
        dailyResults: []
      }
    }
    const item = map[key]
    item.expectDays += 1
    if (row.actualHours > 0) item.actualDays += 1
    item.expectHours += row.scheduleHours
    item.actualHours += row.actualHours
    item.paidHours += row.paidHours
    if (row.lateHours > 0) {
      item.lateCount += 1
      item.lateHours += row.lateHours
    }
    if (row.earlyHours > 0) {
      item.earlyCount += 1
      item.earlyHours += row.earlyHours
    }
    if (row.attendanceResult === '缺卡') item.missingCount += 1
    item.overtimeHours += row.overtimeHours
    item.leaveHours += row.leaveHours
    item.dailyResults.push(`${row.dateCompact}:${row.attendanceResult}`)
  })
  return Object.values(map)
}

export const buildDeptReport = (rows) => {
  const map = {}
  rows.forEach((row) => {
    const dept = row.deptName || '未分配'
    if (!map[dept]) {
      map[dept] = {
        deptName: dept,
        expectCount: 0,
        normalCount: 0,
        lateCount: 0,
        earlyCount: 0,
        missingCount: 0,
        leaveCount: 0,
        tripCount: 0,
        outCount: 0,
        overtimeHours: 0,
        absentCount: 0
      }
    }
    const item = map[dept]
    item.expectCount += 1
    if (row.attendanceResult === '正常') item.normalCount += 1
    if (row.lateHours > 0) item.lateCount += 1
    if (row.earlyHours > 0) item.earlyCount += 1
    if (row.attendanceResult === '缺卡') item.missingCount += 1
    if (row.leaveHours > 0) item.leaveCount += 1
    if (row.tripDays > 0) item.tripCount += 1
    if (row.outHours > 0) item.outCount += 1
    item.overtimeHours += row.overtimeHours
    if (row.actualHours <= 0) item.absentCount += 1
  })
  return Object.values(map)
}

export const getToday = () => formatDate(new Date())

export const getMonthStart = () => {
  const d = new Date()
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-01`
}
