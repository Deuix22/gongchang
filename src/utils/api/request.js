/**
 * 统一请求封装
 */
import { API_BASE_URL, TIMEOUT, UPLOAD_TIMEOUT, ERROR_CODES, BASE_URL } from './config.js'

/**
 * 获取Token
 */
const getToken = () => {
  return uni.getStorageSync('token') || ''
}

/**
 * 获取RefreshToken
 */
const getRefreshToken = () => {
  return uni.getStorageSync('refreshToken') || ''
}

/**
 * 保存Token
 */
const saveToken = (token, refreshToken) => {
  if (token) {
    uni.setStorageSync('token', token)
  }
  if (refreshToken) {
    uni.setStorageSync('refreshToken', refreshToken)
  }
}

/**
 * 清除Token
 */
const clearToken = () => {
  uni.removeStorageSync('token')
  uni.removeStorageSync('refreshToken')
}

/**
 * 处理错误响应
 */
const handleError = (error, res) => {
  console.error('API请求错误:', error, res)
  
  // 如果是网络错误
  if (error.errMsg && error.errMsg.includes('timeout')) {
    return {
      code: 'TIMEOUT',
      message: '请求超时，请稍后重试（识别/上传可能较慢）',
      details: {}
    }
  }
  
  if (error.errMsg && error.errMsg.includes('fail')) {
    return {
      code: 'NETWORK_ERROR',
      message: '网络请求失败，请检查网络连接',
      details: {}
    }
  }
  
  // 如果是HTTP错误响应
  if (res && res.data && res.data.error) {
    return res.data.error
  }
  
  // 默认错误
  return {
    code: 'UNKNOWN_ERROR',
    message: error.message || '未知错误',
    details: {}
  }
}

/**
 * 刷新Token
 */
const refreshToken = async () => {
  const refreshTokenValue = getRefreshToken()
  if (!refreshTokenValue) {
    return null
  }
  
  try {
    const res = await uni.request({
      url: `${API_BASE_URL}/auth/refresh`,
      method: 'POST',
      data: {
        refreshToken: refreshTokenValue
      },
      timeout: TIMEOUT
    })
    
    if (res.statusCode === 200 && res.data && res.data.token) {
      saveToken(res.data.token, res.data.refreshToken)
      return res.data.token
    }
    
    return null
  } catch (error) {
    console.error('刷新Token失败:', error)
    return null
  }
}

/**
 * 统一请求方法
 */
const hideLoadingSafely = (() => {
  let lastError = ''
  return () => {
    try {
      uni.hideLoading()
    } catch (err) {
      const msg = err?.errMsg || err?.message || ''
      if (!msg) return
      if (msg.includes("toast can't be found")) {
        return
      }
      if (msg !== lastError) {
        console.warn('hideLoading 调用异常:', msg)
        lastError = msg
      }
    }
  }
})()

