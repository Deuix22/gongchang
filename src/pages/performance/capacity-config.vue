<template>
  <view class="config-container">
    <view class="nav-bar">
      <view class="nav-back" @tap="handleBack">
        <text class="nav-back-icon">←</text>
      </view>
      <view class="nav-title">产能基础数据维护</view>
      <view class="nav-placeholder"></view>
    </view>

    <scroll-view scroll-y class="scroll-area">
      <view class="section-card">
        <view class="section-header">
          <text class="section-title">产线维护</text>
          <text class="section-subtitle">用于产能提报中的线体选择</text>
        </view>
        <view class="form-row">
          <input
            class="form-input"
            v-model="newLine"
            placeholder="请输入产线名称，如 DIP1线"
            placeholder-class="form-placeholder"
            confirm-type="done"
            @confirm="handleAddLine"
          />
          <button class="add-btn" type="primary" size="mini" @tap="handleAddLine">新增</button>
        </view>
        <view v-if="lines.length" class="tag-list">
          <view v-for="(item, index) in lines" :key="item" class="tag-item">
            <text class="tag-text">{{ item }}</text>
            <text class="tag-remove" @tap="handleRemoveLine(index)">✕</text>
          </view>
        </view>
        <view v-else class="empty-tip">
          <text class="empty-text">当前暂无产线，保存后将写入默认 DIP1～DIP21 线体。</text>
        </view>
      </view>

      <view class="section-card">
        <view class="section-header">
          <text class="section-title">制程段维护</text>
          <text class="section-subtitle">用于产能提报中的制程段选择</text>
        </view>
        <view class="form-row">
          <input
            class="form-input"
            v-model="newProcess"
            placeholder="请输入制程段"
            placeholder-class="form-placeholder"
            confirm-type="done"
            @confirm="handleAddProcess"
          />
          <button class="add-btn" type="primary" size="mini" @tap="handleAddProcess">新增</button>
        </view>
        <view v-if="processes.length" class="tag-list">
          <view v-for="(item, index) in processes" :key="item + index" class="tag-item">
            <text class="tag-text">{{ item }}</text>
            <text class="tag-remove" @tap="handleRemoveProcess(index)">✕</text>
          </view>
        </view>
        <view v-else class="empty-tip">
          <text class="empty-text">当前暂无制程段，请根据实际工艺维护常用制程段。</text>
        </view>
      </view>

      <view class="section-card">
        <view class="section-header">
          <text class="section-title">机型维护</text>
          <text class="section-subtitle">各制程段参数按需填写，未涉及的制程段可留空</text>
        </view>
        <view class="form-row">
          <input
            class="form-input"
            v-model="newModel"
            placeholder="请输入机型"
            placeholder-class="form-placeholder"
            confirm-type="done"
            @confirm="handleAddModel"
          />
          <button class="add-btn" type="primary" size="mini" @tap="handleAddModel">新增</button>
        </view>
        <view v-if="models.length" class="model-config-list">
          <view v-for="(item, index) in models" :key="item + index" class="model-config-card">
            <view class="model-config-header">
              <text class="model-config-name">{{ item }}</text>
              <text class="tag-remove" @tap="handleRemoveModel(index)">删除</text>
            </view>
            <view v-if="processes.length" class="model-process-list">
              <view
                v-for="proc in processes"
                :key="item + proc"
                class="model-process-block"
              >
                <text class="model-process-title">{{ proc }}</text>
                <view class="model-config-row">
                  <text class="model-config-label">单台工时（/min）</text>
                  <input
                    class="model-config-input"
                    :value="String(modelConfigs[item]?.[proc]?.singleWorkHours ?? '')"
                    type="digit"
                    placeholder="选填，无此制程段可留空"
                    placeholder-class="form-placeholder"
                    @input="e => handleChangeModelConfig(item, proc, 'singleWorkHours', e.detail.value)"
                  />
                </view>
                <view class="model-config-row">
                  <text class="model-config-label">标准产能（PCS/H）</text>
                  <input
                    class="model-config-input"
                    :value="String(modelConfigs[item]?.[proc]?.standardCapacity ?? '')"
                    type="digit"
                    placeholder="选填，无此制程段可留空"
                    placeholder-class="form-placeholder"
                    @input="e => handleChangeModelConfig(item, proc, 'standardCapacity', e.detail.value)"
                  />
                </view>
                <view class="model-config-row">
                  <text class="model-config-label">标准人力</text>
                  <input
                    class="model-config-input"
                    :value="String(modelConfigs[item]?.[proc]?.standardManpower ?? '')"
                    type="digit"
                    placeholder="选填，无此制程段可留空"
                    placeholder-class="form-placeholder"
                    @input="e => handleChangeModelConfig(item, proc, 'standardManpower', e.detail.value)"
                  />
                </view>
              </view>
            </view>
            <view v-else class="empty-tip model-process-empty">
              <text class="empty-text">请先在上方维护制程段，再配置该机型的各制程段参数。</text>
            </view>
          </view>
        </view>
        <view v-else class="empty-tip">
          <text class="empty-text">当前暂无机型，请先新增机型；各制程段参数按需填写即可。</text>
        </view>
      </view>

      <view class="save-area">
        <button
          class="save-btn"
          type="primary"
          :loading="saving"
          :disabled="saving"
          @tap="handleSaveAll"
        >
          保存全部
        </button>
        <text class="save-hint">修改线体、制程段、机型或参数后，请点击保存</text>
      </view>
    </scroll-view>
  </view>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import {
  getCapacityMeta,
  saveCapacityMeta,
  migrateModelConfigByProcess,
  DEFAULT_CAPACITY_LINES,
  DEFAULT_CAPACITY_PROCESSES,
  DEFAULT_CAPACITY_MODELS
} from '@/utils/api/performance.js'
import { canManageCapacityBaseConfig } from '@/utils/capacityPermissions.js'
import defaultCapacityMeta from '@/data/capacity-meta-default.json'

