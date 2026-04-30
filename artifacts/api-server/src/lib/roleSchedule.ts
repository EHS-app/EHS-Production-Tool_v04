/** Auto-Assign Schedules → Gigs (Phase B / Feature 2)
 *
 *  The brief carries a `project.schedule` shaped as
 *  `Partial<Record<"setup"|"rehearsal"|"show"|"downrig", Segment[]>>`,
 *  where each segment has `from`/`to` ISO dates (and optional times we
 *  ignore here). Each booked freelancer also has a `role` string from
 *  the call-sheet department list.
 *
 *  This module owns two pure helpers:
 *
 *    1. `ROLE_TO_PHASES` — the default mapping from a department to the
 *       schedule phases that role typically works.
 *    2. `expandPhasesToDates(schedule, phaseKeys)` — flattens the
 *       relevant phase segments into a sorted, deduplicated list of
 *       calendar days (YYYY-MM-DD).
 *
 *  Producer override is still a single click downstream — once a gig
 *  has `assignedDates` the producer can rewrite the array via
 *  `PATCH /api/portal/gigs/:id { assignedDates: [...] }`. */

/** The four production-schedule phases a brief can carry. Mirrors
 *  `BriefSchedulePhaseKey` in
 *  `artifacts/rigging-load-report/src/lib/projectBrief.ts` — kept as a
 *  literal here because the server cannot import from the artifact. */
export type SchedulePhaseKey = "setup" | "rehearsal" | "show" | "downrig";

const ALL_PHASES: ReadonlyArray<SchedulePhaseKey> = [
  "setup",
  "rehearsal",
  "show",
  "downrig",
];

/** Default phases per call-sheet role (`CrewRole` in
 *  `artifacts/rigging-load-report/src/lib/crew.ts`). Anything not
 *  listed falls back to `ALL_PHASES` so a renamed role or a future
 *  department doesn't accidentally book zero days.
 *
 *  Rationale per role:
 *    - Rigging / Driver:  build & strike days only — not on the show
 *      itself, the rig is already standing.
 *    - Stage / Stage Hand: setup + show + downrig — no rehearsal day.
 *    - Lighting, Lighting FOH, Video / LED, AV FOH, Sound, System Tech:
 *      all phases — every day matters.
 *    - Project Manager / Other: all phases (safest default).
 *
 *  The producer always gets the final word via the override path. */
export const ROLE_TO_PHASES: Record<string, ReadonlyArray<SchedulePhaseKey>> = {
  Rigging: ["setup", "downrig"],
  Driver: ["setup", "downrig"],
  Stage: ["setup", "show", "downrig"],
  "Stage Hand": ["setup", "show", "downrig"],
  Lighting: ALL_PHASES,
  "Lighting FOH": ALL_PHASES,
  "Video / LED": ALL_PHASES,
  "AV FOH": ALL_PHASES,
  Sound: ALL_PHASES,
  "System Tech": ALL_PHASES,
  "Project Manager": ALL_PHASES,
  Other: ALL_PHASES,
};

/** Resolve the default phase list for a role. Falls back to all four
 *  phases for roles we don't recognise — see `ROLE_TO_PHASES` rationale. */
export function defaultPhasesForRole(
  role: string,
): ReadonlyArray<SchedulePhaseKey> {
  return ROLE_TO_PHASES[role] ?? ALL_PHASES;
}

/** Add one day to a YYYY-MM-DD string. Uses UTC arithmetic so the
 *  result is timezone-stable — the brief's dates are calendar days,
 *  not instants. */
