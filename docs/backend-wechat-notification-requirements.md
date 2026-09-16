# 后端微信通知功能实现要求

## 概述

本文档列出了实现微信绑定和通知功能需要后端配合完成的所有内容。请按照优先级逐步实现。

---

## 一、必须实现（高优先级）

### 1.1 扩展用户信息更新接口

**接口**: `PUT /api/users/me`

**需要扩展的功能**:

1. **支持绑定微信**:
   - 接收前端传来的 `wechatCode`（微信登录凭证）
   - 调用微信API `https://api.weixin.qq.com/sns/jscode2session` 换取 `openId`
   - 将 `openId` 保存到用户的 `wechatOpenId` 字段

2. **支持解绑微信**:
   - 接收 `wechatOpenId: null` 的请求
   - 将用户的 `wechatOpenId` 字段设置为 `null`

3. **返回模板ID**（建议）:
   - 在响应中返回 `wechatTemplateId` 字段
   - 值从环境变量 `WECHAT_TEMPLATE_ID` 读取

**请求示例**:
```json
// 绑定微信
{
  "wechatCode": "微信登录凭证code",
  "wechatUserInfo": {
    "nickName": "用户昵称",
    "avatarUrl": "头像URL"
  }
}

// 解绑微信
{
  "wechatOpenId": null
}
```

**响应示例**:
```json
{
  "userId": "admin_001",
  "username": "admin",
  "role": "admin",
  "wechatOpenId": "wx_openid_xxx",
  "wechatTemplateId": "YOUR_TEMPLATE_ID",  // 建议返回
  ...
}
```

---

### 1.2 实现微信通知发送接口

**接口**: `POST /api/notifications/wechat`

**权限**: admin权限（需要认证）

**功能**: 向已绑定微信的管理员和admin用户发送异常数据通知

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
    "details": [
      {
        "name": "h",
        "reason": "出勤时长差异超过1小时",
        "startTime": "2025-11-18T00:00:00.000Z"
      }
    ]
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

**部分成功响应**:
```json
{
  "success": true,
  "sent": 1,
  "failed": [
    {
      "userId": "manager_001",
      "wechatOpenId": "wx_openid_yyy",
      "error": "微信API错误: 用户拒绝接收消息 (43101)"
    }
  ]
}
```

**实现要点**:

1. **获取微信 access_token**:
   - 调用 `GET https://api.weixin.qq.com/cgi-bin/token`
   - 参数: `grant_type=client_credential`, `appid`, `secret`
   - **必须实现缓存机制**（有效期7200秒，建议提前5分钟刷新）

2. **发送模板消息**:
   - 调用 `POST https://api.weixin.qq.com/cgi-bin/message/subscribe/send`
   - 使用缓存的 `access_token`
   - 模板数据格式必须与模板配置一致

3. **错误处理**:
   - **必须检查微信API返回的 `errcode`**
   - 即使 `errcode !== 0`，也要在 `failed` 数组中记录
   - 返回详细的错误信息（包括 errcode 和 errmsg）

4. **检查模板ID配置**:
   - 如果 `WECHAT_TEMPLATE_ID` 未配置，返回错误：
   ```json
   {
     "success": true,
     "sent": 0,
     "failed": [
       {
         "userId": "admin_001",
         "wechatOpenId": "wx_openid_xxx",
         "error": "未配置微信模板ID"
       }
     ]
   }
   ```

---

### 1.3 环境变量配置

**必须配置的环境变量**:

```env
# 微信小程序配置（已存在）
WECHAT_APPID=your_miniprogram_appid
WECHAT_SECRET=your_miniprogram_secret

# 微信订阅消息模板ID（新增，必须配置）
WECHAT_TEMPLATE_ID=your_template_id
```

**配置步骤**:

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

## 二、建议实现（中优先级）

### 2.1 详细日志记录

**建议记录以下日志**:

1. **获取 access_token**:
   ```javascript
   console.log('获取微信access_token:', {
     success: true/false,
     expires_in: 7200
   })
   ```

2. **发送模板消息**:
   ```javascript
   console.log('准备发送模板消息:', {
     openid: openid.substring(0, 10) + '...',
     templateId: process.env.WECHAT_TEMPLATE_ID
   })
   
   console.log('微信API返回:', {
     errcode: response.data.errcode,
     errmsg: response.data.errmsg,
     msgid: response.data.msgid
   })
   ```

