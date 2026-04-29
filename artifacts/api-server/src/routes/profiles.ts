import { Router, type IRouter, type RequestHandler } from "express";
import { desc, eq, sql } from "drizzle-orm";
import { db, freelancerProfilesTable } from "@workspace/db";
import { saveFreelancerProfileBody } from "@workspace/api-zod";
import { logger } from "../lib/logger";

const router: IRouter = Router();

/** Mirror the Clerk gate the rest of the API uses. Every profile read
 *  and write requires a signed-in user — the talent pool is only ever
 *  visible to authenticated producers/freelancers, never to the public
 *  internet. Pulled from venueMemory.ts so behaviour stays consistent. */
const requireSignedIn: RequestHandler = (req, res, next) => {
  const auth =
    typeof (req as unknown as { auth?: unknown }).auth === "function"
      ? (req as unknown as { auth: () => { userId?: string | null } }).auth()
      : ((req as unknown as { auth?: { userId?: string | null } }).auth ?? {});
  if (!auth || !auth.userId) {
    res.status(401).json({ error: "Sign in required." });
    return;
  }
  (req as unknown as { _userId: string })._userId = auth.userId;
  next();
};

/** Map a DB row to the public-facing schema. Strips the internal
 *  clerkUserId — producers should never see another user's auth id. */
function toPublic(row: typeof freelancerProfilesTable.$inferSelect) {
  return {
    id: row.id,
    fullName: row.fullName,
    email: row.email,
    skills: Array.isArray(row.skills) ? row.skills : [],
    location: row.location,
    bio: row.bio,
    lastUpdated:
      row.lastUpdated instanceof Date
        ? row.lastUpdated.toISOString()
        : String(row.lastUpdated),
  };
}

/** GET /api/profiles
 *  Live Talent Pool feed for the Production Tool. Returns every profile
 *  that has a non-empty full name — empty rows are accounts that have
 *  signed in but never filled their profile, and would just clutter the
 *  producer's list. */
router.get("/profiles", requireSignedIn, async (_req, res) => {
  try {
    const rows = await db
      .select()
      .from(freelancerProfilesTable)
      .where(sql`length(trim(${freelancerProfilesTable.fullName})) > 0`)
      .orderBy(desc(freelancerProfilesTable.lastUpdated));
    res.json(rows.map(toPublic));
  } catch (err) {
    logger.error(
      { err: err instanceof Error ? err.message : String(err) },
      "GET /profiles failed",
    );
    res.status(500).json({ error: "Could not load talent pool." });
  }
});

/** POST /api/profiles/save
 *  Upsert the signed-in user's profile. Keyed on Clerk userId so each
 *  user has at most one row — re-saving overwrites the previous record
 *  and bumps `last_updated`. */
router.post("/profiles/save", requireSignedIn, async (req, res) => {
  const parsed = saveFreelancerProfileBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid profile payload." });
    return;
  }
  const userId = (req as unknown as { _userId: string })._userId;
  const { fullName, email, skills, location, bio } = parsed.data;
  try {
    const inserted = await db
      .insert(freelancerProfilesTable)
      .values({
        clerkUserId: userId,
        fullName,
        email,
        skills,
        location,
        bio,
      })
      .onConflictDoUpdate({
        target: freelancerProfilesTable.clerkUserId,
        set: {
          fullName,
          email,
          skills,
          location,
          bio,
          lastUpdated: sql`now()`,
        },
      })
      .returning();
    const row = inserted[0];
    if (!row) {
      // Should never happen — onConflictDoUpdate always returns the row.
      const fallback = await db
        .select()
        .from(freelancerProfilesTable)
        .where(eq(freelancerProfilesTable.clerkUserId, userId))
        .limit(1);
      if (fallback.length === 0) {
        res.status(500).json({ error: "Save succeeded but row not found." });
        return;
      }
      res.json(toPublic(fallback[0]));
      return;
    }
    res.json(toPublic(row));
  } catch (err) {
    logger.error(
      { err: err instanceof Error ? err.message : String(err) },
      "POST /profiles/save failed",
    );
    res.status(500).json({ error: "Could not save profile." });
  }
});

export default router;
