import { Router, type IRouter, type RequestHandler } from "express";
import { randomUUID } from "node:crypto";
import { and, desc, eq, sql } from "drizzle-orm";
import {
  db,
  projectBriefsTable,
  briefAssignmentsTable,
  type ProjectBriefRow,
} from "@workspace/db";
import { logger } from "../lib/logger";

const router: IRouter = Router();

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

/** Brief jsonb caps out at 256 KB — generous for a brief but a hard
 *  ceiling so a malformed payload can't park a multi-MB blob in the
 *  table. Matches the global JSON parser limit in `app.ts`. */
const MAX_BRIEF_BYTES = 256 * 1024;

const VALID_DECISIONS: ReadonlySet<string> = new Set([
  "pending",
  "accepted",
  "declined",
]);

/** Pull a YYYY-MM-DD string off the brief jsonb if present. Defensive
 *  — the brief structure is loose so we don't crash on missing fields. */
function pickDate(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  // Accept ISO date or ISO datetime; we only need the date portion.
  const m = raw.match(/^(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : null;
}

/** Drill into the brief jsonb to extract the columns we want indexable
 *  copies of. We never trust the client to pass these separately.
 *
 *  Field mapping matches the canonical `ProjectBrief.project` shape in
 *  `artifacts/rigging-load-report/src/lib/projectBrief.ts`:
 *    - `project.venue`   → `venue`     (also used as `projectName`,
 *                                       since the venue is the
 *                                       de-facto project title in this
 *                                       domain — there is no separate
 *                                       project-name field)
 *    - `project.client`  → `client`
 *    - `project.date`    → `startDate` (ISO YYYY-MM-DD; the brief
 *                                       schema uses `date` for the
 *                                       start of a single- or
 *                                       multi-day show)
 *    - `project.endDate` → `endDate`   (optional; only set on
 *                                       multi-day shows) */
function extractIndexed(data: Record<string, unknown>): {
  projectName: string;
  client: string;
  venue: string;
  startDate: string | null;
  endDate: string | null;
} {
  const project =
    (data.project && typeof data.project === "object"
      ? (data.project as Record<string, unknown>)
      : {}) as Record<string, unknown>;
  const venue =
    typeof project.venue === "string" ? project.venue.slice(0, 280) : "";
  return {
    // Re-use venue as the project name — the brief schema has no
    // separate name field and the producer's "my briefs" list shows
    // `${venue}` (with `client` as a subtitle) anyway.
    projectName: venue,
    client:
      typeof project.client === "string" ? project.client.slice(0, 280) : "",
    venue,
    startDate: pickDate(project.date),
    endDate: pickDate(project.endDate),
  };
}

/** Read the recipient list for a brief. Sources, in priority order:
 *
 *  1. The top-level `recipients` array on the POST body — the
 *     authoritative shape used by the new producer UI to address a
 *     brief to specific freelancers picked from the shared directory.
 *  2. `data.assignments[].freelancerUserId` — set by the producer's
 *     Crew Report when the assigned crew member was picked from the
 *     directory. Provides forward compatibility once the brief itself
 *     starts carrying the id alongside the name.
 *
 *  Both sources are merged and de-duplicated by `freelancerUserId`,
 *  keeping the first `crewId` we see for that user. */
function readRecipients(
  data: Record<string, unknown>,
  topLevelRecipients: unknown,
): { crewId: string; freelancerUserId: string }[] {
  const seen = new Map<string, string>();
  const push = (rawCrew: unknown, rawUid: unknown): void => {
    const crewId = typeof rawCrew === "string" ? rawCrew : "";
    const freelancerUserId = typeof rawUid === "string" ? rawUid : "";
    if (!freelancerUserId) return;
    if (!seen.has(freelancerUserId)) seen.set(freelancerUserId, crewId);
  };
  if (Array.isArray(topLevelRecipients)) {
    for (const r of topLevelRecipients) {
      if (!r || typeof r !== "object") continue;
      const rr = r as Record<string, unknown>;
      push(rr.crewId, rr.freelancerUserId);
    }
  }
  const fromBrief = data.assignments;
  if (Array.isArray(fromBrief)) {
    for (const a of fromBrief) {
      if (!a || typeof a !== "object") continue;
      const ar = a as Record<string, unknown>;
      push(ar.crewId, ar.freelancerUserId);
    }
  }
  return Array.from(seen.entries()).map(([freelancerUserId, crewId]) => ({
    freelancerUserId,
    crewId,
  }));
}

/** GET /api/portal/briefs/mine
 *  Returns every brief addressed to the signed-in freelancer, joined
 *  with the assignment row that carries the decision + accepted snapshot. */
router.get("/portal/briefs/mine", requireSignedIn, async (req, res) => {
  const userId = (req as unknown as { _userId: string })._userId;
  try {
    const rows = await db
      .select({
        assignmentId: briefAssignmentsTable.id,
        briefId: briefAssignmentsTable.briefId,
        crewId: briefAssignmentsTable.crewId,
        decision: briefAssignmentsTable.decision,
        decidedAt: briefAssignmentsTable.decidedAt,
        acceptedSnapshot: briefAssignmentsTable.acceptedSnapshot,
        acceptedGigId: briefAssignmentsTable.acceptedGigId,
        receivedAt: briefAssignmentsTable.createdAt,
        brief: projectBriefsTable.data,
        ownerUserId: projectBriefsTable.ownerUserId,
        projectName: projectBriefsTable.projectName,
        venue: projectBriefsTable.venue,
        startDate: projectBriefsTable.startDate,
        endDate: projectBriefsTable.endDate,
      })
      .from(briefAssignmentsTable)
      .innerJoin(
        projectBriefsTable,
        eq(briefAssignmentsTable.briefId, projectBriefsTable.id),
      )
      .where(eq(briefAssignmentsTable.freelancerUserId, userId))
      .orderBy(desc(briefAssignmentsTable.createdAt));
    res.json({ ok: true, briefs: rows });
  } catch (err) {
    logger.error(
      { err: err instanceof Error ? err.message : String(err) },
      "portal briefs/mine GET failed",
    );
    res.status(500).json({ ok: false, error: "Could not load briefs." });
  }
});

/** GET /api/portal/briefs
 *  Producer-facing list: every brief the signed-in user owns. */
router.get("/portal/briefs", requireSignedIn, async (req, res) => {
  const userId = (req as unknown as { _userId: string })._userId;
  try {
    const rows = await db
      .select()
      .from(projectBriefsTable)
      .where(eq(projectBriefsTable.ownerUserId, userId))
      .orderBy(desc(projectBriefsTable.updatedAt))
      .limit(200);
    res.json({ ok: true, briefs: rows });
  } catch (err) {
    logger.error(
      { err: err instanceof Error ? err.message : String(err) },
      "portal briefs GET failed",
    );
    res.status(500).json({ ok: false, error: "Could not load briefs." });
  }
});

/** GET /api/portal/briefs/:id
 *  Fetch a specific brief. Allowed if the signed-in user is either the
 *  owner OR has an assignment row for the brief — that way both the
 *  producer and the assigned freelancers can read the same record. */
router.get("/portal/briefs/:id", requireSignedIn, async (req, res) => {
  const userId = (req as unknown as { _userId: string })._userId;
  const id = String(req.params.id ?? "");
  try {
    const briefRows = await db
      .select()
      .from(projectBriefsTable)
      .where(eq(projectBriefsTable.id, id))
      .limit(1);
    const brief = briefRows[0];
    if (!brief) {
      res.status(404).json({ ok: false, error: "Brief not found." });
      return;
    }
    if (brief.ownerUserId !== userId) {
      const assigned = await db
        .select({ id: briefAssignmentsTable.id })
        .from(briefAssignmentsTable)
        .where(
          and(
            eq(briefAssignmentsTable.briefId, id),
            eq(briefAssignmentsTable.freelancerUserId, userId),
          ),
        )
        .limit(1);
      if (assigned.length === 0) {
        res.status(403).json({ ok: false, error: "Not your brief." });
        return;
      }
    }
    res.json({ ok: true, brief });
  } catch (err) {
    logger.error(
      { err: err instanceof Error ? err.message : String(err) },
      "portal briefs/:id GET failed",
    );
    res.status(500).json({ ok: false, error: "Could not load brief." });
  }
});

/** POST /api/portal/briefs
 *  body: { id?: string, data: <ProjectBrief>, recipients?: { freelancerUserId, crewId? }[] }
 *
 *  Producer-only. Creates or replaces a brief the signed-in user owns
 *  and re-syncs `brief_assignments` from the merged recipient list (top-level
 *  `recipients` array + any `freelancerUserId` carried inside the brief's
 *  own `assignments[]`).
 *
 *  Brief write + assignment sync run inside a single transaction so a
 *  partial failure can't leave the indexed columns out of sync with the
 *  jsonb body, or leave orphan assignment rows referencing a half-saved
 *  brief. The unique index on (brief_id, freelancer_user_id) makes the
 *  upsert + crewId refresh truly idempotent — no DELETE-USING dedup
 *  pass needed. */
router.post("/portal/briefs", requireSignedIn, async (req, res) => {
  const userId = (req as unknown as { _userId: string })._userId;
  const body = (req.body ?? {}) as {
    id?: unknown;
    data?: unknown;
    recipients?: unknown;
  };
  const data = body.data;
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    res.status(400).json({ ok: false, error: "data must be a JSON object." });
    return;
  }
  const serialised = JSON.stringify(data);
  if (Buffer.byteLength(serialised, "utf8") > MAX_BRIEF_BYTES) {
    res.status(413).json({ ok: false, error: "Brief too large." });
    return;
  }
  const id =
    typeof body.id === "string" && body.id.trim()
      ? body.id.trim().slice(0, 64)
      : randomUUID();
  const indexed = extractIndexed(data as Record<string, unknown>);
  const recipients = readRecipients(
    data as Record<string, unknown>,
    body.recipients,
  );
  try {
    const result = await db.transaction(async (tx) => {
      // If the brief already exists, only the original owner may update it.
      const existing = await tx
        .select({ ownerUserId: projectBriefsTable.ownerUserId })
        .from(projectBriefsTable)
        .where(eq(projectBriefsTable.id, id))
        .limit(1);
      if (existing[0] && existing[0].ownerUserId !== userId) {
        return { forbidden: true as const };
      }
      const inserted = await tx
        .insert(projectBriefsTable)
        .values({
          id,
          ownerUserId: userId,
          ...indexed,
          data: data as Record<string, unknown>,
        })
        .onConflictDoUpdate({
          target: projectBriefsTable.id,
          set: {
            ...indexed,
            data: data as Record<string, unknown>,
            updatedAt: sql`now()`,
          },
        })
        .returning();
      // Re-sync assignment rows. The unique index on (brief_id,
      // freelancer_user_id) means onConflictDoNothing() is safe — a
      // concurrent re-save cannot create duplicates. Removed
      // recipients are intentionally NOT deleted: keeping the row
      // preserves a recipient's accept history through a producer
      // reorganisation. The client can flag "removed" using the
      // brief's current `recipients` list as the source of truth.
      for (const a of recipients) {
        await tx
          .insert(briefAssignmentsTable)
          .values({
            id: randomUUID(),
            briefId: id,
            freelancerUserId: a.freelancerUserId,
            crewId: a.crewId,
          })
          .onConflictDoNothing({
            target: [
              briefAssignmentsTable.briefId,
              briefAssignmentsTable.freelancerUserId,
            ],
          });
        // Refresh crewId in case the producer renamed the crew row.
        // No-op when the insert above did the work (same crewId).
        await tx
          .update(briefAssignmentsTable)
          .set({ crewId: a.crewId, updatedAt: sql`now()` })
          .where(
            and(
              eq(briefAssignmentsTable.briefId, id),
              eq(briefAssignmentsTable.freelancerUserId, a.freelancerUserId),
            ),
          );
      }
      return { brief: inserted[0] ?? null };
    });
    if ("forbidden" in result) {
      res.status(403).json({ ok: false, error: "Not your brief." });
      return;
    }
    res.json({ ok: true, brief: result.brief });
  } catch (err) {
    logger.error(
      { err: err instanceof Error ? err.message : String(err) },
      "portal briefs POST failed",
    );
    res.status(500).json({ ok: false, error: "Could not save brief." });
  }
});

/** GET /api/portal/briefs/:id/assignments
 *  Producer-only. Returns every brief_assignments row for the brief so
 *  the Crew Report can render Requested / Accepted / Declined pills next
 *  to each freelancer the producer requested. The polled rows include
 *  `decision`, `decidedAt` and `createdAt` so the client can derive a
 *  "no reply" status for assignments that have been pending for more
 *  than 24 hours without forcing a server-side timer. */
router.get(
  "/portal/briefs/:id/assignments",
  requireSignedIn,
  async (req, res) => {
    const userId = (req as unknown as { _userId: string })._userId;
    const id = String(req.params.id ?? "");
    try {
      const briefRows = await db
        .select({ ownerUserId: projectBriefsTable.ownerUserId })
        .from(projectBriefsTable)
        .where(eq(projectBriefsTable.id, id))
        .limit(1);
      if (briefRows.length === 0) {
        res.status(404).json({ ok: false, error: "Brief not found." });
        return;
      }
      if (briefRows[0].ownerUserId !== userId) {
        res.status(403).json({ ok: false, error: "Not your brief." });
        return;
      }
      const assignments = await db
        .select({
          id: briefAssignmentsTable.id,
          freelancerUserId: briefAssignmentsTable.freelancerUserId,
          crewId: briefAssignmentsTable.crewId,
          decision: briefAssignmentsTable.decision,
          decidedAt: briefAssignmentsTable.decidedAt,
          acceptedGigId: briefAssignmentsTable.acceptedGigId,
          createdAt: briefAssignmentsTable.createdAt,
          updatedAt: briefAssignmentsTable.updatedAt,
        })
        .from(briefAssignmentsTable)
        .where(eq(briefAssignmentsTable.briefId, id))
        .orderBy(briefAssignmentsTable.createdAt);
      res.json({ ok: true, assignments });
    } catch (err) {
      logger.error(
        { err: err instanceof Error ? err.message : String(err) },
        "portal briefs/:id/assignments GET failed",
      );
      res
        .status(500)
        .json({ ok: false, error: "Could not load assignments." });
    }
  },
);

/** POST /api/portal/briefs/:id/respond  body: { decision, acceptedSnapshot?, acceptedGigId? }
 *  Freelancer-only. Records accept/decline + the frozen snapshot on
 *  the assignment row. */
router.post(
  "/portal/briefs/:id/respond",
  requireSignedIn,
  async (req, res) => {
    const userId = (req as unknown as { _userId: string })._userId;
    const briefId = String(req.params.id ?? "");
    const body = (req.body ?? {}) as {
      decision?: unknown;
      acceptedSnapshot?: unknown;
      acceptedGigId?: unknown;
    };
    const decision =
      typeof body.decision === "string" ? body.decision : "";
    if (!VALID_DECISIONS.has(decision)) {
      res.status(400).json({ ok: false, error: "Invalid decision." });
      return;
    }
    const acceptedSnapshot =
      body.acceptedSnapshot && typeof body.acceptedSnapshot === "object"
        ? (body.acceptedSnapshot as Record<string, unknown>)
        : null;
    const acceptedGigId =
      typeof body.acceptedGigId === "string"
        ? body.acceptedGigId.slice(0, 64)
        : null;
    try {
      const updated = await db
        .update(briefAssignmentsTable)
        .set({
          decision,
          decidedAt: sql`now()`,
          acceptedSnapshot,
          acceptedGigId,
          updatedAt: sql`now()`,
        })
        .where(
          and(
            eq(briefAssignmentsTable.briefId, briefId),
            eq(briefAssignmentsTable.freelancerUserId, userId),
          ),
        )
        .returning();
      if (updated.length === 0) {
        res
          .status(404)
          .json({ ok: false, error: "No assignment for this user." });
        return;
      }
      res.json({ ok: true, assignment: updated[0] });
    } catch (err) {
      logger.error(
        { err: err instanceof Error ? err.message : String(err) },
        "portal briefs/:id/respond POST failed",
      );
      res
        .status(500)
        .json({ ok: false, error: "Could not record your response." });
    }
  },
);

// Silence unused-warning on the row type re-exported only for callers.
export type { ProjectBriefRow };

export default router;
