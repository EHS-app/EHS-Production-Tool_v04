import { Router, type IRouter, type RequestHandler } from "express";
import { and, eq, ilike, or, sql } from "drizzle-orm";
import {
  db,
  freelancerProfilesTable,
  type FreelancerProfileRow,
} from "@workspace/db";
import { sanitizeSkills, isValidSkill } from "@workspace/skills";
import { logger } from "../lib/logger";

/** Pull a YYYY-MM-DD string off a query param, or null. */
function pickDate(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const m = raw.match(/^(\d{4}-\d{2}-\d{2})$/);
  return m ? m[1] : null;
}

/** Coerce `req.query.skill` (which Express models as string | string[] |
 *  ParsedQs | ParsedQs[] depending on how it was passed) into a clean
 *  string[] of canonical skill labels. Drops empty/invalid entries and
 *  caps at 8 to keep query plans bounded. */
function pickSkills(raw: unknown): string[] {
  const arr: unknown[] = Array.isArray(raw) ? raw : raw == null ? [] : [raw];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const r of arr) {
    if (typeof r !== "string") continue;
    const s = r.trim();
    if (!s || !isValidSkill(s)) continue;
    const lc = s.toLowerCase();
    if (seen.has(lc)) continue;
    seen.add(lc);
    out.push(s);
    if (out.length >= 8) break;
  }
  return out;
}

const router: IRouter = Router();

/** Same Clerk gate the venue memory route uses — every read and write
 *  on the portal/profile namespace requires a signed-in user. */
const requireSignedIn: RequestHandler = (req, res, next) => {
  const auth =
    typeof (req as unknown as { auth?: unknown }).auth === "function"
      ? ((req as unknown as { auth: () => { userId?: string | null } }).auth())
      : ((req as unknown as { auth?: { userId?: string | null } }).auth ?? {});
  if (!auth || !auth.userId) {
    res.status(401).json({ ok: false, error: "Sign in required." });
    return;
  }
  (req as unknown as { _userId: string })._userId = auth.userId;
  next();
};

/** Bound the simple text fields so a malformed payload can't blow out
 *  the row. Generous but finite — the longest legitimate field (bio)
 *  is the user's own elevator pitch, not a CV. */
const MAX_TEXT = 280;
const MAX_BIO = 2000;

/** Trim a string field with a per-field cap. Defaults to "" so the
 *  output is always safe to assign to a NOT NULL DEFAULT '' column. */
function clampStr(raw: unknown, cap: number = MAX_TEXT): string {
  if (typeof raw !== "string") return "";
  return raw.trim().slice(0, cap);
}

/** Normalise a raw client payload into the shape the DB expects. We
 *  validate skills/languages against the strict skill library so the
 *  Production Tool can trust that every value it reads back is a known
 *  label. Unknown labels are silently dropped (the client should never
 *  send them — the picker is locked — but this is the last line of
 *  defence). */
function normaliseProfile(
  body: Record<string, unknown>,
): Omit<FreelancerProfileRow, "userId" | "createdAt" | "updatedAt"> {
  const primaryRoleRaw = clampStr(body.primaryRole);
  // Drop the primary role too if the client somehow sent something
  // outside the strict list — keeps the directory clean.
  const primaryRole =
    primaryRoleRaw && isValidSkill(primaryRoleRaw) ? primaryRoleRaw : "";
  return {
    fullName: clampStr(body.fullName),
    phone: clampStr(body.phone),
    primaryRole,
    city: clampStr(body.city),
    bio: clampStr(body.bio, MAX_BIO),
    insurance: clampStr(body.insurance),
    dietary: clampStr(body.dietary),
    bankAccount: clampStr(body.bankAccount),
    orgNumber: clampStr(body.orgNumber),
    languages: sanitizeSkills(
      Array.isArray(body.languages)
        ? body.languages.filter((x): x is string => typeof x === "string")
        : [],
    ),
    skills: sanitizeSkills(
      Array.isArray(body.skills)
        ? body.skills.filter((x): x is string => typeof x === "string")
        : [],
    ),
  };
}

/** GET /api/portal/profile/me
 *  Returns the signed-in user's profile, or `null` if they haven't
 *  saved one yet. */
router.get("/portal/profile/me", requireSignedIn, async (req, res) => {
  const userId = (req as unknown as { _userId: string })._userId;
  try {
    const rows = await db
      .select()
      .from(freelancerProfilesTable)
      .where(eq(freelancerProfilesTable.userId, userId))
      .limit(1);
    res.json({ ok: true, profile: rows[0] ?? null });
  } catch (err) {
    logger.error(
      { err: err instanceof Error ? err.message : String(err) },
      "portal profile GET failed",
    );
    res.status(500).json({ ok: false, error: "Could not load profile." });
  }
});

/** PUT /api/portal/profile/me  body: <profile fields>
 *  Upsert the signed-in user's profile. Returns the saved row. */
router.put("/portal/profile/me", requireSignedIn, async (req, res) => {
  const body = (req.body ?? {}) as Record<string, unknown>;
  const userId = (req as unknown as { _userId: string })._userId;
  const fields = normaliseProfile(body);
  try {
    const inserted = await db
      .insert(freelancerProfilesTable)
      .values({ userId, ...fields })
      .onConflictDoUpdate({
        target: freelancerProfilesTable.userId,
        set: { ...fields, updatedAt: sql`now()` },
      })
      .returning();
    res.json({ ok: true, profile: inserted[0] ?? null });
  } catch (err) {
    logger.error(
      { err: err instanceof Error ? err.message : String(err) },
      "portal profile PUT failed",
    );
    res.status(500).json({ ok: false, error: "Could not save profile." });
  }
});

