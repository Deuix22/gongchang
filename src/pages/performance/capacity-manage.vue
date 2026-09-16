<template>
  <view class="capacity-manage-page">
    <view class="header">
      <view class="header-back" @tap="handleBack">
        <text class="header-back-icon">←</text>
      </view>
      <view class="header-title">产能管理</view>
      <view class="header-placeholder"></view>
    </view>

    <scroll-view scroll-y class="content">
      <view class="section">
        <view class="section-title-row" @tap="filterExpanded = !filterExpanded">
          <text class="section-title">筛选条件</text>
          <text class="section-toggle">{{ filterExpanded ? '收起 ▲' : '展开 ▼' }}</text>
        </view>

        <view v-if="!filterExpanded" class="filter-summary-chips">
          <text class="filter-chip">{{ filterStartDate || '—' }} ~ {{ filterEndDate || '—' }}</text>
          <text v-if="filterProductionLine" class="filter-chip">{{ filterProductionLine }}</text>
          <text v-if="filterProcessSegment" class="filter-chip">{{ filterProcessSegment }}</text>
          <text v-if="filterTeamLeader" class="filter-chip">组长: {{ filterTeamLeader }}</text>
        </view>

        <view v-show="filterExpanded">
        <view class="filter-row">
          <view class="filter-item">
            <text class="filter-label">线体</text>
            <picker
              mode="selector"
              :range="productionLineOptions"
              :value="filterProductionLineIndex"
              @change="onFilterProductionLineChange"
            >
              <view class="filter-picker">
                {{ filterProductionLine || '全部线体' }}
              </view>
            </picker>
          </view>
          <view class="filter-item">
            <text class="filter-label">制程段</text>
            <picker
              mode="selector"
              :range="processSegmentOptions"
              :value="filterProcessSegmentIndex"
              @change="onFilterProcessSegmentChange"
            >
              <view class="filter-picker">
                {{ filterProcessSegment || '全部制程段' }}
              </view>
            </picker>
          </view>
        </view>

        <view class="filter-row">
          <view class="filter-item filter-item-flex">
            <text class="filter-label">机型</text>
            <input
              class="filter-input"
              v-model="filterMachineModel"
              placeholder="机型关键字"
              confirm-type="search"
            />
          </view>
          <view class="filter-item filter-item-flex">
            <text class="filter-label">组长</text>
            <input
              class="filter-input"
              v-model="filterTeamLeader"
              placeholder="组长关键字"
              confirm-type="search"
            />
          </view>
        </view>

        <view class="filter-row">
          <view class="filter-item filter-item-flex">
            <text class="filter-label">提交人</text>
            <input
              class="filter-input"
              v-model="filterSubmitter"
              placeholder="提交人关键字"
              confirm-type="search"
            />
          </view>
          <view class="filter-item filter-item-flex">
            <text class="filter-label">负责人</text>
            <input
              class="filter-input"
              v-model="filterPersonInCharge"
              placeholder="负责人关键字"
              confirm-type="search"
            />
          </view>
        </view>

        <view class="filter-row">
          <view class="filter-item">
            <text class="filter-label">开始日期</text>
            <picker mode="date" :value="filterStartDate" @change="e => filterStartDate = e.detail.value">
              <view class="filter-picker">{{ filterStartDate || '请选择' }}</view>
            </picker>
          </view>
          <view class="filter-item">
            <text class="filter-label">结束日期</text>
            <picker mode="date" :value="filterEndDate" @change="e => filterEndDate = e.detail.value">
              <view class="filter-picker">{{ filterEndDate || '请选择' }}</view>
            </picker>
          </view>
        </view>

        <view class="filter-actions">
          <button class="filter-btn reset-btn" @tap="handleResetFilter">重置</button>
          <button
            class="filter-btn query-btn"
            :disabled="isLoading"
            @tap="handleQuery"
          >
            {{ isLoading ? '查询中...' : '查询' }}
          </button>
          <button
            class="filter-btn export-btn"
            :disabled="isLoading || listAll.length === 0"
            @tap="handleExport"
          >
            导出表格
          </button>
        </view>
        </view>

        <view v-if="listSummary" class="summary-board">
          <view class="summary-item">
            <text class="summary-value">{{ listSummary.groupCount }}</text>
            <text class="summary-label">提报组数</text>
          </view>
          <view class="summary-item">
            <text class="summary-value">{{ listSummary.slotCount }}</text>
            <text class="summary-label">时段数</text>
          </view>
          <view class="summary-item">
            <text
              class="summary-value"
              :class="getRateToneClass(listSummary.avgAchievementRate)"
            >
              {{ listSummary.avgAchievementRate != null ? formatAchievementRate(listSummary.avgAchievementRate) : '—' }}
            </text>
            <text class="summary-label">平均达成率</text>
          </view>
          <view class="summary-item">
            <text class="summary-value summary-value-accent">{{ formatCompactNumber(listSummary.totalActualCapacity) }}</text>
            <text class="summary-label">总实际产能</text>
          </view>
        </view>

        <view class="record-list">
          <view
            v-for="(item, index) in displayList"
            :key="item.id || item._rowKey || index"
            class="record-item"
          >
            <view class="record-top">
              <view class="record-tags">
                <text class="tag tag-date">{{ getReportDate(item) }}</text>
                <text v-if="item.productionLine" class="tag tag-line">{{ item.productionLine }}</text>
                <text class="tag tag-process">{{ getProcessSegment(item) }}</text>
              </view>
              <view
                v-if="getItemManpowerRateValue(item) != null"
                class="rate-badge"
                :class="getRateToneClass(getItemManpowerRateValue(item))"
              >
                <text class="rate-badge-label">人力达成</text>
                <text class="rate-badge-value">{{ formatItemManpowerTotalAchievementRate(item) }}</text>
              </view>
            </view>

            <view class="record-title-row">
              <text class="record-model">{{ getMachineModel(item) }}</text>
              <text v-if="getRecordTimeSlots(item).length > 0" class="record-slot-count">
                {{ getRecordTimeSlots(item).length }} 时段
              </text>
            </view>

            <view class="record-meta">
              <text class="meta-item">组长 {{ item.teamLeader || '—' }}</text>
              <text class="meta-divider">|</text>
              <text class="meta-item">负责人 {{ item.personInCharge || '—' }}</text>
            </view>

            <view
              v-for="(slot, slotIdx) in getRecordTimeSlots(item)"
              :key="slot.startTime && slot.endTime ? `${slot.startTime}-${slot.endTime}` : slot.timeRange || slotIdx"
              class="slot-card"
            >
              <view class="slot-card-head">
                <text class="slot-time">{{ getSlotTimeLabel(slot, slotIdx) }}</text>
                <text
                  class="slot-rate"
                  :class="getRateToneClass(getSlotAchievementRateValue(slot, item))"
                >
                  {{ formatSlotAchievementRate(slot, item) }}
                </text>
              </view>

              <view class="kpi-grid">
                <view class="kpi-cell">
                  <text class="kpi-num">{{ slot.actualCapacity ?? '—' }}</text>
                  <text class="kpi-name">实际(PCS)</text>
                </view>
                <view class="kpi-cell">
                  <text class="kpi-num">{{ formatSlotStandardCapacityPcs(slot, item) }}</text>
                  <text class="kpi-name">标准(PCS)</text>
                </view>
                <view class="kpi-cell">
                  <text
                    class="kpi-num"
                    :class="getDiffToneClass(resolveSlotMetrics(slot, item).capacityDifference)"
                  >
                    {{ formatSlotCapacityDifference(slot, item) }}
                  </text>
                  <text class="kpi-name">差异(PCS)</text>
                </view>
                <view class="kpi-cell">
                  <text class="kpi-num">{{ slot.actualManpower ?? '—' }}/{{ slot.standardManpower ?? '—' }}</text>
                  <text class="kpi-name">实际/标准人力</text>
                </view>
              </view>

              <view v-if="getSlotReasonRemark(slot, item)" class="reason-banner slot-reason-banner">
                <text class="reason-label">原因说明</text>
                <text class="reason-text">{{ getSlotReasonRemark(slot, item) }}</text>
              </view>

              <view v-if="isRecordExpanded(item)" class="slot-detail">
                <view v-if="getSlotMachineModel(slot, item) !== getMachineModel(item)" class="detail-row">
                  <text class="detail-label">时段机型</text>
                  <text class="detail-value">{{ getSlotMachineModel(slot, item) }}</text>
                </view>
                <view class="detail-row">
                  <text class="detail-label">生产时长</text>
                  <text class="detail-value">
                    {{ slot.productionMinutes ?? '—' }} 分钟 / {{ formatNumber(slot.productionHours) }}{{ slot.productionHours != null && slot.productionHours !== '' ? ' H' : '' }}
                  </text>
                </view>
                <view class="detail-row">
                  <text class="detail-label">标准产能</text>
                  <text class="detail-value">{{ slot.standardCapacity ?? '—' }} PCS/H</text>
                </view>
                <view class="detail-row">
                  <text class="detail-label">产出/出勤工时</text>
                  <text class="detail-value">{{ formatSlotOutputHours(slot, item) }} / {{ formatSlotAttendanceHours(slot, item) }}</text>
                </view>
                <view v-if="hasSlotOptional(slot)" class="slot-optional">
                  <view v-if="slot.borrowedInManpower != null && slot.borrowedInManpower !== ''" class="detail-row">
                    <text class="detail-label">借入人力</text>
                    <text class="detail-value">{{ slot.borrowedInManpower }}{{ slot.borrowedInPosition ? `（${slot.borrowedInPosition}）` : '' }}</text>
                  </view>
                  <view v-if="slot.lentOutManpower != null && slot.lentOutManpower !== ''" class="detail-row">
                    <text class="detail-label">借出人力</text>
                    <text class="detail-value">{{ slot.lentOutManpower }}{{ slot.lentOutPosition ? `（${slot.lentOutPosition}）` : '' }}</text>
                  </view>
                  <view v-if="slot.ictPassRate" class="detail-row">
                    <text class="detail-label">ICT合格率</text>
                    <text class="detail-value">{{ slot.ictPassRate }}</text>
                  </view>
                  <view v-if="slot.fctPassRate" class="detail-row">
                    <text class="detail-label">FCT合格率</text>
                    <text class="detail-value">{{ slot.fctPassRate }}</text>
                  </view>
                </view>
              </view>
            </view>

            <view v-if="isLegacyRecord(item)" class="legacy-block">
              <text class="legacy-tag">历史格式数据</text>
              <view class="kpi-grid">
                <view class="kpi-cell">
                  <text class="kpi-num">{{ item.passQuantity ?? '—' }}</text>
                  <text class="kpi-name">产出数</text>
                </view>
                <view class="kpi-cell">
                  <text class="kpi-num">{{ formatNumber(item.outputHours) }}</text>
                  <text class="kpi-name">产出工时(H)</text>
                </view>
              </view>
              <view class="detail-row">
                <text class="detail-label">时间范围</text>
                <text class="detail-value">
                  {{ formatDateTime(item.startDate, item.startTime) }} ~ {{ formatDateTime(item.endDate, item.endTime) }}
                </text>
              </view>
            </view>

            <view class="record-actions">
              <view class="expand-btn" @tap="toggleRecordExpand(item)">
                <text>{{ isRecordExpanded(item) ? '收起明细 ▲' : '展开明细 ▼' }}</text>
              </view>
              <text v-if="item.submitter" class="record-submitter">提交人 {{ item.submitter }}</text>
            </view>

            <view v-if="item.createdAt && isRecordExpanded(item)" class="record-footer">
              <text class="record-footer-text">提交时间 {{ formatCreatedAtBeijing(item.createdAt) }}</text>
            </view>
          </view>

          <view v-if="!isLoading && listAll.length === 0" class="empty-tip">
            <text class="empty-text">{{ hasQueried ? '暂无符合条件的产能记录' : '请设置筛选条件后点击查询' }}</text>
          </view>
          <view v-if="isLoading" class="loading-tip">
            <text class="loading-text">查询中...</text>
          </view>

          <view v-if="listAll.length > 0" class="pagination-info">
            <text class="pagination-text">共 {{ listAll.length }} 组，第 {{ currentPage }} / {{ totalPages }} 页</text>
          </view>
          <view v-if="listAll.length > 0 && totalPages > 1" class="pagination-controls">
            <view
              class="pagination-btn"
              :class="{ 'btn-disabled': currentPage === 1 }"
              @tap="handlePrevPage"
            >
              <text class="pagination-btn-text">上一页</text>
            </view>
            <view class="pagination-info-inline">
              <text class="pagination-info-text">{{ currentPage }} / {{ totalPages }}</text>
            </view>
            <view
              class="pagination-btn"
              :class="{ 'btn-disabled': currentPage >= totalPages }"
              @tap="handleNextPage"
            >
              <text class="pagination-btn-text">下一页</text>
            </view>
          </view>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { getCapacityList, getCapacityMeta, getCapacityLineOptions, getModelProcessConfig } from '@/utils/api/performance.js'
