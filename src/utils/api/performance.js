/**
 * 绩效/产能相关 API
 * 注意：小程序环境无 URLSearchParams，用 buildQueryString 拼接查询串
 */
import { get, post, put } from './request.js'
import defaultCapacityMeta from '@/data/capacity-meta-default.json'
import { buildCapacityRecordKey } from '@/utils/capacityRecordUtils.js'

const defaultModelConfigs = defaultCapacityMeta.modelConfigs || {}
export const DEFAULT_CAPACITY_LINES = Array.isArray(defaultCapacityMeta.lines)
  ? defaultCapacityMeta.lines
  : Array.from({ length: 21 }, (_, i) => `DIP${i + 1}线`)
export const DEFAULT_CAPACITY_PROCESSES = Array.isArray(defaultCapacityMeta.processes)
  ? defaultCapacityMeta.processes
  : ['插件段', '包装段', '组装', '预加工', '成型']
export const DEFAULT_CAPACITY_MODELS = Array.isArray(defaultCapacityMeta.models)
  ? defaultCapacityMeta.models
  : Object.keys(defaultModelConfigs)

const CAPACITY_MODEL_CONFIGS_STORAGE_KEY = 'capacityModelConfigsOverride'

/** 将对象转为 query 字符串，兼容小程序等无 URLSearchParams 的环境；空字符串不参与拼接，数字 0 会参与 */
function buildQueryString(obj) {
  const parts = []
  for (const key of Object.keys(obj)) {
    const value = obj[key]
    if (value !== undefined && value !== null && (value !== '' || typeof value === 'number')) {
      parts.push(encodeURIComponent(key) + '=' + encodeURIComponent(String(value)))
    }
  }
  return parts.length ? parts.join('&') : ''
}

/**
 * 产能记录列表（分页+筛选）
 * @param {Object} params - 查询参数
 * @param {string} [params.productionLine] - 线体
 * @param {string} [params.processSegment] - 制程段
 * @param {string} [params.machineModel] - 机型关键字
 * @param {string} [params.teamLeader] - 组长关键字
 * @param {string} [params.submitter] - 提交人关键字
 * @param {string} [params.personInCharge] - 负责人关键字
 * @param {string} [params.reportDate] - 提报日期 YYYY-MM-DD（精确）
 * @param {string} [params.startDate] - 提报开始日期 YYYY-MM-DD
 * @param {string} [params.endDate] - 提报结束日期 YYYY-MM-DD
 * @param {number} [params.page=1] - 页码
 * @param {number} [params.pageSize=20] - 每页条数
 * @returns {Promise<{ list: Array, total: number }>}
 */
export const getCapacityList = (params = {}) => {
  const qs = buildQueryString({
    productionLine: params.productionLine,
    processSegment: params.processSegment,
    process: params.processSegment || params.process,
    machineModel: params.machineModel,
    model: params.machineModel || params.model,
    teamLeader: params.teamLeader,
    submitter: params.submitter,
    personInCharge: params.personInCharge,
    reportDate: params.reportDate,
    startDate: params.startDate,
    endDate: params.endDate,
    page: params.page,
    pageSize: params.pageSize
  })
  const url = qs ? `/performance/capacity?${qs}` : '/performance/capacity'
  return get(url, { showError: true }).then((res) => {
    if (res && Array.isArray(res.list)) return { list: res.list, total: res.total ?? res.list.length }
    if (res && Array.isArray(res)) return { list: res, total: res.length }
    return { list: [], total: 0 }
  }).catch(() => ({ list: [], total: 0 }))
}

/**
 * 产线枚举（下拉选项，与 POST 提交校验应使用同一数据源）
 * @returns {Promise<string[]>}
 */
export const getCapacityLines = () => {
  return get('/performance/capacity/lines', { showError: false }).then((res) => {
    if (res && Array.isArray(res.list)) return res.list
    if (res && Array.isArray(res.lines)) return res.lines
    return []
  }).catch(() => [])
}

