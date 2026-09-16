<template>
  <view class="page-container">
    <view class="nav-bar">
      <view class="nav-back" hover-class="nav-back-hover" @tap="handleBack">
        <text class="nav-back-icon">‹</text>
        <text class="nav-back-text">返回</text>
      </view>
      <view class="nav-title">{{ pageTitle }}</view>
      <view class="nav-placeholder"></view>
    </view>

    <!-- 顶部模式切换 -->
    <view class="mode-tabs">
      <view
        class="mode-tab"
        :class="{ active: activeTab === 'create' }"
        @tap="switchTab('create')"
      >
        {{ editingId ? '编辑单据' : '新建录入' }}
      </view>
      <view
        class="mode-tab"
        :class="{ active: activeTab === 'manage' }"
        @tap="switchTab('manage')"
      >
        单据管理
      </view>
    </view>

    <scroll-view scroll-y class="scroll-area">
      <!-- ========== 单据管理 ========== -->
      <view v-if="activeTab === 'manage'" class="manage-panel">
        <view class="section-card">
          <text class="section-title">已录入送货单</text>
          <text class="section-desc">支持按客户、送货单号、发运日搜索；可修改或删除有变动的单据</text>

          <view class="form-item">
            <input
              v-model="listKeyword"
              class="form-input"
              placeholder="客户 / 送货单号关键词"
              placeholder-class="form-placeholder"
              confirm-type="search"
              @confirm="handleSearchList"
            />
          </view>
          <view class="form-item">
            <picker mode="date" :value="listShippingDate" @change="onListDateChange">
              <view class="picker-display">
                <text :class="{ placeholder: !listShippingDate }">
                  {{ listShippingDate || '按发运日筛选（可选）' }}
                </text>
                <text class="picker-arrow">›</text>
              </view>
            </picker>
          </view>
          <view class="list-actions">
            <button class="search-btn" :disabled="isLoadingList" @tap="handleSearchList">
              {{ isLoadingList ? '查询中...' : '查询' }}
            </button>
            <button class="reset-btn" :disabled="isLoadingList" @tap="handleResetList">重置</button>
          </view>
        </view>

        <view v-if="listError" class="section-card error-card">
          <text class="error-title">加载失败</text>
          <text class="error-msg">{{ listError }}</text>
        </view>

        <view v-else-if="!isLoadingList && noteList.length === 0" class="section-card empty-card">
          <text class="empty-text">暂无送货单，请先新建录入</text>
        </view>

        <view
          v-for="item in noteList"
          :key="item.id"
          class="section-card note-card"
        >
          <view class="note-header">
            <text class="note-customer">{{ item.customerName || '未填客户' }}</text>
            <text class="note-date">{{ item.shippingDate || '—' }}</text>
          </view>
          <view class="note-meta">
            <text class="meta-line">送货单号：{{ item.deliveryNoteNo || '—' }}</text>
            <text class="meta-line">明细 {{ item.itemCount }} 行 · 合计 {{ item.totalQuantityPcs }} PCS</text>
          </view>
          <view class="note-ops">
            <view class="op-btn edit" @tap="handleEditNote(item)">修改</view>
            <view class="op-btn delete" @tap="handleDeleteNote(item)">删除</view>
          </view>
        </view>
      </view>

      <!-- ========== 新建 / 编辑表单 ========== -->
      <view v-else class="form-panel">
        <view v-if="editingId" class="section-card edit-banner">
          <view class="edit-banner-main">
            <text class="edit-banner-title">正在修改已录入单据</text>
            <text class="edit-banner-id">ID：{{ editingId }}</text>
          </view>
          <view class="edit-banner-cancel" @tap="handleCancelEdit">取消编辑</view>
        </view>

        <!-- 图片识别 -->
        <view class="section-card">
          <text class="section-title">送货单识别</text>
          <text class="section-desc">拍摄或上传送货单，按单据上的字段名自动匹配并填入表单</text>
          <view class="field-tags">
            <text
              v-for="tag in recognizeFieldTags"
              :key="tag"
              class="field-tag"
            >{{ tag }}</text>
          </view>
          <view v-if="previewImage" class="preview-wrap">
            <image class="preview-image" :src="previewImage" mode="widthFix" />
          </view>
          <view class="ocr-actions">
            <button class="ocr-btn" :disabled="isRecognizing" @tap="handleChooseImage">
              {{ isRecognizing ? '识别中...' : (previewImage ? '重新选择图片' : '选择送货单图片') }}
            </button>
          </view>
        </view>

        <!-- 表头信息 -->
        <view class="section-card">
          <text class="section-title">基本信息</text>
          <view class="form-item">
            <text class="form-label">收货客户</text>
            <input
              v-model="header.customerName"
              class="form-input"
              placeholder="请输入收货客户"
              placeholder-class="form-placeholder"
            />
          </view>
          <view class="form-item">
            <text class="form-label">发运日</text>
            <picker mode="date" :value="header.shippingDate" @change="onShippingDateChange">
              <view class="picker-display">
                <text :class="{ placeholder: !header.shippingDate }">
                  {{ header.shippingDate || '请选择发运日' }}
                </text>
                <text class="picker-arrow">›</text>
              </view>
            </picker>
          </view>
        </view>

        <!-- 明细行 -->
        <view class="section-card">
          <view class="section-title-row">
            <text class="section-title">明细列表</text>
            <view class="add-line-btn" @tap="handleAddLine">+ 添加行</view>
          </view>

          <view
            v-for="(row, index) in lineItems"
            :key="row.id || `line-${index}`"
            class="line-card"
          >
            <view class="line-card-header">
              <text class="line-index">第 {{ index + 1 }} 行</text>
              <text
                v-if="lineItems.length > 1"
                class="line-remove"
                @tap="handleRemoveLine(index)"
              >删除</text>
            </view>

            <view class="form-item">
              <text class="form-label">客户订单号</text>
              <input v-model="row.customerOrderNo" class="form-input" placeholder="客户订单号" placeholder-class="form-placeholder" />
            </view>
            <view class="form-item">
              <text class="form-label">销售型号</text>
              <input v-model="row.salesModel" class="form-input" placeholder="销售型号" placeholder-class="form-placeholder" />
            </view>
            <view class="form-item">
              <text class="form-label">产品编码</text>
              <input v-model="row.productCode" class="form-input" placeholder="产品编码" placeholder-class="form-placeholder" />
            </view>
            <view class="form-item">
              <text class="form-label">数量</text>
              <input
                v-model="row.quantityPcs"
                class="form-input"
                type="number"
                placeholder="数量"
                placeholder-class="form-placeholder"
              />
            </view>
            <view class="form-item">
              <text class="form-label">生产批号</text>
              <input v-model="row.productionBatchNo" class="form-input" placeholder="GR-HFYZBU… 可带01H/02B后缀" placeholder-class="form-placeholder" />
            </view>
            <view class="form-item">
              <text class="form-label">送货单号</text>
              <input v-model="row.deliveryNoteNo" class="form-input" placeholder="送货单号" placeholder-class="form-placeholder" />
            </view>
          </view>
        </view>

        <view class="submit-wrap">
          <button class="submit-btn" :disabled="isSubmitting" @tap="handleSubmit">
            {{ submitButtonText }}
          </button>
          <button
            v-if="editingId"
            class="delete-btn"
            :disabled="isSubmitting || isDeleting"
            @tap="handleDeleteCurrent"
          >
            {{ isDeleting ? '删除中...' : '删除此单据' }}
          </button>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import {
  recognizeDeliveryNote,
  submitDeliveryNote,
  listDeliveryNotes,
  getDeliveryNoteDetail,
  updateDeliveryNote,
  deleteDeliveryNote
} from '@/utils/api/warehouse.js'
import {
  createEmptyHeader,
  createEmptyLineItem,
  normalizeRecognizeResult,
  normalizeDeliveryNoteList,
  normalizeDeliveryNoteDetail,
  buildSubmitPayload,
  RECOGNIZE_FIELD_DISPLAY
} from '@/utils/warehouse/deliveryNoteParser.js'

