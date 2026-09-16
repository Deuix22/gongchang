# 后端接口实现指南：创建用户和统一登录

## 概述

前端已改为统一的账号密码登录方式，不再支持微信快捷登录。需要后端实现以下接口：

1. **统一登录接口** (`POST /api/auth/login`) - 所有用户（包括admin）使用账号密码登录
2. **创建用户接口** (`POST /api/users`) - admin用户可以创建新账号

---

## 1. 统一登录接口

### 接口信息

- **路径**: `POST /api/auth/login`
- **说明**: 统一的账号密码登录接口，支持所有角色（admin、manager、leader）
- **权限**: 无需认证

### 请求体

```json
{
  "username": "user001",
  "password": "password123"
}
```

### 成功响应 (200)

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "refresh_token_string_here",
  "user": {
    "userId": "leader_001",
    "username": "user001",
    "nickName": "张三",
    "role": "leader",
    "department": "SMT",
    "createdAt": "2024-01-01T08:00:00.000Z",
    "lastLoginAt": "2024-01-05T09:00:00.000Z"
  }
}
```

### 失败响应

**400 - 参数错误**:
```json
{
  "error": {
    "code": "INVALID_PARAMS",
    "message": "用户名与密码必填",
    "details": {}
  }
}
```

**401 - 认证失败**:
```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "账号或密码不正确",
    "details": {}
  }
}
```
### 实现要点

1. **验证账号密码**: 根据 `username` 查找用户，验证密码（建议使用 bcrypt 加密存储）
2. **支持所有角色**: 该接口应支持 `admin`、`manager`、`leader` 所有角色的登录
3. **更新最后登录时间**: 登录成功后更新 `lastLoginAt` 字段
4. **生成Token**: 返回 JWT token 和 refresh token

### 数据库字段要求

用户表应包含以下字段：
- `userId`: 用户唯一标识
- `username`: 账号（唯一，用于登录）
- `password`: 密码（加密存储）
- `nickName`: 昵称（可选）
- `role`: 角色（`admin`、`manager`、`leader`）
- `department`: 部门（可选）
- `createdAt`: 创建时间
- `lastLoginAt`: 最后登录时间

---

## 2. 创建用户接口

### 接口信息

- **路径**: `POST /api/users`
- **说明**: admin用户创建新账号
- **权限**: 需要 `admin` 角色

### 请求头

```
Authorization: Bearer <token>
```

### 请求体

```json
{
  "username": "user002",
  "password": "password123",
  "nickName": "李四",
  "role": "leader",
  "department": "SMT"
}
```

**字段说明**:
- `username` (必填): 账号，至少3个字符，必须唯一
- `password` (必填): 密码，至少6个字符
- `nickName` (可选): 昵称
- `role` (可选): 角色，默认为 `leader`，可选值：`leader`、`manager`（不能创建 `admin` 角色）
- `department` (可选): 部门

### 成功响应 (201)

```json
{
  "userId": "leader_002",
  "username": "user002",
  "nickName": "李四",
  "role": "leader",
  "department": "SMT",
  "createdAt": "2024-01-05T10:00:00.000Z"
}
```

### 失败响应

**400 - 参数错误**:
```json
{
  "error": {
    "code": "INVALID_PARAMS",
    "message": "账号和密码不能为空",
    "details": {}
  }
}
```

**400 - 账号已存在**:
```json
{
  "error": {
    "code": "INVALID_PARAMS",
    "message": "账号已存在",
    "details": {}
  }
}
```

**403 - 权限不足**:
```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "权限不足，仅平台管理员可以创建用户",
    "details": {}
  }
}
```

### 实现要点

1. **权限验证**: 仅 `admin` 用户可以创建账号
2. **账号唯一性**: 检查 `username` 是否已存在
3. **密码加密**: 使用 bcrypt 等加密算法存储密码
4. **角色限制**: 不能创建 `admin` 角色的用户
5. **生成userId**: 自动生成唯一的 `userId`（如 `leader_xxx` 格式）

---

## 3. 数据库迁移建议

### 现有用户迁移

如果现有用户是通过微信登录创建的，需要：

1. **为现有用户生成账号密码**:
   - 为每个现有用户生成一个唯一的 `username`（如：`leader_001`）
   - 生成初始密码（建议通过邮件或短信发送给用户，或由管理员统一分配）
   - 更新用户表，添加 `username` 和 `password` 字段

2. **保留微信登录数据**（可选）:
   - 可以保留 `wechatOpenId` 字段，但不再用于登录
   - 仅作为用户信息的一部分

### 用户表结构示例（MongoDB）

```javascript
{
  userId: String,        // 唯一标识，如 "leader_001"
  username: String,      // 账号，唯一，用于登录
  password: String,       // 加密后的密码
  nickName: String,      // 昵称（可选）
  role: String,          // 角色：admin, manager, leader
  department: String,    // 部门（可选）
  wechatOpenId: String,  // 微信OpenID（保留，不再用于登录）
  createdAt: Date,       // 创建时间
  lastLoginAt: Date      // 最后登录时间
}
```

---

## 4. 实现示例（Express.js + Mongoose）

### 统一登录接口

```javascript
// routes/auth.js
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body

    // 验证参数
    if (!username || !password) {
      return res.status(400).json({
        error: {
          code: 'INVALID_PARAMS',
          message: '用户名与密码必填'
        }
      })
    }

    // 查找用户
    const user = await User.findOne({ username })
    if (!user) {
      return res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: '账号或密码不正确'
        }
      })
    }

    // 验证密码
    const isValidPassword = await bcrypt.compare(password, user.password)
    if (!isValidPassword) {
      return res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: '账号或密码不正确'
        }
      })
    }

    // 更新最后登录时间
    user.lastLoginAt = new Date()
    await user.save()

    // 生成Token
    const token = jwt.sign(
      { userId: user.userId, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '12h' }
    )

    const refreshToken = jwt.sign(
      { userId: user.userId },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: '7d' }
    )

    // 返回响应
    res.json({
      token,
      refreshToken,
      user: {
        userId: user.userId,
        username: user.username,
        nickName: user.nickName,
        role: user.role,
        department: user.department,
        createdAt: user.createdAt,
        lastLoginAt: user.lastLoginAt
      }
    })
  } catch (error) {
    console.error('登录失败:', error)
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: '服务器内部错误'
      }
    })
  }
})
```

### 创建用户接口

```javascript
// routes/users.js
const authenticate = require('../middleware/authenticate')
const requireAdmin = require('../middleware/requireAdmin')