import {
  calcCapacityMetrics,
  getSlotProductionHours,
  formatCapacityHours,
  formatCapacityDifference,
  formatStandardCapacityPcs,
  formatAchievementRate,
  buildManpowerAchievementRateMap,
  resolveManpowerTotalAchievementRate
} from '@/utils/capacityCalculations.js'
import {
  parseRecordTimeSlots,
  mergeCapacityRecords,
  splitRecordsBySlotMachineModel,
  getSlotEffectiveMachineModel
} from '@/utils/capacityRecordUtils.js'

const productionLineOptions = ref([''])
const processSegmentOptions = ref([''])
const modelConfigs = ref({})

const filterProductionLine = ref('')
const filterProcessSegment = ref('')
const filterMachineModel = ref('')
const filterTeamLeader = ref('')
const filterSubmitter = ref('')
const filterPersonInCharge = ref('')
const filterStartDate = ref('')
const filterEndDate = ref('')
const isLoading = ref(false)
const listAll = ref([])
const hasQueried = ref(false)
const pageSize = 20
const currentPage = ref(1)
const filterExpanded = ref(true)
const expandedRecordKeys = ref({})

const getTodayStr = () => {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

const getDaysAgoStr = (days) => {
  const d = new Date()
  d.setDate(d.getDate() - days)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

const initDefaultDateRange = () => {
  filterEndDate.value = getTodayStr()
  filterStartDate.value = getDaysAgoStr(6)
}

const getRecordExpandKey = (item) => item?._rowKey || item?.id || ''

const isRecordExpanded = (item) => !!expandedRecordKeys.value[getRecordExpandKey(item)]

const toggleRecordExpand = (item) => {
  const key = getRecordExpandKey(item)
  if (!key) return
  expandedRecordKeys.value = {
    ...expandedRecordKeys.value,
    [key]: !expandedRecordKeys.value[key]
  }
}

const getRateToneClass = (rate) => {
  if (rate == null || rate === '') return 'rate-neutral'
  const n = Number(rate)
  if (Number.isNaN(n)) return 'rate-neutral'
  if (n >= 100) return 'rate-good'
  if (n >= 85) return 'rate-warn'
  return 'rate-bad'
}

const getDiffToneClass = (diff) => {
  if (diff == null || diff === '') return ''
  const n = Number(diff)
  if (Number.isNaN(n)) return ''
  if (n >= 0) return 'diff-good'
  return 'diff-bad'
}

const formatCompactNumber = (val) => {
  if (val == null || val === '') return '—'
  const n = Number(val)
  if (Number.isNaN(n)) return String(val)
  if (Math.abs(n) >= 10000) return `${(n / 10000).toFixed(1)}万`
  return n % 1 === 0 ? String(n) : n.toFixed(0)
}

const getSlotTimeLabel = (slot, slotIdx) => {
  if (slot?.timeRange) return slot.timeRange
  if (slot?.startTime && slot?.endTime) return `${slot.startTime}-${slot.endTime}`
  return `时段 ${slotIdx + 1}`
}

const getItemManpowerRateValue = (item) =>
  resolveManpowerTotalAchievementRate(item, manpowerAchievementRateMap.value, getReportDate)

const getSlotAchievementRateValue = (slot, item) =>
  resolveSlotMetrics(slot, item).productionAchievementRate

const listSummary = computed(() => {
  if (!listAll.value.length) return null

  let totalActual = 0
  let totalDiff = 0
  let rateSum = 0
  let rateCount = 0
  let slotCount = 0

  for (const item of listAll.value) {
    for (const slot of getRecordTimeSlots(item)) {
      slotCount += 1
      const metrics = resolveSlotMetrics(slot, item)
      const actual = Number(slot.actualCapacity)
      if (!Number.isNaN(actual)) totalActual += actual
      const diff = Number(metrics.capacityDifference)
      if (!Number.isNaN(diff)) totalDiff += diff
      if (metrics.productionAchievementRate != null) {
        rateSum += metrics.productionAchievementRate
        rateCount += 1
      }
    }
  }

  return {
    groupCount: listAll.value.length,
    slotCount,
    avgAchievementRate: rateCount > 0 ? rateSum / rateCount : null,
    totalActualCapacity: totalActual,
    totalCapacityDiff: totalDiff
  }
})

const filterProductionLineIndex = computed(() => {
  const idx = productionLineOptions.value.indexOf(filterProductionLine.value)
  return idx >= 0 ? idx : 0
})

const filterProcessSegmentIndex = computed(() => {
  const idx = processSegmentOptions.value.indexOf(filterProcessSegment.value)
  return idx >= 0 ? idx : 0
})

const onFilterProductionLineChange = (e) => {
  const idx = Number(e.detail.value)
  filterProductionLine.value = productionLineOptions.value[idx] ?? ''
}

const onFilterProcessSegmentChange = (e) => {
  const idx = Number(e.detail.value)
  filterProcessSegment.value = processSegmentOptions.value[idx] ?? ''
}

const displayList = computed(() => {
  const start = (currentPage.value - 1) * pageSize
  return listAll.value.slice(start, start + pageSize)
})

const totalPages = computed(() => {
  const total = listAll.value.length
  if (!total) return 1
  return Math.ceil(total / pageSize)
})

const manpowerAchievementRateMap = computed(() =>
  buildManpowerAchievementRateMap(listAll.value, {
    getReportDate,
    getRecordTimeSlots,
    resolveSlotMetrics
  })
)

const formatItemManpowerTotalAchievementRate = (item) => {
  const rate = resolveManpowerTotalAchievementRate(
    item,
    manpowerAchievementRateMap.value,
    getReportDate
  )
  return rate != null ? formatAchievementRate(rate) : '—'
}

const getReportDate = (item) => item?.reportDate || item?.startDate || '—'

const getProcessSegment = (item) => item?.processSegment || item?.process || '—'

const getMachineModel = (item) => item?.machineModel || item?.model || '—'

const getRecordTimeSlots = (item) => parseRecordTimeSlots(item)

const isLegacyRecord = (item) => {
  const slots = getRecordTimeSlots(item)
  if (slots.length > 0) return false
  return !!(item?.passQuantity != null || item?.startDate || item?.batchNo)
}

const hasSlotOptional = (slot) => {
  return (
    (slot.borrowedInManpower != null && slot.borrowedInManpower !== '') ||
    (slot.lentOutManpower != null && slot.lentOutManpower !== '') ||
    slot.ictPassRate ||
    slot.fctPassRate
  )
}

const getSlotMachineModel = (slot, item) =>
  getSlotEffectiveMachineModel(slot, item) || getMachineModel(item)

const getSlotReasonRemark = (slot, item) =>
  String(slot?.reasonRemark || item?.reasonRemark || '').trim()

const resolveSlotSingleWorkHours = (slot, item) => {
  if (slot?.singleWorkHours != null && slot?.singleWorkHours !== '') {
    const fromSlot = Number(slot.singleWorkHours)
    if (!Number.isNaN(fromSlot)) return fromSlot
  }
  const cfg = getModelProcessConfig(
    modelConfigs.value,
    getSlotMachineModel(slot, item),
    getProcessSegment(item)
  )
  const sw = cfg?.singleWorkHours
  return sw != null && sw !== '' && !Number.isNaN(Number(sw)) ? Number(sw) : null
}

const resolveItemSingleWorkHours = (item) => {
  if (item?.singleWorkHours != null && item?.singleWorkHours !== '') {
    const fromItem = Number(item.singleWorkHours)
    if (!Number.isNaN(fromItem)) return fromItem
  }
  const cfg = getModelProcessConfig(
    modelConfigs.value,
    getMachineModel(item),
    getProcessSegment(item)
  )
  const sw = cfg?.singleWorkHours
  return sw != null && sw !== '' && !Number.isNaN(Number(sw)) ? Number(sw) : null
}

const resolveSlotMetrics = (slot, item) => {
  const computed = calcCapacityMetrics({
    singleWorkHours: resolveSlotSingleWorkHours(slot, item),
    productionHours: getSlotProductionHours(slot),
    standardCapacity: slot.standardCapacity,
    actualCapacity: slot.actualCapacity,
    actualManpower: slot.actualManpower
  })
  return {
    outputHours: slot.outputHours ?? computed.outputHours,
    attendanceHours: slot.attendanceHours ?? computed.attendanceHours,
    standardCapacityPcs: slot.standardCapacityPcs ?? computed.standardCapacityPcs,
    capacityDifference: slot.capacityDifference ?? computed.capacityDifference,
    productionAchievementRate:
      slot.productionAchievementRate ?? computed.productionAchievementRate
  }
}

const formatSlotOutputHours = (slot, item) => {
  const v = resolveSlotMetrics(slot, item).outputHours
  return v != null ? `${formatCapacityHours(v)} 小时` : '—'
}

const formatSlotAttendanceHours = (slot, item) => {
  const v = resolveSlotMetrics(slot, item).attendanceHours
  return v != null ? `${formatCapacityHours(v)} 小时` : '—'
}

const formatSlotCapacityDifference = (slot, item) => {
  const v = resolveSlotMetrics(slot, item).capacityDifference
  return v != null ? formatCapacityDifference(v) : '—'
}

const formatSlotAchievementRate = (slot, item) => {
  const v = resolveSlotMetrics(slot, item).productionAchievementRate
  return v != null ? formatAchievementRate(v) : '—'
}

const formatSlotStandardCapacityPcs = (slot, item) => {
  const v = resolveSlotMetrics(slot, item).standardCapacityPcs
  return v != null ? formatStandardCapacityPcs(v) : '—'
}

const includesKeyword = (value, keyword) => {
  if (!keyword) return true
  return String(value || '').toLowerCase().includes(keyword.toLowerCase())
}

const filterRecordLocally = (item, filters) => {
  const reportDate = getReportDate(item)
  if (reportDate !== '—') {
    if (filters.startDate && reportDate < filters.startDate) return false
    if (filters.endDate && reportDate > filters.endDate) return false
  }
  if (filters.productionLine && item.productionLine !== filters.productionLine) return false
  if (filters.processSegment && getProcessSegment(item) !== filters.processSegment) return false
  if (!includesKeyword(getMachineModel(item), filters.machineModel)) return false
  if (!includesKeyword(item.teamLeader, filters.teamLeader)) return false
  if (!includesKeyword(item.submitter, filters.submitter)) return false
  if (!includesKeyword(item.personInCharge, filters.personInCharge)) return false
  return true
}

const handleResetFilter = () => {
  filterProductionLine.value = ''
  filterProcessSegment.value = ''
  filterMachineModel.value = ''
  filterTeamLeader.value = ''
  filterSubmitter.value = ''
  filterPersonInCharge.value = ''
  initDefaultDateRange()
  listAll.value = []
  currentPage.value = 1
  hasQueried.value = false
  expandedRecordKeys.value = {}
}

const handleQuery = async () => {
  if (isLoading.value) return
  if (filterStartDate.value && filterEndDate.value && filterStartDate.value > filterEndDate.value) {
    uni.showToast({ title: '开始日期不能晚于结束日期', icon: 'none' })
    return
  }
  isLoading.value = true
  hasQueried.value = true
  listAll.value = []
  currentPage.value = 1
  expandedRecordKeys.value = {}
  filterExpanded.value = false

  const filters = {
    productionLine: filterProductionLine.value,
    processSegment: filterProcessSegment.value,
    machineModel: filterMachineModel.value.trim(),
    teamLeader: filterTeamLeader.value.trim(),
    submitter: filterSubmitter.value.trim(),
    personInCharge: filterPersonInCharge.value.trim(),
    startDate: filterStartDate.value,
    endDate: filterEndDate.value
  }

  try {
    const params = {
      page: 1,
      pageSize: 9999
    }
    if (filters.productionLine) params.productionLine = filters.productionLine
    if (filters.processSegment) params.processSegment = filters.processSegment
    if (filters.machineModel) params.machineModel = filters.machineModel
    if (filters.teamLeader) params.teamLeader = filters.teamLeader
    if (filters.submitter) params.submitter = filters.submitter
    if (filters.personInCharge) params.personInCharge = filters.personInCharge
    if (filters.startDate) params.startDate = filters.startDate
    if (filters.endDate) params.endDate = filters.endDate

    const res = await getCapacityList(params)
    let list = mergeCapacityRecords(res?.list || [])
    list = splitRecordsBySlotMachineModel(list).map((item, idx) => ({
      ...item,
      _rowKey:
        item._displayGroupKey ||
        `group_${idx}_${getReportDate(item)}_${item.teamLeader || ''}_${getProcessSegment(item)}_${getMachineModel(item)}`
    }))
    list = list.filter((item) => filterRecordLocally(item, filters))
    listAll.value = list
    if (list.length === 0) {
      uni.showToast({ title: '暂无数据', icon: 'none' })
    }
  } catch (e) {
    console.error('产能列表查询失败:', e)
    listAll.value = []
  } finally {
    isLoading.value = false
  }
}

const handlePrevPage = () => {
  if (currentPage.value > 1) currentPage.value -= 1
}

const handleNextPage = () => {
  if (currentPage.value < totalPages.value) currentPage.value += 1
}

function formatDateTime(dateStr, timeStr) {
  if (!dateStr) return '—'
  if (!timeStr) return dateStr
  return `${dateStr} ${timeStr}`
}

function formatNumber(v) {
  if (v == null || v === '') return '—'
  const n = Number(v)
  if (Number.isNaN(n)) return String(v)
  return n % 1 === 0 ? String(n) : n.toFixed(2)
}

function formatCreatedAtBeijing(isoStr) {
  if (!isoStr || typeof isoStr !== 'string') return ''
  try {
    const d = new Date(isoStr.trim())
    if (Number.isNaN(d.getTime())) return isoStr
    const beijingMs = d.getTime() + 8 * 60 * 60 * 1000
    const bj = new Date(beijingMs)
    const y = bj.getUTCFullYear()
    const m = String(bj.getUTCMonth() + 1).padStart(2, '0')
    const day = String(bj.getUTCDate()).padStart(2, '0')
    const h = String(bj.getUTCHours()).padStart(2, '0')
    const min = String(bj.getUTCMinutes()).padStart(2, '0')
    const s = String(bj.getUTCSeconds()).padStart(2, '0')
    return `${y}-${m}-${day} ${h}:${min}:${s}`
  } catch {
    return isoStr
  }
}

const buildExportRows = (list) => {
  const rateMap = buildManpowerAchievementRateMap(list, {
    getReportDate,
    getRecordTimeSlots,
    resolveSlotMetrics
  })
  const rows = []
  list.forEach((item) => {
    const manpowerRate = resolveManpowerTotalAchievementRate(item, rateMap, getReportDate)
    const base = {
      '提报日期': getReportDate(item),
      '线体': item.productionLine || '',
      '组长': item.teamLeader || '',
      '制程段': getProcessSegment(item),
      '机型': getMachineModel(item),
      '负责人': item.personInCharge || '',
      '提交人': item.submitter || '',
      '人力总达成率': manpowerRate != null ? formatAchievementRate(manpowerRate) : '',
      '系统提交时间': formatCreatedAtBeijing(item.createdAt) || ''
    }
    const slots = getRecordTimeSlots(item)
    if (slots.length > 0) {
      slots.forEach((slot) => {
        const metrics = resolveSlotMetrics(slot, item)
        rows.push({
          ...base,
          '时段': slot.timeRange || '',
          '时段机型': getSlotMachineModel(slot, item),
          '生产分钟数': slot.productionMinutes ?? '',
          '生产小时数（H）': slot.productionHours != null && slot.productionHours !== ''
            ? `${formatNumber(slot.productionHours)} H`
            : '',
          '标准产能（PCS/H）': slot.standardCapacity ?? '',
          '标准产能（PCS）':
            metrics.standardCapacityPcs != null ? formatStandardCapacityPcs(metrics.standardCapacityPcs) : '',
          '实际产能（PCS）': slot.actualCapacity ?? '',
          '标准人力': slot.standardManpower ?? '',
          '实际出勤人力': slot.actualManpower ?? '',
          '产出工时': metrics.outputHours != null ? formatCapacityHours(metrics.outputHours) : '',
          '出勤工时': metrics.attendanceHours != null ? formatCapacityHours(metrics.attendanceHours) : '',
          '差异产能（PCS）':
            metrics.capacityDifference != null ? formatCapacityDifference(metrics.capacityDifference) : '',
          '实际生产达成率':
            metrics.productionAchievementRate != null
              ? formatAchievementRate(metrics.productionAchievementRate)
              : '',
          '借入人力': slot.borrowedInManpower ?? '',
          '借入人力岗位': slot.borrowedInPosition || '',
          '借出人力': slot.lentOutManpower ?? '',
          '借出人力岗位': slot.lentOutPosition || '',
          'ICT合格率': slot.ictPassRate || '',
          'FCT合格率': slot.fctPassRate || '',
          '原因说明': getSlotReasonRemark(slot, item)
        })
      })
      return
    }
    if (isLegacyRecord(item)) {
      rows.push({
        ...base,
        '时段': formatDateTime(item.startDate, item.startTime) + ' ~ ' + formatDateTime(item.endDate, item.endTime),
        '产出数': item.passQuantity ?? '',
        '产出工时(小时)': item.outputHours != null ? formatNumber(item.outputHours) : '',
        'UPH': item.uph ?? ''
      })
      return
    }
    rows.push({ ...base, '时段': '—' })
  })
  return rows
}

let cachedXLSX = null
const loadXLSX = async () => {
  if (cachedXLSX) return cachedXLSX
  // #ifdef MP-WEIXIN
  cachedXLSX = null
  return cachedXLSX
  // #endif
  // #ifndef MP-WEIXIN
  const XLSXModule = await import('xlsx')
  cachedXLSX = XLSXModule.default || XLSXModule
  return cachedXLSX
  // #endif
}

const buildSpreadsheetXml = (data) => {
  if (!data || data.length === 0) return ''
  const headers = Object.keys(data[0])
  const escapeXml = (v) => {
    if (v == null) return ''
    return String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;')
  }
  const headerRow = `<Row>${headers.map(h => `<Cell><Data ss:Type="String">${escapeXml(h)}</Data></Cell>`).join('')}</Row>`
  const dataRows = data.map(row => {
    const cells = headers.map(header => {
      const value = row[header]
      const type = typeof value === 'number' ? 'Number' : 'String'
      return `<Cell><Data ss:Type="${type}">${escapeXml(value)}</Data></Cell>`
    }).join('')
    return `<Row>${cells}</Row>`
  }).join('')
  return `<?xml version="1.0" encoding="UTF-8"?><?mso-application progid="Excel.Sheet"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"><Worksheet ss:Name="产能记录"><Table>${headerRow}${dataRows}</Table></Worksheet></Workbook>`
}

const generateExcel = async (data, fileName) => {
  // #ifdef H5
  const XLSX = await loadXLSX()
  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.json_to_sheet(data)
  XLSX.utils.book_append_sheet(wb, ws, '产能记录')
  XLSX.writeFile(wb, fileName)
  // #endif
  // #ifdef MP-WEIXIN
  const xmlContent = buildSpreadsheetXml(data)
  const safeName = fileName.replace(/\.xlsx$/i, '.xls')
  const filePath = `${wx.env.USER_DATA_PATH}/${Date.now()}_${safeName}`
  wx.getFileSystemManager().writeFileSync(filePath, xmlContent, 'utf8')
  uni.showModal({
    title: '导出成功',
    content: '文件已保存，是否打开？',
    showCancel: true,
    confirmText: '打开',
    success: (res) => {
      if (res.confirm) {
        wx.openDocument({ filePath, fail: () => {} })
      }
    }
  })
  // #endif
}

const handleExport = async () => {
  if (listAll.value.length === 0) {
    uni.showToast({ title: '暂无可导出数据', icon: 'none' })
    return
  }
  uni.showLoading({ title: '导出中...', mask: true })
  try {
    const dataset = buildExportRows(listAll.value)
    if (dataset.length === 0) {
      uni.showToast({ title: '无可导出内容', icon: 'none' })
      return
    }
    const dateStr = filterStartDate.value && filterEndDate.value
      ? `${filterStartDate.value}_${filterEndDate.value}`
      : new Date().toISOString().slice(0, 10)
    const fileName = `产能记录_${dateStr}.xlsx`
    await generateExcel(dataset, fileName)
    uni.showToast({ title: '导出成功', icon: 'success' })
  } catch (e) {
    console.error('导出失败:', e)
    uni.showToast({ title: '导出失败', icon: 'none' })
  } finally {
    uni.hideLoading()
  }
}

const handleBack = () => {
  const pages = getCurrentPages()
  if (pages && pages.length > 1) {
    uni.navigateBack()
  } else {
    uni.redirectTo({ url: '/pages/performance/index' })
  }
}

onMounted(async () => {
  const token = uni.getStorageSync('token')
  if (!token) {
    uni.redirectTo({ url: '/pages/login/login' })
    return
  }
  initDefaultDateRange()
  try {
    const lines = await getCapacityLineOptions()
    productionLineOptions.value = ['', ...lines]
    const meta = await getCapacityMeta()
    if (Array.isArray(meta.processes) && meta.processes.length > 0) {
      processSegmentOptions.value = ['', ...meta.processes]
    }
    modelConfigs.value =
      meta && typeof meta.modelConfigs === 'object' && meta.modelConfigs != null
        ? meta.modelConfigs
        : {}
  } catch (e) {
    // 元数据失败时保留「全部」筛选
  }
  handleQuery()
})
</script>

<style lang="scss" scoped>
.capacity-manage-page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background-color: #f5f5f5;
}

.header {
  padding: 24rpx 32rpx;
  background-color: #ffffff;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.06);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.header-back {
  width: 60rpx;
  height: 60rpx;
  border-radius: 999rpx;
  background-color: #f5f5f5;
  display: flex;
  align-items: center;
  justify-content: center;
}

.header-back-icon {
  font-size: 36rpx;
  color: #333;
}

.header-title {
  font-size: 32rpx;
  font-weight: 600;
  text-align: center;
  flex: 1;
}

.header-placeholder {
  width: 60rpx;
  height: 60rpx;
}

.content {
  flex: 1;
  height: 0;
  padding: 24rpx;
  box-sizing: border-box;
}

.section {
  background-color: #ffffff;
  border-radius: 16rpx;
  padding: 24rpx;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.04);
}

