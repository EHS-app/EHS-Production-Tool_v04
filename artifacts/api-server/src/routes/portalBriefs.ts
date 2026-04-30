import { Router, type IRouter, type RequestHandler } from "express";
import { randomUUID } from "node:crypto";
import { and, desc, eq, sql } from "drizzle-orm";
import {
  db,
  projectBriefsTable,
  briefAssignmentsTable,
  gigsTable,
  freelancerProfilesTable,
  type ProjectBriefRow,
} from "@workspace/db";
import { logger } from "../lib/logger";
import { dispatchBriefRequestEmails } from "../lib/briefEmail";
import { autoAssignedDatesFor } from "../lib/roleSchedule";
import {
  classifyDietary,
  splitAllergens,
  DIETARY_TAGS,
  type DietaryTag,
} from "../lib/dietaryTags";

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
  /** Working days for this freelancer — auto-assigned from the brief's
   *  schedule × the role's default phase mapping. Falls back to every
   *  day in `startDate..endDate` when the brief has no schedule. The
   *  producer can override later via PATCH /api/portal/gigs/:id. */
  assignedDates: string[];
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
  const project =
    data.project && typeof data.project === "object"
      ? (data.project as Record<string, unknown>)
      : {};
  const assignedDates = autoAssignedDatesFor({
    role,
    schedule: project.schedule,
    startDate,
    endDate: brief.endDate ?? startDate,
  });
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
    assignedDates,
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

/** GET /api/portal/briefs/:id/catering
 *  Producer-side catering aggregation. Joins this brief's confirmed
 *  freelancer gigs against their portal profiles, classifies free-text
 *  dietary needs into the canonical category set, and returns a
 *  per-day breakdown the producer's Catering tab can render directly.
 *
 *  Auth model matches the rest of the producer-only endpoints:
 *  signed-in user must own the brief. The freelancer-side
 *  `/portal/briefs/:id` GET is owner-OR-assigned, but catering is a
 *  back-of-house planning view that no individual freelancer should
 *  see (it would leak other crew members' allergens), so we restrict
 *  to the owner.
 *
 *  We pull only the `confirmed` / `done` / `invoiced` / `paid`
 *  statuses — `invited` gigs are speculative pre-acceptance shells
 *  that shouldn't be counted as confirmed mouths to feed. */
const COUNTABLE_GIG_STATUSES: ReadonlySet<string> = new Set([
  "confirmed",
  "done",
  "invoiced",
  "paid",
]);

