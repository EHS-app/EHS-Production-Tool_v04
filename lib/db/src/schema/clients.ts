import { index, integer, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const clientsTable = pgTable(
  "clients",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyName: text("company_name").notNull(),
    billingAddress: text("billing_address").notNull().default(""),
    organizationNumber: text("organization_number").notNull().default(""),
    primaryContacts: jsonb("primary_contacts").notNull().default([]),
    defaultPaymentTermsDays: integer("default_payment_terms_days").notNull().default(14),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("clients_company_name_idx").on(t.companyName),
    index("clients_organization_number_idx").on(t.organizationNumber),
  ],
);

export const insertClientSchema = createInsertSchema(clientsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertClient = z.infer<typeof insertClientSchema>;
export type ClientRow = typeof clientsTable.$inferSelect;