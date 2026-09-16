<template>
  <view class="experience-container">
    <scroll-view scroll-y class="scroll-area">
      <view class="hero-card">
        <view class="badge">体验模式</view>
        <view class="title">工厂出勤系统功能概览</view>
        <view class="subtitle">
          无需登录即可了解系统的核心流程与页面，实际数据在登录后才会展示。
        </view>
      </view>

      <view class="section">
        <view class="section-title">核心流程展示</view>
        <view class="feature-card">
          <view class="feature-icon">🕒</view>
          <view class="feature-content">
            <view class="feature-name">考勤记录</view>
            <view class="feature-desc">
              组长通过手机或考勤机导入打卡数据，系统自动生成出勤时长与异常提醒。
            </view>
          </view>
        </view>
        <view class="feature-card">
          <view class="feature-icon">👥</view>
          <view class="feature-content">
            <view class="feature-name">成员管理</view>
            <view class="feature-desc">
              组长可维护组员信息、班次与所属部门，管理员可进行分组与角色调整。
            </view>
          </view>
        </view>
        <view class="feature-card">
          <view class="feature-icon">📊</view>
          <view class="feature-content">
            <view class="feature-name">统计报表</view>
            <view class="feature-desc">
              系统支持导出异常记录、生成汇总报表，并在登录后下载真实文件。
            </view>
          </view>
        </view>
      </view>

      <view class="section">
        <view class="section-title">角色权限说明</view>
        <view class="role-list">
          <view class="role-item">
            <view class="role-name leader">组长</view>
            <view class="role-desc">
              默认角色，可管理所在小组成员、导入考勤、查看统计。
            </view>
          </view>
          <view class="role-item">
            <view class="role-name manager">管理员</view>
            <view class="role-desc">
              可协助组长维护成员、查看多部门数据，支持导出报表。
            </view>
          </view>
          <view class="role-item">
            <view class="role-name admin">admin 超级管理员</view>
            <view class="role-desc">
              独立账号登录入口，可分配角色、配置考勤组、管理所有数据。
            </view>
          </view>
        </view>
      </view>

      <view class="section">
        <view class="section-title">体验说明</view>
        <view class="notice-card">
          <view class="notice-icon">ℹ️</view>
          <view class="notice-text">
            当前页面为审核体验模式，展示示例数据与流程说明。登录后将与后端服务对接，显示真实考勤数据、成员信息及导入导出功能。
          </view>
        </view>
        <view class="notice-card">
          <view class="notice-icon">✅</view>
          <view class="notice-text">
            体验模式不需要任何权限或授权，不会收集手机号、头像等隐私信息。
          </view>
        </view>
      </view>
    </scroll-view>

    <view class="footer">
      <button class="footer-btn" type="primary" @tap="handleBack">
        返回登录继续操作
      </button>
    </view>
  </view>
</template>

<script setup>
const handleBack = () => {
  uni.navigateBack({
    fail: () => {
      uni.redirectTo({
        url: '/pages/login/login'
      })
    }
  })
}
</script>

<style lang="scss" scoped>
.experience-container {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background: linear-gradient(180deg, #f7fdf9 0%, #ffffff 40%);
}

.scroll-area {
  flex: 1;
  padding: 40rpx 32rpx 160rpx;
  box-sizing: border-box;
}

.hero-card {
  background: linear-gradient(135deg, #07c160 0%, #06a34e 100%);
  border-radius: 32rpx;
  padding: 48rpx 40rpx;
  color: #ffffff;
  box-shadow: 0 24rpx 48rpx rgba(7, 193, 96, 0.25);
  margin-bottom: 40rpx;
}

.badge {
  display: inline-flex;
  align-items: center;
  padding: 8rpx 24rpx;
  background: rgba(255, 255, 255, 0.18);
  border-radius: 999rpx;
  font-size: 24rpx;
  margin-bottom: 24rpx;
  letter-spacing: 6rpx;
}

.title {
  font-size: 48rpx;
  font-weight: 600;
  margin-bottom: 16rpx;
  line-height: 1.4;
}

.subtitle {
  font-size: 28rpx;
  line-height: 1.6;
  opacity: 0.9;
}

.section {
  margin-bottom: 48rpx;
}

.section-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #1a1a1a;
  margin-bottom: 24rpx;
}

.feature-card {
  display: flex;
  align-items: flex-start;
  gap: 24rpx;
  background: #ffffff;
  border-radius: 24rpx;
  padding: 32rpx 28rpx;
  margin-bottom: 20rpx;
  box-shadow: 0 12rpx 32rpx rgba(7, 193, 96, 0.08);
}

.feature-icon {
  width: 80rpx;
  height: 80rpx;
  border-radius: 24rpx;
  background: linear-gradient(135deg, #e8f9ef 0%, #def5e7 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 38rpx;
}

.feature-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}

.feature-name {
  font-size: 30rpx;
  font-weight: 600;
  color: #1a1a1a;
}

.feature-desc {
  font-size: 26rpx;
  color: #636f7a;
  line-height: 1.6;
}

.role-list {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}

.role-item {
  background: #ffffff;
  border-radius: 24rpx;
  padding: 28rpx 32rpx;
  box-shadow: 0 12rpx 32rpx rgba(7, 193, 96, 0.08);
}

.role-name {
  font-size: 30rpx;
  font-weight: 600;
  margin-bottom: 12rpx;
}

.role-name.leader {
  color: #07c160;
}

.role-name.manager {
  color: #1890ff;
}

.role-name.admin {
  color: #faad14;
}

.role-desc {
  font-size: 26rpx;
  color: #636f7a;
  line-height: 1.6;
}

.notice-card {
  display: flex;
  gap: 20rpx;
  padding: 24rpx 28rpx;
  border-radius: 20rpx;
  background: linear-gradient(135deg, #f3fdf7 0%, #ffffff 100%);
  border: 2rpx dashed rgba(7, 193, 96, 0.2);
  margin-bottom: 20rpx;
}

.notice-icon {
  font-size: 32rpx;
}

.notice-text {
  font-size: 26rpx;
  color: #45505c;
  line-height: 1.6;
}

.footer {
  padding: 24rpx 32rpx 40rpx;
  background: #ffffff;
  box-shadow: 0 -12rpx 24rpx rgba(0, 0, 0, 0.05);
}

.footer-btn {
  height: 96rpx;
  line-height: 96rpx;
  border-radius: 48rpx;
  background: linear-gradient(135deg, #07c160 0%, #06a34e 100%);
  color: #ffffff;
  font-size: 32rpx;
  font-weight: 500;
}

.footer-btn::after {
  border: none;
}
</style>