/** GET /api/portal/freelancers?q=&skill=&startDate=&endDate=
 *  Producer-facing directory used by the Production Tool's Crew
 *  Report. Supports multi-layered filtering for high-pressure booking:
 *
 *  - `q`         — fuzzy match on name / city (case-insensitive).
 *  - `skill`     — repeatable; ALL of the requested labels must appear
 *                  in the freelancer's `skills` OR equal their
 *                  `primaryRole`. Use one filter per Work Type /
 *                  Console / Cert chip in the sidebar so the producer
 *                  can drill down to "Lyd FOH AND DiGiCo SD AND
 *                  Forklift G4" in a single request.
 *  - `startDate`/`endDate` — optional ISO YYYY-MM-DD range. When
 *                  supplied, each row is annotated with a `status`
 *                  field (see below) so the producer can see who is
 *                  free for the project window at a glance and avoid
 *                  double-booking.
 *
 *  Per-row `status` field:
 *
 *  - `"booked"`  — has at least one confirmed/done/invoiced/paid gig
 *                  that overlaps the requested window. Privacy-safe:
 *                  we only reveal the date is taken, never which
 *                  client/producer the freelancer is working for.
 *  - `"pending"` — the calling producer has a `pending` brief
 *                  assignment to this freelancer that overlaps the
 *                  window. Producer-scoped — other producers' pending
 *                  briefs do not bleed across.
 *  - `"available"` — neither of the above.
 *
 *  Without dates, status defaults to `"available"`.
 *
 *  Phone numbers are intentionally excluded from the projection: until
 *  the platform has a producer-vs-freelancer role distinction, this
 *  endpoint is reachable by any signed-in user, and we don't want
 *  freelancers to scrape contact info on each other. The producer
 *  reaches a freelancer through the brief / gig flow (which the
 *  recipient explicitly accepts), where full contact info surfaces. */
router.get("/portal/freelancers", requireSignedIn, async (req, res) => {
  const callerUserId = (req as unknown as { _userId: string })._userId;
  const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
  const skills = pickSkills(req.query.skill);
  const startDate = pickDate(req.query.startDate);
  const endDate = pickDate(req.query.endDate) ?? startDate;
  try {
    const conditions = [];
    if (q) {
      const like = `%${q}%`;
      conditions.push(
        or(
          ilike(freelancerProfilesTable.fullName, like),
          ilike(freelancerProfilesTable.city, like),
        ),
      );
    }
    // Multi-skill drill-down: AND every requested label so that a
    // freelancer must satisfy ALL chips the producer toggled. A label
    // matches when it appears in the profile's `skills` text[] OR
    // equals the `primaryRole` column.
    for (const skill of skills) {
      conditions.push(
        or(
          sql`${freelancerProfilesTable.skills} @> ARRAY[${skill}]::text[]`,
          eq(freelancerProfilesTable.primaryRole, skill),
        ),
      );
    }
    const where = conditions.length > 0 ? and(...conditions) : undefined;

    // Status annotation. When dates are supplied we run two correlated
    // EXISTS subqueries per row — one for booked gigs (global, any
    // owner), one for pending briefs (scoped to this caller). Without
    // dates, status falls through to 'available' so callers that don't
    // care about the project window get a cheap query plan.
    const statusExpr = startDate
      ? sql<string>`
          CASE
            WHEN EXISTS (
              SELECT 1 FROM gigs g
               WHERE g.freelancer_user_id = ${freelancerProfilesTable.userId}
                 AND g.status IN ('confirmed','done','invoiced','paid')
                 AND g.start_date IS NOT NULL
                 AND g.start_date <= ${endDate}::date
                 AND COALESCE(g.end_date, g.start_date) >= ${startDate}::date
            ) THEN 'booked'
            WHEN EXISTS (
              SELECT 1
                FROM brief_assignments ba
                JOIN project_briefs b ON ba.brief_id = b.id
               WHERE ba.freelancer_user_id = ${freelancerProfilesTable.userId}
                 AND ba.decision = 'pending'
                 AND b.owner_user_id = ${callerUserId}
                 AND b.start_date IS NOT NULL
                 AND b.start_date <= ${endDate}::date
                 AND COALESCE(b.end_date, b.start_date) >= ${startDate}::date
            ) THEN 'pending'
            ELSE 'available'
          END
        `
      : sql<string>`'available'`;

    const rows = await db
      .select({
        userId: freelancerProfilesTable.userId,
        fullName: freelancerProfilesTable.fullName,
        primaryRole: freelancerProfilesTable.primaryRole,
        city: freelancerProfilesTable.city,
        skills: freelancerProfilesTable.skills,
        languages: freelancerProfilesTable.languages,
        status: statusExpr.as("status"),
      })
      .from(freelancerProfilesTable)
      .where(where)
      .orderBy(freelancerProfilesTable.fullName)
      .limit(100);
    res.json({ ok: true, freelancers: rows });
  } catch (err) {
    logger.error(
      { err: err instanceof Error ? err.message : String(err) },
      "portal freelancers GET failed",
    );
    res.status(500).json({ ok: false, error: "Could not load directory." });
  }
});

export default router;
