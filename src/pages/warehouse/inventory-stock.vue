<template>
  <view class="page-container">
    <view class="nav-bar">
      <view class="nav-back" hover-class="nav-back-hover" @tap="handleBack">
        <text class="nav-back-icon">‹</text>
        <text class="nav-back-text">返回</text>
      </view>
      <view class="nav-title">库存查询</view>
      <view class="nav-placeholder"></view>
    </view>

    <scroll-view scroll-y class="scroll-area">
      <view class="section-card">
        <text class="section-title">查询条件</text>
        <text class="section-desc">按 Reel ID 字段筛选；可扫码自动填入。条件可留空查最近记录</text>

        <view class="form-item input-row">
          <input
            v-model="filters.keyword"
            class="form-input flex-input"
            placeholder="关键词 / 粘贴完整 Reel ID"
            placeholder-class="form-placeholder"
            confirm-type="search"
            @confirm="handleQuery"
          />
          <view
            class="scan-icon-btn"
            :class="{ disabled: isScanning || isQuerying }"
            @tap="handleScan"
          >
            <text class="scan-icon-text">扫码</text>
          </view>
        </view>

        <view class="form-item">
          <text class="form-label">P/N 物料号</text>
          <input
            v-model="filters.partNumber"
            class="form-input"
            placeholder="如 004.070.0059754"
            placeholder-class="form-placeholder"
            confirm-type="search"
            @confirm="handleQuery"
          />
        </view>
        <view class="form-item">
          <text class="form-label">批次号 Lot</text>
          <input
            v-model="filters.lotNumber"
            class="form-input"
            placeholder="如 2026032904"
            placeholder-class="form-placeholder"
            confirm-type="search"
            @confirm="handleQuery"
          />
        </view>
        <view class="form-item">
          <text class="form-label">厂内物料标识</text>
          <input
            v-model="filters.materialBaseCode"
            class="form-input"
            placeholder="Reel ID 第1段"
            placeholder-class="form-placeholder"
            confirm-type="search"
            @confirm="handleQuery"
          />
        </view>
        <view class="form-item">
          <text class="form-label">V.DES 物料版本号</text>
          <input
            v-model="filters.versionDesc"
            class="form-input"
            placeholder="如 FX-01129"
            placeholder-class="form-placeholder"
            confirm-type="search"
            @confirm="handleQuery"
          />
        </view>
        <view class="form-item">
          <text class="form-label">D.C 设计代码</text>
          <input
            v-model="filters.designCode"
            class="form-input"
            placeholder="如 26137"
            placeholder-class="form-placeholder"
            confirm-type="search"
            @confirm="handleQuery"
          />
        </view>

        <button class="query-btn" :disabled="isQuerying" @tap="handleQuery">
          {{ isQuerying ? '查询中...' : '查询' }}
        </button>
        <button class="reset-btn" :disabled="isQuerying" @tap="handleResetFilters">
          清空条件
        </button>
      </view>

      <view class="tab-row">
        <view
          class="tab-item"
          :class="{ active: activeTab === 'stocks' }"
          @tap="switchTab('stocks')"
        >
          <text class="tab-text">库存汇总</text>
        </view>
        <view
          class="tab-item"
          :class="{ active: activeTab === 'records' }"
          @tap="switchTab('records')"
        >
          <text class="tab-text">入库明细</text>
        </view>
      </view>

      <view v-if="queryError" class="section-card error-card">
        <text class="error-title">查询失败</text>
        <text class="error-msg">{{ queryError }}</text>
      </view>

      <!-- 库存汇总 -->
      <template v-if="activeTab === 'stocks'">
        <view v-if="stockSummary" class="section-card summary-card">
          <text class="section-title">汇总</text>
          <view class="summary-row">
            <text class="row-label">SKU 数</text>
            <text class="row-value">{{ stockSummary.skuCount }}</text>
          </view>
          <view class="summary-row highlight-row">
            <text class="row-label">现存合计</text>
            <text class="row-value remain">{{ stockSummary.totalOnHandQty }}</text>
          </view>
        </view>

        <view v-if="hasQueried && !queryError && stockList.length === 0" class="section-card empty-card">
          <text class="empty-text">未查询到库存记录</text>
        </view>

        <view
          v-for="(item, index) in stockList"
          :key="item.id || `${item.partNumber}-${item.lotNumber}-${index}`"
          class="section-card result-card"
        >
          <view class="result-header">
            <text class="result-index">#{{ index + 1 }}</text>
            <view class="qty-badge">
              <text class="qty-label">现存</text>
              <text class="qty-num">{{ item.onHandQty }}</text>
            </view>
          </view>
          <view class="info-grid">
            <view class="info-row">
              <text class="info-label">P/N</text>
              <text class="info-value highlight">{{ item.partNumber || '—' }}</text>
            </view>
            <view class="info-row">
              <text class="info-label">批次号</text>
              <text class="info-value">{{ item.lotNumber || '—' }}</text>
            </view>
            <view v-if="item.versionDesc" class="info-row">
              <text class="info-label">V.DES</text>
              <text class="info-value">{{ item.versionDesc }}</text>
            </view>
            <view v-if="item.designCode" class="info-row">
              <text class="info-label">D.C</text>
              <text class="info-value">{{ item.designCode }}</text>
            </view>
            <view v-if="item.versionCode" class="info-row">
              <text class="info-label">V.code</text>
              <text class="info-value">{{ item.versionCode }}</text>
            </view>
            <view v-if="item.updatedAt" class="info-row">
              <text class="info-label">更新时间</text>
              <text class="info-value muted">{{ formatTime(item.updatedAt) }}</text>
            </view>
          </view>
          <view
            class="link-btn"
            @tap="queryRecordsForStock(item)"
          >
            <text class="link-btn-text">查看该批次入库明细</text>
          </view>
        </view>
      </template>

      <!-- 入库明细 -->
      <template v-if="activeTab === 'records'">
        <view v-if="hasQueried && !queryError && recordList.length === 0" class="section-card empty-card">
          <text class="empty-text">未查询到入库明细</text>
        </view>

        <view
          v-for="(item, index) in recordList"
          :key="item.id || item.rawCode || index"
          class="section-card result-card"
        >
          <view class="result-header">
            <text class="result-index">#{{ index + 1 }}</text>
            <view class="qty-badge inbound">
              <text class="qty-label">入库</text>
              <text class="qty-num">{{ item.quantityPcs }}</text>
            </view>
          </view>
          <view class="info-grid">
            <view class="info-row">
              <text class="info-label">P/N</text>
              <text class="info-value highlight">{{ item.partNumber || '—' }}</text>
            </view>
            <view class="info-row">
              <text class="info-label">批次号</text>
              <text class="info-value">{{ item.lotNumber || '—' }}</text>
            </view>
            <view class="info-row">
              <text class="info-label">厂内标识</text>
              <text class="info-value">{{ item.materialBaseCode || '—' }}</text>
            </view>
            <view class="info-row">
              <text class="info-label">V.code</text>
              <text class="info-value">{{ item.versionCode || '—' }}</text>
            </view>
            <view class="info-row">
              <text class="info-label">V.DES</text>
              <text class="info-value">{{ item.versionDesc || '—' }}</text>
            </view>
            <view class="info-row">
              <text class="info-label">D.C</text>
              <text class="info-value">{{ item.designCode || '—' }}</text>
            </view>
            <view class="info-row">
              <text class="info-label">入库时间</text>
              <text class="info-value muted">{{ formatTime(item.inboundAt) }}</text>
            </view>
            <view class="info-row block">
              <text class="info-label">Reel ID</text>
              <text class="info-value raw">{{ item.rawCode || '—' }}</text>
            </view>
          </view>
        </view>
      </template>
    </scroll-view>
  </view>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import {
  queryMaterialStocks,
  queryMaterialInboundRecords
} from '@/utils/api/warehouse.js'
import { parseReelId } from '@/utils/warehouse/reelIdParser.js'

