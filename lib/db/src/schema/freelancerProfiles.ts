import {
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

/** A freelancer's public profile, shared between the Portal (where the
 *  freelancer edits it) and the Production Tool (where producers browse
 *  the directory when filling a Crew Report). PK is the Clerk user id —
 *  one profile per signed-in user.
 *
 *  `skills` and `languages` are stored as text[] columns. Both are
 *  validated against `@workspace/skills` at the API layer before any
 *  write — the DB itself does not enforce membership so the strict
 *  list can evolve without migrations. */
export const freelancerProfilesTable = pgTable("freelancer_profiles", {
  /** Clerk user id (text) — primary key. */
  userId: text("user_id").primaryKey(),
  fullName: text("full_name").notNull().default(""),
  phone: text("phone").notNull().default(""),
  /** The single role the freelancer wants producers to see first. Must
   *  match an entry in the strict skill library at write time. */
  primaryRole: text("primary_role").notNull().default(""),
  city: text("city").notNull().default(""),
  bio: text("bio").notNull().default(""),
  insurance: text("insurance").notNull().default(""),
  /** Contact email — distinct from Clerk's identity email so freelancers
   *  can route booking enquiries to a different inbox if they like. */
  email: text("email").notNull().default(""),
  /** Free text — vegetarian, halal, gluten-free, etc. Surfaced on the
   *  producer's catering Order List view. */
  dietary: text("dietary").notNull().default(""),
  /** Free text — specific allergens (peanuts, shellfish…). Kept
   *  separate from `dietary` because catering treats them very
   *  differently (allergens drive cross-contamination warnings, not
   *  meal counts). */
  allergies: text("allergies").notNull().default(""),
  bankAccount: text("bank_account").notNull().default(""),
  orgNumber: text("org_number").notNull().default(""),
  /** Spoken languages — strict subset of the Language group. */
  languages: text("languages").array().notNull().default([]),
  /** All skills the freelancer carries (Work Type + Console & Software
   *  + Certification). The union store; the three columns below are
   *  derived views the API splits on write so producers can query each
   *  group independently without re-grouping in app code. */
  skills: text("skills").array().notNull().default([]),
  /** Subset of `skills` whose group is "Work Type". Derived on write. */
  workTypes: text("work_types").array().notNull().default([]),
  /** Subset of `skills` whose group is "Console & Software". Derived on write. */
  consoles: text("consoles").array().notNull().default([]),
  /** Subset of `skills` whose group is "Certification". Derived on write. */
  certs: text("certs").array().notNull().default([]),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const insertFreelancerProfileSchema = createInsertSchema(
  freelancerProfilesTable,
).omit({
  createdAt: true,
  updatedAt: true,
});
export type InsertFreelancerProfile = z.infer<
  typeof insertFreelancerProfileSchema
>;
export type FreelancerProfileRow = typeof freelancerProfilesTable.$inferSelect;
