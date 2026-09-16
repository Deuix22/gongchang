# 生产环境登录问题修复指南

## 问题描述

生产环境 `POST /api/auth/login` 返回 401 错误，提示"账号或密码不正确"。

## 可能原因

1. **生产环境代码未更新**：运行的是旧版本代码，没有自动修复逻辑
2. **数据库数据不完整**：admin 用户缺少 `username` 或 `passwordHash` 字段
3. **密码哈希不匹配**：数据库中的密码哈希与默认值不一致

## 快速解决方案

### 方案 1：使用旧的登录接口（临时方案）✅

如果旧的 `login-admin` 接口仍然可用，可以临时使用：

**前端修改**（临时）：
```javascript
// 在 auth.js 中，如果新接口返回 401，尝试旧接口
try {
  const response = await post('/api/auth/login', { username, password });
  return response;
} catch (error) {
  if (error.status === 401 && username === 'admin') {
    // 降级到旧接口
    return await post('/api/auth/login-admin', { username, password });
  }
  throw error;
}
```

**或者直接使用旧接口**：
```bash
curl -X POST https://hvoqpnuvbtfp.sealosbja.site/api/auth/login-admin \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"030426"}'
```

### 方案 2：直接修复数据库（推荐）✅

如果可以直接访问生产数据库，运行迁移脚本：

```bash
# 在可以访问数据库的机器上执行
npm run migrate:admin
```

**或者手动修复**（MongoDB shell）：
```javascript
// 连接数据库
use attendance

// 查找 admin 用户
db.users.findOne({ role: "admin" })

// 更新 username（如果缺失）
db.users.updateOne(
  { role: "admin" },
  { $set: { username: "admin" } }
)

// 更新 passwordHash（如果缺失）
// 默认密码 030426 的哈希值：
db.users.updateOne(
  { role: "admin" },
  { $set: { passwordHash: "$2a$10$RN4q1g.yO2PJoEhXejdve.OAuAq1gCY26wxgR60rGjvvtyw69fJJG" } }
)

// 验证修复
db.users.findOne({ role: "admin" }, { username: 1, passwordHash: 1, role: 1 })
```

### 方案 3：重新部署最新代码（长期方案）✅

1. **确认代码已更新**
   ```bash
   # 检查本地代码是否包含自动修复逻辑
   grep -A 20 "兼容逻辑：如果是 admin 用户" src/controllers/authController.js
   ```

2. **构建新镜像**
   ```bash
   # 参考 BUILD_IMAGE_GUIDE.md
   docker build -t hub.bja.sealos.run/ns-o9xuidp4/devbox:1.2 .
   docker push hub.bja.sealos.run/ns-o9xuidp4/devbox:1.2
   ```

3. **在 Sealos 更新镜像版本**
   - 进入应用配置
   - 将镜像版本从 `1.1` 更新为 `1.2`
   - 点击"变更"部署

4. **验证部署**
   ```bash
   curl -X POST https://hvoqpnuvbtfp.sealosbja.site/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"username":"admin","password":"030426"}'
   ```

## 诊断步骤

### 1. 检查生产环境代码版本

如果可以通过 Sealos 控制台进入容器：

```bash
# 检查代码是否包含自动修复逻辑
kubectl exec -it <pod-name> -- grep -A 5 "兼容逻辑" /home/devbox/project/src/controllers/authController.js
```

### 2. 检查数据库数据

```javascript
// MongoDB shell
db.users.findOne({ role: "admin" }, {
  userId: 1,
  username: 1,
  passwordHash: 1,
  role: 1,
  nickName: 1
})
```

**预期结果**：
- `username`: `"admin"`
- `passwordHash`: 存在且是 bcrypt 哈希值
- `role`: `"admin"`

### 3. 测试密码验证

```javascript
// 在 Node.js 环境中
const bcrypt = require('bcryptjs');
const user = await User.findOne({ role: 'admin' }).select('+passwordHash');
const match = await bcrypt.compare('030426', user.passwordHash);
console.log('密码匹配:', match);
```

## 推荐操作流程

### 立即修复（最快）

1. **使用旧的 `login-admin` 接口**（如果可用）
2. **或直接修复数据库**（如果有权限）

### 长期修复

1. **重新部署最新代码**（包含自动修复逻辑）
2. **运行迁移脚本**确保数据完整
3. **验证登录功能**

## 验证修复

修复后，测试登录：

```bash
curl -X POST https://hvoqpnuvbtfp.sealosbja.site/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"030426"}'
```

**预期返回**：
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

## 注意事项

1. **生产环境密码**：如果修改过环境变量 `ADMIN_PASSWORD_HASH`，需要使用对应的密码
2. **数据库备份**：修复前建议备份数据库
3. **日志监控**：关注服务器日志，查看是否有错误信息
4. **多 Pod 环境**：如果有多个 Pod，确保所有 Pod 都使用最新代码

