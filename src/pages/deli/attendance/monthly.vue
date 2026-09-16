<template>
  <AttendanceSidebar active-key="monthly">
    <view class="report-page">
      <view class="page-header">
        <text class="page-title">月度汇总</text>
        <view class="page-links">
          <text class="link-text">如何导出月报表格 >></text>
          <text class="link-text">报表统计有误?</text>
        </view>
      </view>

      <view class="filter-card">
        <view class="filter-row">
          <text class="filter-label">人员范围</text>
          <input v-model="keyword" class="filter-input" placeholder="请选择人员范围" />
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
        <view class="filter-actions">
          <view class="btn btn-primary" :class="{ disabled: loading }" @tap="handleQuery">
            {{ loading ? '查询中...' : '查询' }}
          </view>
          <view class="btn btn-default" @tap="handleExport">导出报表</view>
        </view>
      </view>

      <view class="view-tabs">
        <text class="view-tab active">全员视图</text>
        <text class="view-tab">个人视图</text>
        <text class="view-tab">更多</text>
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
              <label class="checkbox-item"><checkbox checked /><text>职位</text></label>
            </view>
          </view>
          <view class="config-group">
            <text class="group-title">出勤统计</text>
            <view class="checkbox-row">
              <label class="checkbox-item"><checkbox checked /><text>应出勤天数</text></label>
              <label class="checkbox-item"><checkbox checked /><text>实际出勤天数</text></label>
              <label class="checkbox-item"><checkbox checked /><text>应出勤时长</text></label>
              <label class="checkbox-item"><checkbox checked /><text>实际出勤时长</text></label>
              <label class="checkbox-item"><checkbox checked /><text>计薪工作时长</text></label>
            </view>
          </view>
          <view class="config-group">
            <text class="group-title">异常统计</text>
            <view class="checkbox-row">
              <label class="checkbox-item"><checkbox checked /><text>迟到次数/时长</text></label>
              <label class="checkbox-item"><checkbox checked /><text>早退次数/时长</text></label>
              <label class="checkbox-item"><checkbox checked /><text>缺卡次数</text></label>
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
            <text class="th">职位</text>
            <text class="th">应出勤(天)</text>
            <text class="th">实际出勤(天)</text>
            <text class="th">应出勤(小时)</text>
            <text class="th">实际出勤(小时)</text>
            <text class="th">计薪时长(小时)</text>
            <text class="th">迟到次数</text>
            <text class="th">迟到时长(小时)</text>
            <text class="th">缺卡次数</text>
            <text class="th">加班时长(小时)</text>
          </view>
          <view v-for="(row, index) in tableData" :key="index" class="table-row">
            <text class="td td-name">{{ row.name }}</text>
            <text class="td">{{ row.employeeNum }}</text>
            <text class="td">{{ row.deptName }}</text>
            <text class="td">{{ row.title }}</text>
            <text class="td">{{ row.expectDays }}</text>
            <text class="td">{{ row.actualDays }}</text>
            <text class="td">{{ row.expectHours }}</text>
            <text class="td">{{ row.actualHours }}</text>
            <text class="td">{{ row.paidHours }}</text>
            <text class="td">{{ row.lateCount }}</text>
            <text class="td">{{ row.lateHours }}</text>
            <text class="td">{{ row.missingCount }}</text>
            <text class="td">{{ row.overtimeHours }}</text>
          </view>
          <view v-if="loading" class="table-empty">
            <text>正在查询，请稍候...</text>
          </view>
          <view v-else-if="tableData.length === 0" class="table-empty">
            <text>暂无月度汇总数据</text>
          </view>
        </view>
      </scroll-view>
    </view>
  </AttendanceSidebar>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import AttendanceSidebar from '@/components/deli/AttendanceSidebar.vue'
import {
  buildMonthlyReport,
  clearAttendanceCache,
  filterByDateRange,
  filterByKeyword,
  getDailyRowsForRange,
  getMonthStart,
  getToday,
  loadAttendanceBaseData
} from '@/utils/deliAttendanceReport.js'

const loading = ref(false)
const keyword = ref('')
const startDate = ref(getMonthStart())
const endDate = ref(getToday())
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
    tableData.value = buildMonthlyReport(rows)
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
