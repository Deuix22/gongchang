/**
 * API配置
 */

// 根据环境变量或编译条件判断使用哪个API地址
// #ifdef H5
const isDev = process.env.NODE_ENV === 'development'
// #endif
// #ifndef H5
const isDev = false // 小程序/App环境默认使用生产环境
// #endif

// API基础配置
export const API_CONFIG = {
  // 开发环境
  dev: {
    baseURL: 'https://hvoqpnuvbtfp.sealosbja.site',
    timeout: 60000, // 普通接口 60s
    uploadTimeout: 120000 // 上传/OCR 120s
  },
  // 生产环境
  prod: {
    baseURL: 'https://hvoqpnuvbtfp.sealosbja.site',
    timeout: 60000,
    uploadTimeout: 120000
  }
}

// 当前使用的配置
export const BASE_URL = isDev ? API_CONFIG.dev.baseURL : API_CONFIG.prod.baseURL
export const API_PREFIX = '/api'
export const TIMEOUT = isDev ? API_CONFIG.dev.timeout : API_CONFIG.prod.timeout
/** 文件上传、OCR 识别等耗时接口 */
export const UPLOAD_TIMEOUT = isDev
  ? API_CONFIG.dev.uploadTimeout
  : API_CONFIG.prod.uploadTimeout

// 完整API地址
export const API_BASE_URL = `${BASE_URL}${API_PREFIX}`

// 错误码映射
export const ERROR_CODES = {
  INVALID_PARAMS: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  INTERNAL_ERROR: 500
}
