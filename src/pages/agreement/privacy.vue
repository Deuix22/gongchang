<template>
  <scroll-view scroll-y class="agreement-container">
    <view class="section">
      <view class="title">隐私政策</view>
      <view class="paragraph">
        我们非常重视您的个人信息和隐私保护。本政策说明了我们如何收集、使用、存储与保护您的个人信息，请在使用服务前仔细阅读。
      </view>
    </view>

    <view class="section">
      <view class="subtitle">一、收集的信息范围</view>
      <view class="paragraph">
        根据不同角色，我们可能收集姓名、部门、角色类型、出勤记录、登录时间等业务数据。管理员账号无需微信授权即可登录，普通用户通过微信认证时仅获取基本公开信息。
      </view>
    </view>

    <view class="section">
      <view class="subtitle">二、信息的使用目的</view>
      <view class="paragraph">
        收集的信息仅用于考勤统计、人员管理、异常提醒等核心业务，不会用于与业务无关的目的，也不会向未经授权的第三方披露。
      </view>
    </view>

    <view class="section">
      <view class="subtitle">三、信息的存储与保护</view>
      <view class="paragraph">
        我们在服务器上对您的信息进行安全存储，并采取访问控制、权限管理、日志审计等措施防止信息泄露、滥用或丢失。
      </view>
    </view>

    <view class="section">
      <view class="subtitle">四、您的权利</view>
      <view class="paragraph">
        您可以在登录后查看、纠正或更新个人信息。如需删除账户或停用服务，可通过管理员渠道提出，我们将按流程处理。
      </view>
    </view>

    <view class="section">
      <view class="subtitle">五、政策更新</view>
      <view class="paragraph">
        当法律法规或业务功能发生变化时，我们可能更新隐私政策。重要调整会在小程序内公告，请您关注最新内容。
      </view>
    </view>

    <view class="section">
      <view class="subtitle">六、联系我们</view>
      <view class="paragraph">
        如对隐私保护有任何疑问或建议，请联系企业管理员或维护人员，我们会尽快处理。
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