/**
 * 产能提报线体下拉选项：优先 meta.lines，再合并 lines 接口，去重
 * 注意：POST /performance/capacity 的 productionLine 校验须与 meta.lines 一致，不能写死 DIP1～DIP7
 * @returns {Promise<string[]>}
 */
export const getCapacityLineOptions = async () => {
  let metaLines = []
  let apiLines = []

  try {
    const meta = await getCapacityMeta()
    metaLines = Array.isArray(meta.lines) ? meta.lines : []
  } catch (e) {
    metaLines = []
  }

  try {
    apiLines = await getCapacityLines()
  } catch (e) {
    apiLines = []
  }

  const merged = []
  const seen = new Set()
  const addLine = (line) => {
    const value = (line || '').trim()
    if (!value || seen.has(value)) return
    seen.add(value)
    merged.push(value)
  }

  metaLines.forEach(addLine)
  apiLines.forEach(addLine)

  if (merged.length === 0) {
    DEFAULT_CAPACITY_LINES.forEach(addLine)
  }

  return merged
}

/**
 * 产能基础数据（线体 / 制程段 / 机型及参数） - 查询
 * modelConfigs 结构：{ [机型]: { [制程段]: { singleWorkHours, standardCapacity, standardManpower } } }
 * 兼容旧版扁平结构：{ [机型]: { singleWorkHours, ... } }（不区分制程段）
 * singleWorkHours 单位为 /min（单台生产所需分钟数）
 */
const normalizeProcessConfig = (item = {}) => {
  const next = {}
  const wt = Number(item.singleWorkHours ?? item.worktime)
  if (!Number.isNaN(wt) && wt >= 0) next.singleWorkHours = wt
  const sc = Number(item.standardCapacity)
  if (!Number.isNaN(sc) && sc >= 0) next.standardCapacity = sc
  const sm = Number(item.standardManpower)
  if (!Number.isNaN(sm) && sm >= 0) next.standardManpower = sm
  return next
}

const isFlatModelConfig = (item) => {
  if (!item || typeof item !== 'object' || Array.isArray(item)) return false
  return (
    Object.prototype.hasOwnProperty.call(item, 'singleWorkHours') ||
    Object.prototype.hasOwnProperty.call(item, 'standardCapacity') ||
    Object.prototype.hasOwnProperty.call(item, 'standardManpower') ||
    Object.prototype.hasOwnProperty.call(item, 'worktime')
  )
}

const normalizeModelConfigs = (rawConfigs, legacyWorktimes = {}) => {
  const configs = {}
  const source = rawConfigs && typeof rawConfigs === 'object' ? rawConfigs : {}
  Object.keys(source).forEach((key) => {
    const name = String(key).trim()
    if (!name) return
    const item = source[key] || {}
    if (isFlatModelConfig(item)) {
      const flat = normalizeProcessConfig(item)
      if (Object.keys(flat).length) configs[name] = flat
      return
    }
    const byProcess = {}
    Object.keys(item).forEach((processKey) => {
      const pk = String(processKey).trim()
      if (!pk) return
      const child = item[processKey]
      if (!child || typeof child !== 'object' || Array.isArray(child)) return
      const pc = normalizeProcessConfig(child)
      if (Object.keys(pc).length) byProcess[pk] = pc
    })
    if (Object.keys(byProcess).length) configs[name] = byProcess
  })
  Object.keys(legacyWorktimes || {}).forEach((key) => {
    const name = String(key).trim()
    if (!name) return
    const wt = Number(legacyWorktimes[key])
    if (Number.isNaN(wt) || wt < 0) return
    const existing = configs[name]
    if (!existing) {
      configs[name] = { singleWorkHours: wt }
      return
    }
    if (isFlatModelConfig(existing) && existing.singleWorkHours == null) {
      configs[name] = { ...existing, singleWorkHours: wt }
    }
  })
  return configs
}

