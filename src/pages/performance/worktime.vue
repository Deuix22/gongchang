<template>
  <view class="worktime-container">
    <!-- 自定义导航栏 -->
    <view class="nav-bar">
      <view class="nav-back" @tap="handleBack">
        <text class="nav-back-icon">←</text>
      </view>
      <view class="nav-title">工时统计</view>
      <view class="nav-placeholder"></view>
    </view>

    <scroll-view scroll-y class="scroll-area">
      <!-- 表单区域 -->
      <view class="section-card">

        <!-- 生产批次 -->
        <view class="form-item">
          <text class="form-label">生产批次</text>
          <input
            class="form-input"
            v-model="form.productionBatch"
            placeholder="请输入生产批次"
            placeholder-class="form-placeholder"
          />
        </view>

        <!-- 生产机型 -->
        <view class="form-item">
          <text class="form-label">生产机型</text>
          <picker
            mode="selector"
            :range="modelOptions"
            @change="onModelChange"
          >
            <view class="form-picker">
              <text class="form-picker-text">
                {{ form.productionModel || '请选择生产机型' }}
              </text>
              <text class="form-picker-arrow">›</text>
            </view>
          </picker>
        </view>

        <!-- 单台工时 -->
        <view class="form-item">
          <text class="form-label">单台工时</text>
          <input
            class="form-input"
            v-model="form.singleWorkHours"
            type="digit"
            placeholder="请输入单台工时"
            placeholder-class="form-placeholder"
          />
        </view>

        <!-- 机器数量 -->
        <view class="form-item">
          <text class="form-label">机器数量</text>
          <input
            class="form-input"
            v-model="form.machineCount"
            type="number"
            placeholder="请输入机器数量"
            placeholder-class="form-placeholder"
          />
        </view>

        <!-- 产出工时 -->
        <view class="form-item">
          <text class="form-label">产出工时</text>
          <input
            class="form-input"
            v-model="form.outputWorkHours"
            type="digit"
            placeholder="自动计算或手动输入"
            placeholder-class="form-placeholder"
          />
        </view>

        <!-- 异常原因 -->
        <view class="form-item form-item-textarea">
          <text class="form-label">异常原因</text>
          <textarea
            class="form-textarea"
            v-model="form.exceptionReason"
            placeholder="请输入异常原因"
            placeholder-class="form-placeholder"
            auto-height
          />
        </view>

        <!-- 异常时间 -->
        <view class="form-item">
          <text class="form-label">异常时间</text>
          <input
            class="form-input"
            v-model="form.exceptionDuration"
            placeholder="请输入异常时间"
            placeholder-class="form-placeholder"
          />
        </view>

        <!-- 生产车间 -->
        <view class="form-item">
          <text class="form-label">生产车间</text>
          <input
            class="form-input"
            v-model="form.workshop"
            placeholder="请输入生产车间"
            placeholder-class="form-placeholder"
          />
        </view>

        <!-- 生产线 -->
        <view class="form-item">
          <text class="form-label">生产线</text>
          <input
            class="form-input"
            v-model="form.productionLine"
            placeholder="请输入生产线"
            placeholder-class="form-placeholder"
          />
        </view>

        <!-- 班组 -->
        <view class="form-item">
          <text class="form-label">班组</text>
          <input
            class="form-input"
            v-model="form.team"
            placeholder="请输入班组"
            placeholder-class="form-placeholder"
          />
        </view>

        <!-- 班组长 -->
        <view class="form-item">
          <text class="form-label">班组长</text>
          <input
            class="form-input"
            v-model="form.teamLeader"
            placeholder="请输入班组长"
            placeholder-class="form-placeholder"
          />
        </view>

        <!-- 出勤人数 -->
        <view class="form-item">
          <text class="form-label">出勤人数</text>
          <input
            class="form-input"
            v-model="form.attendanceCount"
            type="number"
            placeholder="请输入出勤人数"
            placeholder-class="form-placeholder"
          />
        </view>

        <!-- 实际开工时间 -->
        <view class="form-item">
          <text class="form-label">实际开工时间</text>
          <view class="datetime-row">
            <picker mode="date" :value="form.actualStartDate" @change="onStartDateChange">
              <view class="datetime-btn">
                <text>{{ form.actualStartDate || '日期' }}</text>
              </view>
            </picker>
            <picker mode="time" :value="form.actualStartTime" @change="onStartTimeChange">
              <view class="datetime-btn">
                <text>{{ form.actualStartTime || '时间' }}</text>
              </view>
            </picker>
          </view>
        </view>

        <!-- 实际完工时间 -->
        <view class="form-item">
          <text class="form-label">实际完工时间</text>
          <view class="datetime-row">
            <picker mode="date" :value="form.actualEndDate" @change="onEndDateChange">
              <view class="datetime-btn">
                <text>{{ form.actualEndDate || '日期' }}</text>
              </view>
            </picker>
            <picker mode="time" :value="form.actualEndTime" @change="onEndTimeChange">
              <view class="datetime-btn">
                <text>{{ form.actualEndTime || '时间' }}</text>
              </view>
            </picker>
          </view>
        </view>

        <!-- 实际生产数量 -->
        <view class="form-item">
          <text class="form-label">实际生产数量</text>
          <input
            class="form-input"
            v-model="form.actualOutput"
            type="number"
            placeholder="请输入实际生产数量"
            placeholder-class="form-placeholder"
          />
        </view>

        <!-- 借出工时 -->
        <view class="form-item">
          <text class="form-label">借出工时</text>
          <input
            class="form-input"
            v-model="form.lendHours"
            type="digit"
            placeholder="请输入借出工时"
            placeholder-class="form-placeholder"
          />
        </view>

        <!-- 借入工时 -->
        <view class="form-item">
          <text class="form-label">借入工时</text>
          <input
            class="form-input"
            v-model="form.borrowHours"
            type="digit"
            placeholder="请输入借入工时"
            placeholder-class="form-placeholder"
          />
        </view>
      </view>

      <view class="submit-area">
        <button class="submit-btn" type="primary" @tap="handleSubmit">
          提交
        </button>
        <button class="export-btn" @tap="handleExport">
          导出表格
        </button>
      </view>
    </scroll-view>
  </view>
