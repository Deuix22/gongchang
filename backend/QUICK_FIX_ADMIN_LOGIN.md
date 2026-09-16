# 快速修复 Admin 登录问题

## 问题

使用 `POST /api/auth/login` 接口登录时，admin 用户密码 `030426` 不正确，返回 401 错误。

## 原因

数据库中的 admin 用户可能缺少 `username` 或 `passwordHash` 字段。

## 快速修复（3 种方法）

### 方法 1：自动修复（最简单）✅

**无需任何操作！** 登录接口已添加自动修复逻辑：

1. 直接使用前端登录，输入 `username: "admin"`, `password: "030426"`
2. 后端会自动检测并修复缺失的字段
3. 第一次登录可能会稍慢（因为需要更新数据库），之后就能正常登录

**优点**：无需手动操作，自动完成

---

### 方法 2：运行迁移脚本（推荐用于生产环境）

```bash
# 在项目根目录执行
npm run migrate:admin
```

脚本会自动：
- 查找所有 admin 用户
- 为缺少的字段设置默认值
- 验证修复结果

**输出示例**：
```
[Migration] ✅ 已更新用户 admin_xxxxxx
[Migration] ✅ 密码验证成功！可以使用密码 "030426" 登录
```

---

### 方法 3：手动修复数据库（高级用户）

如果无法运行脚本，可以手动修复：

```javascript
// 在 MongoDB shell 中执行

// 1. 查找 admin 用户
db.users.findOne({ role: "admin" })

// 2. 更新 username（如果缺失）
db.users.updateOne(
  { role: "admin" },
  { $set: { username: "admin" } }
)

// 3. 更新 passwordHash（如果缺失）
// 先生成密码哈希（在 Node.js 中）：
// const bcrypt = require('bcryptjs');
// const hash = bcrypt.hashSync('030426', 10);
// console.log(hash);

// 然后更新数据库：
db.users.updateOne(
  { role: "admin" },
  { $set: { passwordHash: "$2a$10$RN4q1g.yO2PJoEhXejdve.OAuAq1gCY26wxgR60rGjvvtyw69fJJG" } }
)
```

---

## 验证修复

修复后，测试登录：

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"030426"}'
```

应该返回 200 状态码和 token。

---

## 如果仍然无法登录

1. **检查密码**：确认使用的是 `030426`（如果修改过环境变量，使用对应的密码）

2. **检查日志**：查看服务器日志，确认是否有错误信息

3. **检查数据库**：
   ```javascript
   db.users.findOne({ role: "admin" }, { username: 1, passwordHash: 1 })
   ```
   确认两个字段都存在

4. **查看详细文档**：参考 `docs/admin-user-migration.md`

---

## 推荐操作流程

### 开发环境
- 直接使用方法 1（自动修复），无需额外操作

### 生产环境
- 部署前运行方法 2（迁移脚本），确保数据完整
- 如果已部署，使用方法 1 自动修复，或方法 2 手动修复