/**
 * 按机型 + 制程段获取参数配置（提报页匹配用）
 */
export const getModelProcessConfig = (modelConfigs, model, processSegment) => {
  if (!model || !modelConfigs || typeof modelConfigs !== 'object') return null
  const modelCfg = modelConfigs[model]
  if (!modelCfg || typeof modelCfg !== 'object') return null
  if (isFlatModelConfig(modelCfg)) {
    const flat = normalizeProcessConfig(modelCfg)
    return Object.keys(flat).length ? flat : null
  }
  if (processSegment && modelCfg[processSegment]) {
    const pc = normalizeProcessConfig(modelCfg[processSegment])
    return Object.keys(pc).length ? pc : null
  }
  return null
}

/**
 * 将机型配置规范为「按制程段」嵌套结构（维护页加载/保存用）
 */
export const migrateModelConfigByProcess = (modelCfg, processes = []) => {
  const list = Array.isArray(processes) ? processes : []
  if (!modelCfg || typeof modelCfg !== 'object') {
    const nested = {}
    list.forEach((p) => {
      nested[p] = {}
    })
    return nested
  }
  if (isFlatModelConfig(modelCfg)) {
    const flat = { ...modelCfg }
    const nested = {}
    list.forEach((p) => {
      nested[p] = { ...flat }
    })
    return nested
  }
  const nested = {}
  list.forEach((p) => {
    nested[p] = { ...(modelCfg[p] || {}) }
  })
  return nested
}

const readLocalModelConfigs = () => {
  try {
    const raw = uni.getStorageSync(CAPACITY_MODEL_CONFIGS_STORAGE_KEY)
    if (raw && typeof raw === 'object' && raw != null) {
      return normalizeModelConfigs(raw)
    }
  } catch (e) {
    // ignore
  }
  return {}
}

const mergeModelConfigSources = (apiConfigs, legacyWorktimes = {}) => {
  const fromApi = normalizeModelConfigs(apiConfigs, legacyWorktimes)
  const fromSeed = normalizeModelConfigs(defaultModelConfigs)
  const fromLocal = readLocalModelConfigs()
  const merged = { ...fromSeed, ...fromLocal }
  Object.keys(fromApi).forEach((model) => {
    if (fromApi[model] && Object.keys(fromApi[model]).length > 0) {
      merged[model] = fromApi[model]
    }
  })
  return merged
}

export const getCapacityMeta = () => {
  return get('/performance/capacity/meta', { showError: true }).then((res) => {
    const safeArray = (v) => (Array.isArray(v) ? v : [])
    const legacyWorktimes =
      res && typeof res.modelWorktimes === 'object' && res.modelWorktimes != null
        ? res.modelWorktimes
        : {}
    const modelConfigs = mergeModelConfigSources(res?.modelConfigs, legacyWorktimes)
    const modelsFromConfigs = Object.keys(modelConfigs)
    const models = safeArray(res?.models)
    const mergedModels = models.length > 0 ? models : modelsFromConfigs
    const processes = safeArray(res?.processes)
    const lines = safeArray(res?.lines)
    return {
      lines: lines.length > 0 ? lines : DEFAULT_CAPACITY_LINES,
      processes: processes.length > 0 ? processes : DEFAULT_CAPACITY_PROCESSES,
      models: mergedModels.length > 0 ? mergedModels : DEFAULT_CAPACITY_MODELS,
      modelConfigs
    }
  })
}

/**
 * 产能基础数据 - 保存（admin / 管理员 / 白名单账号）
 * @param {{ lines: string[], processes: string[], models: string[], modelConfigs?: Record<string, object> }} body
 */
