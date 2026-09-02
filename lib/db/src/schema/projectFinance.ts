import {
  date,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { projectsTable } from "./projects";

/**
 * Trusted, server-owned financial settings. Using projectId as the primary key
 * makes the "one budget row per project" invariant a database guarantee.
 * Monetary values are integer øre (NOK minor units), never floating point.
 */
export const projectFinanceSettingsTable = pgTable(
  "project_finance_settings",
  {
    projectId: uuid("project_id")
      .primaryKey()
      .references(() => projectsTable.id, { onDelete: "cascade" }),
    contractRevenueMinor: integer("contract_revenue_minor").notNull().default(0),
    /** Revenue currently recorded in EasyJob, when it has been reconciled. */
    easyjobRevenueMinor: integer("easyjob_revenue_minor"),
    laborBudgetMinor: integer("labor_budget_minor").notNull().default(0),
    hotelBudgetMinor: integer("hotel_budget_minor").notNull().default(0),
    cateringBudgetMinor: integer("catering_budget_minor").notNull().default(0),
    transportBudgetMinor: integer("transport_budget_minor").notNull().default(0),
    subRentalsBudgetMinor: integer("sub_rentals_budget_minor")
      .notNull()
      .default(0),
    updatedByUserId: text("updated_by_user_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
);

/** Manual costs only. Labour is deliberately absent: it is derived from
 * approved/locked time entries and trusted gig compensation terms. */
export const projectExpensesTable = pgTable(
  "project_expenses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projectsTable.id, { onDelete: "cascade" }),
    category: text("category").notNull(),
    amountMinor: integer("amount_minor").notNull(),
    incurredOn: date("incurred_on").notNull(),
    description: text("description").notNull().default(""),
    vendor: text("vendor").notNull().default(""),
    reference: text("reference").notNull().default(""),
    createdByUserId: text("created_by_user_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("project_expenses_project_idx").on(t.projectId),
    index("project_expenses_project_category_idx").on(t.projectId, t.category),
  ],
);

export const FINANCE_CATEGORIES = [
  "labor",
  "hotel",
  "catering",
  "transport",
  "subRentals",
] as const;
export const MANUAL_EXPENSE_CATEGORIES = [
  "hotel",
  "catering",
  "transport",
  "subRentals",
] as const;
export type FinanceCategory = (typeof FINANCE_CATEGORIES)[number];
export type ManualExpenseCategory =
  (typeof MANUAL_EXPENSE_CATEGORIES)[number];

export const insertProjectFinanceSettingsSchema = createInsertSchema(
  projectFinanceSettingsTable,
).omit({ createdAt: true, updatedAt: true });
export const insertProjectExpenseSchema = createInsertSchema(
  projectExpensesTable,
).omit({ id: true, createdAt: true });

export type InsertProjectFinanceSettings = z.infer<
  typeof insertProjectFinanceSettingsSchema
>;
export type ProjectFinanceSettingsRow =
  typeof projectFinanceSettingsTable.$inferSelect;
export type InsertProjectExpense = z.infer<
  typeof insertProjectExpenseSchema
>;
export type ProjectExpenseRow = typeof projectExpensesTable.$inferSelect;