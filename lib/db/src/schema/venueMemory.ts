import {
  pgTable,
  serial,
  text,
  jsonb,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

/** Per-venue learning memory for the Drawing Analyzer. We key on a
 *  normalised venue name (lower-cased, whitespace-collapsed) so users
 *  who type "Sentrum  Scene" and "sentrum scene" end up sharing one
 *  memory entry. The original display name is kept on `venueName` so
 *  we can show it back in the UI. `data` is a free-form JSON blob —
 *  the shape is defined by the analyzer client and is intentionally
 *  loose so we can evolve the memory format without DB migrations. */
export const venueMemoryTable = pgTable(
  "venue_memory",
  {
    id: serial("id").primaryKey(),
    /** The Clerk user ID this memory belongs to. Memories are scoped
     *  per user — one producer's drawing of "Sentrum Scene" should
     *  not leak into a different producer's analysis of the same
     *  venue. */
    userId: text("user_id").notNull(),
    /** The venue name as the user typed it (kept for display). */
    venueName: text("venue_name").notNull(),
    /** Lower-cased, whitespace-collapsed key used for matching. */
    venueKey: text("venue_key").notNull(),
    /** Saved corrections from the overlay editor — see the client's
     *  `VenueMemoryData` type for the documented shape. */
    data: jsonb("data").notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [uniqueIndex("venue_memory_user_venue_key").on(t.userId, t.venueKey)],
);

export const insertVenueMemorySchema = createInsertSchema(venueMemoryTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertVenueMemory = z.infer<typeof insertVenueMemorySchema>;
export type VenueMemoryRow = typeof venueMemoryTable.$inferSelect;
