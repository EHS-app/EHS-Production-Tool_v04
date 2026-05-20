import { Router, type IRouter, type RequestHandler } from "express";
import { randomUUID } from "node:crypto";
import { and, asc, eq, inArray, or, sql } from "drizzle-orm";
import {
  db,
  gigsTable,
  projectBriefsTable,
  timeEntriesTable,
  TIME_ENTRY_STATUSES,
  type TimeEntryRow,
} from "@workspace/db";
import { logger } from "../lib/logger";

const router: IRouter = Router();

const requireSignedIn: RequestHandler = (req, res, next) => {
  const auth =
    typeof (req as unknown as { auth?: unknown }).auth === "function"
      ? (req as unknown as { auth: () => { userId?: string | null } }).auth()
      : ((req as unknown as { auth?: { userId?: string | null } }).auth ?? {});
  if (!auth || !auth.userId) {
    res.status(401).json({ ok: false, error: "Sign in required." });
    return;
  }
  (req as unknown as { _userId: string })._userId = auth.userId;
  next();
};

const MAX_NOTES = 4000;
const MAX_REASON = 1000;
const STATUS_SET = new Set<string>(TIME_ENTRY_STATUSES);
const SUBMITTABLE = new Set(["draft", "rejected"]);

function clampStr(raw: unknown, cap = 280): string {
  if (typeof raw !== "string") return "";
  return raw.trim().slice(0, cap);
}

