# 后端接口实现指南

## 问题说明

前端在调用 `PUT /api/users/me` 接口时返回 404 错误，说明该接口尚未在后端实现。

## 需要实现的接口

### `PUT /api/users/me` - 更新当前用户信息

**接口路径**: `PUT /api/users/me`

**权限要求**: 所有已登录用户（需要有效的 JWT Token）

**请求头**:
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**请求体**:
```json
{
  "nickName": "张三"
}
```

**成功响应** (200):
```json
{
  "userId": "leader_001",
  "nickName": "张三",
  "role": "leader",
  "department": "SMT",
  "wechatOpenId": "wx_openid_001",
  "updatedAt": "2024-01-05T10:00:00.000Z"
}
```

**失败响应** (400):
```json
{
  "error": {
    "code": "INVALID_PARAMS",
    "message": "参数不合法",
    "details": {}
  }
}
```

**失败响应** (401):
```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "未提供有效的 Authorization 头",
    "details": {}
  }
}
```

**失败响应** (404):
```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "用户不存在",
    "details": {}
  }
}
```

## 实现要点

### 1. 路由配置

在 Express.js 中，路由应该这样配置：

```javascript
// routes/users.js
router.put('/me', authenticateToken, updateCurrentUser)

// 或使用中间件
router.put('/me', requireAuth, updateCurrentUser)
```

### 2. 认证中间件

确保使用 JWT 认证中间件，从 Token 中提取用户信息：

```javascript
// middleware/auth.js
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization']
  const token = authHeader && authHeader.split(' ')[1] // 提取 Bearer token
  
  if (!token) {
    return res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: '未提供有效的 Authorization 头',
        details: {}
      }
    })
  }
  
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Token 无效或已过期',
          details: {}
        }
      })
    }
    req.user = user // 将用户信息附加到请求对象
    next()
  })
}
```

### 3. 控制器实现

```javascript
// controllers/users.js
const updateCurrentUser = async (req, res) => {
  try {
    const userId = req.user.userId // 从 JWT Token 中获取
    const { nickName } = req.body
    
    // 参数验证
    if (!nickName || typeof nickName !== 'string' || nickName.trim().length === 0) {
      return res.status(400).json({
        error: {
          code: 'INVALID_PARAMS',
          message: 'nickName 参数不合法',
          details: {}
        }
      })
    }
    
    if (nickName.length > 20) {
      return res.status(400).json({
        error: {
          code: 'INVALID_PARAMS',
          message: 'nickName 长度不能超过20个字符',
          details: {}
        }
      })
    }
    
    // 查找用户
    const user = await User.findOne({ userId })
    if (!user) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: '用户不存在',
          details: {}
        }
      })
    }
    
    // 更新用户信息
    user.nickName = nickName.trim()
    user.updatedAt = new Date()
    await user.save()
    
    // 返回更新后的用户信息
    res.status(200).json({
      userId: user.userId,
      nickName: user.nickName,
      role: user.role,
      department: user.department || null,
      wechatOpenId: user.wechatOpenId || null,
      updatedAt: user.updatedAt
    })
  } catch (error) {
    console.error('更新用户信息失败:', error)
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: '服务器内部错误',
        details: {}
      }
    })
  }
}
```

### 4. MongoDB 模型（Mongoose）

确保用户模型包含 `nickName` 字段：

```javascript
// models/User.js
const mongoose = require('mongoose')

const userSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    unique: true
  },
  nickName: {
    type: String,
    default: ''
  },
  role: {
    type: String,
    enum: ['admin', 'manager', 'leader'],
    default: 'leader'
  },
  department: {
    type: String,
    default: null
  },
  wechatOpenId: {
    type: String,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  lastLoginAt: {
    type: Date,
    default: null
  }
})

// 更新时自动更新 updatedAt
userSchema.pre('save', function(next) {
  this.updatedAt = new Date()
  next()
})

module.exports = mongoose.model('User', userSchema)
```

## 测试接口

### 使用 curl 测试

```bash
# 1. 先登录获取 token
TOKEN=$(curl -X POST https://hvoqpnuvbtfp.sealosbja.site/api/auth/login-admin \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"030426"}' \
  | jq -r '.token')

# 2. 更新用户信息
curl -X PUT https://hvoqpnuvbtfp.sealosbja.site/api/users/me \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"nickName":"测试名字"}'
```

### 使用 Postman 测试

1. 先调用 `POST /api/auth/login-admin` 获取 token
2. 在 `PUT /api/users/me` 请求中：
   - Headers: `Authorization: Bearer <token>`
   - Body (JSON): `{ "nickName": "测试名字" }`

## 注意事项

1. **权限控制**: 用户只能更新自己的信息，不能更新其他用户的信息
2. **字段限制**: 目前只允许更新 `nickName` 字段，其他字段（如 `role`、`department`）需要通过其他接口修改
3. **数据验证**: 确保 `nickName` 不为空且长度不超过 20 个字符
4. **错误处理**: 统一使用错误响应格式 `{ error: { code, message, details } }`
5. **时间戳**: 更新后应自动更新 `updatedAt` 字段

## 相关文档

- [完整 API 接口文档](./backend-api-spec.md)
- [前端需要的接口列表](./backend-api-required.md)