const activeTab = ref('stocks')
const isQuerying = ref(false)
const isScanning = ref(false)
const hasQueried = ref(false)
const queryError = ref('')

const stockList = ref([])
const stockSummary = ref(null)
const recordList = ref([])

const filters = reactive({
  keyword: '',
  partNumber: '',
  lotNumber: '',
  materialBaseCode: '',
  versionCode: '',
  versionDesc: '',
  designCode: '',
  rawCode: ''
})

const createEmptyFilters = () => ({
  keyword: '',
  partNumber: '',
  lotNumber: '',
  materialBaseCode: '',
  versionCode: '',
  versionDesc: '',
  designCode: '',
  rawCode: ''
})

const buildQueryParams = () => {
  const params = {
    page: 1,
    pageSize: 50
  }
  const keys = [
    'keyword',
    'partNumber',
    'lotNumber',
    'materialBaseCode',
    'versionCode',
    'versionDesc',
    'designCode',
    'rawCode'
  ]
  keys.forEach((key) => {
    const val = String(filters[key] || '').trim()
    if (val) params[key] = val
  })
  return params
}

const unwrapList = (res) => {
  if (!res) return []
  if (Array.isArray(res)) return res
  if (Array.isArray(res.list)) return res.list
  if (Array.isArray(res.data?.list)) return res.data.list
  if (Array.isArray(res.data)) return res.data
  return []
}

