import {
  pgTable,
  text,
  jsonb,
  timestamp,
  uuid,
  index,
  foreignKey,
} from "drizzle-orm/pg-core";
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
    foreignKey({
      columns: [t.clonedFromProjectId],
      foreignColumns: [t.id],
      name: "projects_cloned_from_project_id_fk",
    }).onDelete("set null"),
  ],
);

export const insertProjectSchema = createInsertSchema(projectsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertProject = z.infer<typeof insertProjectSchema>;
export type ProjectRow = typeof projectsTable.$inferSelect;
