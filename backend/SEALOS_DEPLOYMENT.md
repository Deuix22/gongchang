# Sealos 部署分析

## 当前部署状态

根据 Sealos 控制台界面信息：

### 应用基本信息
- **应用名称**: itkc01
- **状态**: 运行中 ✅
- **创建时间**: 2025-11-13 04:19
- **公网地址**: `https://hvoqpnuvbtfp.sealosbja.site`
- **容器暴露端口**: 3000

### 启动配置 ⚙️

**关键配置信息**:
- **运行命令**: `/bin/bash -c`
- **命令参数**: `/home/devbox/project/entrypoint.sh prod`
- **镜像版本**: `hub.bja.sealos.run/ns-o9xuidp4/devbox:1.1` ✅（已更新）
- **代码路径**: `/home/devbox/project/`

**启动流程**:
1. 容器启动后执行 `/bin/bash -c /home/devbox/project/entrypoint.sh prod`
2. `entrypoint.sh` 检测到 `prod` 参数，执行 `npm start`
3. 应用运行在端口 3000

### Pod 状态 📦 ⚠️

**当前 Pod 列表**:
- **Pod 1**: `itkc01-656b956889-8vksd` - 状态: `running` ✅（旧 Pod，运行 `devbox:1.0`）
- **Pod 2**: `itkc01-7d5ff55cbf-6fksv` - 状态: `waiting` ❌（新 Pod，**镜像拉取失败**）

**关键问题**:
- ❌ **新 Pod 无法启动**：镜像 `devbox:1.1` **不存在**
- 错误信息：`Failed to pull image "hub.bja.sealos.run/ns-o9xuidp4/devbox:1.1": not found`
- ✅ **旧 Pod 仍在运行**：使用 `devbox:1.0`，所以接口返回 404

**解决方案**：
1. **必须先构建并推送镜像 `devbox:1.1`**（参考 `BUILD_IMAGE_GUIDE.md`）
2. 然后新 Pod 才能成功启动
3. 详细说明请参考 `DEVBOX_AND_PODS_EXPLAINED.md`

### 部署状态 ⚠️

**镜像版本**: `hub.bja.sealos.run/ns-o9xuidp4/devbox:1.1` ⚠️

**部署状态**:
- ⚠️ **应用配置已更新**到 `devbox:1.1`，但**镜像不存在**
- ❌ **新 Pod 启动失败**：无法拉取镜像 `devbox:1.1`
- ✅ **旧 Pod 仍在运行**：使用 `devbox:1.0`（不包含新接口）

**问题根源**：
- 只更新了应用配置中的镜像版本
- **但没有构建和推送新镜像到仓库**
- 需要先构建镜像，参考 `BUILD_IMAGE_GUIDE.md`

### 资源使用情况
- **CPU**: 0.03% (1 Core 限制)
- **内存**: 1.26% (4 Gi 限制)
- **实例数**: 1（配置为固定实例）
- **Pod 状态**: 
  - 旧 Pod: `running` ✅
  - 新 Pod: `waiting` ⏳（正在启动）

## 解决方案

### 方案一：重新构建并部署（推荐）

1. **在 Sealos 控制台操作**
   - 点击"变更"按钮
   - 更新镜像版本或重新构建镜像
   - 确保最新代码已包含在镜像中

2. **或者使用 Sealos CLI**
   ```bash
   # 构建新镜像
   sealos build -t hub.bja.sealos.run/ns-o9xuidp4/devbox:1.1 .
   
   # 推送镜像
   sealos push hub.bja.sealos.run/ns-o9xuidp4/devbox:1.1
   
   # 更新应用镜像
   # 在 Sealos 控制台或使用 kubectl 更新 deployment
   ```

### 方案二：重启服务（如果代码通过挂载卷同步）

**适用场景**: 如果代码是通过存储卷挂载到 `/home/devbox/project/` 的

1. **在 Sealos 控制台**
   - 返回到应用概览页面
   - 点击右上角"重启"按钮
   - 等待 Pod 重新启动（通常 1-2 分钟）

2. **验证重启**
   - 检查 Pod 状态变为 running
   - 运行验证脚本确认接口是否正常
   ```bash
   bash scripts/verify-deployment.sh
   ```

