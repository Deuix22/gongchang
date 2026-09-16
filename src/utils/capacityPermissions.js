/**
 * 产能基础数据维护权限
 * - admin：平台管理员
 * - manager / 管理员：全局管理员（与后端 PUT /capacity/meta 文档一致）
 * - 白名单 userId：单独开通的账号
 */
export const CAPACITY_BASE_CONFIG_USER_IDS = ['manager_j4kcpw']

export const resolveCapacityPermissionUser = (user = {}) => {
  const stored = uni.getStorageSync('userInfo') || {}
  return {
    role: String(user.role || uni.getStorageSync('userRole') || stored.role || '').trim(),
    userId: String(
      user.userId ||
        user.id ||
        user.username ||
        user.userName ||
        stored.userId ||
        stored.id ||
        stored.username ||
        stored.userName ||
        ''
    ).trim()
  }
}

export const canManageCapacityBaseConfig = (user = {}) => {
  const { role, userId } = resolveCapacityPermissionUser(user)
  if (role === 'admin') return true
  if (role === 'manager' || role === '管理员') return true
  if (userId && CAPACITY_BASE_CONFIG_USER_IDS.includes(userId)) return true
  return false
}