const unwrapSummary = (res, list) => {
  const raw = res?.summary || res?.data?.summary
  if (raw) {
    return {
      skuCount: Number(raw.skuCount ?? raw.total ?? list.length) || 0,
      totalOnHandQty: Number(raw.totalOnHandQty ?? raw.totalQty ?? 0) || 0
    }
  }
  const totalOnHandQty = list.reduce(
    (sum, row) => sum + (Number(row.onHandQty ?? row.on_hand_qty) || 0),
    0
  )
  return { skuCount: list.length, totalOnHandQty }
}

const normalizeStock = (raw = {}) => ({
  id: raw.id || '',
  partNumber: raw.partNumber || raw.part_number || '',
  lotNumber: raw.lotNumber || raw.lot_number || '',
  onHandQty: Number(raw.onHandQty ?? raw.on_hand_qty ?? 0) || 0,
  updatedAt: raw.updatedAt || raw.updated_at || '',
  materialBaseCode: raw.materialBaseCode || raw.material_base_code || '',
  versionCode: raw.versionCode || raw.version_code || '',
  versionDesc: raw.versionDesc || raw.version_desc || '',
  designCode: raw.designCode || raw.design_code || ''
})

const normalizeRecord = (raw = {}) => ({
  id: raw.id || '',
  rawCode: raw.rawCode || raw.raw_code || '',
  materialBaseCode: raw.materialBaseCode || raw.material_base_code || '',
  partNumber: raw.partNumber || raw.part_number || '',
  versionCode: raw.versionCode || raw.version_code || '',
  versionDesc: raw.versionDesc || raw.version_desc || '',
  designCode: raw.designCode || raw.design_code || '',
  lotNumber: raw.lotNumber || raw.lot_number || '',
  quantityPcs: Number(raw.quantityPcs ?? raw.quantity_pcs ?? 0) || 0,
  inboundAt: raw.inboundAt || raw.createdAt || raw.inbound_at || raw.created_at || ''
})

