import { index, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const venuesTable = pgTable(
  "venues",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    address: text("address").notNull().default(""),
    website: text("website").notNull().default(""),
    technicalContactName: text("technical_contact_name").notNull().default(""),
    technicalContactPhone: text("technical_contact_phone").notNull().default(""),
    technicalContactEmail: text("technical_contact_email").notNull().default(""),
    riggingSpecs: jsonb("rigging_specs").notNull().default({}),
    powerInfrastructure: jsonb("power_infrastructure").notNull().default({}),
    logisticsAccess: jsonb("logistics_access").notNull().default({}),
    siteFacilities: jsonb("site_facilities").notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("venues_name_idx").on(t.name)],
);

export const insertVenueSchema = createInsertSchema(venuesTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertVenue = z.infer<typeof insertVenueSchema>;
export type VenueRow = typeof venuesTable.$inferSelect;