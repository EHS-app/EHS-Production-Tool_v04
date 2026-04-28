import { normalizeBrief, type ProjectBrief } from "../../lib/projectBrief";

export type GigStatus =
  | "invited"
  | "confirmed"
  | "done"
  | "invoiced"
  | "paid";

export type Gig = {
  id: string;
  projectName: string;
  client: string;
  venue: string;
  role: string;
  startDate: string;
  endDate: string;
  hours: number;
  rate: number;
  flatFee: number;
  notes: string;
  status: GigStatus;
  createdAt: number;
  /** When this Gig was created from a shared Project Brief, the brief's
   *  id is recorded here so the logbook entry links back to the briefing. */
  briefId?: string;
};

/** A Project Brief that was shared by a producer and imported into the
 *  freelancer's portal. The original brief is kept verbatim (so the
 *  freelancer can re-read every detail) and the freelancer's response
 *  is layered on top. */
export type BriefDecision = "pending" | "accepted" | "declined";

export type SharedBrief = {
  briefId: string;
  receivedAt: number;
  decision: BriefDecision;
  /** Set when `decision === "accepted"` — the id of the Gig that was
   *  created from this brief, so the UI can link to the logbook entry
   *  and the user can spot duplicates without re-importing. */
  acceptedGigId?: string;
  brief: ProjectBrief;
};

export type Profile = {
  fullName: string;
  phone: string;
  primaryRole: string;
  insurance: string;
  languages: string[];
  dietary: string;
  skills: string[];
  bankAccount: string;
  orgNumber: string;
};

export type AvailabilityState = "available" | "busy";

export type PortalData = {
  profile: Profile;
  availability: Record<string, AvailabilityState>;
  gigs: Gig[];
  briefs: SharedBrief[];
};

export const EMPTY_PROFILE: Profile = {
  fullName: "",
  phone: "",
  primaryRole: "",
  insurance: "",
  languages: [],
  dietary: "",
  skills: [],
  bankAccount: "",
  orgNumber: "",
};

export const EMPTY_PORTAL_DATA: PortalData = {
  profile: EMPTY_PROFILE,
  availability: {},
  gigs: [],
  briefs: [],
};

const STORAGE_PREFIX = "ehs-portal:";

function keyFor(userId: string | null | undefined): string | null {
  if (!userId) return null;
  return `${STORAGE_PREFIX}${userId}`;
}

function isProfile(value: unknown): value is Profile {
  return (
    typeof value === "object" &&
    value !== null &&
    "fullName" in value &&
    "phone" in value
  );
}

function normalizeProfile(input: unknown): Profile {
  if (!isProfile(input)) return { ...EMPTY_PROFILE };
  const p = input as Partial<Profile>;
  return {
    fullName: typeof p.fullName === "string" ? p.fullName : "",
    phone: typeof p.phone === "string" ? p.phone : "",
    primaryRole: typeof p.primaryRole === "string" ? p.primaryRole : "",
    insurance: typeof p.insurance === "string" ? p.insurance : "",
    languages: Array.isArray(p.languages)
      ? p.languages.filter((x): x is string => typeof x === "string")
      : [],
    dietary: typeof p.dietary === "string" ? p.dietary : "",
    skills: Array.isArray(p.skills)
      ? p.skills.filter((x): x is string => typeof x === "string")
      : [],
    bankAccount: typeof p.bankAccount === "string" ? p.bankAccount : "",
    orgNumber: typeof p.orgNumber === "string" ? p.orgNumber : "",
  };
}

const VALID_STATUSES: GigStatus[] = [
  "invited",
  "confirmed",
  "done",
  "invoiced",
  "paid",
];

function normalizeGig(raw: unknown): Gig | null {
  if (typeof raw !== "object" || raw === null) return null;
  const g = raw as Partial<Gig>;
  if (!g.id || !g.projectName) return null;
  const status: GigStatus = VALID_STATUSES.includes(g.status as GigStatus)
    ? (g.status as GigStatus)
    : "confirmed";
  return {
    id: String(g.id),
    projectName: String(g.projectName),
    client: typeof g.client === "string" ? g.client : "",
    venue: typeof g.venue === "string" ? g.venue : "",
    role: typeof g.role === "string" ? g.role : "",
    startDate: typeof g.startDate === "string" ? g.startDate : "",
    endDate: typeof g.endDate === "string" ? g.endDate : "",
    hours: typeof g.hours === "number" && isFinite(g.hours) ? g.hours : 0,
    rate: typeof g.rate === "number" && isFinite(g.rate) ? g.rate : 0,
    flatFee:
      typeof g.flatFee === "number" && isFinite(g.flatFee) ? g.flatFee : 0,
    notes: typeof g.notes === "string" ? g.notes : "",
    status,
    createdAt:
      typeof g.createdAt === "number" && isFinite(g.createdAt)
        ? g.createdAt
        : Date.now(),
    briefId: typeof g.briefId === "string" && g.briefId ? g.briefId : undefined,
  };
}

const VALID_DECISIONS: BriefDecision[] = ["pending", "accepted", "declined"];

function normalizeSharedBrief(raw: unknown): SharedBrief | null {
  if (typeof raw !== "object" || raw === null) return null;
  const b = raw as Partial<SharedBrief>;
  if (typeof b.briefId !== "string" || !b.briefId) return null;
  const brief = normalizeBrief(b.brief);
  if (!brief) return null;
  const decision: BriefDecision = VALID_DECISIONS.includes(
    b.decision as BriefDecision,
  )
    ? (b.decision as BriefDecision)
    : "pending";
  return {
    briefId: b.briefId,
    receivedAt:
      typeof b.receivedAt === "number" && isFinite(b.receivedAt)
        ? b.receivedAt
        : Date.now(),
    decision,
    acceptedGigId:
      typeof b.acceptedGigId === "string" && b.acceptedGigId
        ? b.acceptedGigId
        : undefined,
    brief,
  };
}

