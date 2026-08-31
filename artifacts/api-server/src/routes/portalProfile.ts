import { Router, type IRouter, type RequestHandler } from "express";
import { and, eq, ilike, or, sql } from "drizzle-orm";
import { Readable } from "stream";
import {
  db,
  freelancerProfilesTable,
  profilePhotoUploadsTable,
  type FreelancerProfileRow,
} from "@workspace/db";
import { sanitizeSkills, isValidSkill, groupSkills } from "@workspace/skills";
import { logger } from "../lib/logger";
import { classifyDietary, splitAllergens } from "../lib/dietaryTags";
import { tagAsFreelancer } from "../middleware/userType";
import { ObjectNotFoundError, ObjectStorageService } from "../lib/objectStorage";

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
const objectStorageService = new ObjectStorageService();
const PROFILE_PHOTO_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const PROFILE_PHOTO_MAX_BYTES = 5_000_000;
const PROFILE_OBJECT_PATH = /^\/objects\/uploads\/[A-Za-z0-9_-]{8,128}$/;

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
): Omit<
  FreelancerProfileRow,
  "userId" | "createdAt" | "updatedAt" | "photoObjectPath"
> {
  // Primary role is free-text. The Profile UI ships a text input
  // (placeholder "Lystekniker") and freelancers legitimately type
  // localised role labels that don't appear in the strict skill
  // library. Previously we silently dropped anything off-list, which
  // surfaced to users as "info was not saved on the profile" — the
  // field would reappear blank after every save. Accept any clamped
  // string; the `skills` array remains library-validated so the
  // producer's directory chips stay clean.
  const primaryRole = clampStr(body.primaryRole);
  // Accept either the new `dietaryRequirements` field name (matches the
  // canonical schema language and the Profile UI label) or the legacy
  // `dietary` key for back-compat with older clients.
  const dietary = clampStr(body.dietaryRequirements ?? body.dietary);
  const skills = sanitizeSkills(
    Array.isArray(body.skills)
      ? body.skills.filter((x): x is string => typeof x === "string")
      : [],
  );
  // Derive the three split arrays so producers can query each group
  // independently without re-grouping in app code. `groupSkills` runs
  // through the same canonical lookup `sanitizeSkills` does, so the
  // sums always tally with `skills`.
  const grouped = groupSkills(skills);
  return {
    fullName: clampStr(body.fullName),
    phone: clampStr(body.phone),
    email: clampStr(body.email),
    primaryRole,
    city: clampStr(body.city),
    bio: clampStr(body.bio, MAX_BIO),
    insurance: clampStr(body.insurance),
    dietary,
    allergies: clampStr(body.allergies),
    bankAccount: clampStr(body.bankAccount),
    orgNumber: clampStr(body.orgNumber),
    // Hotel pairing inputs (Phase B Feature 3). Both are clamped to a
    // strict allowlist server-side so freelancers can't poison the
    // pairing engine with stray values; anything off-list collapses to
    // the safe default ('either' for room share, '' for gender).
    roomShare: ((): "twin" | "single" | "either" => {
      const raw = clampStr(body.roomShare).toLowerCase();
      return raw === "twin" || raw === "single" ? raw : "either";
    })(),
    gender: ((): string => {
      const raw = clampStr(body.gender).toLowerCase();
      return raw === "female" || raw === "male" || raw === "other" ? raw : "";
    })(),
    languages: sanitizeSkills(
      Array.isArray(body.languages)
        ? body.languages.filter((x): x is string => typeof x === "string")
        : [],
    ),
    skills,
    workTypes: grouped.workTypes,
    consoles: grouped.consoles,
    certs: grouped.certs,
  };
}

/** Project a stored profile row into the API shape, exposing the
 *  catering field under both its canonical (`dietaryRequirements`) and
 *  legacy (`dietary`) names so clients can migrate at their own pace. */
function projectProfile(
  row: FreelancerProfileRow,
): FreelancerProfileRow & { dietaryRequirements: string } {
  return { ...row, dietaryRequirements: row.dietary };
}

