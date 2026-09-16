<template>
  <view class="page-container">
    <view class="nav-bar">
      <view class="nav-back" hover-class="nav-back-hover" @tap="handleBack">
        <text class="nav-back-icon">‹</text>
        <text class="nav-back-text">返回</text>
      </view>
      <view class="nav-title">出货比对</view>
      <view class="nav-placeholder"></view>
    </view>

    <scroll-view scroll-y class="scroll-area">
      <!-- 箱单输入 / 扫码 -->
      <view class="section-card">
        <text class="section-title">箱单号 / 生产批号</text>
        <text class="section-desc">扫码后自动出货：本批首箱设置每箱数量，同批后续自动扣除；尾箱单独确认</text>
        <text class="format-hint">{{ boxNoHint }}</text>

        <view class="form-item input-row">
          <input
            v-model="boxNoInput"
            class="form-input flex-input"
            placeholder="如 HFSYHFYZBU2607055201H000001"
            placeholder-class="form-placeholder"
            confirm-type="search"
            @confirm="handleLookup"
          />
          <view
            class="scan-icon-btn"
            :class="{ disabled: isLookingUp || isScanning || isShipping }"
            @tap="handleScan"
          >
            <text class="scan-icon-text">扫码</text>
          </view>
        </view>

        <button
          class="scan-primary-btn"
          :disabled="isLookingUp || isScanning || isShipping"
          @tap="handleScan"
        >
          {{ isScanning ? '调起相机...' : (isShipping ? '出货中...' : '扫码比对') }}
        </button>

        <button
          class="lookup-btn"
          :disabled="isLookingUp || isScanning || isShipping"
          @tap="handleLookup"
        >
          {{ isLookingUp ? '查询中...' : '手动查询' }}
        </button>
      </view>

      <!-- 未匹配 -->
      <view v-if="lookupError" class="section-card error-card">
        <text class="error-title">比对未通过</text>
        <text class="error-msg">{{ lookupError }}</text>
      </view>

      <!-- 匹配成功 -->
      <view v-if="matchInfo" class="section-card">
        <view class="match-header">
          <text class="section-title">登记信息</text>
          <view class="match-badge">已登记</view>
        </view>

        <view class="info-grid">
          <view class="info-row">
            <text class="info-label">收货客户</text>
            <text class="info-value">{{ matchInfo.customerName || '—' }}</text>
          </view>
          <view class="info-row">
            <text class="info-label">发运日</text>
            <text class="info-value">{{ matchInfo.shippingDate || '—' }}</text>
          </view>
          <view class="info-row">
            <text class="info-label">销售型号</text>
            <text class="info-value">{{ matchInfo.salesModel || '—' }}</text>
          </view>
          <view class="info-row">
            <text class="info-label">生产批号</text>
            <text class="info-value highlight">{{ matchInfo.productionBatchNo || '—' }}</text>
          </view>
          <view v-if="parsedCode?.boxNo" class="info-row">
            <text class="info-label">当前箱单</text>
            <text class="info-value">{{ parsedCode.boxNo }}</text>
          </view>
          <view class="info-row">
            <text class="info-label">批次匹配码</text>
            <text class="info-value">{{ matchInfo.batchKey || parsedCode?.batchKey }}</text>
          </view>
        </view>
      </view>

      <!-- 余量 + 每箱设置 -->
      <view v-if="matchInfo" class="section-card quantity-card">
        <view class="quantity-header">
          <text class="section-title">批次出货余量</text>
          <text class="refresh-link" @tap="() => refreshRemaining(false)">刷新</text>
        </view>
        <view class="quantity-stats">
          <view class="stat-item">
            <text class="stat-num">{{ matchInfo.totalQuantityPcs }}</text>
            <text class="stat-label">登记总量</text>
          </view>
          <view class="stat-item">
            <text class="stat-num shipped">{{ matchInfo.shippedQuantityPcs }}</text>
            <text class="stat-label">已出货</text>
          </view>
          <view class="stat-item main">
            <text class="stat-num remaining">{{ matchInfo.remainingQuantityPcs }}</text>
            <text class="stat-label">剩余可出</text>
          </view>
        </view>

        <view class="per-box-bar">
          <view class="per-box-left">
            <text class="per-box-label">本批每箱数量</text>
            <text class="per-box-value">{{ rememberedPerBox > 0 ? rememberedPerBox : '未设置' }}</text>
          </view>
          <view class="per-box-actions">
            <text class="per-box-link" @tap="openEditPerBoxModal">{{ rememberedPerBox > 0 ? '修改' : '设置' }}</text>
            <text
              v-if="rememberedPerBox > 0"
              class="per-box-link danger"
              @tap="handleClearPerBox"
            >清除</text>
          </view>
        </view>
        <text class="quantity-hint">首箱扫码会询问每箱数量并记住；同批后续自动扣；余量不足一整箱时按尾箱确认</text>
      </view>

      <!-- 手动出货（兜底） -->
      <view v-if="matchInfo" class="section-card">
        <text class="section-title">手动出货（可选）</text>
        <text class="section-desc">扫码流程会自动扣数；如需改数量可在此手输后确认</text>
        <view class="form-item">
          <text class="form-label">出货数量</text>
          <input
            v-model="shipQuantity"
            class="form-input"
            type="number"
            placeholder="请输入本次出货数量"
            placeholder-class="form-placeholder"
          />
        </view>
        <button
          class="submit-btn"
          :disabled="isShipping || !canShip"
          @tap="handleConfirmShip"
        >
          {{ isShipping ? '提交中...' : '确认出货' }}
        </button>
      </view>
    </scroll-view>

    <!-- 设置每箱数量弹窗 -->
    <view v-if="modalVisible" class="modal-mask" @tap="closeModal">
      <view class="modal-card" @tap.stop>
        <text class="modal-title">{{ modalTitle }}</text>
        <text class="modal-desc">{{ modalDesc }}</text>
        <view class="form-item">
          <text class="form-label">{{ modalInputLabel }}</text>
          <input
            v-model="modalQty"
            class="form-input"
            type="number"
            focus
            :placeholder="modalPlaceholder"
            placeholder-class="form-placeholder"
          />
        </view>
        <view class="modal-actions">
          <button class="modal-btn cancel" @tap="closeModal">取消</button>
          <button class="modal-btn confirm" :disabled="isShipping" @tap="handleModalConfirm">
            {{ isShipping ? '提交中...' : modalConfirmText }}
          </button>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import {
  lookupScanCompare,
  confirmScanShipment
} from '@/utils/api/warehouse.js'
import {
  parseBoxOrBatchCode,
  formatBoxNoHint,
  getBatchPerBoxQty,
  setBatchPerBoxQty,
  clearBatchPerBoxQty,
  isBoxAlreadyShipped,
  markBoxAsShipped,
  getShippedBoxRecord
} from '@/utils/warehouse/boxCodeParser.js'

