<template>
  <view class="home-container">
    <!-- 顶部Header -->
    <view class="header">
      <view class="header-left">
        <view class="system-title">工厂出勤系统V6.6.6</view>
        <text class="author-text">作者 Deuix</text>
      </view>
      <view class="user-btn" @tap="handleUserClick">
        <text class="user-text">{{ userRoleText }}</text>
      </view>
    </view>

    <!-- 主内容区 -->
    <view class="main-content">
      <view 
        class="function-btn btn-team" 
        @tap="handleTeamManagement"
        hover-class="btn-hover"
      >
        <view class="btn-icon">👥</view>
        <text class="btn-label">组员管理</text>
      </view>

      <view 
        class="function-btn btn-attendance" 
        @tap="handleAttendanceStats"
        hover-class="btn-hover"
      >
        <view class="btn-icon">📊</view>
        <text class="btn-label">出勤时间统计</text>
      </view>

      <view
        v-if="canViewDeli"
        class="function-btn btn-deli"
        @tap="handleDeliPage"
        hover-class="btn-hover"
      >
        <view class="btn-icon">🏢</view>
        <text class="btn-label">得力</text>
      </view>

      <!-- 管理员/管理账号专用：数据查询入口 -->
      <view 
        v-if="canViewQuery"
        class="function-btn btn-query"
        @tap="handleQueryPage"
        hover-class="btn-hover"
      >
        <view class="btn-icon">🔎</view>
        <text class="btn-label">数据查询</text>
      </view>

      <!-- Admin用户管理入口 -->
      <view 
        v-if="isAdmin"
        class="function-btn btn-user" 
        @tap="handleUserManagement"
        hover-class="btn-hover"
      >
        <view class="btn-icon">👤</view>
        <text class="btn-label">用户管理</text>
      </view>
    </view>

    <!-- 底部按钮区域 -->
    <view class="footer">
      <view 
        class="perf-entry-btn" 
        @tap="handleGoPerformance"
        hover-class="perf-hover"
      >
        <text class="perf-btn-text">绩效首页</text>
      </view>
      <view
        class="warehouse-entry-btn"
        @tap="handleGoWarehouse"
        hover-class="warehouse-hover"
      >
        <text class="warehouse-btn-text">仓储系统</text>
      </view>
      <view 
        class="settings-btn" 
        @tap="handleSettings"
        hover-class="settings-hover"
      >
        <view class="gear-icon">
          <view class="gear-tooth"></view>
          <view class="gear-tooth"></view>
          <view class="gear-tooth"></view>
          <view class="gear-tooth"></view>
          <view class="gear-tooth"></view>
          <view class="gear-tooth"></view>
          <view class="gear-tooth"></view>
          <view class="gear-tooth"></view>
        </view>
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
const isAdmin = ref(false)
const allowedSettingRoles = ['admin', '管理员', 'manager']
// 得力入口：仅 admin 与管理员权限账户可见
const allowedDeliRoles = ['admin', '管理员', 'manager']
const canViewQuery = ref(false)
const canViewDeli = ref(false)

const applyUserRoleDisplay = (role) => {
  isAdmin.value = role === 'admin'
  // 允许查看查询页面的角色（管理员权限账户）：admin / 管理员 / manager
  canViewQuery.value = allowedSettingRoles.includes(role)
  canViewDeli.value = allowedDeliRoles.includes(role)
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
    // 未登录，跳转到登录页
    uni.redirectTo({
      url: '/pages/login/login'
    })
    return
  }
  const userRole = await refreshUserRole()
  applyUserRoleDisplay(userRole)
}

// 页面加载时检查登录状态
onMounted(() => {
  initializeUserRole()
})

// 组员管理
const handleTeamManagement = () => {
  uni.navigateTo({
    url: '/pages/team/management'
  })
}

// 出勤时间统计
const handleAttendanceStats = () => {
  uni.navigateTo({
    url: '/pages/attendance/stats'
  })
}

