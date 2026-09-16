<template>
  <view class="home-container">
    <!-- 顶部Header -->
    <view class="header">
      <view class="header-left">
        <view class="system-title">工厂绩效系统V1.2.3</view>
        <text class="author-text">BY Deuix</text>
      </view>
      <view class="user-btn" @tap="handleUserClick">
        <text class="user-text">{{ userRoleText }}</text>
      </view>
    </view>

    <!-- 主内容区（功能禁用态） -->
    <view class="main-content">
      <view class="function-btn btn-team" @tap="handleGoWorktime">
        <view class="btn-icon">👥</view>
        <text class="btn-label">工时统计</text>
      </view>

      <view class="function-btn btn-performance" @tap="handleGoAbnormalFlow">
        <view class="btn-icon">📈</view>
        <text class="btn-label">异常工时流程</text>
      </view>

      <view class="function-btn btn-capacity" @tap="handleGoCapacity">
        <view class="btn-icon">📋</view>
        <text class="btn-label">产能提报</text>
      </view>

      <view
        v-if="canViewCapacityManage"
        class="function-btn btn-capacity-manage"
        @tap="handleGoCapacityManage"
      >
        <view class="btn-icon">📊</view>
        <text class="btn-label">产能管理</text>
      </view>

      <view class="function-btn btn-user disabled" @tap="handleComingSoon">
        <view class="btn-icon">👤</view>
        <text class="btn-label">用户管理</text>
        <text class="btn-badge">敬请期待</text>
      </view>
    </view>

    <!-- 底部返回考勤系统按钮 -->
    <view class="footer">
      <view 
        class="back-attendance-btn" 
        @tap="handleGoAttendance"
        hover-class="back-hover"
      >
        <text class="back-btn-text">返回考勤系统</text>
      </view>
    </view>
  </view>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { logout } from '@/utils/api/auth.js'
import { getCurrentUser } from '@/utils/api/user.js'

// 用户角色文本
const userRoleText = ref('用户')
// 仅管理员权限和 admin 可见产能管理
const canViewCapacityManage = ref(false)
const allowedCapacityManageRoles = ['admin', '管理员', 'manager']

const applyUserRoleDisplay = (role) => {
  switch (role) {
    case 'leader':
      userRoleText.value = '组长'
      break
    case 'manager':
    case '管理员':
      userRoleText.value = '管理员'
      break
    case 'admin':
      userRoleText.value = 'admin'
      break
    case 'member':
    case '组员':
      userRoleText.value = '组员'
      break
    default:
      userRoleText.value = '用户'
  }
}

const refreshUserRole = async () => {
  let latestRole = uni.getStorageSync('userRole') || ''
  try {
    const currentUser = await getCurrentUser()
    if (currentUser?.role) {
      latestRole = currentUser.role
      uni.setStorageSync('userRole', latestRole)
      if (currentUser.nickName) {
        uni.setStorageSync('userNickName', currentUser.nickName)
      }
    }
  } catch (error) {
    console.warn('刷新用户角色失败:', error)
  }
  return latestRole || 'leader'
}

const initializeUserRole = async () => {
  const token = uni.getStorageSync('token')
  if (!token) {
    uni.redirectTo({
      url: '/pages/login/login'
    })
    return
  }
  const userRole = await refreshUserRole()
  applyUserRoleDisplay(userRole)
  canViewCapacityManage.value = allowedCapacityManageRoles.includes(userRole)
}

onMounted(() => {
  initializeUserRole()
})

// 跳转到工时统计页面
const handleGoWorktime = () => {
  uni.navigateTo({
    url: '/pages/performance/worktime'
  })
}

// 跳转到异常工时流程页面
const handleGoAbnormalFlow = () => {
  uni.navigateTo({
    url: '/pages/performance/abnormal'
  })
}

// 跳转到产能提报页面
const handleGoCapacity = () => {
  uni.navigateTo({
    url: '/pages/performance/capacity'
  })
}

// 跳转到产能管理页面（仅管理员/admin 可见）
const handleGoCapacityManage = () => {
  uni.navigateTo({
    url: '/pages/performance/capacity-manage'
  })
}

// 用户管理（敬请期待）
const handleComingSoon = () => {
  uni.showToast({
    title: '敬请期待',
    icon: 'none'
  })
}

// 返回考勤系统首页
const handleGoAttendance = () => {
  uni.redirectTo({
    url: '/pages/index/index'
  })
}

// 用户按钮 - 退出登录
const handleUserClick = () => {
  uni.showModal({
    title: '退出登录',
    content: '确定要退出登录吗？',
    confirmText: '退出',
    cancelText: '取消',
    confirmColor: '#07c160',
    success: async (res) => {
      if (res.confirm) {
        try {
          await logout()
        } catch (error) {
          console.error('登出接口调用失败:', error)
          uni.removeStorageSync('token')
          uni.removeStorageSync('userInfo')
          uni.removeStorageSync('userRole')
        }

        uni.showToast({
          title: '已退出登录',
          icon: 'success',
          duration: 1500
        })

        setTimeout(() => {
          uni.redirectTo({
            url: '/pages/login/login'
          })
        }, 500)
      }
    }
  })
}
</script>

