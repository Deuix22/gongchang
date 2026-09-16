<template>
  <scroll-view scroll-y class="agreement-container">
    <view class="section">
      <view class="title">用户协议</view>
      <view class="paragraph">
        欢迎使用工厂出勤系统。本协议规定了您在使用本小程序时的权利与义务，请在使用前仔细阅读并充分理解所有条款。
      </view>
    </view>

    <view class="section">
      <view class="subtitle">一、服务内容</view>
      <view class="paragraph">
        工厂出勤系统用于记录和统计出勤信息，包括组员信息、考勤记录、异常提示等业务功能。我们仅在提供这些功能所必需的范围内收集和使用相关数据。
      </view>
    </view>

    <view class="section">
      <view class="subtitle">二、账户与角色</view>
      <view class="paragraph">
        用户首次登录会自动创建账户并授予“组长”角色。管理员和超级管理员由平台统一分配。您应妥善保管账户信息，不得冒用他人身份。
      </view>
    </view>

    <view class="section">
      <view class="subtitle">三、使用规范</view>
      <view class="paragraph">
        您在使用过程中，应遵守法律法规，不得上传、发布或传播违法信息，不得破坏系统安全性与稳定性，不得侵害他人权益。
      </view>
    </view>

    <view class="section">
      <view class="subtitle">四、数据和隐私保护</view>
      <view class="paragraph">
        我们将按照隐私政策保护您的个人信息，并仅在必要范围内使用。未经授权不会向第三方披露或共享您的个人信息。
      </view>
    </view>

    <view class="section">
      <view class="subtitle">五、协议更新</view>
      <view class="paragraph">
        根据业务发展和法律法规变化，我们可能适时更新本协议。更新内容将在小程序中公示，请您关注最新版本。
      </view>
    </view>

    <view class="section">
      <view class="subtitle">六、联系方式</view>
      <view class="paragraph">
        如有疑问或需要帮助，请通过企业管理渠道联系系统管理员。
      </view>
    </view>
  </scroll-view>
</template>

<style lang="scss" scoped>
.agreement-container {
  height: 100vh;
  padding: 40rpx 32rpx;
  box-sizing: border-box;
  background: #f8f9fb;
}

.section {
  margin-bottom: 36rpx;
}

.title {
  font-size: 40rpx;
  font-weight: 600;
  color: #1a1a1a;
  margin-bottom: 24rpx;
}

.subtitle {
  font-size: 32rpx;
  font-weight: 600;
  color: #1a1a1a;
  margin-bottom: 16rpx;
}

.paragraph {
  font-size: 28rpx;
  color: #4a4a4a;
  line-height: 1.7;
}
</style>

