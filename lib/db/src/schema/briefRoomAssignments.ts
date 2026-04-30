import {
  pgTable,
  text,
  timestamp,
  boolean,
  primaryKey,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { projectBriefsTable } from "./projectBriefs";

/** Producer-locked hotel room assignments for a brief.
 *
 *  This table stores ONLY the producer's manual locks — the pairing
 *  engine in `roomPairing.ts` runs at request time and fills in the
 *  unlocked majority. Two reasons we keep it lock-only rather than
 *  storing every assignment:
 *
 *  1. The full assignment is a deterministic function of (crew set,
 *     prefs, dates, locks). If we stored it, every prefs/date edit
 *     would force a re-write of every row, with stale rows leaking
 *     in if a freelancer got dropped from the brief mid-edit. The
 *     lock-only model avoids that drift entirely — locks are the
 *     producer's intent, suggestions are recomputed.
 *
 *  2. It keeps the producer-intent surface tiny and auditable. A
 *     single row per locked person tells you "the producer chose to
 *     freeze this assignment" — nothing more, nothing less.
 *
 *  Composite PK on (briefId, freelancerUserId): a freelancer can be
 *  in at most one room per brief, but obviously the same freelancer
 *  can have locked rooms across multiple briefs. The PK column
 *  types are both `text` to match `project_briefs.id` and the Clerk
 *  user id strings used everywhere else in the schema. */
export const briefRoomAssignmentsTable = pgTable(
  "brief_room_assignments",
  {
    /** The brief this lock applies to. ON DELETE CASCADE so deleting
     *  a brief cleans up its locks automatically — there's no use for
     *  orphan room assignments. */
    briefId: text("brief_id")
      .notNull()
      .references(() => projectBriefsTable.id, { onDelete: "cascade" }),
    /** Clerk user id of the freelancer this lock pins. Not FK'd
     *  because freelancer profiles are optional (a freelancer can be
     *  on a brief before filling out their portal profile) — the
     *  same model the gigs table uses. */
    freelancerUserId: text("freelancer_user_id").notNull(),
    /** Opaque room identifier — two freelancers with the same
     *  `roomKey` for the same brief share a room. The pairing engine
     *  generates these as `room-1`, `room-2`, etc. but never relies
     *  on the format; producers can pass through any non-empty
     *  string (e.g. "VIP suite") if we surface a rename UI later. */
    roomKey: text("room_key").notNull(),
    /** Always true on persisted rows — the table is intentionally
     *  lock-only. We keep the column anyway so a future "soft-pin"
     *  (suggested-but-not-locked) extension is one boolean flip away,
     *  rather than needing a schema migration. */
    locked: boolean("locked").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    pk: primaryKey({
      columns: [table.briefId, table.freelancerUserId],
    }),
  }),
);

export const insertBriefRoomAssignmentSchema = createInsertSchema(
  briefRoomAssignmentsTable,
).omit({
  createdAt: true,
  updatedAt: true,
});
export type InsertBriefRoomAssignment = z.infer<
  typeof insertBriefRoomAssignmentSchema
>;
export type BriefRoomAssignmentRow =
  typeof briefRoomAssignmentsTable.$inferSelect;
