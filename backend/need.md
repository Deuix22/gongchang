# 后端删除用户接口实现指南

## 接口说明

**接口**: `DELETE /api/users/{userId}`

**权限**: `admin`（仅平台管理员可以删除用户）

**说明**: 删除指定用户，用于清理测试用户或不需要的用户账号。

## 接口规范

### 请求

**方法**: `DELETE`

**路径**: `/api/users/{userId}`

**路径参数**:
- `userId`: 要删除的用户ID（字符串）

**请求头**:
```
Authorization: Bearer <jwt_token>
```

**请求体**: 无

### 成功响应 (200)

```json
{
  "success": true,
  "message": "用户删除成功",
  "deletedUser": {
    "userId": "leader_001",
    "nickName": "测试用户",
    "role": "leader"
  }
}
```

### 失败响应 (400)

```json
{
  "error": {
    "code": "INVALID_PARAMS",
    "message": "不能删除平台管理员",
    "details": {}
  }
}
```

### 失败响应 (401)

```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "未提供有效的 Authorization 头",
    "details": {}
  }
}
```

### 失败响应 (403)

```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "权限不足，仅平台管理员可以删除用户",
    "details": {}
  }
}
```

### 失败响应 (404)

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

```javascript
// routes/users.js
router.delete('/:userId', authenticateToken, requireAdmin, deleteUser)
```

### 2. 权限检查

确保只有 `admin` 角色可以删除用户：

```javascript
// middleware/auth.js
const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({
      error: {
        code: 'FORBIDDEN',
        message: '权限不足，仅平台管理员可以删除用户',
        details: {}
      }
    })
  }
  next()
}
```

### 3. 控制器实现

```javascript
// controllers/userController.js
const deleteUser = async (req, res) => {
  try {
    const { userId } = req.params
    const currentUser = req.user // 从 JWT Token 中获取
    
    // 参数验证
    if (!userId) {
      return res.status(400).json({
        error: {
          code: 'INVALID_PARAMS',
          message: '用户ID不能为空',
          details: {}
        }
      })
    }
    
    // 查找要删除的用户
    const userToDelete = await User.findOne({ userId })
    if (!userToDelete) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: '用户不存在',
          details: {}
        }
      })
    }
    
    // 防止删除平台管理员
    if (userToDelete.role === 'admin') {
      return res.status(400).json({
        error: {
          code: 'INVALID_PARAMS',
          message: '不能删除平台管理员',
          details: {}
        }
      })
    }
    
    // 防止删除自己
    if (userToDelete.userId === currentUser.userId) {
      return res.status(400).json({
        error: {
          code: 'INVALID_PARAMS',
          message: '不能删除自己的账号',
          details: {}
        }
      })
    }
    
    // 保存被删除用户的信息（用于返回）
    const deletedUserInfo = {
      userId: userToDelete.userId,
      nickName: userToDelete.nickName,
      role: userToDelete.role
    }
    
    // 删除用户
    await User.deleteOne({ userId })
    
    // 可选：删除相关的组员数据
    // await Member.deleteMany({ leaderId: userId })
    
    // 可选：删除相关的出勤记录
    // await Attendance.deleteMany({ leaderId: userId })
    
    res.status(200).json({
      success: true,
      message: '用户删除成功',
      deletedUser: deletedUserInfo
    })
  } catch (error) {
    console.error('删除用户失败:', error)
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

### 4. 关联数据清理（可选）

根据业务需求，删除用户时可能需要清理相关数据：

```javascript
// 删除用户的组员
await Member.deleteMany({ leaderId: userId })

// 删除用户的出勤记录
await Attendance.deleteMany({ leaderId: userId })

// 删除用户的出勤历史记录
await AttendanceHistory.deleteMany({ leaderId: userId })
```

**注意**: 根据业务需求决定是否级联删除相关数据。如果希望保留历史数据，可以只删除用户账号。

## 安全注意事项

1. **权限控制**: 只有 `admin` 角色可以删除用户
2. **防止误删**: 不能删除平台管理员（`admin` 角色）
3. **防止自删**: 不能删除自己的账号
4. **数据备份**: 建议在删除前记录被删除用户的信息（用于审计）
5. **级联删除**: 根据业务需求决定是否删除相关数据

## 测试示例

### 使用 curl 测试

```bash
# 1. 先登录获取 token
TOKEN=$(curl -X POST https://hvoqpnuvbtfp.sealosbja.site/api/auth/login-admin \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"030426"}' \
  | jq -r '.token')

# 2. 删除用户
curl -X DELETE https://hvoqpnuvbtfp.sealosbja.site/api/users/leader_001 \
  -H "Authorization: Bearer $TOKEN"
```

### 使用 Postman 测试

1. 先调用 `POST /api/auth/login-admin` 获取 token
2. 在 `DELETE /api/users/{userId}` 请求中：
   - Headers: `Authorization: Bearer <token>`
   - 路径参数: `userId` = `leader_001`

## 相关文档

- [完整 API 接口文档](./backend-api-spec.md)
- [前端需要的接口列表](./backend-api-required.md)

