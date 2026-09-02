import {
  integer,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

/** Server-owned singleton. The fixed primary key prevents multiple competing
 * organization configurations while still allowing an atomic upsert. */
export const organizationSettingsTable = pgTable("organization_settings", {
  id: text("id").primaryKey().default("singleton"),
  companyName: text("company_name").notNull(),
  contactEmail: text("contact_email").notNull().default(""),
  contactPhone: text("contact_phone").notNull().default(""),
  contactAddress: text("contact_address").notNull().default(""),
  defaultCurrency: text("default_currency").notNull(),
  logoUrl: text("logo_url").notNull().default(""),
  defaultVatRateBasisPoints: integer("default_vat_rate_basis_points").notNull(),
  defaultPaymentTermsDays: integer("default_payment_terms_days").notNull(),
  fallbackDayRateMinor: integer("fallback_day_rate_minor").notNull(),
  fallbackHourlyRateMinor: integer("fallback_hourly_rate_minor").notNull(),
  overtimeThresholdMinutes: integer("overtime_threshold_minutes").notNull(),
  overtimeMultiplierBasisPoints: integer(
    "overtime_multiplier_basis_points",
  ).notNull(),
  departments: text("departments").array().notNull(),
  updatedByUserId: text("updated_by_user_id"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const insertOrganizationSettingsSchema = createInsertSchema(
  organizationSettingsTable,
).omit({ createdAt: true, updatedAt: true });
export type InsertOrganizationSettings = z.infer<
  typeof insertOrganizationSettingsSchema
>;
export type OrganizationSettingsRow =
  typeof organizationSettingsTable.$inferSelect;