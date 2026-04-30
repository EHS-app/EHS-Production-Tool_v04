/** Crew Report — data model, defaults and totals.
 *
 *  A "crew member" is a single person on the call sheet. The Crew tab is
 *  intentionally simple: a flat list with name, department/role, call &
 *  off times, day rate (NOK) and free-form notes. Totals are derived
 *  (count, person-hours, cost) and shown on the tab dashboard.
 *
 *  All money values are in NOK (Norwegian kroner). The Production Tool is
 *  Norway-based; the Freelance Portal continues to display freelancer
 *  earnings in NOK as well, so the two stay consistent. */

export const CREW_ROLES = [
  "Rigging",
  "Lighting",
  "Lighting FOH",
  "Video / LED",
  "AV FOH",
  "Sound",
  "System Tech",
  "Stage",
  "Stage Hand",
  "Driver",
  "Project Manager",
  "Other",
] as const;

export type CrewRole = (typeof CREW_ROLES)[number];

/** State of the request/accept loop for a crew member that originated
 *  from "Send requests" on the Available Crew sidebar. Manually-added
 *  in-house rows leave this `undefined` and never show a pill. */
export const CREW_REQUEST_STATUSES = [
  "requested",
  "accepted",
  "declined",
  "no-reply",
] as const;
export type CrewRequestStatus = (typeof CREW_REQUEST_STATUSES)[number];

/** Presentation metadata for the Crew tab status pill. Co-located with
 *  the type so producers can't drift between "what statuses exist" and
 *  "how do we render them". */
export const CREW_REQUEST_STATUS_META: Record<
  CrewRequestStatus,
  { label: string; tone: "warn" | "ok" | "muted" | "bad" }
> = {
  requested: { label: "Requested", tone: "warn" },
  accepted: { label: "Accepted", tone: "ok" },
  declined: { label: "Declined", tone: "muted" },
  "no-reply": { label: "No reply", tone: "bad" },
};

export type CrewMember = {
  id: string;
  /** Crew member's full name (free text). */
  name: string;
  /** Department. Drives the per-department breakdown on the dashboard. */
  role: CrewRole;
  /** Call time as "HH:MM" 24-h, or empty string when not yet scheduled. */
  callTime: string;
  /** Off time as "HH:MM" 24-h. If earlier than callTime, the shift is
   *  treated as crossing midnight (call 22:00 → off 02:00 = 4 h). */
  offTime: string;
  /** Day rate in NOK (Norwegian kroner). 0 for unpaid / in-house crew. */
  dayRate: number;
  /** Free-form notes (e.g. "Has IPAF licence", "Half-day"). */
  notes: string;
  /** Clerk user id of the freelancer this row was created for. Set when
   *  the row was added via "Send requests" on the Available Crew
   *  sidebar; manual in-house rows leave it undefined. */
  freelancerUserId?: string;
  /** Pill state on the Crew Report. Undefined for manual rows so the
   *  status column simply reads "—" for in-house people. */
  requestStatus?: CrewRequestStatus;
  /** Server id of the brief_assignments row backing this crew member.
   *  Used by the producer's poll loop to correlate accept/decline
   *  responses with the right local row. */
  briefAssignmentId?: string;
};

function newId(prefix: string): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
}

/** Build a fresh crew member with sensible defaults. */
export function makeCrewMember(name = ""): CrewMember {
  return {
    id: newId("crew"),
    name,
    role: "Rigging",
    callTime: "08:00",
    offTime: "18:00",
    dayRate: 0,
    notes: "",
  };
}

/** Coerce an unknown value (from localStorage / hand-edited JSON) into a
 *  valid CrewMember. Bad fields fall back to the makeCrewMember default
 *  rather than throwing. */