router.get(
  "/portal/briefs/:id/catering",
  requireSignedIn,
  async (req, res) => {
    const userId = (req as unknown as { _userId: string })._userId;
    const id = String(req.params.id ?? "");
    try {
      // Owner check first — cheaper than the join, fails fast on
      // bad ids and prevents the second query from running for an
      // unauthorised reader.
      const briefRows = await db
        .select({
          id: projectBriefsTable.id,
          ownerUserId: projectBriefsTable.ownerUserId,
          venue: projectBriefsTable.venue,
          projectName: projectBriefsTable.projectName,
        })
        .from(projectBriefsTable)
        .where(eq(projectBriefsTable.id, id))
        .limit(1);
      const brief = briefRows[0];
      if (!brief) {
        res.status(404).json({ ok: false, error: "Brief not found." });
        return;
      }
      if (brief.ownerUserId !== userId) {
        res.status(403).json({ ok: false, error: "Not your brief." });
        return;
      }

      // One join: every countable gig on this brief, plus the
      // freelancer's profile fields we actually need. Profile may
      // be missing (`leftJoin`) — a freelancer can accept a brief
      // before filling out their portal profile, in which case we
      // surface them in `missing.profileless` so the producer can
      // nudge them.
      const rows = await db
        .select({
          gigId: gigsTable.id,
          gigRole: gigsTable.role,
          assignedDates: gigsTable.assignedDates,
          status: gigsTable.status,
          freelancerUserId: gigsTable.freelancerUserId,
          // Profile-side (nullable on left join):
          profileFullName: freelancerProfilesTable.fullName,
          profileDietary: freelancerProfilesTable.dietary,
          profileAllergies: freelancerProfilesTable.allergies,
        })
        .from(gigsTable)
        .leftJoin(
          freelancerProfilesTable,
          eq(gigsTable.freelancerUserId, freelancerProfilesTable.userId),
        )
        .where(eq(gigsTable.briefId, id));

      type Person = {
        userId: string;
        name: string;
        role: string;
        tags: DietaryTag[];
        allergens: string[];
      };
      // Day → freelancerUserId → person. The nested map dedupes by
      // person-per-day so a freelancer with two gigs on the same brief
      // on the same date (e.g. a recurring show with split roles)
      // still counts as ONE meal — chefs plate once per mouth, not
      // per booking row. Without this, `total`, `byCategory`, and
      // the allergen roster would all be over-inflated, and the
      // duplicate row would also break React keys downstream.
      const dayMap = new Map<string, Map<string, Person>>();
      const profileless: Array<{ name: string; userId: string }> = [];

      for (const r of rows) {
        if (!COUNTABLE_GIG_STATUSES.has(r.status)) continue;
        const dates = Array.isArray(r.assignedDates) ? r.assignedDates : [];
        if (dates.length === 0) continue;
        const hasProfile = typeof r.profileFullName === "string";
        const name =
          (hasProfile ? r.profileFullName : null) ||
          // Fall back to a short id stub so the chef sees *something*
          // attached to the count rather than a blank row. Producer
          // can chase the freelancer to fill their profile.
          `Crew member ${r.freelancerUserId.slice(-4)}`;
        if (!hasProfile) {
          profileless.push({ name, userId: r.freelancerUserId });
        }
        const person: Person = {
          userId: r.freelancerUserId,
          name,
          role: r.gigRole ?? "",
          tags: classifyDietary(r.profileDietary),
          allergens: splitAllergens(r.profileAllergies),
        };
        for (const d of dates) {
          // Normalise date column → ISO YYYY-MM-DD string. Drizzle's
          // `date` type returns a string already, but defensively
          // coerce anything weird.
          const iso =
            typeof d === "string" ? d.slice(0, 10) : String(d).slice(0, 10);
          if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) continue;
          let perDay = dayMap.get(iso);
          if (!perDay) {
            perDay = new Map<string, Person>();
            dayMap.set(iso, perDay);
          }
          // Set is idempotent on the same userId — second gig for
          // the same person on the same day is a no-op for counting.
          // We DO overwrite the role with the most recent gig's role
          // so the chef sees *some* role label rather than nothing,
          // but no row is duplicated.
          perDay.set(r.freelancerUserId, person);
        }
      }

      const days = Array.from(dayMap.entries())
        .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
        .map(([iso, peopleMap]) => {
          const people = Array.from(peopleMap.values());
          const byCategory: Record<DietaryTag, number> = {
            vegetarian: 0,
            vegan: 0,
            halal: 0,
            "gluten-free": 0,
            "lactose-free": 0,
          };
          // People with at least one allergen — surfaced as a
          // separate row per person so the chef can scan them.
          const allergenRoster: Array<{
            userId: string;
            name: string;
            role: string;
            allergens: string[];
          }> = [];
          for (const p of people) {
            for (const t of p.tags) byCategory[t] += 1;
            if (p.allergens.length > 0) {
              allergenRoster.push({
                userId: p.userId,
                name: p.name,
                role: p.role,
                allergens: p.allergens,
              });
            }
          }
          return {
            date: iso,
            total: people.length,
            byCategory,
            allergenRoster: allergenRoster.sort((a, b) =>
              a.name.localeCompare(b.name),
            ),
          };
        });

      // Dedupe profileless by userId — a single crew member with
      // multiple gigs (rare but possible across recurring shows in
      // the same brief) should only show up once in the nudge list.
      const seen = new Set<string>();
      const profilelessUnique = profileless.filter((p) => {
        if (seen.has(p.userId)) return false;
        seen.add(p.userId);
        return true;
      });

      res.json({
        ok: true,
        brief: {
          id: brief.id,
          projectName: brief.projectName,
          venue: brief.venue,
        },
        days,
        categories: DIETARY_TAGS,
        missing: {
          profileless: profilelessUnique,
        },
      });
    } catch (err) {
      logger.error(
        { err: err instanceof Error ? err.message : String(err), briefId: id },
        "portal briefs/:id/catering GET failed",
      );
      res
        .status(500)
        .json({ ok: false, error: "Could not load catering data." });
    }
  },
);