</template>

<script setup>
import { reactive } from 'vue'
import { postWorktime } from '@/utils/api/performance.js'

const modelOptions = ['机型A', '机型B', '机型C']

// ========== 表单数据 ==========

const form = reactive({
  productionBatch: '',
  productionModel: '',
  singleWorkHours: '',
  machineCount: '',
  outputWorkHours: '',
  exceptionReason: '',
  exceptionDuration: '',
  workshop: '',
  productionLine: '',
  team: '',
  teamLeader: '',
  attendanceCount: '',
  actualStartDate: '',
  actualStartTime: '',
  actualEndDate: '',
  actualEndTime: '',
  actualOutput: '',
  lendHours: '',
  borrowHours: ''
})

const onModelChange = (e) => {
  const index = e.detail.value
  form.productionModel = modelOptions[index] || ''
}

const onStartDateChange = (e) => {
  form.actualStartDate = e.detail.value
}

const onStartTimeChange = (e) => {
  form.actualStartTime = e.detail.value
}

const onEndDateChange = (e) => {
  form.actualEndDate = e.detail.value
}

const onEndTimeChange = (e) => {
  form.actualEndTime = e.detail.value
}

// ========== Excel 导出相关 ==========

// H5 环境按需加载 xlsx
let cachedXLSX = null
const loadXLSX = async () => {
  if (cachedXLSX) return cachedXLSX
  // #ifdef MP-WEIXIN
  // 小程序环境不使用 xlsx，由 XML 构建
  cachedXLSX = null
  return cachedXLSX
  // #endif

  // #ifndef MP-WEIXIN
  const XLSXModule = await import('xlsx')
  cachedXLSX = XLSXModule.default || XLSXModule
  return cachedXLSX
  // #endif
}