/** POST /api/portal/me/tag-as-freelancer
 *  Bootstrap endpoint called by the frontend immediately after a new
 *  freelancer completes Clerk sign-up. Tags the signed-in user as
 *  `userType=freelancer` in Clerk publicMetadata so the Production
 *  Tool refuses to load for them even before they save their first
 *  profile row. Idempotent and safe to call repeatedly — the
 *  underlying `tagAsFreelancer` helper skips users already tagged as
 *  employee (defence against an admin/employee accidentally hitting
 *  this endpoint). Returns 200 in all cases (best-effort). */
router.post("/portal/me/tag-as-freelancer", requireSignedIn, async (req, res) => {
  const userId = (req as unknown as { _userId: string })._userId;
  try {
    await tagAsFreelancer(userId);
  } catch (err) {
    // tagAsFreelancer already swallows internally, but belt-and-
    // braces in case its surface ever changes.
    logger.warn(
      {
        scope: "userType",
        userId,
        err: err instanceof Error ? err.message : String(err),
      },
      "tag-as-freelancer endpoint encountered an error",
    );
  }
  res.json({ ok: true });
});

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
    res.json({
      ok: true,
      profile: rows[0] ? projectProfile(rows[0]) : null,
    });
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
    // Anyone who saves a profile via the portal is, by definition, a
    // freelancer. Tag their Clerk user with `userType=freelancer` so
    // the Production Tool refuses to load for them no matter which
    // role tab they pick at sign-in. Fire-and-forget — the metadata
    // write goes to Clerk's API and we don't want a transient Clerk
    // hiccup to fail the profile save. The lazy inference in
    // `getUserType` will catch any user that slipped through this
    // path on their next request.
    void tagAsFreelancer(userId);
    res.json({
      ok: true,
      profile: inserted[0] ? projectProfile(inserted[0]) : null,
    });
  } catch (err) {
    logger.error(
      { err: err instanceof Error ? err.message : String(err) },
      "portal profile PUT failed",
    );
    res.status(500).json({ ok: false, error: "Could not save profile." });
  }
});

/** POST /api/portal/profile/photo/upload-url
 *  Gives any signed-in user a tightly-scoped image upload URL. The browser
 *  uploads directly to App Storage, then saves the returned objectPath on its
 *  own profile through PUT /portal/profile/me. */
router.post(
  "/portal/profile/photo/upload-url",
  requireSignedIn,
  async (req, res): Promise<void> => {
    const body = (req.body ?? {}) as Record<string, unknown>;
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const size = typeof body.size === "number" ? body.size : NaN;
    const contentType =
      typeof body.contentType === "string" ? body.contentType.toLowerCase() : "";
    if (
      !name ||
      name.length > 200 ||
      !Number.isFinite(size) ||
      size <= 0 ||
      size > PROFILE_PHOTO_MAX_BYTES ||
      !PROFILE_PHOTO_TYPES.has(contentType)
    ) {
      res.status(400).json({
        ok: false,
        error: "Choose a JPEG, PNG or WebP image smaller than 5 MB.",
      });
      return;
    }
    try {
      const uploadURL = await objectStorageService.getObjectEntityUploadURL();
      const objectPath = objectStorageService.normalizeObjectEntityPath(uploadURL);
      await db.insert(profilePhotoUploadsTable).values({
        objectPath,
        userId: (req as unknown as { _userId: string })._userId,
        contentType,
      });
      res.json({
        ok: true,
        uploadURL,
        objectPath,
      });
    } catch (err) {
      req.log.error({ err }, "profile photo upload URL failed");
      res.status(500).json({ ok: false, error: "Could not start photo upload." });
    }
  },
);

/** PATCH /api/portal/profile/photo
 *  Updates only the signed-in user's photo reference. Keeping this separate
 *  from the full profile PUT avoids overwriting text edits that may still be
 *  in progress in another tab or device. */