const boxNoInput = ref('')
const parsedCode = ref(null)
const matchInfo = ref(null)
const lookupError = ref('')
const shipQuantity = ref('')
const isLookingUp = ref(false)
const isShipping = ref(false)
const isScanning = ref(false)
const boxNoHint = formatBoxNoHint()
const rememberedPerBox = ref(0)

/** first | tail | edit */
const modalMode = ref('')
const modalVisible = ref(false)
const modalQty = ref('')

let refreshTimer = null

const modalTitle = computed(() => {
  if (modalMode.value === 'tail') return '尾箱确认'
  if (modalMode.value === 'edit') return '修改每箱数量'
  return '设置本批每箱数量'
})

const modalDesc = computed(() => {
  const rem = matchInfo.value?.remainingQuantityPcs ?? 0
  const per = rememberedPerBox.value
  if (modalMode.value === 'tail') {
    return `剩余可出 ${rem}，小于每箱 ${per}。若为本批最后一箱（尾箱），请确认并输入本箱实际数量。`
  }
  if (modalMode.value === 'edit') {
    return `当前每箱 ${per || '未设置'}。修改后仅影响后续扫码自动扣数，不会自动出货。`
  }
  return `本批首次扫箱。请输入每箱固定数量，后续同批扫码将自动按此数量出货（当前剩余 ${rem}）。`
})

const modalInputLabel = computed(() =>
  modalMode.value === 'tail' ? '本箱实际数量' : '每箱数量'
)

const modalPlaceholder = computed(() =>
  modalMode.value === 'tail' ? String(matchInfo.value?.remainingQuantityPcs || '') : '例如 10'
)

const modalConfirmText = computed(() =>
  modalMode.value === 'edit' ? '保存' : '确认并出货'
)

