import {
  pgTable,
  text,
  jsonb,
  timestamp,
  uuid,
  index,
  uniqueIndex,
  foreignKey,
  check,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { venuesTable } from "./venues";
import { clientsTable } from "./clients";

export const projectsTable = pgTable(
  "projects",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id").notNull(),
    name: text("name").notNull().default("Untitled"),
    venue: text("venue").notNull().default(""),
    client: text("client").notNull().default(""),
    easyjobNumber: text("easyjob_number"),
    venueId: uuid("venue_id").references(() => venuesTable.id, {
      onDelete: "set null",
    }),
    clientId: uuid("client_id").references(() => clientsTable.id, {
      onDelete: "set null",
    }),
    clonedFromProjectId: uuid("cloned_from_project_id"),
    /** Nullable only so rows created before the lifecycle rollout can be
     * derived from their legacy project data until they are backfilled. */
    status: text("status"),
    statusUpdatedAt: timestamp("status_updated_at", { withTimezone: true }),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    data: jsonb("data").notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("projects_user_id_idx").on(t.userId),
    index("projects_easyjob_number_idx").on(t.easyjobNumber),
    index("projects_venue_id_idx").on(t.venueId),
    index("projects_client_id_idx").on(t.clientId),
    index("projects_cloned_from_idx").on(t.clonedFromProjectId),
    index("projects_archived_at_idx").on(t.archivedAt),
    foreignKey({
      columns: [t.clonedFromProjectId],
      foreignColumns: [t.id],
      name: "projects_cloned_from_project_id_fk",
    }).onDelete("set null"),
    check(
      "projects_status_check",
      sql`${t.status} is null or ${t.status} in ('draft', 'planning', 'active', 'completed', 'archived')`,
    ),
  ],
);

export const projectStatusHistoryTable = pgTable(
  "project_status_history",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projectsTable.id, { onDelete: "cascade" }),
    fromStatus: text("from_status"),
    toStatus: text("to_status").notNull(),
    actorUserId: text("actor_user_id").notNull(),
    reason: text("reason"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("project_status_history_project_idx").on(t.projectId, t.createdAt),
    check(
      "project_status_history_from_check",
      sql`${t.fromStatus} is null or ${t.fromStatus} in ('draft', 'planning', 'active', 'completed', 'archived')`,
    ),
    check(
      "project_status_history_to_check",
      sql`${t.toStatus} in ('draft', 'planning', 'active', 'completed', 'archived')`,
    ),
  ],
);

/** Durable request-email delivery state. Assignment identity is deliberately
 * separate from delivery: a saved planning brief can address somebody without
 * sending until its project is activated. */
export const briefDispatchesTable = pgTable(
  "brief_dispatches",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    briefId: text("brief_id").notNull(),
    freelancerUserId: text("freelancer_user_id").notNull(),
    state: text("state").notNull().default("pending"),
    claimedAt: timestamp("claimed_at", { withTimezone: true }),
    leaseExpiresAt: timestamp("lease_expires_at", { withTimezone: true }),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    failedAt: timestamp("failed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("brief_dispatches_brief_idx").on(t.briefId),
    index("brief_dispatches_state_idx").on(t.state),
    uniqueIndex("brief_dispatches_brief_freelancer_unique").on(
      t.briefId,
      t.freelancerUserId,
    ),
    check(
      "brief_dispatches_state_check",
      sql`${t.state} in ('pending', 'dispatching', 'sent', 'failed')`,
    ),
  ],
);

export const insertProjectSchema = createInsertSchema(projectsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertProject = z.infer<typeof insertProjectSchema>;
export type ProjectRow = typeof projectsTable.$inferSelect;
export const insertProjectStatusHistorySchema = createInsertSchema(
  projectStatusHistoryTable,
).omit({
  id: true,
  createdAt: true,
});
export type InsertProjectStatusHistory = z.infer<
  typeof insertProjectStatusHistorySchema
>;
export const insertBriefDispatchSchema = createInsertSchema(
  briefDispatchesTable,
).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertBriefDispatch = z.infer<typeof insertBriefDispatchSchema>;
export type ProjectStatusHistoryRow =
  typeof projectStatusHistoryTable.$inferSelect;
