<template>
  <view class="abnormal-container">
    <!-- 自定义导航栏 -->
    <view class="nav-bar">
      <view class="nav-back" @tap="handleBack">
        <text class="nav-back-icon">←</text>
      </view>
      <view class="nav-title">异常工时流程</view>
      <view class="nav-placeholder" />
    </view>

    <!-- 组长首次进入：选择身份（工程 / 品质 / 生产） -->
    <view v-if="showIdentitySelect" class="identity-select-mask">
      <view class="identity-select-card">
        <text class="identity-select-title">请选择您的身份</text>
        <text class="identity-select-desc">组长首次进入需选择身份，选择后将只显示对应界面</text>
        <view class="identity-options">
          <view class="identity-option" @tap="chooseIdentity('production')">
            <text class="identity-option-label">生产</text>
            <text class="identity-option-desc">生产异常工时录入</text>
          </view>
          <view class="identity-option" @tap="chooseIdentity('engineering')">
            <text class="identity-option-label">工程</text>
            <text class="identity-option-desc">工程处理异常、填写原因</text>
          </view>
          <view class="identity-option" @tap="chooseIdentity('quality')">
            <text class="identity-option-label">品质</text>
            <text class="identity-option-desc">品质审批异常</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 角色切换：生产 / 工程 / 品质（仅管理员和 admin 显示） -->
    <view v-if="showTabBar" class="tab-bar">
      <view
        class="tab-item"
        :class="{ active: activeTab === 'production' }"
        @tap="activeTab = 'production'"
      >
        生产
      </view>
      <view
        class="tab-item"
        :class="{ active: activeTab === 'engineering' }"
        @tap="activeTab = 'engineering'"
      >
        工程
      </view>
      <view
        class="tab-item"
        :class="{ active: activeTab === 'quality' }"
        @tap="activeTab = 'quality'"
      >
        品质
      </view>
    </view>

    <scroll-view scroll-y class="scroll-area">
      <!-- 生产界面：录入异常 -->
      <view v-if="activeTab === 'production'" class="section-card">
        <view class="section-title-row">
          <text class="section-title">生产异常工时录入</text>
          <text class="section-subtitle">异常工时单独一列，可新增多条异常记录</text>
        </view>

        <!-- 表单 -->
        <view class="form-item">
          <text class="form-label">异常名称</text>
          <input
            class="form-input"
            v-model="productionForm.name"
            placeholder="例如：异常1 / 异常2 / 异常3（可自定义）"
            placeholder-class="form-placeholder"
          />
        </view>

        <view class="form-row">
          <view class="form-item half">
            <text class="form-label">涉及人数</text>
            <input
              class="form-input"
              v-model="productionForm.people"
              type="number"
              placeholder="请输入人数"
              placeholder-class="form-placeholder"
            />
          </view>
          <view class="form-item half">
            <text class="form-label">涉及时间（小时）</text>
            <input
              class="form-input"
              v-model="productionForm.hours"
              type="digit"
              placeholder="例如：1.5"
              placeholder-class="form-placeholder"
            />
          </view>
        </view>

        <view class="form-item">
          <text class="form-label">涉及总工时（自动计算，可修改）</text>
          <input
            class="form-input"
            v-model="productionForm.totalHours"
            type="digit"
            :placeholder="autoTotalHoursPlaceholder"
            placeholder-class="form-placeholder"
          />
        </view>

        <view class="form-item">
          <text class="form-label">备注说明（可选）</text>
          <textarea
            class="form-textarea"
            v-model="productionForm.remark"
            placeholder="可填写异常位置、设备、班组等信息"
            placeholder-class="form-placeholder"
            auto-height
          />
        </view>

        <view class="btn-row">
          <button class="btn secondary-btn" @tap="handleResetProduction">
            重置
          </button>
          <button class="btn primary-btn" @tap="handleAddAbnormal">
            添加异常
          </button>
        </view>

        <!-- 列表：生产已提交的异常 -->
        <view class="list-header">
          <text class="list-title">已提交异常（生产）</text>
        </view>
        <view v-if="productionList.length === 0" class="empty-tip">
          <text class="empty-text">暂无生产异常记录，请先添加。</text>
        </view>
        <view v-else class="abnormal-list">
          <view
            v-for="item in productionList"
            :key="item.abnormalId || item.id"
            class="abnormal-item"
          >
            <view class="item-header">
              <text class="item-name">{{ item.name }}</text>
              <text class="item-tag source-tag">生产提交</text>
            </view>
            <view class="item-meta">
              <text>涉及人数：{{ item.people }} 人</text>
              <text>涉及时间：{{ item.hours }} 小时</text>
              <text>涉及总工时：{{ item.totalHours }} 小时</text>
            </view>
            <view v-if="item.remark" class="item-remark">
              备注：{{ item.remark }}
            </view>
          </view>
        </view>
      </view>

      <!-- 工程界面：查看生产异常并填写原因 -->
      <view v-else-if="activeTab === 'engineering'" class="section-card">
        <view class="section-title-row">
          <text class="section-title">工程处理异常</text>
          <text class="section-subtitle">可以看见生产提交的异常，并填写工程原因</text>
        </view>

        <view v-if="allList.length === 0" class="empty-tip">
          <text class="empty-text">暂无生产提交的异常。</text>
        </view>

        <view v-else class="abnormal-list">
          <view
            v-for="item in allList"
            :key="item.abnormalId || item.id"
            class="abnormal-item"
          >
            <view class="item-header">
              <text class="item-name">{{ item.name }}</text>
              <view class="item-tags">
                <text class="item-tag source-tag">{{ item.source }}提交</text>
                <text class="item-tag step-tag">
                  {{ item.engineeringReason ? '已填写原因' : '待填写原因' }}
                </text>
              </view>
            </view>
            <view class="item-meta">
              <text>涉及人数：{{ item.people }} 人</text>
              <text>涉及时间：{{ item.hours }} 小时</text>
              <text>涉及总工时：{{ item.totalHours }} 小时</text>
            </view>
            <view class="form-item">
              <text class="form-label small">工程原因</text>
              <textarea
                class="form-textarea"
                v-model="item.engineeringReason"
                placeholder="请简要说明工程视角的原因、影响范围、处理措施等"
                placeholder-class="form-placeholder"
                auto-height
              />
            </view>
          </view>
        </view>

        <view v-if="allList.length" class="btn-row">
          <button class="btn primary-btn" @tap="handleSaveEngineering">
            保存工程原因
          </button>
        </view>
      </view>

      <!-- 品质界面：查看所有异常并审批 -->
      <view v-else class="section-card">
        <view class="section-title-row">
          <text class="section-title">品质审批异常</text>
          <text class="section-subtitle">
            可查看生产和工程提交的异常，并进行审批（是否通过）
          </text>
        </view>

        <view v-if="allList.length === 0" class="empty-tip">
          <text class="empty-text">暂无待审批的异常记录。</text>
        </view>

        <view v-else class="abnormal-list">
          <view
            v-for="item in allList"
            :key="item.abnormalId || item.id"
            class="abnormal-item"
          >
            <view class="item-header">
              <text class="item-name">{{ item.name }}</text>
              <view class="item-tags">
                <text class="item-tag source-tag">{{ item.source }}提交</text>
                <text
                  class="item-tag status-tag"
                  :class="{
                    pending: item.qualityStatus === 'pending',
                    approved: item.qualityStatus === 'approved',
                    rejected: item.qualityStatus === 'rejected'
                  }"
                >
                  {{
                    item.qualityStatus === 'approved'
                      ? '已通过'
                      : item.qualityStatus === 'rejected'
                        ? '已驳回'
                        : '待审批'
                  }}
                </text>
              </view>
            </view>
            <view class="item-meta">
              <text>涉及人数：{{ item.people }} 人</text>
              <text>涉及时间：{{ item.hours }} 小时</text>
              <text>涉及总工时：{{ item.totalHours }} 小时</text>
            </view>
            <view v-if="item.engineeringReason" class="item-remark">
              工程原因：{{ item.engineeringReason }}
            </view>
            <view class="form-item">
              <text class="form-label small">品质意见</text>
              <textarea
                class="form-textarea"
                v-model="item.qualityComment"
                placeholder="请填写品质审核意见"
                placeholder-class="form-placeholder"
                auto-height
              />
            </view>
            <view class="approve-row">
              <button
                class="approve-btn pass"
                @tap="() => handleApprove(item, 'approved')"
              >
                通过
              </button>
              <button
                class="approve-btn reject"
                @tap="() => handleApprove(item, 'rejected')"
              >
                驳回
              </button>
            </view>
          </view>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<script setup>