export const request = async (options) => {
  const {
    url,
    method = 'GET',
    data = {},
    header = {},
    needAuth = true,
    showLoading = false,
    loadingText = '加载中...',
    showError = true,
    timeout = TIMEOUT
  } = options
  
  // 显示加载提示
  if (showLoading) {
    uni.showLoading({
      title: loadingText,
      mask: true
    })
  }
  
  // 构建请求头
  const requestHeader = {
    'Content-Type': 'application/json',
    ...header
  }
  
  // 添加认证头
  if (needAuth) {
    const token = getToken()
    if (token) {
      // 确保Token格式正确：Bearer <token>（去除可能的前缀）
      const cleanToken = token.replace(/^Bearer\s+/i, '').trim()
      
      // 验证Token格式（JWT token应该以 'eyJ' 开头）
      if (!cleanToken.startsWith('eyJ')) {
        console.error('⚠️ Token格式不正确，不是有效的JWT token:', cleanToken.substring(0, 30) + '...')
        console.error('⚠️ 这可能是降级逻辑产生的模拟token，请清除并重新登录')
        // 清除无效token
        clearToken()
        uni.removeStorageSync('userInfo')
        uni.removeStorageSync('userRole')
        
        if (showError) {
          uni.showToast({
            title: 'Token格式错误，请重新登录',
            icon: 'none',
            duration: 2000
          })
        }
        
        setTimeout(() => {
          uni.redirectTo({
            url: '/pages/login/login'
          })
        }, 2000)
        
        throw new Error('Token格式错误，请重新登录')
      }
      
      requestHeader['Authorization'] = `Bearer ${cleanToken}`
      console.log('✅ 添加Authorization头 (JWT格式):', `Bearer ${cleanToken.substring(0, 20)}...`)
    } else {
      console.warn('⚠️ 需要认证但未找到Token，请求可能失败')
    }
  }
  
  // 构建完整URL
  let fullUrl = url.startsWith('http') ? url : `${API_BASE_URL}${url}`
  
  // 调试日志：记录请求信息
  console.log(`📤 [API请求] ${method} ${fullUrl}`)
  if (data && Object.keys(data).length > 0) {
    console.log('📤 [请求数据]:', JSON.stringify(data))
  }
  if (requestHeader['Authorization']) {
    console.log('📤 [Authorization]:', requestHeader['Authorization'].substring(0, 30) + '...')
  }
  
  try {
    const res = await uni.request({
      url: fullUrl,
      method,
      data,
      header: requestHeader,
      timeout
    })
    
    // 调试日志：记录响应信息
    console.log(`📥 [API响应] ${method} ${fullUrl} - Status: ${res.statusCode}`)
    if (res.statusCode !== 200 && res.statusCode !== 201 && res.statusCode !== 202) {
      console.error('📥 [响应错误]:', res.data)
    }
    
    // 隐藏加载提示
    if (showLoading) {
      hideLoadingSafely()
    }
    
    // 处理401未授权 - 尝试刷新Token
    if (res.statusCode === 401 && needAuth) {
      const newToken = await refreshToken()
      if (newToken) {
        // 重新请求
        requestHeader['Authorization'] = `Bearer ${newToken}`
        const retryRes = await uni.request({
          url: fullUrl,
          method,
          data,
          header: requestHeader,
          timeout
        })
        
        if (retryRes.statusCode === 200 || retryRes.statusCode === 201) {
          return retryRes.data
        }
      } else {
        // 刷新Token失败，清除登录信息并跳转到登录页
        clearToken()
        uni.removeStorageSync('userInfo')
        uni.removeStorageSync('userRole')
        
        if (showError) {
          uni.showToast({
            title: '登录已过期，请重新登录',
            icon: 'none',
            duration: 2000
          })
        }
        
        setTimeout(() => {
          uni.redirectTo({
            url: '/pages/login/login'
          })
        }, 2000)
        
        throw new Error('登录已过期')
      }
    }
    
    // 处理成功响应
    if (res.statusCode === 200 || res.statusCode === 201 || res.statusCode === 202) {
      return res.data
    }
    
    // 处理错误响应（400, 403, 404, 500等）
    // 检查后端返回的错误格式
    let errorInfo = null
    if (res.data && res.data.error) {
      // 后端返回的标准错误格式：{ error: { code, message, details } }
      errorInfo = res.data.error
    } else if (res.data && res.data.message) {
      // 兼容其他错误格式
      errorInfo = {
        code: res.data.code || `HTTP_${res.statusCode}`,
        message: res.data.message,
        details: res.data
      }
    } else if (res.statusCode === 404) {
      // 404 错误：资源不存在或接口未实现
      errorInfo = {
        code: 'NOT_FOUND',
        message: '资源不存在',
        details: { statusCode: 404, url: fullUrl }
      }
    } else {
      // 使用通用错误处理
      errorInfo = handleError(null, res)
      // 如果没有从 handleError 获取到状态码，使用响应状态码
      if (!errorInfo.code && res.statusCode) {
        errorInfo.code = `HTTP_${res.statusCode}`
      }
    }
    
    if (showError) {
      uni.showToast({
        title: errorInfo.message || '请求失败',
        icon: 'none',
        duration: 2000
      })
    }
    
    // 抛出错误，包含完整的错误信息
    const error = new Error(errorInfo.message || '请求失败')
    error.code = errorInfo.code
    error.details = errorInfo.details
    throw error
    
  } catch (error) {
    // 隐藏加载提示
    if (showLoading) {
      hideLoadingSafely()
    }
    
    // 检查是否是域名白名单问题（只检查明确的域名错误）
    if (error.errMsg && (
      error.errMsg.includes('不在以下 request 合法域名列表中') || 
      error.errMsg.includes('not in domain list') ||
      error.errMsg.includes('域名不在白名单')
    )) {
      console.error('❌ [域名白名单错误] 请在小程序后台配置服务器域名:', BASE_URL)
      if (showError) {
        uni.showModal({
          title: '网络配置错误',
          content: `请在小程序后台配置服务器域名：\n${BASE_URL}\n\n配置路径：开发 → 开发管理 → 开发设置 → 服务器域名`,
          showCancel: false,
          confirmText: '知道了'
        })
      }
      const err = new Error('服务器域名未配置，请在小程序后台添加域名白名单')
      err.code = 'DOMAIN_NOT_ALLOWED'
      err.details = { domain: BASE_URL, fullUrl }
      throw err
    }
    
    // 业务错误已在上面整理过（含 409 BOX_ALREADY_SHIPPED），不要再包成网络错误
    if (error?.code && !error.errMsg) {
      throw error
    }

    const errorInfo = handleError(error, null)
    
    if (showError) {
      uni.showToast({
        title: errorInfo.message || '网络错误',
        icon: 'none',
        duration: 2000
      })
    }
    
    // 抛出错误对象，包含code和details
    const err = new Error(errorInfo.message || error.message || '网络错误')
    err.code = errorInfo.code || error.code
    err.details = errorInfo.details || { errMsg: error.errMsg, url: fullUrl }
    throw err
  }
}

