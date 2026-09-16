<template>
  <view class="attendance-layout">
    <view class="sidebar">
      <view class="sidebar-header" @tap="toggleMenu">
        <text class="sidebar-icon">📋</text>
        <text class="sidebar-title">考勤数据</text>
        <text class="sidebar-arrow">{{ menuExpanded ? '▲' : '▼' }}</text>
      </view>
      <view v-if="menuExpanded" class="sidebar-menu">
        <view
          v-for="item in menuItems"
          :key="item.key"
          class="menu-item"
          :class="{ active: activeKey === item.key }"
          @tap="handleNavigate(item)"
        >
          <text>{{ item.label }}</text>
        </view>
      </view>
    </view>

    <view class="content-area">
      <view class="content-topbar">
        <view class="back-btn" @tap="handleBack">
          <text class="back-icon">‹</text>
          <text>返回得力首页</text>
        </view>
      </view>
      <slot />
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue'

const props = defineProps({
  activeKey: {
    type: String,
    required: true
  }
})

const menuExpanded = ref(true)

const menuItems = [
  { key: 'daily', label: '每日统计', url: '/pages/deli/attendance/daily' },
  { key: 'abnormal', label: '异常考勤', url: '/pages/deli/attendance/abnormal' },
  { key: 'monthly', label: '月度汇总', url: '/pages/deli/attendance/monthly' },
  { key: 'dept', label: '部门统计', url: '/pages/deli/attendance/dept' }
]

const toggleMenu = () => {
  menuExpanded.value = !menuExpanded.value
}

const handleNavigate = (item) => {
  if (item.key === props.activeKey) return
  uni.redirectTo({ url: item.url })
}

const handleBack = () => {
  uni.redirectTo({
    url: '/pages/deli/index',
    fail: () => {
      uni.reLaunch({ url: '/pages/deli/index' })
    }
  })
}
</script>

<style lang="scss" scoped>
.attendance-layout {
  min-height: 100vh;
  display: flex;
  background: #f0f2f5;
}

.sidebar {
  width: 220rpx;
  flex-shrink: 0;
  background: #001529;
  min-height: 100vh;
}

.sidebar-header {
  display: flex;
  align-items: center;
  gap: 8rpx;
  padding: 28rpx 16rpx;
  color: #fff;
  border-bottom: 1rpx solid rgba(255, 255, 255, 0.08);
}

.sidebar-icon {
  font-size: 28rpx;
}

.sidebar-title {
  flex: 1;
  font-size: 26rpx;
  font-weight: 600;
}

.sidebar-arrow {
  font-size: 20rpx;
  opacity: 0.7;
}

.sidebar-menu {
  padding: 8rpx 0;
}

.menu-item {
  padding: 22rpx 20rpx 22rpx 36rpx;
  font-size: 26rpx;
  color: rgba(255, 255, 255, 0.75);
}

.menu-item.active {
  background: #1890ff;
  color: #fff;
}

.content-area {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.content-topbar {
  padding: 16rpx 20rpx;
  background: #fff;
  border-bottom: 1rpx solid #e8e8e8;
}

.back-btn {
  display: flex;
  align-items: center;
  gap: 4rpx;
  font-size: 26rpx;
  color: #1890ff;
}

.back-icon {
  font-size: 36rpx;
  line-height: 1;
}
</style>
