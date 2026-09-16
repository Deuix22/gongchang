# 删除用户接口 404 问题修复

## 问题诊断

**错误信息**:
```
DELETE https://hvoqpnuvbtfp.sealosbja.site/api/users/leader_bicrh7 404
Error: 资源不存在
```

**原因**: 生产环境运行的 Docker 镜像版本太旧，不包含新添加的 `DELETE /api/users/{userId}` 接口。

## 解决方案

### 快速修复步骤

#### 1. 确认本地代码已更新 ✅

本地代码已正确实现：
- ✅ `src/routes/modules/users.js` - 路由已注册
- ✅ `src/controllers/userController.js` - 控制器已实现
- ✅ `API_DOCUMENTATION.md` - 文档已更新

#### 2. 构建并推送新镜像

**选项 A: 使用 Sealos DevBox 版本发布（推荐）**

1. 在 DevBox 概览页面
2. 找到"版本历史"面板
3. 点击右上角 **"发布版本"** 按钮
4. 填写版本信息：
   - **版本号**: `1.2`（或递增版本号）
   - **版本描述**: `添加 DELETE /api/users/{userId} 删除用户接口`
5. 等待构建完成（状态变为"发版成功"）

**选项 B: 使用构建脚本**

```bash
cd /home/devbox/project
bash scripts/build-image.sh 1.2
```

**选项 C: 手动构建**

```bash
cd /home/devbox/project

# 登录镜像仓库
docker login hub.bja.sealos.run

# 构建镜像
docker build -t hub.bja.sealos.run/ns-o9xuidp4/devbox:1.2 .

# 推送镜像
docker push hub.bja.sealos.run/ns-o9xuidp4/devbox:1.2
```

#### 3. 更新应用配置

1. 在 Sealos 控制台，进入应用 `itkc01`
2. 点击右上角 **"变更"** 按钮
3. 在"基础配置"中找到"镜像名"字段
4. 将镜像版本更新为：`devbox:1.2`（或你构建的版本号）
5. 点击 **"变更"** 确认部署
6. 等待新 Pod 启动完成（状态变为 `running`）

#### 4. 验证部署

等待新 Pod 启动后，测试删除接口：

```bash
# 1. 登录获取 Token
TOKEN=$(curl -s -X POST https://hvoqpnuvbtfp.sealosbja.site/api/auth/login-admin \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"030426"}' \
  | grep -o '"token":"[^"]*' | cut -d'"' -f4)

# 2. 测试删除接口（替换为实际存在的非 admin 用户ID）
curl -X DELETE https://hvoqpnuvbtfp.sealosbja.site/api/users/leader_bicrh7 \
  -H "Authorization: Bearer $TOKEN" \
  | python3 -m json.tool
```

**预期响应** (200):
```json
{
  "success": true,
  "message": "用户删除成功",
  "deletedUser": {
    "userId": "leader_bicrh7",
    "nickName": "用户昵称",
    "role": "leader"
  }
}
```

## 检查清单

部署前：
- [x] 本地代码包含 `DELETE /api/users/{userId}` 实现
- [x] 路由已正确注册
- [x] 控制器已实现
- [ ] 本地测试通过（可选）

部署中：
- [ ] 构建新镜像（版本号：1.2 或更高）
- [ ] 推送镜像到仓库
- [ ] 更新应用镜像版本
- [ ] 等待新 Pod 启动完成

部署后：
- [ ] Pod 状态为 `running`
- [ ] 测试删除接口返回 200（不再是 404）
- [ ] 验证删除功能正常

## 常见问题

### Q: 为什么还是 404？

A: 可能的原因：
1. 镜像版本未更新（检查应用配置中的镜像版本）
2. 新 Pod 未启动成功（检查 Pod 状态和事件）
3. 路由注册顺序问题（已确认正确）

### Q: 如何确认镜像已更新？

A: 检查 Pod 详情中的 Events：
- 应该看到 `Pulled image "hub.bja.sealos.run/ns-o9xuidp4/devbox:1.2"`
- 而不是 `devbox:1.0` 或 `devbox:1.1`

### Q: 更新镜像后需要多久生效？

A: 通常 2-5 分钟，取决于：
- 镜像大小
- 网络速度
- 构建时间

## 相关文档

- 构建指南: `BUILD_IMAGE_GUIDE.md`
- 测试指南: `DELETE_USER_TEST.md`
- API 文档: `API_DOCUMENTATION.md` (2.6 节)
- 部署步骤: `SEALOS_UPDATE_STEPS.md`

