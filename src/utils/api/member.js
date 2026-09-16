/**
 * 组员管理API服务
 */
import { get, post, put, del } from './request.js'

/**
 * 获取组员列表
 */
export const getMembers = async (leaderId) => {
  return await get(`/leaders/${leaderId}/members`, {
    showLoading: false,
    showError: true
  })
}

/**
 * 新增组员
 */
export const createMember = async (leaderId, memberData, options = {}) => {
  return await post(`/leaders/${leaderId}/members`, {
    name: memberData.name,
    shiftType: memberData.shiftType || 'day'
  }, {
    showLoading: true,
    loadingText: '添加中...',
    showError: true,
    ...options
  })
}

/**
 * 修改组员信息
 */
export const updateMember = async (leaderId, memberId, memberData, options = {}) => {
  return await put(`/leaders/${leaderId}/members/${memberId}`, {
    name: memberData.name,
    shiftType: memberData.shiftType
  }, {
    showLoading: true,
    loadingText: '保存中...',
    showError: true,
    ...options
  })
}

/**
 * 删除组员
 */
export const deleteMember = async (leaderId, memberId, options = {}) => {
  return await del(`/leaders/${leaderId}/members/${memberId}`, {
    showLoading: true,
    loadingText: '删除中...',
    showError: true,
    ...options
  })
}

