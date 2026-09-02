import {
  date,
  index,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { projectsTable } from "./projects";

export const projectTasksTable = pgTable(
  "project_tasks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projectsTable.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    status: text("status").notNull().default("Not Started"),
    priority: text("priority").notNull().default("Medium"),
    dueDate: date("due_date", { mode: "string" }),
    assignedTo: text("assigned_to").notNull().default(""),
    description: text("description").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("project_tasks_project_id_idx").on(table.projectId),
    index("project_tasks_status_idx").on(table.status),
  ],
);

export const insertProjectTaskSchema = createInsertSchema(
  projectTasksTable,
).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertProjectTask = z.infer<typeof insertProjectTaskSchema>;
export type ProjectTaskRow = typeof projectTasksTable.$inferSelect;