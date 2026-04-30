import { Router, type IRouter, type RequestHandler } from "express";
import { and, eq, ilike, or, sql } from "drizzle-orm";
import {
  db,
  freelancerProfilesTable,
  type FreelancerProfileRow,
} from "@workspace/db";
import { sanitizeSkills, isValidSkill } from "@workspace/skills";
import { logger } from "../lib/logger";

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

/** GET /api/portal/freelancers?q=&skill=
 *  Producer-facing directory used by the Production Tool's Crew
 *  Report. `q` matches name / city / phone (case-insensitive); `skill`
 *  filters to profiles whose `skills` OR `primaryRole` contain the
 *  given label. Either filter may be omitted. */
router.get("/portal/freelancers", requireSignedIn, async (req, res) => {
  const q =
    typeof req.query.q === "string" ? req.query.q.trim() : "";
  const skill =
    typeof req.query.skill === "string" ? req.query.skill.trim() : "";
  try {
    const conditions = [];
    if (q) {
      const like = `%${q}%`;
      conditions.push(
        or(
          ilike(freelancerProfilesTable.fullName, like),
          ilike(freelancerProfilesTable.city, like),
          ilike(freelancerProfilesTable.phone, like),
        ),
      );
    }
    if (skill && isValidSkill(skill)) {
      // text[] containment — `skills @> ARRAY[skill]` — or matches the
      // primary role column.
      conditions.push(
        or(
          sql`${freelancerProfilesTable.skills} @> ARRAY[${skill}]::text[]`,
          eq(freelancerProfilesTable.primaryRole, skill),
        ),
      );
    }
    const where = conditions.length > 0 ? and(...conditions) : undefined;
    // Phone is intentionally excluded from the directory list. Until
    // the platform has a producer-vs-freelancer role distinction, any
    // signed-in user can hit this endpoint, and we don't want
    // freelancers to be able to scrape contact info on each other.
    // The producer reaches a freelancer through the brief / gig flow
    // (which the recipient explicitly accepts), and full contact
    // details surface there.
    const rows = await db
      .select({
        userId: freelancerProfilesTable.userId,
        fullName: freelancerProfilesTable.fullName,
        primaryRole: freelancerProfilesTable.primaryRole,
        city: freelancerProfilesTable.city,
        skills: freelancerProfilesTable.skills,
        languages: freelancerProfilesTable.languages,
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