function addDay(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Validate a single YYYY-MM-DD string — both shape and that the date
 *  is real (so `2025-02-30` is rejected). */
function isValidIsoDate(s: unknown): s is string {
  if (typeof s !== "string" || !ISO_DATE.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return false;
  // Round-trip check defeats month/day overflow (`2025-02-30` parses
  // to March 2 — the round-tripped slice would not equal the input).
  return d.toISOString().slice(0, 10) === s;
}

/** Flatten the relevant phase segments into a sorted, de-duplicated
 *  list of calendar days. Defensive against malformed segments — a
 *  segment with a missing or unparseable `from`/`to` is silently
 *  skipped, the rest still expand. A segment whose `to` is before its
 *  `from` is treated as a single-day segment on `from`. The expansion
 *  is also capped at 366 days per segment to keep an attacker-supplied
 *  brief from materialising a million-row gig. */
export function expandPhasesToDates(
  schedule: unknown,
  phaseKeys: ReadonlyArray<SchedulePhaseKey>,
): string[] {
  if (!schedule || typeof schedule !== "object") return [];
  const sched = schedule as Record<string, unknown>;
  const seen = new Set<string>();
  for (const key of phaseKeys) {
    const segments = sched[key];
    if (!Array.isArray(segments)) continue;
    for (const seg of segments) {
      if (!seg || typeof seg !== "object") continue;
      const s = seg as Record<string, unknown>;
      const from = typeof s.from === "string" ? s.from : "";
      const to = typeof s.to === "string" && s.to ? s.to : from;
      if (!isValidIsoDate(from)) continue;
      const fromDate = from;
      const toDate = isValidIsoDate(to) ? to : fromDate;
      // If `to < from` treat it as a single-day segment on `from`.
      const start = fromDate;
      const end = toDate < fromDate ? fromDate : toDate;
      let cursor = start;
      let guard = 0;
      while (cursor <= end && guard < 366) {
        seen.add(cursor);
        if (cursor === end) break;
        cursor = addDay(cursor);
        guard += 1;
      }
    }
  }
  return Array.from(seen).sort();
}

/** True iff `schedule` is a usable phase map — at least one of the four
 *  phase keys present and pointing to a non-empty array. Used to decide
 *  whether to fall back to startDate..endDate: an *absent* or *invalid*
 *  schedule falls back, but a *present-but-empty-for-this-role* schedule
 *  does not (an explicit producer choice trumps the default range). */
function hasUsableSchedule(schedule: unknown): boolean {
  if (!schedule || typeof schedule !== "object") return false;
  const sched = schedule as Record<string, unknown>;
  for (const key of ALL_PHASES) {
    const segs = sched[key];
    if (Array.isArray(segs) && segs.length > 0) return true;
  }
  return false;
}

/** Compute a freelancer's working days for a brief, given their role
 *  and the brief's date range / schedule. Used by `gigFieldsFromBrief`
 *  to populate `gigs.assigned_dates` at accept time.
 *
 *  Falls back gracefully:
 *    - Brief has a usable `schedule` → return the flattened days for
 *      this role's phases. May be empty (e.g. a Rigging freelancer on a
 *      brief whose schedule only has `show` segments). That's a
 *      meaningful signal — the producer set things up such that this
 *      role has no active phases — and the producer can override later
 *      via `PATCH /api/portal/gigs/:id`.
 *    - Brief has no usable schedule → return every day in the brief's
 *      `startDate..endDate` range (single-day brief collapses to one
 *      entry). This preserves backward-compatibility with briefs
 *      created before the schedule picker existed.
 *    - Brief has neither schedule nor `startDate` → empty array.
 *
 *  The schedule branch is capped at 366 entries (see
 *  `expandPhasesToDates`); the fallback branch is capped here. */
export function autoAssignedDatesFor(args: {
  role: string;
  schedule: unknown;
  startDate: string | null;
  endDate: string | null;
}): string[] {
  const phases = defaultPhasesForRole(args.role);
  if (hasUsableSchedule(args.schedule)) {
    return expandPhasesToDates(args.schedule, phases);
  }
  if (!args.startDate || !isValidIsoDate(args.startDate)) return [];
  const start = args.startDate;
  const end =
    args.endDate && isValidIsoDate(args.endDate) && args.endDate >= start
      ? args.endDate
      : start;
  const out: string[] = [];
  let cursor = start;
  let guard = 0;
  while (cursor <= end && guard < 366) {
    out.push(cursor);
    if (cursor === end) break;
    cursor = addDay(cursor);
    guard += 1;
  }
  return out;
}

/** Validate a client-supplied `assignedDates` array. Drops malformed
 *  entries, deduplicates, and sorts — same shape as the auto-computed
 *  output. Caps the array at 366 entries to defeat oversized payloads. */
export function normaliseAssignedDates(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  for (const entry of raw) {
    if (isValidIsoDate(entry)) seen.add(entry);
    if (seen.size >= 366) break;
  }
  return Array.from(seen).sort();
}
