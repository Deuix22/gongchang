# 微信凭证过期问题分析与解决方案

## 问题描述

管理员绑定微信后，凭证经常失效，导致组长推送的信息收不到，需要解绑重新绑定。

## 问题分析

### 1. 微信凭证类型

微信小程序涉及两种凭证：

#### 1.1 OpenID（用户唯一标识）
- **特点**：永久有效，不会过期
- **用途**：标识用户身份，用于发送订阅消息
- **存储位置**：后端数据库 `wechatOpenId` 字段
- **问题**：如果 OpenID 丢失，可能是数据库问题或绑定流程问题

#### 1.2 Access Token（接口调用凭证）
- **特点**：有效期 2 小时，需要定期刷新
- **用途**：调用微信 API（如发送订阅消息）
- **存储位置**：后端内存或缓存
- **问题**：如果未正确刷新，会导致发送失败

#### 1.3 订阅消息授权
- **特点**：用户授权有时效性（通常 1-7 天，取决于模板类型）
- **用途**：允许向用户发送订阅消息
- **问题**：授权过期后，即使有 OpenID 和 Access Token，也无法发送消息

### 2. 常见错误码

| 错误码 | 含义 | 原因 | 解决方案 |
|--------|------|------|----------|
| 40001 | invalid credential | access_token 无效或过期 | 刷新 access_token |
| 43101 | 用户拒绝接收消息 | 用户未授权或授权过期 | 引导用户重新授权 |
| 47003 | 参数错误 | 模板数据格式错误 | 检查模板数据格式 |
| 40029 | invalid code | 登录凭证 code 过期 | 重新获取 code |

### 3. 问题根源

根据错误日志 `43101: 用户拒绝接收消息`，问题可能是：

1. **订阅消息授权过期**（最可能）
   - 用户首次绑定微信时授权了订阅消息
   - 授权有效期到期后，需要重新授权
   - 但前端没有检测授权状态，后端也没有处理授权过期的情况

2. **Access Token 未正确刷新**
   - 后端可能没有实现 access_token 的自动刷新机制
   - 或者刷新逻辑有 bug，导致使用了过期的 token

3. **OpenID 丢失**
   - 数据库操作导致 OpenID 被清空
   - 绑定流程中 OpenID 未正确保存

## 解决方案

### 方案 1：后端自动刷新 Access Token（必须实现）

**问题**：Access Token 2 小时过期，需要自动刷新

**解决方案**：

```javascript
// 后端实现示例
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
    
    console.log('✅ 获取微信access_token成功，有效期:', response.data.expires_in, '秒')
    return cachedAccessToken
  } catch (error) {
    console.error('❌ 获取微信access_token失败:', error)
    throw error
  }
}

// 在发送消息前，确保获取有效的 access_token
async function sendTemplateMessage(openid, data) {
  const accessToken = await getWechatAccessToken() // 自动刷新
  
  try {
    const response = await axios.post(
      'https://api.weixin.qq.com/cgi-bin/message/subscribe/send',
      {
        touser: openid,
        template_id: process.env.WECHAT_TEMPLATE_ID,
        page: 'pages/settings/index',
        data: {
          // ... 模板数据
        }
      },
      {
        params: {
          access_token: accessToken
        }
      }
    )
    
    // 如果 access_token 过期，自动刷新后重试
    if (response.data.errcode === 40001) {
      console.warn('⚠️ access_token过期，自动刷新后重试')
      cachedAccessToken = null // 清除缓存
      tokenExpireTime = 0
      const newAccessToken = await getWechatAccessToken()
      
      // 重试发送
      const retryResponse = await axios.post(
        'https://api.weixin.qq.com/cgi-bin/message/subscribe/send',
        {
          touser: openid,
          template_id: process.env.WECHAT_TEMPLATE_ID,
          page: 'pages/settings/index',
          data: {
            // ... 模板数据
          }
        },
        {
          params: {
            access_token: newAccessToken
          }
        }
      )
      
      return retryResponse.data
    }
    
    return response.data
  } catch (error) {
    console.error('发送模板消息失败:', error)
    throw error
  }
}
```

### 方案 2：处理订阅消息授权过期（必须实现）

**问题**：用户授权过期后，错误码 43101，需要引导用户重新授权

**解决方案**：

#### 2.1 后端处理授权过期

```javascript
async function sendTemplateMessage(openid, data) {
  try {
    const accessToken = await getWechatAccessToken()
    const response = await axios.post(
      'https://api.weixin.qq.com/cgi-bin/message/subscribe/send',
      {
        touser: openid,
        template_id: process.env.WECHAT_TEMPLATE_ID,
        page: 'pages/settings/index',
        data: {
          // ... 模板数据
        }
      },
      {
        params: {
          access_token: accessToken
        }
      }
    )
    
    // 处理授权过期
    if (response.data.errcode === 43101) {
      console.warn(`⚠️ 用户 ${openid} 订阅消息授权已过期`)
      // 标记该用户需要重新授权
      await markUserNeedReauthorize(openid)
      return {
        success: false,
        errcode: 43101,
        errmsg: '用户订阅消息授权已过期，需要重新授权'
      }
    }
    
    return response.data
  } catch (error) {
    console.error('发送模板消息失败:', error)
    throw error
  }
}

// 标记用户需要重新授权
async function markUserNeedReauthorize(openid) {
  // 在数据库中标记该用户需要重新授权
  // 例如：设置 user.wechatAuthExpired = true
  await User.updateOne(
    { wechatOpenId: openid },
    { wechatAuthExpired: true, authExpiredAt: new Date() }
  )
}
```

