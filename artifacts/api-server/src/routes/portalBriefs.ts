import { Router, type IRouter, type RequestHandler } from "express";
import { randomUUID } from "node:crypto";
import { and, desc, eq, sql } from "drizzle-orm";
import {
  db,
  projectBriefsTable,
  briefAssignmentsTable,
  gigsTable,
  type ProjectBriefRow,
} from "@workspace/db";
import { logger } from "../lib/logger";
import { dispatchBriefRequestEmails } from "../lib/briefEmail";

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

/** Decisions a freelancer is allowed to send themselves. `too_late` is
 *  a *server-only* status — it's set when another freelancer beats this
 *  one to the accept on a first-to-accept-wins brief, and is never a
 *  valid input on the /respond endpoint. */
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

/** Gig statuses past `confirmed` that the freelancer themselves drives
 *  (done → invoiced → paid). When a re-accept or acknowledge fires
 *  against an existing gig in one of these states, we must keep the
 *  status as-is rather than silently downgrading the booking back to
 *  `confirmed`. `invited` is allowed to be promoted to `confirmed`
 *  because the freelancer hasn't acted on the gig yet. */
const TERMINAL_GIG_STATUSES: ReadonlySet<string> = new Set([
  "done",
  "invoiced",
  "paid",
]);

/** Build the gigs-table fields for a freelancer who just won a brief.
 *  Pulls project-name / venue / dates from the denormalised columns
 *  (which the brief POST handler computed via `extractIndexed`) and
 *  drills into the `data` jsonb to find the per-crew role / hours /
 *  rate for the slot the caller was addressed for. We use `crewId`
 *  to pick the right line out of `data.assignments[]`; if it doesn't
 *  resolve we fall back to the first assignment so the gig still has
 *  a sensible role label rather than an empty string. */
