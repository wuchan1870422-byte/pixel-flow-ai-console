import { Hono } from "hono";
import { and, desc, eq, lt, sql } from "drizzle-orm";
import { getDb } from "../../../../lib/db";
import { tasks } from "../../../../lib/db/schema";

const cookieName = "pixelflow_session";
const preview = "/demo-preview.svg";

function session(c: { req: { header(name: string): string | undefined; url: string }; header(name: string, value: string): void }) {
  const raw = c.req.header("cookie")?.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${cookieName}=`))?.slice(cookieName.length + 1);
  if (raw && /^[0-9a-f-]{36}$/.test(raw)) return raw;
  const id = crypto.randomUUID();
  const secure = new URL(c.req.url).protocol === "https:" ? "; Secure" : "";
  c.header("Set-Cookie", `${cookieName}=${id}; Path=/api/tasks; Max-Age=31536000; SameSite=Lax; HttpOnly${secure}`);
  return id;
}

const api = new Hono()
  .get("/api/tasks", async (c) => {
    const sessionId = session(c);
    const rows = await getDb().select().from(tasks).where(eq(tasks.sessionId, sessionId)).orderBy(desc(tasks.createdAt)).limit(100);
    return c.json({ tasks: rows });
  })
  .post("/api/tasks", async (c) => {
    let body: unknown;
    try { body = await c.req.json(); } catch { return c.json({ error: "Invalid JSON" }, 400); }
    if (!body || typeof body !== "object") return c.json({ error: "Invalid task" }, 400);
    const input = body as { fileName?: unknown; prompt?: unknown; simulateFailure?: unknown };
    const fileName = typeof input.fileName === "string" ? input.fileName.trim().slice(0, 100) : "";
    const prompt = typeof input.prompt === "string" ? input.prompt.trim().slice(0, 1000) : "";
    if (!prompt) return c.json({ error: "Prompt is required" }, 400);
    const [task] = await getDb().insert(tasks).values({
      id: `tsk_${crypto.randomUUID()}`,
      sessionId: session(c),
      fileName: fileName || "untitled-image.jpg",
      prompt,
      simulateFailure: input.simulateFailure === true,
    }).returning();
    return c.json({ task }, 201);
  })
  .post("/api/tasks/sync", async (c) => {
    const sessionId = session(c);
    const db = getDb();
    const now = new Date();
    const processingCutoff = new Date(now.getTime() - 2600);
    const queuedCutoff = new Date(now.getTime() - 500);

    // Conditional updates make polling safe across concurrent Vercel instances.
    await db.update(tasks).set({ status: "failed", error: "演示失败：可点击重试", updatedAt: now })
      .where(and(eq(tasks.sessionId, sessionId), eq(tasks.status, "processing"), eq(tasks.simulateFailure, true), eq(tasks.retryCount, 0), lt(tasks.queuedAt, processingCutoff)));
    await db.update(tasks).set({ status: "completed", outputImageUrl: preview, updatedAt: now })
      .where(and(eq(tasks.sessionId, sessionId), eq(tasks.status, "processing"), lt(tasks.queuedAt, processingCutoff)));
    await db.update(tasks).set({ status: "processing", updatedAt: now })
      .where(and(eq(tasks.sessionId, sessionId), eq(tasks.status, "queued"), lt(tasks.queuedAt, queuedCutoff)));
    return c.json({ ok: true });
  })
  .post("/api/tasks/:id/retry", async (c) => {
    const sessionId = session(c);
    const db = getDb();
    const [task] = await db.update(tasks).set({
      status: "queued", retryCount: sql`${tasks.retryCount} + 1`, error: null, outputImageUrl: null,
      queuedAt: new Date(), updatedAt: new Date(),
    }).where(and(eq(tasks.id, c.req.param("id")), eq(tasks.sessionId, sessionId), eq(tasks.status, "failed"))).returning();
    if (task) return c.json({ task });
    const [existing] = await db.select({ id: tasks.id }).from(tasks).where(and(eq(tasks.id, c.req.param("id")), eq(tasks.sessionId, sessionId))).limit(1);
    return existing ? c.json({ error: "Only failed tasks can be retried" }, 409) : c.json({ error: "Task not found" }, 404);
  });

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: Request) { return api.fetch(request); }
export async function POST(request: Request) { return api.fetch(request); }
