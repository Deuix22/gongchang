<template>
  <view class="home-container">
    <view class="header">
      <view class="header-left">
        <view class="title-row">
          <view class="system-title">工厂仓储系统</view>
          <view class="version-badge">V1.3.6</view>
        </view>
        <text class="subtitle-text">送货登记 · 扫码出货 · 批次追溯</text>
        <text class="author-text">BY Deuix</text>
      </view>
      <view class="user-btn" @tap="handleUserClick" hover-class="user-btn-hover">
        <text class="user-text">{{ userRoleText }}</text>
      </view>
    </view>

    <view class="main-content">
      <view
        class="function-btn btn-shipment"
        @tap="handleShipmentEntry"
        hover-class="btn-hover"
      >
        <view class="btn-icon">📦</view>
        <view class="btn-text-wrap">
          <text class="btn-label">录入送货单</text>
          <text class="btn-hint">识别录入 · 修改删除</text>
        </view>
      </view>

      <view
        class="function-btn btn-scan"
        @tap="handleScanCompare"
        hover-class="btn-hover"
      >
        <view class="btn-icon">📷</view>
        <view class="btn-text-wrap">
          <text class="btn-label">出货比对</text>
          <text class="btn-hint">扫码箱单 · 余量出货</text>
        </view>
      </view>

      <view
        class="function-btn btn-manage"
        @tap="handleManageQuery"
        hover-class="btn-hover"
      >
        <view class="btn-icon">🔎</view>
        <view class="btn-text-wrap">
          <text class="btn-label">管理查询</text>
          <text class="btn-hint">按批号 / 机型追溯</text>
        </view>
      </view>

      <view
        class="function-btn btn-inventory"
        @tap="handleInventory"
        hover-class="btn-hover"
      >
        <view class="btn-icon">📋</view>
        <view class="btn-text-wrap">
          <text class="btn-label">物料库存管理</text>
          <text class="btn-hint">入库 · 库存查询</text>
        </view>
      </view>
    </view>

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

const userRoleText = ref('用户')

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
}

onMounted(() => {
  initializeUserRole()
})

const handleShipmentEntry = () => {
  uni.navigateTo({
    url: '/pages/warehouse/shipment-entry'
  })
}

const handleScanCompare = () => {
  uni.navigateTo({
    url: '/pages/warehouse/scan-compare'
  })
}

const handleManageQuery = () => {
  uni.navigateTo({
    url: '/pages/warehouse/manage-query'
  })
}

const handleInventory = () => {
  uni.navigateTo({
    url: '/pages/warehouse/inventory'
  })
}

const handleGoAttendance = () => {
  uni.redirectTo({
    url: '/pages/index/index'
  })
}