const recognizeFieldTags = RECOGNIZE_FIELD_DISPLAY

const activeTab = ref('create')
const editingId = ref('')
const header = reactive(createEmptyHeader())
const lineItems = ref([createEmptyLineItem()])
const previewImage = ref('')
const isRecognizing = ref(false)
const isSubmitting = ref(false)
const isDeleting = ref(false)

const noteList = ref([])
const listKeyword = ref('')
const listShippingDate = ref('')
const isLoadingList = ref(false)
const listError = ref('')

const pageTitle = computed(() => {
  if (activeTab.value === 'manage') return '单据管理'
  return editingId.value ? '修改送货单' : '录入送货单'
})

const submitButtonText = computed(() => {
  if (isSubmitting.value) {
    return editingId.value ? '保存中...' : '提交中...'
  }
  return editingId.value ? '保存修改' : '确认提交'
})

const resetForm = () => {
  editingId.value = ''
  header.customerName = ''
  header.shippingDate = ''
  lineItems.value = [createEmptyLineItem()]
  previewImage.value = ''
}

const applyFormData = ({ id = '', header: h, items, imageUrl = '' }) => {
  editingId.value = id || ''
  header.customerName = h?.customerName || ''
  header.shippingDate = h?.shippingDate || ''
  lineItems.value = items?.length
    ? items.map(item => ({ ...createEmptyLineItem(), ...item }))
    : [createEmptyLineItem()]
  previewImage.value = imageUrl || ''
}