const normalizeLookupResult = (res) => {
  const data = res?.data || res
  if (!data) return null
  if (data.matched === false) return null
  return {
    batchKey: data.batchKey || '',
    productionBatchNo: data.productionBatchNo || '',
    customerName: data.customerName || '',
    shippingDate: data.shippingDate || '',
    customerOrderNo: data.customerOrderNo || '',
    salesModel: data.salesModel || '',
    productCode: data.productCode || '',
    deliveryNoteNo: data.deliveryNoteNo || '',
    totalQuantityPcs: Number(data.totalQuantityPcs) || 0,
    shippedQuantityPcs: Number(data.shippedQuantityPcs) || 0,
    remainingQuantityPcs: Number(data.remainingQuantityPcs) ?? Math.max(
      0,
      (Number(data.totalQuantityPcs) || 0) - (Number(data.shippedQuantityPcs) || 0)
    ),
    boxAlreadyShipped: !!(data.boxAlreadyShipped || data.boxShippedAt),
    boxShippedAt: data.boxShippedAt || data.shippedAt || '',
    boxShippedQuantityPcs: Number(data.boxShippedQuantityPcs || data.shippedBoxQuantityPcs) || 0
  }
}

const formatShippedAt = (value) => {
  if (!value) return ''
  return String(value).replace('T', ' ').replace('Z', '').slice(0, 19)
}

const showBoxAlreadyShipped = (boxNo, extra = {}) => {
  const record = getShippedBoxRecord(boxNo)
  const shippedAt = extra.shippedAt || extra.boxShippedAt || record?.shippedAt
  const qty = extra.quantityPcs || extra.boxShippedQuantityPcs || record?.quantityPcs
  const timeText = formatShippedAt(shippedAt)
  uni.showModal({
    title: '箱单已出货',
    content: timeText
      ? `该箱单已于 ${timeText} 出货${qty ? `（${qty} PCS）` : ''}，不能重复扫描扣数。`
      : '该箱单已经出过货，不能重复扫描扣数。',
    showCancel: false
  })
}

const canShip = computed(() => {
  if (!matchInfo.value) return false
  const qty = Number(shipQuantity.value)
  return qty > 0 && qty <= matchInfo.value.remainingQuantityPcs
})

const syncRememberedPerBox = (batchKey) => {
  rememberedPerBox.value = getBatchPerBoxQty(batchKey)
}

const clearMatchState = () => {
  matchInfo.value = null
  lookupError.value = ''
}

const stopAutoRefresh = () => {
  if (refreshTimer) {
    clearInterval(refreshTimer)
    refreshTimer = null
  }
}

const startAutoRefresh = () => {
  stopAutoRefresh()
  refreshTimer = setInterval(() => {
    if (matchInfo.value && parsedCode.value) {
      refreshRemaining(true)
    }
  }, 8000)
}

const closeModal = () => {
  if (isShipping.value) return
  modalVisible.value = false
  modalMode.value = ''
  modalQty.value = ''
}

const openFirstPerBoxModal = () => {
  modalMode.value = 'first'
  modalQty.value = ''
  modalVisible.value = true
}

const openTailModal = () => {
  modalMode.value = 'tail'
  modalQty.value = String(matchInfo.value?.remainingQuantityPcs || '')
  modalVisible.value = true
}

const openEditPerBoxModal = () => {
  if (!matchInfo.value?.batchKey) {
    uni.showToast({ title: '请先完成比对', icon: 'none' })
    return
  }
  modalMode.value = 'edit'
  modalQty.value = rememberedPerBox.value ? String(rememberedPerBox.value) : ''
  modalVisible.value = true
}

const handleClearPerBox = () => {
  const key = matchInfo.value?.batchKey
  if (!key) return
  uni.showModal({
    title: '清除每箱数量',
    content: '清除后，本批下次扫箱将重新询问每箱数量。',
    success: (res) => {
      if (!res.confirm) return
      clearBatchPerBoxQty(key)
      syncRememberedPerBox(key)
      uni.showToast({ title: '已清除', icon: 'success' })
    }
  })
}

