# PixelFlow — AI 图像任务控制台

PixelFlow 是一个可运行的全栈 Demo，展示图像处理任务的创建、排队、处理、完成、失败和重试。当前任务数据使用 **Neon PostgreSQL + Drizzle ORM 持久化**；任务执行和图像结果仍是模拟，不调用真实 AI 模型。

**Live Demo：** https://pixel-flow-ai-console.vercel.app

## 当前实现

- Next.js 15、TypeScript、Hono API、Drizzle ORM、PostgreSQL；响应式控制台定时刷新任务。
- `GET /api/tasks` 查询当前浏览器会话的任务；`POST /api/tasks` 创建任务；`POST /api/tasks/sync` 根据演示时间推进数据库中的任务状态；`POST /api/tasks/:id/retry` 对失败任务重试。
- `tasks` 表保存任务 ID、指令、状态、重试次数、错误、输入和输出图片 URL、创建和更新时间，以及演示所需的会话 ID、文件名和排队时间。所有状态变化写入 PostgreSQL。浏览器 Cookie 只保存会话 ID，不保存任务数据。最多显示最近 100 条任务。
- 勾选“模拟首次失败”后创建任务，可观察失败并点击重试。重试后任务重新排队并完成。状态推进由打开页面时的轮询请求触发；页面关闭后不会有后台 Worker 自动处理。
- 选择本地图片时只记录文件名，**不会上传图片内容**；`inputImageUrl` 当前为空。完成状态的 `outputImageUrl` 指向仓库自带的示例 SVG，**不是模型生成图像**。平均耗时卡片是演示数值。

## 本地运行

需要 Node.js 和一个 PostgreSQL 数据库。推荐在 Vercel Marketplace 创建 Neon 数据库。复制 `.env.example` 为 `.env.local`，填入 `DATABASE_URL`；如有直连地址，可填写 `DATABASE_URL_UNPOOLED` 供迁移使用。不要提交 `.env.local`。

```bash
npm install
npm run db:migrate
npm run dev
```

打开 http://localhost:3000。修改数据库结构后运行 `npm run db:generate` 生成新的 SQL migration，再执行 `npm run db:migrate`。检查命令：`npm run build`、`npm run lint`。

## Vercel 部署

将仓库导入 Vercel，并通过 Marketplace 将 Neon 数据库连接到项目的 Production 环境。确认 Vercel 中有 `DATABASE_URL`；部署前对该数据库执行 `npm run db:migrate`。仓库已包含 `drizzle/` 下的版本化 migration。Vercel 构建无需连接数据库，运行时 API 需要 `DATABASE_URL`。Preview 环境应使用独立数据库或分支，避免测试任务混入 Production。

## 后续架构路线

| 环节 | 当前 Demo | 后续方案 |
| --- | --- | --- |
| 任务数据 | PostgreSQL 持久化；浏览器会话隔离 | 增加用户认证、权限和任务保留策略 |
| 素材与结果 | 只记录文件名；使用示例 SVG | 对象存储（S3/R2）保存原图和结果，签名 URL 上传与访问 |
| 任务执行 | 页面轮询请求推进模拟状态 | 队列投递任务，独立 Worker 消费；实现幂等、超时和失败重试 |
| 图像生成 | 无真实模型 | Worker 调用真实 AI 模型，输出写入对象存储并更新 PostgreSQL |
| 运行观测 | 平均耗时为演示数据 | 记录实际耗时、错误码、模型成本和队列指标 |

计划链路：浏览器上传素材到对象存储 → API 创建 PostgreSQL 任务并投递队列 → Worker 调用模型、保存结果并更新任务状态 → 控制台查询结果。**对象存储、队列、Worker 和真实图像模型尚未接入。**

## 添加本地截图

本地运行项目并截取控制台页面，将图片保存为 `docs/pixelflow-console.png`，然后在 README 中加入：

```md
![PixelFlow 控制台截图](docs/pixelflow-console.png)
```

提交图片与 README 后，GitHub 页面会展示截图。
