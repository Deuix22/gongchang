<template>
  <view class="page-container">
    <view class="nav-bar">
      <view class="nav-back" hover-class="nav-back-hover" @tap="handleBack">
        <text class="nav-back-icon">‹</text>
        <text class="nav-back-text">返回</text>
      </view>
      <view class="nav-title">物料入库</view>
      <view class="nav-placeholder"></view>
    </view>

    <scroll-view scroll-y class="scroll-area">
      <view class="section-card">
        <text class="section-title">扫描 Reel ID</text>
        <text class="section-desc">扫描物料标签二维码 / 条码，按 @ 分段自动识别字段后核对入库；相同 Reel ID 禁止重复入库</text>
        <text class="format-hint">{{ reelHint }}</text>

        <view class="form-item input-row">
          <input
            v-model="reelInput"
            class="form-input flex-input"
            placeholder="扫描或粘贴完整 Reel ID"
            placeholder-class="form-placeholder"
            confirm-type="done"
            @confirm="handleParse"
          />
          <view
            class="scan-icon-btn"
            :class="{ disabled: isScanning || isSubmitting }"
            @tap="handleScan"
          >
            <text class="scan-icon-text">扫码</text>
          </view>
        </view>

        <button
          class="scan-primary-btn"
          :disabled="isScanning || isSubmitting"
          @tap="handleScan"
        >
          {{ isScanning ? '调起相机...' : '扫码识别' }}
        </button>
        <button
          class="parse-btn"
          :disabled="isSubmitting"
          @tap="handleParse"
        >
          解析填入
        </button>
      </view>

      <view v-if="parseError" class="section-card error-card">
        <text class="error-title">识别失败</text>
        <text class="error-msg">{{ parseError }}</text>
      </view>

      <view v-if="hasRecord" class="section-card">
        <view class="match-header">
          <text class="section-title">识别结果</text>
          <view class="match-badge">请核对</view>
        </view>

        <view class="form-item">
          <text class="form-label">{{ fieldLabels.materialBaseCode }}</text>
          <input v-model="form.materialBaseCode" class="form-input" placeholder-class="form-placeholder" />
        </view>
        <view class="form-item">
          <text class="form-label">{{ fieldLabels.partNumber }}</text>
          <input v-model="form.partNumber" class="form-input" placeholder-class="form-placeholder" />
        </view>
        <view class="form-item">
          <text class="form-label">{{ fieldLabels.versionCode }}</text>
          <input v-model="form.versionCode" class="form-input" placeholder-class="form-placeholder" />
        </view>
        <view class="form-item">
          <text class="form-label">{{ fieldLabels.versionDesc }}</text>
          <input v-model="form.versionDesc" class="form-input" placeholder-class="form-placeholder" />
        </view>
        <view class="form-item">
          <text class="form-label">{{ fieldLabels.designCode }}</text>
          <input v-model="form.designCode" class="form-input" placeholder-class="form-placeholder" />
        </view>
        <view class="form-item">
          <text class="form-label">{{ fieldLabels.lotNumber }}</text>
          <input v-model="form.lotNumber" class="form-input" placeholder-class="form-placeholder" />
        </view>
        <view class="form-item">
          <text class="form-label">{{ fieldLabels.quantityPcs }}</text>
          <input
            v-model="form.quantityPcs"
            class="form-input"
            type="number"
            placeholder-class="form-placeholder"
          />
        </view>
        <view class="form-item">
          <text class="form-label">原始 Reel ID</text>
          <text class="raw-code">{{ form.rawCode || '—' }}</text>
        </view>

        <button
          class="submit-btn"
          :disabled="isSubmitting || !canSubmit"
          @tap="handleSubmit"
        >
          {{ isSubmitting ? '入库中...' : '确认入库' }}
        </button>
        <button class="reset-btn" :disabled="isSubmitting" @tap="handleReset">
          清空重扫
        </button>
      </view>
    </scroll-view>
  </view>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import {
  submitMaterialInbound,
  lookupMaterialInboundByRawCode
} from '@/utils/api/warehouse.js'
import {
  createEmptyReelRecord,
  parseReelId,
  buildInboundPayload,
  formatReelIdHint,
  REEL_FIELD_LABELS,
  isReelAlreadyInbound,
  markReelAsInbound,
  getInboundReelRecord
} from '@/utils/warehouse/reelIdParser.js'