const lines = ref([])
const processes = ref([])
const models = ref([])
const modelConfigs = ref({})

const newLine = ref('')
const newProcess = ref('')
const newModel = ref('')
const saving = ref(false)

const syncModelConfigsWithProcesses = () => {
  const next = {}
  models.value.forEach((model) => {
    next[model] = migrateModelConfigByProcess(modelConfigs.value[model], processes.value)
  })
  modelConfigs.value = next
}

const initEmptyModelConfig = () => {
  const cfg = {}
  processes.value.forEach((p) => {
    cfg[p] = {}
  })
  return cfg
}

const applyLocalDefaultMeta = () => {
  lines.value = [...(defaultCapacityMeta.lines || DEFAULT_CAPACITY_LINES)]
  processes.value = [...(defaultCapacityMeta.processes || DEFAULT_CAPACITY_PROCESSES)]
  models.value = [...(defaultCapacityMeta.models || DEFAULT_CAPACITY_MODELS)]
  modelConfigs.value =
    defaultCapacityMeta.modelConfigs && typeof defaultCapacityMeta.modelConfigs === 'object'
      ? { ...defaultCapacityMeta.modelConfigs }
      : {}
  syncModelConfigsWithProcesses()
}

const isMetaEmpty = (res) => {
  const hasLines = Array.isArray(res?.lines) && res.lines.length > 0
  const hasProcesses = Array.isArray(res?.processes) && res.processes.length > 0
  const hasModels = Array.isArray(res?.models) && res.models.length > 0
  const hasConfigs =
    res?.modelConfigs && typeof res.modelConfigs === 'object' && Object.keys(res.modelConfigs).length > 0
  return !hasLines && !hasProcesses && !hasModels && !hasConfigs
}

const loadConfig = async () => {
  try {
    const res = await getCapacityMeta()
    if (isMetaEmpty(res)) {
      applyLocalDefaultMeta()
      return
    }
    lines.value = Array.isArray(res.lines) ? res.lines : [...DEFAULT_CAPACITY_LINES]
    processes.value = Array.isArray(res.processes) ? res.processes : [...DEFAULT_CAPACITY_PROCESSES]
    models.value = Array.isArray(res.models) ? res.models : [...DEFAULT_CAPACITY_MODELS]
    modelConfigs.value =
      res && typeof res.modelConfigs === 'object' && res.modelConfigs != null
        ? { ...res.modelConfigs }
        : defaultCapacityMeta.modelConfigs && typeof defaultCapacityMeta.modelConfigs === 'object'
          ? { ...defaultCapacityMeta.modelConfigs }
          : {}
    syncModelConfigsWithProcesses()
  } catch (e) {
    applyLocalDefaultMeta()
  }
}

