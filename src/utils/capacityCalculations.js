export const parseCapacityNumber = (val) => {
  if (val === '' || val == null) return null
  const n = Number(val)
  return Number.isNaN(n) ? null : n
}

export const getSlotProductionHours = (slot) => {
  if (!slot) return null
  const fromHours = parseCapacityNumber(slot.productionHours)
  if (fromHours != null) return fromHours
  const fromText = parseCapacityNumber(slot.productionHoursText)
  if (fromText != null) return fromText
  const minutes = parseCapacityNumber(slot.productionMinutes)
  if (minutes == null) return null
  return minutes / 60
}

/**
 * 计算时段衍生指标
 * - 产出工时 = 单台工时(/min) × 实际产能(PCS) / 60
 * - 出勤工时 = 生产小时数(H) × 实际出勤人力
 * - 标准产能(PCS) = 标准产能(PCS/H) × 生产小时数
 * - 差异产能(PCS) = 标准产能(PCS/H) × 生产小时数 - 实际产能(PCS)
 * - 实际生产达成率(%) = 实际产能 / (标准产能 × 生产小时数) × 100
 */
export const calcCapacityMetrics = ({
  singleWorkHours,
  productionHours,
  standardCapacity,
  actualCapacity,
  actualManpower
} = {}) => {
  const sw = parseCapacityNumber(singleWorkHours)
  const ph = parseCapacityNumber(productionHours)
  const sc = parseCapacityNumber(standardCapacity)
  const ac = parseCapacityNumber(actualCapacity)
  const am = parseCapacityNumber(actualManpower)

  const outputHours = sw != null && ac != null ? (sw * ac) / 60 : null
  const attendanceHours = ph != null && am != null ? ph * am : null

  const standardOutputPcs = sc != null && ph != null ? sc * ph : null
  const capacityDifference =
    standardOutputPcs != null && ac != null ? standardOutputPcs - ac : null
  const productionAchievementRate =
    standardOutputPcs != null && ac != null && standardOutputPcs !== 0
      ? (ac / standardOutputPcs) * 100
      : null

  return {
    outputHours,
    attendanceHours,
    standardCapacityPcs: standardOutputPcs,
    capacityDifference,
    productionAchievementRate
  }
}

export const formatCapacityHours = (val) => {
  if (val == null) return ''
  return Number(val).toFixed(2)
}

export const formatCapacityDifference = (val) => {
  if (val == null) return ''
  const n = Number(val)
  return n % 1 === 0 ? String(n) : n.toFixed(2)
}

export const formatStandardCapacityPcs = formatCapacityDifference

export const formatAchievementRate = (val) => {
  if (val == null) return ''
  return `${Number(val).toFixed(2)}%`
}

/** 白班统计窗口：08:00-22:00（人力总达成率等） */
export const CAPACITY_DAY_SHIFT_START_MINUTES = 8 * 60
export const CAPACITY_DAY_SHIFT_END_MINUTES = 22 * 60

/** @deprecated 兼容旧 2 小时固定时段 */
export const CAPACITY_DAY_SHIFT_START_HOURS = [8, 10, 12, 14, 16, 18, 20]

