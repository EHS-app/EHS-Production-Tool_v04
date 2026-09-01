import { pgTable, serial, text, timestamp, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const feedbackReportsTable = pgTable("feedback_reports", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id", { length: 255 }).notNull(),
  userEmail: varchar("user_email", { length: 255 }),
  userRole: varchar("user_role", { length: 50 }),
  type: varchar("type", { length: 50 }).notNull().default("bug"),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description").notNull(),
  pageUrl: varchar("page_url", { length: 512 }),
  userAgent: text("user_agent"),
  status: varchar("status", { length: 50 }).notNull().default("open"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const insertFeedbackReportSchema = createInsertSchema(
  feedbackReportsTable,
).omit({
  id: true,
  createdAt: true,
});

export type InsertFeedbackReport = z.infer<
  typeof insertFeedbackReportSchema
>;
export type FeedbackReport = typeof feedbackReportsTable.$inferSelect;