.section-title-row {
  margin-bottom: 24rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.section-toggle {
  font-size: 24rpx;
  color: #06b6d4;
}

.filter-summary-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
  margin-bottom: 20rpx;
}

.filter-chip {
  font-size: 22rpx;
  color: #475569;
  background: #f1f5f9;
  padding: 8rpx 16rpx;
  border-radius: 999rpx;
}

.summary-board {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
  margin-bottom: 24rpx;
  padding: 20rpx;
  border-radius: 16rpx;
  background: linear-gradient(135deg, #ecfeff 0%, #f0fdf4 100%);
  border: 1rpx solid #a7f3d0;
}

.summary-item {
  flex: 1;
  min-width: 140rpx;
  text-align: center;
}

.summary-value {
  display: block;
  font-size: 34rpx;
  font-weight: 700;
  color: #0f766e;
  line-height: 1.2;
}

.summary-value-accent {
  color: #0369a1;
}

.summary-label {
  display: block;
  margin-top: 8rpx;
  font-size: 22rpx;
  color: #64748b;
}

.rate-good {
  color: #059669 !important;
}

.rate-warn {
  color: #d97706 !important;
}

.rate-bad {
  color: #dc2626 !important;
}

.rate-neutral {
  color: #64748b !important;
}

.diff-good {
  color: #059669 !important;
}

.diff-bad {
  color: #dc2626 !important;
}

.record-list {
  margin-top: 8rpx;
}

.record-item {
  background-color: #ffffff;
  border-radius: 20rpx;
  padding: 24rpx;
  margin-bottom: 20rpx;
  border: 1rpx solid #e2e8f0;
  box-shadow: 0 4rpx 20rpx rgba(15, 23, 42, 0.06);
}

.record-top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16rpx;
  margin-bottom: 12rpx;
}

