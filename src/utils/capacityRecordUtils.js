import { parseTimeToMinutes } from './capacityCalculations.js'

/** 解析单条产能记录的 timeSlots（兼容多种后端字段） */
export const parseRecordTimeSlots = (item) => {
  if (!item || typeof item !== 'object') return []

  let raw = item.timeSlots ?? item.time_slots
  if (typeof raw === 'string') {
    try {
      raw = JSON.parse(raw)
    } catch {
      raw = []
    }
  }

  if (!Array.isArray(raw)) return []
  return raw.filter((slot) => slot && typeof slot === 'object')
}

/** 管理页分组键：同一天、同组长、同制程段、同默认机型 */
export const getCapacityRecordMergeKey = (item) => {
  const reportDate = item?.reportDate || item?.startDate || ''
  const processSegment = String(item?.processSegment || item?.process || '').trim()
  const teamLeader = String(item?.teamLeader || '').trim()
  const machineModel = String(item?.machineModel || item?.model || '').trim()
  return `${reportDate}__${teamLeader}__${processSegment}__${machineModel}`
}

/** 提报上下文匹配键：同一天、同线体、同组长、同制程段 */
export const getCapacitySubmitContextKey = (item) => {
  const reportDate = String(item?.reportDate || item?.startDate || '').trim()
  const productionLine = String(item?.productionLine || '').trim()
  const processSegment = String(item?.processSegment || item?.process || '').trim()
  const teamLeader = String(item?.teamLeader || '').trim()
  return `${reportDate}__${productionLine}__${teamLeader}__${processSegment}`
}

export const findCapacityRecordForContext = (list, context) => {
  const targetKey = getCapacitySubmitContextKey(context)
  if (!targetKey || targetKey.endsWith('__')) return null
  return (list || []).find((item) => getCapacitySubmitContextKey(item) === targetKey) || null
}

/** 业务唯一键：同一天、同线体、同组长、同制程段各一条记录 */
export const buildCapacityRecordKey = (context) => getCapacitySubmitContextKey(context)

export const isSameCapacityContext = (record, context) => {
  if (!record || !context) return false
  return getCapacitySubmitContextKey(record) === getCapacitySubmitContextKey(context)
}

export const mergeSubmitTimeSlots = (existingSlots = [], localSlots = []) => {
  const map = new Map()
  const put = (slot) => {
    const key = getTimeSlotDedupeKey(slot)
    if (!key) return
    map.set(key, slot)
  }
  existingSlots.forEach(put)
  localSlots.forEach(put)
  return sortTimeSlots([...map.values()])
}

/**
 * 合并服务端与本地时段用于提交：保留未改动的已提交时段，替换/新增待提交或修改中的时段。
 * 修改时段若变更了时间范围，会移除原时段键，避免旧数据残留。
 */
export const buildSlotsForSubmit = (serverSlots = [], localSlots = []) => {
  const unchangedSubmitted = localSlots.filter((s) => s.submitted && !s.editing)
  const submittingSlots = localSlots.filter((s) => !s.submitted || s.editing)

  const map = new Map()
  const put = (slot) => {
    const key = getTimeSlotDedupeKey(slot)
    if (!key) return
    map.set(key, slot)
  }

  serverSlots.forEach(put)
  unchangedSubmitted.forEach(put)

  submittingSlots.forEach((slot) => {
    if (slot.submitted && slot.editing && slot._editOrigin) {
      const origKey = getTimeSlotDedupeKey(slot._editOrigin)
      if (origKey) map.delete(origKey)
    }
  })

  submittingSlots.forEach(put)
  return sortTimeSlots([...map.values()])
}

export const getRecordMachineModel = (item) =>
  String(item?.machineModel || item?.model || '').trim()

/** 时段实际机型：优先时段字段，否则回退记录默认机型 */
export const getSlotEffectiveMachineModel = (slot, record) => {
  const slotModel = String(slot?.machineModel || '').trim()
  if (slotModel) return slotModel
  return getRecordMachineModel(record)
}

/**
 * 管理页展示：同一提报记录下，不同时段机型拆成多条展示记录。
 * 仅影响展示/导出分组，不改变后端存储结构。
 */