import { computed, reactive, ref, onMounted, watch } from 'vue'
import { getCurrentUser } from '@/utils/api/user.js'
import {
  postAbnormal,
  getAbnormalList,
  putAbnormalEngineering,
  putAbnormalQuality
} from '@/utils/api/performance.js'

const STORAGE_KEY_IDENTITY = 'abnormal_leader_identity'

// 用户角色与身份
const userRole = ref('')
const showIdentitySelect = ref(false) // 组长首次进入未选身份时显示
const showTabBar = computed(() => {
  const r = userRole.value
  return r === 'admin' || r === 'manager' || r === '管理员'
})

// 当前选中的角色视图（管理员/admin 可切换；组长固定为已选身份）
const activeTab = ref('production') // production / engineering / quality

// 生产录入表单
const productionForm = reactive({
  name: '异常1',
  people: '',
  hours: '',
  totalHours: '',
  remark: ''
})

// 当前 Tab 的异常列表（由接口拉取）
const abnormalList = ref([])
const abnormalListLoading = ref(false)

const productionList = computed(() =>
  abnormalList.value.filter((item) => item.source === '生产')
)

const allList = computed(() => abnormalList.value)

/** 按当前 Tab 拉取列表：生产/工程用 source=生产，品质用 qualityStatus=pending */
const fetchAbnormalList = async () => {
  abnormalListLoading.value = true
  try {
    const tab = activeTab.value
    const params =
      tab === 'quality'
        ? { qualityStatus: 'pending' }
        : { source: '生产' }
    const res = await getAbnormalList(params)
    abnormalList.value = (res.list || []).map((it) => ({
      ...it,
      id: it.abnormalId || it.id,
      engineeringReason: it.engineeringReason ?? '',
      qualityStatus: it.qualityStatus ?? 'pending',
      qualityComment: it.qualityComment ?? ''
    }))
  } finally {
    abnormalListLoading.value = false
  }
}