const applyRecognizeResult = (result) => {
  try {
    const normalized = normalizeRecognizeResult(result)
    header.customerName = normalized.header.customerName || ''
    header.shippingDate = normalized.header.shippingDate || ''
    lineItems.value = normalized.items.length
      ? normalized.items.map(item => ({ ...createEmptyLineItem(), ...item }))
      : [createEmptyLineItem()]
  } catch (error) {
    console.error('识别结果解析异常:', error)
    uni.showModal({
      title: '识别结果解析失败',
      content: error?.message || '请尝试更清晰的截图，或手动填写后提交',
      showCancel: false
    })
  }
}

const isApiNotReady = (error) =>
  error?.code === 'NOT_FOUND' ||
  (error?.message && String(error.message).includes('404'))

const switchTab = (tab) => {
  if (tab === activeTab.value) return
  if (tab === 'create' && !editingId.value) {
    // keep form
  }
  activeTab.value = tab
  if (tab === 'manage') {
    loadNoteList()
  }
}

const onShippingDateChange = (e) => {
  header.shippingDate = e.detail.value
}

const onListDateChange = (e) => {
  listShippingDate.value = e.detail.value
}

const handleChooseImage = () => {
  uni.chooseImage({
    count: 1,
    // 优先原图：Excel 截图文字密，compressed 易导致 OCR 失败
    sizeType: ['original', 'compressed'],
    sourceType: ['album', 'camera'],
    success: async (res) => {
      const filePath = res.tempFilePaths[0]
      if (!filePath) return
      previewImage.value = filePath
      isRecognizing.value = true
      try {
        const result = await recognizeDeliveryNote(filePath)
        console.log('[delivery-note][recognize] raw response:', result)
        applyRecognizeResult(result)
        const filled = lineItems.value.filter(
          row => row.productCode || row.salesModel || row.customerOrderNo || Number(row.quantityPcs) > 0
        )
        if (!filled.length && !header.customerName) {
          const payload = result?.data || result?.result || result || {}
          const rawText = String(payload.rawText || payload.text || payload.ocrText || '')
          const hasRaw = rawText.trim().length > 0
          const itemCount = Array.isArray(payload.items) ? payload.items.length : 0
          uni.showModal({
            title: '未识别出有效字段',
            content: hasRaw
              ? `后端已返回文本（${rawText.length} 字），但未能解析成表单字段。请把识别原文发给开发排查，或手动填写。`
              : `后端未返回可用 OCR 文本（items=${itemCount}，无 rawText）。请后端检查 POST /api/warehouse/delivery-notes/recognize，结构化失败时至少返回 rawText。也可先手动填写提交。`,
            showCancel: false
          })
        } else {
          uni.showToast({
            title: filled.length ? `识别到 ${filled.length} 行，请核对` : '已识别表头，请核对明细',
            icon: 'none',
            duration: 2500
          })
        }
      } catch (error) {
        console.error('送货单识别失败:', error)
        uni.showModal({
          title: isApiNotReady(error) ? '识别服务未就绪' : '识别失败',
          content: isApiNotReady(error)
            ? '后端 OCR 接口尚未部署，请手动填写或联系管理员。'
            : (error.message || '请重试或手动填写'),
          showCancel: false
        })
      } finally {
        isRecognizing.value = false
      }
    }
  })
}

