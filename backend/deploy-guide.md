# 部署指南

## 问题说明

生产环境 `PUT /api/users/me` 接口返回 404，但本地环境正常。这是因为生产环境尚未部署最新代码。

## 部署前检查清单

### 1. 确认代码已更新

检查以下文件是否包含最新代码：

- ✅ `src/routes/modules/users.js` - 包含 `router.put('/me', authenticate, updateCurrentUser)`
- ✅ `src/controllers/userController.js` - 包含 `updateCurrentUser` 函数实现

### 2. 验证本地接口

在部署前，先验证本地接口是否正常：

```bash
# 1. 启动本地服务
bash entrypoint.sh development

# 2. 测试接口（在另一个终端）
TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login-admin \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"030426"}' \
  | grep -o '"token":"[^"]*' | cut -d'"' -f4)

# 3. 测试 PUT 接口
curl -X PUT http://localhost:3000/api/users/me \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"nickName":"测试昵称"}'
```

预期返回：
```json
{
  "userId": "admin_567nex",
  "nickName": "测试昵称",
  "role": "admin",
  "department": null,
  "wechatOpenId": null,
  "updatedAt": "2025-11-14T04:24:13.192Z"
}
```

## 部署步骤

### 方式一：Sealos 平台部署

如果使用 Sealos 平台：

1. **提交代码到 Git 仓库**
   ```bash
   git add .
   git commit -m "feat: 实现 PUT /api/users/me 接口"
   git push origin main
   ```

2. **在 Sealos 控制台重新部署**
   - 登录 Sealos 控制台
   - 找到对应的应用
   - 点击"重新部署"或"构建新版本"
   - 等待部署完成

3. **验证部署**
   ```bash
   # 使用验证脚本（见下方）
   bash scripts/verify-deployment.sh
   ```

### 方式二：手动部署

如果手动部署：

1. **上传代码到服务器**
   ```bash
   # 使用 scp 或其他方式上传代码
   scp -r /home/devbox/project user@server:/path/to/app
   ```

2. **在服务器上安装依赖**
   ```bash
   cd /path/to/app
   npm install
   ```

3. **重启服务**
   ```bash
   # 如果使用 PM2
   pm2 restart attendance-backend
   
   # 如果使用 systemd
   sudo systemctl restart attendance-backend
   
   # 如果直接运行
   bash entrypoint.sh production
   ```

## 部署后验证

### 自动验证脚本

运行验证脚本：

```bash
bash scripts/verify-deployment.sh
```

### 手动验证

1. **测试 GET 接口（应该正常）**
   ```bash
   TOKEN="your_jwt_token"
   curl -X GET https://hvoqpnuvbtfp.sealosbja.site/api/users/me \
     -H "Authorization: Bearer $TOKEN"
   ```

2. **测试 PUT 接口（应该返回 200）**
   ```bash
   curl -X PUT https://hvoqpnuvbtfp.sealosbja.site/api/users/me \
     -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"nickName":"部署测试"}'
   ```

3. **检查响应**
   - ✅ 成功：返回 200 状态码和用户信息
   - ❌ 失败：返回 404 或其他错误

## 常见问题

### 问题 1：部署后仍返回 404

**可能原因：**
- 代码未正确上传
- 服务未重启
- 路由注册顺序问题

**解决方案：**
1. 检查服务器上的代码文件
2. 确认 `src/routes/modules/users.js` 包含 `router.put('/me', ...)`
3. 重启服务
4. 检查服务日志

### 问题 2：部署后返回 500 错误

**可能原因：**
- 代码语法错误
- 依赖未安装
- 数据库连接问题

**解决方案：**
1. 查看服务器日志
2. 检查 `npm install` 是否成功
3. 验证数据库连接配置

### 问题 3：接口返回但数据未更新

**可能原因：**
- 数据库连接问题
- 用户不存在
- 权限问题

**解决方案：**
1. 检查数据库连接
2. 验证 JWT Token 是否有效
3. 检查用户是否存在

## 回滚方案

如果部署后出现问题，可以回滚：

1. **Git 回滚**
   ```bash
   git revert HEAD
   git push origin main
   ```

2. **重新部署上一版本**
   - 在 Sealos 控制台选择上一版本
   - 或手动恢复代码文件

## 联系支持

如果部署过程中遇到问题，请提供：
- 错误日志
- 部署步骤
- 环境信息（Node.js 版本、操作系统等）

