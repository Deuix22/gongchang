<template>
  <view class="home-container">
    <view class="header">
      <view class="header-left">
        <view class="system-title">得力数据对接</view>
        <text class="author-text">BY Deuix</text>
      </view>
      <view class="user-btn" @tap="handleUserClick">
        <text class="user-text">{{ userRoleText }}</text>
      </view>
    </view>

    <view class="main-content">
      <view
        class="function-btn btn-org"
        @tap="handleGoOrg"
        hover-class="btn-hover"
      >
        <view class="btn-icon">👥</view>
        <text class="btn-label">人员与部门</text>
      </view>

      <view
        class="function-btn btn-attendance-data"
        @tap="handleGoAttendanceData"
        hover-class="btn-hover"
      >
        <view class="btn-icon">📋</view>
        <text class="btn-label">考勤数据</text>
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
const allowedDeliRoles = ['admin', '管理员', 'manager']

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
  if (!allowedDeliRoles.includes(userRole)) {
    uni.showToast({
      title: '无权限访问',
      icon: 'none',
      duration: 2000
    })
    setTimeout(() => {
      uni.redirectTo({ url: '/pages/index/index' })
    }, 300)
    return
  }
}

onMounted(() => {
  initializeUserRole()
})

const handleGoOrg = () => {
  uni.navigateTo({
    url: '/pages/deli/org'
  })
}

const handleGoAttendanceData = () => {
  uni.navigateTo({
    url: '/pages/deli/attendance/index'
  })
}

const handleGoAttendance = () => {
  const pages = getCurrentPages && getCurrentPages()
  const canGoBack = Array.isArray(pages) && pages.length > 1

  if (canGoBack) {
    uni.navigateBack({
      fail: () => {
        uni.redirectTo({ url: '/pages/index/index' })
      }
    })
  } else {
    uni.redirectTo({
      url: '/pages/index/index',
      fail: () => {
        uni.reLaunch({ url: '/pages/index/index' })
      }
    })
  }
}

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
  background: linear-gradient(180deg, #f0f9ff 0%, #e0f2fe 30%, #bae6fd 60%, #7dd3fc 100%);
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
  background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%);
  border-radius: 50%;
  top: -250rpx;
  right: -250rpx;
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
  background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 50%, #0369a1 100%);
  color: white;
  padding: 20rpx 40rpx;
  border-radius: 50rpx;
  box-shadow: 0 8rpx 25rpx rgba(14, 165, 233, 0.4);
  align-self: flex-start;
}

.author-text {
  font-size: 22rpx;
  color: #64748b;
  font-weight: 500;
  margin-left: 8rpx;
}

.user-btn {
  width: 110rpx;
  height: 110rpx;
  background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 6rpx 20rpx rgba(14, 165, 233, 0.4);
  margin-right: 24rpx;
  margin-top: 20rpx;
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
  box-shadow: 0 12rpx 40rpx rgba(0, 0, 0, 0.15);
  transition: all 0.3s ease;
}

.function-btn.btn-hover {
  transform: scale(0.97) translateY(-4rpx);
}

.btn-org {
  background: linear-gradient(135deg, #38bdf8 0%, #0ea5e9 100%);
  box-shadow: 0 12rpx 40rpx rgba(56, 189, 248, 0.4);
}

.btn-attendance-data {
  background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
  box-shadow: 0 12rpx 40rpx rgba(99, 102, 241, 0.4);
}

.btn-icon {
  font-size: 90rpx;
  line-height: 1;
}

.btn-label {
  color: white;
  font-size: 38rpx;
  font-weight: 700;
  letter-spacing: 2rpx;
}

.footer {
  padding: 80rpx 0 100rpx;
  display: flex;
  justify-content: center;
  position: relative;
  z-index: 1;
}

.back-attendance-btn {
  height: 100rpx;
  padding: 0 40rpx;
  background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%);
  border-radius: 20rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 10rpx 20rpx rgba(14, 165, 233, 0.35);
}

.back-btn-text {
  color: #fff;
  font-size: 28rpx;
  font-weight: 700;
}

.back-hover {
  transform: translateY(-4rpx);
}
</style>