const saveConfig = async (showToast = true) => {
  if (saving.value) return false
  saving.value = true
  try {
    await saveCapacityMeta({
      lines: lines.value,
      processes: processes.value,
      models: models.value,
      modelConfigs: modelConfigs.value
    })
    if (showToast) {
      uni.showToast({ title: '已保存', icon: 'success' })
    }
    return true
  } catch (e) {
    return false
  } finally {
    saving.value = false
  }
}

const handleSaveAll = async () => {
  await saveConfig(true)
}

const normalizeText = (val) => (val || '').trim()

const handleAddLine = async () => {
  const value = normalizeText(newLine.value)
  if (!value) {
    uni.showToast({ title: '请输入产线名称', icon: 'none' })
    return
  }
  if (lines.value.includes(value)) {
    uni.showToast({ title: '该产线已存在', icon: 'none' })
    return
  }
  lines.value = [...lines.value, value]
  newLine.value = ''
}

const handleRemoveLine = async (index) => {
  const name = lines.value[index]
  if (!name) return
  uni.showModal({
    title: '确认删除',
    content: `确定删除线体「${name}」吗？`,
    success: async (res) => {
      if (!res.confirm) return
      lines.value.splice(index, 1)
      lines.value = [...lines.value]
    }
  })
}

const handleAddProcess = async () => {
  const value = normalizeText(newProcess.value)
  if (!value) {
    uni.showToast({ title: '请输入制程段', icon: 'none' })
    return
  }
  if (processes.value.includes(value)) {
    uni.showToast({ title: '该制程段已存在', icon: 'none' })
    return
  }
  processes.value = [...processes.value, value]
  newProcess.value = ''
  const nextConfigs = { ...modelConfigs.value }
  models.value.forEach((model) => {
    nextConfigs[model] = {
      ...(nextConfigs[model] || {}),
      [value]: nextConfigs[model]?.[value] || {}
    }
  })
  modelConfigs.value = nextConfigs
}

const handleRemoveProcess = async (index) => {
  const name = processes.value[index]
  if (!name) return
  uni.showModal({
    title: '确认删除',
    content: `确定删除制程段「${name}」吗？该机型的对应参数也将删除。`,
    success: async (res) => {
      if (!res.confirm) return
      processes.value.splice(index, 1)
      processes.value = [...processes.value]
      const nextConfigs = { ...modelConfigs.value }
      Object.keys(nextConfigs).forEach((model) => {
        const mc = { ...(nextConfigs[model] || {}) }
        delete mc[name]
        nextConfigs[model] = mc
      })
      modelConfigs.value = nextConfigs
    }
  })
}

const handleAddModel = async () => {
  const value = normalizeText(newModel.value)
  if (!value) {
    uni.showToast({ title: '请输入机型', icon: 'none' })
    return
  }
  if (models.value.includes(value)) {
    uni.showToast({ title: '该机型已存在', icon: 'none' })
    return
  }
  models.value = [...models.value, value]
  modelConfigs.value = {
    ...modelConfigs.value,
    [value]: initEmptyModelConfig()
  }
  newModel.value = ''
}

const handleRemoveModel = async (index) => {
  const name = models.value[index]
  if (!name) return
  uni.showModal({
    title: '确认删除',
    content: `确定删除机型「${name}」及其参数吗？`,
    success: async (res) => {
      if (!res.confirm) return
      models.value.splice(index, 1)
      models.value = [...models.value]
      const next = { ...modelConfigs.value }
      delete next[name]
      modelConfigs.value = next
    }
  })
}

const handleChangeModelConfig = (model, process, field, value) => {
  const v = (value || '').trim()
  const next = { ...modelConfigs.value }
  const modelCfg = { ...(next[model] || {}) }
  const procCfg = { ...(modelCfg[process] || {}) }
  if (!v) {
    delete procCfg[field]
  } else {
    const num = Number(v)
    if (Number.isNaN(num) || num < 0) {
      uni.showToast({ title: '请输入非负数字', icon: 'none' })
      return
    }
    procCfg[field] = num
  }
  if (Object.keys(procCfg).length === 0) {
    delete modelCfg[process]
  } else {
    modelCfg[process] = procCfg
  }
  if (Object.keys(modelCfg).length === 0) {
    delete next[model]
  } else {
    next[model] = modelCfg
  }
  modelConfigs.value = next
}

const handleBack = () => {
  const pages = getCurrentPages()
  if (pages.length > 1) {
    uni.navigateBack()
  } else {
    uni.redirectTo({
      url: '/pages/performance/capacity'
    })
  }
}

