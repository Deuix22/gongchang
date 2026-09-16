const STORAGE_PREFIX = 'capacityDraft'

export const getAccountKey = () => {
  const userInfo = uni.getStorageSync('userInfo') || {}
  return String(
    userInfo.userId ||
      userInfo.id ||
      userInfo.username ||
      userInfo.userName ||
      userInfo.openid ||
      'anonymous'
  )
}

const getStorageKey = (draftKey) => {
  return `${STORAGE_PREFIX}_${getAccountKey()}_${draftKey}`
}

/** 草稿隔离键：同一天、同线体、不同制程段各自独立 */
export const buildCapacityDraftKey = ({ reportDate, productionLine, processSegment }) => {
  const date = String(reportDate || '').trim()
  const line = String(productionLine || '').trim()
  const segment = String(processSegment || '').trim()
  if (!date) return ''
  return `${date}__${line || '_'}__${segment || '_'}`
}

/** @typedef {Object} StoredSlot
 * @property {string} [startTime] - HH:mm
 * @property {string} [endTime] - HH:mm
 * @property {string} [machineModel] - 时段机型（空则使用表单默认机型）
 * @property {number} [startHour] - 兼容旧草稿
 * @property {string} productionMinutes
 * @property {string} productionHoursText
 * @property {string} standardCapacity
 * @property {string} actualCapacity
 * @property {string} standardManpower
 * @property {string} actualManpower
 * @property {string} borrowedInManpower
 * @property {string} borrowedInPosition
 * @property {string} lentOutManpower
 * @property {string} lentOutPosition
 * @property {string} ictPassRate
 * @property {string} fctPassRate
 * @property {string} reasonRemark
 * @property {boolean} submitted
 */

const parseDraftRaw = (raw) => {
  if (!raw || typeof raw !== 'object') return null
  return {
    form: raw.form && typeof raw.form === 'object' ? raw.form : {},
    slots: raw.slots && typeof raw.slots === 'object' ? raw.slots : {}
  }
}

/**
 * @param {string} draftKey buildCapacityDraftKey 返回值
 * @param {{ legacyReportDate?: string }} [options] 兼容旧版仅按日期存的草稿
 * @returns {{ form: Object, slots: Record<string, StoredSlot> } | null}
 */
export const loadCapacityDraft = (draftKey, options = {}) => {
  if (!draftKey) return null
  const raw = uni.getStorageSync(getStorageKey(draftKey))
  const parsed = parseDraftRaw(raw)
  if (parsed) return parsed

  // 新格式 key 含线体/制程段，禁止回退到仅日期的旧草稿，避免跨制程段串数据
  if (draftKey.includes('__')) {
    return null
  }

  const legacyDate = options.legacyReportDate
  if (legacyDate && legacyDate !== draftKey) {
    const legacyRaw = uni.getStorageSync(getStorageKey(legacyDate))
    return parseDraftRaw(legacyRaw)
  }
  return null
}

/**
 * @param {string} draftKey
 * @param {{ form: Object, slots: Record<string, StoredSlot> }} draft
 */
export const saveCapacityDraft = (draftKey, draft) => {
  if (!draftKey) return
  uni.setStorageSync(getStorageKey(draftKey), {
    form: { ...draft.form },
    slots: { ...draft.slots },
    recordId: draft.recordId || '',
    updatedAt: Date.now()
  })
}

export const serializeSlot = (slot) => ({
  startTime: slot.startTime ?? '',
  endTime: slot.endTime ?? '',
  machineModel: slot.machineModel ?? '',
  startHour: slot.startHour,
  productionMinutes: slot.productionMinutes ?? '',
  productionHoursText: slot.productionHoursText ?? '',
  standardCapacity: slot.standardCapacity ?? '',
  actualCapacity: slot.actualCapacity ?? '',
  standardManpower: slot.standardManpower ?? '',
  actualManpower: slot.actualManpower ?? '',
  borrowedInManpower: slot.borrowedInManpower ?? '',
  borrowedInPosition: slot.borrowedInPosition ?? '',
  lentOutManpower: slot.lentOutManpower ?? '',
  lentOutPosition: slot.lentOutPosition ?? '',
  ictPassRate: slot.ictPassRate ?? '',
  fctPassRate: slot.fctPassRate ?? '',
  reasonRemark: slot.reasonRemark ?? '',
  submitted: !!slot.submitted
})