export function normalizeCrewMember(raw: unknown): CrewMember {
  const base = makeCrewMember();
  if (!raw || typeof raw !== "object") return base;
  const r = raw as Record<string, unknown>;
  const role =
    typeof r.role === "string" && (CREW_ROLES as readonly string[]).includes(r.role)
      ? (r.role as CrewRole)
      : base.role;
  const dayRate =
    typeof r.dayRate === "number" && Number.isFinite(r.dayRate) && r.dayRate >= 0
      ? r.dayRate
      : base.dayRate;
  const requestStatus =
    typeof r.requestStatus === "string" &&
    (CREW_REQUEST_STATUSES as readonly string[]).includes(r.requestStatus)
      ? (r.requestStatus as CrewRequestStatus)
      : undefined;
  return {
    id: typeof r.id === "string" && r.id ? r.id : base.id,
    name: typeof r.name === "string" ? r.name : base.name,
    role,
    // Preserve a deliberately-cleared blank time across reloads. Only fall
    // back to the default time when the stored value is missing entirely
    // or unrecognised (so crewHours() keeps returning 0 after a refresh).
    callTime: normalizeTimeField(r.callTime, base.callTime),
    offTime: normalizeTimeField(r.offTime, base.offTime),
    dayRate,
    notes: typeof r.notes === "string" ? r.notes : base.notes,
    freelancerUserId:
      typeof r.freelancerUserId === "string" && r.freelancerUserId
        ? r.freelancerUserId
        : undefined,
    requestStatus,
    briefAssignmentId:
      typeof r.briefAssignmentId === "string" && r.briefAssignmentId
        ? r.briefAssignmentId
        : undefined,
  };
}

function normalizeTimeField(raw: unknown, fallback: string): string {
  if (raw === "" || isValidHHMM(raw)) return raw as string;
  return fallback;
}

function isValidHHMM(v: unknown): boolean {
  return typeof v === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(v);
}

/** Convert a "HH:MM" time string into minutes from midnight. Returns
 *  NaN for blanks/invalid strings. */
function hhmmToMin(t: string): number {
  if (!isValidHHMM(t)) return NaN;
  const [h, m] = t.split(":").map((s) => Number(s));
  return h * 60 + m;
}

/** Length of a single crew shift in hours. Off-time earlier than call-time
 *  is interpreted as crossing midnight (e.g. call 22:00 → off 02:00 → 4 h).
 *  Returns 0 when either endpoint is missing/invalid. */
export function crewHours(m: CrewMember): number {
  const a = hhmmToMin(m.callTime);
  const b = hhmmToMin(m.offTime);
  if (Number.isNaN(a) || Number.isNaN(b)) return 0;
  let diff = b - a;
  if (diff < 0) diff += 24 * 60; // wrap past midnight
  return diff / 60;
}

export type CrewTotals = {
  /** Total number of crew members on the list. */
  count: number;
  /** Sum of every crew member's shift length, in hours. */
  totalHours: number;
  /** Sum of every crew member's day rate, in NOK. */
  totalCost: number;
  /** Headcount per department. Always contains every CrewRole key. */
  countsByRole: Record<CrewRole, number>;
  /** Cost per department, in NOK. Always contains every CrewRole key. */
  costsByRole: Record<CrewRole, number>;
};

/** Build the empty totals object with every role pre-seeded to 0. */
function emptyTotals(): CrewTotals {
  const countsByRole = {} as Record<CrewRole, number>;
  const costsByRole = {} as Record<CrewRole, number>;
  for (const r of CREW_ROLES) {
    countsByRole[r] = 0;
    costsByRole[r] = 0;
  }
  return { count: 0, totalHours: 0, totalCost: 0, countsByRole, costsByRole };
}

/** Shared NOK day-rate formatter used everywhere a crew member's rate
 *  is shown to the user (Crew Report dashboard + table, brief share
 *  modal sublabels, portal "My assignment" pill, portal brief detail).
 *  Uses the Norwegian Bokmål locale so the output reads as "kr 5 000". */
export function formatCrewDayRate(n: number): string {
  if (!Number.isFinite(n)) return "kr 0";
  return Math.round(n).toLocaleString("nb-NO", {
    style: "currency",
    currency: "NOK",
    maximumFractionDigits: 0,
  });
}

export function computeCrewTotals(crew: CrewMember[]): CrewTotals {
  const t = emptyTotals();
  for (const m of crew) {
    t.count += 1;
    t.totalHours += crewHours(m);
    t.totalCost += m.dayRate;
    t.countsByRole[m.role] += 1;
    t.costsByRole[m.role] += m.dayRate;
  }
  return t;
}