<style lang="scss" scoped>
.home-container {
  min-height: 100vh;
  background: linear-gradient(180deg, #f0f7ff 0%, #e0ecff 30%, #c7ddff 60%, #9ec4ff 100%);
  display: flex;
  flex-direction: column;
  padding: 0 60rpx;
  position: relative;
  overflow: hidden;
}

.home-container::before {
  content: '';
  position: absolute;
  width: 500rpx;
  height: 500rpx;
  background: linear-gradient(135deg, #5b8def 0%, #4072e5 100%);
  border-radius: 50%;
  top: -250rpx;
  right: -250rpx;
  opacity: 0.15;
  filter: blur(40rpx);
}

.home-container::after {
  content: '';
  position: absolute;
  width: 400rpx;
  height: 400rpx;
  background: linear-gradient(135deg, #4072e5 0%, #5b8def 100%);
  border-radius: 50%;
  bottom: -200rpx;
  left: -200rpx;
  opacity: 0.15;
  filter: blur(40rpx);
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 80rpx 0 100rpx;
  position: relative;
  z-index: 1;
}

.header-left {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
  flex: 1;
}

.system-title {
  font-size: 34rpx;
  font-weight: 700;
  background: linear-gradient(135deg, #5b8def 0%, #4072e5 50%, #2f5ecc 100%);
  color: white;
  padding: 20rpx 40rpx;
  border-radius: 50rpx;
  box-shadow: 0 8rpx 25rpx rgba(64, 114, 229, 0.35),
              0 2rpx 8rpx rgba(64, 114, 229, 0.2);
  position: relative;
  overflow: hidden;
  align-self: flex-start;
}

.author-text {
  font-size: 22rpx;
  color: #64748b;
  font-weight: 500;
  margin-left: 8rpx;
}

.user-btn {
  width: 140rpx;
  height: 140rpx;
  border-radius: 50%;
  background: linear-gradient(135deg, #5b8def 0%, #4072e5 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 10rpx 20rpx rgba(64, 114, 229, 0.3);
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.user-btn::before {
  content: '';
  position: absolute;
  width: 0;
  height: 0;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.3);
  transform: translate(-50%, -50%);
  top: 50%;
  left: 50%;
  transition: width 0.6s, height 0.6s;
}

.user-btn:active::before {
  width: 200rpx;
  height: 200rpx;
}

.user-btn:active {
  transform: scale(0.92);
}

.user-text {
  color: white;
  font-size: 28rpx;
  font-weight: 600;
  position: relative;
  z-index: 1;
}

.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 50rpx;
  padding: 50rpx 0;
  position: relative;
  z-index: 1;
}

/* 底部返回按钮 */
.footer {
  padding: 40rpx 0 60rpx;
  display: flex;
  justify-content: center;
  align-items: center;
  position: relative;
  z-index: 1;
}

.back-attendance-btn {
  height: 90rpx;
  padding: 0 40rpx;
  border-radius: 999rpx;
  background: linear-gradient(135deg, #07c160 0%, #06ad56 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 10rpx 24rpx rgba(7, 193, 96, 0.4);
  transition: all 0.2s ease;
}

.back-btn-text {
  color: #fff;
  font-size: 28rpx;
  font-weight: 700;
  letter-spacing: 2rpx;
}

.back-hover {
  transform: translateY(-4rpx);
  box-shadow: 0 14rpx 28rpx rgba(7, 193, 96, 0.5);
}

.function-btn {
  width: 100%;
  height: 220rpx;
  border-radius: 32rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 14rpx;
  box-shadow: 0 12rpx 40rpx rgba(0, 0, 0, 0.12),
              0 4rpx 12rpx rgba(0, 0, 0, 0.1);
  position: relative;
  overflow: hidden;
  backdrop-filter: blur(10rpx);
}

.function-btn.disabled {
  opacity: 0.75;
}

.function-btn::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.2);
  opacity: 0;
}

.btn-team {
  background: linear-gradient(135deg, #7c8ff5 0%, #6b7ee8 50%, #5a6fdc 100%);
  box-shadow: 0 12rpx 40rpx rgba(91, 143, 245, 0.35);
}

.btn-performance {
  background: linear-gradient(135deg, #ff8fb1 0%, #ff7aa5 50%, #ff6a99 100%);
  box-shadow: 0 12rpx 40rpx rgba(255, 138, 171, 0.35);
}

.btn-capacity {
  background: linear-gradient(135deg, #6ee7b7 0%, #34d399 50%, #10b981 100%);
  box-shadow: 0 12rpx 40rpx rgba(52, 211, 153, 0.35);
}

.btn-capacity-manage {
  background: linear-gradient(135deg, #67e8f9 0%, #22d3ee 50%, #06b6d4 100%);
  box-shadow: 0 12rpx 40rpx rgba(34, 211, 238, 0.35);
}

.btn-user {
  background: linear-gradient(135deg, #5bd4ff 0%, #47c4f5 50%, #2fb5eb 100%);
  box-shadow: 0 12rpx 40rpx rgba(91, 212, 255, 0.35);
}

.btn-icon {
  font-size: 90rpx;
  line-height: 1;
  filter: drop-shadow(0 2rpx 4rpx rgba(0, 0, 0, 0.2));
  position: relative;
  z-index: 1;
}

.btn-label {
  color: white;
  font-size: 38rpx;
  font-weight: 700;
  text-shadow: 0 2rpx 4rpx rgba(0, 0, 0, 0.2);
  position: relative;
  z-index: 1;
  letter-spacing: 2rpx;
}

.btn-badge {
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.85);
  padding: 6rpx 14rpx;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 999rpx;
  border: 2rpx solid rgba(255, 255, 255, 0.35);
}
</style>

