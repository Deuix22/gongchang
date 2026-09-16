<template>
  <view class="page-container">
    <view class="nav-bar">
      <view class="nav-back" hover-class="nav-back-hover" @tap="handleBack">
        <text class="nav-back-icon">‹</text>
        <text class="nav-back-text">返回</text>
      </view>
      <view class="nav-title">物料库存管理</view>
      <view class="nav-placeholder"></view>
    </view>

    <view class="main-content">
      <view
        class="function-btn btn-inbound"
        hover-class="btn-hover"
        @tap="handleInbound"
      >
        <view class="btn-icon">📥</view>
        <view class="btn-text-wrap">
          <text class="btn-label">物料入库</text>
          <text class="btn-hint">扫码 Reel ID 入库</text>
        </view>
      </view>

      <view
        class="function-btn btn-stock"
        hover-class="btn-hover"
        @tap="handleStockQuery"
      >
        <view class="btn-icon">📊</view>
        <view class="btn-text-wrap">
          <text class="btn-label">库存查询</text>
          <text class="btn-hint">按物料号 / 批次查询</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { onMounted } from 'vue'

const handleInbound = () => {
  uni.navigateTo({ url: '/pages/warehouse/inventory-inbound' })
}

const handleStockQuery = () => {
  uni.navigateTo({ url: '/pages/warehouse/inventory-stock' })
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

.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 36rpx;
  padding: 40rpx 48rpx;
  box-sizing: border-box;
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
  transition: all 0.3s ease;
}

.function-btn.btn-hover {
  transform: scale(0.97) translateY(-4rpx);
}

.btn-inbound {
  background: linear-gradient(135deg, #a855f7 0%, #7c3aed 100%);
  box-shadow: 0 12rpx 40rpx rgba(124, 58, 237, 0.4),
              0 4rpx 12rpx rgba(124, 58, 237, 0.2);
}

.btn-stock {
  background: linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%);
  box-shadow: 0 12rpx 40rpx rgba(109, 40, 217, 0.4),
              0 4rpx 12rpx rgba(109, 40, 217, 0.2);
}

.btn-icon {
  font-size: 72rpx;
  line-height: 1;
  filter: drop-shadow(0 2rpx 4rpx rgba(0, 0, 0, 0.2));
  flex-shrink: 0;
}

.btn-text-wrap {
  display: flex;
  flex-direction: column;
  gap: 10rpx;
  align-items: flex-start;
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
</style>
