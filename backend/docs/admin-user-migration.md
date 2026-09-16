# Admin 用户数据迁移指南

## 问题描述

在使用统一登录接口 `POST /api/auth/login` 时，如果 admin 用户是通过旧的 `login-admin` 接口创建的，可能缺少 `username` 和 `passwordHash` 字段，导致登录失败。

## 解决方案

### 方案 1：自动修复（推荐）

登录接口已添加自动修复逻辑：

- 当使用 `username: "admin"` 登录时，如果通过 `username` 找不到用户，会自动尝试通过 `role: 'admin'` 查找
- 如果找到 admin 用户但缺少 `username` 或 `passwordHash`，会自动更新这些字段
- 更新后可以正常登录

**优点**：无需手动操作，首次登录时自动修复

**缺点**：需要至少尝试登录一次才能触发修复

### 方案 2：手动运行迁移脚本（推荐用于生产环境）

在部署新版本前，先运行迁移脚本确保数据完整：

```bash
# 运行迁移脚本
npm run migrate:admin

# 或直接运行
node scripts/migrate-admin-user.js
```

**迁移脚本功能**：
- 查找所有 admin 用户
- 为缺少 `username` 的用户设置 `username: "admin"`
- 为缺少 `passwordHash` 的用户设置默认密码哈希（密码：`030426`）
- 如果不存在 admin 用户，会自动创建一个
- 验证迁移结果并测试密码

**输出示例**：
```
[Migration] 正在连接数据库...
[Migration] 数据库连接成功
[Migration] 找到 1 个 admin 用户
[Migration] 用户 admin_xxxxxx 缺少 username，将设置为 "admin"
[Migration] 用户 admin_xxxxxx 缺少 passwordHash，将设置为默认密码哈希
[Migration] ✅ 已更新用户 admin_xxxxxx: { username: 'admin', passwordHash: '...' }
[Migration] ✅ 验证成功！admin 用户数据完整
[Migration] ✅ 密码验证成功！可以使用密码 "030426" 登录
```

## 验证方法

### 1. 检查数据库

```javascript
// 在 MongoDB shell 中执行
db.users.findOne({ role: "admin" })
```

确认：
- `username` 字段存在且值为 `"admin"`
- `passwordHash` 字段存在且是 bcrypt 哈希值

### 2. 测试登录

```bash
# 测试统一登录接口
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"030426"}'
```

应该返回：
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "refresh_token_string_here",
  "user": {
    "userId": "admin_xxxxxx",
    "username": "admin",
    "nickName": "平台管理员",
    "role": "admin",
    ...
  }
}
```

## 常见问题

### Q: 迁移后仍然无法登录？

**A:** 检查以下几点：

1. **确认密码正确**：默认密码是 `030426`，如果修改过环境变量 `ADMIN_PASSWORD_HASH`，需要使用对应的密码

2. **检查数据库连接**：确保迁移脚本能正确连接到数据库

3. **查看日志**：检查服务器日志，查看是否有错误信息

4. **手动验证密码哈希**：
   ```javascript
   const bcrypt = require('bcryptjs');
   const user = await User.findOne({ role: 'admin' }).select('+passwordHash');
   const match = await bcrypt.compare('030426', user.passwordHash);
   console.log('密码匹配:', match);
   ```

### Q: 如何修改 admin 密码？

**A:** 有两种方式：

1. **通过环境变量**（推荐）：
   ```bash
   # 生成新的密码哈希
   node -e "console.log(require('bcryptjs').hashSync('新密码', 10))"
   
   # 设置环境变量
   export ADMIN_PASSWORD_HASH="生成的哈希值"
   ```

2. **直接更新数据库**：
   ```javascript
   const bcrypt = require('bcryptjs');
   const newHash = await bcrypt.hash('新密码', 10);
   await User.updateOne(
     { role: 'admin' },
     { $set: { passwordHash: newHash } }
   );
   ```

### Q: 有多个 admin 用户怎么办？

**A:** 迁移脚本会处理所有 admin 用户，为每个用户设置正确的 `username` 和 `passwordHash`。但建议只保留一个 admin 用户，删除多余的。

## 注意事项

1. **生产环境**：建议在部署前运行迁移脚本，避免用户登录时遇到问题

2. **密码安全**：默认密码 `030426` 仅用于开发环境，生产环境应通过环境变量设置强密码

3. **备份数据**：运行迁移脚本前，建议备份数据库

4. **日志监控**：关注服务器日志，查看是否有自动修复的记录

## 相关文件

- 迁移脚本：`scripts/migrate-admin-user.js`
- 登录控制器：`src/controllers/authController.js`
- 用户模型：`src/models/User.js`

