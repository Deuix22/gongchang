<template>
  <view class="page-container">
    <view class="nav-bar">
      <view class="nav-back" hover-class="nav-back-hover" @tap="handleBack">
        <text class="nav-back-icon">‹</text>
        <text class="nav-back-text">返回</text>
      </view>
      <view class="nav-title">管理查询</view>
      <view class="nav-placeholder"></view>
    </view>

    <scroll-view scroll-y class="scroll-area">
      <!-- 查询条件 -->
      <view class="section-card">
        <text class="section-title">追溯查询</text>
        <text class="section-desc">按生产批号、机型（销售型号）查询出入库与余量，至少填写一项</text>

        <view class="form-item">
          <text class="form-label">生产批号</text>
          <input
            v-model="batchInput"
            class="form-input"
            placeholder="GR-HFYZBU + 8位数字 + 可选01H/02B"
            placeholder-class="form-placeholder"
            confirm-type="search"
            @confirm="handleQuery"
          />
        </view>
        <view class="form-item">
          <text class="form-label">机型（销售型号）</text>
          <input
            v-model="modelInput"
            class="form-input"
            placeholder="请输入销售型号"
            placeholder-class="form-placeholder"
            confirm-type="search"
            @confirm="handleQuery"
          />
        </view>

        <button class="query-btn" :disabled="isQuerying" @tap="handleQuery">
          {{ isQuerying ? '查询中...' : '查询' }}
        </button>
      </view>

      <!-- 错误 -->
      <view v-if="queryError" class="section-card error-card">
        <text class="error-title">查询失败</text>
        <text class="error-msg">{{ queryError }}</text>
      </view>

      <!-- 汇总 -->
      <view v-if="summary" class="section-card summary-card">
        <text class="section-title">汇总</text>
        <view class="summary-grid">
          <view class="summary-block today">
            <text class="block-title">今日</text>
            <view class="summary-row">
              <text class="row-label">入库</text>
              <text class="row-value in">{{ summary.todayInboundQuantityPcs }}</text>
            </view>
            <view class="summary-row">
              <text class="row-label">出库</text>
              <text class="row-value out">{{ summary.todayOutboundQuantityPcs }}</text>
            </view>
          </view>
          <view class="summary-block total">
            <text class="block-title">累计</text>
            <view class="summary-row">
              <text class="row-label">入库</text>
              <text class="row-value">{{ summary.cumulativeInboundQuantityPcs }}</text>
            </view>
            <view class="summary-row">
              <text class="row-label">出库</text>
              <text class="row-value">{{ summary.cumulativeOutboundQuantityPcs }}</text>
            </view>
            <view class="summary-row highlight-row">
              <text class="row-label">剩余</text>
              <text class="row-value remain">{{ summary.cumulativeRemainingQuantityPcs }}</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 明细列表 -->
      <view v-if="hasQueried && !queryError && traceList.length === 0" class="section-card empty-card">
        <text class="empty-text">未查询到符合条件的记录</text>
      </view>

      <view
        v-for="(item, index) in traceList"
        :key="item.id || `${item.productionBatchNo}-${item.salesModel}-${index}`"
        class="section-card trace-card"
      >
        <view class="trace-header">
          <text class="trace-index">#{{ index + 1 }}</text>
          <text v-if="item.batchKey" class="trace-batch-key">{{ item.batchKey }}</text>
        </view>

        <view class="info-grid">
          <view class="info-row">
            <text class="info-label">生产批号</text>
            <text class="info-value highlight">{{ item.productionBatchNo || '—' }}</text>
          </view>
          <view class="info-row">
            <text class="info-label">机型</text>
            <text class="info-value">{{ item.salesModel || '—' }}</text>
          </view>
          <view class="info-row">
            <text class="info-label">产品编码</text>
            <text class="info-value">{{ item.productCode || '—' }}</text>
          </view>
          <view class="info-row">
            <text class="info-label">收货客户</text>
            <text class="info-value">{{ item.customerName || '—' }}</text>
          </view>
        </view>

        <view class="stats-section">
          <text class="stats-title">今日</text>
          <view class="stats-row">
            <view class="stat-chip in">
              <text class="chip-label">入库</text>
              <text class="chip-num">{{ item.todayInboundQuantityPcs }}</text>
            </view>
            <view class="stat-chip out">
              <text class="chip-label">出库</text>
              <text class="chip-num">{{ item.todayOutboundQuantityPcs }}</text>
            </view>
          </view>
        </view>

        <view class="stats-section">
          <text class="stats-title">累计</text>
          <view class="stats-row three">
            <view class="stat-chip">
              <text class="chip-label">入库</text>
              <text class="chip-num">{{ item.cumulativeInboundQuantityPcs }}</text>
            </view>
            <view class="stat-chip">
              <text class="chip-label">出库</text>
              <text class="chip-num">{{ item.cumulativeOutboundQuantityPcs }}</text>
            </view>
            <view class="stat-chip remain">
              <text class="chip-label">剩余</text>
              <text class="chip-num">{{ item.cumulativeRemainingQuantityPcs }}</text>
            </view>
          </view>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { queryWarehouseTrace } from '@/utils/api/warehouse.js'