const autoTotalHoursPlaceholder = computed(() => {
  const people = Number(productionForm.people || 0)
  const hours = Number(productionForm.hours || 0)
  if (!people || !hours) return '请输入人数和时间，系统可自动帮你计算'
  const total = (people * hours).toFixed(2)
  return `自动计算：约 ${total} 工时，可手动修改`
})

const handleResetProduction = () => {
  productionForm.name = '异常1'
  productionForm.people = ''
  productionForm.hours = ''
  productionForm.totalHours = ''
  productionForm.remark = ''
}

const handleAddAbnormal = async () => {
  if (!productionForm.name.trim()) {
    uni.showToast({
      title: '请填写异常名称',
      icon: 'none'
    })
    return
  }
  if (!productionForm.people || Number(productionForm.people) <= 0) {
    uni.showToast({
      title: '请填写正确的涉及人数',
      icon: 'none'
    })
    return
  }
  if (!productionForm.hours || Number(productionForm.hours) <= 0) {
    uni.showToast({
      title: '请填写正确的涉及时间',
      icon: 'none'
    })
    return
  }

  const people = Number(productionForm.people)
  const hours = Number(productionForm.hours)
  let total = productionForm.totalHours
  if (!total) {
    total = (people * hours).toFixed(2)
  }

  try {
    await postAbnormal({
      name: productionForm.name.trim(),
      people,
      hours,
      totalHours: Number(total),
      remark: productionForm.remark.trim()
    })
    uni.showToast({
      title: '已添加异常',
      icon: 'success'
    })
    handleResetProduction()
    await fetchAbnormalList()
  } catch (e) {
    // 错误已由 request 层 showError 提示
  }
}

const handleSaveEngineering = async () => {
  const items = abnormalList.value.filter((it) => it.abnormalId || it.id)
  if (items.length === 0) {
    uni.showToast({ title: '暂无可保存的记录', icon: 'none' })
    return
  }
  try {
    await Promise.all(
      items.map((it) =>
        putAbnormalEngineering(it.abnormalId || it.id, {
          engineeringReason: it.engineeringReason ?? ''
        })
      )
    )
    uni.showToast({
      title: '工程原因已保存',
      icon: 'success'
    })
    await fetchAbnormalList()
  } catch (e) {
    // 错误已由 request 层 showError 提示
  }
}

