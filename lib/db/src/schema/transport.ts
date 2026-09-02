import {
  pgTable,
  text,
  integer,
  timestamp,
  uuid,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { projectsTable } from "./projects";
import { freelancerProfilesTable } from "./freelancerProfiles";

export const transportVehiclesTable = pgTable(
  "transport_vehicles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    vehicleType: text("vehicle_type").notNull(),
    licensePlate: text("license_plate").notNull(),
    capacityKg: integer("capacity_kg"),
    volumeM3: integer("volume_m3"),
    primaryDriverUserId: text("primary_driver_user_id").references(
      () => freelancerProfilesTable.userId,
      { onDelete: "set null" },
    ),
    availabilityStatus: text("availability_status").notNull().default("available"),
    notes: text("notes").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    uniqueIndex("transport_vehicles_plate_idx").on(t.licensePlate),
    index("transport_vehicles_availability_idx").on(t.availabilityStatus),
  ],
);

export const transportRunsTable = pgTable(
  "transport_runs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projectsTable.id, { onDelete: "cascade" }),
    vehicleId: uuid("vehicle_id")
      .notNull()
      .references(() => transportVehiclesTable.id, { onDelete: "restrict" }),
    driverUserId: text("driver_user_id").references(
      () => freelancerProfilesTable.userId,
      { onDelete: "set null" },
    ),
    title: text("title").notNull(),
    origin: text("origin").notNull().default(""),
    destination: text("destination").notNull().default(""),
    departureAt: timestamp("departure_at", { withTimezone: true }).notNull(),
    loadInAt: timestamp("load_in_at", { withTimezone: true }),
    loadOutAt: timestamp("load_out_at", { withTimezone: true }),
    status: text("status").notNull().default("scheduled"),
    cargoNotes: text("cargo_notes").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    index("transport_runs_project_idx").on(t.projectId),
    index("transport_runs_departure_idx").on(t.departureAt),
    index("transport_runs_vehicle_idx").on(t.vehicleId),
    index("transport_runs_driver_idx").on(t.driverUserId),
  ],
);

export const insertTransportVehicleSchema = createInsertSchema(
  transportVehiclesTable,
).omit({ id: true, createdAt: true, updatedAt: true });
export const insertTransportRunSchema = createInsertSchema(transportRunsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type TransportVehicle = typeof transportVehiclesTable.$inferSelect;
export type TransportRun = typeof transportRunsTable.$inferSelect;
export type InsertTransportVehicle = z.infer<typeof insertTransportVehicleSchema>;
export type InsertTransportRun = z.infer<typeof insertTransportRunSchema>;