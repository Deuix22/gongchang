# 删除用户接口测试指南

## 接口信息

- **接口**: `DELETE /api/users/{userId}`
- **权限**: 仅 `admin` 可以删除用户
- **路径参数**: `userId` - 要删除的用户ID

## 安全限制

1. **不能删除平台管理员** (`admin` 角色)
2. **不能删除自己的账号**
3. **仅管理员可以删除** (需要 `admin` 角色权限)

## 测试步骤

### 1. 登录获取 Token

```bash
# 开发环境
TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login-admin \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"030426"}' \
  | grep -o '"token":"[^"]*' | cut -d'"' -f4)

# 生产环境
TOKEN=$(curl -s -X POST https://hvoqpnuvbtfp.sealosbja.site/api/auth/login-admin \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"030426"}' \
  | grep -o '"token":"[^"]*' | cut -d'"' -f4)

echo "Token: $TOKEN"
```

### 2. 获取用户列表（确认要删除的用户）

```bash
# 开发环境
curl -X GET http://localhost:3000/api/users \
  -H "Authorization: Bearer $TOKEN" \
  | python3 -m json.tool

# 生产环境
curl -X GET https://hvoqpnuvbtfp.sealosbja.site/api/users \
  -H "Authorization: Bearer $TOKEN" \
  | python3 -m json.tool
```

### 3. 删除用户（测试用例）

#### 测试用例 1: 删除普通用户（leader 或 manager）

```bash
# 开发环境
curl -X DELETE http://localhost:3000/api/users/leader_001 \
  -H "Authorization: Bearer $TOKEN" \
  | python3 -m json.tool

# 生产环境
curl -X DELETE https://hvoqpnuvbtfp.sealosbja.site/api/users/leader_001 \
  -H "Authorization: Bearer $TOKEN" \
  | python3 -m json.tool
```

**预期响应** (200):
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

#### 测试用例 2: 尝试删除不存在的用户

```bash
curl -X DELETE http://localhost:3000/api/users/non_existent_user \
  -H "Authorization: Bearer $TOKEN" \
  | python3 -m json.tool
```

**预期响应** (404):
```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "用户不存在",
    "details": {}
  }
}
```

#### 测试用例 3: 尝试删除管理员（应该失败）

```bash
# 假设 admin 用户的 userId 是 "admin_xxx"
curl -X DELETE http://localhost:3000/api/users/admin_xxx \
  -H "Authorization: Bearer $TOKEN" \
  | python3 -m json.tool
```

**预期响应** (400):
```json
{
  "error": {
    "code": "INVALID_PARAMS",
    "message": "不能删除平台管理员",
    "details": {}
  }
}
```

#### 测试用例 4: 尝试删除自己的账号（应该失败）

```bash
# 使用当前登录用户的 userId
curl -X DELETE http://localhost:3000/api/users/YOUR_USER_ID \
  -H "Authorization: Bearer $TOKEN" \
  | python3 -m json.tool
```

**预期响应** (400):
```json
{
  "error": {
    "code": "INVALID_PARAMS",
    "message": "不能删除自己的账号",
    "details": {}
  }
}
```

#### 测试用例 5: 无权限用户尝试删除（应该失败）

使用非 admin 角色的 token 尝试删除：

```bash
# 使用 leader 或 manager 角色的 token
curl -X DELETE http://localhost:3000/api/users/leader_001 \
  -H "Authorization: Bearer $LEADER_TOKEN" \
  | python3 -m json.tool
```

**预期响应** (403):
```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "权限不足",
    "details": {}
  }
}
```

## 完整测试脚本

```bash
#!/bin/bash

# 设置 API 地址
API_BASE="http://localhost:3000"  # 或 "https://hvoqpnuvbtfp.sealosbja.site"

echo "=== 1. 登录获取 Token ==="
TOKEN=$(curl -s -X POST ${API_BASE}/api/auth/login-admin \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"030426"}' \
  | grep -o '"token":"[^"]*' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo "❌ 登录失败"
  exit 1
fi

echo "✅ Token 获取成功: ${TOKEN:0:20}..."

echo ""
echo "=== 2. 获取用户列表 ==="
USERS=$(curl -s -X GET ${API_BASE}/api/users \
  -H "Authorization: Bearer $TOKEN")

echo "$USERS" | python3 -m json.tool | head -20

echo ""
echo "=== 3. 测试删除用户（请替换为实际存在的非 admin 用户ID） ==="
TEST_USER_ID="leader_001"  # 替换为实际用户ID

RESPONSE=$(curl -s -X DELETE ${API_BASE}/api/users/${TEST_USER_ID} \
  -H "Authorization: Bearer $TOKEN")

echo "$RESPONSE" | python3 -m json.tool

echo ""
echo "=== 4. 验证用户已删除 ==="
curl -s -X GET ${API_BASE}/api/users \
  -H "Authorization: Bearer $TOKEN" \
  | python3 -m json.tool | grep -A 5 "$TEST_USER_ID" || echo "✅ 用户已成功删除"
```

## 注意事项

1. **级联删除**: 当前实现**不会**自动删除用户的组员和出勤记录，这些数据会保留在数据库中。如果需要级联删除，可以取消注释 `userController.js` 中的相关代码。

2. **数据备份**: 删除操作不可恢复，建议在生产环境删除前先备份数据。

3. **前端验证**: 前端已实现隐藏 admin 用户的删除按钮，但后端仍需验证以防止直接 API 调用。

4. **审计日志**: 建议在生产环境中记录删除操作日志，包括操作人、被删除用户、删除时间等信息。

## 相关文件

- 后端实现: `src/controllers/userController.js` - `deleteUser` 函数
- 路由配置: `src/routes/modules/users.js` - `DELETE /:userId` 路由
- API 文档: `API_DOCUMENTATION.md` - 2.6 节
- 实现指南: `need.md`

