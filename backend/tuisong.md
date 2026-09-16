# 后端配合事项清单

## 📋 概述

本文档列出了实现微信绑定和通知功能需要后端配合完成的所有事项。请按照清单逐项完成。

---

## ✅ 一、必须实现（高优先级）

### 1. 扩展用户信息更新接口

**接口**: `PUT /api/users/me`

**需要实现的功能**:

#### 1.1 支持绑定微信

**请求示例**:
```json
{
  "wechatCode": "微信登录凭证code",
  "wechatUserInfo": {
    "nickName": "用户昵称",
    "avatarUrl": "头像URL"
  }
}
```

**实现步骤**:
1. 接收 `wechatCode` 参数
2. 调用微信API换取openId：
   ```
   GET https://api.weixin.qq.com/sns/jscode2session
   参数：
   - appid: WECHAT_APPID
   - secret: WECHAT_SECRET
   - js_code: wechatCode
   - grant_type: authorization_code
   ```
3. 将返回的 `openid` 保存到用户的 `wechatOpenId` 字段

#### 1.2 支持解绑微信

**请求示例**:
```json
{
  "wechatOpenId": null
}
```

**实现步骤**:
1. 检查 `wechatOpenId` 是否为 `null` 或空字符串
2. 将用户的 `wechatOpenId` 字段设置为 `null`

#### 1.3 返回模板ID（重要）

**响应必须包含**:
```json
{
  "userId": "admin_001",
  "username": "admin",
  "role": "admin",
  "wechatOpenId": "wx_openid_xxx",
  "wechatTemplateId": "YOUR_TEMPLATE_ID",  // ⚠️ 必须返回
  ...
}
```

**实现代码**:
```javascript
res.json({
  ...userInfo,
  wechatTemplateId: process.env.WECHAT_TEMPLATE_ID || null
})
```

---

### 2. 实现微信通知发送接口

**接口**: `POST /api/notifications/wechat`

**权限**: admin权限（需要认证）

**请求格式**:
```json
{
  "targets": [
    {
      "userId": "admin_001",
      "wechatOpenId": "wx_openid_xxx"
    }
  ],
  "data": {
    "anomalyCount": 7,
    "summary": "出勤时长差异超过1小时: 5条；上班时间晚于8:00: 2条",
    "uploadedAt": "2024-01-01 10:30",
    "details": [...]
  }
}
```

**响应格式**:
```json
{
  "success": true,
  "sent": 1,
  "failed": []
}
```

**实现步骤**:

1. **检查模板ID配置**:
   ```javascript
   if (!process.env.WECHAT_TEMPLATE_ID) {
     return res.json({
       success: true,
       sent: 0,
       failed: targets.map(t => ({
         userId: t.userId,
         wechatOpenId: t.wechatOpenId,
         error: '未配置微信模板ID'
       }))
     })
   }
   ```

2. **获取并缓存 access_token**:
   ```javascript
   // 缓存 access_token（有效期7200秒）
   let cachedAccessToken = null
   let tokenExpireTime = 0
   
   async function getWechatAccessToken() {
     const now = Date.now()
     if (cachedAccessToken && now < tokenExpireTime) {
       return cachedAccessToken
     }
     
     const response = await axios.get('https://api.weixin.qq.com/cgi-bin/token', {
       params: {
         grant_type: 'client_credential',
         appid: process.env.WECHAT_APPID,
         secret: process.env.WECHAT_SECRET
       }
     })
     
     cachedAccessToken = response.data.access_token
     tokenExpireTime = now + (response.data.expires_in - 300) * 1000
     return cachedAccessToken
   }
   ```

3. **发送模板消息**:
   ```javascript
   async function sendTemplateMessage(openid, data, accessToken) {
     const response = await axios.post(
       'https://api.weixin.qq.com/cgi-bin/message/subscribe/send',
       {
         touser: openid,
         template_id: process.env.WECHAT_TEMPLATE_ID,
         page: 'pages/settings/index',
         data: {
           thing1: { value: '异常数据检测' },
           number2: { value: data.anomalyCount },
           thing3: { value: data.summary || '检测到异常数据' },
           time4: { value: data.uploadedAt }
         }
       },
       {
         params: { access_token: accessToken }
       }
     )
     
     // ⚠️ 重要：必须检查 errcode
     if (response.data.errcode !== 0) {
       return {
         success: false,
         error: `微信API错误: ${response.data.errmsg} (${response.data.errcode})`
       }
     }
     
     return { success: true }
   }
   ```

4. **错误处理**:
   - **必须**检查微信API返回的 `errcode`
   - 即使 `errcode !== 0`，也要在 `failed` 数组中记录
   - 返回详细的错误信息（包括 errcode 和 errmsg）

---

### 3. 环境变量配置

**必须配置的环境变量**:

```env
# 微信小程序配置
WECHAT_APPID=your_miniprogram_appid
WECHAT_SECRET=your_miniprogram_secret

# 微信订阅消息模板ID（⚠️ 必须配置）
WECHAT_TEMPLATE_ID=your_template_id
```