import { parseBoxOrBatchCode } from '@/utils/warehouse/boxCodeParser.js'

const batchInput = ref('')
const modelInput = ref('')
const traceList = ref([])
const summary = ref(null)
const queryError = ref('')
const isQuerying = ref(false)
const hasQueried = ref(false)

const pickNum = (obj, keys) => {
  for (const key of keys) {
    const v = obj[key]
    if (v !== undefined && v !== null && v !== '') {
      return Number(v) || 0
    }
  }
  return 0
}

const normalizeTraceRow = (raw = {}) => ({
  id: raw.id || '',
  batchKey: raw.batchKey || '',
  productionBatchNo: raw.productionBatchNo || '',
  salesModel: raw.salesModel || '',
  productCode: raw.productCode || '',
  customerName: raw.customerName || '',
  customerOrderNo: raw.customerOrderNo || '',
  deliveryNoteNo: raw.deliveryNoteNo || '',
  todayInboundQuantityPcs: pickNum(raw, [
    'todayInboundQuantityPcs',
    'todayInbound',
    'todayInQuantityPcs'
  ]),
  todayOutboundQuantityPcs: pickNum(raw, [
    'todayOutboundQuantityPcs',
    'todayOutbound',
    'todayOutQuantityPcs'
  ]),
  cumulativeInboundQuantityPcs: pickNum(raw, [
    'cumulativeInboundQuantityPcs',
    'totalInboundQuantityPcs',
    'cumulativeInQuantityPcs'
  ]),
  cumulativeOutboundQuantityPcs: pickNum(raw, [
    'cumulativeOutboundQuantityPcs',
    'totalOutboundQuantityPcs',
    'cumulativeOutQuantityPcs'
  ]),
  cumulativeRemainingQuantityPcs: pickNum(raw, [
    'cumulativeRemainingQuantityPcs',
    'remainingQuantityPcs',
    'totalRemainingQuantityPcs'
  ])
})

const calcSummary = (list) => {
  if (!list.length) return null
  return list.reduce(
    (acc, row) => ({
      todayInboundQuantityPcs:
        acc.todayInboundQuantityPcs + row.todayInboundQuantityPcs,
      todayOutboundQuantityPcs:
        acc.todayOutboundQuantityPcs + row.todayOutboundQuantityPcs,
      cumulativeInboundQuantityPcs:
        acc.cumulativeInboundQuantityPcs + row.cumulativeInboundQuantityPcs,
      cumulativeOutboundQuantityPcs:
        acc.cumulativeOutboundQuantityPcs + row.cumulativeOutboundQuantityPcs,
      cumulativeRemainingQuantityPcs:
        acc.cumulativeRemainingQuantityPcs + row.cumulativeRemainingQuantityPcs
    }),
    {
      todayInboundQuantityPcs: 0,
      todayOutboundQuantityPcs: 0,
      cumulativeInboundQuantityPcs: 0,
      cumulativeOutboundQuantityPcs: 0,
      cumulativeRemainingQuantityPcs: 0
    }
  )
}

const normalizeTraceResponse = (res) => {
  const data = res?.data || res
  if (!data) return { list: [], summary: null }

  let list = []
  if (Array.isArray(data.list)) {
    list = data.list
  } else if (Array.isArray(data.items)) {
    list = data.items
  } else if (Array.isArray(data.records)) {
    list = data.records
  } else if (data.productionBatchNo || data.salesModel) {
    list = [data]
  }

  const rows = list.map(normalizeTraceRow)
  const summaryData = data.summary
    ? normalizeTraceRow(data.summary)
    : calcSummary(rows)

  return { list: rows, summary: rows.length ? summaryData : null }
}