onMounted(async () => {
  if (!canManageCapacityBaseConfig()) {
    uni.showToast({ title: '无权限访问', icon: 'none' })
    setTimeout(() => {
      handleBack()
    }, 1200)
    return
  }
  await loadConfig()
})
</script>

<style lang="scss" scoped>
.config-container {
  min-height: 100vh;
  background: linear-gradient(180deg, #eff6ff 0%, #e0f2fe 40%, #bae6fd 100%);
  display: flex;
  flex-direction: column;
}

.nav-bar {
  height: 100rpx;
  padding: 40rpx 32rpx 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: #0f172a;
}

.nav-back {
  width: 80rpx;
  height: 80rpx;
  border-radius: 999rpx;
  background: rgba(15, 23, 42, 0.06);
  display: flex;
  align-items: center;
  justify-content: center;
}

.nav-back-icon {
  font-size: 40rpx;
}

.nav-title {
  font-size: 30rpx;
  font-weight: 600;
}

.nav-placeholder {
  width: 80rpx;
  height: 80rpx;
}

.scroll-area {
  flex: 1;
  padding: 24rpx 24rpx 40rpx;
  box-sizing: border-box;
}

.save-area {
  padding: 8rpx 0 24rpx;
}

.save-btn {
  width: 100%;
  height: 88rpx;
  line-height: 88rpx;
  border-radius: 999rpx;
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  color: #ffffff;
  font-size: 30rpx;
  font-weight: 600;
}

.save-btn::after {
  border: none;
}

.save-hint {
  display: block;
  margin-top: 12rpx;
  text-align: center;
  font-size: 22rpx;
  color: #6b7280;
}

.section-card {
  background: #ffffff;
  border-radius: 24rpx;
  padding: 24rpx 20rpx 20rpx;
  box-shadow: 0 10rpx 24rpx rgba(15, 23, 42, 0.06);
  margin-bottom: 20rpx;
}

.section-header {
  margin-bottom: 16rpx;
}

.section-title {
  font-size: 28rpx;
  font-weight: 600;
  color: #111827;
}

.section-subtitle {
  font-size: 22rpx;
  color: #6b7280;
  display: block;
  margin-top: 4rpx;
}

.form-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-bottom: 16rpx;
}

.form-input {
  flex: 1;
  padding: 16rpx 20rpx;
  border-radius: 16rpx;
  background: #f3f4f6;
  font-size: 26rpx;
}

.form-placeholder {
  color: #9ca3af;
}

.add-btn {
  padding: 0 24rpx;
  height: 72rpx;
  line-height: 72rpx;
  border-radius: 999rpx;
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  color: #ffffff;
  font-size: 24rpx;
}

.add-btn::after {
  border: none;
}

.tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
}

.tag-item {
  flex-direction: row;
  align-items: center;
  padding: 8rpx 16rpx;
  border-radius: 999rpx;
  background: #eff6ff;
  display: flex;
}

.tag-text {
  font-size: 24rpx;
  color: #1e40af;
}

.tag-remove {
  margin-left: 8rpx;
  padding: 4rpx 10rpx;
  font-size: 26rpx;
  color: #ef4444;
  font-weight: 600;
}

.empty-tip {
  padding: 8rpx 0 4rpx;
}

.empty-text {
  font-size: 22rpx;
  color: #9ca3af;
}

.model-config-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.model-config-card {
  padding: 16rpx;
  border-radius: 16rpx;
  background: #f9fafb;
  border: 1rpx solid #e5e7eb;
}

.model-config-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12rpx;
}

.model-config-name {
  font-size: 28rpx;
  font-weight: 600;
  color: #111827;
}

.model-config-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-top: 10rpx;
}

.model-config-label {
  flex: 0 0 220rpx;
  font-size: 24rpx;
  color: #374151;
}

.model-config-input {
  flex: 1;
  padding: 12rpx 16rpx;
  border-radius: 12rpx;
  background: #ffffff;
  font-size: 24rpx;
}

.model-process-list {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}

.model-process-block {
  padding: 12rpx;
  border-radius: 12rpx;
  background: #ffffff;
  border: 1rpx solid #e5e7eb;
}

.model-process-title {
  display: block;
  font-size: 24rpx;
  font-weight: 600;
  color: #2563eb;
  margin-bottom: 8rpx;
}

.model-process-empty {
  padding: 8rpx 0;
}
</style>