const handleAddLine = () => {
  lineItems.value.push(createEmptyLineItem())
}

const handleRemoveLine = (index) => {
  if (lineItems.value.length <= 1) return
  lineItems.value.splice(index, 1)
}

const validateForm = () => {
  if (!header.customerName.trim()) {
    uni.showToast({ title: '请填写收货客户', icon: 'none' })
    return false
  }
  if (!header.shippingDate.trim()) {
    uni.showToast({ title: '请选择发运日', icon: 'none' })
    return false
  }
  const hasValidLine = lineItems.value.some(
    row => row.productCode?.trim() || row.salesModel?.trim() || Number(row.quantityPcs) > 0
  )
  if (!hasValidLine) {
    uni.showToast({ title: '请至少填写一行有效明细', icon: 'none' })
    return false
  }
  return true
}

const handleSubmit = async () => {
  if (!validateForm()) return
  if (isSubmitting.value) return

  const payload = buildSubmitPayload({
    header,
    items: lineItems.value,
    imageUrl: previewImage.value && previewImage.value.startsWith('http')
      ? previewImage.value
      : ''
  })

  isSubmitting.value = true
  try {
    if (editingId.value) {
      await updateDeliveryNote(editingId.value, payload)
      uni.showToast({ title: '修改已保存', icon: 'success' })
      setTimeout(() => {
        resetForm()
        activeTab.value = 'manage'
        loadNoteList()
      }, 800)
    } else {
      await submitDeliveryNote(payload)
      uni.showToast({ title: '提交成功', icon: 'success' })
      setTimeout(() => {
        resetForm()
        activeTab.value = 'manage'
        loadNoteList()
      }, 800)
    }
  } catch (error) {
    console.error('保存送货单失败:', error)
    if (isApiNotReady(error)) {
      uni.showModal({
        title: editingId.value ? '更新接口未就绪' : '提交接口未就绪',
        content: editingId.value
          ? '请后端实现 PUT /api/warehouse/delivery-notes/:id'
          : '请后端实现 POST /api/warehouse/delivery-notes',
        showCancel: false
      })
    }
  } finally {
    isSubmitting.value = false
  }
}

const loadNoteList = async () => {
  isLoadingList.value = true
  listError.value = ''
  try {
    const res = await listDeliveryNotes({
      keyword: listKeyword.value.trim(),
      shippingDate: listShippingDate.value || undefined,
      page: 1,
      pageSize: 50
    })
    const normalized = normalizeDeliveryNoteList(res)
    noteList.value = normalized.list
  } catch (error) {
    console.error('加载送货单列表失败:', error)
    noteList.value = []
    listError.value = isApiNotReady(error)
      ? '列表接口未就绪，请后端实现 GET /api/warehouse/delivery-notes'
      : (error.message || '加载失败，请重试')
  } finally {
    isLoadingList.value = false
  }
}

const handleSearchList = () => {
  loadNoteList()
}

const handleResetList = () => {
  listKeyword.value = ''
  listShippingDate.value = ''
  loadNoteList()
}

const handleEditNote = async (item) => {
  if (!item?.id) {
    uni.showToast({ title: '单据 ID 无效', icon: 'none' })
    return
  }
  try {
    const res = await getDeliveryNoteDetail(item.id)
    const detail = normalizeDeliveryNoteDetail(res)
    if (!detail.id) {
      uni.showToast({ title: '未获取到单据详情', icon: 'none' })
      return
    }
    applyFormData(detail)
    activeTab.value = 'create'
    uni.showToast({ title: '已载入，可修改', icon: 'success' })
  } catch (error) {
    console.error('加载送货单详情失败:', error)
    if (isApiNotReady(error)) {
      uni.showModal({
        title: '详情接口未就绪',
        content: '请后端实现 GET /api/warehouse/delivery-notes/:id',
        showCancel: false
      })
    }
  }
}

