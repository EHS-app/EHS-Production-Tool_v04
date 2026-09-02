import { boolean, index, integer, jsonb, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { projectBriefsTable } from "./projectBriefs";

/** Private, user-owned availability. Dates are instants so half days remain precise. */
export const calendarAvailabilityTable = pgTable("calendar_availability", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  status: text("status").notNull(), // available | unavailable | tentative
  startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
  endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
  timezone: text("timezone").notNull().default("UTC"),
  allDay: boolean("all_day").notNull().default(false),
  privateNote: text("private_note").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("calendar_availability_user_time_idx").on(t.userId, t.startsAt)]);

/** A bounded weekly rule; endAt is required to prevent permanent unbounded expansion. */
export const calendarAvailabilityRulesTable = pgTable("calendar_availability_rules", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  status: text("status").notNull(),
  weekday: integer("weekday").notNull(),
  startMinute: integer("start_minute").notNull(),
  endMinute: integer("end_minute").notNull(),
  timezone: text("timezone").notNull().default("UTC"),
  /** Anchor prevents a weekly rule from projecting backward indefinitely. */
  startsOn: timestamp("starts_on", { withTimezone: true }).notNull(),
  until: timestamp("until", { withTimezone: true }).notNull(),
  privateNote: text("private_note").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("calendar_rules_user_until_idx").on(t.userId, t.until)]);

/** Secrets are AES-GCM ciphertext, never readable provider event content. */
export const calendarConnectionsTable = pgTable("calendar_connections", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  provider: text("provider").notNull(), // google | microsoft | ics
  encryptedCredentials: text("encrypted_credentials").notNull().default(""),
  settings: jsonb("settings").notNull().default({}),
  syncCursor: jsonb("sync_cursor").notNull().default({}),
  lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }),
  lastError: text("last_error").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("calendar_connections_user_idx").on(t.userId), uniqueIndex("calendar_connections_user_provider_idx").on(t.userId, t.provider)]);

/** Normalised opaque busy ranges only. Never persist event summary, location or description. */
export const calendarBusyIntervalsTable = pgTable("calendar_busy_intervals", {
  id: text("id").primaryKey(),
  connectionId: text("connection_id").notNull().references(() => calendarConnectionsTable.id, { onDelete: "cascade" }),
  startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
  endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
  sourceKey: text("source_key").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("calendar_busy_connection_time_idx").on(t.connectionId, t.startsAt), uniqueIndex("calendar_busy_source_idx").on(t.connectionId, t.sourceKey)]);

export const calendarSubscriptionsTable = pgTable("calendar_subscriptions", {
  userId: text("user_id").primaryKey(),
  tokenHash: text("token_hash").notNull(),
  encryptedToken: text("encrypted_token").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  rotatedAt: timestamp("rotated_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Single-use OAuth transaction records. State itself is random and only its
 * hash is persisted; the PKCE verifier remains encrypted at rest. */
export const calendarOAuthStatesTable = pgTable("calendar_oauth_states", {
  stateHash: text("state_hash").primaryKey(),
  userId: text("user_id").notNull(),
  provider: text("provider").notNull(),
  encryptedVerifier: text("encrypted_verifier").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("calendar_oauth_states_expiry_idx").on(t.expiresAt)]);

/** Producer-scoped tentative reservations. Ownership is verified through brief
 * ownership. The FK makes a brief deletion and any concurrent hold creation
 * serialize safely; reservations must never outlive their brief. */
export const calendarHoldsTable = pgTable("calendar_holds", {
  id: text("id").primaryKey(),
  freelancerUserId: text("freelancer_user_id").notNull(),
  ownerUserId: text("owner_user_id").notNull(),
  briefId: text("brief_id").references(() => projectBriefsTable.id, {
    onDelete: "cascade",
  }),
  startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
  endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("calendar_holds_freelancer_time_idx").on(t.freelancerUserId, t.startsAt),
  index("calendar_holds_owner_idx").on(t.ownerUserId),
  index("calendar_holds_brief_idx").on(t.briefId),
]);

/** Durable lease/retry queue. Payload excludes credentials and event details. */
export const calendarSyncJobsTable = pgTable("calendar_sync_jobs", {
  id: text("id").primaryKey(),
  connectionId: text("connection_id").notNull().references(() => calendarConnectionsTable.id, { onDelete: "cascade" }),
  runAfter: timestamp("run_after", { withTimezone: true }).notNull().defaultNow(),
  leasedUntil: timestamp("leased_until", { withTimezone: true }),
  attempts: integer("attempts").notNull().default(0),
  lastError: text("last_error").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [uniqueIndex("calendar_sync_job_connection_idx").on(t.connectionId), index("calendar_sync_job_due_idx").on(t.runAfter)]);