/**
 * GET请求
 */
export const get = (url, options = {}) => {
  return request({
    url,
    method: 'GET',
    ...options
  })
}

/**
 * POST请求
 */
export const post = (url, data = {}, options = {}) => {
  return request({
    url,
    method: 'POST',
    data,
    ...options
  })
}

/**
 * PUT请求
 */
export const put = (url, data = {}, options = {}) => {
  return request({
    url,
    method: 'PUT',
    data,
    ...options
  })
}

/**
 * DELETE请求
 */
export const del = (url, options = {}) => {
  return request({
    url,
    method: 'DELETE',
    ...options
  })
}

/**
 * 文件上传
 */
export const upload = async (url, filePath, formData = {}, options = {}) => {
  const {
    needAuth = true,
    showLoading = true,
    loadingText = '上传中...',
    showError = true,
    timeout = UPLOAD_TIMEOUT
  } = options
  
  // 显示加载提示
  if (showLoading) {
    uni.showLoading({
      title: loadingText,
      mask: true
    })
  }
  
  // 构建请求头
  const header = {}
  
  // 添加认证头
  if (needAuth) {
    const token = getToken()
    if (token) {
      // 确保Token格式正确：Bearer <token>（去除可能的前缀）
      const cleanToken = token.replace(/^Bearer\s+/i, '').trim()
      
      // 验证Token格式（JWT token应该以 'eyJ' 开头）
      if (!cleanToken.startsWith('eyJ')) {
        console.error('⚠️ 上传时Token格式不正确:', cleanToken.substring(0, 30) + '...')
        // 清除无效token
        clearToken()
        uni.removeStorageSync('userInfo')
        uni.removeStorageSync('userRole')
        
        if (showError) {
          uni.showToast({
            title: 'Token格式错误，请重新登录',
            icon: 'none',
            duration: 2000
          })
        }
        
        throw new Error('Token格式错误，请重新登录')
      }
      
      header['Authorization'] = `Bearer ${cleanToken}`
      console.log('✅ 上传添加Authorization头 (JWT格式):', `Bearer ${cleanToken.substring(0, 20)}...`)
    } else {
      console.warn('⚠️ 需要认证但未找到Token，上传可能失败')
    }
  }
  
  try {
    const res = await uni.uploadFile({
      url: url.startsWith('http') ? url : `${API_BASE_URL}${url}`,
      filePath,
      name: 'file',
      formData,
      header,
      timeout
    })
    
    // 隐藏加载提示
    if (showLoading) {
      hideLoadingSafely()
    }
    
    // 解析响应（uni.uploadFile返回的是字符串）
    let responseData = {}
    try {
      responseData = JSON.parse(res.data)
    } catch (e) {
      console.error('解析上传响应失败:', e)
      if (showError) {
        uni.showToast({
          title: '上传失败',
          icon: 'none',
          duration: 2000
        })
      }
      throw new Error('上传失败')
    }
    
    // 处理错误响应
    if (res.statusCode !== 200 && res.statusCode !== 201) {
      const error = responseData.error || {
        code: 'UPLOAD_ERROR',
        message: '上传失败',
        details: {}
      }
      
      if (showError) {
        uni.showToast({
          title: error.message || '上传失败',
          icon: 'none',
          duration: 2000
        })
      }
      
      throw new Error(error.message || '上传失败')
    }
    
    return responseData
    
  } catch (error) {
    // 隐藏加载提示
    if (showLoading) {
      hideLoadingSafely()
    }
    
    if (showError) {
      uni.showToast({
        title: error.message || '上传失败',
        icon: 'none',
        duration: 2000
      })
    }
    
    throw error
  }
}

// 导出Token管理方法
export { getToken, saveToken, clearToken, getRefreshToken }

