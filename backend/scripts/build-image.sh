#!/bin/bash

# 镜像构建和推送脚本
# 用法: bash scripts/build-image.sh [版本号]
# 示例: bash scripts/build-image.sh 1.1

set -e

VERSION=${1:-1.1}
IMAGE_NAME="hub.bja.sealos.run/ns-o9xuidp4/devbox"
FULL_IMAGE_NAME="${IMAGE_NAME}:${VERSION}"

echo "=========================================="
echo "构建和推送 Docker 镜像"
echo "=========================================="
echo "镜像名称: ${FULL_IMAGE_NAME}"
echo ""

# 检查是否在项目目录
if [ ! -f "package.json" ]; then
    echo "❌ 错误: 请在项目根目录执行此脚本"
    exit 1
fi

# 检查 Docker 是否安装
if ! command -v docker &> /dev/null; then
    echo "❌ 错误: Docker 未安装"
    exit 1
fi

# 步骤 1: 构建镜像
echo "📦 步骤 1: 构建镜像..."
docker build -t ${FULL_IMAGE_NAME} .

if [ $? -ne 0 ]; then
    echo "❌ 镜像构建失败"
    exit 1
fi

echo "✅ 镜像构建成功"
echo ""

# 步骤 2: 检查是否需要登录
echo "🔐 步骤 2: 检查登录状态..."
if ! docker info | grep -q "hub.bja.sealos.run"; then
    echo "⚠️  需要登录到 Sealos 镜像仓库"
    echo "请执行: docker login hub.bja.sealos.run"
    read -p "是否现在登录? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        docker login hub.bja.sealos.run
    else
        echo "❌ 未登录，无法推送镜像"
        exit 1
    fi
fi

# 步骤 3: 推送镜像
echo "📤 步骤 3: 推送镜像到仓库..."
docker push ${FULL_IMAGE_NAME}

if [ $? -ne 0 ]; then
    echo "❌ 镜像推送失败"
    exit 1
fi

echo "✅ 镜像推送成功"
echo ""

# 步骤 4: 验证镜像
echo "🔍 步骤 4: 验证镜像..."
docker pull ${FULL_IMAGE_NAME} > /dev/null 2>&1

if [ $? -eq 0 ]; then
    echo "✅ 镜像验证成功"
else
    echo "⚠️  镜像验证失败，但可能已推送成功"
fi

echo ""
echo "=========================================="
echo "✅ 完成！"
echo "=========================================="
echo "镜像地址: ${FULL_IMAGE_NAME}"
echo ""
echo "下一步操作:"
echo "1. 在 Sealos 控制台，进入应用 itkc01"
echo "2. 点击'变更'按钮"
echo "3. 将镜像版本更新为: devbox:${VERSION}"
echo "4. 点击'变更'确认部署"
echo "5. 等待新 Pod 启动完成"
echo "6. 运行验证脚本: bash scripts/verify-deployment.sh"
echo "=========================================="


