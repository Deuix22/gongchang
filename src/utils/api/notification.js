/**
 * 通知API服务
 */
import { post, get } from './request.js'

/**
 * 发送微信通知（异常提醒）
 * @param {Object} params - 通知参数
 * @param {Array} params.targets - 目标用户列表，格式: [{userId, wechatOpenId}]
 * @param {String} params.templateId - 微信模板ID（可选，后端可能使用默认模板）
 * @param {Object} params.data - 通知数据
 * @returns {Promise}
 */
export const sendWechatNotification = async (params) => {
  return await post('/notifications/wechat', params, {
    showLoading: false, // 不显示loading，因为是在后台发送
    showError: false, // 不显示错误提示，避免打断用户操作
  })
}

/**
 * 获取所有已绑定微信的管理员和admin用户
 * @returns {Promise<Array>} 返回已绑定微信的用户列表，格式: [{userId, wechatOpenId}]
 */
export const getWechatBoundAdmins = async () => {
  try {
    // 获取所有用户（不显示loading，因为是在后台调用）
    const users = await get('/users', {
      showLoading: false,
      showError: false
    })
    
    // 如果返回的不是数组，尝试从响应中提取
    const userList = Array.isArray(users) ? users : (users?.data || users?.users || [])
    
    // 过滤出已绑定微信的管理员和admin用户
    const boundAdmins = userList.filter(user => {
      const isAdmin = user.role === 'admin' || user.role === '管理员' || user.role === 'manager'
      const hasWechat = user.wechatOpenId || user.openId
      return isAdmin && hasWechat
    })
    
    console.log('已绑定微信的管理员数量:', boundAdmins.length)
    
    // 返回格式化的目标用户列表
    return boundAdmins.map(user => ({
      userId: user.userId || user.username,
      wechatOpenId: user.wechatOpenId || user.openId
    }))
  } catch (error) {
    console.error('获取已绑定微信的管理员失败:', error)
    return []
  }
}