.record-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8rpx;
  flex: 1;
  min-width: 0;
}

.tag {
  font-size: 22rpx;
  padding: 6rpx 14rpx;
  border-radius: 999rpx;
}

.tag-date {
  background: #f1f5f9;
  color: #334155;
  font-weight: 600;
}

.tag-line {
  background: #ecfeff;
  color: #0891b2;
}

.tag-process {
  background: #fef3c7;
  color: #b45309;
}

.rate-badge {
  flex-shrink: 0;
  min-width: 120rpx;
  padding: 10rpx 16rpx;
  border-radius: 12rpx;
  text-align: center;
  background: #f8fafc;
}

.rate-badge.rate-good {
  background: #ecfdf5;
}

.rate-badge.rate-warn {
  background: #fffbeb;
}

.rate-badge.rate-bad {
  background: #fef2f2;
}

.rate-badge-label {
  display: block;
  font-size: 20rpx;
  color: #64748b;
}

.rate-badge-value {
  display: block;
  font-size: 28rpx;
  font-weight: 700;
  margin-top: 4rpx;
}

.record-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12rpx;
  margin-bottom: 10rpx;
}

.record-model {
  font-size: 32rpx;
  font-weight: 700;
  color: #0f172a;
  flex: 1;
  min-width: 0;
}