const formatTime = (value) => {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return String(value)
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

const fetchStocks = async () => {
  const res = await queryMaterialStocks(buildQueryParams())
  const list = unwrapList(res).map(normalizeStock)
  stockList.value = list
  stockSummary.value = unwrapSummary(res, list)
}

const fetchRecords = async () => {
  const params = buildQueryParams()
  // 明细接口：keyword 若像完整 Reel ID，同时传 rawCode 便于精确命中
  if (!params.rawCode && params.keyword && String(params.keyword).includes('@')) {
    params.rawCode = params.keyword
  }
  const res = await queryMaterialInboundRecords(params)
  recordList.value = unwrapList(res).map(normalizeRecord)
}

const handleQuery = async () => {
  if (isQuerying.value) return
  isQuerying.value = true
  queryError.value = ''
  hasQueried.value = true
  try {
    if (activeTab.value === 'stocks') {
      await fetchStocks()
    } else {
      await fetchRecords()
    }
  } catch (error) {
    console.error('库存查询失败:', error)
    stockList.value = []
    stockSummary.value = null
    recordList.value = []
    const code = error?.code || ''
    const msg = error?.message || '查询失败，请重试'
    const isNotFound =
      code === 'NOT_FOUND' ||
      (msg && String(msg).includes('404'))
    queryError.value = isNotFound
      ? '查询接口未就绪，请后端实现库存汇总/入库明细接口（见 docs/backend-warehouse-material-stock-query.md）'
      : msg
  } finally {
    isQuerying.value = false
  }
}

const switchTab = (tab) => {
  if (activeTab.value === tab) return
  activeTab.value = tab
  if (hasQueried.value) {
    handleQuery()
  }
}

const queryRecordsForStock = (item) => {
  filters.partNumber = item.partNumber || ''
  filters.lotNumber = item.lotNumber || ''
  filters.rawCode = ''
  filters.keyword = ''
  activeTab.value = 'records'
  handleQuery()
}

const applyReelToFilters = (record) => {
  filters.keyword = record.rawCode || ''
  filters.rawCode = record.rawCode || ''
  filters.partNumber = record.partNumber || ''
  filters.lotNumber = record.lotNumber || ''
  filters.materialBaseCode = record.materialBaseCode || ''
  filters.versionCode = record.versionCode || ''
  filters.versionDesc = record.versionDesc || ''
  filters.designCode = record.designCode || ''
}

const handleScan = () => {
  if (isScanning.value || isQuerying.value) return
  isScanning.value = true
  uni.scanCode({
    onlyFromCamera: false,
    scanType: ['barCode', 'qrCode'],
    success: (res) => {
      const code = String(res?.result || '').trim()
      if (!code) {
        uni.showToast({ title: '未识别到有效内容', icon: 'none' })
        return
      }
      const parsed = parseReelId(code)
      if (parsed.valid) {
        applyReelToFilters(parsed.record)
        uni.showToast({ title: '已填入条件', icon: 'success' })
      } else {
        filters.keyword = code
        filters.rawCode = code.includes('@') ? code : ''
        uni.showToast({ title: '已作关键词查询', icon: 'none' })
      }
      handleQuery()
    },
    fail: (err) => {
      const msg = err?.errMsg || ''
      if (/cancel|取消/i.test(msg)) return
      uni.showModal({
        title: '扫码不可用',
        content: '请手动输入查询条件，或粘贴完整 Reel ID。',
        showCancel: false
      })
    },
    complete: () => {
      isScanning.value = false
    }
  })
}

const handleResetFilters = () => {
  Object.assign(filters, createEmptyFilters())
  stockList.value = []
  stockSummary.value = null
  recordList.value = []
  queryError.value = ''
  hasQueried.value = false
}

const handleBack = () => {
  const pages = getCurrentPages()
  if (pages.length > 1) {
    uni.navigateBack()
  } else {
    uni.redirectTo({ url: '/pages/warehouse/inventory' })
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
}

.nav-title {
  font-size: 34rpx;
  font-weight: 700;
  color: #ffffff;
  letter-spacing: 2rpx;
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

.input-row {
  display: flex;
  align-items: stretch;
  gap: 16rpx;
}

.flex-input {
  flex: 1;
  min-width: 0;
}

.scan-icon-btn {
  flex-shrink: 0;
  width: 140rpx;
  min-height: 96rpx;
  border-radius: 16rpx;
  background: linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%);
  display: flex;
  align-items: center;
  justify-content: center;
}

.scan-icon-btn.disabled {
  opacity: 0.55;
}

.scan-icon-text {
  color: #fff;
  font-size: 28rpx;
  font-weight: 700;
}

.form-label {
  font-size: 26rpx;
  font-weight: 600;
  color: #374151;
  margin-bottom: 10rpx;
  display: block;
}

.form-input {
  width: 100%;
  min-height: 88rpx;
  padding: 20rpx 24rpx;
  border-radius: 16rpx;
  background: #f5f3ff;
  font-size: 28rpx;
  box-sizing: border-box;
  border: 2rpx solid #e9d5ff;
}

.form-placeholder {
  color: #9ca3af;
}

.query-btn {
  width: 100%;
  height: 92rpx;
  line-height: 92rpx;
  margin-bottom: 16rpx;
  background: linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%);
  color: #fff;
  font-size: 32rpx;
  font-weight: 700;
  border-radius: 16rpx;
  border: none;
}

.reset-btn {
  width: 100%;
  height: 80rpx;
  line-height: 80rpx;
  background: #fff;
  color: #6d28d9;
  font-size: 28rpx;
  font-weight: 600;
  border-radius: 16rpx;
  border: 2rpx solid #ddd6fe;
}

.query-btn[disabled],
.reset-btn[disabled] {
  opacity: 0.65;
}

.tab-row {
  display: flex;
  gap: 16rpx;
  margin-bottom: 24rpx;
}

.tab-item {
  flex: 1;
  height: 72rpx;
  border-radius: 16rpx;
  background: rgba(255, 255, 255, 0.85);
  border: 2rpx solid #e9d5ff;
  display: flex;
  align-items: center;
  justify-content: center;
}

.tab-item.active {
  background: linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%);
  border-color: transparent;
}

