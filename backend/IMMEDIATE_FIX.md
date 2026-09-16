# 立即修复生产环境登录问题

## 问题

生产环境 `POST /api/auth/login` 返回 401，提示"账号或密码不正确"。

## 最快解决方案（3 步）

### 步骤 1：使用旧的登录接口修复数据 ✅

旧的 `login-admin` 接口会自动创建或更新 admin 用户数据。先使用它登录一次：

```bash
curl -X POST https://hvoqpnuvbtfp.sealosbja.site/api/auth/login-admin \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"030426"}'
```

**这个操作会**：
- 自动创建或更新 admin 用户的 `username` 和 `passwordHash` 字段
- 返回 token，可以正常使用

### 步骤 2：验证新接口 ✅

修复数据后，测试新的统一登录接口：

```bash
curl -X POST https://hvoqpnuvbtfp.sealosbja.site/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"030426"}'
```

应该返回 200 和 token。

### 步骤 3：前端临时兼容（可选）✅

如果前端已经切换到新接口，可以添加临时兼容逻辑：

```javascript
// 在 auth.js 的 loginUser 函数中
export async function loginUser(username, password) {
  try {
    // 先尝试新接口
    return await post('/api/auth/login', { username, password });
  } catch (error) {
    // 如果是 admin 用户且新接口返回 401，尝试旧接口
    if (error.status === 401 && username === 'admin') {
      console.log('新接口登录失败，尝试使用旧接口修复数据...');
      const response = await post('/api/auth/login-admin', { username, password });
      // 旧接口会自动修复数据库，下次就可以用新接口了
      return response;
    }
    throw error;
  }
}
```

## 为什么这样有效？

1. **`login-admin` 接口的特性**：
   - 不依赖数据库中的 `username` 字段
   - 会自动创建或更新 admin 用户
   - 会自动设置 `username` 和 `passwordHash`

2. **修复后的效果**：
   - 数据库中的 admin 用户有了正确的 `username: "admin"` 和 `passwordHash`
   - 新的统一登录接口 `POST /api/auth/login` 可以正常工作

## 验证修复

修复后，检查数据库（如果有权限）：

```javascript
// MongoDB shell
db.users.findOne({ role: "admin" }, {
  userId: 1,
  username: 1,
  passwordHash: 1,
  role: 1
})
```

**预期结果**：
- `username`: `"admin"` ✅
- `passwordHash`: 存在且是 bcrypt 哈希值 ✅
- `role`: `"admin"` ✅

## 长期方案

修复数据后，建议：

1. **重新部署最新代码**（包含自动修复逻辑）
2. **前端切换到新接口**（统一使用 `POST /api/auth/login`）
3. **移除临时兼容代码**（如果添加了）

## 如果仍然无法登录

1. **检查密码**：确认使用的是 `030426`
2. **检查服务器日志**：查看是否有错误信息
3. **检查数据库连接**：确认 MongoDB 连接正常
4. **查看详细文档**：参考 `PRODUCTION_LOGIN_FIX.md`

