<template>
  <AttendanceSidebar active-key="daily">
    <view class="report-page">
      <view class="page-header">
        <text class="page-title">每日统计</text>
        <view class="page-links">
          <text class="link-text">如何导出日报表格 >></text>
          <text class="link-text">报表统计有误?</text>
        </view>
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
        <view class="filter-actions">
          <view class="btn btn-primary" :class="{ disabled: loading }" @tap="handleQuery">
            {{ loading ? '查询中...' : '查询' }}
          </view>
          <view class="btn btn-default" @tap="handleExport">导出报表</view>
        </view>
      </view>

      <view v-if="noCheckinTip" class="tip-bar">
        <text>ℹ️ 当前无打卡同步记录，上班/下班时间无法显示。得力开放接口仅支持同步「初始化之后」的新增打卡，历史打卡数据不在此接口范围内。系统已自动完成初始化，后续有新打卡记录时会自动显示时间。</text>
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
              <label v-for="col in basicCols" :key="col.key" class="checkbox-item">
                <checkbox :checked="col.checked" :disabled="col.fixed" @tap.stop="toggleCol(basicCols, col)" />
                <text>{{ col.label }}</text>
              </label>
            </view>
          </view>
          <view class="config-group">
            <text class="group-title">打卡信息</text>
            <view class="checkbox-row">
              <label v-for="col in punchCols" :key="col.key" class="checkbox-item">
                <checkbox :checked="col.checked" @tap.stop="toggleCol(punchCols, col)" />
                <text>{{ col.label }}</text>
              </label>
            </view>
          </view>
          <view class="config-group">
            <text class="group-title">时长统计</text>
            <view class="checkbox-row">
              <label v-for="col in durationCols" :key="col.key" class="checkbox-item">
                <checkbox :checked="col.checked" @tap.stop="toggleCol(durationCols, col)" />
                <text>{{ col.label }}</text>
              </label>
            </view>
          </view>
          <view class="config-group">
            <text class="group-title">异常统计</text>
            <view class="checkbox-row">
              <label v-for="col in abnormalCols" :key="col.key" class="checkbox-item">
                <checkbox :checked="col.checked" @tap.stop="toggleCol(abnormalCols, col)" />
                <text>{{ col.label }}</text>
              </label>
            </view>
          </view>
        </view>
        <view class="sort-row">
          <text>排序方式：默认</text>
        </view>
      </view>

      <scroll-view class="table-scroll" scroll-x scroll-y>
        <view class="report-table">
          <view class="table-head-group">
            <text class="th th-name">姓名</text>
            <view class="th-group">
              <text class="th-group-title">打卡信息</text>
              <view class="th-sub-row">
                <text class="th">上班1打卡时间</text>
                <text class="th">下班1打卡时间</text>
              </view>
            </view>
            <view class="th-group wide">
              <text class="th-group-title">时长统计</text>
              <view class="th-sub-row">
                <text class="th">应出勤时长(小时)</text>
                <text class="th">计薪时长(小时)</text>
                <text class="th">实际出勤时长(小时)</text>
                <text class="th">迟到时长(小时)</text>
                <text class="th">早退时长(小时)</text>
                <text class="th">加班时长(小时)</text>
              </view>
            </view>
            <view class="th-group">
              <text class="th-group-title">异常统计</text>
              <view class="th-sub-row">
                <text class="th">请假时长(小时)</text>
                <text class="th">请假类型</text>
                <text class="th">出差天数</text>
                <text class="th">外出时长(小时)</text>
              </view>
            </view>
          </view>

          <view v-for="(row, index) in tableData" :key="index" class="table-row">
            <text class="td td-name">{{ row.name }}</text>
            <text class="td">{{ row.clockInTime }}</text>
            <text class="td">{{ row.clockOutTime }}</text>
            <text class="td">{{ row.scheduleHours }}</text>
            <text class="td">{{ row.paidHours }}</text>
            <text class="td">{{ row.actualHours }}</text>
            <text class="td">{{ row.lateHours }}</text>
            <text class="td">{{ row.earlyHours }}</text>
            <text class="td">{{ row.overtimeHours }}</text>
            <text class="td">{{ row.leaveHours }}</text>
            <text class="td">{{ row.leaveType }}</text>
            <text class="td">{{ row.tripDays }}</text>
            <text class="td">{{ row.outHours }}</text>
          </view>

          <view v-if="loading" class="table-empty">
            <text>正在查询，请稍候...</text>
          </view>
          <view v-else-if="tableData.length === 0" class="table-empty">
            <text>暂无数据，请调整查询条件后重试</text>
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
  buildDailyReport,
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
const tableData = ref([])
const configExpanded = ref(true)
const noCheckinTip = ref(false)

const basicCols = ref([
  { key: 'name', label: '姓名', checked: true, fixed: true },
  { key: 'num', label: '工号', checked: false },
  { key: 'dept', label: '部门', checked: false },
  { key: 'title', label: '职位', checked: false },
  { key: 'date', label: '日期', checked: false }
])
const punchCols = ref([
  { key: 'in', label: '打卡时间', checked: true },
  { key: 'result', label: '考勤结果', checked: false }
])
const durationCols = ref([
  { key: 'schedule', label: '应出勤时长', checked: true },
  { key: 'paid', label: '计薪时长', checked: true },
  { key: 'actual', label: '实际出勤时长', checked: true },
  { key: 'late', label: '迟到时长', checked: true },
  { key: 'early', label: '早退时长', checked: true },
  { key: 'ot', label: '加班时长', checked: true }
])
const abnormalCols = ref([
  { key: 'leave', label: '请假时长', checked: true },
  { key: 'leaveType', label: '请假类型', checked: true },
  { key: 'trip', label: '出差天数', checked: true },
  { key: 'out', label: '外出时长', checked: true }
])

const toggleCol = (list, col) => {
  if (col.fixed) return
  col.checked = !col.checked
}

const handleQuery = async () => {
  if (loading.value) return
  loading.value = true
  try {
    clearAttendanceCache()
    const base = await loadAttendanceBaseData(true)
    const { rows: dailyRows, fromCheckin } = getDailyRowsForRange(
      base,
      startDate.value,
      endDate.value
    )
    noCheckinTip.value = !fromCheckin && !base.checkins?.length
    let rows = dailyRows
    rows = filterByKeyword(rows, keyword.value)
    tableData.value = buildDailyReport(rows)
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
