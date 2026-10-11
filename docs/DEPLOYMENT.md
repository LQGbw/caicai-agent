# Docker 与腾讯云部署

## 当前边界

- 本地开发继续使用 `npm run dev`，Docker 用于生产部署。
- 只运行一个买菜 Agent 实例，不引入集群、远程缓存或数据库。
- 应用不直接暴露公网；公网访问由反向代理提供 HTTPS、请求限制和访问保护。
- 观察、建议和确认购买仍是三种不同状态；部署方式不改变这条产品边界。

## 服务器布局

```text
公网 80 / 443
      |
Caddy 或 Nginx（HTTPS + 访问保护）
      |
127.0.0.1:3100
      |
grocery-agent 容器
      |
grocery_agent_data 数据卷
```

知识卡和记账工具后续分别使用独立容器，不与买菜 Agent 共享运行时和数据卷。

公网入口使用 `deploy/caddy` 中的独立 Caddy 容器。它与应用通过外部 Docker 网络 `web` 通信；应用自身的 3100 端口仍只绑定在主机回环地址。

首次创建入口：

```bash
docker network create web
cd deploy/caddy
cp .env.proxy.example .env.proxy
# 在 .env.proxy 中填写 bcrypt 密码哈希
docker compose -p edge-proxy up -d
```

## 本地验证

```bash
cp .env.production.example .env.production
docker compose up -d --build
docker compose ps
curl http://127.0.0.1:3100/api/profile
```

不配置 API Key 时会运行演示模式。可以把密钥写入服务器的 `.env.production`，也可以在 HTTPS 页面 `/settings` 中保存。两种方式都不会把密钥写入 Dockerfile、镜像或 Git；页面保存的设置位于私有数据卷。

## 部署到腾讯云

部署前确认：

1. Ubuntu 版本、CPU 和内存规格。
2. Docker Engine 和 Docker Compose 插件是否已安装。
3. 域名是否已解析到服务器公网 IP。
4. 腾讯云安全组只放行 SSH、HTTP 和 HTTPS，不放行 3100 端口。

将项目放到服务器上的独立目录后：

```bash
cp .env.production.example .env.production
# 使用编辑器在 .env.production 中填写服务器端密钥和模型 ID
docker compose up -d --build
docker compose ps
docker compose logs --tail=100 grocery-agent
```

应用健康后，再配置 Caddy 或 Nginx 将域名转发到 `127.0.0.1:3100`。在当前单用户版本没有登录系统的情况下，反向代理必须增加至少一层密码保护。

## 更新与回滚

更新前先备份数据卷，再重建镜像。不使用 `docker compose down -v`，因为 `-v` 会删除持久化数据。

对于第一版，回滚方式是保留上一个镜像标签，并让 Compose 重新指向它。数据卷与应用镜像分离，回滚应用时不会自动回滚用户数据。

## 数据备份

个人数据位于 Docker 数据卷的 `/app/data/grocery-state.json`；页面保存的模型连接信息位于 `/app/data/ai-settings.json`。备份文件应加密并离开服务器保存，不应公开分享或提交到 Git。
