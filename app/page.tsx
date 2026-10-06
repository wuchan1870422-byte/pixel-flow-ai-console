"use client";

import { ChangeEvent, useEffect, useMemo, useState } from "react";
import Image from "next/image";

type Status = "queued" | "processing" | "completed" | "failed";
type Task = { id: string; fileName: string; prompt: string; status: Status; createdAt: string; attempts: number; result?: string };

const labels: Record<Status, string> = { queued: "等待队列", processing: "AI 处理中", completed: "已完成", failed: "待重试" };

export default function Home() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [fileName, setFileName] = useState("city-night.jpg");
  const [prompt, setPrompt] = useState("把城市夜景处理成电影感蓝调，保留霓虹细节");
  const [submitting, setSubmitting] = useState(false);
  const [active, setActive] = useState("任务队列");

  async function refresh() {
    const response = await fetch("/api/tasks", { cache: "no-store" });
    const data = await response.json();
    setTasks(data.tasks);
  }
  useEffect(() => { refresh(); const id = setInterval(refresh, 1300); return () => clearInterval(id); }, []);

  async function createTask() {
    setSubmitting(true);
    await fetch("/api/tasks", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ fileName, prompt }) });
    await refresh();
    setSubmitting(false);
  }
  async function retry(id: string) {
    await fetch(`/api/tasks/${id}/retry`, { method: "POST" });
    await refresh();
  }
  const completed = useMemo(() => tasks.filter((task) => task.status === "completed").length, [tasks]);
  const running = useMemo(() => tasks.filter((task) => ["queued", "processing"].includes(task.status)).length, [tasks]);

  return <main>
    <aside className="sidebar">
      <div className="brand"><span>◒</span> PixelFlow</div>
      <p className="workspace">WORKSPACE <b>Demo Studio⌄</b></p>
      <nav>{["任务队列", "媒体资源", "内容审核", "数据看板"].map((item, index) => <button key={item} onClick={() => setActive(item)} className={active === item ? "active" : ""}><i>{["▦", "▧", "✓", "◔"][index]}</i>{item}{item === "任务队列" && running > 0 ? <em>{running}</em> : null}</button>)}</nav>
      <div className="sidebar-bottom"><span className="avatar">E</span><div><strong>Eric</strong><small>管理员</small></div><span>•••</span></div>
    </aside>

    <section className="content">
      <header><div><p className="eyebrow">PIXELFLOW / {active.toUpperCase()}</p><h1>AI 影像任务控制台</h1><p className="sub">选择文件名，创建模拟任务，追踪状态与失败重试。</p></div><div className="live"><span />本地 Demo</div></header>
      <div className="stats"><Stat title="当前任务数" value={String(tasks.length)} trend="浏览器数据" /><Stat title="正在处理" value={String(running)} trend="实时" /><Stat title="完成任务数" value={String(completed)} trend="实时" /><Stat title="平均耗时（演示）" value="3.8s" trend="示例" /></div>
      <div className="grid">
        <section className="card create-card"><div className="card-title"><div><p className="eyebrow">NEW JOB</p><h2>创建图像处理任务</h2></div><span className="api-tag">Hono API</span></div>
          <label className="upload"><input type="file" accept="image/*" onChange={(event: ChangeEvent<HTMLInputElement>) => event.target.files?.[0] && setFileName(event.target.files[0].name)} /><span className="upload-icon">↑</span><b>{fileName}</b><small>仅记录文件名，不上传图片</small></label>
          <label className="field">处理指令<textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} /></label>
          <div className="model-row"><span>处理 <b>模拟 AI 任务</b></span><span>队列 <b>计时模拟</b></span></div>
          <button className="primary" onClick={createTask} disabled={submitting}>{submitting ? "正在创建…" : "创建 AI 任务  →"}</button>
        </section>
        <section className="card preview-card"><div className="card-title"><div><p className="eyebrow">OUTPUT PREVIEW</p><h2>示例结果预览</h2></div><span className="dot-label">DEMO</span></div>
          {tasks.some((task) => task.result) ? <Image src="/demo-preview.svg" alt="预设示例图片" width={960} height={540} unoptimized /> : <div className="empty">等待首个任务完成</div>}
          <div className="preview-caption"><span>预设示例图片 · 非模型生成</span></div>
        </section>
      </div>
      <section className="card table-card"><div className="card-title"><div><p className="eyebrow">ASYNC QUEUE</p><h2>任务队列</h2></div><button className="ghost" onClick={refresh}>刷新 ↻</button></div>
        <div className="table-head"><span>任务</span><span>处理指令</span><span>状态</span><span>创建时间</span><span /></div>
        {tasks.map((task) => <div className="task-row" key={task.id}><div className="task-name"><span className="thumb">◈</span><div><b>{task.fileName}</b><small>{task.id} · 第 {task.attempts} 次</small></div></div><p>{task.prompt}</p><span className={`status ${task.status}`}><i />{labels[task.status]}</span><time>{task.createdAt}</time>{task.status === "failed" ? <button className="retry" onClick={() => retry(task.id)}>重试</button> : <button className="more">•••</button>}</div>)}
      </section>
      <footer>Next.js 15 · TypeScript · Hono · Cookie 任务 Demo</footer>
    </section>
  </main>;
}

function Stat({ title, value, trend }: { title: string; value: string; trend: string }) { return <section className="stat"><p>{title}</p><strong>{value}</strong><span>{trend}</span></section>; }