// 根据截图模板构建二维数组数据（AOA）
const buildWorktimeAoa = () => {
  // 报表日期优先用实际开工日期，否则用今天
  let reportDate = form.actualStartDate
  if (!reportDate) {
    const now = new Date()
    const y = now.getFullYear()
    const m = String(now.getMonth() + 1).padStart(2, '0')
    const d = String(now.getDate()).padStart(2, '0')
    reportDate = `${y}-${m}-${d}`
  }
  const [yearStr, monthStr, dayStr] = reportDate.split('-')

  const startDateTime = form.actualStartDate && form.actualStartTime
    ? `${form.actualStartDate} ${form.actualStartTime}`
    : ''
  const endDateTime = form.actualEndDate && form.actualEndTime
    ? `${form.actualEndDate} ${form.actualEndTime}`
    : ''

  // 顶部三行说明 + 空行 + 表头 + 7 行明细
  const aoa = []

  // 行1：报表日期 + 生产车间
  aoa.push([
    '报表日期:', yearStr || '', '年', monthStr || '', '月', dayStr || '', '日',
    '生产车间:', form.workshop || '',
  ])

  // 行2：生产线、班组、班组长、出勤人数
  aoa.push([
    '生产线:', form.productionLine || '',
    '班组:', form.team || '',
    '班组长:', form.teamLeader || '',
    '出勤人数:', form.attendanceCount ? `${form.attendanceCount}人` : '',
  ])

  // 行3：实际开工/完工时间、实际生产数量、借出/借入工时
  aoa.push([
    '实际开工时间:', startDateTime || '',
    '实际完工时间:', endDateTime || '',
    '实际生产数量:', form.actualOutput || '',
    '借出工时:', form.lendHours || '',
    '借入工时:', form.borrowHours || '',
  ])

  // 空一行
  aoa.push([])

  // 表头行（严格按你提供的模板）
  aoa.push([
    '序号',
    '生产批次',
    '生产机型',
    '单台工时',
    '生产数量',
    '产出工时',
    '异常原因',
    '异常时间',
    '备注',
  ])

  // 第1行明细，按当前表单填入，其余先预留空行方便后续手工补充
  aoa.push([
    1,
    form.productionBatch || '',
    form.productionModel || '',
    form.singleWorkHours || '',
    form.actualOutput || form.machineCount || '',
    form.outputWorkHours || '',
    form.exceptionReason || '',
    form.exceptionDuration || '',
    '',
  ])

  // 再补 6 行空行，对应模板中的 1~7 行
  for (let i = 2; i <= 7; i++) {
    aoa.push([i, '', '', '', '', '', '', '', ''])
  }

  return aoa
}

// 小程序环境下，使用 SpreadsheetML 生成 xls
const buildSpreadsheetXmlFromAoa = (aoa) => {
  if (!aoa || aoa.length === 0) return ''

  const escapeXml = (value) => {
    if (value === null || value === undefined) return ''
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;')
  }

  const rowsXml = aoa
    .map(row => {
      const cells = row.map(cell => {
        const type = typeof cell === 'number' ? 'Number' : 'String'
        return `<Cell><Data ss:Type="${type}">${escapeXml(cell)}</Data></Cell>`
      }).join('')
      return `<Row>${cells}</Row>`
    })
    .join('')

  return `<?xml version="1.0" encoding="UTF-8"?>` +
    `<?mso-application progid="Excel.Sheet"?>` +
    `<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" ` +
    `xmlns:o="urn:schemas-microsoft-com:office:office" ` +
    `xmlns:x="urn:schemas-microsoft-com:office:excel" ` +
    `xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">` +
    `<Worksheet ss:Name="工时统计">` +
    `<Table>${rowsXml}</Table>` +
    `</Worksheet>` +
    `</Workbook>`
}

const generateWorktimeExcel = async () => {
  const aoa = buildWorktimeAoa()
  const fileName = `工时统计_${form.productionBatch || '未命名批次'}.xlsx`

  // #ifdef H5
  const XLSX = await loadXLSX()
  const ws = XLSX.utils.aoa_to_sheet(aoa)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, '工时统计')
  XLSX.writeFile(wb, fileName)
  console.log(`✅ 工时统计表已导出: ${fileName}`)
  // #endif

  // #ifdef MP-WEIXIN
  try {
    const xmlContent = buildSpreadsheetXmlFromAoa(aoa)
    const safeName = fileName.replace(/\.xlsx$/i, '.xls')
    const uniqueSuffix = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    const filePath = `${wx.env.USER_DATA_PATH}/${uniqueSuffix}_${safeName}`

    const fs = wx.getFileSystemManager()
    fs.writeFileSync(filePath, xmlContent, 'utf8')

    console.log(`✅ 工时统计表已保存: ${filePath}`)

    uni.showModal({
      title: '导出成功',
      content: `Excel文件已保存到：${filePath}\n是否打开文件？`,
      showCancel: true,
      confirmText: '打开',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          wx.openDocument({
            filePath,
            success: () => {
              console.log('打开文件成功')
            },
            fail: (err) => {
              console.error('打开文件失败:', err)
              uni.showToast({
                title: '打开文件失败',
                icon: 'none'
              })
            }
          })
        }
      }
    })
  } catch (error) {
    console.error('❌ 工时统计表导出失败:', error)
    uni.showToast({
      title: '导出失败',
      icon: 'none'
    })
  }
  // #endif
}