function gigFieldsFromBrief(
  brief: {
    projectName: string | null;
    client: string | null;
    venue: string | null;
    startDate: string | null;
    endDate: string | null;
    data: unknown;
  },
  crewId: string,
): {
  projectName: string;
  client: string;
  venue: string;
  role: string;
  startDate: string | null;
  endDate: string | null;
  hours: string;
  rate: string;
  notes: string;
} {
  const data =
    brief.data && typeof brief.data === "object"
      ? (brief.data as Record<string, unknown>)
      : {};
  const assignments = Array.isArray(data.assignments)
    ? (data.assignments as Record<string, unknown>[])
    : [];
  const target =
    (crewId
      ? assignments.find((a) => typeof a.crewId === "string" && a.crewId === crewId)
      : undefined) ?? assignments[0];
  const role =
    target && typeof target.role === "string" ? target.role.slice(0, 280) : "";
  const notes =
    target && typeof target.notes === "string"
      ? target.notes.slice(0, 4000)
      : "";
  // numeric() columns expect strings; coerce defensively.
  const toNumeric = (raw: unknown): string => {
    const n =
      typeof raw === "number"
        ? raw
        : typeof raw === "string"
          ? Number(raw)
          : 0;
    if (!Number.isFinite(n) || n < 0) return "0";
    return Math.min(n, 1_000_000_000).toFixed(2);
  };
  const startDate = brief.startDate;
  return {
    projectName: brief.projectName ?? brief.venue ?? "",
    client: brief.client ?? "",
    venue: brief.venue ?? "",
    role,
    startDate,
    endDate: brief.endDate ?? startDate,
    hours: toNumeric(target?.hours),
    rate: toNumeric(target?.dayRate),
    notes,
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
      const newRecipientUserIds: string[] = [];
      for (const a of recipients) {
        // .returning() on an onConflictDoNothing insert yields one row
        // when the row was actually inserted, and zero rows when an
        // existing assignment already covered this (briefId,
        // freelancerUserId) pair. We use that to decide whether to send
        // the request email — resends to existing recipients must NOT
        // generate a duplicate email.
        const insertedRows = await tx
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
          })
          .returning({ id: briefAssignmentsTable.id });
        if (insertedRows.length > 0) {
          newRecipientUserIds.push(a.freelancerUserId);
        }
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
      return { brief: inserted[0] ?? null, newRecipientUserIds };
    });
    if ("forbidden" in result) {
      res.status(403).json({ ok: false, error: "Not your brief." });
      return;
    }
    // Fire-and-forget Norwegian email to every freelancer whose
    // assignment row was just created. Resends never fire because
    // .returning() on the conflict-do-nothing insert yields zero rows
    // for already-existing pairs. We never await this — email delivery
    // must not block the producer's HTTP response, but we log every
    // send and every failure inside dispatchBriefRequestEmails.
    void dispatchBriefRequestEmails({
      briefId: id,
      ownerUserId: userId,
      newRecipientUserIds: result.newRecipientUserIds,
      projectName: indexed.projectName,
      venue: indexed.venue,
      client: indexed.client,
      startDate: indexed.startDate,
      endDate: indexed.endDate,
    });
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
 *  the assignment row.
 *
 *  First-to-accept-wins: each brief is treated as a single slot shared
 *  by all of its candidates. The whole respond flow runs inside a
 *  transaction with the brief row locked (`SELECT … FOR UPDATE`) so
 *  two concurrent accepts can't both win. On accept we look at the
 *  sibling assignments:
 *
 *    - If any sibling already holds `decision = 'accepted'`, this caller
 *      lost the race. Their row is set to `'too_late'` and the response
 *      includes `tooLate: true` so the freelancer UI can show a
 *      "position filled" banner instead of a confirmation.
 *    - Otherwise this caller wins. Their row is set to `'accepted'` and
 *      every other sibling whose decision is still `'pending'` is
 *      atomically downgraded to `'too_late'` so the producer's poll
 *      and the other freelancers' next sync both see a single winner.
 *
 *  Decline keeps its old behaviour — it only mutates the caller's row
 *  and never touches siblings. `'too_late'` itself is *not* a valid
 *  client-supplied decision; only the server may write it. */
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
      const result = await db.transaction(async (tx) => {
        // Lock the brief row for the lifetime of the transaction so
        // sibling-checking and sibling-updates can't race. The lock
        // is on `project_briefs`, not on `brief_assignments`, because
        // there is exactly one brief per slot — locking it serialises
        // every accept attempt for that slot regardless of which
        // freelancer they belong to.
        const briefRows = await tx
          .select({
            id: projectBriefsTable.id,
            projectName: projectBriefsTable.projectName,
            client: projectBriefsTable.client,
            venue: projectBriefsTable.venue,
            startDate: projectBriefsTable.startDate,
            endDate: projectBriefsTable.endDate,
            data: projectBriefsTable.data,
          })
          .from(projectBriefsTable)
          .where(eq(projectBriefsTable.id, briefId))
          .for("update")
          .limit(1);
        if (briefRows.length === 0) {
          return { kind: "no_brief" as const };
        }
        const briefRow = briefRows[0];
        // Always pull the full sibling set up-front so we can enforce
        // the state-transition rules below regardless of which branch
        // we end up in. The cost is one extra SELECT per request,
        // which is cheap relative to the FOR UPDATE lock we already
        // hold on the brief row.
        const siblings = await tx
          .select({
            id: briefAssignmentsTable.id,
            freelancerUserId: briefAssignmentsTable.freelancerUserId,
            decision: briefAssignmentsTable.decision,
            crewId: briefAssignmentsTable.crewId,
          })
          .from(briefAssignmentsTable)
          .where(eq(briefAssignmentsTable.briefId, briefId));
        const myRow = siblings.find((s) => s.freelancerUserId === userId);
        if (!myRow) return { kind: "no_assignment" as const };
        // `too_late` is terminal from the freelancer's perspective —
        // the producer (or a future "reopen slot" feature) is the only
        // legitimate way out of it. Reject any client-driven attempt
        // to leave that state, including a re-accept retry from a
        // stale tab. We surface a friendly tooLate response so the
        // existing client UI keeps showing the "Position filled"
        // banner instead of flickering.
        if (myRow.decision === "too_late") {
          return {
            kind: "ok" as const,
            assignment: myRow,
            tooLate: true,
          };
        }
        if (decision !== "accepted") {
          // Decline / pending — no sibling effects, *except* when the
          // caller is the current winner undoing their accept. In that
          // case we reopen every sibling we previously swept to
          // `too_late` so they have a fair chance again. Already-
          // declined siblings are left declined (they made an explicit
          // choice to opt out and shouldn't be silently re-prompted).
          const wasWinnerUndoing =
            myRow.decision === "accepted" && decision === "pending";
          if (wasWinnerUndoing) {
            await tx
              .update(briefAssignmentsTable)
              .set({
                decision: "pending",
                decidedAt: sql`now()`,
                updatedAt: sql`now()`,
              })
              .where(
                and(
                  eq(briefAssignmentsTable.briefId, briefId),
                  eq(briefAssignmentsTable.decision, "too_late"),
                ),
              );
          }
          const updated = await tx
            .update(briefAssignmentsTable)
            .set({
              decision,
              decidedAt: sql`now()`,
              acceptedSnapshot: null,
              acceptedGigId: null,
              updatedAt: sql`now()`,
            })
            .where(eq(briefAssignmentsTable.id, myRow.id))
            .returning();
          if (updated.length === 0) return { kind: "no_assignment" as const };
          // If the freelancer is undoing a win (was accepted, now
          // declining or going back to pending), tear down the gig
          // we previously materialised for them. Scoped to (brief,
          // freelancer) so a manually-created gig with the same brief
          // link from a different flow stays untouched.
          if (myRow.decision === "accepted") {
            await tx
              .delete(gigsTable)
              .where(
                and(
                  eq(gigsTable.briefId, briefId),
                  eq(gigsTable.freelancerUserId, userId),
                ),
              );
          }
          return {
            kind: "ok" as const,
            assignment: updated[0],
            tooLate: false,
            gig: null,
          };
        }
        // Accept path — check whether anyone else has already won. We
        // explicitly exclude the caller's own row from the "anyone
        // already accepted" check so a no-op double-accept by the same
        // freelancer (e.g. a stale tab or a retried request) is treated
        // as success, not as a too-late race against themselves.
        const winner = siblings.find(
          (s) =>
            s.decision === "accepted" && s.freelancerUserId !== userId,
        );
        if (winner) {
          // Lost the race — record `too_late` for this caller.
          const updated = await tx
            .update(briefAssignmentsTable)
            .set({
              decision: "too_late",
              decidedAt: sql`now()`,
              acceptedSnapshot: null,
              acceptedGigId: null,
              updatedAt: sql`now()`,
            })
            .where(eq(briefAssignmentsTable.id, myRow.id))
            .returning();
          return {
            kind: "ok" as const,
            assignment: updated[0],
            tooLate: true,
          };
        }
        // Sweep every other still-pending sibling to `too_late`.
        // Already-declined siblings are left alone — a freelancer who
        // said no shouldn't have their decision rewritten just because
        // another candidate happened to accept later. We do this
        // *before* materialising the gig so the assignment row update
        // below carries the resolved gig id in a single write.
        await tx
          .update(briefAssignmentsTable)
          .set({
            decision: "too_late",
            decidedAt: sql`now()`,
            updatedAt: sql`now()`,
          })
          .where(
            and(
              eq(briefAssignmentsTable.briefId, briefId),
              eq(briefAssignmentsTable.decision, "pending"),
              // Don't accidentally sweep ourselves — myRow may still be
              // in the `pending` state at this point.
            ),
          );
        // Materialise the booking. The gig row is the source of truth
        // for the freelancer's calendar, the producer's booked roster
        // (via the brief link), and the directory's `booked` status
        // pill. Idempotency is keyed on (briefId, freelancerUserId)
        // — *not* on the client-supplied `acceptedGigId` — so a
        // retried accept (or an "acknowledge changes" re-confirm) can
        // never produce duplicate rows or overwrite somebody else's
        // gig via a guessed id (IDOR). The FOR UPDATE lock on the
        // brief row earlier in this transaction serialises every
        // accept attempt for the same (brief, freelancer) pair, so
        // the SELECT-then-INSERT/UPDATE pattern below cannot race.
        const gigFields = gigFieldsFromBrief(briefRow, myRow.crewId);
        const existingGig = await tx
          .select({ id: gigsTable.id, status: gigsTable.status })
          .from(gigsTable)
          .where(
            and(
              eq(gigsTable.briefId, briefId),
              eq(gigsTable.freelancerUserId, userId),
            ),
          )
          .limit(1);
        let gigRow;
        if (existingGig.length > 0) {
          // Preserve any status the freelancer has progressed the gig
          // into via PATCH /portal/gigs/:id (`done` / `invoiced` /
          // `paid`). A re-accept or acknowledge must never silently
          // downgrade a paid gig back to `confirmed`.
          const preserveStatus = TERMINAL_GIG_STATUSES.has(
            existingGig[0].status,
          );
          const setClause: Record<string, unknown> = {
            ...gigFields,
            updatedAt: sql`now()`,
          };
          if (!preserveStatus) setClause.status = "confirmed";
          const updatedGig = await tx
            .update(gigsTable)
            .set(setClause)
            .where(eq(gigsTable.id, existingGig[0].id))
            .returning();
          gigRow = updatedGig[0] ?? null;
        } else {
          // Always server-generate the id. The client's
          // `acceptedGigId` is treated as advisory at most — we never
          // trust it as a target row id because doing so would let
          // any signed-in caller overwrite arbitrary rows by guessing
          // an id (IDOR). The new id is returned to the client which
          // swaps its optimistic local gig over.
          const newId = `gig_${randomUUID()}`;
          const insertedGig = await tx
            .insert(gigsTable)
            .values({
              id: newId,
              freelancerUserId: userId,
              briefId,
              ...gigFields,
              status: "confirmed",
            })
            .returning();
          gigRow = insertedGig[0] ?? null;
        }
        // Mark this row accepted. We carry the *resolved* server gig
        // id (from the insert/update above) so the assignments table
        // and the gigs table never disagree on which gig represents
        // this booking — even when the client's optimistic id was
        // ignored. We refuse to fall back to the client-supplied
        // `acceptedGigId` here: doing so would re-introduce a path
        // where the assignment row points at a row id the client
        // chose, blunting the IDOR fix above. If gig materialisation
        // somehow returned null we abort the whole transaction.
        if (!gigRow) {
          throw new Error(
            "gig materialisation returned no row; aborting accept",
          );
        }
        const updated = await tx
          .update(briefAssignmentsTable)
          .set({
            decision: "accepted",
            decidedAt: sql`now()`,
            acceptedSnapshot,
            acceptedGigId: gigRow.id,
            updatedAt: sql`now()`,
          })
          .where(eq(briefAssignmentsTable.id, myRow.id))
          .returning();
        return {
          kind: "ok" as const,
          assignment: updated[0],
          tooLate: false,
          gig: gigRow,
        };
      });
      if (result.kind === "no_brief") {
        res.status(404).json({ ok: false, error: "Brief not found." });
        return;
      }
      if (result.kind === "no_assignment") {
        res
          .status(404)
          .json({ ok: false, error: "No assignment for this user." });
        return;
      }
      res.json({
        ok: true,
        assignment: result.assignment,
        tooLate: result.tooLate,
        // Hand back the gig the transaction materialised (or null on
        // a decline / pending / too-late branch). The freelancer
        // client uses `gig.id` to swap its optimistic local gig over
        // to the server's authoritative id, since the server now
        // ignores the client's suggested `acceptedGigId` to defeat
        // the IDOR-overwrite vector.
        gig: result.gig ?? null,
      });
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