const handleUserClick = () => {
  uni.showModal({
    title: '退出登录',
    content: '确定要退出登录吗？',
    confirmText: '退出',
    cancelText: '取消',
    confirmColor: '#7c3aed',
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
  background: linear-gradient(180deg, #faf5ff 0%, #f3e8ff 30%, #e9d5ff 60%, #d8b4fe 100%);
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
  background: linear-gradient(135deg, #a855f7 0%, #7c3aed 100%);
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
  background: linear-gradient(135deg, #7c3aed 0%, #9333ea 100%);
  border-radius: 50%;
  bottom: -200rpx;
  left: -200rpx;
  opacity: 0.15;
  filter: blur(40rpx);
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 80rpx 0 60rpx;
  position: relative;
  z-index: 1;
  animation: fadeInDown 0.6s ease-out;
}

.header-left {
  display: flex;
  flex-direction: column;
  gap: 14rpx;
  flex: 1;
  min-width: 0;
  padding-right: 20rpx;
}

.title-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12rpx;
}

.system-title {
  font-size: 34rpx;
  font-weight: 700;
  background: linear-gradient(135deg, #a855f7 0%, #7c3aed 50%, #6d28d9 100%);
  color: white;
  padding: 18rpx 32rpx;
  border-radius: 50rpx;
  box-shadow: 0 8rpx 25rpx rgba(124, 58, 237, 0.4),
              0 2rpx 8rpx rgba(124, 58, 237, 0.2);
}

.version-badge {
  font-size: 22rpx;
  font-weight: 700;
  color: #5b21b6;
  background: rgba(255, 255, 255, 0.92);
  border: 2rpx solid #c4b5fd;
  padding: 8rpx 18rpx;
  border-radius: 999rpx;
  letter-spacing: 1rpx;
}

.subtitle-text {
  font-size: 24rpx;
  color: #6d28d9;
  font-weight: 600;
  margin-left: 8rpx;
  opacity: 0.85;
}

.author-text {
  font-size: 22rpx;
  color: #6b7280;
  font-weight: 500;
  margin-left: 8rpx;
}

.user-btn {
  width: 110rpx;
  height: 110rpx;
  flex-shrink: 0;
  background: linear-gradient(135deg, #a855f7 0%, #7c3aed 100%);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 6rpx 20rpx rgba(124, 58, 237, 0.4),
              0 2rpx 8rpx rgba(124, 58, 237, 0.2);
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
  margin-right: 8rpx;
  margin-top: 8rpx;
  border: 4rpx solid rgba(255, 255, 255, 0.55);
}

.user-btn-hover,
.user-btn:active {
  transform: scale(0.92);
}

.user-text {
  color: white;
  font-size: 28rpx;
  font-weight: 600;
}

.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 36rpx;
  padding: 20rpx 0 40rpx;
  position: relative;
  z-index: 1;
}

.function-btn {
  width: 100%;
  height: 200rpx;
  border-radius: 32rpx;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: flex-start;
  gap: 28rpx;
  padding: 0 48rpx;
  box-sizing: border-box;
  box-shadow: 0 12rpx 40rpx rgba(0, 0, 0, 0.12),
              0 4rpx 12rpx rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.function-btn.btn-hover {
  transform: scale(0.97) translateY(-4rpx);
}

.btn-text-wrap {
  display: flex;
  flex-direction: column;
  gap: 10rpx;
  align-items: flex-start;
}

.btn-shipment {
  background: linear-gradient(135deg, #c084fc 0%, #a855f7 100%);
  animation: fadeInUp 0.6s ease-out 0.2s both;
  box-shadow: 0 12rpx 40rpx rgba(168, 85, 247, 0.4),
              0 4rpx 12rpx rgba(168, 85, 247, 0.2);
}

.btn-scan {
  background: linear-gradient(135deg, #a78bfa 0%, #7c3aed 100%);
  animation: fadeInUp 0.6s ease-out 0.4s both;
  box-shadow: 0 12rpx 40rpx rgba(124, 58, 237, 0.4),
              0 4rpx 12rpx rgba(124, 58, 237, 0.2);
}

.btn-manage {
  background: linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%);
  animation: fadeInUp 0.6s ease-out 0.6s both;
  box-shadow: 0 12rpx 40rpx rgba(109, 40, 217, 0.4),
              0 4rpx 12rpx rgba(109, 40, 217, 0.2);
}

.btn-inventory {
  background: linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%);
  animation: fadeInUp 0.6s ease-out 0.8s both;
  box-shadow: 0 12rpx 40rpx rgba(91, 33, 182, 0.4),
              0 4rpx 12rpx rgba(91, 33, 182, 0.2);
}

.btn-icon {
  font-size: 72rpx;
  line-height: 1;
  filter: drop-shadow(0 2rpx 4rpx rgba(0, 0, 0, 0.2));
  flex-shrink: 0;
}

.btn-label {
  color: white;
  font-size: 36rpx;
  font-weight: 700;
  text-shadow: 0 2rpx 4rpx rgba(0, 0, 0, 0.2);
  letter-spacing: 2rpx;
}

.btn-hint {
  color: rgba(255, 255, 255, 0.88);
  font-size: 24rpx;
  font-weight: 500;
  letter-spacing: 1rpx;
}

.footer {
  padding: 40rpx 0 100rpx;
  display: flex;
  justify-content: center;
  align-items: center;
  position: relative;
  z-index: 1;
  animation: fadeInUp 0.6s ease-out 0.8s both;
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