const buildQueryParams = () => {
  const params = {}
  const model = modelInput.value.trim()
  if (model) params.salesModel = model

  const batchRaw = batchInput.value.trim()
  if (batchRaw) {
    const parsed = parseBoxOrBatchCode(batchRaw)
    if (parsed.valid) {
      params.productionBatchNo = parsed.productionBatchNo
      params.batchKey = parsed.batchKey
    } else {
      params.productionBatchNo = batchRaw
      const keyMatch = batchRaw.replace(/-/g, '').match(/(\d{8})$/)
      if (keyMatch) params.batchKey = keyMatch[1]
    }
  }

  return params
}

const handleQuery = async () => {
  const params = buildQueryParams()
  if (!params.productionBatchNo && !params.batchKey && !params.salesModel) {
    uni.showToast({ title: '请填写批号或机型', icon: 'none' })
    return
  }

  isQuerying.value = true
  queryError.value = ''
  hasQueried.value = true

  try {
    const res = await queryWarehouseTrace(params)
    const { list, summary: sum } = normalizeTraceResponse(res)
    traceList.value = list
    summary.value = sum
    if (!list.length) {
      uni.showToast({ title: '暂无数据', icon: 'none' })
    }
  } catch (error) {
    console.error('管理查询失败:', error)
    traceList.value = []
    summary.value = null
    const isNotFound =
      error?.code === 'NOT_FOUND' ||
      (error?.message && String(error.message).includes('404'))
    queryError.value = isNotFound
      ? '查询接口未就绪，请后端实现 GET /api/warehouse/manage-query/trace'
      : (error.message || '查询失败，请重试')
  } finally {
    isQuerying.value = false
  }
}

const handleBack = () => {
  const pages = getCurrentPages()
  if (pages.length > 1) {
    uni.navigateBack()
  } else {
    uni.redirectTo({ url: '/pages/warehouse/index' })
  }
}

onMounted(() => {
  const token = uni.getStorageSync('token')
  if (!token) {
    uni.redirectTo({ url: '/pages/login/login' })
  }
})
</script>

<style lang="scss" scoped>
.page-container {
  min-height: 100vh;
  background: linear-gradient(180deg, #f8fafc 0%, #f5f3ff 45%, #ede9fe 100%);
  display: flex;
  flex-direction: column;
}

.nav-bar {
  padding: 56rpx 24rpx 28rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%);
  box-shadow: 0 12rpx 28rpx rgba(91, 33, 182, 0.28);
  position: relative;
  z-index: 2;
}

.nav-back {
  min-width: 148rpx;
  height: 72rpx;
  padding: 0 22rpx 0 12rpx;
  border-radius: 999rpx;
  background: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 2rpx;
  box-shadow: 0 8rpx 20rpx rgba(0, 0, 0, 0.18);
  border: 2rpx solid rgba(255, 255, 255, 0.95);
  box-sizing: border-box;
}

.nav-back-hover {
  transform: scale(0.96);
  opacity: 0.92;
}

.nav-back-icon {
  font-size: 48rpx;
  font-weight: 700;
  color: #6d28d9;
  line-height: 1;
  margin-top: -4rpx;
}

.nav-back-text {
  font-size: 28rpx;
  font-weight: 700;
  color: #6d28d9;
  letter-spacing: 1rpx;
}

.nav-title {
  font-size: 34rpx;
  font-weight: 700;
  color: #ffffff;
  letter-spacing: 2rpx;
  text-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.18);
}

.nav-placeholder {
  min-width: 148rpx;
}

.scroll-area {
  flex: 1;
  height: 0;
  padding: 28rpx 24rpx 48rpx;
  box-sizing: border-box;
}

.section-card {
  background: #ffffff;
  border-radius: 24rpx;
  padding: 28rpx 24rpx;
  margin-bottom: 24rpx;
  box-shadow: 0 10rpx 28rpx rgba(91, 33, 182, 0.08);
  border: 2rpx solid rgba(196, 181, 253, 0.45);
}

.section-title {
  font-size: 30rpx;
  font-weight: 700;
  color: #5b21b6;
  display: block;
  margin-bottom: 8rpx;
  padding-left: 16rpx;
  border-left: 6rpx solid #7c3aed;
}

.section-desc {
  font-size: 26rpx;
  color: #6b7280;
  display: block;
  margin-bottom: 20rpx;
  line-height: 1.5;
}

