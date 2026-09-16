# 使用 Node.js 20 作为基础镜像
FROM node:20-slim

# 设置工作目录
WORKDIR /home/devbox/project

# 复制 package.json 和 package-lock.json
COPY package*.json ./

# 安装依赖
RUN npm ci --only=production

# 复制项目文件
COPY . .

# 暴露端口
EXPOSE 3000

# 设置启动命令
CMD ["/bin/bash", "-c", "/home/devbox/project/entrypoint.sh prod"]

