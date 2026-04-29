import { Router, type IRouter, type RequestHandler } from "express";
import { and, eq, sql } from "drizzle-orm";
import { db, venueMemoryTable } from "@workspace/db";
import { logger } from "../lib/logger";
import { venueKeyFor } from "./rigplanAnalyze";

const router: IRouter = Router();

/** Same Clerk gate the analyser uses — memory is per-user, so we need
 *  a userId on every request and we never serve unauthenticated reads
 *  or writes. Mirrors `requireSignedIn` in rigplanAnalyze.ts. */
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

/** Cap the saved blob size — corrections are small (a few KB at
 *  most). Anything larger almost certainly means the client is
 *  trying to round-trip something we don't want to persist. */
const MAX_DATA_BYTES = 256 * 1024;

/** GET /api/rigplan/memory?venue=<name>
 *  Returns the saved memory blob for the (current user, venue) pair,
 *  or `{ ok: true, data: null }` when no memory exists yet. */
router.get("/rigplan/memory", requireSignedIn, async (req, res) => {
  const venueName =
    typeof req.query.venue === "string" ? req.query.venue.trim() : "";
  if (!venueName) {
    res.status(400).json({ ok: false, error: "venue is required" });
    return;
  }
  const userId = (req as unknown as { _userId: string })._userId;
  try {
    const rows = await db
      .select({
        data: venueMemoryTable.data,
        venueName: venueMemoryTable.venueName,
        updatedAt: venueMemoryTable.updatedAt,
      })
      .from(venueMemoryTable)
      .where(
        and(
          eq(venueMemoryTable.userId, userId),
          eq(venueMemoryTable.venueKey, venueKeyFor(venueName)),
        ),
      )
      .limit(1);
    if (rows.length === 0) {
      res.json({ ok: true, data: null });
      return;
    }
    res.json({
      ok: true,
      data: rows[0].data,
      venueName: rows[0].venueName,
      updatedAt: rows[0].updatedAt,
    });
  } catch (err) {
    logger.error(
      { err: err instanceof Error ? err.message : String(err) },
      "venue memory GET failed",
    );
    res.status(500).json({ ok: false, error: "Could not load venue memory." });
  }
});

/** PUT /api/rigplan/memory  body: { venueName: string, data: object }
 *  Upsert the memory blob for the (current user, venue) pair. Replaces
 *  the saved data wholesale — the client decides the on-disk shape and
 *  is responsible for sending the full new blob. */
router.put("/rigplan/memory", requireSignedIn, async (req, res) => {
  const body = (req.body ?? {}) as { venueName?: unknown; data?: unknown };
  const venueName =
    typeof body.venueName === "string" ? body.venueName.trim() : "";
  if (!venueName) {
    res.status(400).json({ ok: false, error: "venueName is required" });
    return;
  }
  if (!body.data || typeof body.data !== "object" || Array.isArray(body.data)) {
    res
      .status(400)
      .json({ ok: false, error: "data must be a JSON object." });
    return;
  }
  // Cheap size check — JSON-stringify and compare bytes. Anything
  // bigger than the cap is almost certainly accidental (e.g. the
  // client trying to save the raw image alongside the corrections).
  const serialised = JSON.stringify(body.data);
  if (Buffer.byteLength(serialised, "utf8") > MAX_DATA_BYTES) {
    res
      .status(413)
      .json({ ok: false, error: "Memory blob too large." });
    return;
  }
  const userId = (req as unknown as { _userId: string })._userId;
  const venueKey = venueKeyFor(venueName);
  try {
    const inserted = await db
      .insert(venueMemoryTable)
      .values({
        userId,
        venueName,
        venueKey,
        data: body.data as Record<string, unknown>,
      })
      .onConflictDoUpdate({
        target: [venueMemoryTable.userId, venueMemoryTable.venueKey],
        set: {
          data: body.data as Record<string, unknown>,
          venueName,
          updatedAt: sql`now()`,
        },
      })
      .returning({
        id: venueMemoryTable.id,
        updatedAt: venueMemoryTable.updatedAt,
      });
    res.json({
      ok: true,
      id: inserted[0]?.id ?? null,
      updatedAt: inserted[0]?.updatedAt ?? null,
    });
  } catch (err) {
    logger.error(
      { err: err instanceof Error ? err.message : String(err) },
      "venue memory PUT failed",
    );
    res.status(500).json({ ok: false, error: "Could not save venue memory." });
  }
});

export default router;
