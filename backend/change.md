# 后端改动说明：统一账号密码登录

## 概述

前端已改为统一的账号密码登录方式，**不再支持微信快捷登录**。所有用户（包括admin）都使用账号密码登录，账号和密码由admin用户创建并分配。

---

## 需要实现的新接口

### 1. 统一登录接口（必需）

**接口**: `POST /api/auth/login`

**说明**: 所有用户（admin、manager、leader）都使用此接口登录

**请求体**:
```json
{
  "username": "user001",
  "password": "password123"
}
```

**成功响应** (200):
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

**实现要点**:
- 根据 `username` 查找用户
- 验证密码（使用 bcrypt 等加密算法）
- 支持所有角色（admin、manager、leader）
- 登录成功后更新 `lastLoginAt`
- 返回 JWT token 和 refresh token

---

### 2. 创建用户接口（必需）

**接口**: `POST /api/users`

**权限**: 仅 `admin` 用户可以创建

**请求头**: `Authorization: Bearer <token>`

**请求体**:
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
- `role` (可选): 角色，默认为 `leader`，可选值：`leader`、`manager`（**不能创建 `admin` 角色**）
- `department` (可选): 部门

**成功响应** (201):
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

**实现要点**:
- 权限验证：仅 `admin` 用户可以创建
- 账号唯一性检查：`username` 不能重复
- 密码加密存储（使用 bcrypt）
- 不能创建 `admin` 角色
- 自动生成唯一的 `userId`（如 `leader_xxx` 格式）

---

## 需要废弃的接口

以下接口**不再需要**，可以保留用于向后兼容，但前端已不再使用：

1. `POST /api/auth/login-wechat` - 微信登录接口
2. `POST /api/auth/login-admin` - 管理员专用登录接口（可选，建议保留用于向后兼容）

---

## 数据库字段要求

### 用户表需要添加的字段

用户表必须包含以下字段：

```javascript
{
  userId: String,        // 唯一标识，如 "leader_001"
  username: String,      // 账号，唯一，用于登录（新增）
  password: String,      // 加密后的密码（新增）
  nickName: String,     // 昵称（可选）
  role: String,         // 角色：admin, manager, leader
  department: String,    // 部门（可选）
  wechatOpenId: String, // 微信OpenID（保留，不再用于登录）
  createdAt: Date,       // 创建时间
  lastLoginAt: Date      // 最后登录时间（新增或更新）
}
```

**关键字段**:
- `username`: **必填**，唯一索引，用于登录
- `password`: **必填**，加密存储（建议使用 bcrypt）

---

## 数据迁移建议

### 现有用户迁移

如果现有用户是通过微信登录创建的，需要：

1. **为现有用户生成账号密码**:
   - 为每个现有用户生成唯一的 `username`（如：`leader_001`、`leader_002`）
   - 生成初始密码（建议通过邮件或短信发送，或由管理员统一分配）
   - 更新用户表，添加 `username` 和 `password` 字段

2. **迁移脚本示例**:
   ```javascript
   // 为所有现有用户生成账号和初始密码
   const users = await User.find({ username: { $exists: false } })
   
   for (const user of users) {
     // 生成账号（基于userId）
     const username = user.userId || `user_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`
     
     // 生成初始密码（建议通知用户修改）
     const initialPassword = generateRandomPassword() // 生成随机密码
     const hashedPassword = await bcrypt.hash(initialPassword, 10)
     
     // 更新用户
     await User.updateOne(
       { userId: user.userId },
       {
         $set: {
           username,
           password: hashedPassword
         }
       }
     )
     
     // 发送密码给用户（通过邮件或短信）
     await sendPasswordToUser(user, username, initialPassword)
   }
   ```

3. **保留微信数据**（可选）:
   - 可以保留 `wechatOpenId` 字段，但不再用于登录
   - 仅作为用户信息的一部分

---

## 实现优先级

### 高优先级（必须实现）

1. ✅ **统一登录接口** (`POST /api/auth/login`)
   - 所有用户登录都依赖此接口
   - 必须支持所有角色（admin、manager、leader）

2. ✅ **创建用户接口** (`POST /api/users`)
   - admin用户创建账号依赖此接口
   - 必须实现权限验证和账号唯一性检查

### 中优先级（建议实现）

3. ⚠️ **数据迁移**
   - 为现有用户生成账号密码
   - 通知用户初始密码

### 低优先级（可选）

4. ⚠️ **保留旧接口**（向后兼容）
   - `POST /api/auth/login-admin` - 可以保留，但前端不再使用
   - `POST /api/auth/login-wechat` - 可以保留，但前端不再使用

---

## 测试建议

### 1. 测试统一登录

```bash
# 测试admin登录
curl -X POST https://hvoqpnuvbtfp.sealosbja.site/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"030426"}'

# 测试普通用户登录
curl -X POST https://hvoqpnuvbtfp.sealosbja.site/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"user001","password":"password123"}'
```

### 2. 测试创建用户

```bash
# 先登录获取token
TOKEN="your_jwt_token_here"

# 创建新用户
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

## 注意事项

1. **密码安全**:
   - 使用 bcrypt 等加密算法存储密码
   - 密码长度至少6个字符
   - 建议添加密码强度验证

2. **账号唯一性**:
   - 确保 `username` 字段唯一（建议添加唯一索引）
   - 创建用户时检查账号是否已存在

3. **角色管理**:
   - 不能通过创建接口创建 `admin` 角色
   - `admin` 角色应通过数据库直接创建或特殊接口创建

4. **Token生成**:
   - 使用 JWT 生成 token
   - Token 中应包含 `userId` 和 `role` 信息
   - 设置合理的过期时间（建议12小时）

5. **向后兼容**:
   - 如果现有系统有微信登录用户，需要迁移数据
   - 建议保留 `wechatOpenId` 字段，但不再用于登录

---

## 详细实现指南

详细的实现指南和示例代码请参考：
- `docs/backend-api-create-user.md` - 完整的实现指南和代码示例

---

**文档版本**: v1.0  
**最后更新**: 2024-01-05  
**优先级**: 🔴 高优先级（必须实现）

