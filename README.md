# 菜菜参谋

给做饭小白的个人买菜决策 Agent。V0 跑通：

```text
图片 / 语音 / 文字
→ 模型理解
→ 查询画像、个人价格历史、库存与公开参考源
→ 给出购买建议
→ 保存本次价格观察
```

## 本地运行

macOS 可以直接在 Finder 中双击 `启动菜菜参谋.command`，它会启动服务并自动打开浏览器。

也可以使用命令行：

```bash
npm install
cp .env.example .env.local
npm run dev
```

打开 `http://localhost:3000`。

- 不填写 `OPENAI_API_KEY`：使用可运行的演示模式，支持有限的文字食材和价格解析。
- 填写密钥：启用图片理解、真实工具调用循环和语音转写。
- `data/grocery-state.json` 是每个环境的私有运行数据，不进入 Git。首次运行会根据公开的 `data/grocery-state.example.json` 自动创建。

## Docker 运行

项目提供独立的生产镜像和 Compose 配置。首次运行：

```bash
cp .env.production.example .env.production
docker compose up -d --build
```

容器只绑定到主机的 `127.0.0.1:3100`，不直接暴露到公网。服务器上应通过 Caddy 或 Nginx 提供 HTTPS 和访问保护。

`data/grocery-state.json` 会保存在名为 `grocery_agent_data` 的 Docker 数据卷中，重建容器不会删除个人画像、价格观察和库存。不要执行 `docker compose down -v`，除非明确希望删除这些数据。

完整部署流程见 `docs/DEPLOYMENT.md`。

## 当前价格策略

公开价格值得接入，但必须先确定城市、渠道与数据口径。当前版本已经提供公开价格适配器边界；在未配置可靠来源时，Agent 会明确返回“公开数据不可用”，不会把批发价冒充零售价。

## 项目文档

- `docs/MVP_SCOPE.md`：做什么与不做什么
- `docs/ARCHITECTURE.md`：模块边界和价格证据优先级
- `docs/BUILD_LOG.md`：每轮开发决策与真实使用发现
- `docs/DEPLOYMENT.md`：Docker 与腾讯云单机部署流程
- `supabase/schema.sql`：后续迁移到 Supabase 的表结构
