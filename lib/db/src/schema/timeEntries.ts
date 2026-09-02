import {
  pgTable,
  text,
  integer,
  date,
  timestamp,
  index,
  uniqueIndex,
  boolean,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { gigsTable } from "./gigs";
import { projectBriefsTable } from "./projectBriefs";

/** One row per freelancer per working day on a gig.
 *
 *  Workflow:
 *   draft        — created (auto from assigned days, or manually) but the
 *                  freelancer hasn't logged actual times yet.
 *   submitted    — freelancer has filled start/end and pushed for approval.
 *   approved     — producer signed off. Counts toward payroll.
 *   rejected     — producer pushed back; freelancer can re-submit.
 *   locked       — payroll has been exported. Edits require a correction
 *                  (which would be a new row, leaving this one immutable).
 *
 *  Times are stored as minutes-since-midnight (0–1439) instead of timestamps
 *  so we don't get tangled in tz issues; `workDate` is the authoritative
 *  day. Overnight shifts (end < start) are interpreted as "next day".
 */
export const timeEntriesTable = pgTable(
  "time_entries",
  {
    id: text("id").primaryKey(),
    /** The gig this entry belongs to. */
    gigId: text("gig_id")
      .notNull()
      .references(() => gigsTable.id, { onDelete: "cascade" }),
    /** Mirror of `gigs.briefId` at the time of creation. Lets producers
     *  query "all entries for my project" without joining through gigs
     *  every time. NULL for entries on a manually-created gig (no brief). */
    briefId: text("brief_id").references(() => projectBriefsTable.id, {
      onDelete: "set null",
    }),
    /** Clerk user id of the freelancer (mirror of gigs.freelancerUserId
     *  for the same reason — cheap producer-side filtering). */
    freelancerUserId: text("freelancer_user_id").notNull(),
    /** The calendar day this entry covers. */
    workDate: date("work_date").notNull(),
    /** Minutes since midnight, 0–1439. NULL while still a draft skeleton. */
    startMinute: integer("start_minute"),
    /** Minutes since midnight, 0–1439. Overnight if < startMinute. */
    endMinute: integer("end_minute"),
    /** Unpaid break in minutes. */
    breakMinutes: integer("break_minutes").notNull().default(0),
    /** Free-form notes the freelancer can leave for the producer. */
    notes: text("notes").notNull().default(""),
    /** "draft" | "submitted" | "approved" | "rejected" | "flagged" | "locked". */
    status: text("status").notNull().default("draft"),
    /** Clerk user id of the producer who approved / rejected. */
    decidedByUserId: text("decided_by_user_id"),
    /** When the decision happened (approved or rejected). */
    decidedAt: timestamp("decided_at", { withTimezone: true }),
    /** Producer's note when rejecting (defaults to empty string). */
    rejectionReason: text("rejection_reason").notNull().default(""),
    /** Producer-only payable-time adjustment. The freelancer's observed
     * start/end/break values above are never overwritten by review. */
    producerAdjustmentMinutes: integer("producer_adjustment_minutes")
      .notNull()
      .default(0),
    /** Optional producer override for the unpaid meal break. */
    producerBreakMinutes: integer("producer_break_minutes"),
    /** Portion of payable time classified as overtime (not added twice). */
    overtimeMinutes: integer("overtime_minutes").notNull().default(0),
    /** Distinguishes a producer-entered value (including an explicit zero)
     * from the automatic organization-threshold calculation. */
    overtimeIsExplicit: boolean("overtime_is_explicit").notNull().default(false),
    /** Required audit explanation when producer adjustments are made. */
    adjustmentReason: text("adjustment_reason").notNull().default(""),
    /** Required reason for a flagged entry. */
    flagReason: text("flag_reason").notNull().default(""),
    /** Clerk user id and timestamp for the latest producer adjustment. */
    adjustedByUserId: text("adjusted_by_user_id"),
    adjustedAt: timestamp("adjusted_at", { withTimezone: true }),
    /** Immutable compensation snapshot captured at producer approval. */
    approvedRateMinor: integer("approved_rate_minor"),
    approvedFlatFeeMinor: integer("approved_flat_fee_minor"),
    approvedOvertimeMultiplierBasisPoints: integer(
      "approved_overtime_multiplier_basis_points",
    ),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("time_entries_freelancer_idx").on(t.freelancerUserId),
    index("time_entries_gig_idx").on(t.gigId),
    index("time_entries_brief_idx").on(t.briefId),
    /** One canonical entry per gig per day. If a correction is needed
     *  after lock, producers will roll an "adjustment" record into a
     *  separate corrections table (v2). For v1 each day has one row. */
    uniqueIndex("time_entries_gig_date_unique").on(t.gigId, t.workDate),
  ],
);

export const insertTimeEntrySchema = createInsertSchema(timeEntriesTable).omit({
  createdAt: true,
  updatedAt: true,
});
export type InsertTimeEntry = z.infer<typeof insertTimeEntrySchema>;
export type TimeEntryRow = typeof timeEntriesTable.$inferSelect;

/** Canonical status values — kept in TypeScript (not a pg enum) so we can
 *  grow the set without a migration. The API validates against this. */
export const TIME_ENTRY_STATUSES = [
  "draft",
  "submitted",
  "approved",
  "rejected",
  "flagged",
  "locked",
] as const;
export type TimeEntryStatus = (typeof TIME_ENTRY_STATUSES)[number];