const doShip = async (qty, { fromAuto = false } = {}) => {
  if (!matchInfo.value || !parsedCode.value) return false

  const quantityPcs = Number(qty)
  if (!quantityPcs || quantityPcs <= 0) {
    uni.showToast({ title: '请输入有效数量', icon: 'none' })
    return false
  }
  if (quantityPcs > matchInfo.value.remainingQuantityPcs) {
    uni.showToast({
      title: `超出剩余可出（${matchInfo.value.remainingQuantityPcs}）`,
      icon: 'none'
    })
    return false
  }

  const boxNo = parsedCode.value.boxNo || boxNoInput.value.trim()
  if (boxNo && (isBoxAlreadyShipped(boxNo) || matchInfo.value.boxAlreadyShipped)) {
    showBoxAlreadyShipped(boxNo, matchInfo.value)
    return false
  }

  isShipping.value = true
  try {
    await confirmScanShipment({
      boxNo: boxNo || undefined,
      batchKey: parsedCode.value.batchKey,
      productionBatchNo: matchInfo.value.productionBatchNo,
      quantityPcs
    })
    if (boxNo) {
      markBoxAsShipped(boxNo, {
        batchKey: parsedCode.value.batchKey,
        quantityPcs
      })
    }
    const left = matchInfo.value.remainingQuantityPcs - quantityPcs
    uni.showToast({
      title: left > 0 ? `已出货 ${quantityPcs}，剩余 ${left}` : `已出货 ${quantityPcs}，本批已清完`,
      icon: 'none',
      duration: 2200
    })
    shipQuantity.value = ''
    await refreshRemaining(true)
    return true
  } catch (error) {
    console.error('确认出货失败:', error)
    const code = error?.code || ''
    const msg = error?.message || ''
    const isDup =
      code === 'BOX_ALREADY_SHIPPED' ||
      /已出货|重复扫描|重复出货/.test(msg)
    if (isDup) {
      if (boxNo) {
        markBoxAsShipped(boxNo, {
          batchKey: parsedCode.value.batchKey,
          quantityPcs: error?.details?.quantityPcs,
          shippedAt: error?.details?.shippedAt
        })
      }
      showBoxAlreadyShipped(boxNo, error?.details || {})
      return false
    }
    const isNotFound =
      code === 'NOT_FOUND' ||
      (msg && String(msg).includes('404'))
    if (isNotFound) {
      uni.showModal({
        title: '出货接口未就绪',
        content: '请后端实现 POST /api/warehouse/scan-compare/ship',
        showCancel: false
      })
    } else if (msg) {
      uni.showToast({ title: msg, icon: 'none' })
    }
    return false
  } finally {
    isShipping.value = false
  }
}

/**
 * 箱单比对成功后的自动出货策略
 */
const runAutoShipFlow = async () => {
  if (!matchInfo.value || !parsedCode.value) return
  // 仅箱单扫码走自动；纯批号仍手输
  if (parsedCode.value.type !== 'box') return

  const boxNo = parsedCode.value.boxNo
  if (boxNo && (isBoxAlreadyShipped(boxNo) || matchInfo.value.boxAlreadyShipped)) {
    if (matchInfo.value.boxAlreadyShipped) {
      markBoxAsShipped(boxNo, {
        batchKey: matchInfo.value.batchKey,
        quantityPcs: matchInfo.value.boxShippedQuantityPcs,
        shippedAt: matchInfo.value.boxShippedAt
      })
    }
    showBoxAlreadyShipped(boxNo, matchInfo.value)
    return
  }

  const remaining = matchInfo.value.remainingQuantityPcs
  if (remaining <= 0) {
    uni.showToast({ title: '该批次已无剩余可出', icon: 'none' })
    return
  }

  const perBox = getBatchPerBoxQty(matchInfo.value.batchKey)
  syncRememberedPerBox(matchInfo.value.batchKey)

  if (!perBox) {
    openFirstPerBoxModal()
    return
  }

  if (remaining < perBox) {
    openTailModal()
    return
  }

  shipQuantity.value = String(perBox)
  await doShip(perBox, { fromAuto: true })
}

