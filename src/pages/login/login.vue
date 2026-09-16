<template>
  <view class="login-container">
    <!-- Logo区域 -->
    <view class="logo-section">
      <view class="logo-circle">
        <text class="logo-text">通勤</text>
      </view>
      <view class="app-name-row">
        <text class="app-name">工厂出勤系统</text>
        <text class="author-text">作者 Deuix</text>
      </view>
      <view class="app-slogan">欢迎使用，请先登录</view>
    </view>

    <!-- 登录按钮区域 -->
    <view class="login-section">
      <view class="experience-entry">
        <view class="experience-title">先体验功能再登录</view>
        <view class="experience-desc">
          可浏览示例流程和页面介绍，不会触发任何授权或数据收集。
        </view>
        <button class="experience-btn" hover-class="btn-hover" @tap="handlePreviewExperience">
          <text>立即体验</text>
        </button>
      </view>

      <view class="agreement-section">
        <checkbox-group @change="handleAgreementChange">
          <label class="agreement-label" hover-class="checkbox-hover">
            <checkbox value="agree" :checked="agreePolicy" color="#07c160" />
            <text class="agreement-text">
              我已阅读并同意
              <text class="link-text" @tap.stop="handleUserAgreement">《用户协议》</text>
              和
              <text class="link-text" @tap.stop="handlePrivacyPolicy">《隐私政策》</text>
            </text>
          </label>
        </checkbox-group>
        <view class="agreement-tip">若不同意，可点击上方"先体验功能再登录"了解详情</view>
      </view>

      <!-- 加载状态提示 -->
      <view v-if="loading" class="loading-container">
        <view class="loading-spinner"></view>
        <text class="loading-text">{{ loadingText }}</text>
      </view>

      <!-- 错误信息展示 -->
      <view v-if="errorMessage" class="error-message">
        <text class="error-icon">⚠️</text>
        <text class="error-text">{{ errorMessage }}</text>
      </view>

      <!-- 账号密码登录表单 -->
      <view class="login-form-card">
        <view class="input-group">
          <text class="input-label">账号</text>
          <input
            v-model="username"
            class="form-input"
            placeholder="请输入账号"
            placeholder-class="placeholder"
            :disabled="loading"
            confirm-type="next"
          />
        </view>
        <view class="input-group">
          <text class="input-label">密码</text>
          <input
            v-model="password"
            class="form-input"
            type="password"
            placeholder="请输入密码"
            placeholder-class="placeholder"
            :disabled="loading"
            confirm-type="done"
            @confirm="handleLogin"
          />
        </view>
        <button
          class="login-btn"
          :class="{ 'btn-disabled': loading || !agreePolicy }"
          :disabled="loading || !agreePolicy"
          hover-class="btn-hover"
          @tap="handleLogin"
        >
          <text>{{ loading ? loadingText : '登录' }}</text>
        </button>
        <view class="login-tip">
          账号和密码由管理员分配，如有疑问请联系管理员
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { loginUser } from '@/utils/api/auth.js'

// 响应式数据
const loading = ref(false)
const loadingText = ref('登录中...')
const errorMessage = ref('')
const username = ref('')
const password = ref('')
const agreePolicy = ref(false)

// 账号密码登录
const handleLogin = async () => {
  if (loading.value) return
  
  if (!agreePolicy.value) {
    errorMessage.value = '请先勾选用户协议和隐私政策'
    setTimeout(() => {
      errorMessage.value = ''
    }, 3000)
    return
  }

  const user = username.value.trim()
  const pwd = password.value.trim()

  errorMessage.value = ''

  if (!user || !pwd) {
    errorMessage.value = '请输入账号和密码'
    return
  }

  loading.value = true
  loadingText.value = '正在验证身份...'
  let loginSuccess = false

  try {
    // 调用后端API
    const response = await loginUser(user, pwd)
    
    // 验证响应数据
    if (!response || !response.token) {
      throw new Error('登录失败：服务器未返回Token')
    }
    
    console.log('登录成功，用户信息:', response.user)
    loadingText.value = '登录成功'
    loginSuccess = true

    setTimeout(() => {
      loading.value = false
      password.value = ''
      // 优先跳回登录前想去的页面（例如数据查询页）
      const redirectPath = uni.getStorageSync('loginRedirectPath')
      if (redirectPath) {
        uni.removeStorageSync('loginRedirectPath')
        uni.reLaunch({
          url: redirectPath
        })
      } else {
        uni.redirectTo({
          url: '/pages/index/index'
        })
      }
    }, 400)
  } catch (error) {
    console.error('登录失败:', error)
    
    // 显示具体的错误信息
    const errorMsg = error.message || error.code || '登录失败，请稍后重试'
    console.error('登录失败，错误详情:', {
      message: error.message,
      code: error.code,
      details: error.details
    })
    
    // 显示后端返回的错误信息
    errorMessage.value = errorMsg
    password.value = ''

    setTimeout(() => {
      errorMessage.value = ''
    }, 3000)
  } finally {
    if (!loginSuccess) {
      loading.value = false
      loadingText.value = '登录中...'
    }
  }
}

// 体验模式
const handlePreviewExperience = () => {
  if (loading.value) return
  uni.navigateTo({
    url: '/pages/preview/experience'
  })
}

// 用户协议
const handleUserAgreement = () => {
  uni.navigateTo({
    url: '/pages/agreement/user'
  })
}

// 隐私政策
const handlePrivacyPolicy = () => {
  uni.navigateTo({
    url: '/pages/agreement/privacy'
  })
}

// 协议勾选
const handleAgreementChange = (event) => {
  const values = event.detail?.value || []
  agreePolicy.value = values.includes('agree')
}
</script>

