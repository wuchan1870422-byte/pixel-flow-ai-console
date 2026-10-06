import { Hono } from "hono";

type Status = "queued" | "processing" | "completed" | "failed";
type Task = {
  id: string;
  fileName: string;
  prompt: string;
  status: Status;
  createdAt: string;
  attempts: number;
  queuedAt?: number;
  result?: string;
};

const cookieName = "pixelflow_demo_tasks";
const preview = "/demo-preview.svg";

function seedTasks(): Task[] {
  return [
    { id: "tsk_8e1a", fileName: "shanghai-skyline.jpg", prompt: "cinematic dusk, editorial color grade", status: "completed", createdAt: "演示任务", attempts: 1, result: preview },
    { id: "tsk_02b7", fileName: "portrait.png", prompt: "soft studio light, clean skin texture", status: "processing", createdAt: "演示任务", attempts: 1, queuedAt: Date.now() - 1000 },
    { id: "tsk_f77c", fileName: "coffee.jpg", prompt: "warm morning light", status: "failed", createdAt: "演示任务", attempts: 2 },
  ];
}

function isTask(value: unknown): value is Task {
  if (!value || typeof value !== "object") return false;
  const task = value as Partial<Task>;
  return typeof task.id === "string" && typeof task.fileName === "string" &&
    typeof task.prompt === "string" && typeof task.createdAt === "string" &&
    typeof task.attempts === "number" &&
    ["queued", "processing", "completed", "failed"].includes(task.status ?? "");
}

function readTasks(cookieHeader?: string): { tasks: Task[]; fresh: boolean } {
  const encoded = cookieHeader?.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${cookieName}=`))?.slice(cookieName.length + 1);
  if (encoded && encoded.length <= 4000) {
    try {
      const parsed: unknown = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8"));
      if (Array.isArray(parsed) && parsed.length <= 8 && parsed.every(isTask)) return { tasks: parsed, fresh: false };
    } catch { /* An invalid demo cookie starts a fresh session. */ }
  }
  return { tasks: seedTasks(), fresh: true };
}

function setTasksCookie(tasks: Task[], url: string) {
  const retained = tasks.slice(0, 8);
  let value = Buffer.from(JSON.stringify(retained)).toString("base64url");
  while (value.length > 3800 && retained.length > 1) {
    retained.pop();
    value = Buffer.from(JSON.stringify(retained)).toString("base64url");
  }
  const secure = new URL(url).protocol === "https:" ? "; Secure" : "";
  return `${cookieName}=${value}; Path=/api/tasks; Max-Age=604800; SameSite=Lax; HttpOnly${secure}`;
}

function displayTask(task: Task): Task {
  if (!task.queuedAt || task.status === "failed") return task;
  const elapsed = Date.now() - task.queuedAt;
  if (elapsed < 500) return { ...task, status: "queued" };
  if (elapsed < 2600) return { ...task, status: "processing" };
  return { ...task, status: "completed", result: preview };
}

const api = new Hono()
  .get("/api/tasks", (c) => {
    const { tasks, fresh } = readTasks(c.req.header("cookie"));
    if (fresh) c.header("Set-Cookie", setTasksCookie(tasks, c.req.url));
    return c.json({ tasks: tasks.map(displayTask) });
  })
  .post("/api/tasks", async (c) => {
    let body: unknown;
    try { body = await c.req.json(); } catch { return c.json({ error: "Invalid JSON" }, 400); }
    if (!body || typeof body !== "object") return c.json({ error: "Invalid task" }, 400);
    const input = body as { fileName?: unknown; prompt?: unknown };
    const fileName = typeof input.fileName === "string" ? input.fileName.trim().slice(0, 100) : "";
    const prompt = typeof input.prompt === "string" ? input.prompt.trim().slice(0, 120) : "";
    const task: Task = {
      id: `tsk_${crypto.randomUUID().slice(0, 8)}`,
      fileName: fileName || "untitled-image.jpg",
      prompt: prompt || "AI image enhancement",
      status: "queued",
      createdAt: "刚刚",
      attempts: 1,
      queuedAt: Date.now(),
    };
    const { tasks } = readTasks(c.req.header("cookie"));
    c.header("Set-Cookie", setTasksCookie([task, ...tasks].slice(0, 8), c.req.url));
    return c.json({ task }, 201);
  })
  .post("/api/tasks/:id/retry", (c) => {
    const { tasks } = readTasks(c.req.header("cookie"));
    const task = tasks.find((item) => item.id === c.req.param("id"));
    if (!task) return c.json({ error: "Task not found" }, 404);
    if (displayTask(task).status !== "failed") return c.json({ error: "Only failed tasks can be retried" }, 409);
    task.status = "queued";
    task.attempts += 1;
    task.createdAt = "刚刚";
    task.queuedAt = Date.now();
    delete task.result;
    c.header("Set-Cookie", setTasksCookie(tasks, c.req.url));
    return c.json({ task });
  });

export const runtime = "nodejs";
export async function GET(request: Request) { return api.fetch(request); }
export async function POST(request: Request) { return api.fetch(request); }
