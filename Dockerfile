FROM node:18-alpine

WORKDIR /app

# 安装依赖
COPY package.json package-lock.json ./
RUN npm ci

# 复制应用代码
COPY . .

# 构建应用
RUN npm run build

# 暴露端口
EXPOSE 3000

# 启动命令
CMD ["npm", "start"] 