/** 半小时粒度时间选项 00:00 - 23:30 */
export const HALF_HOUR_TIME_OPTIONS = (() => {
  const options = []
  for (let hour = 0; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      options.push(
        `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
      )
    }
  }
  return options
})()

export const parseTimeToMinutes = (timeStr) => {
  if (!timeStr || typeof timeStr !== 'string') return null
  const match = timeStr.trim().match(/^(\d{1,2}):(\d{2})$/)
  if (!match) return null
  const hour = Number(match[1])
  const minute = Number(match[2])
  if (Number.isNaN(hour) || Number.isNaN(minute) || minute < 0 || minute >= 60) {
    return null
  }
  return hour * 60 + minute
}

export const formatTimeSlotRange = (startTime, endTime) => {
  if (!startTime || !endTime) return ''
  return `${startTime}-${endTime}`
}

export const getTimeSlotDraftKey = (startTime, endTime, slotId) => {
  if (startTime && endTime) return formatTimeSlotRange(startTime, endTime)
  return `draft_${slotId}`
}

export const updateTimeSlotLabel = (slot) => {
  if (!slot) return ''
  const label = formatTimeSlotRange(slot.startTime, slot.endTime)
  slot.label = label
  return label
}

export const isValidTimeSlotRange = (startTime, endTime, { minMinutes = 30 } = {}) => {
  const start = parseTimeToMinutes(startTime)
  const end = parseTimeToMinutes(endTime)
  if (start == null || end == null) return false
  return end - start >= minMinutes
}

export const getTimeOptionIndex = (timeStr) => {
  if (!timeStr) return 0
  const idx = HALF_HOUR_TIME_OPTIONS.indexOf(timeStr)
  return idx >= 0 ? idx : 0
}

const resolveSlotTimeRange = (slot) => {
  if (!slot) return { start: null, end: null }
  if (slot.startTime && slot.endTime) {
    return {
      start: parseTimeToMinutes(slot.startTime),
      end: parseTimeToMinutes(slot.endTime)
    }
  }
  const range = String(slot.timeRange || '')
  const match = range.match(/^(\d{1,2}:\d{2})-(\d{1,2}:\d{2})$/)
  if (match) {
    return {
      start: parseTimeToMinutes(match[1]),
      end: parseTimeToMinutes(match[2])
    }
  }
  const startHour = parseCapacityNumber(slot.startHour)
  if (startHour != null) {
    return { start: startHour * 60, end: (startHour + 2) * 60 }
  }
  return { start: null, end: null }
}

/** 时段与白班窗口 08:00-22:00 有重叠即纳入人力总达成率统计 */
export const isSlotInDayShiftRange = (slot) => {
  const { start, end } = resolveSlotTimeRange(slot)
  if (start == null || end == null) return false
  return start < CAPACITY_DAY_SHIFT_END_MINUTES && end > CAPACITY_DAY_SHIFT_START_MINUTES
}

export const getManpowerAchievementGroupKey = (item, getReportDate) => {
  const date = getReportDate?.(item)
  if (!date || date === '—') return ''
  const account = String(item?.submitter || item?.teamLeader || '').trim()
  if (!account) return ''
  return `${date}__${account}`
}

export const calcManpowerTotalAchievementRate = (outputHoursSum, attendanceHoursSum) => {
  const output = parseCapacityNumber(outputHoursSum)
  const attendance = parseCapacityNumber(attendanceHoursSum)
  if (output == null || attendance == null || attendance <= 0) return null
  return (output / attendance) * 100
}

/**
 * 人力总达成率：同一日期、同一组长账号（提交人/组长）在 8:00-22:00 时段内
 * 所有记录的产出工时之和 / 出勤工时之和
 */
export const buildManpowerAchievementRateMap = (
  list,
  { getReportDate, getRecordTimeSlots, resolveSlotMetrics }
) => {
  const groupTotals = new Map()

  for (const item of list || []) {
    const key = getManpowerAchievementGroupKey(item, getReportDate)
    if (!key) continue

    if (!groupTotals.has(key)) {
      groupTotals.set(key, { outputHours: 0, attendanceHours: 0 })
    }
    const totals = groupTotals.get(key)
    const slots = getRecordTimeSlots?.(item) || []

    for (const slot of slots) {
      if (!isSlotInDayShiftRange(slot)) continue
      const metrics = resolveSlotMetrics?.(slot, item) || {}
      if (metrics.outputHours != null) totals.outputHours += metrics.outputHours
      if (metrics.attendanceHours != null) totals.attendanceHours += metrics.attendanceHours
    }
  }

  const rateMap = new Map()
  for (const [key, totals] of groupTotals) {
    const rate = calcManpowerTotalAchievementRate(totals.outputHours, totals.attendanceHours)
    if (rate != null) rateMap.set(key, rate)
  }
  return rateMap
}

export const resolveManpowerTotalAchievementRate = (item, rateMap, getReportDate) => {
  const key = getManpowerAchievementGroupKey(item, getReportDate)
  if (!key || !rateMap) return null
  return rateMap.get(key) ?? null
}