export const saveCapacityMeta = (body) => {
  const models = Array.isArray(body.models) ? body.models : []
  const processes = Array.isArray(body.processes) ? body.processes : []
  const raw =
    body.modelConfigs && typeof body.modelConfigs === 'object' ? body.modelConfigs : {}

  const modelConfigs = {}
  models.forEach((model) => {
    const migrated = migrateModelConfigByProcess(raw[model], processes)
    const byProcess = {}
    Object.keys(migrated).forEach((proc) => {
      const pc = normalizeProcessConfig(migrated[proc])
      if (Object.keys(pc).length > 0) {
        byProcess[proc] = pc
      }
    })
    if (Object.keys(byProcess).length > 0) {
      modelConfigs[model] = byProcess
    }
  })

  const payload = {
    lines: Array.isArray(body.lines) ? body.lines : [],
    processes,
    models,
    modelConfigs
  }
  return put('/performance/capacity/meta', payload, { showError: true }).then((res) => {
    try {
      uni.setStorageSync(CAPACITY_MODEL_CONFIGS_STORAGE_KEY, modelConfigs)
    } catch (e) {
      // ignore
    }
    return res
  })
}

/**
 * 产能提报提交
 * @param {Object} body
 * @param {string} body.reportDate - 提报日期 YYYY-MM-DD
 * @param {string} body.productionLine - 线体
 * @param {string} body.teamLeader - 组长
 * @param {string} body.processSegment - 制程段
 * @param {string} body.machineModel - 机型
 * @param {string} body.personInCharge - 负责人
 * @param {string} body.submitter - 提交人（登录账号姓名）
 * @param {Array} body.timeSlots - 分时段产能数据（每项含 reasonRemark 原因说明）
 * @returns {Promise<{ success?: boolean, id?: string, [k: string]: any }>}
 */
export const postCapacity = (body) => {
  const slots = Array.isArray(body.timeSlots) ? body.timeSlots : []
  const processSegment = body.processSegment || body.process || ''
  const recordKey = body.recordKey || buildCapacityRecordKey({
    reportDate: body.reportDate,
    productionLine: body.productionLine,
    teamLeader: body.teamLeader,
    processSegment
  })
  const data = {
    reportDate: body.reportDate,
    productionLine: body.productionLine,
    teamLeader: body.teamLeader,
    processSegment,
    process: processSegment,
    machineModel: body.machineModel,
    personInCharge: body.personInCharge,
    submitter: body.submitter,
    recordKey,
    timeSlots: slots.map((slot) => ({
      timeRange: slot.timeRange,
      startTime: slot.startTime,
      endTime: slot.endTime,
      startHour: slot.startHour,
      machineModel: slot.machineModel,
      productionMinutes: Number(slot.productionMinutes) || 0,
      productionHours: Number(slot.productionHours) || 0,
      standardCapacity: Number(slot.standardCapacity) || 0,
      actualCapacity: Number(slot.actualCapacity) || 0,
      standardManpower: Number(slot.standardManpower) || 0,
      actualManpower: Number(slot.actualManpower) || 0,
      singleWorkHours: slot.singleWorkHours,
      standardCapacityPcs: slot.standardCapacityPcs,
      outputHours: slot.outputHours,
      attendanceHours: slot.attendanceHours,
      capacityDifference: slot.capacityDifference,
      productionAchievementRate: slot.productionAchievementRate,
      borrowedInManpower: slot.borrowedInManpower,
      borrowedInPosition: slot.borrowedInPosition,
      lentOutManpower: slot.lentOutManpower,
      lentOutPosition: slot.lentOutPosition,
      ictPassRate: slot.ictPassRate,
      fctPassRate: slot.fctPassRate,
      reasonRemark: slot.reasonRemark || ''
    }))
  }
  // 有 id 时表示更新同一制程段记录；无 id 时由后端按 recordKey 新建或匹配
  if (body.id) {
    data.id = body.id
  }
  return post('/performance/capacity', data, { showError: true })
}

/**
 * 工时统计提交
 * @param {Object} body - 与 worktime.vue 表单一致（camelCase）
 * @returns {Promise<{ success: boolean, id?: string }>}
 */
