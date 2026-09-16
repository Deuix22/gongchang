/**
 * 得力云 API 对接
 * 文档：https://doc.delicloud.com/v3/integration/oa.html
 */
import md5 from '../md5.js'

// H5 开发环境走 Vite 代理，避免浏览器 CORS 拦截；小程序/App 直连
// #ifdef H5
const DELI_API_BASE = process.env.NODE_ENV === 'development'
  ? '/delicloud-api'
  : 'https://v2-api.delicloud.com'
// #endif
// #ifndef H5
const DELI_API_BASE = 'https://v2-api.delicloud.com'
// #endif
const APP_KEY = '40c7098bbb2862b80b70b3297c4631ce'
const APP_SECRET = 'dk9dojkkpaasbabwxj7hsocavei5wd0b'
const PAGE_SIZE = 100

const buildHeaders = (path) => {
  const timestamp = String(Date.now())
  const sig = md5(`${path}${timestamp}${APP_KEY}${APP_SECRET}`).toLowerCase()
  return {
    'Content-Type': 'application/json; charset=UTF-8',
    'App-Key': APP_KEY,
    'App-Timestamp': timestamp,
    'App-Sig': sig
  }
}

const deliRequest = (path, data = {}) => {
  const url = `${DELI_API_BASE}${path}`
  return new Promise((resolve, reject) => {
    uni.request({
      url,
      method: 'POST',
      data,
      header: buildHeaders(path),
      timeout: 30000,
      success: (res) => {
        if (res.statusCode === 200 && res.data) {
          resolve(res.data)
        } else {
          reject(new Error(res.data?.msg || `请求失败(${res.statusCode})`))
        }
      },
      fail: (err) => {
        reject(new Error(err.errMsg || '网络请求失败'))
      }
    })
  })
}

const fetchAllPages = async (path) => {
  let offset = 0
  let allRows = []
  let total = Infinity

  while (offset < total) {
    const result = await deliRequest(path, { limit: PAGE_SIZE, offset })
    if (result.code !== 0) {
      throw new Error(result.msg || `得力接口错误(code: ${result.code})`)
    }
    const rows = result.data?.rows || []
    total = parseInt(result.data?.total || '0', 10)
    allRows = allRows.concat(rows)
    offset += PAGE_SIZE
    if (rows.length === 0) break
  }

  return allRows
}

/** 查询部门列表 */
export const queryDepartments = () => fetchAllPages('/v2.0/department/query')

/** 查询员工列表 */
export const queryEmployees = () => fetchAllPages('/v2.0/employee/query')

const CLOUD_API_PATH = '/v2.0/cloudappapi'

const cloudAppRequest = (cmd, data = {}, module = 'CHECKIN') => {
  const url = `${DELI_API_BASE}${CLOUD_API_PATH}`
  return new Promise((resolve, reject) => {
    uni.request({
      url,
      method: 'POST',
      data,
      header: {
        ...buildHeaders(CLOUD_API_PATH),
        'Api-Module': module,
        'Api-Cmd': cmd
      },
      timeout: 30000,
      success: (res) => {
        if (res.statusCode === 200 && res.data) {
          resolve(res.data)
        } else {
          reject(new Error(res.data?.msg || `请求失败(${res.statusCode})`))
        }
      },
      fail: (err) => {
        reject(new Error(err.errMsg || '网络请求失败'))
      }
    })
  })
}

const CHECKIN_INIT_KEY = 'deli_checkin_inited'
const CHECKIN_NEXT_ID_KEY = 'deli_checkin_next_id'
const CHECKIN_CACHE_KEY = 'deli_checkin_records'

/** 考勤数据初始化（仅需一次，初始化后才可同步打卡） */
export const initCheckinSync = async () => {
  if (uni.getStorageSync(CHECKIN_INIT_KEY)) return true
  const result = await cloudAppRequest('checkin_query_init', {})
  if (result.code !== 0) {
    throw new Error(result.msg || `考勤初始化失败(code: ${result.code})`)
  }
  uni.setStorageSync(CHECKIN_INIT_KEY, true)
  return true
}

const readCheckinCache = () => {
  try {
    return uni.getStorageSync(CHECKIN_CACHE_KEY) || []
  } catch {
    return []
  }
}

const saveCheckinCache = (records, nextId) => {
  uni.setStorageSync(CHECKIN_CACHE_KEY, records)
  if (nextId != null) {
    uni.setStorageSync(CHECKIN_NEXT_ID_KEY, nextId)
  }
}

/** 同步打卡记录（增量），并与本地缓存合并 */
export const queryAllCheckinRecords = async () => {
  await initCheckinSync()

  const cached = readCheckinCache()
  const merged = [...cached]
  const seen = new Set(cached.map((item) => String(item.id)))
  let nextId = uni.getStorageSync(CHECKIN_NEXT_ID_KEY)
  if (nextId === '' || nextId == null) nextId = 0

  for (let i = 0; i < 200; i += 1) {
    const result = await cloudAppRequest('checkin_query', {
      next_id: Number(nextId) || 0,
      page_size: 500
    })
    if (result.code !== 0) {
      throw new Error(result.msg || `打卡同步失败(code: ${result.code})`)
    }
    const rows = result.data?.data || []
    const newNextId = result.data?.next_id

    rows.forEach((row) => {
      const key = String(row.id)
      if (!seen.has(key)) {
        seen.add(key)
        merged.push(row)
      }
    })

    if (newNextId != null) {
      saveCheckinCache(merged, newNextId)
    }

    if (!rows.length) break
    if (newNextId == null || Number(newNextId) === Number(nextId)) break
    nextId = newNextId
  }
  return merged
}