.record-slot-count {
  flex-shrink: 0;
  font-size: 22rpx;
  color: #059669;
  background: #ecfdf5;
  padding: 4rpx 12rpx;
  border-radius: 999rpx;
}

.record-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8rpx;
  margin-bottom: 16rpx;
}

.meta-item {
  font-size: 24rpx;
  color: #475569;
}

.meta-divider {
  font-size: 22rpx;
  color: #cbd5e1;
}

.reason-banner {
  margin-bottom: 16rpx;
  padding: 16rpx;
  border-radius: 12rpx;
  background: #fff7ed;
  border-left: 6rpx solid #f97316;
}

.reason-label {
  display: block;
  font-size: 22rpx;
  color: #c2410c;
  margin-bottom: 6rpx;
}

.reason-text {
  font-size: 24rpx;
  color: #7c2d12;
  line-height: 1.5;
  word-break: break-all;
}

.slot-card {
  margin-top: 12rpx;
  padding: 16rpx;
  border-radius: 16rpx;
  background: #f8fafc;
  border: 1rpx solid #e2e8f0;
}

.slot-reason-banner {
  margin-top: 12rpx;
  margin-bottom: 0;
}

.slot-card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12rpx;
}

.slot-time {
  font-size: 28rpx;
  font-weight: 600;
  color: #0f766e;
}