// 得力数据对接（仅 admin / 管理员权限账户可见）
const handleDeliPage = async () => {
  const userRole = await refreshUserRole()
  if (!allowedDeliRoles.includes(userRole)) {
    uni.showToast({
      title: '无权限访问',
      icon: 'none',
      duration: 2000
    })
    return
  }
  uni.navigateTo({
    url: '/pages/deli/index'
  })
}

// 数据查询页面（仅管理员权限账户可见）
const handleQueryPage = () => {
  uni.navigateTo({
    url: '/pages/query/index'
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
          // 调用后端登出接口
          await logout()
        } catch (error) {
          console.error('登出接口调用失败:', error)
          // 即使接口失败，也清除本地数据
          uni.removeStorageSync('token')
          uni.removeStorageSync('userInfo')
          uni.removeStorageSync('userRole')
        }
        
        // 显示提示
        uni.showToast({
          title: '已退出登录',
          icon: 'success',
          duration: 1500
        })
        
        // 延迟跳转，让用户看到提示
        setTimeout(() => {
          uni.redirectTo({
            url: '/pages/login/login'
          })
        }, 500)
      }
    }
  })
}

// 用户管理（仅admin）
const handleUserManagement = () => {
  const userRole = uni.getStorageSync('userRole') || ''
  if (userRole !== 'admin') {
    uni.showToast({
      title: '无权限访问',
      icon: 'none',
      duration: 2000
    })
    return
  }
  
  uni.navigateTo({
    url: '/pages/user/management'
  })
}

// 跳转到绩效新首页
const handleGoPerformance = () => {
  uni.navigateTo({
    url: '/pages/performance/index'
  })
}

// 跳转到仓储系统
const handleGoWarehouse = () => {
  uni.navigateTo({
    url: '/pages/warehouse/index'
  })
}

// 设置按钮
const handleSettings = async () => {
  // 检查权限（确保最新角色）
  const userRole = await refreshUserRole()
  
  if (!allowedSettingRoles.includes(userRole)) {
    uni.showToast({
      title: '无权限访问',
      icon: 'none',
      duration: 2000
    })
    return
  }
  
  uni.navigateTo({
    url: '/pages/settings/index'
  })
}
</script>

