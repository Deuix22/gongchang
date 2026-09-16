# 部署检查清单

## ✅ 部署前检查

### 代码检查
- [ ] 确认 `src/routes/modules/users.js` 包含 `router.put('/me', authenticate, updateCurrentUser)`
- [ ] 确认 `src/controllers/userController.js` 包含 `updateCurrentUser` 函数
- [ ] 本地测试接口是否正常

### 本地验证
```bash
# 1. 启动本地服务
bash entrypoint.sh development

# 2. 测试接口
TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login-admin \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"030426"}' \
  | grep -o '"token":"[^"]*' | cut -d'"' -f4)

curl -X PUT http://localhost:3000/api/users/me \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"nickName":"测试"}'
```

预期结果：返回 200 状态码和用户信息

## 🚀 部署步骤

### 1. 提交代码
```bash
git add .
git commit -m "feat: 实现 PUT /api/users/me 接口"
git push origin main
```

### 2. 部署到生产环境
- 在 Sealos 控制台重新部署应用
- 或手动上传代码并重启服务

### 3. 等待部署完成
- 检查部署日志
- 确认服务已启动

## ✅ 部署后验证

### 自动验证
```bash
bash scripts/verify-deployment.sh
```

### 手动验证
```bash
# 1. 登录获取 Token
TOKEN=$(curl -s -X POST https://hvoqpnuvbtfp.sealosbja.site/api/auth/login-admin \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"030426"}' \
  | grep -o '"token":"[^"]*' | cut -d'"' -f4)

# 2. 测试 PUT 接口
curl -X PUT https://hvoqpnuvbtfp.sealosbja.site/api/users/me \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"nickName":"部署测试"}'
```

预期结果：
- ✅ HTTP 200 状态码
- ✅ 返回更新后的用户信息
- ✅ `nickName` 字段已更新

## ❌ 问题排查

### 如果返回 404
1. 检查代码是否已部署
2. 检查服务是否已重启
3. 检查路由注册是否正确

### 如果返回 500
1. 查看服务器日志
2. 检查依赖是否安装
3. 检查数据库连接

### 如果返回 401
1. 检查 Token 是否有效
2. 检查 Token 是否过期
3. 重新登录获取新 Token

## 📝 相关文件

- 部署指南：`deploy-guide.md`
- 验证脚本：`scripts/verify-deployment.sh`
- API 文档：`API_DOCUMENTATION.md`