router.patch(
  "/portal/profile/photo",
  requireSignedIn,
  async (req, res): Promise<void> => {
    const userId = (req as unknown as { _userId: string })._userId;
    const body = (req.body ?? {}) as Record<string, unknown>;
    const photoObjectPath =
      body.photoObjectPath === ""
        ? ""
        : typeof body.photoObjectPath === "string" &&
            PROFILE_OBJECT_PATH.test(body.photoObjectPath)
          ? body.photoObjectPath
          : null;
    if (photoObjectPath === null) {
      res.status(400).json({ ok: false, error: "Invalid photo reference." });
      return;
    }
    try {
      if (photoObjectPath) {
        const [permit] = await db
          .select({ objectPath: profilePhotoUploadsTable.objectPath })
          .from(profilePhotoUploadsTable)
          .where(
            and(
              eq(profilePhotoUploadsTable.objectPath, photoObjectPath),
              eq(profilePhotoUploadsTable.userId, userId),
            ),
          )
          .limit(1);
        if (!permit) {
          res.status(403).json({
            ok: false,
            error: "This photo upload does not belong to your account.",
          });
          return;
        }
      }
      const [saved] = await db
        .insert(freelancerProfilesTable)
        .values({ userId, photoObjectPath })
        .onConflictDoUpdate({
          target: freelancerProfilesTable.userId,
          set: { photoObjectPath, updatedAt: sql`now()` },
        })
        .returning();
      res.json({ ok: true, profile: saved ? projectProfile(saved) : null });
    } catch (err) {
      req.log.error({ err }, "profile photo reference update failed");
      res.status(500).json({ ok: false, error: "Could not save profile photo." });
    }
  },
);

/** GET /api/portal/freelancers/:userId/photo
 *  Authenticated inline image route. Only object paths currently attached to
 *  the requested freelancer profile can be read through this endpoint. */
router.get(
  "/portal/freelancers/:userId/photo",
  requireSignedIn,
  async (req, res): Promise<void> => {
    const rawUserId = req.params.userId;
    const requestedUserId = Array.isArray(rawUserId) ? rawUserId[0] : rawUserId;
    const userId =
      requestedUserId === "me"
        ? (req as unknown as { _userId: string })._userId
        : requestedUserId;
    if (!userId) {
      res.status(404).end();
      return;
    }
    try {
      const [profile] = await db
        .select({ photoObjectPath: freelancerProfilesTable.photoObjectPath })
        .from(freelancerProfilesTable)
        .where(eq(freelancerProfilesTable.userId, userId))
        .limit(1);
      if (!profile?.photoObjectPath || !PROFILE_OBJECT_PATH.test(profile.photoObjectPath)) {
        res.status(404).end();
        return;
      }
      const file = await objectStorageService.getObjectEntityFile(
        profile.photoObjectPath,
      );
      const response = await objectStorageService.downloadObject(file, 300);
      const contentType = (response.headers.get("content-type") || "")
        .split(";")[0]
        .trim()
        .toLowerCase();
      if (!PROFILE_PHOTO_TYPES.has(contentType)) {
        res.status(415).end();
        return;
      }
      res.status(response.status);
      res.setHeader("Content-Type", contentType);
      res.setHeader("Content-Disposition", "inline");
      res.setHeader("X-Content-Type-Options", "nosniff");
      res.setHeader("Cache-Control", "private, max-age=300");
      if (response.body) {
        Readable.fromWeb(
          response.body as unknown as import("stream/web").ReadableStream<Uint8Array>,
        ).pipe(res);
      } else {
        res.end();
      }
    } catch (err) {
      if (err instanceof ObjectNotFoundError) {
        res.status(404).end();
        return;
      }
      req.log.error({ err, userId }, "profile photo read failed");
      res.status(500).end();
    }
  },
);

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
        bio: freelancerProfilesTable.bio,
        photoObjectPath: freelancerProfilesTable.photoObjectPath,
        skills: freelancerProfilesTable.skills,
        languages: freelancerProfilesTable.languages,
        phone: freelancerProfilesTable.phone,
        dietary: freelancerProfilesTable.dietary,
        allergies: freelancerProfilesTable.allergies,
        status: statusExpr.as("status"),
      })
      .from(freelancerProfilesTable)
      .where(where)
      .orderBy(freelancerProfilesTable.fullName)
      .limit(100);
    // Pre-classify dietary / allergens server-side so the Production
    // Tool can drop the raw fields straight onto a CrewMember without
    // re-implementing the keyword classifier on the client.
    const enriched = rows.map((r) => ({
      ...r,
      phone: typeof r.phone === "string" ? r.phone : "",
      dietaryTags: classifyDietary(r.dietary),
      allergens: splitAllergens(r.allergies),
    }));
    res.json({ ok: true, freelancers: enriched });
  } catch (err) {
    logger.error(
      { err: err instanceof Error ? err.message : String(err) },
      "portal freelancers GET failed",
    );
    res.status(500).json({ ok: false, error: "Could not load directory." });
  }
});

export default router;
