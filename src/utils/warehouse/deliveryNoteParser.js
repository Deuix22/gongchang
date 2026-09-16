/**
 * 送货单 OCR 结果规范化与按字段名解析
 * 兼容：标签:值、表格、Excel 截图 OCR（单空格分列、产品编码换行、空列）
 * 生产批号支持后缀：01H / 02H / 01B / 02B 等
 */

import {
  parseProductionBatch
} from './boxCodeParser.js'

/** 表头字段 → 单据上可能出现的标签 */
export const HEADER_FIELD_LABELS = {
  customerName: ['收货客户', '客户名称', '收货单位', '客户'],
  shippingDate: ['发运日', '发货日期', '发运日期', '出货日期', '发送日期', '送货日期']
}

/** 明细字段 → 单据上可能出现的标签 */
export const LINE_FIELD_LABELS = {
  customerOrderNo: ['客户订单号', '订单号', '客户单号'],
  salesModel: ['销售型号', '规格型号', '型号'],
  productCode: ['产品编码', '物料编码', '产品料号', '料号'],
  quantityPcs: ['数量PCS', '数量 PCS', '数量pcs', '出货数量', '发货数量', '数量'],
  productionBatchNo: ['生产批号', '生产批次', '批号', 'LOT'],
  deliveryNoteNo: ['送货单号', '出货单号', '交货单号']
}

/** 页面展示：将识别的字段名列出 */
export const RECOGNIZE_FIELD_DISPLAY = [
  '收货客户',
  '发运日',
  '客户订单号',
  '销售型号',
  '产品编码',
  '数量',
  '生产批号',
  '送货单号'
]

const HEADER_KEYS = Object.keys(HEADER_FIELD_LABELS)
const LINE_KEYS = Object.keys(LINE_FIELD_LABELS)

export const createEmptyHeader = () => ({
  customerName: '',
  shippingDate: ''
})

export const createEmptyLineItem = () => ({
  customerOrderNo: '',
  salesModel: '',
  productCode: '',
  quantityPcs: '',
  productionBatchNo: '',
  deliveryNoteNo: ''
})

const pickValue = (obj, keys) => {
  if (!obj || typeof obj !== 'object') return ''
  for (const key of keys) {
    const v = obj[key]
    if (v !== undefined && v !== null && String(v).trim() !== '') {
      return String(v).trim()
    }
  }
  return ''
}

const escapeRegExp = (str) => String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const hasLineContent = (row) =>
  !!(row && (
    row.customerOrderNo ||
    row.salesModel ||
    row.productCode ||
    row.productionBatchNo ||
    row.deliveryNoteNo ||
    Number(row.quantityPcs) > 0
  ))

/** 合并被 OCR 拆开的产品编码：002.027.00 + 07196 → 002.027.0007196 */
export const normalizeProductCode = (value) => {
  if (!value) return ''
  let s = String(value).replace(/\s+/g, '').replace(/\n/g, '')
  // 已是标准 3.3.7
  if (/^\d{3}\.\d{3}\.\d{7}$/.test(s)) return s
  // 3.3.2 + 5 位尾巴
  const m = s.match(/^(\d{3}\.\d{3}\.)(\d{2})(\d{5})$/)
  if (m) return `${m[1]}${m[2]}${m[3]}`
  // 仅 002.027.00 / 002.027.0007196 混杂
  const loose = s.match(/(\d{3}\.\d{3}\.\d{2,7})/)
  return loose ? loose[1] : s
}

/** 从文本中抓取产品编码（兼容换行拆分） */
const extractProductCodeFromText = (text) => {
  if (!text) return ''
  const compact = String(text).replace(/\s+/g, '')
  const full = compact.match(/\d{3}\.\d{3}\.\d{7}/)
  if (full) return full[0]
  const split = String(text).match(/(\d{3}\.\d{3}\.\d{2})\s*[\n\r]?\s*(\d{5})/)
  if (split) return normalizeProductCode(`${split[1]}${split[2]}`)
  const partial = compact.match(/\d{3}\.\d{3}\.\d{2,7}/)
  return partial ? normalizeProductCode(partial[0]) : ''
}

