# 后端微信绑定功能实现指南

## 概述

前端已实现微信绑定功能，管理员和admin用户可以在小程序中绑定微信，用于接收异常数据通知。后端需要实现相应的接口支持。

---

## 1. 接口更新需求

### 1.1 更新用户信息接口（已存在，需要扩展）

**接口**: `PUT /api/users/me`

**权限**: 需要认证（任何已登录用户）

**当前功能**: 更新当前用户信息（如昵称等）

**需要扩展**: 支持通过微信登录凭证（code）绑定微信OpenID

### 1.2 微信通知发送接口（新增）

**接口**: `POST /api/notifications/wechat`

**权限**: 需要认证（admin权限）

**功能**: 向已绑定微信的管理员和admin用户发送异常数据通知

---

## 2. 请求格式

### 2.1 请求头

```
Authorization: Bearer <token>
Content-Type: application/json
```

### 2.2 请求体

当用户绑定微信时，前端会发送以下格式的请求：

```json
{
  "wechatCode": "微信登录凭证code（由uni.login获取）",
  "wechatUserInfo": {
    "nickName": "用户微信昵称",
    "avatarUrl": "用户微信头像URL"
  }
}
```

**字段说明**:
- `wechatCode`: 微信小程序登录凭证，有效期5分钟，用于换取openId（绑定微信时使用）
- `wechatUserInfo`: 用户微信信息（可选，用于显示）
- `wechatOpenId`: 设置为 `null` 或空字符串时，用于解绑微信

**解绑微信请求示例**:
```json
{
  "wechatOpenId": null
}
```

---

## 3. 后端处理流程

### 3.1 完整流程

**绑定微信流程**:
```
1. 接收请求，验证用户身份（通过token）
2. 检查请求体中是否包含 wechatCode
3. 如果包含 wechatCode，调用微信API换取openId
4. 将 openId 保存到当前用户的 wechatOpenId 字段
5. 返回更新后的用户信息
```

**解绑微信流程**:
```
1. 接收请求，验证用户身份（通过token）
2. 检查请求体中 wechatOpenId 是否为 null 或空字符串
3. 将当前用户的 wechatOpenId 字段设置为 null 或空字符串
4. 返回更新后的用户信息（wechatOpenId 应为 null）
```

### 3.2 调用微信API换取openId

**微信API地址**:
```
GET https://api.weixin.qq.com/sns/jscode2session
```

**请求参数**:
- `appid`: 小程序AppID（从配置中获取）
- `secret`: 小程序AppSecret（从配置中获取）
- `js_code`: 前端传来的 `wechatCode`
- `grant_type`: `authorization_code`

**完整URL示例**:
```
https://api.weixin.qq.com/sns/jscode2session?appid=YOUR_APPID&secret=YOUR_SECRET&js_code=CODE&grant_type=authorization_code
```

**微信API响应**:
```json
{
  "openid": "用户唯一标识",
  "session_key": "会话密钥",
  "unionid": "用户统一标识（可选，需要开放平台）"
}
```

**错误响应**:
```json
{
  "errcode": 40029,
  "errmsg": "invalid code"
}
```

### 3.3 保存openId

将获取到的 `openid` 保存到当前用户的 `wechatOpenId` 字段：

```javascript
// 伪代码示例
const user = await User.findById(currentUserId)
user.wechatOpenId = openid
await user.save()
```

---

## 4. 响应格式

### 4.1 成功响应 (200)

```json
{
  "userId": "admin_001",
  "username": "admin",
  "nickName": "管理员",
  "role": "admin",
  "wechatOpenId": "wx_openid_xxx",
  "department": "管理",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T10:00:00.000Z"
}
```

**关键字段**:
- `wechatOpenId`: 必须返回，前端会根据此字段判断是否已绑定

### 4.2 错误响应

#### 4.2.1 微信API调用失败 (400)

```json
{
  "error": {
    "code": "WECHAT_API_ERROR",
    "message": "获取微信OpenID失败：invalid code",
    "details": {
      "errcode": 40029,
      "errmsg": "invalid code"
    }
  }
}
```

#### 4.2.2 缺少参数 (400)

```json
{
  "error": {
    "code": "INVALID_PARAMS",
    "message": "缺少微信登录凭证",
    "details": {}
  }
}
```

#### 4.2.3 用户未找到 (404)