.slot-rate {
  font-size: 28rpx;
  font-weight: 700;
}

.kpi-grid {
  display: flex;
  flex-wrap: wrap;
}

.kpi-cell {
  width: 50%;
  box-sizing: border-box;
  padding: 8rpx 4rpx;
  text-align: center;
}

.kpi-num {
  display: block;
  font-size: 30rpx;
  font-weight: 700;
  color: #0f172a;
  line-height: 1.2;
}

.kpi-name {
  display: block;
  margin-top: 6rpx;
  font-size: 20rpx;
  color: #64748b;
}

.slot-detail {
  margin-top: 12rpx;
  padding-top: 12rpx;
  border-top: 1rpx dashed #cbd5e1;
}

.detail-row {
  display: flex;
  margin-top: 8rpx;
  gap: 12rpx;
}

.detail-label {
  width: 160rpx;
  flex-shrink: 0;
  font-size: 22rpx;
  color: #64748b;
}

.detail-value {
  flex: 1;
  font-size: 22rpx;
  color: #334155;
  word-break: break-all;
}

.record-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 16rpx;
  padding-top: 12rpx;
  border-top: 1rpx solid #f1f5f9;
}

.expand-btn {
  font-size: 24rpx;
  color: #0891b2;
}

.record-submitter {
  font-size: 22rpx;
  color: #94a3b8;
}

