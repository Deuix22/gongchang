<template>
  <AttendanceSidebar active-key="dept">
    <view class="report-page">
      <view class="page-header">
        <text class="page-title">部门统计</text>
      </view>

      <view class="filter-card">
        <view class="filter-row">
          <text class="filter-label">选择部门</text>
          <picker :range="deptOptions" :value="deptIndex" @change="e => deptIndex = Number(e.detail.value)">
            <view class="filter-input picker-like">{{ deptOptions[deptIndex] }}</view>
          </picker>
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

      <scroll-view class="table-scroll dept-table-scroll" scroll-x scroll-y>
        <view class="report-table">
          <view class="table-head-group">
            <text class="th th-name">部门</text>
            <text class="th">应出勤人数</text>
            <text class="th">正常出勤次数</text>
            <text class="th">迟到次数</text>
            <text class="th">早退次数</text>
            <text class="th">缺卡次数</text>
            <text class="th">请假次数</text>
            <text class="th">出差次数</text>
            <text class="th">外出次数</text>
            <text class="th">加班时长(小时)</text>
            <text class="th">缺勤次数</text>
          </view>
          <view v-for="(row, index) in tableData" :key="index" class="table-row">
            <text class="td td-name">{{ row.deptName }}</text>
            <text class="td">{{ row.expectCount }}</text>
            <text class="td">{{ row.normalCount }}</text>
            <text class="td link-num">{{ row.lateCount || '-' }}</text>
            <text class="td link-num">{{ row.earlyCount || '-' }}</text>
            <text class="td link-num">{{ row.missingCount || '-' }}</text>
            <text class="td">{{ row.leaveCount || '-' }}</text>
            <text class="td">{{ row.tripCount || '-' }}</text>
            <text class="td">{{ row.outCount || '-' }}</text>
            <text class="td">{{ row.overtimeHours || '-' }}</text>
            <text class="td">{{ row.absentCount || '-' }}</text>
          </view>
          <view v-if="loading" class="table-empty">
            <text>正在查询，请稍候...</text>
          </view>
          <view v-else-if="tableData.length === 0" class="table-empty">
            <text>暂无部门统计数据</text>
          </view>
        </view>
      </scroll-view>

      <view class="tip-bar">
        <text>ℹ️ 部门统计报表仅保留12个月以内的数据，请及时导出下载</text>
      </view>
      <view class="pagination">
        <text>‹</text>
        <text class="page-num active">1</text>
        <text class="page-num">2</text>
        <text>›</text>
      </view>
    </view>
  </AttendanceSidebar>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import AttendanceSidebar from '@/components/deli/AttendanceSidebar.vue'
import {
  buildDeptReport,
  clearAttendanceCache,
  filterByDateRange,
  getDailyRowsForRange,
  getToday,
  loadAttendanceBaseData
} from '@/utils/deliAttendanceReport.js'

const loading = ref(false)
const startDate = ref(getToday())
const endDate = ref(getToday())
const deptIndex = ref(0)
const deptOptions = ref(['全部部门'])
const tableData = ref([])
const allDeptData = ref([])

const filteredDeptData = computed(() => {
  const selected = deptOptions.value[deptIndex.value]
  if (selected === '全部部门') return allDeptData.value
  return allDeptData.value.filter((row) => row.deptName === selected)
})

const handleQuery = async () => {
  if (loading.value) return
  loading.value = true
  try {
    clearAttendanceCache()
    const base = await loadAttendanceBaseData(true)
    const { rows } = getDailyRowsForRange(base, startDate.value, endDate.value)
    allDeptData.value = buildDeptReport(rows)
    const names = ['全部部门', ...base.departments.map((d) => d.name)]
    deptOptions.value = names
    tableData.value = filteredDeptData.value
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

watch(deptIndex, () => {
  tableData.value = filteredDeptData.value
})
</script>

<style lang="scss" scoped>
@import './report-common.scss';

.picker-like {
  line-height: 64rpx;
}

.dept-table-scroll {
  height: calc(100vh - 420rpx);
}
</style>
