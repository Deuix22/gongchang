/**
 * 箱单号 / 生产批号解析
 *
 * 生产批号：GR-HFYZBU + 8位批次码 + 可选后缀（01H / 02H / 01B / 02B 等）
 *   例：GR-HFYZBU26070236、GR-HFYZBU2607055201H
 *
 * 箱单号：HFSYHFYZBU + 8位批次码 + 可选后缀 + 6位流水号
 *   例：HFSYHFYZBU26040149000001
 *       HFSYHFYZBU2607055201H000001  （后缀在流水号之前）
 *
 * 出货比对匹配键 batchKey = 前缀后的 8 位数字（不含后缀、不含流水）
 */

export const BATCH_PREFIX = 'GR-HFYZBU'
export const BOX_PREFIX = 'HFSYHFYZBU'
export const BATCH_KEY_LENGTH = 8
export const BOX_SERIAL_LENGTH = 6

/** 规范化后用于匹配的批号前缀（去掉连字符） */
const BATCH_PREFIX_NORM = BATCH_PREFIX.replace(/-/g, '')

/** 批号/箱单可选后缀：2 位数字 + 1 位字母，如 01H、02B */
export const BATCH_SUFFIX_PATTERN = '\\d{2}[A-Z]'

const normalizeInput = (input) =>
  String(input || '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '')
    .replace(/-/g, '')

/**
 * 格式化完整生产批号
 * @param {string} batchKey 8 位
 * @param {string} [suffix] 如 01H、02B
 */
export const formatProductionBatchNo = (batchKey, suffix = '') => {
  const key = String(batchKey || '').toUpperCase()
  const suf = String(suffix || '').toUpperCase().replace(/-/g, '')
  return `${BATCH_PREFIX}${key}${suf}`
}

/**
 * 格式化完整箱单号（后缀在流水号之前）
 * @param {string} batchKey 8 位
 * @param {string} serialNo 6 位流水
 * @param {string} [suffix] 如 01H、02B
 */
export const formatBoxNo = (batchKey, serialNo, suffix = '') => {
  const key = String(batchKey || '').toUpperCase()
  const serial = String(serialNo || '').toUpperCase()
  const suf = String(suffix || '').toUpperCase().replace(/-/g, '')
  return `${BOX_PREFIX}${key}${suf}${serial}`
}

/**
 * 从生产批号提取 batchKey / suffix / 规范化完整批号
 * @returns {{ batchKey: string, suffix: string, productionBatchNo: string } | null}
 */
export const parseProductionBatch = (input) => {
  const raw = normalizeInput(input)
  if (!raw) return null

  const m = raw.match(
    new RegExp(
      `^${BATCH_PREFIX_NORM}(\\d{${BATCH_KEY_LENGTH}})(${BATCH_SUFFIX_PATTERN})?$`,
      'i'
    )
  )
  if (!m) return null

  const batchKey = m[1]
  const suffix = (m[2] || '').toUpperCase()
  return {
    batchKey,
    suffix,
    productionBatchNo: formatProductionBatchNo(batchKey, suffix)
  }
}

/**
 * 从箱单号提取 batchKey / serialNo / suffix / 完整箱单号
 * 格式：前缀 + 8位批次 + 可选后缀(01H等) + 6位流水
 * @returns {{ batchKey: string, serialNo: string, suffix: string, boxNo: string } | null}
 */
export const parseBoxNo = (input) => {
  const raw = normalizeInput(input)
  if (!raw) return null

  // 带后缀：HFSYHFYZBU + 8位 + 01H/02B + 6位流水
  const withSuffix = raw.match(
    new RegExp(
      `^${BOX_PREFIX}(\\d{${BATCH_KEY_LENGTH}})(${BATCH_SUFFIX_PATTERN})(\\d{${BOX_SERIAL_LENGTH}})$`,
      'i'
    )
  )
  if (withSuffix) {
    const batchKey = withSuffix[1]
    const suffix = withSuffix[2].toUpperCase()
    const serialNo = withSuffix[3]
    return {
      batchKey,
      serialNo,
      suffix,
      boxNo: formatBoxNo(batchKey, serialNo, suffix)
    }
  }

  // 无后缀：HFSYHFYZBU + 8位 + 6位流水
  const plain = raw.match(
    new RegExp(
      `^${BOX_PREFIX}(\\d{${BATCH_KEY_LENGTH}})(\\d{${BOX_SERIAL_LENGTH}})$`,
      'i'
    )
  )
  if (plain) {
    const batchKey = plain[1]
    const serialNo = plain[2]
    return {
      batchKey,
      serialNo,
      suffix: '',
      boxNo: formatBoxNo(batchKey, serialNo)
    }
  }

  return null
}

/**
 * 从任意已录入批号字符串中提取 8 位匹配码（忽略后缀）
 */
export const extractBatchKeyFromProductionBatch = (productionBatchNo) => {
  const parsed = parseProductionBatch(productionBatchNo)
  if (parsed) return parsed.batchKey

  const raw = normalizeInput(productionBatchNo)
  const m = raw.match(new RegExp(`${BATCH_PREFIX_NORM}(\\d{${BATCH_KEY_LENGTH}})`, 'i'))
  return m ? m[1] : ''
}

/**
 * 从扫码原始串中尽量抽出箱单号/批号
 */
export const extractCodeCandidate = (input) => {
  const raw = normalizeInput(input)
  if (!raw) return ''

  // 优先匹配带后缀的箱单（更长）
  const boxWithSuffix = raw.match(
    new RegExp(
      `${BOX_PREFIX}\\d{${BATCH_KEY_LENGTH}}${BATCH_SUFFIX_PATTERN}\\d{${BOX_SERIAL_LENGTH}}`,
      'i'
    )
  )
  if (boxWithSuffix) return boxWithSuffix[0]

  const boxPlain = raw.match(
    new RegExp(`${BOX_PREFIX}\\d{${BATCH_KEY_LENGTH + BOX_SERIAL_LENGTH}}`, 'i')
  )
  if (boxPlain) return boxPlain[0]

  const batchEmbedded = raw.match(
    new RegExp(
      `${BATCH_PREFIX_NORM}\\d{${BATCH_KEY_LENGTH}}(?:${BATCH_SUFFIX_PATTERN})?`,
      'i'
    )
  )
  if (batchEmbedded) return batchEmbedded[0]

  return raw
}

/**
 * @param {string} input 箱单号或生产批号（支持扫码原始串、批号/箱单后缀）
 */
export const parseBoxOrBatchCode = (input) => {
  const raw = extractCodeCandidate(input)

  if (!raw) {
    return { valid: false, error: '请输入或扫描箱单号 / 生产批号' }
  }

  const boxParsed = parseBoxNo(raw)
  if (boxParsed) {
    return {
      valid: true,
      type: 'box',
      batchKey: boxParsed.batchKey,
      suffix: boxParsed.suffix,
      serialNo: boxParsed.serialNo,
      productionBatchNo: formatProductionBatchNo(boxParsed.batchKey, boxParsed.suffix),
      boxNo: boxParsed.boxNo
    }
  }

  const batchFull = raw.match(
    new RegExp(
      `^${BATCH_PREFIX_NORM}(\\d{${BATCH_KEY_LENGTH}})(${BATCH_SUFFIX_PATTERN})?$`,
      'i'
    )
  )
  if (batchFull) {
    return {
      valid: true,
      type: 'batch',
      batchKey: batchFull[1],
      suffix: (batchFull[2] || '').toUpperCase(),
      serialNo: '',
      productionBatchNo: formatProductionBatchNo(batchFull[1], batchFull[2] || ''),
      boxNo: ''
    }
  }

  if (new RegExp(`^\\d{${BATCH_KEY_LENGTH}}$`).test(raw)) {
    return {
      valid: true,
      type: 'batch',
      batchKey: raw,
      suffix: '',
      serialNo: '',
      productionBatchNo: formatProductionBatchNo(raw),
      boxNo: ''
    }
  }

  const keySuffixOnly = raw.match(
    new RegExp(`^(\\d{${BATCH_KEY_LENGTH}})(${BATCH_SUFFIX_PATTERN})$`, 'i')
  )
  if (keySuffixOnly) {
    return {
      valid: true,
      type: 'batch',
      batchKey: keySuffixOnly[1],
      suffix: keySuffixOnly[2].toUpperCase(),
      serialNo: '',
      productionBatchNo: formatProductionBatchNo(keySuffixOnly[1], keySuffixOnly[2]),
      boxNo: ''
    }
  }

  return {
    valid: false,
    error:
      '格式不正确。箱单：HFSYHFYZBU+8位批次+可选后缀(01H)+6位流水；批号：GR-HFYZBU+8位+可选后缀'
  }
}

export const formatBoxNoHint = () =>
  `箱单 ${BOX_PREFIX}2607055201H000001（8位批次+后缀+6位流水）；批号 ${BATCH_PREFIX}2607055201H`

export const formatBatchNoHint = () =>
  `${BATCH_PREFIX}26070236 或 ${BATCH_PREFIX}2607055201H（前 8 位为匹配码，后缀可选）`

/**
 * 出货比对：按批次记忆「每箱数量」
 * storage: { [batchKey]: number }
 */
const PER_BOX_STORAGE_KEY = 'warehouse_batch_per_box_qty'

export const getBatchPerBoxQtyMap = () => {
  try {
    const raw = uni.getStorageSync(PER_BOX_STORAGE_KEY)
    return raw && typeof raw === 'object' ? raw : {}
  } catch (e) {
    return {}
  }
}

export const getBatchPerBoxQty = (batchKey) => {
  if (!batchKey) return 0
  const qty = Number(getBatchPerBoxQtyMap()[batchKey])
  return qty > 0 ? qty : 0
}

export const setBatchPerBoxQty = (batchKey, qty) => {
  if (!batchKey) return
  const n = Number(qty)
  if (!n || n <= 0) return
  const map = getBatchPerBoxQtyMap()
  map[batchKey] = n
  uni.setStorageSync(PER_BOX_STORAGE_KEY, map)
}

export const clearBatchPerBoxQty = (batchKey) => {
  if (!batchKey) return
  const map = getBatchPerBoxQtyMap()
  delete map[batchKey]
  uni.setStorageSync(PER_BOX_STORAGE_KEY, map)
}

/**
 * 已出货箱单号去重（本地持久化，防止同箱重复扣数）
 * storage: { [boxNo]: { shippedAt, batchKey, quantityPcs } }
 */
const SHIPPED_BOX_STORAGE_KEY = 'warehouse_shipped_box_nos'

/** 与后端一致：去空格、转大写、去连字符 */
export const normalizeBoxNoKey = (boxNo) =>
  String(boxNo || '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '')
    .replace(/-/g, '')

export const getShippedBoxMap = () => {
  try {
    const raw = uni.getStorageSync(SHIPPED_BOX_STORAGE_KEY)
    return raw && typeof raw === 'object' ? raw : {}
  } catch (e) {
    return {}
  }
}

export const isBoxAlreadyShipped = (boxNo) => {
  const key = normalizeBoxNoKey(boxNo)
  if (!key) return false
  return !!getShippedBoxMap()[key]
}

export const markBoxAsShipped = (boxNo, meta = {}) => {
  const key = normalizeBoxNoKey(boxNo)
  if (!key) return
  const map = getShippedBoxMap()
  map[key] = {
    boxNo: key,
    batchKey: meta.batchKey || '',
    quantityPcs: Number(meta.quantityPcs) || 0,
    shippedAt: meta.shippedAt || new Date().toISOString()
  }
  uni.setStorageSync(SHIPPED_BOX_STORAGE_KEY, map)
}

export const getShippedBoxRecord = (boxNo) => {
  const key = normalizeBoxNoKey(boxNo)
  if (!key) return null
  return getShippedBoxMap()[key] || null
}