.legacy-block {
  margin-top: 16rpx;
  padding: 16rpx;
  border-radius: 12rpx;
  background-color: #fffbeb;
  border: 1rpx dashed #fcd34d;
}

.legacy-tag {
  font-size: 22rpx;
  color: #b45309;
  display: block;
  margin-bottom: 8rpx;
}

.record-footer {
  margin-top: 8rpx;
}

.record-footer-text {
  font-size: 22rpx;
  color: #94a3b8;
}

.section-title {
  font-size: 30rpx;
  font-weight: 600;
  color: #333;
}

.filter-row {
  display: flex;
  margin-bottom: 16rpx;
}

.filter-item {
  flex: 1;
  margin-right: 16rpx;
}

.filter-item:last-child {
  margin-right: 0;
}

.filter-item-flex {
  display: flex;
  flex-direction: column;
}

.filter-label {
  font-size: 24rpx;
  color: #666;
  margin-bottom: 8rpx;
  display: block;
}

.filter-input {
  width: 100%;
  padding: 16rpx 20rpx;
  border-radius: 12rpx;
  background-color: #f5f5f5;
  font-size: 26rpx;
  box-sizing: border-box;
}

.filter-picker {
  width: 100%;
  padding: 16rpx 20rpx;
  border-radius: 12rpx;
  background-color: #f5f5f5;
  font-size: 26rpx;
  color: #333;
  box-sizing: border-box;
}