/** 生产批号：GR-HFYZBU + 8位 + 可选后缀(01H/02B等) */
const BATCH_RE = /GR-?HFYZBU\d{8}(?:\d{2}[A-Z])?/i
/** 送货单号 */
const DELIVERY_NO_RE = /HFYD\d{10,}/i
/** 客户订单号常见形态 */
const ORDER_NO_RE = /(?:\d[A-Z]\d{3}-\d{5,}|[A-Z]?\d{5,}-\d{5,}(?:-\d+)?|[A-Z]{1,3}\d{3,}-\d{5,}(?:-\d+)?)/i
/** 销售型号：S.XXXX */
const SALES_MODEL_RE = /S\.[A-Z0-9.]+/i

const extractByRegex = (text, re) => {
  const m = String(text || '').match(re)
  if (!m) return ''
  // 统一为 GR-HFYZBU... 形式，保留后缀
  return m[0]
    .toUpperCase()
    .replace(/^GRHFYZBU/i, 'GR-HFYZBU')
    .replace(/^GR-HFYZBU/i, 'GR-HFYZBU')
}

/** 按「字段名：值」或「字段名 值」从文本中提取 */
const extractByLabel = (text, labels) => {
  if (!text) return ''
  for (const label of labels) {
    const escaped = escapeRegExp(label)
    const withColon = new RegExp(
      `${escaped}\\s*[:：]\\s*([^\\n\\r]+)`,
      'i'
    )
    const m1 = text.match(withColon)
    if (m1 && m1[1]) {
      return m1[1].trim().replace(/\s{2,}.*/, '').trim()
    }
    // Excel OCR 偶发无冒号：收货客户 TCL家用电器...
    const withSpace = new RegExp(
      `${escaped}\\s+([^\\n\\r]{2,80})`,
      'i'
    )
    const m2 = text.match(withSpace)
    if (m2 && m2[1]) {
      const val = m2[1].trim()
      // 避免把下一列表头吃进来
      if (!/^(收货|发运|客户|销售|产品|数量|生产|送货|品名|版本|备注)/.test(val)) {
        return val.replace(/\s{2,}.*/, '').trim()
      }
    }
  }
  return ''
}

