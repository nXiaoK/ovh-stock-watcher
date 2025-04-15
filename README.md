# OVH 库存监控服务

这是一个用于监控OVH服务器库存状态的Web应用。它可以帮助用户及时了解OVH数据中心的服务器可用情况，并在库存状态变化时发送通知。

## 功能特点

- 支持监控多个数据中心的库存情况
- 实时显示库存状态和可用性
- 支持通过Telegram接收库存变更通知
- 可设定不同的检查间隔
- 监控特定的数据中心

## 运行方式

### 使用Docker运行

最简单的方式是使用Docker来运行此应用：

```bash
docker run -p 3000:3000 ghcr.io/USERNAME/ovh-stock-watcher-alert:latest
```

或者使用Docker Compose:

```bash
docker-compose up -d
```

### 本地开发环境

如果需要本地开发：

1. 克隆此仓库
```bash
git clone https://github.com/USERNAME/ovh-stock-watcher-alert.git
cd ovh-stock-watcher-alert
```

2. 安装依赖
```bash
npm install
```

3. 启动开发服务器
```bash
npm run dev
```

## 从GitHub构建Docker镜像

本项目已配置GitHub Actions工作流程，当代码推送到main分支或创建新的release时，会自动构建并发布Docker镜像到GitHub Container Registry。

### 使用自动构建的镜像

你可以直接使用GitHub自动构建的Docker镜像：

```bash
docker pull ghcr.io/USERNAME/ovh-stock-watcher-alert:latest
```

### 手动触发构建

你也可以在GitHub仓库的Actions页面手动触发构建流程。

## 配置Telegram通知

要启用Telegram通知，需要设置以下环境变量：

- `TELEGRAM_BOT_TOKEN`：你的Telegram机器人token
- `TELEGRAM_CHAT_ID`：接收通知的聊天ID

## 贡献

欢迎提交Pull Request或Issue来改进此项目。

## 许可

本项目采用MIT许可证。