// 表单必填校验（提交与导出共用）
const validateForm = () => {
  if (!form.productionBatch || !form.team || !form.teamLeader) {
    uni.showToast({
      title: '请先填写生产批次、班组和班组长',
      icon: 'none'
    })
    return false
  }
  if (!form.actualStartDate || !form.actualStartTime || !form.actualEndDate || !form.actualEndTime) {
    uni.showToast({
      title: '请完善实际开工/完工时间',
      icon: 'none'
    })
    return false
  }
  return true
}

// 仅提交（不导出）
const handleSubmit = async () => {
  if (!validateForm()) return
  try {
    await postWorktime(form)
    uni.showToast({
      title: '提交成功',
      icon: 'success'
    })
  } catch (e) {
    // 错误已由 request 层 showError 提示
  }
}

// 仅导出表格
const handleExport = async () => {
  if (!validateForm()) return
  uni.showLoading({
    title: '生成表格中...',
    mask: true
  })
  try {
    await generateWorktimeExcel()
    uni.showToast({
      title: '导出成功',
      icon: 'success'
    })
  } catch (error) {
    console.error('工时统计导出失败:', error)
    uni.showToast({
      title: '导出失败',
      icon: 'none'
    })
  } finally {
    uni.hideLoading()
  }
}

const handleBack = () => {
  uni.navigateBack({
    fail: () => {
      uni.redirectTo({
        url: '/pages/performance/index'
      })
    }
  })
}
</script>

<style lang="scss" scoped>
.worktime-container {
  min-height: 100vh;
  background: linear-gradient(180deg, #7cc7ff 0%, #66b5ff 40%, #4da0ff 100%);
  display: flex;
  flex-direction: column;
}

.nav-bar {
  height: 100rpx;
  padding: 40rpx 32rpx 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: #ffffff;
}

.nav-back {
  width: 80rpx;
  height: 80rpx;
  border-radius: 999rpx;
  background: rgba(255, 255, 255, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
}

.nav-back-icon {
  font-size: 40rpx;
}

.nav-title {
  font-size: 32rpx;
  font-weight: 600;
}

.nav-placeholder {
  width: 80rpx;
  height: 80rpx;
}

.scroll-area {
  flex: 1;
  padding: 24rpx 24rpx 40rpx;
  box-sizing: border-box;
}

.section-card {
  background: #ffffff;
  border-radius: 24rpx;
  padding: 24rpx 20rpx 10rpx;
  box-shadow: 0 12rpx 32rpx rgba(0, 0, 0, 0.08);
}

.section-title {
  font-size: 30rpx;
  font-weight: 600;
  margin-bottom: 16rpx;
  color: #1f2933;
}

.form-item {
  margin-bottom: 16rpx;
}

.form-item-textarea {
  margin-bottom: 8rpx;
}

.form-label {
  font-size: 26rpx;
  font-weight: 600;
  color: #1f2933;
  margin-bottom: 8rpx;
  display: block;
}

.form-input {
  width: 100%;
  padding: 18rpx 24rpx;
  border-radius: 16rpx;
  background: #f5f7fb;
  font-size: 26rpx;
}

.form-placeholder {
  color: #9ca3af;
}

.form-textarea {
  width: 100%;
  min-height: 140rpx;
  padding: 18rpx 24rpx;
  border-radius: 16rpx;
  background: #f5f7fb;
  font-size: 26rpx;
}

.form-picker {
  width: 100%;
  padding: 18rpx 24rpx;
  border-radius: 16rpx;
  background: #f5f7fb;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.form-picker-text {
  font-size: 26rpx;
  color: #111827;
}

.form-picker-arrow {
  font-size: 30rpx;
  color: #9ca3af;
}

.datetime-row {
  display: flex;
  gap: 20rpx;
}

.datetime-btn {
  flex: 1;
  height: 76rpx;
  border-radius: 16rpx;
  background: #f5f7fb;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 26rpx;
  color: #111827;
}

.submit-area {
  margin-top: 24rpx;
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.submit-btn {
  width: 100%;
  height: 90rpx;
  line-height: 90rpx;
  border-radius: 999rpx;
  background: linear-gradient(135deg, #4da0ff 0%, #2f7ee5 100%);
  color: #ffffff;
  font-size: 30rpx;
  font-weight: 600;
}

.submit-btn::after {
  border: none;
}

.export-btn {
  width: 100%;
  height: 90rpx;
  line-height: 90rpx;
  border-radius: 999rpx;
  background: #ffffff;
  color: #2f7ee5;
  font-size: 30rpx;
  font-weight: 600;
  border: 2rpx solid #4da0ff;
}

.export-btn::after {
  border: none;
}
</style>