#### 2.2 前端检测授权状态

在设置页面检查用户是否需要重新授权：

```javascript
// src/pages/settings/index.vue
const checkWechatAuthStatus = async () => {
  try {
    const user = await getCurrentUser()
    if (user?.wechatAuthExpired) {
      uni.showModal({
        title: '订阅消息授权已过期',
        content: '您的订阅消息授权已过期，需要重新授权才能接收通知。是否现在重新授权？',
        confirmText: '重新授权',
        cancelText: '稍后',
        success: async (res) => {
          if (res.confirm) {
            // 引导用户重新授权
            await requestWechatSubscribeMessage()
          }
        }
      })
    }
  } catch (error) {
    console.error('检查微信授权状态失败:', error)
  }
}

// 请求订阅消息授权
const requestWechatSubscribeMessage = async () => {
  try {
    // 请求用户授权订阅消息
    const tmplIds = [uni.getStorageSync('wechatTemplateId') || 'YOUR_TEMPLATE_ID']
    const res = await uni.requestSubscribeMessage({
      tmplIds: tmplIds
    })
    
    if (res[tmplIds[0]] === 'accept') {
      // 用户同意授权，通知后端更新授权状态
      await updateCurrentUser({
        wechatAuthExpired: false
      })
      
      uni.showToast({
        title: '授权成功',
        icon: 'success'
      })
    } else {
      uni.showToast({
        title: '需要授权才能接收通知',
        icon: 'none'
      })
    }
  } catch (error) {
    console.error('请求订阅消息授权失败:', error)
  }
}
```

### 方案 3：定期检查并提醒用户重新授权

**实现**：在设置页面加载时，检查授权状态，如果过期则提示用户

```javascript
// src/pages/settings/index.vue
onMounted(async () => {
  // ... 其他初始化代码
  
  // 检查微信授权状态
  if (isWechatBound.value) {
    await checkWechatAuthStatus()
  }
})
```

### 方案 4：发送失败时自动处理

**实现**：当发送失败且错误码为 43101 时，自动标记用户需要重新授权

```javascript
// 后端发送通知接口
router.post('/notifications/wechat', authenticate, async (req, res) => {
  const { targets, data } = req.body
  const results = {
    sent: 0,
    failed: []
  }
  
  for (const target of targets) {
    try {
      const result = await sendTemplateMessage(target.wechatOpenId, data)
      
      if (result.errcode === 0) {
        results.sent++
      } else if (result.errcode === 43101) {
        // 授权过期，标记用户需要重新授权
        await markUserNeedReauthorize(target.wechatOpenId)
        results.failed.push({
          userId: target.userId,
          wechatOpenId: target.wechatOpenId,
          error: `用户拒绝接收消息 (${result.errcode})，需要重新授权`
        })
      } else {
        results.failed.push({
          userId: target.userId,
          wechatOpenId: target.wechatOpenId,
          error: result.errmsg || '未知错误'
        })
      }
    } catch (error) {
      results.failed.push({
        userId: target.userId,
        wechatOpenId: target.wechatOpenId,
        error: error.message || '发送失败'
      })
    }
  }
  
  res.json({
    success: results.sent > 0,
    sent: results.sent,
    failed: results.failed
  })
})
```

## 最佳实践

### 1. 后端实现检查清单

- [ ] 实现 access_token 自动刷新机制
- [ ] 在发送消息前检查 access_token 是否过期
- [ ] 处理 40001 错误（access_token 过期），自动刷新后重试
- [ ] 处理 43101 错误（授权过期），标记用户需要重新授权
- [ ] 在用户信息中增加 `wechatAuthExpired` 字段
- [ ] 记录授权过期时间 `authExpiredAt`

### 2. 前端实现检查清单

- [ ] 在设置页面检查授权状态
- [ ] 如果授权过期，提示用户重新授权
- [ ] 实现重新授权流程（调用 `uni.requestSubscribeMessage`）
- [ ] 授权成功后，通知后端更新授权状态

### 3. 监控和日志

- [ ] 记录每次发送消息的结果
- [ ] 记录授权过期的用户
- [ ] 定期统计发送成功率
- [ ] 发送失败时记录详细错误信息

## 临时解决方案

如果暂时无法实现完整的解决方案，可以：

1. **定期提醒用户重新绑定**
   - 在设置页面显示"如果收不到通知，请重新绑定微信"
   - 或者在发送失败时，提示用户重新绑定

2. **增加重试机制**
   - 发送失败时，如果是 43101 错误，提示用户重新授权
   - 如果是 40001 错误，自动刷新 token 后重试

## 总结

凭证失效的主要原因：
1. **Access Token 过期**（2小时）- 需要自动刷新
2. **订阅消息授权过期**（1-7天）- 需要引导用户重新授权
3. **OpenID 丢失**（较少见）- 需要检查绑定流程

建议优先实现：
1. Access Token 自动刷新机制
2. 授权过期检测和提醒
3. 发送失败时的错误处理和重试