/** GET /api/portal/briefs/:id/hotel — owner-only.
 *  Returns the hotel-logistics view for the brief's confirmed crew:
 *  for each gig (countable status only), the freelancer's name, role,
 *  hotel-needed flag, derived-or-explicit check-in/out dates, and the
 *  pairing inputs the producer needs (room-share preference, gender).
 *
 *  Owner-only because exposing other crew members' room-share or
 *  gender preferences to peers would be a privacy leak — the hotel
 *  view is an internal back-of-house tool, not a roster page. The
 *  pairing engine itself ships in Slice B; for now this endpoint
 *  returns the raw inputs only so Slice A can render the list.
 *
 *  Date derivation rule: if `gig.checkInDate` is null we use
 *  `min(assignedDates)`; if `gig.checkOutDate` is null we use
 *  `max(assignedDates) + 1 day` (hotel-style "the night after the
 *  last show"). Producer overrides via PATCH always win. */
router.get(
  "/portal/briefs/:id/hotel",
  requireSignedIn,
  async (req, res) => {
    const userId = (req as unknown as { _userId: string })._userId;
    const id = String(req.params.id ?? "");
    try {
      const briefRows = await db
        .select({
          id: projectBriefsTable.id,
          ownerUserId: projectBriefsTable.ownerUserId,
          venue: projectBriefsTable.venue,
          projectName: projectBriefsTable.projectName,
        })
        .from(projectBriefsTable)
        .where(eq(projectBriefsTable.id, id))
        .limit(1);
      const brief = briefRows[0];
      if (!brief) {
        res.status(404).json({ ok: false, error: "Brief not found." });
        return;
      }
      if (brief.ownerUserId !== userId) {
        res.status(403).json({ ok: false, error: "Not your brief." });
        return;
      }

      const rows = await db
        .select({
          gigId: gigsTable.id,
          gigRole: gigsTable.role,
          assignedDates: gigsTable.assignedDates,
          status: gigsTable.status,
          hotelRequired: gigsTable.hotelRequired,
          checkInDate: gigsTable.checkInDate,
          checkOutDate: gigsTable.checkOutDate,
          freelancerUserId: gigsTable.freelancerUserId,
          // Profile-side (nullable on left join) — same access pattern
          // as the catering endpoint: profileless freelancers still
          // get listed so the producer can chase their preferences.
          profileFullName: freelancerProfilesTable.fullName,
          profilePhone: freelancerProfilesTable.phone,
          profileRoomShare: freelancerProfilesTable.roomShare,
          profileGender: freelancerProfilesTable.gender,
        })
        .from(gigsTable)
        .leftJoin(
          freelancerProfilesTable,
          eq(gigsTable.freelancerUserId, freelancerProfilesTable.userId),
        )
        .where(eq(gigsTable.briefId, id));

      const crew = rows
        .filter((r) => COUNTABLE_GIG_STATUSES.has(r.status))
        .map((r) => {
          const dates: string[] = (Array.isArray(r.assignedDates)
            ? r.assignedDates
            : []
          )
            .map((d) =>
              typeof d === "string"
                ? d.slice(0, 10)
                : String(d).slice(0, 10),
            )
            .filter((iso) => /^\d{4}-\d{2}-\d{2}$/.test(iso))
            .sort();
          const minIso = dates[0] ?? null;
          const maxIso = dates[dates.length - 1] ?? null;
          // "Check-out is the morning after the last working day" —
          // standard touring convention. Compute via UTC to avoid
          // timezone day-shift on the producer's browser later.
          let derivedCheckOut: string | null = null;
          if (maxIso) {
            const d = new Date(`${maxIso}T00:00:00Z`);
            d.setUTCDate(d.getUTCDate() + 1);
            derivedCheckOut = d.toISOString().slice(0, 10);
          }
          const hasProfile = typeof r.profileFullName === "string";
          const name =
            (hasProfile ? r.profileFullName : null) ||
            `Crew member ${r.freelancerUserId.slice(-4)}`;
          // Drizzle's `date` column returns a string in "YYYY-MM-DD"
          // form, but be defensive — coerce anything else to null.
          const ci =
            typeof r.checkInDate === "string"
              ? r.checkInDate.slice(0, 10)
              : null;
          const co =
            typeof r.checkOutDate === "string"
              ? r.checkOutDate.slice(0, 10)
              : null;
          return {
            gigId: r.gigId,
            freelancerUserId: r.freelancerUserId,
            name,
            role: r.gigRole ?? "",
            hotelRequired: !!r.hotelRequired,
            // Override-or-derived. UI shows the resolved value but
            // also exposes the explicit flag so producers know if a
            // value was hand-edited.
            checkInDate: ci ?? minIso,
            checkOutDate: co ?? derivedCheckOut,
            checkInExplicit: ci !== null,
            checkOutExplicit: co !== null,
            roomShare:
              r.profileRoomShare === "twin" ||
              r.profileRoomShare === "single"
                ? r.profileRoomShare
                : "either",
            gender:
              r.profileGender === "female" ||
              r.profileGender === "male" ||
              r.profileGender === "other"
                ? r.profileGender
                : "",
            phone: typeof r.profilePhone === "string" ? r.profilePhone : "",
            profileless: !hasProfile,
          };
        })
        // Stable sort: by name (alphabetical) so re-renders don't
        // shuffle rows under the producer's cursor mid-edit.
        .sort((a, b) => a.name.localeCompare(b.name));

      res.json({
        ok: true,
        brief: {
          id: brief.id,
          projectName: brief.projectName,
          venue: brief.venue,
        },
        crew,
      });
    } catch (err) {
      logger.error(
        { err: err instanceof Error ? err.message : String(err), briefId: id },
        "portal briefs/:id/hotel GET failed",
      );
      res
        .status(500)
        .json({ ok: false, error: "Could not load hotel data." });
    }
  },
);