function pickDate(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const m = raw.match(/^(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : null;
}

function pickMinute(raw: unknown): number | null {
  const n = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(n)) return null;
  const i = Math.round(n);
  if (i < 0 || i > 1439) return null;
  return i;
}

function pickBreak(raw: unknown): number {
  const n = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.min(Math.round(n), 24 * 60);
}

/** Compute net worked minutes for an entry (handles overnight). */
function workedMinutes(row: Pick<TimeEntryRow, "startMinute" | "endMinute" | "breakMinutes">): number {
  if (row.startMinute == null || row.endMinute == null) return 0;
  let span = row.endMinute - row.startMinute;
  if (span < 0) span += 24 * 60;
  const net = span - (row.breakMinutes ?? 0);
  return net > 0 ? net : 0;
}

function serialize(row: TimeEntryRow) {
  return {
    id: row.id,
    gigId: row.gigId,
    briefId: row.briefId,
    freelancerUserId: row.freelancerUserId,
    workDate: row.workDate,
    startMinute: row.startMinute,
    endMinute: row.endMinute,
    breakMinutes: row.breakMinutes,
    workedMinutes: workedMinutes(row),
    notes: row.notes,
    status: row.status,
    decidedByUserId: row.decidedByUserId,
    decidedAt: row.decidedAt,
    rejectionReason: row.rejectionReason,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

/** Verify the signed-in user owns this gig (freelancer-side). */
async function loadOwnGig(gigId: string, userId: string) {
  const rows = await db
    .select()
    .from(gigsTable)
    .where(and(eq(gigsTable.id, gigId), eq(gigsTable.freelancerUserId, userId)))
    .limit(1);
  return rows[0] ?? null;
}

/** Verify the signed-in user owns the brief tied to this gig (producer-side). */
async function loadGigForProducer(gigId: string, userId: string) {
  const rows = await db
    .select({
      gig: gigsTable,
      brief: projectBriefsTable,
    })
    .from(gigsTable)
    .leftJoin(projectBriefsTable, eq(gigsTable.briefId, projectBriefsTable.id))
    .where(eq(gigsTable.id, gigId))
    .limit(1);
  const row = rows[0];
  if (!row || !row.brief || row.brief.ownerUserId !== userId) return null;
  return row;
}

/** GET /api/portal/gigs/:gigId/time-entries
 *  Returns all time entries the signed-in user can see for a gig.
 *  - Freelancer who owns the gig sees their own entries.
 *  - Producer who owns the gig's brief also sees them. */
router.get(
  "/portal/gigs/:gigId/time-entries",
  requireSignedIn,
  async (req, res) => {
    const userId = (req as unknown as { _userId: string })._userId;
    const gigId = String(req.params.gigId ?? "");
    if (!gigId) {
      res.status(400).json({ ok: false, error: "gigId required" });
      return;
    }

    // Either side (freelancer or producing-owner of the brief) can read.
    const gigRows = await db
      .select()
      .from(gigsTable)
      .leftJoin(projectBriefsTable, eq(gigsTable.briefId, projectBriefsTable.id))
      .where(eq(gigsTable.id, gigId))
      .limit(1);
    const row = gigRows[0];
    if (!row) {
      res.status(404).json({ ok: false, error: "Gig not found" });
      return;
    }
    const isFreelancer = row.gigs.freelancerUserId === userId;
    const isProducer = row.project_briefs?.ownerUserId === userId;
    if (!isFreelancer && !isProducer) {
      res.status(403).json({ ok: false, error: "Forbidden" });
      return;
    }

    const entries = await db
      .select()
      .from(timeEntriesTable)
      .where(eq(timeEntriesTable.gigId, gigId))
      .orderBy(asc(timeEntriesTable.workDate));

    res.json({ ok: true, entries: entries.map(serialize) });
  },
);

/** PUT /api/portal/gigs/:gigId/time-entries/:workDate
 *  Freelancer creates or updates the entry for a single day. Upserts on
 *  (gigId, workDate). Status auto-resets to "draft" on any edit unless
 *  the entry is `locked`. */
router.put(
  "/portal/gigs/:gigId/time-entries/:workDate",
  requireSignedIn,
  async (req, res) => {
    const userId = (req as unknown as { _userId: string })._userId;
    const gigId = String(req.params.gigId ?? "");
    const workDate = pickDate(req.params.workDate);
    if (!gigId || !workDate) {
      res.status(400).json({ ok: false, error: "gigId and workDate required" });
      return;
    }

    const gig = await loadOwnGig(gigId, userId);
    if (!gig) {
      res.status(403).json({ ok: false, error: "Forbidden" });
      return;
    }

    const body = (req.body ?? {}) as Record<string, unknown>;
    const startMinute = pickMinute(body.startMinute);
    const endMinute = pickMinute(body.endMinute);
    const breakMinutes = pickBreak(body.breakMinutes);
    const notes = clampStr(body.notes, MAX_NOTES);

    const existing = await db
      .select()
      .from(timeEntriesTable)
      .where(
        and(
          eq(timeEntriesTable.gigId, gigId),
          eq(timeEntriesTable.workDate, workDate),
        ),
      )
      .limit(1);
    const prior = existing[0];

    if (prior?.status === "locked") {
      res.status(409).json({
        ok: false,
        error: "This entry has been locked for payroll and cannot be edited.",
      });
      return;
    }

    if (!prior) {
      const id = randomUUID();
      const inserted = await db
        .insert(timeEntriesTable)
        .values({
          id,
          gigId,
          briefId: gig.briefId,
          freelancerUserId: userId,
          workDate,
          startMinute,
          endMinute,
          breakMinutes,
          notes,
          status: "draft",
        })
        .returning();
      res.json({ ok: true, entry: serialize(inserted[0]) });
      return;
    }

    // Atomic precondition: only draft/rejected rows are editable by the
    // freelancer. The status filter is in the WHERE clause itself so a
    // concurrent producer "approve" or "lock" can't be silently rolled
    // back to draft by a stale PUT racing in behind it.
    const updated = await db
      .update(timeEntriesTable)
      .set({
        startMinute,
        endMinute,
        breakMinutes,
        notes,
        status: "draft",
        decidedByUserId: null,
        decidedAt: null,
        rejectionReason: "",
        updatedAt: sql`now()`,
      })
      .where(
        and(
          eq(timeEntriesTable.id, prior.id),
          inArray(timeEntriesTable.status, ["draft", "rejected"]),
        ),
      )
      .returning();
    if (updated.length === 0) {
      res.status(409).json({
        ok: false,
        error:
          "This entry is no longer editable. Reload to see the latest status.",
      });
      return;
    }
    res.json({ ok: true, entry: serialize(updated[0]) });
  },
);

/** POST /api/portal/gigs/:gigId/time-entries/:workDate/submit
 *  Freelancer pushes a draft (or rejected) entry up for approval. */
router.post(
  "/portal/gigs/:gigId/time-entries/:workDate/submit",
  requireSignedIn,
  async (req, res) => {
    const userId = (req as unknown as { _userId: string })._userId;
    const gigId = String(req.params.gigId ?? "");
    const workDate = pickDate(req.params.workDate);
    if (!gigId || !workDate) {
      res.status(400).json({ ok: false, error: "gigId and workDate required" });
      return;
    }
    const gig = await loadOwnGig(gigId, userId);
    if (!gig) {
      res.status(403).json({ ok: false, error: "Forbidden" });
      return;
    }
    const existing = await db
      .select()
      .from(timeEntriesTable)
      .where(
        and(
          eq(timeEntriesTable.gigId, gigId),
          eq(timeEntriesTable.workDate, workDate),
        ),
      )
      .limit(1);
    const prior = existing[0];
    if (!prior) {
      res.status(404).json({ ok: false, error: "Entry not found" });
      return;
    }
    if (!SUBMITTABLE.has(prior.status)) {
      res.status(409).json({
        ok: false,
        error: `Cannot submit an entry that is "${prior.status}".`,
      });
      return;
    }
    if (prior.startMinute == null || prior.endMinute == null) {
      res.status(400).json({
        ok: false,
        error: "Start and end times are required before submitting.",
      });
      return;
    }
    // Atomic transition: only flip to submitted if the row is still in
    // a submittable status. Closes the read-then-write window above.
    const updated = await db
      .update(timeEntriesTable)
      .set({
        status: "submitted",
        rejectionReason: "",
        decidedByUserId: null,
        decidedAt: null,
        updatedAt: sql`now()`,
      })
      .where(
        and(
          eq(timeEntriesTable.id, prior.id),
          inArray(timeEntriesTable.status, ["draft", "rejected"]),
        ),
      )
      .returning();
    if (updated.length === 0) {
      res.status(409).json({
        ok: false,
        error:
          "Entry status changed before submit completed. Reload and try again.",
      });
      return;
    }
    res.json({ ok: true, entry: serialize(updated[0]) });
  },
);

/** GET /api/portal/briefs/:briefId/time-entries
 *  Producer view: every entry across every gig tied to this brief.
 *  Used by the Crew & Logistics → Hours sub-tab in the Production Tool. */
router.get(
  "/portal/briefs/:briefId/time-entries",
  requireSignedIn,
  async (req, res) => {
    const userId = (req as unknown as { _userId: string })._userId;
    const briefId = String(req.params.briefId ?? "");
    if (!briefId) {
      res.status(400).json({ ok: false, error: "briefId required" });
      return;
    }
    const briefs = await db
      .select()
      .from(projectBriefsTable)
      .where(eq(projectBriefsTable.id, briefId))
      .limit(1);
    if (!briefs[0] || briefs[0].ownerUserId !== userId) {
      res.status(403).json({ ok: false, error: "Forbidden" });
      return;
    }
    const entries = await db
      .select()
      .from(timeEntriesTable)
      .where(eq(timeEntriesTable.briefId, briefId))
      .orderBy(
        asc(timeEntriesTable.workDate),
        asc(timeEntriesTable.freelancerUserId),
      );
    res.json({ ok: true, entries: entries.map(serialize) });
  },
);

/** POST /api/portal/time-entries/:id/decide
 *  Producer approves or rejects a submitted entry. Body:
 *    { decision: "approve" } or { decision: "reject", reason: string } */
router.post(
  "/portal/time-entries/:id/decide",
  requireSignedIn,
  async (req, res) => {
    const userId = (req as unknown as { _userId: string })._userId;
    const id = String(req.params.id ?? "");
    if (!id) {
      res.status(400).json({ ok: false, error: "id required" });
      return;
    }
    const rows = await db
      .select()
      .from(timeEntriesTable)
      .where(eq(timeEntriesTable.id, id))
      .limit(1);
    const entry = rows[0];
    if (!entry) {
      res.status(404).json({ ok: false, error: "Entry not found" });
      return;
    }
    // Authority check: signed-in user must own the brief this gig is on.
    const gig = await loadGigForProducer(entry.gigId, userId);
    if (!gig) {
      res.status(403).json({ ok: false, error: "Forbidden" });
      return;
    }
    if (entry.status !== "submitted") {
      res.status(409).json({
        ok: false,
        error: `Only submitted entries can be decided (this one is "${entry.status}").`,
      });
      return;
    }
    const body = (req.body ?? {}) as Record<string, unknown>;
    const decision = clampStr(body.decision);
    if (decision !== "approve" && decision !== "reject") {
      res.status(400).json({
        ok: false,
        error: 'decision must be "approve" or "reject".',
      });
      return;
    }
    // Atomic transition: only decide if still submitted. Without the
    // status filter a freelancer PUT that fired between our read and
    // write could flip the row back to draft and we'd silently approve
    // a draft.
    const updated = await db
      .update(timeEntriesTable)
      .set({
        status: decision === "approve" ? "approved" : "rejected",
        decidedByUserId: userId,
        decidedAt: sql`now()`,
        rejectionReason:
          decision === "reject" ? clampStr(body.reason, MAX_REASON) : "",
        updatedAt: sql`now()`,
      })
      .where(
        and(
          eq(timeEntriesTable.id, id),
          eq(timeEntriesTable.status, "submitted"),
        ),
      )
      .returning();
    if (updated.length === 0) {
      res.status(409).json({
        ok: false,
        error: "Entry was modified before the decision landed. Reload.",
      });
      return;
    }
    res.json({ ok: true, entry: serialize(updated[0]) });
  },
);

/** POST /api/portal/time-entries/:id/lock
 *  Producer locks an approved entry (payroll exported). Immutable after.
 *  Locking a non-approved entry is rejected. */
router.post(
  "/portal/time-entries/:id/lock",
  requireSignedIn,
  async (req, res) => {
    const userId = (req as unknown as { _userId: string })._userId;
    const id = String(req.params.id ?? "");
    if (!id) {
      res.status(400).json({ ok: false, error: "id required" });
      return;
    }
    const rows = await db
      .select()
      .from(timeEntriesTable)
      .where(eq(timeEntriesTable.id, id))
      .limit(1);
    const entry = rows[0];
    if (!entry) {
      res.status(404).json({ ok: false, error: "Entry not found" });
      return;
    }
    const gig = await loadGigForProducer(entry.gigId, userId);
    if (!gig) {
      res.status(403).json({ ok: false, error: "Forbidden" });
      return;
    }
    if (entry.status !== "approved") {
      res.status(409).json({
        ok: false,
        error: "Only approved entries can be locked.",
      });
      return;
    }
    // Atomic transition: only lock if still approved.
    const updated = await db
      .update(timeEntriesTable)
      .set({ status: "locked", updatedAt: sql`now()` })
      .where(
        and(
          eq(timeEntriesTable.id, id),
          eq(timeEntriesTable.status, "approved"),
        ),
      )
      .returning();
    if (updated.length === 0) {
      res.status(409).json({
        ok: false,
        error: "Entry must be approved before locking. Reload to refresh.",
      });
      return;
    }
    res.json({ ok: true, entry: serialize(updated[0]) });
  },
);

logger.info({ scope: "portalTimeEntries" }, "time-entries router mounted");

export default router;
