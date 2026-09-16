/**
 * 物料标签 Reel ID 解析
 * 格式：段1@段2@段3@段4@段5@段6@段7
 * 例：260329121225675025@004.070.0059754@126013@FX-01129@26137@2026032904@52
 */

export const REEL_SEGMENT_COUNT = 7

export const createEmptyReelRecord = () => ({
  rawCode: '',
  materialBaseCode: '',
  partNumber: '',
  versionCode: '',
  versionDesc: '',
  designCode: '',
  lotNumber: '',
  quantityPcs: ''
})

export const REEL_FIELD_LABELS = {
  materialBaseCode: '厂内物料标识',
  partNumber: 'P/N 物料号',
  versionCode: 'V.code 版本/合规编码',
  versionDesc: 'V.DES 物料版本号',
  designCode: 'D.C 设计代码',
  lotNumber: '批次号 Lot',
  quantityPcs: "Q'ty 包装数量"
}

/**
 * @param {string} input 扫码或粘贴的完整 Reel ID
 * @returns {{ valid: boolean, error?: string, record?: object }}
 */
export const parseReelId = (input) => {
  const raw = String(input || '').trim().replace(/\s+/g, '')
  if (!raw) {
    return { valid: false, error: '请扫描或输入 Reel ID' }
  }

  // 按 @ 严格切分
  const segments = raw.split('@').map((p) => p.trim())

  if (segments.length !== REEL_SEGMENT_COUNT) {
    return {
      valid: false,
      error: `格式不正确：应为 ${REEL_SEGMENT_COUNT} 段（用 @ 分隔），当前 ${segments.length} 段`
    }
  }

  if (segments.some((s) => !s)) {
    return { valid: false, error: '格式不正确：存在空字段段' }
  }

  const [
    materialBaseCode,
    partNumber,
    versionCode,
    versionDesc,
    designCode,
    lotNumber,
    qtyRaw
  ] = segments

  if (!/^\d+$/.test(materialBaseCode)) {
    return { valid: false, error: '第1段厂内物料标识应为数字' }
  }
  if (!partNumber) {
    return { valid: false, error: '第2段 P/N 物料号不能为空' }
  }

  const quantityPcs = Number(qtyRaw)
  if (!Number.isFinite(quantityPcs) || quantityPcs <= 0 || !/^\d+$/.test(qtyRaw)) {
    return { valid: false, error: "第7段 Q'ty 包装数量应为正整数" }
  }

  return {
    valid: true,
    record: {
      rawCode: raw,
      materialBaseCode,
      partNumber,
      versionCode,
      versionDesc,
      designCode,
      lotNumber,
      quantityPcs: String(quantityPcs)
    }
  }
}

/**
 * 由表单字段重拼 rawCode，保证与后端「字段须与 rawCode 一致」校验对齐
 */
export const composeRawCode = (record) => {
  const qty = String(record.quantityPcs ?? '').trim()
  return [
    String(record.materialBaseCode || '').trim(),
    String(record.partNumber || '').trim(),
    String(record.versionCode || '').trim(),
    String(record.versionDesc || '').trim(),
    String(record.designCode || '').trim(),
    String(record.lotNumber || '').trim(),
    qty
  ].join('@')
}

export const buildInboundPayload = (record) => {
  const quantityPcs = Number(record.quantityPcs) || 0
  const payload = {
    materialBaseCode: String(record.materialBaseCode || '').trim(),
    partNumber: String(record.partNumber || '').trim(),
    versionCode: String(record.versionCode || '').trim(),
    versionDesc: String(record.versionDesc || '').trim(),
    designCode: String(record.designCode || '').trim(),
    lotNumber: String(record.lotNumber || '').trim(),
    quantityPcs
  }
  // 提交前按当前字段重拼，避免人工改数量后与原码不一致被 400
  payload.rawCode = composeRawCode({ ...payload, quantityPcs })
  return payload
}

export const formatReelIdHint = () =>
  '例：260329121225675025@004.070.0059754@126013@FX-01129@26137@2026032904@52'

/**
 * 已入库 Reel ID 本地去重（与后端 rawCode UNIQUE 配合）
 * storage: { [rawCode]: { inboundAt, partNumber, lotNumber, quantityPcs } }
 */
const INBOUND_REEL_STORAGE_KEY = 'warehouse_inbound_reel_ids'

/** 与后端一致：去首尾空白、去掉中间空格 */
export const normalizeReelIdKey = (rawCode) =>
  String(rawCode || '')
    .trim()
    .replace(/\s+/g, '')

export const getInboundReelMap = () => {
  try {
    const raw = uni.getStorageSync(INBOUND_REEL_STORAGE_KEY)
    return raw && typeof raw === 'object' ? raw : {}
  } catch (e) {
    return {}
  }
}

export const isReelAlreadyInbound = (rawCode) => {
  const key = normalizeReelIdKey(rawCode)
  if (!key) return false
  return !!getInboundReelMap()[key]
}

export const markReelAsInbound = (rawCode, meta = {}) => {
  const key = normalizeReelIdKey(rawCode)
  if (!key) return
  const map = getInboundReelMap()
  map[key] = {
    rawCode: key,
    partNumber: meta.partNumber || '',
    lotNumber: meta.lotNumber || '',
    quantityPcs: Number(meta.quantityPcs) || 0,
    inboundAt: meta.inboundAt || new Date().toISOString()
  }
  uni.setStorageSync(INBOUND_REEL_STORAGE_KEY, map)
}

export const getInboundReelRecord = (rawCode) => {
  const key = normalizeReelIdKey(rawCode)
  if (!key) return null
  return getInboundReelMap()[key] || null
}