```json
{
  "error": {
    "code": "USER_NOT_FOUND",
    "message": "用户不存在",
    "details": {}
  }
}
```

---

## 5. 数据库字段要求

### 5.1 用户表字段

确保用户表包含以下字段：

```javascript
{
  userId: String,        // 用户ID
  username: String,      // 账号
  password: String,     // 密码（加密）
  nickName: String,      // 昵称
  role: String,         // 角色：admin, manager, leader
  wechatOpenId: String, // 微信OpenID（新增或已存在）
  department: String,    // 部门（可选）
  createdAt: Date,      // 创建时间
  updatedAt: Date       // 更新时间
}
```

**关键字段**:
- `wechatOpenId`: 字符串类型，可选，用于存储微信OpenID
- 建议添加索引以提高查询效率

---

## 6. 实现示例

### 6.1 Express.js + Mongoose 示例

```javascript
// routes/user.js
router.put('/users/me', authenticate, async (req, res) => {
  try {
    const userId = req.user.userId // 从token中获取
    const { wechatCode, wechatUserInfo, nickName } = req.body
    
    // 查找用户
    const user = await User.findOne({ userId })
    if (!user) {
      return res.status(404).json({
        error: {
          code: 'USER_NOT_FOUND',
          message: '用户不存在'
        }
      })
    }
    
    // 处理微信绑定/解绑
    if (wechatCode) {
      // 绑定微信：通过code换取openId
      try {
        // 调用微信API换取openId
        const wechatResponse = await axios.get('https://api.weixin.qq.com/sns/jscode2session', {
          params: {
            appid: process.env.WECHAT_APPID,
            secret: process.env.WECHAT_SECRET,
            js_code: wechatCode,
            grant_type: 'authorization_code'
          }
        })
        
        if (wechatResponse.data.errcode) {
          return res.status(400).json({
            error: {
              code: 'WECHAT_API_ERROR',
              message: `获取微信OpenID失败：${wechatResponse.data.errmsg}`,
              details: {
                errcode: wechatResponse.data.errcode,
                errmsg: wechatResponse.data.errmsg
              }
            }
          })
        }
        
        // 保存openId
        user.wechatOpenId = wechatResponse.data.openid
        
        // 可选：保存微信用户信息
        if (wechatUserInfo) {
          user.wechatNickName = wechatUserInfo.nickName
          user.wechatAvatarUrl = wechatUserInfo.avatarUrl
        }
      } catch (wechatError) {
        console.error('调用微信API失败:', wechatError)
        return res.status(400).json({
          error: {
            code: 'WECHAT_API_ERROR',
            message: '调用微信API失败',
            details: {
              error: wechatError.message
            }
          }
        })
      }
    } else if (req.body.wechatOpenId === null || req.body.wechatOpenId === '') {
      // 解绑微信：将wechatOpenId设置为null
      user.wechatOpenId = null
      // 可选：清除微信用户信息
      user.wechatNickName = null
      user.wechatAvatarUrl = null
    }
    
    // 更新其他字段（如昵称）
    if (nickName !== undefined) {
      user.nickName = nickName
    }
    
    // 保存用户
    await user.save()
    
    // 返回更新后的用户信息
    res.json({
      userId: user.userId,
      username: user.username,
      nickName: user.nickName,
      role: user.role,
      wechatOpenId: user.wechatOpenId,
      department: user.department,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    })
    
  } catch (error) {
    console.error('更新用户信息失败:', error)
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: '更新用户信息失败',
        details: {
          error: error.message
        }
      }
    })
  }
})
```

### 6.2 环境变量配置

在 `.env` 文件中配置微信小程序信息：

```env
WECHAT_APPID=your_miniprogram_appid
WECHAT_SECRET=your_miniprogram_secret
```

---

## 7. 安全注意事项

### 7.1 AppSecret 保护

- **不要**将 AppSecret 暴露在前端代码中
- **必须**在后端服务器上存储和使用 AppSecret
- 建议使用环境变量或密钥管理服务

### 7.2 Code 有效期

- 微信登录凭证 `code` 的有效期只有 **5分钟**
- 前端获取 code 后应立即发送到后端
- 后端收到 code 后应立即调用微信API，不要延迟

### 7.3 用户身份验证

- 必须验证用户的登录状态（通过token）
- 只能更新当前登录用户的信息，不能更新其他用户的信息

---

## 8. 测试建议