const normalizeDate = (value) => {
  if (!value) return ''
  const m = String(value).match(/(\d{4})[年./-](\d{1,2})[月./-](\d{1,2})/)
  if (m) {
    return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value
  return String(value).trim()
}

const normalizeHeader = (raw = {}) => ({
  customerName: pickValue(raw, ['customerName', 'receiverCustomer', '收货客户', '客户名称', ...HEADER_FIELD_LABELS.customerName]),
  shippingDate: normalizeDate(
    pickValue(raw, ['shippingDate', 'shipDate', '发运日', '发货日期', '发送日期', ...HEADER_FIELD_LABELS.shippingDate])
  )
})

const normalizeLine = (raw = {}) => {
  const line = {}
  for (const key of LINE_KEYS) {
    line[key] = pickValue(raw, [key, ...LINE_FIELD_LABELS[key]])
  }
  if (line.productCode) line.productCode = normalizeProductCode(line.productCode)
  if (line.productionBatchNo) {
    const parsedBatch = parseProductionBatch(line.productionBatchNo)
    line.productionBatchNo = parsedBatch
      ? parsedBatch.productionBatchNo
      : (extractByRegex(line.productionBatchNo, BATCH_RE) || line.productionBatchNo)
  }
  if (line.deliveryNoteNo) {
    line.deliveryNoteNo = extractByRegex(line.deliveryNoteNo, DELIVERY_NO_RE) || line.deliveryNoteNo
  }
  return line
}

/** 从一段文本中按字段标签提取一行明细 */
const parseLineBlockByLabels = (block) => {
  const row = createEmptyLineItem()
  let hasValue = false
  for (const key of LINE_KEYS) {
    const val = extractByLabel(block, LINE_FIELD_LABELS[key])
    if (val) {
      row[key] = key === 'productCode' ? normalizeProductCode(val) : val
      hasValue = true
    }
  }
  if (!row.productCode) {
    const code = extractProductCodeFromText(block)
    if (code) {
      row.productCode = code
      hasValue = true
    }
  }
  if (!row.productionBatchNo) {
    const batch = extractByRegex(block, BATCH_RE)
    if (batch) {
      row.productionBatchNo = batch
      hasValue = true
    }
  }
  if (!row.deliveryNoteNo) {
    const dn = extractByRegex(block, DELIVERY_NO_RE)
    if (dn) {
      row.deliveryNoteNo = dn
      hasValue = true
    }
  }
  return hasValue ? row : null
}

/** 是否合计/表尾行（勿用「备注」——明细备注列会误伤） */
const isFooterOrJunkLine = (line) => {
  const s = String(line || '').trim()
  if (!s) return true
  if (/^(合计|总计|小计)\b/.test(s)) return true
  if (/^合肥视研|^送货单$/.test(s)) return true
  if (/^收货地址/.test(s)) return true
  return false
}

/**
 * 识别表格表头行，按列顺序解析数据行
 * Excel OCR 常为单空格分列，且含空列，不能简单 filter(Boolean) 后按序映射
 */
const parseLineItemsFromTable = (lines) => {
  const headerIdx = lines.findIndex(line => {
    let hits = 0
    for (const labels of Object.values(LINE_FIELD_LABELS)) {
      if (labels.some(l => line.includes(l))) hits++
    }
    return hits >= 3
  })
  if (headerIdx < 0) return []

  const headerLine = lines[headerIdx]
  // 用表头标签在整行中的位置确定列顺序
  const colOrder = []
  for (const key of LINE_KEYS) {
    const labels = LINE_FIELD_LABELS[key]
    // 较长标签优先，避免「数量」误匹配「数量PCS」前的短词位置混乱
    const sortedLabels = [...labels].sort((a, b) => b.length - a.length)
    const idx = sortedLabels.reduce((found, label) => {
      if (found >= 0) return found
      const i = headerLine.indexOf(label)
      return i >= 0 ? i : -1
    }, -1)
    if (idx >= 0) colOrder.push({ key, idx })
  }
  colOrder.sort((a, b) => a.idx - b.idx)
  if (colOrder.length < 2) return []

  const items = []
  for (let i = headerIdx + 1; i < lines.length; i++) {
    const line = lines[i]
    if (isFooterOrJunkLine(line)) break

    // 保留空单元格：按 tab / 多空格 / 竖线 切分
    let cells = line.split(/\t|\s{2,}|\|/).map(c => c.trim())
    // 若几乎切不出列，再尝试单空格（Excel OCR）
    if (cells.length < 3) {
      cells = line.split(/\s+/).map(c => c.trim())
    }
    if (cells.filter(Boolean).length < 2) continue

    const row = createEmptyLineItem()
    // 按「期望字段数」从非空单元格里智能抽取，而不是死板按下标
    const nonempty = cells.filter(Boolean)
    row.customerOrderNo = nonempty.find(c => ORDER_NO_RE.test(c)) || nonempty[0] || ''
    row.salesModel = nonempty.find(c => SALES_MODEL_RE.test(c)) || ''
    row.productCode = extractProductCodeFromText(nonempty.join(' ')) || ''
    row.productionBatchNo = nonempty.find(c => BATCH_RE.test(c)) || ''
    row.deliveryNoteNo = nonempty.find(c => DELIVERY_NO_RE.test(c)) || ''

    // 数量：优先取「品名」后、「生产批号」前的纯数字；排除版本号等过小且位置不对的
    const batchIdx = nonempty.findIndex(c => BATCH_RE.test(c))
    const modelIdx = nonempty.findIndex(c => SALES_MODEL_RE.test(c))
    const qtyCandidates = nonempty
      .map((c, idx) => ({ c, idx }))
      .filter(({ c, idx }) =>
        /^\d{1,6}$/.test(c) &&
        Number(c) > 0 &&
        (batchIdx < 0 || idx < batchIdx) &&
        (modelIdx < 0 || idx > modelIdx)
      )
    // 版本号通常很小（个位数/十位数）且紧挨产品编码；数量往往更大。若多候选取较靠批号前的最后一个合理值
    if (qtyCandidates.length) {
      const prefer = qtyCandidates.filter(({ c }) => Number(c) >= 3)
      row.quantityPcs = (prefer.length ? prefer[prefer.length - 1] : qtyCandidates[qtyCandidates.length - 1]).c
    }

    if (hasLineContent(row)) items.push(row)
  }
  return items
}

/** 按「客户订单号：」等标签分块，每块为一行明细 */
const parseLineItemsFromLabeledBlocks = (text) => {
  const blocks = text.split(/(?=(?:客户订单号|订单号)\s*[:：])/i).filter(b => b.trim())
  const items = []
  blocks.forEach(block => {
    const row = parseLineBlockByLabels(block)
    if (row && hasLineContent(row)) items.push(row)
  })
  return items
}

/**
 * 锚点解析：以生产批号 / 订单号为行锚点（最适配视研 Excel 截图 OCR）
 * OCR 常把一行拆成多行，故先合并邻近碎片再抽字段
 */
const parseLineItemsByAnchors = (text) => {
  const compact = String(text || '').replace(/\r/g, '\n')
  // 按送货单号或批号切行：每一段 ideally 含一条明细
  const orderMatches = [...compact.matchAll(
    /((?:\d[A-Z]\d{3}-\d{5,}|(?:N\d{6}-\d{6}-\d{3}))[^\n]*)/gi
  )]

  const chunks = []
  if (orderMatches.length >= 1) {
    for (let i = 0; i < orderMatches.length; i++) {
      const start = orderMatches[i].index
      const end = i + 1 < orderMatches.length ? orderMatches[i + 1].index : compact.length
      const slice = compact.slice(start, end)
      if (/合计|总计/.test(slice.slice(0, 20))) continue
      chunks.push(slice)
    }
  }

  // 若订单号切分失败，按批号切
  if (chunks.length < 2) {
    const batchMatches = [...compact.matchAll(new RegExp(BATCH_RE.source, 'gi'))]
    if (batchMatches.length) {
      chunks.length = 0
      // 向前取一段上下文
      for (let i = 0; i < batchMatches.length; i++) {
        const batchStart = batchMatches[i].index
        const prev = i === 0 ? Math.max(0, batchStart - 120) : batchMatches[i - 1].index
        const next = i + 1 < batchMatches.length ? batchMatches[i + 1].index : Math.min(compact.length, batchStart + 80)
        chunks.push(compact.slice(prev, next))
      }
    }
  }

  const items = []
  const seen = new Set()
  chunks.forEach(chunk => {
    if (isFooterOrJunkLine(chunk.trim())) return
    const row = createEmptyLineItem()
    const order = chunk.match(ORDER_NO_RE)
    row.customerOrderNo = order ? order[0] : ''
    row.salesModel = extractByRegex(chunk, SALES_MODEL_RE)
    row.productCode = extractProductCodeFromText(chunk)
    row.productionBatchNo = extractByRegex(chunk, BATCH_RE)
    row.deliveryNoteNo = extractByRegex(chunk, DELIVERY_NO_RE)

    // 数量：优先取「生产批号」紧前方的数字（Excel 列顺序：… 数量PCS | 装箱备注 | 生产批号 …）
    let qty = ''
    if (row.productionBatchNo) {
      const near = chunk.match(new RegExp(`(\\d{1,6})\\s+${escapeRegExp(row.productionBatchNo)}`, 'i'))
      if (near) qty = near[1]
    }
    if (!qty) {
      const beforeBatch = row.productionBatchNo
        ? chunk.slice(0, Math.max(0, chunk.toUpperCase().indexOf(row.productionBatchNo.toUpperCase())))
        : chunk
      const qtyNums = []
      // 不用 lookbehind（部分小程序 JS 引擎不支持会导致整文件解析失败）
      const qtyRe = /(\d{1,6})(?![\d.])/g
      let qm
      while ((qm = qtyRe.exec(beforeBatch)) !== null) {
        const n = qm[1]
        const prevChar = beforeBatch[qm.index - 1] || ''
        if (prevChar === '.' || /\d/.test(prevChar)) continue
        if (row.productCode && row.productCode.includes(n)) continue
        if (row.salesModel && row.salesModel.includes(n) && n.length <= 2) continue
        const orderNumParts = (row.customerOrderNo || '').split('-').map(p => p.replace(/\D/g, '')).filter(Boolean)
        if (n.length >= 3 && orderNumParts.some(p => p === n || p.includes(n))) continue
        qtyNums.push(n)
      }
      qty = qtyNums.length ? qtyNums[qtyNums.length - 1] : ''
    }
    row.quantityPcs = qty

    if (!hasLineContent(row)) return
    const key = `${row.customerOrderNo}|${row.productionBatchNo}|${row.quantityPcs}`
    if (seen.has(key)) return
    seen.add(key)
    items.push(row)
  })
  return items
}

/** 模式兜底：产品编码、数量等特征行 */
const parseLineItemsFromPatterns = (lines) => {
  const items = []
  lines.forEach(line => {
    if (isFooterOrJunkLine(line)) return
    const productCode = extractProductCodeFromText(line)
    const batch = extractByRegex(line, BATCH_RE)
    if (!productCode && !batch) return

    const parts = line.split(/\t|\s{2,}|\s+/).filter(Boolean)
    if (parts.length < 2) return

    const qtyHit = parts.find(p => /^\d{2,6}$/.test(p) && Number(p) >= 3)
    items.push({
      customerOrderNo: parts.find(p => ORDER_NO_RE.test(p)) || parts[0] || '',
      salesModel: parts.find(p => SALES_MODEL_RE.test(p)) || '',
      productCode: productCode || '',
      quantityPcs: qtyHit || '',
      productionBatchNo: batch || '',
      deliveryNoteNo: extractByRegex(line, DELIVERY_NO_RE)
    })
  })
  return items.filter(hasLineContent)
}

/**
 * 从 OCR 纯文本按字段名兜底解析
 */
export const parseDeliveryNoteFromText = (text = '') => {
  const normalizedText = String(text).replace(/\r/g, '\n')
  // 合并「002.027.00\n07196」这种换行编码，便于后续匹配
  const mergedText = normalizedText.replace(
    /(\d{3}\.\d{3}\.\d{2})\s*\n\s*(\d{5})/g,
    '$1$2'
  )
  const lines = mergedText.split('\n').map(l => l.trim()).filter(Boolean)

  const header = {
    customerName: extractByLabel(mergedText, HEADER_FIELD_LABELS.customerName),
    shippingDate: normalizeDate(extractByLabel(mergedText, HEADER_FIELD_LABELS.shippingDate))
  }

  // 收货客户有时在「收货客户」与公司名分行
  if (!header.customerName) {
    const idx = lines.findIndex(l => /收货客户/.test(l))
    if (idx >= 0) {
      const same = extractByLabel(lines[idx], HEADER_FIELD_LABELS.customerName)
      if (same) header.customerName = same
      else if (lines[idx + 1] && !/收货地址|发运日|发货/.test(lines[idx + 1])) {
        header.customerName = lines[idx + 1]
      }
    }
  }

  let items = parseLineItemsByAnchors(mergedText)
  if (items.length < 2) {
    const tableItems = parseLineItemsFromTable(lines)
    if (tableItems.length > items.length) items = tableItems
  }
  if (!items.length) {
    items = parseLineItemsFromLabeledBlocks(mergedText)
  }
  if (!items.length) {
    items = parseLineItemsFromPatterns(lines)
  }
  if (!items.length) {
    const single = parseLineBlockByLabels(mergedText)
    if (single) items = [single]
  }

  // 全文送货单号回填
  const docDeliveryNo =
    extractByRegex(mergedText, DELIVERY_NO_RE) ||
    extractByLabel(mergedText, LINE_FIELD_LABELS.deliveryNoteNo)
  if (docDeliveryNo) {
    items.forEach(row => {
      if (!row.deliveryNoteNo) row.deliveryNoteNo = docDeliveryNo
    })
  }

  // 统一清洗
  items = items.map(row => normalizeLine(row)).filter(hasLineContent)

  return {
    header,
    items: items.length ? items : [createEmptyLineItem()]
  }
}

/** 解析后端返回的 fields / recognizedFields 结构 */
const normalizeFromFieldsMap = (fields) => {
  const header = createEmptyHeader()
  const line = createEmptyLineItem()
  const flat = typeof fields === 'object' ? fields : {}

  HEADER_KEYS.forEach(key => {
    header[key] = pickValue(flat, [key, ...HEADER_FIELD_LABELS[key]])
  })
  LINE_KEYS.forEach(key => {
    line[key] = pickValue(flat, [key, ...LINE_FIELD_LABELS[key]])
  })

  if (header.shippingDate) header.shippingDate = normalizeDate(header.shippingDate)
  if (line.productCode) line.productCode = normalizeProductCode(line.productCode)

  const hasLine = LINE_KEYS.some(k => line[k])
  return {
    header: normalizeHeader(header),
    items: hasLine ? [normalizeLine(line)] : [createEmptyLineItem()]
  }
}

const normalizeFromRecognizedFields = (list) => {
  const flat = {}
  if (!Array.isArray(list)) return null

  list.forEach(entry => {
    const key = entry.key || entry.field || entry.name
    const label = entry.label || entry.fieldName || ''
    const value = entry.value ?? entry.text ?? ''
    if (key && HEADER_KEYS.includes(key)) {
      flat[key] = value
    } else if (key && LINE_KEYS.includes(key)) {
      flat[key] = value
    } else {
      for (const hk of HEADER_KEYS) {
        if (HEADER_FIELD_LABELS[hk].some(l => label.includes(l) || l === label)) {
          flat[hk] = value
          return
        }
      }
      for (const lk of LINE_KEYS) {
        if (LINE_FIELD_LABELS[lk].some(l => label.includes(l) || l === label)) {
          flat[lk] = value
        }
      }
    }
  })

  return normalizeFromFieldsMap(flat)
}

/**
 * 统一识别接口响应
 */
export const normalizeRecognizeResult = (response) => {
  if (!response) {
    return { header: createEmptyHeader(), items: [createEmptyLineItem()] }
  }

  const payload = response.data || response.result || response
  const rawText = payload.rawText || payload.text || payload.ocrText || ''

  if (payload.header || Array.isArray(payload.items)) {
    const items = Array.isArray(payload.items) ? payload.items.map(normalizeLine).filter(hasLineContent) : []
    const header = normalizeHeader(payload.header || {})
    // 后端返回了空 items，但有 rawText → 走前端兜底
    if (!items.length && rawText) {
      return parseDeliveryNoteFromText(rawText)
    }
    return {
      header,
      items: items.length ? items : [createEmptyLineItem()]
    }
  }

  if (payload.fields) {
    const fromFields = normalizeFromFieldsMap(payload.fields)
    if (hasLineContent(fromFields.items[0]) || fromFields.header.customerName) {
      return fromFields
    }
    if (rawText) return parseDeliveryNoteFromText(rawText)
    return fromFields
  }

  if (payload.recognizedFields) {
    const fromList = normalizeFromRecognizedFields(payload.recognizedFields)
    if (fromList && (hasLineContent(fromList.items[0]) || fromList.header.customerName)) {
      return fromList
    }
  }

  if (rawText) {
    return parseDeliveryNoteFromText(rawText)
  }

  if (typeof payload === 'string') {
    return parseDeliveryNoteFromText(payload)
  }

  return { header: createEmptyHeader(), items: [createEmptyLineItem()] }
}

export const buildSubmitPayload = ({ header, items, imageUrl = '' }) => ({
  customerName: header.customerName,
  shippingDate: header.shippingDate,
  imageUrl,
  items: items.map(row => {
    const item = {
      customerOrderNo: row.customerOrderNo,
      salesModel: row.salesModel,
      productCode: normalizeProductCode(row.productCode),
      quantityPcs: Number(row.quantityPcs) || 0,
      productionBatchNo: row.productionBatchNo,
      deliveryNoteNo: row.deliveryNoteNo
    }
    if (row.id) item.id = row.id
    return item
  })
})

const pickId = (obj) => {
  if (!obj || typeof obj !== 'object') return ''
  return String(obj.id || obj._id || obj.deliveryNoteId || '').trim()
}

/**
 * 规范化列表项（用于单据管理）
 */
export const normalizeDeliveryNoteListItem = (raw = {}) => {
  const items = Array.isArray(raw.items) ? raw.items : []
  const firstLine = items[0] || {}
  const deliveryNoteNo =
    pickValue(raw, ['deliveryNoteNo', '送货单号']) ||
    pickValue(firstLine, ['deliveryNoteNo', '送货单号']) ||
    ''

  const totalQuantityPcs = Number(
    raw.totalQuantityPcs ??
    raw.quantityPcs ??
    items.reduce((sum, row) => sum + (Number(row.quantityPcs) || 0), 0)
  ) || 0

  return {
    id: pickId(raw),
    customerName: pickValue(raw, ['customerName', '收货客户', '客户名称']),
    shippingDate: normalizeDate(
      pickValue(raw, ['shippingDate', 'shipDate', '发运日', '发货日期', '发送日期'])
    ),
    deliveryNoteNo,
    itemCount: Number(raw.itemCount ?? items.length) || items.length || 0,
    totalQuantityPcs,
    createdAt: pickValue(raw, ['createdAt', 'created_at', 'updatedAt']) || '',
    updatedAt: pickValue(raw, ['updatedAt', 'updated_at']) || ''
  }
}

export const normalizeDeliveryNoteList = (response) => {
  const payload = response?.data || response?.result || response || {}
  let list = []
  if (Array.isArray(payload.list)) list = payload.list
  else if (Array.isArray(payload.items)) list = payload.items
  else if (Array.isArray(payload.records)) list = payload.records
  else if (Array.isArray(payload)) list = payload

  return {
    list: list.map(normalizeDeliveryNoteListItem).filter(item => item.id),
    total: Number(payload.total ?? list.length) || 0
  }
}

/**
 * 规范化详情，供编辑回填
 */
export const normalizeDeliveryNoteDetail = (response) => {
  const payload = response?.data || response?.result || response || {}
  const itemsRaw = Array.isArray(payload.items)
    ? payload.items
    : (Array.isArray(payload.lineItems) ? payload.lineItems : [])

  return {
    id: pickId(payload),
    header: normalizeHeader(payload.header || payload),
    items: itemsRaw.length
      ? itemsRaw.map(row => ({
          ...createEmptyLineItem(),
          ...normalizeLine(row),
          id: pickId(row)
        }))
      : [createEmptyLineItem()],
    imageUrl: pickValue(payload, ['imageUrl', 'image_url']) || ''
  }
}
