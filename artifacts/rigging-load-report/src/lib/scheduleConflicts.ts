import type { BriefSchedulePhaseKey, ProjectBrief } from "./projectBrief";
import type { Gig, PortalData } from "../portal/lib/portalStorage";

const PHASE_LABELS: Record<BriefSchedulePhaseKey, string> = {
  setup: "Setup",
  rehearsal: "Rehearsal",
  show: "Show",
  downrig: "Load Out",
};

const PHASE_KEYS: BriefSchedulePhaseKey[] = [
  "setup",
  "rehearsal",
  "show",
  "downrig",
];

export type ConflictKind = "gig" | "busy";

export type ScheduleConflict = {
  kind: ConflictKind;
  /** ISO date the conflict occurs on (YYYY-MM-DD). */
  date: string;
  /** Human-readable description ("Confirmed gig: NRK MGP", "Marked
   *  busy on availability calendar"). */
  detail: string;
  /** The phase of the *new* brief that overlaps. */
  phaseLabel: string;
};

/** Iterate every ISO date inclusively between `from` and `to`. */
function* eachDay(from: string, to: string): Generator<string> {
  const m1 = /^(\d{4})-(\d{2})-(\d{2})$/.exec(from);
  const m2 = /^(\d{4})-(\d{2})-(\d{2})$/.exec(to);
  if (!m1 || !m2) {
    if (from) yield from;
    return;
  }
  const start = new Date(
    Date.UTC(Number(m1[1]), Number(m1[2]) - 1, Number(m1[3])),
  );
  const end = new Date(
    Date.UTC(Number(m2[1]), Number(m2[2]) - 1, Number(m2[3])),
  );
  if (end.getTime() < start.getTime()) {
    yield from;
    return;
  }
  for (let d = new Date(start); d.getTime() <= end.getTime(); d.setUTCDate(d.getUTCDate() + 1)) {
    const iso = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
    yield iso;
  }
}

function gigCovers(gig: Gig, day: string): boolean {
  const start = gig.startDate;
  const end = gig.endDate || gig.startDate;
  if (!start) return false;
  return day >= start && day <= end;
}

/** Look for date overlaps between the dates a brief touches and the
 *  freelancer's existing data:
 *
 *  - any non-declined Gig (excluding `excludeGigId`) whose date range
 *    intersects this brief's dates;
 *  - any availability day marked "busy".
 *
 *  Returns one entry per (date, source) pair so the warning UI can
 *  list the actual conflicts rather than a single fuzzy "you have a
 *  conflict" string. */
export function findScheduleConflicts(
  brief: ProjectBrief,
  data: PortalData,
  excludeGigId?: string,
): ScheduleConflict[] {
  const out: ScheduleConflict[] = [];
  const seen = new Set<string>();
  // Build a flat list of (date, phaseLabel) tuples that the brief covers.
  const briefDays: Array<{ date: string; phaseLabel: string }> = [];
  const schedule = brief.project.schedule;
  if (schedule) {
    for (const phase of PHASE_KEYS) {
      const segs = schedule[phase];
      if (!segs) continue;
      for (const seg of segs) {
        if (!seg.from && !seg.to) continue;
        for (const day of eachDay(seg.from || seg.to, seg.to || seg.from)) {
          briefDays.push({ date: day, phaseLabel: PHASE_LABELS[phase] });
        }
      }
    }
  }
  // Always include the show date range as a fallback even when the
  // schedule field is absent — that's the minimum information every
  // brief carries.
  if (briefDays.length === 0 && brief.project.date) {
    for (const day of eachDay(
      brief.project.date,
      brief.project.endDate || brief.project.date,
    )) {
      briefDays.push({ date: day, phaseLabel: "Show" });
    }
  }
  const otherGigs = data.gigs.filter(
    (g) =>
      g.id !== excludeGigId &&
      g.status !== "invited" &&
      g.status !== "paid" &&
      g.briefId !== brief.briefId,
  );
  for (const { date, phaseLabel } of briefDays) {
    // Busy day on availability calendar
    if (data.availability[date] === "busy") {
      const key = `busy:${date}`;
      if (!seen.has(key)) {
        seen.add(key);
        out.push({
          kind: "busy",
          date,
          phaseLabel,
          detail: "Marked busy on your availability calendar",
        });
      }
    }
    // Overlapping gig
    for (const gig of otherGigs) {
      if (!gigCovers(gig, date)) continue;
      const key = `gig:${gig.id}:${date}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({
        kind: "gig",
        date,
        phaseLabel,
        detail: `Overlaps with ${gig.projectName}${gig.role ? ` (${gig.role})` : ""}`,
      });
    }
  }
  return out;
}