3. **错误记录**:
   ```javascript
   console.error('微信API返回错误:', {
     errcode: response.data.errcode,
     errmsg: response.data.errmsg,
     openid: openid.substring(0, 10) + '...'
   })
   ```

### 2.2 错误处理优化

**必须正确处理以下错误**:

| 错误码 | 说明 | 处理方式 |
|--------|------|----------|
| 0 | 成功 | 记录到 `sent` |
| 40001 | access_token无效 | 重新获取access_token后重试 |
| 40037 | 模板ID无效 | 检查模板ID配置，记录到 `failed` |
| 43101 | 用户拒绝接收消息 | 记录到 `failed`，不影响其他用户 |
| 47003 | 参数错误 | 检查模板数据格式，记录到 `failed` |

**重要**: 即使微信API返回错误，也要在 `failed` 数组中记录，不要返回 `sent: 1` 而实际发送失败。

---

## 三、实现示例

### 3.1 获取 access_token（带缓存）

```javascript
// 缓存 access_token
let cachedAccessToken = null
let tokenExpireTime = 0

async function getWechatAccessToken() {
  const now = Date.now()
  
  // 如果 token 未过期，直接返回缓存的 token
  if (cachedAccessToken && now < tokenExpireTime) {
    return cachedAccessToken
  }
  
  try {
    const response = await axios.get('https://api.weixin.qq.com/cgi-bin/token', {
      params: {
        grant_type: 'client_credential',
        appid: process.env.WECHAT_APPID,
        secret: process.env.WECHAT_SECRET
      }
    })
    
    if (response.data.errcode) {
      throw new Error(`获取access_token失败: ${response.data.errmsg}`)
    }
    
    // 缓存 token（提前5分钟过期，避免边界情况）
    cachedAccessToken = response.data.access_token
    tokenExpireTime = now + (response.data.expires_in - 300) * 1000
    
    console.log('获取微信access_token成功，有效期:', response.data.expires_in)
    return cachedAccessToken
  } catch (error) {
    console.error('获取微信access_token失败:', error)
    throw error
  }
}
```

### 3.2 发送模板消息

```javascript
async function sendTemplateMessage(openid, data, accessToken) {
  try {
    // 检查模板ID是否配置
    if (!process.env.WECHAT_TEMPLATE_ID) {
      return {
        success: false,
        error: '未配置微信模板ID'
      }
    }
    
    console.log('准备发送模板消息:', {
      openid: openid.substring(0, 10) + '...',
      templateId: process.env.WECHAT_TEMPLATE_ID
    })
    
    const response = await axios.post(
      'https://api.weixin.qq.com/cgi-bin/message/subscribe/send',
      {
        touser: openid,
        template_id: process.env.WECHAT_TEMPLATE_ID,
        page: 'pages/settings/index', // 跳转到设置页面
        data: {
          thing1: { value: '异常数据检测' },
          number2: { value: data.anomalyCount },
          thing3: { value: data.summary || '检测到异常数据' },
          time4: { value: data.uploadedAt }
        }
      },
      {
        params: {
          access_token: accessToken
        }
      }
    )
    
    // 详细记录微信API返回
    console.log('微信API返回:', {
      errcode: response.data.errcode,
      errmsg: response.data.errmsg,
      msgid: response.data.msgid
    })
    
    if (response.data.errcode !== 0) {
      // 记录具体错误
      console.error('微信API返回错误:', {
        errcode: response.data.errcode,
        errmsg: response.data.errmsg,
        openid: openid.substring(0, 10) + '...'
      })
      
      return {
        success: false,
        error: `微信API错误: ${response.data.errmsg} (${response.data.errcode})`
      }
    }
    
    return { success: true, msgid: response.data.msgid }
  } catch (error) {
    console.error('发送模板消息异常:', error)
    return {
      success: false,
      error: error.response?.data?.errmsg || error.message
    }
  }
}
```

### 3.3 通知接口完整实现