### 8.1 单元测试

```javascript
// 测试用例示例
describe('PUT /api/users/me - 绑定微信', () => {
  it('应该成功绑定微信', async () => {
    const mockWechatResponse = {
      data: {
        openid: 'test_openid_123',
        session_key: 'test_session_key'
      }
    }
    
    // Mock 微信API调用
    axios.get = jest.fn().mockResolvedValue(mockWechatResponse)
    
    const response = await request(app)
      .put('/api/users/me')
      .set('Authorization', `Bearer ${validToken}`)
      .send({
        wechatCode: 'valid_code'
      })
    
    expect(response.status).toBe(200)
    expect(response.body.wechatOpenId).toBe('test_openid_123')
  })
  
  it('应该处理无效的微信code', async () => {
    const mockWechatResponse = {
      data: {
        errcode: 40029,
        errmsg: 'invalid code'
      }
    }
    
    axios.get = jest.fn().mockResolvedValue(mockWechatResponse)
    
    const response = await request(app)
      .put('/api/users/me')
      .set('Authorization', `Bearer ${validToken}`)
      .send({
        wechatCode: 'invalid_code'
      })
    
    expect(response.status).toBe(400)
    expect(response.body.error.code).toBe('WECHAT_API_ERROR')
  })
})
```

### 8.2 集成测试

1. **测试正常绑定流程**:
   - 使用有效的微信code
   - 验证openId是否正确保存
   - 验证返回的用户信息包含wechatOpenId

2. **测试错误处理**:
   - 使用过期的code
   - 使用无效的code
   - 测试网络错误情况

3. **测试权限控制**:
   - 验证未登录用户无法绑定
   - 验证用户只能绑定自己的账号

---

## 9. 微信小程序配置

### 9.1 获取 AppID 和 AppSecret

