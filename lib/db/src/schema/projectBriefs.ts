import {
  pgTable,
  text,
  jsonb,
  timestamp,
  date,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

/** A project brief authored by a producer in the Production Tool.
 *
 *  The full brief shape is stored in `data` as jsonb so we can iterate
 *  on the brief structure without DB migrations — the canonical shape
 *  lives in `artifacts/rigging-load-report/src/lib/projectBrief.ts`
 *  and is normalised both client-side and server-side before write.
 *
 *  A handful of indexable columns (`projectName`, `venue`, `startDate`,
 *  `endDate`) are denormalised out for cheap listing / filtering in
 *  the producer's "my briefs" view. */
export const projectBriefsTable = pgTable(
  "project_briefs",
  {
    /** Brief id (nanoid-style text) — generated client-side and reused
     *  as PK so existing local references survive the migration. */
    id: text("id").primaryKey(),
    /** Clerk user id of the producer who created the brief. */
    ownerUserId: text("owner_user_id").notNull(),
    projectName: text("project_name").notNull().default(""),
    client: text("client").notNull().default(""),
    venue: text("venue").notNull().default(""),
    startDate: date("start_date"),
    endDate: date("end_date"),
    /** The full ProjectBrief jsonb. */
    data: jsonb("data").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("project_briefs_owner_idx").on(t.ownerUserId)],
);

export const insertProjectBriefSchema = createInsertSchema(
  projectBriefsTable,
).omit({
  createdAt: true,
  updatedAt: true,
});
export type InsertProjectBrief = z.infer<typeof insertProjectBriefSchema>;
export type ProjectBriefRow = typeof projectBriefsTable.$inferSelect;

/** Maps a project brief to the freelancers it has been assigned to.
 *  This is what powers the Portal's "briefs addressed to me" view —
 *  we look up rows where `freelancer_user_id` matches the signed-in
 *  user. Decision + frozen snapshot live here so a brief can be
 *  re-shared with a new person without disturbing the original
 *  recipient's accept state. */
export const briefAssignmentsTable = pgTable(
  "brief_assignments",
  {
    id: text("id").primaryKey(),
    briefId: text("brief_id")
      .notNull()
      .references(() => projectBriefsTable.id, { onDelete: "cascade" }),
    /** Clerk user id of the assigned freelancer. */
    freelancerUserId: text("freelancer_user_id").notNull(),
    /** The `crewId` from the brief.assignments[] entry that addresses
     *  this freelancer. Lets the Portal pick the right line out of the
     *  jsonb when rendering "your assignment". */
    crewId: text("crew_id").notNull().default(""),
    /** "pending" until the freelancer accepts or declines. */
    decision: text("decision").notNull().default("pending"),
    decidedAt: timestamp("decided_at", { withTimezone: true }),
    /** Snapshot of the brief at accept time — used by the Portal's
     *  "what changed since you accepted" diff banner. */
    acceptedSnapshot: jsonb("accepted_snapshot"),
    /** When `decision === "accepted"`, the id of the gig that was
     *  created from this assignment. */
    acceptedGigId: text("accepted_gig_id"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("brief_assignments_freelancer_idx").on(t.freelancerUserId),
    index("brief_assignments_brief_idx").on(t.briefId),
    /** Hard guarantee: at most one assignment row per (brief, freelancer).
     *  Lets the POST /briefs handler use a simple insert-on-conflict-do-nothing
     *  upsert without a fragile DELETE-USING dedup pass. */
    uniqueIndex("brief_assignments_brief_freelancer_unique").on(
      t.briefId,
      t.freelancerUserId,
    ),
  ],
);

export const insertBriefAssignmentSchema = createInsertSchema(
  briefAssignmentsTable,
).omit({
  createdAt: true,
  updatedAt: true,
});
export type InsertBriefAssignment = z.infer<
  typeof insertBriefAssignmentSchema
>;
export type BriefAssignmentRow = typeof briefAssignmentsTable.$inferSelect;