/** PATCH /api/portal/briefs/:id/hotel/:gigId — owner-only.
 *  Producer-side update of the hotel flags on a single gig under
 *  their own brief. Body fields (all optional, partial update):
 *  - hotelRequired: boolean    — flips the per-crew "needs a hotel".
 *  - checkInDate:   string|null — explicit ISO override (null reverts
 *                                 to the auto-derived value).
 *  - checkOutDate:  string|null — same, for check-out.
 *
 *  We re-verify ownership AND that the gig genuinely belongs to this
 *  brief (`brief_id = :id`) — not just the gig id — so a producer
 *  can't update a gig from somebody else's brief by guessing its id
 *  (closes IDOR vector). The freelancer's own
 *  `PATCH /portal/gigs/:id` route deliberately does NOT accept these
 *  fields because hotel logistics are producer-controlled. */
router.patch(
  "/portal/briefs/:id/hotel/:gigId",
  requireSignedIn,
  async (req, res) => {
    const userId = (req as unknown as { _userId: string })._userId;
    const briefId = String(req.params.id ?? "");
    const gigId = String(req.params.gigId ?? "");
    const body = (req.body ?? {}) as Record<string, unknown>;

    // ISO date validator — strict shape AND calendar-real check.
    // The regex catches "2025-02-31"-style format-valid-but-impossible
    // dates by round-tripping through Date (which silently rolls them
    // forward into the next month). Without the round-trip we'd push
    // a bad value to Postgres and bubble back as a 500.
    const ISO_RE = /^\d{4}-\d{2}-\d{2}$/;
    function parseDateField(raw: unknown):
      | { ok: true; value: string | null }
      | { ok: false } {
      if (raw === null) return { ok: true, value: null };
      if (typeof raw !== "string") return { ok: false };
      const trimmed = raw.trim();
      if (trimmed === "") return { ok: true, value: null };
      if (!ISO_RE.test(trimmed)) return { ok: false };
      // Calendar-real check: parse as UTC, then re-format and compare.
      // Date silently overflows invalid combos (Feb 31 → Mar 3) so
      // a mismatch means the input wasn't a real calendar date.
      const d = new Date(`${trimmed}T00:00:00Z`);
      if (Number.isNaN(d.getTime())) return { ok: false };
      if (d.toISOString().slice(0, 10) !== trimmed) return { ok: false };
      return { ok: true, value: trimmed };
    }

    const patch: Record<string, unknown> = { updatedAt: sql`now()` };
    if (body.hotelRequired !== undefined) {
      // Strict boolean — string "false" or numeric 0 in JSON should
      // be rejected, not silently coerced. Producers PATCH this from
      // the UI as a real boolean; anything else is a client bug.
      if (typeof body.hotelRequired !== "boolean") {
        res
          .status(400)
          .json({ ok: false, error: "hotelRequired must be a boolean." });
        return;
      }
      patch.hotelRequired = body.hotelRequired;
    }
    if (body.checkInDate !== undefined) {
      const parsed = parseDateField(body.checkInDate);
      if (!parsed.ok) {
        res
          .status(400)
          .json({ ok: false, error: "Invalid checkInDate." });
        return;
      }
      patch.checkInDate = parsed.value;
    }
    if (body.checkOutDate !== undefined) {
      const parsed = parseDateField(body.checkOutDate);
      if (!parsed.ok) {
        res
          .status(400)
          .json({ ok: false, error: "Invalid checkOutDate." });
        return;
      }
      patch.checkOutDate = parsed.value;
    }
    // Cross-field check: when BOTH dates are supplied in the same
    // request, reject impossible ranges (check-out before check-in).
    // We don't fetch existing values for the single-field case —
    // producers may legitimately edit one date at a time and fix the
    // pair on the next save.
    if (
      typeof patch.checkInDate === "string" &&
      typeof patch.checkOutDate === "string" &&
      (patch.checkOutDate as string) <= (patch.checkInDate as string)
    ) {
      res.status(400).json({
        ok: false,
        error: "checkOutDate must be after checkInDate.",
      });
      return;
    }
    // No accepted fields → noop (don't bump updatedAt for an empty
    // request — saves a write and avoids polluting the audit trail).
    if (Object.keys(patch).length === 1) {
      res.status(400).json({ ok: false, error: "No updatable fields." });
      return;
    }

    try {
      // Owner check + brief membership in one query — do this BEFORE
      // touching the gig so unauthorised callers get a clean 403/404
      // and never trigger a DB write.
      const briefRows = await db
        .select({ ownerUserId: projectBriefsTable.ownerUserId })
        .from(projectBriefsTable)
        .where(eq(projectBriefsTable.id, briefId))
        .limit(1);
      const brief = briefRows[0];
      if (!brief) {
        res.status(404).json({ ok: false, error: "Brief not found." });
        return;
      }
      if (brief.ownerUserId !== userId) {
        res.status(403).json({ ok: false, error: "Not your brief." });
        return;
      }
      const updated = await db
        .update(gigsTable)
        .set(patch)
        .where(and(eq(gigsTable.id, gigId), eq(gigsTable.briefId, briefId)))
        .returning({
          id: gigsTable.id,
          hotelRequired: gigsTable.hotelRequired,
          checkInDate: gigsTable.checkInDate,
          checkOutDate: gigsTable.checkOutDate,
        });
      if (updated.length === 0) {
        res
          .status(404)
          .json({ ok: false, error: "Gig not found on this brief." });
        return;
      }
      res.json({ ok: true, gig: updated[0] });
    } catch (err) {
      logger.error(
        {
          err: err instanceof Error ? err.message : String(err),
          briefId,
          gigId,
        },
        "portal briefs/:id/hotel/:gigId PATCH failed",
      );
      res
        .status(500)
        .json({ ok: false, error: "Could not update hotel data." });
    }
  },
);

// Silence unused-warning on the row type re-exported only for callers.
export type { ProjectBriefRow };

export default router;