const handleApprove = async (item, status) => {
  const id = item.abnormalId || item.id
  if (!id) return
  try {
    await putAbnormalQuality(id, {
      status,
      comment: item.qualityComment ?? ''
    })
    const text = status === 'approved' ? '已通过' : '已驳回'
    uni.showToast({
      title: `审批${text}`,
      icon: 'success'
    })
    await fetchAbnormalList()
  } catch (e) {
    // 错误已由 request 层 showError 提示
  }
}

// 组长选择身份后保存并进入对应界面
const chooseIdentity = async (identity) => {
  uni.setStorageSync(STORAGE_KEY_IDENTITY, identity)
  activeTab.value = identity
  showIdentitySelect.value = false
  uni.showToast({
    title: identity === 'production' ? '已选择：生产' : identity === 'engineering' ? '已选择：工程' : '已选择：品质',
    icon: 'success'
  })
  await fetchAbnormalList()
}

const initRoleAndIdentity = async () => {
  let role = uni.getStorageSync('userRole') || ''
  try {
    const currentUser = await getCurrentUser()
    if (currentUser?.role) {
      role = currentUser.role
      uni.setStorageSync('userRole', role)
    }
  } catch (e) {
    console.warn('获取用户角色失败:', e)
  }
  userRole.value = role

  const isAdminOrManager = role === 'admin' || role === 'manager' || role === '管理员'
  if (isAdminOrManager) {
    showIdentitySelect.value = false
    return
  }

  // 组长：检查是否已选身份
  const savedIdentity = uni.getStorageSync(STORAGE_KEY_IDENTITY)
  if (savedIdentity === 'production' || savedIdentity === 'engineering' || savedIdentity === 'quality') {
    activeTab.value = savedIdentity
    showIdentitySelect.value = false
  } else {
    showIdentitySelect.value = true
  }
}

const handleBack = () => {
  const pages = getCurrentPages && getCurrentPages()
  const canGoBack = Array.isArray(pages) && pages.length > 1

  if (canGoBack) {
    uni.navigateBack()
  } else {
    uni.redirectTo({
      url: '/pages/performance/index',
      fail: () => {
        uni.reLaunch({
          url: '/pages/performance/index'
        })
      }
    })
  }
}

watch(activeTab, () => {
  if (!showIdentitySelect.value) fetchAbnormalList()
})

onMounted(async () => {
  const token = uni.getStorageSync('token')
  if (!token) {
    uni.redirectTo({ url: '/pages/login/login' })
    return
  }
  await initRoleAndIdentity()
  if (!showIdentitySelect.value) await fetchAbnormalList()
})
</script>