router.post('/', authenticate, requireAdmin, async (req, res) => {
  try {
    const { username, password, nickName, role, department } = req.body

    // 验证必填项
    if (!username || !password) {
      return res.status(400).json({
        error: {
          code: 'INVALID_PARAMS',
          message: '账号和密码不能为空'
        }
      })
    }

    // 验证账号长度
    if (username.length < 3) {
      return res.status(400).json({
        error: {
          code: 'INVALID_PARAMS',
          message: '账号至少需要3个字符'
        }
      })
    }

    // 验证密码长度
    if (password.length < 6) {
      return res.status(400).json({
        error: {
          code: 'INVALID_PARAMS',
          message: '密码至少需要6个字符'
        }
      })
    }

    // 检查账号是否已存在
    const existingUser = await User.findOne({ username })
    if (existingUser) {
      return res.status(400).json({
        error: {
          code: 'INVALID_PARAMS',
          message: '账号已存在'
        }
      })
    }

    // 验证角色（不能创建admin）
    const userRole = role || 'leader'
    if (userRole === 'admin') {
      return res.status(400).json({
        error: {
          code: 'INVALID_PARAMS',
          message: '不能创建平台管理员角色'
        }
      })
    }

    // 生成userId
    const userId = `leader_${Date.now().toString(36)}${Math.random().toString(36).substr(2, 6)}`

    // 加密密码
    const hashedPassword = await bcrypt.hash(password, 10)

    // 创建用户
    const user = new User({
      userId,
      username,
      password: hashedPassword,
      nickName: nickName || '',
      role: userRole,
      department: department || '',
      createdAt: new Date()
    })

    await user.save()

    // 返回响应（不包含密码）
    res.status(201).json({
      userId: user.userId,
      username: user.username,
      nickName: user.nickName,
      role: user.role,
      department: user.department,
      createdAt: user.createdAt
    })
  } catch (error) {
    console.error('创建用户失败:', error)
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: '服务器内部错误'
      }
    })
  }
})
```

---

## 5. 注意事项

1. **密码安全**: 
   - 使用 bcrypt 等加密算法存储密码
   - 密码长度至少6个字符
   - 建议添加密码强度验证

2. **账号唯一性**: 
   - 确保 `username` 字段唯一
   - 创建用户时检查账号是否已存在

3. **角色管理**: 
   - 不能通过创建接口创建 `admin` 角色
   - `admin` 角色应通过数据库直接创建或特殊接口创建

4. **向后兼容**: 
   - 如果现有系统有微信登录用户，需要迁移数据
   - 建议保留 `wechatOpenId` 字段，但不再用于登录

5. **Token生成**: 
   - 使用 JWT 生成 token
   - Token 中应包含 `userId` 和 `role` 信息
   - 设置合理的过期时间（建议12小时）

---

## 6. 测试示例

### 测试统一登录

```bash
curl -X POST https://hvoqpnuvbtfp.sealosbja.site/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "user001",
    "password": "password123"
  }'
```

### 测试创建用户

```bash
# 先登录获取token
TOKEN="your_jwt_token_here"

curl -X POST https://hvoqpnuvbtfp.sealosbja.site/api/users \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "user002",
    "password": "password123",
    "nickName": "李四",
    "role": "leader",
    "department": "SMT"
  }'
```

---

**文档版本**: v1.0  
**最后更新**: 2024-01-05