function normalizeAvailability(
  input: unknown,
): Record<string, AvailabilityState> {
  if (typeof input !== "object" || input === null) return {};
  const out: Record<string, AvailabilityState> = {};
  for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
    if (v === "available" || v === "busy") out[k] = v;
  }
  return out;
}

export function loadPortalData(
  userId: string | null | undefined,
): PortalData {
  const k = keyFor(userId);
  if (!k) return { ...EMPTY_PORTAL_DATA };
  try {
    const raw = localStorage.getItem(k);
    if (!raw) return { ...EMPTY_PORTAL_DATA };
    const parsed = JSON.parse(raw) as unknown;
    if (typeof parsed !== "object" || parsed === null) {
      return { ...EMPTY_PORTAL_DATA };
    }
    const obj = parsed as Partial<PortalData>;
    return {
      profile: normalizeProfile(obj.profile),
      availability: normalizeAvailability(obj.availability),
      gigs: Array.isArray(obj.gigs)
        ? obj.gigs
            .map(normalizeGig)
            .filter((g): g is Gig => g !== null)
        : [],
      briefs: Array.isArray(obj.briefs)
        ? obj.briefs
            .map(normalizeSharedBrief)
            .filter((b): b is SharedBrief => b !== null)
        : [],
    };
  } catch {
    return { ...EMPTY_PORTAL_DATA };
  }
}

export function savePortalData(
  userId: string | null | undefined,
  data: PortalData,
): void {
  const k = keyFor(userId);
  if (!k) return;
  try {
    localStorage.setItem(k, JSON.stringify(data));
  } catch {
    /* localStorage may be full or unavailable */
  }
}

export function newGigId(): string {
  return `gig_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function gigEarnings(g: Gig): number {
  if (g.flatFee > 0) return g.flatFee;
  return Math.max(0, g.hours) * Math.max(0, g.rate);
}

export function statusLabel(s: GigStatus): string {
  switch (s) {
    case "invited":
      return "Invited";
    case "confirmed":
      return "Confirmed";
    case "done":
      return "Done";
    case "invoiced":
      return "Invoiced";
    case "paid":
      return "Paid";
  }
}

export function statusColor(s: GigStatus): { bg: string; fg: string } {
  switch (s) {
    case "invited":
      return { bg: "rgba(99,102,241,0.15)", fg: "#6366f1" };
    case "confirmed":
      return { bg: "rgba(248,128,0,0.18)", fg: "#f88000" };
    case "done":
      return { bg: "rgba(14,165,233,0.18)", fg: "#0ea5e9" };
    case "invoiced":
      return { bg: "rgba(168,85,247,0.18)", fg: "#a855f7" };
    case "paid":
      return { bg: "rgba(22,163,74,0.18)", fg: "#16a34a" };
  }
}

/* --------------------------------- Briefs --------------------------------- */

/** Add or refresh a brief in the freelancer's portal. If a brief with the
 *  same `briefId` already exists, the original `decision` and
 *  `acceptedGigId` are preserved (so re-opening the share link doesn't
 *  silently undo an Accept) but the brief payload is refreshed in case
 *  the producer regenerated the link. Returns the merged SharedBrief. */
export function upsertBrief(
  data: PortalData,
  brief: ProjectBrief,
): { data: PortalData; entry: SharedBrief } {
  const existingIdx = data.briefs.findIndex(
    (b) => b.briefId === brief.briefId,
  );
  if (existingIdx >= 0) {
    const existing = data.briefs[existingIdx];
    const merged: SharedBrief = {
      ...existing,
      brief,
    };
    const briefs = data.briefs.slice();
    briefs[existingIdx] = merged;
    return { data: { ...data, briefs }, entry: merged };
  }
  const entry: SharedBrief = {
    briefId: brief.briefId,
    receivedAt: Date.now(),
    decision: "pending",
    brief,
  };
  return { data: { ...data, briefs: [entry, ...data.briefs] }, entry };
}

/** Update a single brief by id (preserves identity for everything else). */
export function updateBrief(
  data: PortalData,
  briefId: string,
  patch: Partial<Omit<SharedBrief, "briefId" | "brief">>,
): PortalData {
  return {
    ...data,
    briefs: data.briefs.map((b) =>
      b.briefId === briefId ? { ...b, ...patch } : b,
    ),
  };
}

export function findBrief(
  data: PortalData,
  briefId: string,
): SharedBrief | undefined {
  return data.briefs.find((b) => b.briefId === briefId);
}

/** Build a Gig from a SharedBrief, picking the recipient's assignment if
 *  one is present (otherwise the first assignment, or generic blanks). */
export function gigFromBrief(brief: ProjectBrief): Gig {
  const target =
    brief.assignments.find((a) => a.crewId === brief.recipientCrewId) ??
    brief.assignments[0];
  const venue = brief.project.venue || "Untitled show";
  return {
    id: newGigId(),
    projectName: venue,
    client: brief.project.preparedBy,
    venue,
    role: target?.role ?? "",
    startDate: brief.project.date,
    endDate: brief.project.endDate || brief.project.date,
    hours: target ? target.hours : 0,
    rate: target ? target.dayRate : 0,
    flatFee: 0,
    notes: target?.notes ?? "",
    status: "confirmed",
    createdAt: Date.now(),
    briefId: brief.briefId,
  };
}
