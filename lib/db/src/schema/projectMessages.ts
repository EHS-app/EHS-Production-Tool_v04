import { index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { projectsTable } from "./projects";

export const projectMessagesTable = pgTable(
  "project_messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projectsTable.id, { onDelete: "cascade" }),
    authorUserId: text("author_user_id").notNull(),
    authorName: text("author_name").notNull(),
    authorEmail: text("author_email").notNull(),
    body: text("body").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("project_messages_project_created_id_idx").on(
      table.projectId,
      table.createdAt,
      table.id,
    ),
  ],
);

export const insertProjectMessageSchema = createInsertSchema(
  projectMessagesTable,
).omit({ id: true, createdAt: true });
export type InsertProjectMessage = z.infer<typeof insertProjectMessageSchema>;
export type ProjectMessageRow = typeof projectMessagesTable.$inferSelect;