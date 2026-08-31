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
  /** Canonical App Storage object path for the user's profile photo.
   *  Bytes remain in object storage; only this opaque reference is persisted. */
  photoObjectPath: text("photo_object_path").notNull().default(""),
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
  /** Room-sharing preference for hotel logistics. The pairing engine
   *  (Phase B Feature 3) uses this to suggest twin-share matches:
   *  'twin' = OK to share a twin room with another crew member,
   *  'single' = needs a private room (e.g. CPAP, sleep schedule,
   *  personal preference — never asked why), 'either' = no preference,
   *  treated as 'twin' by the suggester unless the only available
   *  partner would force an awkward pairing. Default 'either' so
   *  legacy profiles don't get artificially upgraded to single. */
  roomShare: text("room_share").notNull().default("either"),
  /** Optional gender hint used ONLY by the room-pairing suggester to
   *  prefer same-gender twin matches by default (most crew prefer it,
   *  hotels expect it). Stored as free text — '' / 'female' / 'male'
   *  / 'other' — empty string means "didn't say", which the pairing
   *  algo treats as a wildcard. Never surfaced to other freelancers,
   *  never used outside hotel pairing. */
  gender: text("gender").notNull().default(""),
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

/** Upload permits for profile photos. A presigned object path is bound to the
 *  authenticated user before it leaves the API, preventing users from
 *  attaching another user's arbitrary private upload to their profile. */
export const profilePhotoUploadsTable = pgTable("profile_photo_uploads", {
  objectPath: text("object_path").primaryKey(),
  userId: text("user_id").notNull(),
  contentType: text("content_type").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
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