.form-item {
  margin-bottom: 20rpx;
}

.form-label {
  font-size: 30rpx;
  font-weight: 600;
  color: #374151;
  margin-bottom: 12rpx;
  display: block;
}

.form-input {
  width: 100%;
  min-height: 96rpx;
  padding: 24rpx 28rpx;
  border-radius: 16rpx;
  background: #f5f3ff;
  font-size: 32rpx;
  line-height: 1.5;
  box-sizing: border-box;
  border: 2rpx solid #e9d5ff;
}

.form-placeholder {
  color: #9ca3af;
}

.query-btn {
  width: 100%;
  height: 88rpx;
  line-height: 88rpx;
  background: linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%);
  color: #fff;
  font-size: 30rpx;
  font-weight: 600;
  border-radius: 16rpx;
  border: none;
  margin-top: 8rpx;
}

.query-btn[disabled] {
  opacity: 0.65;
}

.error-card {
  border: 2rpx solid #fecaca;
  background: #fef2f2;
}

.error-title {
  font-size: 30rpx;
  font-weight: 700;
  color: #dc2626;
  display: block;
  margin-bottom: 8rpx;
}

.error-msg {
  font-size: 28rpx;
  color: #b91c1c;
  line-height: 1.5;
}

.empty-card {
  text-align: center;
  padding: 48rpx 20rpx;
}

.empty-text {
  font-size: 28rpx;
  color: #9ca3af;
}

.summary-card {
  border: 2rpx solid #c4b5fd;
}

.summary-grid {
  display: flex;
  gap: 16rpx;
}

.summary-block {
  flex: 1;
  padding: 20rpx 16rpx;
  border-radius: 16rpx;
  background: #f5f3ff;
}

.summary-block.today {
  background: #ecfdf5;
}

.summary-block.total {
  background: linear-gradient(135deg, #ede9fe 0%, #ddd6fe 100%);
}

.block-title {
  font-size: 26rpx;
  font-weight: 700;
  color: #5b21b6;
  display: block;
  margin-bottom: 12rpx;
}

.summary-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10rpx;
}

.highlight-row {
  margin-top: 4rpx;
  padding-top: 10rpx;
  border-top: 2rpx dashed #c4b5fd;
}

.row-label {
  font-size: 26rpx;
  color: #6b7280;
}

.row-value {
  font-size: 32rpx;
  font-weight: 700;
  color: #374151;
}

.row-value.in {
  color: #059669;
}

.row-value.out {
  color: #d97706;
}

.row-value.remain {
  color: #6d28d9;
  font-size: 36rpx;
}

.trace-card {
  border: 2rpx solid #ede9fe;
}

.trace-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16rpx;
}

.trace-index {
  font-size: 28rpx;
  font-weight: 700;
  color: #6d28d9;
}

.trace-batch-key {
  font-size: 24rpx;
  color: #7c3aed;
  background: #ede9fe;
  padding: 4rpx 12rpx;
  border-radius: 8rpx;
}

.info-grid {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
  margin-bottom: 20rpx;
}

.info-row {
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}

.info-label {
  font-size: 24rpx;
  color: #6b7280;
}

.info-value {
  font-size: 28rpx;
  color: #111827;
  word-break: break-all;
}

.info-value.highlight {
  color: #6d28d9;
  font-weight: 600;
}

.stats-section {
  margin-bottom: 16rpx;
}

.stats-section:last-child {
  margin-bottom: 0;
}

.stats-title {
  font-size: 24rpx;
  font-weight: 600;
  color: #6b7280;
  margin-bottom: 10rpx;
  display: block;
}

.stats-row {
  display: flex;
  gap: 12rpx;
}

.stats-row.three .stat-chip {
  flex: 1;
}

.stat-chip {
  flex: 1;
  text-align: center;
  padding: 16rpx 8rpx;
  border-radius: 12rpx;
  background: #f9fafb;
}

.stat-chip.in {
  background: #ecfdf5;
}

.stat-chip.out {
  background: #fff7ed;
}

.stat-chip.remain {
  background: linear-gradient(135deg, #ede9fe 0%, #ddd6fe 100%);
}

.chip-label {
  font-size: 22rpx;
  color: #6b7280;
  display: block;
}

.chip-num {
  font-size: 32rpx;
  font-weight: 700;
  color: #374151;
  margin-top: 6rpx;
  display: block;
}

.stat-chip.remain .chip-num {
  color: #6d28d9;
}
</style>