const reelHint = formatReelIdHint()
const fieldLabels = REEL_FIELD_LABELS

const reelInput = ref('')
const parseError = ref('')
const isScanning = ref(false)
const isSubmitting = ref(false)
const hasRecord = ref(false)
const form = reactive(createEmptyReelRecord())

const canSubmit = computed(() => {
  return !!(
    form.rawCode &&
    form.materialBaseCode &&
    form.partNumber &&
    form.lotNumber &&
    Number(form.quantityPcs) > 0
  )
})

const showDuplicateModal = (detail = {}) => {
  const part = detail.partNumber ? `\n物料号：${detail.partNumber}` : ''
  const lot = detail.lotNumber ? `\n批次：${detail.lotNumber}` : ''
  const time = detail.inboundAt ? `\n入库时间：${detail.inboundAt}` : ''
  uni.showModal({
    title: '重复入库',
    content: `该 Reel ID 已入库，不能重复提交${part}${lot}${time}`,
    showCancel: false
  })
}

const applyRecord = (record) => {
  Object.assign(form, createEmptyReelRecord(), record)
  hasRecord.value = true
  parseError.value = ''
}

const handleParse = () => {
  const result = parseReelId(reelInput.value)
  if (!result.valid) {
    hasRecord.value = false
    Object.assign(form, createEmptyReelRecord())
    parseError.value = result.error
    uni.showToast({ title: result.error, icon: 'none' })
    return
  }
  applyRecord(result.record)

  if (isReelAlreadyInbound(result.record.rawCode)) {
    const cached = getInboundReelRecord(result.record.rawCode) || {}
    showDuplicateModal(cached)
    return
  }

  uni.showToast({ title: '识别成功，请核对', icon: 'success' })
}

const handleScan = () => {
  if (isScanning.value || isSubmitting.value) return
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
      reelInput.value = code
      handleParse()
    },
    fail: (err) => {
      const msg = err?.errMsg || ''
      if (/cancel|取消/i.test(msg)) return
      console.error('扫码失败:', err)
      uni.showModal({
        title: '扫码不可用',
        content: '请在微信小程序或 App 中扫码，或手动粘贴 Reel ID 后点「解析填入」。',
        showCancel: false
      })
    },
    complete: () => {
      isScanning.value = false
    }
  })
}

const handleReset = () => {
  reelInput.value = ''
  parseError.value = ''
  hasRecord.value = false
  Object.assign(form, createEmptyReelRecord())
}