<style lang="scss" scoped>
.login-container {
  min-height: 100vh;
  background: linear-gradient(180deg, #ffffff 0%, #f8f9fa 100%);
  display: flex;
  flex-direction: column;
  padding: 120rpx 60rpx 80rpx;
  position: relative;
  overflow: hidden;
}

/* 装饰元素 */
.login-container::before {
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

.login-container::after {
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

/* Logo区域 */
.logo-section {
  text-align: center;
  margin-bottom: 160rpx;
  animation: fadeInDown 0.6s ease-out;
  position: relative;
  z-index: 1;
}

.logo-circle {
  width: 200rpx;
  height: 200rpx;
  background: linear-gradient(135deg, #07c160 0%, #06ad56 100%);
  border-radius: 50rpx;
  margin: 0 auto 40rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 16rpx 40rpx rgba(7, 193, 96, 0.3);
}

.logo-text {
  color: white;
  font-size: 80rpx;
  font-weight: bold;
  letter-spacing: 4rpx;
}

.app-name-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16rpx;
  margin-bottom: 16rpx;
  flex-wrap: wrap;
}

.app-name {
  font-size: 56rpx;
  font-weight: 600;
  color: #1a1a1a;
}

.author-text {
  font-size: 24rpx;
  color: #64748b;
  font-weight: 500;
}

.app-slogan {
  font-size: 28rpx;
  color: #8c8c8c;
}

/* 登录按钮区域 */
.login-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  animation: fadeInUp 0.6s ease-out 0.2s both;
  position: relative;
  z-index: 1;
}

.experience-entry {
  background: #ffffff;
  border-radius: 24rpx;
  padding: 32rpx 28rpx;
  margin-bottom: 40rpx;
  box-shadow: 0 12rpx 32rpx rgba(7, 193, 96, 0.12);
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.agreement-section {
  background: #ffffff;
  border-radius: 24rpx;
  padding: 24rpx 28rpx;
  margin-bottom: 30rpx;
  box-shadow: 0 8rpx 24rpx rgba(7, 193, 96, 0.1);
}

.agreement-label {
  display: flex;
  align-items: flex-start;
  gap: 16rpx;
}

.agreement-text {
  font-size: 26rpx;
  color: #4a4a4a;
  line-height: 1.6;
}

.agreement-tip {
  margin-top: 16rpx;
  font-size: 24rpx;
  color: #9e9e9e;
}

.experience-title {
  font-size: 30rpx;
  font-weight: 600;
  color: #1a1a1a;
}

.experience-desc {
  font-size: 26rpx;
  color: #7a7a7a;
  line-height: 1.6;
}

.experience-btn {
  height: 84rpx;
  line-height: 84rpx;
  border-radius: 42rpx;
  background: linear-gradient(135deg, #e8f9ef 0%, #def5e7 100%);
  color: #07c160;
  font-size: 28rpx;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
}

.experience-btn::after {
  border: none;
}

.login-form-card {
  background: #ffffff;
  border-radius: 24rpx;
  padding: 40rpx 36rpx;
  box-shadow: 0 12rpx 36rpx rgba(7, 193, 96, 0.18);
  display: flex;
  flex-direction: column;
  gap: 32rpx;
}

.input-group {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.input-label {
  font-size: 28rpx;
  color: #1a1a1a;
  font-weight: 600;
}

.form-input {
  width: 100%;
  height: 90rpx;
  border-radius: 20rpx;
  border: 2rpx solid #e5e5e5;
  background: #fdfdfd;
  padding: 0 28rpx;
  font-size: 30rpx;
  color: #1a1a1a;
  transition: border-color 0.2s ease;
}

.form-input:focus {
  border-color: #07c160;
}

.placeholder {
  color: #bfbfbf;
}

.login-btn {
  width: 100%;
  height: 90rpx;
  border-radius: 50rpx;
  background: linear-gradient(135deg, #07c160 0%, #06ad56 100%);
  color: #ffffff;
  font-size: 32rpx;
  font-weight: 500;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8rpx 24rpx rgba(7, 193, 96, 0.35);
  transition: all 0.3s ease;
}

.login-btn::after {
  border: none;
}

.login-btn.btn-hover {
  transform: scale(0.98);
  box-shadow: 0 4rpx 16rpx rgba(7, 193, 96, 0.3);
}

.login-btn.btn-disabled {
  opacity: 0.6;
  pointer-events: none;
}

.login-tip {
  text-align: center;
  color: #a1a1a1;
  font-size: 24rpx;
  line-height: 1.6;
}

.link-text {
  color: #666;
  text-decoration: underline;
}

/* 加载状态容器 */
.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40rpx 0;
  margin-bottom: 20rpx;
}

.loading-spinner {
  width: 60rpx;
  height: 60rpx;
  border: 4rpx solid rgba(7, 193, 96, 0.2);
  border-top-color: #07c160;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 20rpx;
}

.loading-text {
  font-size: 28rpx;
  color: #07c160;
  font-weight: 500;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.loading-icon {
  width: 48rpx;
  height: 48rpx;
  border: 3rpx solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

/* 错误信息展示 */
.error-message {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
  padding: 24rpx 32rpx;
  margin-bottom: 20rpx;
  background: #fff3cd;
  border: 2rpx solid #ffc107;
  border-radius: 16rpx;
  animation: slideDown 0.3s ease-out;
}

.error-icon {
  font-size: 32rpx;
}

.error-text {
  font-size: 26rpx;
  color: #856404;
  flex: 1;
  text-align: center;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-20rpx);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
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