const handleModalConfirm = async () => {
  const qty = Number(modalQty.value)
  if (!qty || qty <= 0) {
    uni.showToast({ title: '请输入有效数量', icon: 'none' })
    return
  }

  const batchKey = matchInfo.value?.batchKey
  if (!batchKey) {
    uni.showToast({ title: '缺少批次信息', icon: 'none' })
    return
  }

  if (modalMode.value === 'edit') {
    setBatchPerBoxQty(batchKey, qty)
    syncRememberedPerBox(batchKey)
    closeModal()
    uni.showToast({ title: '已更新每箱数量', icon: 'success' })
    return
  }

  if (modalMode.value === 'first') {
    if (qty > matchInfo.value.remainingQuantityPcs) {
      uni.showToast({
        title: `不能超过剩余可出（${matchInfo.value.remainingQuantityPcs}）`,
        icon: 'none'
      })
      return
    }
    setBatchPerBoxQty(batchKey, qty)
    syncRememberedPerBox(batchKey)
    const ok = await doShip(qty, { fromAuto: true })
    if (ok) closeModal()
    return
  }

  if (modalMode.value === 'tail') {
    if (qty > matchInfo.value.remainingQuantityPcs) {
      uni.showToast({
        title: `不能超过剩余可出（${matchInfo.value.remainingQuantityPcs}）`,
        icon: 'none'
      })
      return
    }
    const ok = await doShip(qty, { fromAuto: true })
    if (ok) closeModal()
  }
}

const doLookup = async (silent = false, { triggerAutoShip = !silent } = {}) => {
  const parsed = parseBoxOrBatchCode(boxNoInput.value)
  if (!parsed.valid) {
    clearMatchState()
    lookupError.value = parsed.error
    parsedCode.value = null
    rememberedPerBox.value = 0
    stopAutoRefresh()
    if (!silent) {
      uni.showToast({ title: parsed.error, icon: 'none' })
    }
    return
  }

  parsedCode.value = parsed
  if (!silent) {
    isLookingUp.value = true
  }
  lookupError.value = ''

  try {
    const res = await lookupScanCompare({
      boxNo: parsed.boxNo || undefined,
      batchKey: parsed.batchKey,
      productionBatchNo: parsed.productionBatchNo || undefined
    })
    const info = normalizeLookupResult(res)
    if (!info) {
      clearMatchState()
      lookupError.value =
        res?.message || '该箱单对应批次未在送货单中登记，不允许出货'
      rememberedPerBox.value = 0
      stopAutoRefresh()
      if (!silent) {
        uni.showToast({ title: '未找到登记信息', icon: 'none' })
      }
      return
    }

    matchInfo.value = info
    lookupError.value = ''
    syncRememberedPerBox(info.batchKey)

    if (info.boxAlreadyShipped && parsed.boxNo) {
      markBoxAsShipped(parsed.boxNo, {
        batchKey: info.batchKey,
        quantityPcs: info.boxShippedQuantityPcs,
        shippedAt: info.boxShippedAt
      })
    }

    const perBox = getBatchPerBoxQty(info.batchKey)
    if (perBox && info.remainingQuantityPcs > 0 && !info.boxAlreadyShipped) {
      shipQuantity.value = String(Math.min(perBox, info.remainingQuantityPcs))
    }

    startAutoRefresh()

    if (triggerAutoShip) {
      await runAutoShipFlow()
    } else if (!silent && !info.boxAlreadyShipped) {
      uni.showToast({ title: '比对通过', icon: 'success' })
    }
  } catch (error) {
    console.error('出货比对查询失败:', error)
    clearMatchState()
    rememberedPerBox.value = 0
    const isNotFound =
      error?.code === 'NOT_FOUND' ||
      (error?.message && String(error.message).includes('404'))
    lookupError.value = isNotFound
      ? '查询接口未就绪，请后端实现 GET /api/warehouse/scan-compare/lookup'
      : (error.message || '查询失败，请重试')
    stopAutoRefresh()
    if (!silent && !isNotFound) {
      uni.showToast({ title: lookupError.value, icon: 'none' })
    }
  } finally {
    if (!silent) {
      isLookingUp.value = false
    }
  }
}

const handleLookup = () => doLookup(false, { triggerAutoShip: true })

const refreshRemaining = (silent = false) => doLookup(silent, { triggerAutoShip: false })

const handleScan = () => {
  if (isLookingUp.value || isScanning.value || isShipping.value) return

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
      boxNoInput.value = code
      shipQuantity.value = ''
      clearMatchState()
      doLookup(false, { triggerAutoShip: true })
    },
    fail: (err) => {
      const msg = err?.errMsg || ''
      if (/cancel|取消/i.test(msg)) return
      console.error('扫码失败:', err)
      uni.showModal({
        title: '扫码不可用',
        content:
          '当前环境无法调起扫码。请在微信小程序或 App 中使用，或手动输入箱单号后点「手动查询」。',
        showCancel: false
      })
    },
    complete: () => {
      isScanning.value = false
    }
  })
}

