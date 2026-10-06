# PixelFlow — AI 图像任务控制台

PixelFlow 是一个**可在本地运行的全栈 Demo**，展示图像处理任务从创建、排队、处理、完成到失败重试的工作流，以及配套的响应式控制台。项目使用 Next.js 15、TypeScript 和 Hono。

## 当前实现

- 控制台展示任务列表、状态、结果预览和创建表单；页面定时获取最新任务状态。
- `GET /api/tasks` 查询任务，`POST /api/tasks` 创建任务，`POST /api/tasks/:id/retry` 重新排入任务。
- 新任务由内存计时器模拟 `queued → processing → completed`；预置一条 `failed` 任务用于演示重试。
- 任务保存在服务端进程内存中。**重启进程会丢失新建任务；多实例之间不会共享状态。**
- 选择本地图片时，当前只读取文件名并写入任务记录，**不会上传图片内容**。结果预览使用预设的外部示例图片，不调用真实 AI 图像模型。
- 控制台中的平均耗时展示指标为演示数据，不代表实际任务统计。

## 本地运行

需要 Node.js 和 npm。运行：

```bash
npm install
npm run dev
```

打开 [http://localhost:3000](http://localhost:3000)。创建任务后可观察排队、处理和完成状态；对预置失败任务点击“重试”可观察重新入队。也可以运行 `npm run build` 和 `npm run lint` 检查项目。

## 架构演进路线（尚未接入）

| 环节 | 当前 Demo | 后续方案 |
| --- | --- | --- |
| 任务存储 | 进程内存数组 | PostgreSQL 持久化任务、状态、尝试次数和时间戳；用事务保护状态流转 |
| 素材与结果 | 仅记录文件名，预设图片 URL | 对象存储（如 S3/R2）保存原图和产物；使用短期签名 URL 上传与访问 |
| 任务执行 | `setTimeout` 模拟异步处理 | 队列（如 BullMQ/Cloud Tasks）投递任务，由独立 Worker 消费，提供重试、幂等和超时处理 |
| 图像生成 | 预设结果图 | Worker 调用真实 AI 图像模型，将输出写入对象存储，再更新 PostgreSQL 任务状态 |
| 运行观测 | 静态演示指标 | 记录实际耗时、错误码、重试次数和模型成本，生成真实统计 |

计划中的链路：浏览器取得签名上传地址并上传素材 → API 将任务写入 PostgreSQL 并投递队列 → Worker 调用模型、保存结果并更新状态 → 控制台查询任务状态与结果。上述服务**均未在当前 Demo 中实现**。

## 本地截图

在本地运行并截取控制台页面后，将图片保存为 `docs/pixelflow-console.png`，再把下方内容加入 README：

```md
![PixelFlow 控制台截图](docs/pixelflow-console.png)
```

提交图片和 README 后，GitHub 页面会显示截图。