const confirmAndDelete = (id, onSuccess) => {
  if (!id) return
  uni.showModal({
    title: '确认删除',
    content: '删除后不可恢复，且会影响出货余量统计。确定删除该送货单吗？',
    confirmText: '删除',
    confirmColor: '#dc2626',
    success: async (res) => {
      if (!res.confirm) return
      isDeleting.value = true
      try {
        await deleteDeliveryNote(id)
        uni.showToast({ title: '已删除', icon: 'success' })
        onSuccess && onSuccess()
      } catch (error) {
        console.error('删除送货单失败:', error)
        if (isApiNotReady(error)) {
          uni.showModal({
            title: '删除接口未就绪',
            content: '请后端实现 DELETE /api/warehouse/delivery-notes/:id',
            showCancel: false
          })
        }
      } finally {
        isDeleting.value = false
      }
    }
  })
}

const handleDeleteNote = (item) => {
  confirmAndDelete(item.id, () => {
    if (editingId.value === item.id) {
      resetForm()
    }
    loadNoteList()
  })
}

const handleDeleteCurrent = () => {
  confirmAndDelete(editingId.value, () => {
    resetForm()
    activeTab.value = 'manage'
    loadNoteList()
  })
}

const handleCancelEdit = () => {
  resetForm()
  activeTab.value = 'manage'
  loadNoteList()
}

const handleBack = () => {
  const pages = getCurrentPages()
  if (pages.length > 1) {
    uni.navigateBack()
  } else {
    uni.redirectTo({
      url: '/pages/warehouse/index'
    })
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

.mode-tabs {
  display: flex;
  gap: 16rpx;
  padding: 20rpx 24rpx 0;
}

.mode-tab {
  flex: 1;
  height: 76rpx;
  border-radius: 16rpx;
  background: rgba(255, 255, 255, 0.72);
  color: #6d28d9;
  font-size: 28rpx;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2rpx solid #ddd6fe;
}

.mode-tab.active {
  background: linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%);
  color: #ffffff;
  border-color: transparent;
  box-shadow: 0 8rpx 18rpx rgba(109, 40, 217, 0.28);
}

.scroll-area {
  flex: 1;
  height: 0;
  padding: 24rpx 24rpx 48rpx;
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
  margin-bottom: 16rpx;
  line-height: 1.5;
}

.field-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
  margin-bottom: 20rpx;
}

.field-tag {
  font-size: 22rpx;
  color: #6d28d9;
  background: #ede9fe;
  padding: 8rpx 16rpx;
  border-radius: 8rpx;
}

.section-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16rpx;
}