export const splitRecordsBySlotMachineModel = (list = []) => {
  if (!Array.isArray(list) || list.length === 0) return []

  const result = []

  for (const item of list) {
    const slots = parseRecordTimeSlots(item)
    if (slots.length === 0) {
      result.push(item)
      continue
    }

    const groups = new Map()
    for (const slot of slots) {
      const model = getSlotEffectiveMachineModel(slot, item) || '_unknown_'
      if (!groups.has(model)) groups.set(model, [])
      groups.get(model).push(slot)
    }

    if (groups.size <= 1) {
      const onlyModel = [...groups.keys()][0]
      const displayModel = onlyModel === '_unknown_' ? getRecordMachineModel(item) : onlyModel
      result.push({
        ...item,
        machineModel: displayModel || item.machineModel,
        model: displayModel || item.model,
        timeSlots: sortTimeSlots(slots)
      })
      continue
    }

    const contextKey = getCapacitySubmitContextKey(item)
    const sortedGroups = [...groups.entries()].sort((a, b) => {
      const am = parseTimeToMinutes(a[1][0]?.startTime) ??
        parseTimeToMinutes(String(a[1][0]?.timeRange || '').split('-')[0])
      const bm = parseTimeToMinutes(b[1][0]?.startTime) ??
        parseTimeToMinutes(String(b[1][0]?.timeRange || '').split('-')[0])
      return (am ?? 9999) - (bm ?? 9999)
    })

    sortedGroups.forEach(([model, modelSlots], splitIndex) => {
      const displayModel = model === '_unknown_' ? getRecordMachineModel(item) : model
      result.push({
        ...item,
        machineModel: displayModel,
        model: displayModel,
        timeSlots: sortTimeSlots(modelSlots),
        _splitFromRecordId: item.id,
        _splitIndex: splitIndex,
        _displayGroupKey: `${contextKey}__${displayModel}`
      })
    })
  }

  return result
}

export const getTimeSlotDedupeKey = (slot) => {
  if (!slot) return ''
  if (slot.startTime && slot.endTime) return `${slot.startTime}-${slot.endTime}`
  if (slot.timeRange) return String(slot.timeRange).trim()
  if (slot.startHour != null && slot.startHour !== '') return `hour_${slot.startHour}`
  return JSON.stringify(slot)
}

export const sortTimeSlots = (slots = []) => {
  return [...slots].sort((a, b) => {
    const am = parseTimeToMinutes(a?.startTime) ?? parseTimeToMinutes(String(a?.timeRange || '').split('-')[0])
    const bm = parseTimeToMinutes(b?.startTime) ?? parseTimeToMinutes(String(b?.timeRange || '').split('-')[0])
    return (am ?? 9999) - (bm ?? 9999)
  })
}

const getRecordTimestamp = (item) => {
  const raw = item?.updatedAt || item?.createdAt
  if (!raw) return 0
  const ts = new Date(raw).getTime()
  return Number.isNaN(ts) ? 0 : ts
}

/**
 * 合并产能记录：相同日期 + 组长 + 制程段 + 机型为一组，时段按开始时间排序。
 */
export const mergeCapacityRecords = (list = []) => {
  if (!Array.isArray(list) || list.length === 0) return []

  const groups = new Map()

  for (const item of list) {
    const key = getCapacityRecordMergeKey(item)
    if (!groups.has(key)) {
      groups.set(key, {
        record: { ...item, timeSlots: parseRecordTimeSlots(item) },
        slotMap: new Map(),
        productionLines: new Set(),
        submitters: new Set()
      })
    }

    const group = groups.get(key)
    const recordTs = getRecordTimestamp(item)

    if (item.productionLine) {
      group.productionLines.add(String(item.productionLine).trim())
    }
    if (item.submitter) {
      group.submitters.add(String(item.submitter).trim())
    }

    if (recordTs >= getRecordTimestamp(group.record)) {
      group.record = { ...group.record, ...item }
    }

    for (const slot of parseRecordTimeSlots(item)) {
      const slotKey = getTimeSlotDedupeKey(slot)
      if (!slotKey) continue
      const prev = group.slotMap.get(slotKey)
      if (!prev || recordTs >= prev.ts) {
        group.slotMap.set(slotKey, { slot, ts: recordTs })
      }
    }
  }

  return [...groups.values()].map(({ record, slotMap, productionLines, submitters }) => {
    const lines = [...productionLines].filter(Boolean)
    const mergedSubmitters = [...submitters].filter(Boolean)
    return {
      ...record,
      productionLine: lines.length > 1 ? lines.join('、') : lines[0] || record.productionLine || '',
      submitter: mergedSubmitters.length > 1 ? mergedSubmitters.join('、') : mergedSubmitters[0] || record.submitter || '',
      timeSlots: sortTimeSlots([...slotMap.values()].map((entry) => entry.slot))
    }
  })
}
