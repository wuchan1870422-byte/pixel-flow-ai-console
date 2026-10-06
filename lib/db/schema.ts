import { boolean, index, integer, pgEnum, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const taskStatus = pgEnum("task_status", ["queued", "processing", "completed", "failed"]);

export const tasks = pgTable("tasks", {
  id: text("id").primaryKey(),
  sessionId: text("session_id").notNull(),
  fileName: text("file_name").notNull(),
  prompt: text("prompt").notNull(),
  status: taskStatus("status").notNull().default("queued"),
  retryCount: integer("retry_count").notNull().default(0),
  error: text("error"),
  inputImageUrl: text("input_image_url"),
  outputImageUrl: text("output_image_url"),
  simulateFailure: boolean("simulate_failure").notNull().default(false),
  queuedAt: timestamp("queued_at", { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [index("tasks_session_created_idx").on(table.sessionId, table.createdAt)]);

export type Task = typeof tasks.$inferSelect;