1. 登录 [微信公众平台](https://mp.weixin.qq.com/)
2. 进入小程序管理后台
3. 在"开发" → "开发管理" → "开发设置"中查看：
   - **AppID（小程序ID）**
   - **AppSecret（小程序密钥）**（需要重置后查看）

### 9.2 配置服务器域名

在"开发" → "开发管理" → "开发设置" → "服务器域名"中配置：
- **request合法域名**: 添加后端API域名
- **uploadFile合法域名**: 添加后端API域名（如需要）

---

## 10. 常见问题

### Q1: 如何验证绑定是否成功？

**A**: 前端会调用 `GET /api/users/me` 接口检查返回的用户信息中是否包含 `wechatOpenId` 字段。

### Q2: 一个微信OpenID可以绑定多个账号吗？

**A**: 可以，但不建议。建议在后端添加唯一性检查，或者允许一个OpenID绑定多个账号（用于通知多个用户）。

### Q3: 如果用户解绑微信怎么办？

**A**: 
1. 前端会发送请求将 `wechatOpenId` 设置为 `null` 来解绑
2. 后端需要处理 `wechatOpenId: null` 的情况，将用户的 `wechatOpenId` 字段设置为 `null`
3. 解绑后，用户将无法接收微信通知
4. 解绑操作会弹出确认对话框，防止误操作

### Q4: 微信API调用失败怎么办？

**A**: 后端应该返回详细的错误信息，前端会显示给用户。常见错误：
- `40029`: code无效或已过期
- `40163`: code已被使用（每个code只能使用一次）
- `45011`: 频率限制，请稍后重试

---

## 11. 相关接口

### 11.1 获取当前用户信息

**接口**: `GET /api/users/me`

**用途**: 前端用于检查微信绑定状态

**响应示例**:
```json
{
  "userId": "admin_001",
  "username": "admin",
  "role": "admin",
  "wechatOpenId": "wx_openid_xxx",  // 如果已绑定，会返回此字段
  ...
}
```

### 11.2 获取所有用户（用于通知功能）

**接口**: `GET /api/users`

**权限**: admin权限

**用途**: 前端用于获取所有已绑定微信的管理员和admin用户列表

**响应示例**:
```json
[
  {
    "userId": "admin_001",
    "username": "admin",
    "role": "admin",
    "wechatOpenId": "wx_openid_xxx",
    ...
  },
  {
    "userId": "manager_001",
    "username": "manager",
    "role": "manager",
    "wechatOpenId": "wx_openid_yyy",
    ...
  }
]
```

**注意**: 前端会过滤出 `role` 为 `admin`、`管理员` 或 `manager`，且 `wechatOpenId` 不为空的用户。

---

## 12. 微信通知发送功能

### 12.1 接口说明

**接口**: `POST /api/notifications/wechat`

**权限**: admin权限（需要认证）

**用途**: 当检测到异常数据时，向所有已绑定微信的管理员和admin用户发送微信模板消息通知

### 12.2 请求格式

**请求头**:
```
Authorization: Bearer <token>
Content-Type: application/json
```

**请求体**:
```json
{
  "targets": [
    {
      "userId": "admin_001",
      "wechatOpenId": "wx_openid_xxx"
    },
    {
      "userId": "manager_001",
      "wechatOpenId": "wx_openid_yyy"
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

**字段说明**:
- `targets`: 目标用户列表，包含 `userId` 和 `wechatOpenId`
- `data`: 通知数据
  - `anomalyCount`: 异常数据总数
  - `summary`: 异常类型统计摘要
  - `uploadedAt`: 上传时间
  - `details`: 异常详情列表（最多5条）

### 12.3 响应格式

**成功响应 (200)**:
```json
{
  "success": true,
  "sent": 2,
  "failed": []
}
```

**部分成功响应 (200)**:
```json
{
  "success": true,
  "sent": 1,
  "failed": [
    {
      "userId": "manager_001",
      "wechatOpenId": "wx_openid_yyy",
      "error": "用户未订阅模板消息"
    }
  ]
}
```

**失败响应 (400)**:
```json
{
  "error": {
    "code": "INVALID_PARAMS",
    "message": "参数不合法",
    "details": {}
  }
}
```

### 12.4 后端处理流程

```
1. 接收请求，验证用户身份和权限（admin）
2. 验证请求参数（targets、data）
3. 获取微信访问令牌（access_token）
4. 遍历targets列表，为每个用户发送模板消息
5. 记录发送结果（成功/失败）
6. 返回发送统计结果
```

### 12.5 微信模板消息配置

#### 12.5.1 获取微信访问令牌

**接口**: `GET https://api.weixin.qq.com/cgi-bin/token`

**请求参数**:
- `grant_type`: `client_credential`
- `appid`: 小程序AppID
- `secret`: 小程序AppSecret

**响应**:
```json
{
  "access_token": "ACCESS_TOKEN",
  "expires_in": 7200
}
```

**注意**: 
- access_token 有效期为 7200 秒（2小时）
- 建议缓存 access_token，避免频繁请求
- 当 access_token 过期时，需要重新获取

#### 12.5.2 发送模板消息

**接口**: `POST https://api.weixin.qq.com/cgi-bin/message/subscribe/send`

**请求头**:
```
Content-Type: application/json
```

**请求体**:
```json
{
  "touser": "wx_openid_xxx",
  "template_id": "YOUR_TEMPLATE_ID",
  "page": "pages/index/index",
  "data": {
    "thing1": {
      "value": "异常数据检测"
    },
    "number2": {
      "value": 7
    },
    "thing3": {
      "value": "出勤时长差异超过1小时: 5条；上班时间晚于8:00: 2条"
    },
    "time4": {
      "value": "2024-01-01 10:30"
    }
  }
}
```

**字段说明**:
- `touser`: 接收者的openid
- `template_id`: 订阅消息模板ID（需要在微信公众平台配置）
- `page`: 点击消息后跳转的小程序页面路径
- `data`: 模板数据，字段名需要与模板配置一致

**响应**:
```json
{
  "errcode": 0,
  "errmsg": "ok"
}
```

**错误响应**:
```json
{
  "errcode": 40037,
  "errmsg": "invalid template_id"
}
```

#### 12.5.3 配置订阅消息模板

1. 登录 [微信公众平台](https://mp.weixin.qq.com/)
2. 进入小程序管理后台
3. 在"功能" → "订阅消息"中：
   - 选择"公共模板库"或"我的模板"
   - 选择合适的模板（建议选择"异常提醒"或"系统通知"类模板）
   - 配置模板字段
   - 获取 `template_id`

**推荐模板字段**:
- `thing1`: 通知类型（如"异常数据检测"）
- `number2`: 异常数量
- `thing3`: 异常摘要
- `time4`: 检测时间

### 12.6 实现示例

```javascript
// routes/notification.js
const axios = require('axios')
const { authenticate, requireAdmin } = require('../middleware/auth')
const User = require('../models/User')

// 缓存 access_token
let cachedAccessToken = null
let tokenExpireTime = 0

// 获取微信 access_token
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
    
    return cachedAccessToken
  } catch (error) {
    console.error('获取微信access_token失败:', error)
    throw error
  }
}

// 发送单个模板消息
async function sendTemplateMessage(openid, data, accessToken) {
  try {
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
    
    if (response.data.errcode !== 0) {
      throw new Error(`发送失败: ${response.data.errmsg}`)
    }
    
    return { success: true }
  } catch (error) {
    console.error('发送模板消息失败:', error)
    return {
      success: false,
      error: error.response?.data?.errmsg || error.message
    }
  }
}

// 发送微信通知接口
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

### 12.7 环境变量配置

在 `.env` 文件中添加微信模板消息配置：

```env
# 微信小程序配置（已存在）
WECHAT_APPID=your_miniprogram_appid
WECHAT_SECRET=your_miniprogram_secret

# 微信订阅消息模板ID（新增）
WECHAT_TEMPLATE_ID=your_template_id
```

### 12.8 常见错误处理

| 错误码 | 说明 | 处理方式 |
|--------|------|----------|
| 40037 | 模板ID无效 | 检查模板ID配置是否正确 |
| 43101 | 用户拒绝接收消息 | 用户需要重新订阅，记录失败但不影响其他用户 |
| 47003 | 参数错误 | 检查模板数据格式是否正确 |
| 40001 | access_token无效 | 重新获取access_token |

### 12.9 注意事项

1. **订阅消息限制**:
   - 用户需要主动订阅才能接收消息
   - 如果用户未订阅，发送会失败（errcode: 43101）
   - 建议在用户绑定微信时引导用户订阅消息

2. **频率限制**:
   - 微信对模板消息发送有频率限制
   - 建议实现发送队列，避免短时间内大量发送

3. **错误处理**:
   - 部分用户发送失败不应影响其他用户
   - 记录失败原因，便于排查问题

4. **access_token 缓存**:
   - 必须缓存 access_token，避免频繁请求
   - 注意处理 token 过期的情况

---

## 13. 实现优先级

### 高优先级（必须实现）

1. ✅ **支持通过 wechatCode 绑定微信**
   - 调用微信API换取openId
   - 保存到用户表

2. ✅ **返回更新后的用户信息**
   - 必须包含 `wechatOpenId` 字段

3. ✅ **支持解绑微信**
   - 处理 `wechatOpenId: null` 的请求
   - 将用户的 `wechatOpenId` 设置为 `null`

4. ✅ **实现微信通知发送接口**
   - `POST /api/notifications/wechat`
   - 获取微信 access_token
   - 发送模板消息给已绑定微信的管理员

### 中优先级（建议实现）

5. ⚠️ **错误处理**
   - 处理微信API调用失败
   - 处理code过期或无效
   - 处理模板消息发送失败

6. ⚠️ **日志记录**
   - 记录绑定/解绑操作日志
   - 记录通知发送日志
   - 记录失败原因

7. ⚠️ **access_token 缓存**
   - 实现 access_token 缓存机制
   - 避免频繁请求微信API

### 低优先级（可选）

8. ⚠️ **绑定历史**
   - 记录绑定/解绑历史

9. ⚠️ **通知发送队列**
   - 实现发送队列，避免频率限制
   - 支持重试机制

---

## 14. 联系与支持

如有问题，请参考：
- 微信小程序官方文档: 
  - 登录凭证校验: https://developers.weixin.qq.com/miniprogram/dev/api-backend/open-api/login/auth.code2Session.html
  - 订阅消息: https://developers.weixin.qq.com/miniprogram/dev/api-backend/open-api/subscribe-message/subscribeMessage.send.html
  - 获取access_token: https://developers.weixin.qq.com/miniprogram/dev/api-backend/open-api/access-token/auth.getAccessToken.html
- 前端实现代码: 
  - 绑定/解绑: `src/pages/settings/index.vue` 中的 `handleBindWechat` 和 `handleUnbindWechat` 函数
  - 通知发送: `src/pages/settings/index.vue` 中的 `sendWechatNotification` 函数
  - 通知API: `src/utils/api/notification.js`

---

**文档版本**: v1.1  
**最后更新**: 2024-01-XX  
**维护者**: 开发团队