.filter-actions {
  display: flex;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 16rpx;
  margin: 16rpx 0 24rpx;
}

.filter-btn {
  min-width: 160rpx;
  padding: 16rpx 24rpx;
  border-radius: 999rpx;
  font-size: 26rpx;
}

.reset-btn {
  background-color: #f2f2f2;
  color: #333;
}

.query-btn {
  background-color: #06b6d4;
  color: #fff;
}

.export-btn {
  background-color: #1890ff;
  color: #fff;
}

.export-btn:disabled {
  background-color: #d9d9d9;
  color: #999;
}

.empty-tip,
.loading-tip {
  padding: 40rpx 0;
  text-align: center;
}

.empty-text,
.loading-text {
  font-size: 24rpx;
  color: #999;
}

.loading-text {
  color: #06b6d4;
}

.pagination-info {
  padding: 16rpx 0;
  text-align: center;
}

.pagination-text {
  font-size: 24rpx;
  color: #666;
}

.pagination-controls {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 24rpx;
  padding: 16rpx 0;
}

.pagination-btn {
  padding: 12rpx 24rpx;
  border-radius: 8rpx;
  background-color: #06b6d4;
  color: #fff;
  font-size: 24rpx;
}

.pagination-btn.btn-disabled {
  background-color: #d9d9d9;
  color: #999;
}

.pagination-info-inline .pagination-info-text {
  font-size: 24rpx;
  color: #666;
}
</style>