const handleConfirmShip = async () => {
  await doShip(shipQuantity.value, { fromAuto: false })
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

onUnmounted(() => {
  stopAutoRefresh()
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

.scan-primary-btn[disabled] {
  opacity: 0.65;
}

.lookup-btn {
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

.lookup-btn[disabled] {
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

.info-grid {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.info-row {
  display: flex;
  flex-direction: column;
  gap: 6rpx;
}

.info-label {
  font-size: 24rpx;
  color: #6b7280;
}

.info-value {
  font-size: 30rpx;
  color: #111827;
  word-break: break-all;
}

.info-value.highlight {
  color: #6d28d9;
  font-weight: 600;
}

.quantity-card {
  border: 2rpx solid #c4b5fd;
}

.quantity-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20rpx;
}

.refresh-link {
  font-size: 26rpx;
  color: #7c3aed;
  font-weight: 600;
}

.quantity-stats {
  display: flex;
  justify-content: space-between;
  gap: 12rpx;
  margin-bottom: 16rpx;
}

.stat-item {
  flex: 1;
  text-align: center;
  padding: 16rpx 8rpx;
  border-radius: 12rpx;
  background: #f5f3ff;
}

.stat-item.main {
  background: linear-gradient(135deg, #ede9fe 0%, #ddd6fe 100%);
}

.stat-num {
  display: block;
  font-size: 36rpx;
  font-weight: 700;
  color: #374151;
}

.stat-num.shipped {
  color: #6b7280;
}

.stat-num.remaining {
  color: #6d28d9;
  font-size: 44rpx;
}

.stat-label {
  font-size: 22rpx;
  color: #6b7280;
  margin-top: 6rpx;
  display: block;
}

.per-box-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16rpx;
  padding: 16rpx 18rpx;
  border-radius: 14rpx;
  background: #f5f3ff;
  margin-bottom: 12rpx;
}

.per-box-left {
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}

.per-box-label {
  font-size: 22rpx;
  color: #6b7280;
}

.per-box-value {
  font-size: 32rpx;
  font-weight: 700;
  color: #5b21b6;
}

.per-box-actions {
  display: flex;
  gap: 20rpx;
}

.per-box-link {
  font-size: 26rpx;
  font-weight: 700;
  color: #7c3aed;
}

.per-box-link.danger {
  color: #dc2626;
}

.quantity-hint {
  font-size: 22rpx;
  color: #9ca3af;
  text-align: center;
  display: block;
  line-height: 1.5;
}

.form-label {
  font-size: 30rpx;
  font-weight: 600;
  color: #374151;
  margin-bottom: 12rpx;
  display: block;
}

.submit-btn {
  width: 100%;
  height: 96rpx;
  line-height: 96rpx;
  background: linear-gradient(135deg, #059669 0%, #047857 100%);
  color: #fff;
  font-size: 32rpx;
  font-weight: 700;
  border-radius: 20rpx;
  border: none;
  box-shadow: 0 12rpx 28rpx rgba(5, 150, 105, 0.35);
}

.submit-btn[disabled] {
  opacity: 0.55;
}

.modal-mask {
  position: fixed;
  left: 0;
  right: 0;
  top: 0;
  bottom: 0;
  background: rgba(15, 23, 42, 0.45);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40rpx;
  box-sizing: border-box;
}

.modal-card {
  width: 100%;
  max-width: 640rpx;
  background: #fff;
  border-radius: 24rpx;
  padding: 36rpx 28rpx 28rpx;
  box-shadow: 0 20rpx 48rpx rgba(0, 0, 0, 0.18);
}

.modal-title {
  display: block;
  font-size: 34rpx;
  font-weight: 700;
  color: #5b21b6;
  margin-bottom: 12rpx;
}

.modal-desc {
  display: block;
  font-size: 26rpx;
  color: #6b7280;
  line-height: 1.55;
  margin-bottom: 24rpx;
}

.modal-actions {
  display: flex;
  gap: 16rpx;
  margin-top: 8rpx;
}

.modal-btn {
  flex: 1;
  height: 88rpx;
  line-height: 88rpx;
  border-radius: 16rpx;
  font-size: 30rpx;
  font-weight: 700;
  border: none;
}

.modal-btn.cancel {
  background: #f3f4f6;
  color: #4b5563;
}

.modal-btn.confirm {
  background: linear-gradient(135deg, #059669 0%, #047857 100%);
  color: #fff;
}

.modal-btn[disabled] {
  opacity: 0.65;
}
</style>
