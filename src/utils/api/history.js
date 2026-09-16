/**
 * 出勤历史记录API服务
 */
import { get, post } from './request.js'

/**
 * 新增历史记录
 */
export const createHistory = async (historyData) => {
  return await post('/attendance/history', {
    leaderId: historyData.leaderId,
    department: historyData.department,
    memberId: historyData.memberId,
    memberName: historyData.memberName,
    field: historyData.field,
    oldValue: historyData.oldValue,
    newValue: historyData.newValue,
    changedBy: historyData.changedBy,
    changedAt: historyData.changedAt || new Date().toISOString()
  }, {
    showLoading: false,
    showError: false // 历史记录失败不显示错误，避免影响用户体验
  })
}

/**
 * 查询历史记录
 */
export const getHistory = async (params = {}) => {
  const queryEntries = []
  const appendParam = (key, value) => {
    if (value === undefined || value === null || value === '') return
    queryEntries.push(`${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
  }
  
  appendParam('department', params.department)
  appendParam('leaderId', params.leaderId)
  appendParam('memberName', params.memberName)
  appendParam('field', params.field)
  appendParam('start', params.start)
  appendParam('end', params.end)
  
  const queryString = queryEntries.join('&')
  const url = `/attendance/history${queryString ? `?${queryString}` : ''}`
  
  const response = await get(url, {
    showLoading: true,
    loadingText: '加载历史记录...',
    showError: true
  })
  
  // 处理不同的响应格式
  // 如果后端返回的是 { records: [...] } 格式，提取 records
  // 如果后端返回的是数组，直接返回
  if (response && typeof response === 'object') {
    if (Array.isArray(response)) {
      return response
    } else if (response.records && Array.isArray(response.records)) {
      return response.records
    } else if (response.data && Array.isArray(response.data)) {
      return response.data
    }
  }
  
  // 如果格式不符合预期，返回空数组
  console.warn('⚠️ 历史记录API返回格式不符合预期:', response)
  return []
}