**获取模板ID步骤**:
1. 登录 [微信公众平台](https://mp.weixin.qq.com/)
2. 进入小程序管理后台
3. 在"功能" → "订阅消息"中：
   - 选择"公共模板库"或"我的模板"
   - 选择合适的模板（建议选择"异常提醒"或"系统通知"类）
   - 配置模板字段（推荐：thing1, number2, thing3, time4）
   - 获取 `template_id`
4. 将模板ID添加到 `.env` 文件中
5. **重启后端服务**

---

## ⚠️ 二、重要注意事项

### 1. 错误处理

**必须正确处理以下情况**:

| 错误码 | 说明 | 处理方式 |
|--------|------|----------|
| 0 | 成功 | 记录到 `sent` |
| 40001 | access_token无效 | 重新获取access_token后重试 |
| 40037 | 模板ID无效 | 检查模板ID配置，记录到 `failed` |
| 43101 | 用户拒绝接收消息 | 记录到 `failed`，不影响其他用户 |
| 47003 | 参数错误 | 检查模板数据格式，记录到 `failed` |

**重要**: 即使微信API返回错误，也要在 `failed` 数组中记录，不要返回 `sent: 1` 而实际发送失败。

### 2. access_token 缓存

- **必须**实现缓存机制，避免频繁请求
- access_token 有效期为 7200 秒（2小时）
- 建议提前 5 分钟刷新，避免边界情况

### 3. 日志记录

**建议记录以下日志**:

```javascript
// 获取 access_token
console.log('获取微信access_token:', { success: true/false })

// 发送模板消息
console.log('准备发送模板消息:', {
  openid: openid.substring(0, 10) + '...',
  templateId: process.env.WECHAT_TEMPLATE_ID
})

// 微信API返回
console.log('微信API返回:', {
  errcode: response.data.errcode,
  errmsg: response.data.errmsg,
  msgid: response.data.msgid
})

// 错误记录
if (response.data.errcode !== 0) {
  console.error('微信API返回错误:', {
    errcode: response.data.errcode,
    errmsg: response.data.errmsg
  })
}
```

---

## 📝 三、实现检查清单

在实现完成后，请确认以下事项：

- [ ] **环境变量配置**
  - [ ] `WECHAT_APPID` 已配置
  - [ ] `WECHAT_SECRET` 已配置
  - [ ] `WECHAT_TEMPLATE_ID` 已配置（**必须**）

- [ ] **接口实现**
  - [ ] `PUT /api/users/me` 支持绑定微信（通过 wechatCode 换取 openId）
  - [ ] `PUT /api/users/me` 支持解绑微信（设置 wechatOpenId 为 null）
  - [ ] `PUT /api/users/me` 返回 `wechatTemplateId` 字段
  - [ ] `POST /api/notifications/wechat` 接口已实现
  - [ ] 已实现 access_token 获取和缓存
  - [ ] 已实现模板消息发送逻辑
  - [ ] 已处理"未配置微信模板ID"的错误情况

- [ ] **错误处理**
  - [ ] 正确处理微信API返回的错误（检查 errcode）
  - [ ] 即使发送失败，也在 `failed` 数组中记录
  - [ ] 返回详细的错误信息

- [ ] **测试验证**
  - [ ] 测试绑定微信是否成功
  - [ ] 测试解绑微信是否成功
  - [ ] 测试获取 access_token 是否成功
  - [ ] 测试发送模板消息是否成功
  - [ ] 测试用户未订阅时的错误处理
  - [ ] 检查日志记录是否完整

---

## 🔗 四、参考文档

- **详细实现指南**: `docs/backend-wechat-bind.md`
- **完整实现要求**: `docs/backend-wechat-notification-requirements.md`
- **微信小程序官方文档**:
  - 登录凭证校验: https://developers.weixin.qq.com/miniprogram/dev/api-backend/open-api/login/auth.code2Session.html
  - 订阅消息: https://developers.weixin.qq.com/miniprogram/dev/api-backend/open-api/subscribe-message/subscribeMessage.send.html
  - 获取access_token: https://developers.weixin.qq.com/miniprogram/dev/api-backend/open-api/access-token/auth.getAccessToken.html

---

## 📞 五、常见问题

### Q1: 后端返回成功但用户未收到通知？

**A**: 最可能的原因是用户未订阅订阅消息模板。请检查：
1. 后端日志中微信API返回的 `errcode`
2. 如果 `errcode` 是 `43101`，说明用户未订阅
3. 前端会在绑定微信时引导用户订阅，但用户可能拒绝了

### Q2: 如何验证通知是否发送成功？

**A**: 
1. 检查后端日志，查看微信API返回的 `errcode`
2. 如果 `errcode` 是 `0`，说明发送成功
3. 如果返回了 `msgid`，说明消息已发送到微信服务器

### Q3: 为什么必须返回 wechatTemplateId？

**A**: 前端需要在绑定微信成功后引导用户订阅消息模板。如果没有模板ID，无法调用 `uni.requestSubscribeMessage` API。

---

**文档版本**: v1.0  
**最后更新**: 2024-01-XX  
**维护者**: 开发团队

