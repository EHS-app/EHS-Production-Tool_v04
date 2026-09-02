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
import { freelancerProfilesTable } from "./freelancerProfiles";

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
    department: text("department").notNull().default("Logistics"),
    dueDate: date("due_date", { mode: "string" }),
    assignedTo: text("assigned_to").notNull().default(""),
    assignedUserId: text("assigned_user_id").references(
      () => freelancerProfilesTable.userId,
      { onDelete: "set null" },
    ),
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
    index("project_tasks_department_idx").on(table.department),
    index("project_tasks_assigned_user_idx").on(table.assignedUserId),
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