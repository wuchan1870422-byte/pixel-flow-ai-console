import { Hono } from "hono";

type Status = "queued" | "processing" | "completed" | "failed";
type Task = {
  id: string;
  fileName: string;
  prompt: string;
  status: Status;
  createdAt: string;
  attempts: number;
  result?: string;
};

const tasks: Task[] = [
  { id: "tsk_8e1a", fileName: "shanghai-skyline.jpg", prompt: "cinematic dusk, editorial color grade", status: "completed", createdAt: "刚刚", attempts: 1, result: "https://images.unsplash.com/photo-1537518427777-5f8b0d2d7b52?auto=format&fit=crop&w=640&q=80" },
  { id: "tsk_02b7", fileName: "portrait.png", prompt: "soft studio light, clean skin texture", status: "processing", createdAt: "2 分钟前", attempts: 1 },
  { id: "tsk_f77c", fileName: "coffee.jpg", prompt: "warm morning light", status: "failed", createdAt: "12 分钟前", attempts: 2 }
];

function completeTask(id: string) {
  setTimeout(() => {
    const task = tasks.find((item) => item.id === id);
    if (!task || task.status === "failed") return;
    task.status = "processing";
    setTimeout(() => {
      if (!task || task.status === "failed") return;
      task.status = "completed";
      task.result = "https://images.unsplash.com/photo-1470770841072-f978cf4d019e?auto=format&fit=crop&w=640&q=80";
    }, 2100);
  }, 500);
}

const api = new Hono()
  .get("/api/tasks", (c) => c.json({ tasks }))
  .post("/api/tasks", async (c) => {
    const body = await c.req.json<{ fileName?: string; prompt?: string }>();
    const task: Task = {
      id: `tsk_${Math.random().toString(36).slice(2, 7)}`,
      fileName: body.fileName || "untitled-image.jpg",
      prompt: body.prompt || "AI image enhancement",
      status: "queued",
      createdAt: "刚刚",
      attempts: 1
    };
    tasks.unshift(task);
    completeTask(task.id);
    return c.json({ task }, 201);
  })
  .post("/api/tasks/:id/retry", (c) => {
    const task = tasks.find((item) => item.id === c.req.param("id"));
    if (!task) return c.json({ error: "Task not found" }, 404);
    task.status = "queued";
    task.attempts += 1;
    task.createdAt = "刚刚";
    completeTask(task.id);
    return c.json({ task });
  });

export const runtime = "nodejs";
export async function GET(request: Request) { return api.fetch(request); }
export async function POST(request: Request) { return api.fetch(request); }
