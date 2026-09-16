export const normalizeShiftType = (shiftType) => {
  const value = String(shiftType ?? '').trim().toLowerCase()
  if (value === 'night' || value === '夜班' || value === 'night_shift') {
    return 'night'
  }
  return 'day'
}

export const isNightShiftType = (shiftType) => normalizeShiftType(shiftType) === 'night'

const getOverlapMinutes = (rangeStart, rangeEnd, windowStart, windowEnd) => {
  const overlapStart = Math.max(rangeStart, windowStart)
  const overlapEnd = Math.min(rangeEnd, windowEnd)
  return Math.max(0, overlapEnd - overlapStart)
}

export const calculateDurationWithExcludeWindows = (
  diffMinutes,
  startTotalMinutes,
  endTotalMinutes,
  department = '',
  startDate = null,
  endDate = null,
  shiftType = 'day'
) => {
  const isNightShift = isNightShiftType(shiftType)
  const isSMTDepartment = department && department.toUpperCase().includes('SMT')
  const EXCLUDE_WINDOWS = []

  if (isNightShift) {
    if (isSMTDepartment) {
      EXCLUDE_WINDOWS.push({ start: 23 * 60, end: 23 * 60 + 30 })
    } else {
      EXCLUDE_WINDOWS.push({ start: 23 * 60, end: 24 * 60 })
    }
  } else {
    EXCLUDE_WINDOWS.push({ start: 12 * 60, end: 13 * 60 })
  }

  let totalExcludedMinutes = 0

  if (startDate && endDate) {
    const startDay = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate())
    const endDay = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate())
    const daysDiff = Math.floor((endDay - startDay) / (1000 * 60 * 60 * 24))

    for (let day = 0; day <= daysDiff; day++) {
      EXCLUDE_WINDOWS.forEach((window) => {
        const windowStart = window.start
        const windowEnd = window.end

        if (day === 0) {
          const dayStartMinutes = startTotalMinutes
          const dayEndMinutes = day === daysDiff ? endTotalMinutes : 24 * 60
          totalExcludedMinutes += getOverlapMinutes(dayStartMinutes, dayEndMinutes, windowStart, windowEnd)
        } else if (day === daysDiff) {
          totalExcludedMinutes += getOverlapMinutes(0, endTotalMinutes, windowStart, windowEnd)
        } else {
          totalExcludedMinutes += getOverlapMinutes(0, 24 * 60, windowStart, windowEnd)
        }
      })
    }
  } else if (endTotalMinutes <= startTotalMinutes) {
    EXCLUDE_WINDOWS.forEach((window) => {
      totalExcludedMinutes += getOverlapMinutes(startTotalMinutes, 24 * 60, window.start, window.end)
      totalExcludedMinutes += getOverlapMinutes(0, endTotalMinutes, window.start, window.end)
    })
  } else {
    EXCLUDE_WINDOWS.forEach((window) => {
      totalExcludedMinutes += getOverlapMinutes(startTotalMinutes, endTotalMinutes, window.start, window.end)
    })
  }

  let effectiveMinutes = diffMinutes - totalExcludedMinutes
  if (effectiveMinutes < 0) {
    effectiveMinutes = 0
  }

  const hours = Math.floor(effectiveMinutes / 60)
  const minutes = effectiveMinutes % 60

  if (minutes === 0) {
    return `${hours}小时`
  }
  return `${hours}小时${minutes}分钟`
}

export const parseDurationTextToMinutes = (durationStr) => {
  if (!durationStr) return 0
  const hourMatch = durationStr.match(/(\d+)小时/)
  const minuteMatch = durationStr.match(/(\d+)分钟/)
  const hours = hourMatch ? parseInt(hourMatch[1], 10) : 0
  const minutes = minuteMatch ? parseInt(minuteMatch[1], 10) : 0
  return hours * 60 + minutes
}

export const calculateAttendanceDuration = (startTime, endTime, department = '', shiftType = 'day') => {
  if (!startTime || !endTime) return ''

  const normalizedShiftType = normalizeShiftType(shiftType)
  let startDate
  let endDate
  let startHour
  let startMinute
  let endHour
  let endMinute

  if (/^\d{2}:\d{2}$/.test(startTime)) {
    ;[startHour, startMinute] = startTime.split(':').map(Number)
    startDate = new Date()
    startDate.setHours(startHour, startMinute, 0, 0)
  } else if (startTime.includes('T')) {
    startDate = new Date(startTime)
    startHour = startDate.getHours()
    startMinute = startDate.getMinutes()
  } else if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(startTime)) {
    const [datePart, timePart] = startTime.split(' ')
    const [year, month, day] = datePart.split('-').map(Number)
    const [hour, minute] = timePart.split(':').map(Number)
    startDate = new Date(year, month - 1, day, hour, minute, 0, 0)
    startHour = hour
    startMinute = minute
  } else {
    return ''
  }

  if (/^\d{2}:\d{2}$/.test(endTime)) {
    ;[endHour, endMinute] = endTime.split(':').map(Number)
    endDate = new Date()
    endDate.setHours(endHour, endMinute, 0, 0)
    if (endDate <= startDate) {
      endDate.setDate(endDate.getDate() + 1)
    }
  } else if (endTime.includes('T')) {
    endDate = new Date(endTime)
    endHour = endDate.getHours()
    endMinute = endDate.getMinutes()
  } else if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(endTime)) {
    const [datePart, timePart] = endTime.split(' ')
    const [year, month, day] = datePart.split('-').map(Number)
    const [hour, minute] = timePart.split(':').map(Number)
    endDate = new Date(year, month - 1, day, hour, minute, 0, 0)
    endHour = hour
    endMinute = minute
  } else {
    return ''
  }

  const diffMs = endDate.getTime() - startDate.getTime()
  const diffMinutes = Math.floor(diffMs / (1000 * 60))

  if (/^\d{2}:\d{2}$/.test(startTime) && /^\d{2}:\d{2}$/.test(endTime)) {
    const startTotalMinutes = startHour * 60 + startMinute
    const endTotalMinutes = endHour * 60 + endMinute
    if (endTotalMinutes <= startTotalMinutes) {
      const actualDiffMinutes = 24 * 60 - startTotalMinutes + endTotalMinutes
      return calculateDurationWithExcludeWindows(
        actualDiffMinutes,
        startTotalMinutes,
        endTotalMinutes,
        department,
        null,
        null,
        normalizedShiftType
      )
    }
  }

  const startTotalMinutes = startHour * 60 + startMinute
  const endTotalMinutes = endHour * 60 + endMinute

  return calculateDurationWithExcludeWindows(
    diffMinutes,
    startTotalMinutes,
    endTotalMinutes,
    department,
    startDate,
    endDate,
    normalizedShiftType
  )
}
