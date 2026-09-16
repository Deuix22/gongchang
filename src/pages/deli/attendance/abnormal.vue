<template>
  <AttendanceSidebar active-key="abnormal">
    <view class="report-page">
      <view class="page-header">
        <text class="page-title">异常考勤</text>
      </view>

      <view class="filter-card">
        <view class="filter-row">
          <text class="filter-label">人员范围</text>
          <input v-model="keyword" class="filter-input" placeholder="请输入姓名/工号/部门" />
        </view>
        <view class="filter-row">
          <text class="filter-label">时间范围</text>
          <picker mode="date" :value="startDate" @change="e => startDate = e.detail.value">
            <view class="date-picker">{{ startDate }}</view>
          </picker>
          <text class="date-sep">-</text>
          <picker mode="date" :value="endDate" @change="e => endDate = e.detail.value">
            <view class="date-picker">{{ endDate }}</view>
          </picker>
        </view>
        <view class="filter-row">
          <text class="filter-label">异常状态</text>
          <picker :range="statusOptions" :value="statusIndex" @change="e => statusIndex = Number(e.detail.value)">
            <view class="date-picker">{{ statusOptions[statusIndex] }}</view>
          </picker>
        </view>
        <view class="filter-actions">
          <view class="btn btn-primary" :class="{ disabled: loading }" @tap="handleQuery">
            {{ loading ? '查询中...' : '查询' }}
          </view>
          <view class="btn btn-default" @tap="handleExport">导出报表</view>
        </view>
      </view>

      <view class="config-card">
        <view class="config-header">
          <text class="config-title">显示设置</text>
          <text class="collapse-btn" @tap="configExpanded = !configExpanded">
            {{ configExpanded ? '收起' : '展开' }}
          </text>
        </view>
        <view v-if="configExpanded" class="config-body">
          <view class="config-group">
            <text class="group-title">基本信息</text>
            <view class="checkbox-row">
              <label class="checkbox-item"><checkbox checked disabled /><text>姓名</text></label>
              <label class="checkbox-item"><checkbox checked /><text>工号</text></label>
              <label class="checkbox-item"><checkbox checked /><text>部门</text></label>
              <label class="checkbox-item"><checkbox checked /><text>日期</text></label>
              <label class="checkbox-item"><checkbox checked /><text>考勤规则</text></label>
              <label class="checkbox-item"><checkbox checked /><text>班次</text></label>
            </view>
          </view>
        </view>
        <view class="sort-row"><text>排序方式：默认</text></view>
      </view>

      <scroll-view class="table-scroll" scroll-x scroll-y>
        <view class="report-table">
          <view class="table-head-group">
            <text class="th th-name">姓名</text>
            <text class="th">工号</text>
            <text class="th">部门</text>
            <text class="th">日期</text>
            <text class="th">考勤规则</text>
            <text class="th">班次</text>
            <text class="th">上班1打卡时间</text>
            <text class="th">下班1打卡时间</text>
            <text class="th">考勤结果</text>
            <text class="th">迟到时长(小时)</text>
            <text class="th">早退时长(小时)</text>
          </view>
          <view v-for="(row, index) in tableData" :key="index" class="table-row">
            <text class="td td-name">{{ row.name }}</text>
            <text class="td">{{ row.employeeNum }}</text>
            <text class="td">{{ row.deptName }}</text>
            <text class="td">{{ row.dateCompact }}</text>
            <text class="td">{{ row.ruleName }}</text>
            <text class="td">{{ row.shiftName }}</text>
            <text class="td">{{ row.clockInTime }}</text>
            <text class="td">{{ row.clockOutTime }}</text>
            <text class="td">{{ row.attendanceResult }}</text>
            <text class="td">{{ row.lateHours }}</text>
            <text class="td">{{ row.earlyHours }}</text>
          </view>
          <view v-if="loading" class="table-empty">
            <text>正在查询，请稍候...</text>
          </view>
          <view v-else-if="tableData.length === 0" class="table-empty">
            <text>暂无异常考勤数据</text>
          </view>
        </view>
      </scroll-view>

      <view class="tip-bar">
        <text>ℹ️ 异常考勤报表仅保留12个月以内的数据，请及时导出下载</text>
      </view>
      <view class="pagination">
        <text>‹</text>
        <text class="page-num active">1</text>
        <text>›</text>
      </view>
    </view>
  </AttendanceSidebar>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import AttendanceSidebar from '@/components/deli/AttendanceSidebar.vue'
import {
  buildAbnormalReport,
  clearAttendanceCache,
  filterByDateRange,
  filterByKeyword,
  getDailyRowsForRange,
  getToday,
  loadAttendanceBaseData
} from '@/utils/deliAttendanceReport.js'

const loading = ref(false)
const keyword = ref('')
const startDate = ref(getToday())
const endDate = ref(getToday())
const statusOptions = ['全部', '缺卡', '迟到', '早退']
const statusIndex = ref(0)
const tableData = ref([])
const configExpanded = ref(true)

const handleQuery = async () => {
  if (loading.value) return
  loading.value = true
  try {
    clearAttendanceCache()
    const base = await loadAttendanceBaseData(true)
    const { rows: dailyRows } = getDailyRowsForRange(base, startDate.value, endDate.value)
    let rows = dailyRows
    rows = filterByKeyword(rows, keyword.value)
    tableData.value = buildAbnormalReport(rows, statusOptions[statusIndex.value])
    uni.showToast({
      title: `查询完成，共 ${tableData.value.length} 条`,
      icon: 'none'
    })
  } catch (error) {
    uni.showToast({ title: error.message || '查询失败', icon: 'none', duration: 2500 })
    tableData.value = []
  } finally {
    loading.value = false
  }
}

const handleExport = () => {
  uni.showToast({ title: '导出功能仅查询展示', icon: 'none' })
}

onMounted(() => {
  handleQuery()
})
</script>

<style lang="scss" scoped>
@import './report-common.scss';
</style>