.add-line-btn {
  font-size: 26rpx;
  color: #ffffff;
  font-weight: 600;
  padding: 10rpx 22rpx;
  background: linear-gradient(135deg, #a855f7 0%, #7c3aed 100%);
  border-radius: 999rpx;
  box-shadow: 0 6rpx 14rpx rgba(124, 58, 237, 0.28);
}

.preview-wrap {
  margin-bottom: 20rpx;
  border-radius: 16rpx;
  overflow: hidden;
  border: 2rpx solid #e9d5ff;
}

.preview-image {
  width: 100%;
  display: block;
}

.ocr-actions {
  display: flex;
  justify-content: center;
}

.ocr-btn {
  width: 100%;
  height: 88rpx;
  line-height: 88rpx;
  background: linear-gradient(135deg, #a855f7 0%, #7c3aed 100%);
  color: #fff;
  font-size: 28rpx;
  font-weight: 600;
  border-radius: 16rpx;
  border: none;
}

.ocr-btn[disabled] {
  opacity: 0.65;
}

.form-item {
  margin-bottom: 28rpx;
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

.picker-display {
  min-height: 96rpx;
  padding: 24rpx 28rpx;
  border-radius: 16rpx;
  background: #f5f3ff;
  font-size: 32rpx;
  border: 2rpx solid #e9d5ff;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.picker-display .placeholder {
  color: #9ca3af;
}

.picker-arrow {
  color: #9ca3af;
  font-size: 32rpx;
}

.line-card {
  border: 2rpx solid #ede9fe;
  border-radius: 20rpx;
  padding: 24rpx 20rpx;
  margin-bottom: 28rpx;
  background: #faf5ff;
}

.line-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12rpx;
}

.line-index {
  font-size: 26rpx;
  font-weight: 700;
  color: #6d28d9;
}

.line-remove {
  font-size: 24rpx;
  color: #ef4444;
}

.submit-wrap {
  padding: 8rpx 0 32rpx;
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.submit-btn {
  width: 100%;
  height: 96rpx;
  line-height: 96rpx;
  background: linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%);
  color: #fff;
  font-size: 32rpx;
  font-weight: 700;
  border-radius: 20rpx;
  border: none;
  box-shadow: 0 12rpx 28rpx rgba(109, 40, 217, 0.35);
}

.submit-btn[disabled] {
  opacity: 0.65;
}

.delete-btn {
  width: 100%;
  height: 88rpx;
  line-height: 88rpx;
  background: #fff;
  color: #dc2626;
  font-size: 30rpx;
  font-weight: 700;
  border-radius: 20rpx;
  border: 2rpx solid #fecaca;
}

.delete-btn[disabled] {
  opacity: 0.65;
}

.list-actions {
  display: flex;
  gap: 16rpx;
}

.search-btn,
.reset-btn {
  flex: 1;
  height: 84rpx;
  line-height: 84rpx;
  border-radius: 16rpx;
  font-size: 28rpx;
  font-weight: 600;
  border: none;
}

.search-btn {
  background: linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%);
  color: #fff;
}

.reset-btn {
  background: #f5f3ff;
  color: #6d28d9;
  border: 2rpx solid #ddd6fe;
}

.search-btn[disabled],
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

.empty-card {
  text-align: center;
  padding: 48rpx 20rpx;
}

.empty-text {
  font-size: 28rpx;
  color: #9ca3af;
}

.note-card {
  padding-bottom: 20rpx;
}

.note-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16rpx;
  margin-bottom: 12rpx;
}

.note-customer {
  flex: 1;
  font-size: 30rpx;
  font-weight: 700;
  color: #111827;
  word-break: break-all;
}

.note-date {
  font-size: 24rpx;
  color: #6d28d9;
  background: #ede9fe;
  padding: 6rpx 14rpx;
  border-radius: 999rpx;
  flex-shrink: 0;
}

.note-meta {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
  margin-bottom: 20rpx;
}

.meta-line {
  font-size: 26rpx;
  color: #6b7280;
  word-break: break-all;
}

.note-ops {
  display: flex;
  gap: 16rpx;
}

.op-btn {
  flex: 1;
  height: 72rpx;
  border-radius: 14rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28rpx;
  font-weight: 700;
}

.op-btn.edit {
  background: linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%);
  color: #fff;
}

.op-btn.delete {
  background: #fef2f2;
  color: #dc2626;
  border: 2rpx solid #fecaca;
}

.edit-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16rpx;
  background: linear-gradient(135deg, #ede9fe 0%, #ddd6fe 100%);
  border-color: #c4b5fd;
}

.edit-banner-main {
  flex: 1;
  min-width: 0;
}

.edit-banner-title {
  display: block;
  font-size: 28rpx;
  font-weight: 700;
  color: #5b21b6;
  margin-bottom: 6rpx;
}

.edit-banner-id {
  display: block;
  font-size: 22rpx;
  color: #6b7280;
  word-break: break-all;
}

.edit-banner-cancel {
  flex-shrink: 0;
  font-size: 26rpx;
  font-weight: 700;
  color: #6d28d9;
  padding: 12rpx 18rpx;
  background: #fff;
  border-radius: 999rpx;
}
</style>