**注意**: 如果重启后仍然是 404，说明代码是打包在镜像中的，需要使用方案一

### 方案三：检查代码是否已更新

如果使用挂载卷或代码同步：

1. **检查容器内代码**
   ```bash
   # 进入容器检查
   kubectl exec -it itkc01-656b956889-8vksd -- ls -la /path/to/code
   
   # 检查路由文件
   kubectl exec -it itkc01-656b956889-8vksd -- cat /path/to/src/routes/modules/users.js
   ```

2. **如果代码已更新但未生效**
   - 重启服务（方案二）
   - 或检查服务是否自动重载代码

## 部署步骤（详细）

### 1. 确认代码已提交

```bash
# 检查本地代码
git status
git log --oneline -5

# 确认包含 PUT /api/users/me 的实现
grep -r "router.put.*me" src/
```

### 2. 构建新镜像

**选项 A：使用 Sealos 自动构建**
- 在 Sealos 控制台触发构建
- 或配置 CI/CD 自动构建

**选项 B：手动构建**
```bash
# 在项目目录
docker build -t hub.bja.sealos.run/ns-o9xuidp4/devbox:1.1 .
docker push hub.bja.sealos.run/ns-o9xuidp4/devbox:1.1
```

### 3. 更新应用

**在 Sealos 控制台**:
1. 在应用概览页面，点击右上角"变更"按钮
2. 进入"更新应用"页面
3. 在"基础配置"中找到"镜像名"字段
4. 将镜像版本从 `devbox:1.0` 更新为 `devbox:1.1`（或最新版本）
5. 确认其他配置无误：
   - 运行命令: `/bin/bash -c`
   - 命令参数: `/home/devbox/project/entrypoint.sh prod`
   - 容器暴露端口: `3000`
   - 开启公网访问: ✅
6. 点击右上角"变更"按钮确认部署
7. 等待部署完成（观察 Pod 状态变化）

**或使用 kubectl**:
```bash
kubectl set image deployment/itkc01 \
  devbox=hub.bja.sealos.run/ns-o9xuidp4/devbox:1.1 \
  -n ns-o9xuidp4
```

### 4. 等待部署完成

- 观察 Pod 状态
- 等待新 Pod 启动（Status: running）
- 检查启动日志确认无错误

### 5. 验证部署

```bash
# 运行验证脚本
bash scripts/verify-deployment.sh

# 或手动测试
TOKEN=$(curl -s -X POST https://hvoqpnuvbtfp.sealosbja.site/api/auth/login-admin \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"030426"}' \
  | grep -o '"token":"[^"]*' | cut -d'"' -f4)

curl -X PUT https://hvoqpnuvbtfp.sealosbja.site/api/users/me \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"nickName":"部署验证"}'
```

## 检查清单

部署前：
- [ ] 确认本地代码包含 `PUT /api/users/me` 实现
- [ ] 本地测试接口正常
- [ ] 代码已提交到版本控制

部署中：
- [ ] 构建新镜像（或确认代码已同步）
- [ ] 更新应用镜像版本
- [ ] 等待 Pod 重新启动

部署后：
- [ ] Pod 状态为 running
- [ ] 运行验证脚本
- [ ] 确认接口返回 200 而不是 404

## 常见问题

### Q: 为什么重启后还是 404？
A: 可能是镜像未更新。需要重新构建镜像并更新应用配置。

### Q: 如何确认代码已更新？
A: 进入容器检查文件，或查看构建日志确认最新代码已包含。

### Q: 更新镜像后需要多久生效？
A: 通常几分钟内，取决于镜像大小和网络速度。观察 Pod 状态变化。

## 监控建议

部署后持续监控：
- Pod 状态和重启次数
- CPU 和内存使用率
- 应用日志（查看是否有错误）
- API 响应时间

## 回滚方案

如果新版本有问题：

1. **在 Sealos 控制台**
   - 点击"变更"
   - 将镜像版本改回 `devbox:1.0`
   - 确认回滚

2. **或使用 kubectl**
   ```bash
   kubectl rollout undo deployment/itkc01 -n ns-o9xuidp4
   ```

