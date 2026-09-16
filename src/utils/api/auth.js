/**
 * 鉴权API服务
 */
import { post } from './request.js'
import { saveToken, clearToken } from './request.js'

/**
 * 普通用户账号密码登录（统一登录接口）
 * 兼容方案：如果新接口不存在，自动降级到旧的 login-admin 接口
 */
export const loginUser = async (username, password) => {
  // 先尝试新的统一登录接口
  try {
    const response = await post('/auth/login', {
      username,
      password
    }, {
      needAuth: false,
      showLoading: true,
      loadingText: '正在验证身份...',
      showError: false // 先不显示错误，如果失败再尝试旧接口
    })
    
    // 保存Token和用户信息
    if (response.token) {
      // 验证Token格式（JWT token应该以 'eyJ' 开头）
      if (!response.token.startsWith('eyJ')) {
        console.error('Token格式不正确，不是有效的JWT token:', response.token.substring(0, 20) + '...')
        throw new Error('登录失败：收到无效的Token格式，请重新登录')
      }
      
      console.log('✅ 使用统一登录接口登录成功')
      console.log('保存Token (JWT格式):', response.token.substring(0, 20) + '...')
      saveToken(response.token, response.refreshToken)
      uni.setStorageSync('userInfo', response.user)
      uni.setStorageSync('userRole', response.user?.role || 'leader')
      
      // 验证Token是否保存成功
      const savedToken = uni.getStorageSync('token')
      if (!savedToken) {
        console.error('Token保存失败！')
        throw new Error('Token保存失败，请重试')
      }
      
      // 再次验证保存的Token格式
      if (!savedToken.startsWith('eyJ')) {
        console.error('保存的Token格式不正确:', savedToken.substring(0, 20) + '...')
        // 清除错误的token
        clearToken()
        throw new Error('Token格式错误，已清除，请重新登录')
      }
      
      console.log('Token保存成功，格式验证通过')
      return response
    } else {
      console.error('登录响应中未包含Token:', response)
      throw new Error('登录失败：未收到Token')
    }
  } catch (error) {
    // 检查是否是接口不存在（404）
    const errorCode = error.code || ''
    const errorMessage = error.message || ''
    const isNotFound = errorCode === 'NOT_FOUND' || errorMessage.includes('404') || errorMessage.includes('资源不存在')
    
    // 如果是接口不存在（404），尝试使用旧的 login-admin 接口（兼容方案）
    if (isNotFound) {
      console.warn('⚠️ 统一登录接口不存在（404），尝试使用旧的 login-admin 接口')
      try {
        // 使用旧的 login-admin 接口
        const response = await loginAdmin(username, password)
        console.log('✅ 使用旧的 login-admin 接口登录成功（兼容模式）')
        return response
      } catch (adminError) {
        // 如果旧接口也失败，抛出原始错误
        console.error('❌ 旧接口也失败:', adminError)
        throw adminError
      }
    } else {
      // 其他错误（包括401认证失败）直接抛出
      // 401表示接口存在但账号密码错误，不应该降级
      throw error
    }
  }
}

/**
 * 管理员账号密码登录
 */
export const loginAdmin = async (username, password) => {
  const response = await post('/auth/login-admin', {
    username,
    password
  }, {
    needAuth: false,
    showLoading: true,
    loadingText: '正在验证管理员身份...',
    showError: true
  })
  
  // 保存Token和用户信息
  if (response.token) {
    // 验证Token格式（JWT token应该以 'eyJ' 开头）
    if (!response.token.startsWith('eyJ')) {
      console.error('Token格式不正确，不是有效的JWT token:', response.token.substring(0, 20) + '...')
      throw new Error('登录失败：收到无效的Token格式，请重新登录')
    }
    
    console.log('保存Token (JWT格式):', response.token.substring(0, 20) + '...')
    saveToken(response.token, response.refreshToken)
    uni.setStorageSync('userInfo', response.user)
    uni.setStorageSync('userRole', response.user?.role || 'leader')
    
    // 验证Token是否保存成功
    const savedToken = uni.getStorageSync('token')
    if (!savedToken) {
      console.error('Token保存失败！')
      throw new Error('Token保存失败，请重试')
    }
    
    // 再次验证保存的Token格式
    if (!savedToken.startsWith('eyJ')) {
      console.error('保存的Token格式不正确:', savedToken.substring(0, 20) + '...')
      // 清除错误的token
      clearToken()
      throw new Error('Token格式错误，已清除，请重新登录')
    }
    
    console.log('Token保存成功，格式验证通过')
  } else {
    console.error('登录响应中未包含Token:', response)
    throw new Error('登录失败：未收到Token')
  }
  
  return response
}

/**
 * 微信认证登录
 */
export const loginWechat = async (code, userInfo) => {
  const response = await post('/auth/login-wechat', {
    code,
    userInfo
  }, {
    needAuth: false,
    showLoading: true,
    loadingText: '正在登录...',
    showError: true
  })
  
  // 保存Token和用户信息
  if (response.token) {
    // 验证Token格式（JWT token应该以 'eyJ' 开头）
    if (!response.token.startsWith('eyJ')) {
      console.error('Token格式不正确，不是有效的JWT token:', response.token.substring(0, 20) + '...')
      throw new Error('登录失败：收到无效的Token格式，请重新登录')
    }
    
    console.log('保存Token (JWT格式):', response.token.substring(0, 20) + '...')
    saveToken(response.token, response.refreshToken)
    uni.setStorageSync('userInfo', response.user)
    uni.setStorageSync('userRole', response.user?.role || 'leader')
    
    // 验证Token是否保存成功
    const savedToken = uni.getStorageSync('token')
    if (!savedToken) {
      console.error('Token保存失败！')
      throw new Error('Token保存失败，请重试')
    }
    
    // 再次验证保存的Token格式
    if (!savedToken.startsWith('eyJ')) {
      console.error('保存的Token格式不正确:', savedToken.substring(0, 20) + '...')
      // 清除错误的token
      clearToken()
      throw new Error('Token格式错误，已清除，请重新登录')
    }
    
    console.log('Token保存成功，格式验证通过')
  } else {
    console.error('登录响应中未包含Token:', response)
    throw new Error('登录失败：未收到Token')
  }
  
  return response
}

/**
 * 刷新Token
 */
export const refreshToken = async (refreshTokenValue) => {
  const response = await post('/auth/refresh', {
    refreshToken: refreshTokenValue
  }, {
    needAuth: false,
    showLoading: false,
    showError: false
  })
  
  if (response.token) {
    saveToken(response.token, response.refreshToken)
  }
  
  return response
}

/**
 * 登出
 */
export const logout = async () => {
  const refreshTokenValue = uni.getStorageSync('refreshToken')
  
  if (refreshTokenValue) {
    try {
      await post('/auth/logout', {
        refreshToken: refreshTokenValue
      }, {
        showLoading: false,
        showError: false
      })
    } catch (error) {
      console.error('登出接口调用失败:', error)
    }
  }
  
  // 清除本地存储
  clearToken()
  uni.removeStorageSync('userInfo')
  uni.removeStorageSync('userRole')
}

