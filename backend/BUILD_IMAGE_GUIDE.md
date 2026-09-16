# 镜像构建和发布指南

## 问题诊断

根据 Pod 事件日志，问题在于：
```
Failed to pull image "hub.bja.sealos.run/ns-o9xuidp4/devbox:1.1": not found
```

**原因**：镜像 `devbox:1.1` 不存在于镜像仓库中。只更新了应用配置中的镜像版本，但没有构建和推送新镜像。

## 解决方案

### 方案一：使用 Sealos DevBox 版本发布功能（推荐）

根据 Sealos DevBox 的"版本历史"功能，可以发布新版本：

1. **在 DevBox 概览页面**
   - 找到"版本历史"面板
   - 点击右上角 **"发布版本"** 按钮（上传图标）

2. **填写版本信息**
   - **版本号**: `1.1`
   - **版本描述**: `添加 PUT /api/users/me 接口`
   - 确认代码已保存

3. **等待构建完成**
   - Sealos 会自动构建镜像
   - 构建完成后，版本状态会变为"发版成功"

4. **在应用 itkc01 中更新镜像**
   - 进入应用 itkc01 的"更新应用"页面
   - 将镜像版本更新为 `devbox:1.1`
   - 点击"变更"确认部署

### 方案二：使用 Docker 命令手动构建（在 DevBox 中）

如果 Sealos 自动构建不可用，可以在 DevBox 中手动构建：

#### 步骤 1: 登录到 Sealos 镜像仓库

```bash
# 在 DevBox 终端中执行
docker login hub.bja.sealos.run
# 输入 Sealos 账号密码
```

#### 步骤 2: 构建镜像

```bash
# 在项目目录 /home/devbox/project
cd /home/devbox/project

# 构建镜像
docker build -t hub.bja.sealos.run/ns-o9xuidp4/devbox:1.1 .

# 查看构建的镜像
docker images | grep devbox
```

#### 步骤 3: 推送镜像到仓库

```bash
# 推送镜像
docker push hub.bja.sealos.run/ns-o9xuidp4/devbox:1.1
```

#### 步骤 4: 验证镜像已推送

```bash
# 检查镜像是否存在
docker pull hub.bja.sealos.run/ns-o9xuidp4/devbox:1.1
```

#### 步骤 5: 更新应用配置

1. 在 Sealos 控制台，进入应用 itkc01
2. 点击"变更"按钮
3. 确认镜像版本为 `devbox:1.1`
4. 点击"变更"确认部署

### 方案三：使用 Sealos CLI（如果已安装）

```bash
# 构建镜像
sealos build -t hub.bja.sealos.run/ns-o9xuidp4/devbox:1.1 .

# 推送镜像
sealos push hub.bja.sealos.run/ns-o9xuidp4/devbox:1.1
```

## 快速操作脚本

已创建快速构建脚本 `scripts/build-image.sh`，可以直接运行：

```bash
bash scripts/build-image.sh 1.1
```

## 验证步骤

### 1. 确认镜像已构建

```bash
# 在 DevBox 中检查
docker images | grep devbox:1.1
```

### 2. 确认镜像已推送

```bash
# 尝试拉取镜像（如果不存在会报错）
docker pull hub.bja.sealos.run/ns-o9xuidp4/devbox:1.1
```

### 3. 更新应用并观察 Pod

1. 在应用 itkc01 中更新镜像版本为 `1.1`
2. 观察新 Pod 的启动状态
3. 检查 Pod 事件，确认镜像拉取成功

### 4. 验证接口

```bash
# 等待新 Pod 启动完成后
bash scripts/verify-deployment.sh
```

## 常见问题

### Q: 构建镜像时提示权限不足？

A: 确保已登录到 Sealos 镜像仓库：
```bash
docker login hub.bja.sealos.run
```

### Q: 推送镜像时提示 "unauthorized"？

A: 检查登录状态，重新登录：
```bash
docker logout hub.bja.sealos.run
docker login hub.bja.sealos.run
```

### Q: 镜像构建成功但推送失败？

A: 检查网络连接和镜像仓库地址是否正确。

### Q: 如何确认镜像包含最新代码？

A: 构建前确认：
```bash
# 检查代码是否包含新接口
grep -r "router.put.*me" src/routes/modules/users.js
grep -r "updateCurrentUser" src/controllers/userController.js
```

## 回滚方案

如果新镜像有问题，可以回滚到旧版本：

1. 在应用 itkc01 的"更新应用"页面
2. 将镜像版本改回 `devbox:1.0`
3. 点击"变更"确认回滚

## 下一步

构建并推送镜像后：
1. ✅ 更新应用配置中的镜像版本
2. ✅ 等待新 Pod 启动完成
3. ✅ 运行验证脚本确认接口正常
4. ✅ 可以关闭 DevBox 节省资源


