/**
 * 用户与部门API服务
 */
import { get, post, put, del } from './request.js'

/**
 * 查询当前用户信息
 */
export const getCurrentUser = async () => {
  return await get('/users/me', {
    showLoading: false,
    showError: true
  })
}

/**
 * 获取所有用户（admin权限）
 */
export const getAllUsers = async () => {
  return await get('/users', {
    showLoading: true,
    loadingText: '加载中...',
    showError: true
  })
}

/**
 * 提升组长为管理员
 */
export const promoteUser = async (userId) => {
  return await post(`/users/${userId}/promote`, {}, {
    showLoading: true,
    loadingText: '处理中...',
    showError: true
  })
}

/**
 * 撤销管理员为组长
 */
export const demoteUser = async (userId) => {
  return await post(`/users/${userId}/demote`, {}, {
    showLoading: true,
    loadingText: '处理中...',
    showError: true
  })
}

/**
 * 绑定/修改组长所属部门
 */
export const updateLeaderDepartment = async (leaderId, department) => {
  return await put(`/leaders/${leaderId}/department`, {
    department
  }, {
    showLoading: true,
    loadingText: '保存中...',
    showError: true
  })
}

/**
 * 取消绑定部门
 */
export const deleteLeaderDepartment = async (leaderId) => {
  return await del(`/leaders/${leaderId}/department`, {
    showLoading: true,
    loadingText: '删除中...',
    showError: true
  })
}

/**
 * 获取全部组长与部门映射
 */
export const getAllLeaders = async (includeMembers = false) => {
  const params = includeMembers ? '?includeMembers=true' : ''
  return await get(`/leaders${params}`, {
    showLoading: true,
    loadingText: '加载中...',
    showError: true
  })
}

/**
 * 更新当前用户信息（昵称等）
 */
export const updateCurrentUser = async (userData) => {
  return await put('/users/me', userData, {
    showLoading: true,
    loadingText: '保存中...',
    showError: true
  })
}

/**
 * 删除用户（admin权限）
 */
export const deleteUser = async (userId) => {
  return await del(`/users/${userId}`, {
    showLoading: true,
    loadingText: '删除中...',
    showError: true
  })
}

/**
 * 创建用户（admin权限）
 */
export const createUser = async (userData) => {
  return await post('/users', userData, {
    showLoading: true,
    loadingText: '创建中...',
    showError: true
  })
}

