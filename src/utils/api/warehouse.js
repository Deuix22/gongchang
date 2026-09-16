/**
 * 仓储系统 API
 */
import { get, post, put, del, upload } from './request.js'

function buildQueryString(obj) {
  const parts = []
  for (const key of Object.keys(obj)) {
    const value = obj[key]
    if (value !== undefined && value !== null && value !== '') {
      parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
    }
  }
  return parts.length ? parts.join('&') : ''
}

/**
 * 识别送货单图片（按字段名匹配，非红框区域）
 * @param {string} filePath 本地图片路径
 * @returns {Promise<object>} 结构化识别结果 { header, items }
 */
export const recognizeDeliveryNote = async (filePath) => {
  const response = await upload(
    '/warehouse/delivery-notes/recognize',
    filePath,
    { recognizeMode: 'field' },
    {
      showLoading: true,
      loadingText: '正在识别，请稍候...',
      showError: true,
      timeout: 120000
    }
  )
  return response
}

/**
 * 提交出货单
 */
export const submitDeliveryNote = async (payload) => {
  return await post('/warehouse/delivery-notes', payload, {
    showLoading: true,
    loadingText: '提交中...',
    showError: true
  })
}

/**
 * 送货单列表
 * @param {{ keyword?: string, shippingDate?: string, deliveryNoteNo?: string, page?: number, pageSize?: number }} params
 */
export const listDeliveryNotes = async (params = {}) => {
  const qs = buildQueryString({
    keyword: params.keyword,
    shippingDate: params.shippingDate,
    deliveryNoteNo: params.deliveryNoteNo,
    page: params.page,
    pageSize: params.pageSize
  })
  return await get(`/warehouse/delivery-notes${qs ? `?${qs}` : ''}`, {
    showLoading: true,
    loadingText: '加载单据...',
    showError: false
  })
}

/**
 * 送货单详情
 * @param {string} id
 */
export const getDeliveryNoteDetail = async (id) => {
  return await get(`/warehouse/delivery-notes/${encodeURIComponent(id)}`, {
    showLoading: true,
    loadingText: '加载详情...',
    showError: true
  })
}

/**
 * 更新送货单
 * @param {string} id
 * @param {object} payload
 */
export const updateDeliveryNote = async (id, payload) => {
  return await put(`/warehouse/delivery-notes/${encodeURIComponent(id)}`, payload, {
    showLoading: true,
    loadingText: '保存中...',
    showError: true
  })
}

/**
 * 删除送货单
 * @param {string} id
 */
export const deleteDeliveryNote = async (id) => {
  return await del(`/warehouse/delivery-notes/${encodeURIComponent(id)}`, {
    showLoading: true,
    loadingText: '删除中...',
    showError: true
  })
}

/**
 * 出货比对：根据箱单号 / 批号查询送货单登记信息及批次余量
 * @param {{ boxNo?: string, batchKey?: string, productionBatchNo?: string }} params
 */
export const lookupScanCompare = async (params) => {
  const qs = buildQueryString({
    boxNo: params.boxNo,
    batchKey: params.batchKey,
    productionBatchNo: params.productionBatchNo
  })
  return await get(`/warehouse/scan-compare/lookup${qs ? `?${qs}` : ''}`, {
    showLoading: true,
    loadingText: '查询中...',
    showError: false
  })
}

/**
 * 出货比对：确认本次出货数量
 */
export const confirmScanShipment = async (payload) => {
  return await post('/warehouse/scan-compare/ship', payload, {
    showLoading: true,
    loadingText: '出货中...',
    // 重复出货由页面弹窗处理，避免 Toast + Modal 叠在一起
    showError: false
  })
}

/**
 * 管理查询：按批次、机型追溯出入库
 * @param {{ productionBatchNo?: string, batchKey?: string, salesModel?: string }} params
 */
export const queryWarehouseTrace = async (params) => {
  const qs = buildQueryString({
    productionBatchNo: params.productionBatchNo,
    batchKey: params.batchKey,
    salesModel: params.salesModel
  })
  return await get(`/warehouse/manage-query/trace${qs ? `?${qs}` : ''}`, {
    showLoading: true,
    loadingText: '查询中...',
    showError: false
  })
}

/**
 * 物料入库（Reel ID 扫码录入）
 * @param {{
 *   rawCode: string,
 *   materialBaseCode: string,
 *   partNumber: string,
 *   versionCode: string,
 *   versionDesc: string,
 *   designCode: string,
 *   lotNumber: string,
 *   quantityPcs: number
 * }} payload
 */
export const submitMaterialInbound = async (payload) => {
  return await post('/warehouse/materials/inbound', payload, {
    showLoading: true,
    loadingText: '入库中...',
    showError: false
  })
}

/**
 * 物料库存汇总查询
 * @param {{
 *   partNumber?: string,
 *   lotNumber?: string,
 *   materialBaseCode?: string,
 *   versionCode?: string,
 *   versionDesc?: string,
 *   designCode?: string,
 *   keyword?: string,
 *   page?: number,
 *   pageSize?: number
 * }} params
 */
export const queryMaterialStocks = async (params = {}) => {
  const qs = buildQueryString({
    partNumber: params.partNumber,
    lotNumber: params.lotNumber,
    materialBaseCode: params.materialBaseCode,
    versionCode: params.versionCode,
    versionDesc: params.versionDesc,
    designCode: params.designCode,
    keyword: params.keyword,
    page: params.page,
    pageSize: params.pageSize
  })
  return await get(`/warehouse/materials/stocks${qs ? `?${qs}` : ''}`, {
    showLoading: true,
    loadingText: '查询中...',
    showError: false
  })
}

/**
 * 物料入库流水查询
 * @param {{
 *   partNumber?: string,
 *   lotNumber?: string,
 *   materialBaseCode?: string,
 *   versionCode?: string,
 *   versionDesc?: string,
 *   designCode?: string,
 *   rawCode?: string,
 *   keyword?: string,
 *   page?: number,
 *   pageSize?: number
 * }} params
 */
export const queryMaterialInboundRecords = async (params = {}) => {
  const qs = buildQueryString({
    partNumber: params.partNumber,
    lotNumber: params.lotNumber,
    materialBaseCode: params.materialBaseCode,
    versionCode: params.versionCode,
    versionDesc: params.versionDesc,
    designCode: params.designCode,
    rawCode: params.rawCode,
    keyword: params.keyword,
    page: params.page,
    pageSize: params.pageSize
  })
  return await get(`/warehouse/materials/inbound-records${qs ? `?${qs}` : ''}`, {
    showLoading: true,
    loadingText: '查询中...',
    showError: false
  })
}

/**
 * 按 rawCode 检查是否已入库（提交前去重）
 * @returns {Promise<object|null>} 已存在则返回首条记录，否则 null；接口失败也返回 null
 */
export const lookupMaterialInboundByRawCode = async (rawCode) => {
  const code = String(rawCode || '').trim()
  if (!code) return null
  try {
    const res = await get(
      `/warehouse/materials/inbound-records?rawCode=${encodeURIComponent(code)}&page=1&pageSize=1`,
      { showLoading: false, showError: false }
    )
    const list = Array.isArray(res)
      ? res
      : Array.isArray(res?.list)
        ? res.list
        : Array.isArray(res?.data?.list)
          ? res.data.list
          : Array.isArray(res?.data)
            ? res.data
            : []
    return list[0] || null
  } catch (e) {
    return null
  }
}