const handleSubmit = async () => {
  if (!canSubmit.value || isSubmitting.value) return

  const qty = Number(form.quantityPcs)
  if (!qty || qty <= 0) {
    uni.showToast({ title: '请填写有效包装数量', icon: 'none' })
    return
  }

  const payload = buildInboundPayload(form)
  form.rawCode = payload.rawCode

  if (isReelAlreadyInbound(payload.rawCode)) {
    showDuplicateModal(getInboundReelRecord(payload.rawCode) || payload)
    return
  }

  isSubmitting.value = true
  try {
    // 提交前再查一次服务端，避免换机后本地无记忆导致重复提交
    const existed = await lookupMaterialInboundByRawCode(payload.rawCode)
    if (existed) {
      markReelAsInbound(payload.rawCode, {
        partNumber: existed.partNumber || existed.part_number || payload.partNumber,
        lotNumber: existed.lotNumber || existed.lot_number || payload.lotNumber,
        quantityPcs: existed.quantityPcs || existed.quantity_pcs || payload.quantityPcs,
        inboundAt: existed.inboundAt || existed.createdAt || existed.inbound_at
      })
      showDuplicateModal({
        partNumber: existed.partNumber || existed.part_number,
        lotNumber: existed.lotNumber || existed.lot_number,
        inboundAt: existed.inboundAt || existed.createdAt || existed.inbound_at
      })
      return
    }

    const res = await submitMaterialInbound(payload)
    const data = res?.data || res || {}
    markReelAsInbound(payload.rawCode, {
      partNumber: payload.partNumber,
      lotNumber: payload.lotNumber,
      quantityPcs: payload.quantityPcs,
      inboundAt: data.inboundAt || data.createdAt || new Date().toISOString()
    })
    uni.showToast({ title: '入库成功', icon: 'success' })
    setTimeout(() => {
      handleReset()
    }, 800)
  } catch (error) {
    console.error('物料入库失败:', error)
    const code = error?.code || ''
    const msg = error?.message || ''
    const isDup =
      code === 'REEL_ALREADY_INBOUND' ||
      /已入库|重复入库|重复扫描/.test(msg)
    if (isDup) {
      markReelAsInbound(payload.rawCode, {
        partNumber: payload.partNumber,
        lotNumber: payload.lotNumber,
        quantityPcs: payload.quantityPcs,
        inboundAt: error?.details?.inboundAt
      })
      showDuplicateModal({
        partNumber: payload.partNumber,
        lotNumber: payload.lotNumber,
        inboundAt: error?.details?.inboundAt
      })
      return
    }
    if (code === 'INVALID_PAYLOAD') {
      uni.showModal({
        title: '数据校验失败',
        content: msg || '请核对 Reel ID 各字段后重试',
        showCancel: false
      })
      return
    }
    if (msg) {
      uni.showToast({ title: msg, icon: 'none' })
    } else {
      uni.showToast({ title: '入库失败，请重试', icon: 'none' })
    }
  } finally {
    isSubmitting.value = false
  }
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
  margin-bottom: 8rpx;
  line-height: 1.5;
}

.format-hint {
  font-size: 22rpx;
  color: #9ca3af;
  display: block;
  margin-bottom: 20rpx;
  line-height: 1.4;
  word-break: break-all;
}

.form-item {
  margin-bottom: 24rpx;
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
  box-shadow: 0 8rpx 20rpx rgba(109, 40, 217, 0.28);
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
  font-size: 28rpx;
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
  font-size: 30rpx;
  line-height: 1.5;
  box-sizing: border-box;
  border: 2rpx solid #e9d5ff;
}

.form-placeholder {
  color: #9ca3af;
}

.raw-code {
  display: block;
  font-size: 24rpx;
  color: #6b7280;
  word-break: break-all;
  line-height: 1.5;
  padding: 16rpx 20rpx;
  background: #f9fafb;
  border-radius: 12rpx;
}

.scan-primary-btn {
  width: 100%;
  height: 96rpx;
  line-height: 96rpx;
  margin-bottom: 16rpx;
  background: linear-gradient(135deg, #059669 0%, #047857 100%);
  color: #fff;
  font-size: 32rpx;
  font-weight: 700;
  border-radius: 16rpx;
  border: none;
  box-shadow: 0 12rpx 28rpx rgba(5, 150, 105, 0.3);
}

.parse-btn {
  width: 100%;
  height: 88rpx;
  line-height: 88rpx;
  background: linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%);
  color: #fff;
  font-size: 30rpx;
  font-weight: 600;
  border-radius: 16rpx;
  border: none;
}

.scan-primary-btn[disabled],
.parse-btn[disabled],
.submit-btn[disabled],
.reset-btn[disabled] {
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

.match-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16rpx;
}

.match-badge {
  font-size: 24rpx;
  color: #059669;
  background: #d1fae5;
  padding: 6rpx 16rpx;
  border-radius: 8rpx;
  font-weight: 600;
}

.submit-btn {
  width: 100%;
  height: 96rpx;
  line-height: 96rpx;
  margin-bottom: 16rpx;
  background: linear-gradient(135deg, #059669 0%, #047857 100%);
  color: #fff;
  font-size: 32rpx;
  font-weight: 700;
  border-radius: 20rpx;
  border: none;
  box-shadow: 0 12rpx 28rpx rgba(5, 150, 105, 0.35);
}

.reset-btn {
  width: 100%;
  height: 88rpx;
  line-height: 88rpx;
  background: #fff;
  color: #6d28d9;
  font-size: 30rpx;
  font-weight: 700;
  border-radius: 20rpx;
  border: 2rpx solid #ddd6fe;
}
</style>