.tab-text {
  font-size: 28rpx;
  font-weight: 700;
  color: #6d28d9;
}

.tab-item.active .tab-text {
  color: #fff;
}

.error-card {
  border-color: #fecaca;
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
  font-size: 26rpx;
  color: #b91c1c;
  line-height: 1.5;
}

.summary-card .summary-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12rpx 0;
}

.row-label {
  font-size: 28rpx;
  color: #6b7280;
}

.row-value {
  font-size: 32rpx;
  font-weight: 700;
  color: #374151;
}

.row-value.remain {
  color: #059669;
  font-size: 36rpx;
}

.highlight-row {
  margin-top: 8rpx;
  padding-top: 16rpx;
  border-top: 2rpx dashed #e9d5ff;
}

.empty-card {
  text-align: center;
  padding: 48rpx 24rpx;
}

.empty-text {
  font-size: 28rpx;
  color: #9ca3af;
}

.result-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16rpx;
}

.result-index {
  font-size: 26rpx;
  font-weight: 700;
  color: #7c3aed;
}

.qty-badge {
  display: flex;
  align-items: baseline;
  gap: 8rpx;
  background: #d1fae5;
  padding: 8rpx 16rpx;
  border-radius: 12rpx;
}

.qty-badge.inbound {
  background: #ede9fe;
}

.qty-label {
  font-size: 22rpx;
  color: #047857;
  font-weight: 600;
}

.qty-badge.inbound .qty-label {
  color: #6d28d9;
}

.qty-num {
  font-size: 34rpx;
  font-weight: 700;
  color: #059669;
}

.qty-badge.inbound .qty-num {
  color: #5b21b6;
}

.info-grid {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16rpx;
}

.info-row.block {
  flex-direction: column;
  gap: 8rpx;
}

.info-label {
  font-size: 24rpx;
  color: #9ca3af;
  flex-shrink: 0;
  width: 140rpx;
}

.info-row.block .info-label {
  width: auto;
}

.info-value {
  font-size: 26rpx;
  color: #374151;
  text-align: right;
  flex: 1;
  word-break: break-all;
}

.info-value.highlight {
  color: #5b21b6;
  font-weight: 700;
}

.info-value.muted {
  color: #6b7280;
  font-size: 24rpx;
}

.info-value.raw {
  text-align: left;
  font-size: 22rpx;
  color: #6b7280;
  background: #f9fafb;
  padding: 12rpx 16rpx;
  border-radius: 10rpx;
}

.link-btn {
  margin-top: 20rpx;
  padding: 16rpx;
  border-radius: 12rpx;
  background: #f5f3ff;
  text-align: center;
}

.link-btn-text {
  font-size: 26rpx;
  font-weight: 600;
  color: #6d28d9;
}
</style>