<style lang="scss" scoped>
.home-container {
  min-height: 100vh;
  background: linear-gradient(180deg, #f0f9ff 0%, #e0f2fe 30%, #bae6fd 60%, #7dd3fc 100%);
  display: flex;
  flex-direction: column;
  padding: 0 60rpx;
  position: relative;
  overflow: hidden;
}

/* 装饰元素 */
.home-container::before {
  content: '';
  position: absolute;
  width: 500rpx;
  height: 500rpx;
  background: linear-gradient(135deg, #07c160 0%, #06ad56 100%);
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
  background: linear-gradient(135deg, #06ad56 0%, #07c160 100%);
  border-radius: 50%;
  bottom: -200rpx;
  left: -200rpx;
  opacity: 0.15;
  filter: blur(40rpx);
}

/* Header区域 */
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 80rpx 0 100rpx;
  position: relative;
  z-index: 1;
  animation: fadeInDown 0.6s ease-out;
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
  background: linear-gradient(135deg, #07c160 0%, #06ad56 50%, #05a050 100%);
  color: white;
  padding: 20rpx 40rpx;
  border-radius: 50rpx;
  box-shadow: 0 8rpx 25rpx rgba(7, 193, 96, 0.4),
              0 2rpx 8rpx rgba(7, 193, 96, 0.2);
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

.system-title::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
  animation: shine 3s infinite;
}

@keyframes shine {
  0% {
    left: -100%;
  }
  100% {
    left: 100%;
  }
}

.user-btn {
  width: 110rpx;
  height: 110rpx;
  background: linear-gradient(135deg, #07c160 0%, #06ad56 100%);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 6rpx 20rpx rgba(7, 193, 96, 0.4),
              0 2rpx 8rpx rgba(7, 193, 96, 0.2);
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
  margin-right: 24rpx;
  margin-top: 20rpx;
}

.user-btn::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 0;
  height: 0;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.3);
  transform: translate(-50%, -50%);
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

/* 主内容区 */
.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 50rpx;
  padding: 50rpx 0;
  position: relative;
  z-index: 1;
}

.function-btn {
  width: 100%;
  height: 220rpx;
  border-radius: 32rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 24rpx;
  box-shadow: 0 12rpx 40rpx rgba(0, 0, 0, 0.15),
              0 4rpx 12rpx rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
  backdrop-filter: blur(10rpx);
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
  transition: opacity 0.3s ease;
}

.function-btn::after {
  content: '';
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: radial-gradient(circle, rgba(255, 255, 255, 0.3) 0%, transparent 70%);
  opacity: 0;
  transition: opacity 0.3s ease;
}

.function-btn:active::before {
  opacity: 1;
}

.function-btn:active::after {
  opacity: 1;
}

.function-btn.btn-hover {
  transform: scale(0.97) translateY(-4rpx);
}

.btn-team {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  animation: fadeInUp 0.6s ease-out 0.2s both;
  box-shadow: 0 12rpx 40rpx rgba(102, 126, 234, 0.4),
              0 4rpx 12rpx rgba(102, 126, 234, 0.2);
}

.btn-team.btn-hover {
  box-shadow: 0 8rpx 25rpx rgba(102, 126, 234, 0.3),
              0 2rpx 8rpx rgba(102, 126, 234, 0.15);
}

.btn-attendance {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  animation: fadeInUp 0.6s ease-out 0.4s both;
  box-shadow: 0 12rpx 40rpx rgba(245, 87, 108, 0.4),
              0 4rpx 12rpx rgba(245, 87, 108, 0.2);
}

.btn-attendance.btn-hover {
  box-shadow: 0 8rpx 25rpx rgba(245, 87, 108, 0.3),
              0 2rpx 8rpx rgba(245, 87, 108, 0.15);
}

.btn-deli {
  background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%);
  animation: fadeInUp 0.6s ease-out 0.45s both;
  box-shadow: 0 12rpx 40rpx rgba(14, 165, 233, 0.4),
              0 4rpx 12rpx rgba(14, 165, 233, 0.2);
}

.btn-deli.btn-hover {
  box-shadow: 0 8rpx 25rpx rgba(14, 165, 233, 0.3),
              0 2rpx 8rpx rgba(14, 165, 233, 0.15);
}

.btn-query {
  background: linear-gradient(135deg, #38bdf8 0%, #0ea5e9 100%);
  animation: fadeInUp 0.6s ease-out 0.5s both;
  box-shadow: 0 12rpx 40rpx rgba(56, 189, 248, 0.4),
              0 4rpx 12rpx rgba(56, 189, 248, 0.2);
}

.btn-query.btn-hover {
  box-shadow: 0 8rpx 25rpx rgba(56, 189, 248, 0.3),
              0 2rpx 8rpx rgba(56, 189, 248, 0.15);
}

.btn-user {
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
  animation: fadeInUp 0.6s ease-out 0.6s both;
  box-shadow: 0 12rpx 40rpx rgba(79, 172, 254, 0.4),
              0 4rpx 12rpx rgba(79, 172, 254, 0.2);
}

.btn-user.btn-hover {
  box-shadow: 0 8rpx 25rpx rgba(79, 172, 254, 0.3),
              0 2rpx 8rpx rgba(79, 172, 254, 0.15);
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

/* Footer区域 */
.footer {
  padding: 80rpx 0 100rpx;
  display: flex;
  justify-content: center;
  align-items: center;
  position: relative;
  z-index: 1;
  animation: fadeInUp 0.6s ease-out 0.6s both;
}

.perf-entry-btn {
  position: absolute;
  left: 20rpx;
  bottom: 100rpx;
  height: 100rpx;
  padding: 0 28rpx;
  background: linear-gradient(135deg, #34c759 0%, #2bb14a 100%);
  border-radius: 20rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 10rpx 20rpx rgba(52, 199, 89, 0.25);
  transition: all 0.2s ease;
}

.perf-btn-text {
  color: #fff;
  font-size: 28rpx;
  font-weight: 700;
}

.perf-hover {
  transform: translateY(-4rpx);
  box-shadow: 0 14rpx 24rpx rgba(52, 199, 89, 0.3);
}

.warehouse-entry-btn {
  position: absolute;
  right: 20rpx;
  bottom: 100rpx;
  height: 100rpx;
  padding: 0 28rpx;
  background: linear-gradient(135deg, #a855f7 0%, #7c3aed 100%);
  border-radius: 20rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 10rpx 20rpx rgba(124, 58, 237, 0.35);
  transition: all 0.2s ease;
}

.warehouse-btn-text {
  color: #fff;
  font-size: 28rpx;
  font-weight: 700;
}

.warehouse-hover {
  transform: translateY(-4rpx);
  box-shadow: 0 14rpx 24rpx rgba(124, 58, 237, 0.45);
}

.settings-btn {
  width: 130rpx;
  height: 130rpx;
  background: linear-gradient(135deg, #07c160 0%, #06ad56 50%, #05a050 100%);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 10rpx 35rpx rgba(7, 193, 96, 0.5),
              0 4rpx 12rpx rgba(7, 193, 96, 0.3);
  transition: all 0.3s ease;
  position: relative;
  overflow: visible;
  cursor: pointer;
}

.settings-btn::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 0;
  height: 0;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.3);
  transform: translate(-50%, -50%);
  transition: width 0.6s, height 0.6s;
}

.settings-btn:active::before {
  width: 300rpx;
  height: 300rpx;
}

.settings-btn.settings-hover {
  transform: scale(0.92) rotate(15deg);
  box-shadow: 0 6rpx 20rpx rgba(7, 193, 96, 0.4),
              0 2rpx 8rpx rgba(7, 193, 96, 0.2);
}

/* 齿轮图标 */
.gear-icon {
  width: 80rpx;
  height: 80rpx;
  position: relative;
  transition: transform 0.3s ease;
}

.gear-tooth {
  position: absolute;
  width: 10rpx;
  height: 26rpx;
  background: white;
  border-radius: 5rpx;
  box-shadow: 0 2rpx 4rpx rgba(0, 0, 0, 0.2);
  top: 50%;
  left: 50%;
  /* 将齿的中心点定位到距离齿轮中心26rpx的位置 */
  transform-origin: 5rpx 26rpx;
  margin-top: -13rpx;
  margin-left: -5rpx;
}

/* 8个齿轮齿的位置 - 均匀分布在圆周上，每45度一个 */
.gear-tooth:nth-child(1) {
  transform: rotate(0deg);
}

.gear-tooth:nth-child(2) {
  transform: rotate(45deg);
}

.gear-tooth:nth-child(3) {
  transform: rotate(90deg);
}

.gear-tooth:nth-child(4) {
  transform: rotate(135deg);
}

.gear-tooth:nth-child(5) {
  transform: rotate(180deg);
}

.gear-tooth:nth-child(6) {
  transform: rotate(225deg);
}

.gear-tooth:nth-child(7) {
  transform: rotate(270deg);
}

.gear-tooth:nth-child(8) {
  transform: rotate(315deg);
}

.settings-btn.settings-hover .gear-icon {
  transform: rotate(15deg);
  transition: transform 0.3s ease;
}

/* 动画 */
@keyframes fadeInDown {
  from {
    opacity: 0;
    transform: translateY(-40rpx);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(40rpx);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
