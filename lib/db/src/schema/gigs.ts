import {
  pgTable,
  text,
  jsonb,
  timestamp,
  date,
  numeric,
  index,
  boolean,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { projectBriefsTable } from "./projectBriefs";

/** A gig in the freelancer's logbook. Created either manually in the
 *  Portal or automatically when a freelancer accepts a project brief.
 *  When `briefId` is set, the producer who owns that brief can also
 *  see the gig (this is how a confirmed Portal gig becomes visible
 *  to the producer who assigned it). */
export const gigsTable = pgTable(
  "gigs",
  {
    /** Gig id (nanoid-style text) — generated client-side. */
    id: text("id").primaryKey(),
    /** Clerk user id of the freelancer who owns the gig. */
    freelancerUserId: text("freelancer_user_id").notNull(),
    /** Optional brief id this gig was created from. NULL for gigs the
     *  freelancer logged manually. */
    briefId: text("brief_id").references(() => projectBriefsTable.id, {
      onDelete: "set null",
    }),
    projectName: text("project_name").notNull().default(""),
    client: text("client").notNull().default(""),
    venue: text("venue").notNull().default(""),
    role: text("role").notNull().default(""),
    startDate: date("start_date"),
    endDate: date("end_date"),
    /** Per-day workdays for this gig. Drives catering counts and hotel
     *  date inheritance. Producer-managed via the schedule view; the
     *  freelancer sees the resulting dates on their personal itinerary.
     *  Stored as a date[] so we can query overlap per day cheaply
     *  (e.g. catering totals for a single day). */
    assignedDates: date("assigned_dates").array().notNull().default([]),
    /** Producer-controlled flag. When true the producer agrees to put
     *  this freelancer in a hotel for the run. Defaults false because
     *  most local crew don't need it. */
    hotelRequired: boolean("hotel_required").notNull().default(false),
    /** Hotel check-in / check-out. When `hotelRequired` flips true the
     *  server pre-fills these from min(assignedDates) and
     *  max(assignedDates) + 1, but the producer can always override
     *  for early/late arrivals. */
    checkInDate: date("check_in_date"),
    checkOutDate: date("check_out_date"),
    hours: numeric("hours", { precision: 8, scale: 2 }).notNull().default("0"),
    rate: numeric("rate", { precision: 10, scale: 2 }).notNull().default("0"),
    flatFee: numeric("flat_fee", { precision: 10, scale: 2 })
      .notNull()
      .default("0"),
    notes: text("notes").notNull().default(""),
    /** "invited" | "confirmed" | "done" | "invoiced" | "paid" — kept as
     *  text so we can grow the set without DB migrations. The API
     *  validates against the canonical list. */
    status: text("status").notNull().default("confirmed"),
    /** Optional show-day check-in trail
     *  (`{ onTheWayAt?: number, arrivedAt?: number }`). */
    checkIn: jsonb("check_in"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("gigs_freelancer_idx").on(t.freelancerUserId),
    index("gigs_brief_idx").on(t.briefId),
  ],
);

export const insertGigSchema = createInsertSchema(gigsTable).omit({
  createdAt: true,
  updatedAt: true,
});
export type InsertGig = z.infer<typeof insertGigSchema>;
export type GigRow = typeof gigsTable.$inferSelect;