export const postWorktime = (body) => {
  const data = {
    productionBatch: body.productionBatch,
    productionModel: body.productionModel,
    singleWorkHours: body.singleWorkHours,
    machineCount: body.machineCount,
    outputWorkHours: body.outputWorkHours,
    exceptionReason: body.exceptionReason,
    exceptionDuration: body.exceptionDuration,
    workshop: body.workshop,
    productionLine: body.productionLine,
    team: body.team,
    teamLeader: body.teamLeader,
    attendanceCount: body.attendanceCount,
    actualStartDate: body.actualStartDate,
    actualStartTime: body.actualStartTime,
    actualEndDate: body.actualEndDate,
    actualEndTime: body.actualEndTime,
    actualOutput: body.actualOutput,
    lendHours: body.lendHours,
    borrowHours: body.borrowHours
  }
  return post('/performance/worktime', data, { showError: true })
}

/**
 * 工时统计列表（可选）
 * @param {Object} params - page, pageSize, productionBatch, team, teamLeader, startDate, endDate
 * @returns {Promise<{ list: Array, total: number }>}
 */
export const getWorktimeList = (params = {}) => {
  const qs = buildQueryString({
    page: params.page,
    pageSize: params.pageSize,
    productionBatch: params.productionBatch,
    team: params.team,
    teamLeader: params.teamLeader,
    startDate: params.startDate,
    endDate: params.endDate
  })
  const url = qs ? `/performance/worktime?${qs}` : '/performance/worktime'
  return get(url, { showError: true }).then((res) => {
    if (res && Array.isArray(res.list)) return { list: res.list, total: res.total ?? res.list.length }
    if (res && Array.isArray(res)) return { list: res, total: res.length }
    return { list: [], total: 0 }
  }).catch(() => ({ list: [], total: 0 }))
}

/**
 * 异常工时 - 生产提交
 * @param {Object} body - name(必填), people, hours, totalHours, remark
 * @returns {Promise<{ abnormalId?: string, [k: string]: any }>}
 */
export const postAbnormal = (body) => {
  const data = {
    name: body.name?.trim() || '',
    people: Number(body.people) || 0,
    hours: Number(body.hours) || 0,
    totalHours: Number(body.totalHours) || 0,
    remark: (body.remark && body.remark.trim()) || ''
  }
  return post('/performance/abnormal', data, { showError: true })
}

/**
 * 异常工时 - 列表
 * @param {Object} params - page, pageSize, source, qualityStatus
 * @returns {Promise<{ list: Array, total: number }>}
 */
export const getAbnormalList = (params = {}) => {
  const qs = buildQueryString({
    page: params.page,
    pageSize: params.pageSize,
    source: params.source,
    qualityStatus: params.qualityStatus
  })
  const url = qs ? `/performance/abnormal?${qs}` : '/performance/abnormal'
  return get(url, { showError: true }).then((res) => {
    if (res && Array.isArray(res.list)) return { list: res.list, total: res.total ?? res.list.length }
    if (res && Array.isArray(res)) return { list: res, total: res.length }
    return { list: [], total: 0 }
  }).catch(() => ({ list: [], total: 0 }))
}

/**
 * 异常工时 - 工程填原因
 * @param {string} abnormalId - 异常记录 id
 * @param {Object} body - { engineeringReason }
 * @returns {Promise<any>}
 */
export const putAbnormalEngineering = (abnormalId, body) => {
  return put(`/performance/abnormal/${abnormalId}/engineering`, {
    engineeringReason: (body.engineeringReason && body.engineeringReason.trim()) || ''
  }, { showError: true })
}

/**
 * 异常工时 - 品质审批
 * @param {string} abnormalId - 异常记录 id
 * @param {Object} body - { status: 'approved'|'rejected', comment?: string }
 * @returns {Promise<any>}
 */
export const putAbnormalQuality = (abnormalId, body) => {
  const data = {
    status: body.status,
    comment: (body.comment && body.comment.trim()) || ''
  }
  return put(`/performance/abnormal/${abnormalId}/quality`, data, { showError: true })
}