<style lang="scss" scoped>
.abnormal-container {
  min-height: 100vh;
  background: linear-gradient(180deg, #f0f9ff 0%, #e0f2fe 30%, #bae6fd 60%, #7dd3fc 100%);
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
  font-size: 32rpx;
  font-weight: 600;
}

.nav-placeholder {
  width: 80rpx;
  height: 80rpx;
}

/* 组长身份选择 */
.identity-select-mask {
  position: fixed;
  left: 0;
  right: 0;
  top: 0;
  bottom: 0;
  background: rgba(15, 23, 42, 0.5);
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 48rpx;
  box-sizing: border-box;
}

.identity-select-card {
  width: 100%;
  max-width: 560rpx;
  background: #ffffff;
  border-radius: 24rpx;
  padding: 40rpx 32rpx;
  box-shadow: 0 24rpx 48rpx rgba(0, 0, 0, 0.15);
}

.identity-select-title {
  display: block;
  font-size: 34rpx;
  font-weight: 700;
  color: #0f172a;
  text-align: center;
  margin-bottom: 12rpx;
}

.identity-select-desc {
  display: block;
  font-size: 26rpx;
  color: #64748b;
  text-align: center;
  margin-bottom: 32rpx;
}

.identity-options {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.identity-option {
  padding: 28rpx 24rpx;
  background: #f8fafc;
  border-radius: 16rpx;
  border: 2rpx solid #e2e8f0;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.identity-option:active {
  background: #e0f2fe;
  border-color: #0ea5e9;
}

.identity-option-label {
  font-size: 30rpx;
  font-weight: 600;
  color: #0f172a;
}

.identity-option-desc {
  font-size: 24rpx;
  color: #64748b;
}

.tab-bar {
  margin: 24rpx 32rpx 0;
  padding: 4rpx;
  background: rgba(255, 255, 255, 0.8);
  border-radius: 999rpx;
  display: flex;
  box-shadow: 0 8rpx 24rpx rgba(15, 23, 42, 0.08);
}

.tab-item {
  flex: 1;
  height: 72rpx;
  border-radius: 999rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28rpx;
  color: #64748b;
  font-weight: 500;
}

.tab-item.active {
  background: linear-gradient(135deg, #0ea5e9 0%, #2563eb 100%);
  color: #fff;
  font-weight: 600;
}

.scroll-area {
  flex: 1;
  padding: 24rpx 24rpx 40rpx;
  box-sizing: border-box;
}

.section-card {
  background: #ffffff;
  border-radius: 24rpx;
  padding: 24rpx 24rpx 16rpx;
  box-shadow: 0 12rpx 32rpx rgba(15, 23, 42, 0.12);
}

.section-title-row {
  margin-bottom: 16rpx;
}

.section-title {
  font-size: 32rpx;
  font-weight: 700;
  color: #0f172a;
}

.section-subtitle {
  margin-top: 6rpx;
  font-size: 24rpx;
  color: #6b7280;
}

.form-item {
  margin-bottom: 16rpx;
}

.form-item.small {
  margin-bottom: 8rpx;
}

.form-row {
  display: flex;
  gap: 16rpx;
}

.form-row .half {
  flex: 1;
}

.form-label {
  font-size: 26rpx;
  font-weight: 600;
  color: #0f172a;
  margin-bottom: 8rpx;
  display: block;
}

.form-label.small {
  font-size: 24rpx;
}

.form-input {
  width: 100%;
  padding: 18rpx 24rpx;
  border-radius: 16rpx;
  background: #f5f7fb;
  font-size: 26rpx;
}

.form-placeholder {
  color: #9ca3af;
}

.form-textarea {
  width: 100%;
  min-height: 120rpx;
  padding: 18rpx 24rpx;
  border-radius: 16rpx;
  background: #f5f7fb;
  font-size: 26rpx;
}

.btn-row {
  display: flex;
  gap: 16rpx;
  margin: 8rpx 0 20rpx;
}

.btn {
  flex: 1;
  height: 80rpx;
  border-radius: 999rpx;
  font-size: 28rpx;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
}

.primary-btn {
  background: linear-gradient(135deg, #0ea5e9 0%, #2563eb 100%);
  color: #ffffff;
}

.secondary-btn {
  background: #f3f4f6;
  color: #4b5563;
}

.list-header {
  margin-top: 8rpx;
  margin-bottom: 8rpx;
}

.list-title {
  font-size: 28rpx;
  font-weight: 600;
  color: #111827;
}

.abnormal-list {
  margin-top: 4rpx;
}

.abnormal-item {
  padding: 18rpx 20rpx;
  border-radius: 18rpx;
  background: #f9fafb;
  border: 2rpx solid #e5e7eb;
  margin-bottom: 16rpx;
}

.item-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12rpx;
  margin-bottom: 8rpx;
}

.item-name {
  font-size: 28rpx;
  font-weight: 700;
  color: #111827;
}

.item-tags {
  display: flex;
  gap: 8rpx;
}

.item-tag {
  padding: 4rpx 10rpx;
  border-radius: 999rpx;
  font-size: 22rpx;
}

.source-tag {
  background: #e0f2fe;
  color: #0369a1;
}

.step-tag {
  background: #ecfdf3;
  color: #166534;
}

.status-tag {
  background: #fef3c7;
  color: #92400e;
}

.status-tag.approved {
  background: #dcfce7;
  color: #166534;
}

.status-tag.rejected {
  background: #fee2e2;
  color: #991b1b;
}

.item-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8rpx 20rpx;
  font-size: 24rpx;
  color: #4b5563;
  margin-bottom: 6rpx;
}

.item-remark {
  font-size: 24rpx;
  color: #6b7280;
  margin-bottom: 8rpx;
}

.approve-row {
  display: flex;
  gap: 12rpx;
  margin-top: 8rpx;
}

.approve-btn {
  flex: 1;
  height: 70rpx;
  border-radius: 999rpx;
  font-size: 26rpx;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
}

.approve-btn.pass {
  background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
  color: #fff;
}

.approve-btn.reject {
  background: linear-gradient(135deg, #f97373 0%, #ef4444 100%);
  color: #fff;
}

.empty-tip {
  padding: 30rpx 0 10rpx;
  text-align: center;
}

.empty-text {
  font-size: 26rpx;
  color: #9ca3af;
}
</style>


