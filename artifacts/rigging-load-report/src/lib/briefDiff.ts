import type {
  BriefAssignment,
  BriefSchedule,
  BriefSchedulePhaseKey,
  BriefScheduleSegment,
  ProjectBrief,
} from "./projectBrief";
import type { AcceptedSnapshot } from "../portal/lib/portalStorage";

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

/** A single human-readable change between an accepted snapshot and the
 *  current brief. The label is what the freelancer sees ("Show date",
 *  "Setup Day 2 start time"); `before`/`after` are formatted strings,
 *  not raw values. */
export type DiffEntry = {
  /** Stable key for React lists and analytics (e.g. "project.date",
   *  "schedule.setup[1].fromTime", "assignment.role"). */
  key: string;
  label: string;
  before: string;
  after: string;
};

function fmtDate(iso: string | undefined): string {
  if (!iso) return "—";
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  const d = m
    ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
    : new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function fmtRange(from: string | undefined, to: string | undefined): string {
  if (!from && !to) return "—";
  if (from && to && from !== to) return `${fmtDate(from)} → ${fmtDate(to)}`;
  return fmtDate(from || to);
}

function fmtTimeRange(
  fromTime: string | undefined,
  toTime: string | undefined,
): string {
  if (!fromTime && !toTime) return "—";
  if (fromTime && toTime) return `${fromTime}–${toTime}`;
  return fromTime || toTime || "—";
}

function fmtMoneyNok(n: number | undefined): string {
  if (typeof n !== "number" || !isFinite(n) || n === 0) return "—";
  return new Intl.NumberFormat("nb-NO", {
    style: "currency",
    currency: "NOK",
    maximumFractionDigits: 0,
  }).format(Math.round(n));
}

function fmtHours(n: number | undefined): string {
  if (typeof n !== "number" || !isFinite(n) || n === 0) return "—";
  return `${n} h`;
}

function pushIfChanged(
  out: DiffEntry[],
  key: string,
  label: string,
  before: string,
  after: string,
): void {
  if (before !== after) out.push({ key, label, before, after });
}

function diffSchedule(
  before: BriefSchedule | undefined,
  after: BriefSchedule | undefined,
  out: DiffEntry[],
): void {
  const b = before ?? {};
  const a = after ?? {};
  for (const key of PHASE_KEYS) {
    const beforeSegs: BriefScheduleSegment[] = b[key] ?? [];
    const afterSegs: BriefScheduleSegment[] = a[key] ?? [];
    const phaseLabel = PHASE_LABELS[key];
    const len = Math.max(beforeSegs.length, afterSegs.length);
    for (let i = 0; i < len; i++) {
      const bs = beforeSegs[i];
      const as = afterSegs[i];
      const dayLabel = len > 1 ? ` Day ${i + 1}` : "";
      if (bs && !as) {
        out.push({
          key: `schedule.${key}[${i}]`,
          label: `${phaseLabel}${dayLabel}`,
          before: `${fmtRange(bs.from, bs.to)} · ${fmtTimeRange(bs.fromTime, bs.toTime)}`,
          after: "Removed",
        });
        continue;
      }
      if (!bs && as) {
        out.push({
          key: `schedule.${key}[${i}]`,
          label: `${phaseLabel}${dayLabel}`,
          before: "—",
          after: `${fmtRange(as.from, as.to)} · ${fmtTimeRange(as.fromTime, as.toTime)}`,
        });
        continue;
      }
      if (!bs || !as) continue;
      pushIfChanged(
        out,
        `schedule.${key}[${i}].dates`,
        `${phaseLabel}${dayLabel} dates`,
        fmtRange(bs.from, bs.to),
        fmtRange(as.from, as.to),
      );
      pushIfChanged(
        out,
        `schedule.${key}[${i}].times`,
        `${phaseLabel}${dayLabel} times`,
        fmtTimeRange(bs.fromTime, bs.toTime),
        fmtTimeRange(as.fromTime, as.toTime),
      );
    }
  }
}

function diffAssignment(
  before: BriefAssignment | undefined,
  after: BriefAssignment | undefined,
  out: DiffEntry[],
): void {
  // Treat completely missing assignment as "no diff" (the freelancer
  // wasn't on the call sheet either before or after).
  if (!before && !after) return;
  // Explicit reassignment / removal semantics — much clearer for the
  // freelancer than a flurry of per-field changes when the producer
  // takes them off (or adds them onto) the call sheet.
  if (before && !after) {
    out.push({
      key: "assignment.removed",
      label: "Your assignment",
      before: before.role
        ? `${before.role}${before.name ? ` (${before.name})` : ""}`
        : "On the call sheet",
      after: "Removed from the call sheet",
    });
    return;
  }
  if (!before && after) {
    out.push({
      key: "assignment.added",
      label: "Your assignment",
      before: "Not on the call sheet",
      after: after.role
        ? `${after.role}${after.name ? ` (${after.name})` : ""}`
        : "Added to the call sheet",
    });
    return;
  }
  const b = before ?? ({} as Partial<BriefAssignment>);
  const a = after ?? ({} as Partial<BriefAssignment>);
  pushIfChanged(out, "assignment.role", "Your role", b.role ?? "—", a.role ?? "—");
  pushIfChanged(
    out,
    "assignment.callTime",
    "Your call time",
    b.callTime || "—",
    a.callTime || "—",
  );
  pushIfChanged(
    out,
    "assignment.offTime",
    "Your off time",
    b.offTime || "—",
    a.offTime || "—",
  );
  pushIfChanged(
    out,
    "assignment.hours",
    "Your hours",
    fmtHours(b.hours),
    fmtHours(a.hours),
  );
  pushIfChanged(
    out,
    "assignment.dayRate",
    "Your day rate",
    fmtMoneyNok(b.dayRate),
    fmtMoneyNok(a.dayRate),
  );
  pushIfChanged(
    out,
    "assignment.notes",
    "Notes for you",
    (b.notes ?? "").trim() || "—",
    (a.notes ?? "").trim() || "—",
  );
}

/** Compare an accepted snapshot against the current brief and return
 *  a flat list of human-readable changes. Returns an empty array when
 *  there are no changes (or when no snapshot exists yet). */
export function diffBriefAgainstSnapshot(
  snapshot: AcceptedSnapshot | undefined,
  current: ProjectBrief,
): DiffEntry[] {
  if (!snapshot) return [];
  const out: DiffEntry[] = [];
  const bp = snapshot.project;
  const ap = current.project;
  pushIfChanged(out, "project.venue", "Venue", bp.venue || "—", ap.venue || "—");
  pushIfChanged(
    out,
    "project.date",
    "Show date",
    fmtRange(bp.date, bp.endDate),
    fmtRange(ap.date, ap.endDate),
  );
  pushIfChanged(
    out,
    "project.preparedBy",
    "Project manager",
    bp.preparedBy || "—",
    ap.preparedBy || "—",
  );
  diffSchedule(bp.schedule, ap.schedule, out);
  const currentMine =
    current.assignments.find((a) => a.crewId === current.recipientCrewId) ??
    undefined;
  diffAssignment(snapshot.myAssignment, currentMine, out);
  return out;
}
