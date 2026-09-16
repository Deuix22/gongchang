<template>
  <view class="home-container">
    <!-- 顶部Header -->
    <view class="header">
      <view class="system-title">工厂出勤系统-IT01</view>
      <view class="user-btn" @tap="handleUserClick">
        <text class="user-text">用户</text>
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
    </view>

    <!-- 底部设置按钮 -->
    <view class="footer">
      <view 
        class="settings-btn" 
        @tap="handleSettings"
        hover-class="settings-hover"
      >
        <text class="settings-text">设置</text>
      </view>
    </view>
  </view>
</template>

<script setup>
// 组员管理
const handleTeamManagement = () => {
  uni.showToast({
    title: '组员管理',
    icon: 'none',
    duration: 1500
  })
  // 可以跳转到组员管理页面
  // uni.navigateTo({
  //   url: '/pages/team/management'
  // })
}

// 出勤时间统计
const handleAttendanceStats = () => {
  uni.showToast({
    title: '出勤时间统计',
    icon: 'none',
    duration: 1500
  })
  // 可以跳转到出勤统计页面
  // uni.navigateTo({
  //   url: '/pages/attendance/stats'
  // })
}

// 用户按钮
const handleUserClick = () => {
  uni.showToast({
    title: '用户中心',
    icon: 'none',
    duration: 1500
  })
  // 可以跳转到用户中心页面
  // uni.navigateTo({
  //   url: '/pages/user/center'
  // })
}

// 设置按钮
const handleSettings = () => {
  uni.showToast({
    title: '设置',
    icon: 'none',
    duration: 1500
  })
  // 可以跳转到设置页面
  // uni.navigateTo({
  //   url: '/pages/settings/index'
  // })
}
</script>

<style lang="scss" scoped>
.home-container {
  min-height: 100vh;
  background: linear-gradient(180deg, #ffffff 0%, #f8f9fa 100%);
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
  width: 400rpx;
  height: 400rpx;
  background: #07c160;
  border-radius: 50%;
  top: -200rpx;
  right: -200rpx;
  opacity: 0.05;
}

.home-container::after {
  content: '';
  position: absolute;
  width: 300rpx;
  height: 300rpx;
  background: #07c160;
  border-radius: 50%;
  bottom: -150rpx;
  left: -150rpx;
  opacity: 0.05;
}

/* Header区域 */
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 60rpx 0 80rpx;
  position: relative;
  z-index: 1;
  animation: fadeInDown 0.6s ease-out;
}

.system-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #1a1a1a;
  background: linear-gradient(135deg, #07c160 0%, #06ad56 100%);
  color: white;
  padding: 16rpx 32rpx;
  border-radius: 50rpx;
  box-shadow: 0 4rpx 15rpx rgba(7, 193, 96, 0.3);
}

.user-btn {
  width: 100rpx;
  height: 100rpx;
  background: linear-gradient(135deg, #07c160 0%, #06ad56 100%);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4rpx 15rpx rgba(7, 193, 96, 0.3);
  transition: all 0.3s ease;
}

.user-btn:active {
  transform: scale(0.95);
}

.user-text {
  color: white;
  font-size: 28rpx;
  font-weight: 500;
}

/* 主内容区 */
.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 40rpx;
  padding: 40rpx 0;
  position: relative;
  z-index: 1;
}

.function-btn {
  width: 100%;
  height: 200rpx;
  background: linear-gradient(135deg, #07c160 0%, #06ad56 100%);
  border-radius: 30rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 20rpx;
  box-shadow: 0 8rpx 30rpx rgba(7, 193, 96, 0.4);
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.function-btn::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.1);
  opacity: 0;
  transition: opacity 0.3s ease;
}

.function-btn:active::before {
  opacity: 1;
}

.function-btn.btn-hover {
  transform: scale(0.98);
  box-shadow: 0 4rpx 16rpx rgba(7, 193, 96, 0.3);
}

.btn-team {
  animation: fadeInUp 0.6s ease-out 0.2s both;
}

.btn-attendance {
  animation: fadeInUp 0.6s ease-out 0.4s both;
}

.btn-icon {
  font-size: 80rpx;
  line-height: 1;
}

.btn-label {
  color: white;
  font-size: 36rpx;
  font-weight: 600;
}

/* Footer区域 */
.footer {
  padding: 60rpx 0 80rpx;
  display: flex;
  justify-content: center;
  align-items: center;
  position: relative;
  z-index: 1;
  animation: fadeInUp 0.6s ease-out 0.6s both;
}

.settings-btn {
  width: 120rpx;
  height: 120rpx;
  background: linear-gradient(135deg, #07c160 0%, #06ad56 100%);
  transform: rotate(45deg);
  border-radius: 20rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8rpx 30rpx rgba(7, 193, 96, 0.4);
  transition: all 0.3s ease;
}

.settings-btn.settings-hover {
  transform: rotate(45deg) scale(0.95);
  box-shadow: 0 4rpx 16rpx rgba(7, 193, 96, 0.3);
}

.settings-text {
  color: white;
  font-size: 28rpx;
  font-weight: 600;
  transform: rotate(-45deg);
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
