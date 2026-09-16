/**
 * 管理员设置页API服务
 */
import { get, post, upload } from './request.js'
import { API_BASE_URL } from './config.js'

/**
 * 获取分组与出勤概览
 */
export const getAttendanceGroups = async () => {
  return await get('/admin/attendance/groups', {
    showLoading: true,
    loadingText: '加载中...',
    showError: true
  })
}

/**
 * 导出某组数据
 */
export const exportGroupData = async (exportData) => {
  return await post('/admin/attendance/export', {
    department: exportData.department,
    groupName: exportData.groupName,
    leaderId: exportData.leaderId,
    startDate: exportData.startDate,
    endDate: exportData.endDate,
    includeHistory: exportData.includeHistory || false
  }, {
    showLoading: true,
    loadingText: '正在生成导出文件...',
    showError: true
  })
}

/**
 * 导出全部数据
 */
export const exportAllData = async (startDate, endDate) => {
  return await post('/admin/attendance/export/all', {
    startDate,
    endDate
  }, {
    showLoading: true,
    loadingText: '正在生成导出文件...',
    showError: true
  })
}

/**
 * 查询导出进度
 */
export const getExportProgress = async (taskId) => {
  return await get(`/admin/attendance/export/${taskId}`, {
    showLoading: false,
    showError: true
  })
}

/**
 * 上传打卡机数据
 */
export const uploadAttendanceData = async (filePath, startDate, endDate) => {
  const formData = {}
  if (startDate) formData.startDate = startDate
  if (endDate) formData.endDate = endDate
  
  return await upload('/admin/attendance/upload', filePath, formData, {
    showLoading: true,
    loadingText: '上传中...',
    showError: true
  })
}

/**
 * 下载上传异常报告
 */
export const downloadAnomalyReport = async (uploadId) => {
  // 直接使用uni.downloadFile下载文件
  const token = uni.getStorageSync('token')
  
  return new Promise((resolve, reject) => {
    uni.downloadFile({
      url: `${API_BASE_URL}/admin/attendance/upload/${uploadId}/report`,
      header: {
        'Authorization': `Bearer ${token}`
      },
      success: (res) => {
        if (res.statusCode === 200) {
          // 保存文件到本地
          uni.saveFile({
            tempFilePath: res.tempFilePath,
            success: (saveRes) => {
              resolve(saveRes.savedFilePath)
            },
            fail: (err) => {
              reject(err)
            }
          })
        } else {
          reject(new Error('下载失败'))
        }
      },
      fail: (err) => {
        reject(err)
      }
    })
  })
}

