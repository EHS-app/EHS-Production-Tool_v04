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

/** Shared talent pool. One row per freelancer.
 *
 *  The Freelance Portal writes here when a signed-in freelancer saves
 *  their Profile (Sign-up flow). The Production Tool reads from here
 *  to show a "Live Talent Pool" inside the Crew tab so producers can
 *  one-click add a real freelancer onto a project's call sheet.
 *
 *  Ownership is keyed on `clerkUserId` (NOT email — emails change,
 *  Clerk IDs don't), so each authenticated user has at most one
 *  profile row. The public-facing fields (name, email, skills,
 *  location, bio) are what the talent-pool list renders. */
export const freelancerProfilesTable = pgTable(
  "freelancer_profiles",
  {
    id: serial("id").primaryKey(),
    /** Internal owner key. Each Clerk user has exactly one profile;
     *  POST /profiles/save upserts on this column. Not exposed in the
     *  public list response — producers only see public fields. */
    clerkUserId: text("clerk_user_id").notNull(),
    fullName: text("full_name").notNull().default(""),
    email: text("email").notNull().default(""),
    /** Free-form JSON array of skill strings. Matches the portal
     *  Profile's existing `skills: string[]` shape so save is a
     *  straight pass-through. */
    skills: jsonb("skills").$type<string[]>().notNull().default([]),
    location: text("location").notNull().default(""),
    bio: text("bio").notNull().default(""),
    lastUpdated: timestamp("last_updated", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [uniqueIndex("freelancer_profiles_clerk_user_id").on(t.clerkUserId)],
);

export const insertFreelancerProfileSchema = createInsertSchema(
  freelancerProfilesTable,
).omit({
  id: true,
  lastUpdated: true,
});
export type InsertFreelancerProfile = z.infer<
  typeof insertFreelancerProfileSchema
>;
export type FreelancerProfileRow =
  typeof freelancerProfilesTable.$inferSelect;