```javascript
router.post('/notifications/wechat', authenticate, requireAdmin, async (req, res) => {
  try {
    const { targets, data } = req.body
    
    // 验证参数
    if (!targets || !Array.isArray(targets) || targets.length === 0) {
      return res.status(400).json({
        error: {
          code: 'INVALID_PARAMS',
          message: '目标用户列表不能为空'
        }
      })
    }
    
    if (!data || !data.anomalyCount) {
      return res.status(400).json({
        error: {
          code: 'INVALID_PARAMS',
          message: '通知数据不完整'
        }
      })
    }
    
    // 检查微信模板ID是否配置
    if (!process.env.WECHAT_TEMPLATE_ID) {
      const failed = targets.map(target => ({
        userId: target.userId,
        wechatOpenId: target.wechatOpenId,
        error: '未配置微信模板ID'
      }))
      
      return res.json({
        success: true,
        sent: 0,
        failed: failed
      })
    }
    
    // 获取 access_token
    const accessToken = await getWechatAccessToken()
    
    // 发送通知给所有目标用户
    const results = {
      sent: 0,
      failed: []
    }
    
    for (const target of targets) {
      if (!target.wechatOpenId) {
        results.failed.push({
          userId: target.userId,
          error: '缺少wechatOpenId'
        })
        continue
      }
      
      const result = await sendTemplateMessage(target.wechatOpenId, data, accessToken)
      
      if (result.success) {
        results.sent++
      } else {
        results.failed.push({
          userId: target.userId,
          wechatOpenId: target.wechatOpenId,
          error: result.error
        })
      }
    }
    
    // 返回结果
    res.json({
      success: true,
      sent: results.sent,
      failed: results.failed
    })
    
  } catch (error) {
    console.error('发送微信通知失败:', error)
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: '发送微信通知失败',
        details: {
          error: error.message
        }
      }
    })
  }
})
```

---

## 四、配置检查清单

在实现完成后，请确认以下配置：

- [ ] **环境变量配置**
  - [ ] `WECHAT_APPID` 已配置
  - [ ] `WECHAT_SECRET` 已配置
  - [ ] `WECHAT_TEMPLATE_ID` 已配置（**必须**）

- [ ] **微信公众平台配置**
  - [ ] 已创建订阅消息模板
  - [ ] 已获取模板ID（`template_id`）
  - [ ] 模板字段已配置（thing1, number2, thing3, time4等）

- [ ] **后端代码实现**
  - [ ] 已扩展 `PUT /api/users/me` 接口支持绑定/解绑
  - [ ] 已实现 `POST /api/notifications/wechat` 接口
  - [ ] 已实现 access_token 获取和缓存
  - [ ] 已实现模板消息发送逻辑
  - [ ] 已处理"未配置微信模板ID"的错误情况
  - [ ] 已正确处理微信API返回的错误

- [ ] **测试验证**
  - [ ] 测试绑定微信是否成功
  - [ ] 测试解绑微信是否成功
  - [ ] 测试获取 access_token 是否成功
  - [ ] 测试发送模板消息是否成功
  - [ ] 检查错误处理和日志记录
  - [ ] 测试用户未订阅时的错误处理

---

## 五、常见问题

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

### Q3: access_token 需要每次都获取吗？

**A**: 不需要。必须实现缓存机制：
- access_token 有效期为 7200 秒（2小时）
- 建议提前 5 分钟刷新，避免边界情况
- 避免频繁请求微信API

### Q4: 模板消息格式不正确怎么办？

**A**: 
1. 检查模板字段名是否与配置一致
2. 检查字段类型是否正确（thing、number、time等）
3. 检查字段内容长度是否符合限制
4. 查看微信API返回的错误信息

---

## 六、参考文档

- 微信小程序官方文档:
  - 登录凭证校验: https://developers.weixin.qq.com/miniprogram/dev/api-backend/open-api/login/auth.code2Session.html
  - 订阅消息: https://developers.weixin.qq.com/miniprogram/dev/api-backend/open-api/subscribe-message/subscribeMessage.send.html
  - 获取access_token: https://developers.weixin.qq.com/miniprogram/dev/api-backend/open-api/access-token/auth.getAccessToken.html

- 详细实现指南: `docs/backend-wechat-bind.md`

---

**文档版本**: v1.0  
**最后更新**: 2024-01-XX  
**维护者**: 开发团队

