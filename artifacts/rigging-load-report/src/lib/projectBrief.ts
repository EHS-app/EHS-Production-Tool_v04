/** Project Brief — a portable, compact snapshot of a Production Tool
 *  project that the producer can hand to a freelancer. The brief is
 *  shared via a URL fragment (gzip + base64url, see `briefShare.ts`),
 *  so it must stay small: per-section summaries, no per-row internals.
 *
 *  The freelancer's Portal imports the brief, displays it as a project
 *  briefing, and lets them Accept it as a confirmed gig. */

import {
  computeStage,
  type Stage,
  type StageDeckKey,
} from "./stage";
import {
  computeSoundTotals,
  SOUND_CATEGORIES,
  type SoundCategory,
  type SoundItem,
} from "./sound";
import {
  crewHours,
  CREW_ROLES,
  type CrewMember,
  type CrewRole,
} from "./crew";
import { trussEndpoints, type RiggPlan, type TrussRotation } from "./riggPlan";

export const BRIEF_VERSION = 1 as const;

export type BriefAssignment = {
  /** Crew row id from the producer's Crew Report. Used to highlight
   *  the recipient's own line and to pre-fill their Gig if they Accept. */
  crewId: string;
  name: string;
  role: CrewRole;
  callTime: string;
  offTime: string;
  hours: number;
  /** Day rate in EUR (the Production Tool is Europe-only). */
  dayRate: number;
  notes: string;
};

export type BriefSystem = {
  id: string;
  name: string;
  pointCount: number;
  hoist: string;
  dynamicFactor: number;
  riggingRowCount: number;
  fixtureRowCount: number;
  ledRowCount: number;
};

export type BriefRiggingTotals = {
  systemCount: number;
  hoistCount: number;
  totalMotorW: number;
  systems: BriefSystem[];
};

export type BriefLightingTotals = {
  fixtureCount: number;
  totalFixtureWatts: number;
  universes: number[];
  circuitCount: number;
  totalCircuitW: number;
  worstCircuitPct: number;
};

export type BriefLedScreen = {
  id: string;
  name: string;
  panelType: string;
  cols: number;
  rows: number;
  totalPanels: number;
  estimatedWatts: number;
};

export type BriefLedTotals = {
  screenCount: number;
  totalPanels: number;
  processor: string;
  screens: BriefLedScreen[];
};

export type BriefStage = {
  id: string;
  name: string;
  width: number;
  depth: number;
  legHeightCm: number;
  loadCapacityKg: number;
  area: number;
  bracingNotes: string[];
  deckCounts: Record<StageDeckKey, number>;
};

export type BriefStageTotals = {
  stageCount: number;
  totalArea: number;
  totalLoadCapacityKg: number;
  stages: BriefStage[];
};

export type BriefSoundCategory = {
  category: SoundCategory;
  count: number;
  totalWeight: number;
  totalPower: number;
};

export type BriefSoundTotals = {
  rowCount: number;
  totalQty: number;
  totalWeight: number;
  totalPower: number;
  byCategory: BriefSoundCategory[];
};

export type BriefRiggPlan = {
  venue: { widthM: number; depthM: number; ceilingM: number };
  trusses: Array<{
    systemId: string;
    systemName: string;
    x: number;
    y: number;
    z: number;
    lengthM: number;
    rotation: TrussRotation;
    /** Pre-computed endpoints in metres (so the Portal renderer doesn't
     *  need to import the trussEndpoints helper). */
    x1: number;
    y1: number;
    x2: number;
    y2: number;
  }>;
};

export type ProjectBrief = {
  version: typeof BRIEF_VERSION;
  generatedAt: number;
  briefId: string;
  /** When set, the recipient's Crew Report row id — the Portal highlights
   *  that assignment and pre-fills the Gig if Accept is tapped. Null for
   *  a "generic" link that's the same for everyone on the call. */
  recipientCrewId: string | null;
  project: {
    venue: string;
    /** ISO date (YYYY-MM-DD) of the show — start date when a range is set. */
    date: string;
    /** Optional ISO end date (YYYY-MM-DD) for multi-day shows. Omitted /
     *  empty means single-day. */
    endDate?: string;
    /** Optional production schedule with one entry per phase (setup,
     *  rehearsal, show, downrig). Each phase has a `from`/`to` ISO date
     *  range. Omitted phases simply do not appear in the brief view. */
    schedule?: BriefSchedule;
    preparedBy: string;
  };
  assignments: BriefAssignment[];
  rigging: BriefRiggingTotals;
  lighting: BriefLightingTotals;
  led: BriefLedTotals;
  stage: BriefStageTotals;
  sound: BriefSoundTotals;
  riggPlan: BriefRiggPlan | null;
};

/** Generate a short opaque id for a brief. Browsers' crypto.randomUUID
 *  is used when available; falls back to time + random for older envs. */
export function newBriefId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    // 8 hex chars are plenty — collision odds are negligible at the
    // per-user / per-show scale we're operating at.
    return crypto.randomUUID().replace(/-/g, "").slice(0, 12);
  }
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

/** Minimal lighting state needed to summarise the lighting plan. */
export type BriefLightingInput = {
  showFixtures: Array<{
    qty: number;
    watts: number;
    universe: number;
  }>;
  power: {
    circuits: Array<{
      voltage: number;
      ampsPerPhase: number;
      items: Array<{ qty: number; wattsPerUnit: number; phase: "L1" | "L2" | "L3" }>;
    }>;
  };
};

/** Minimal LED state needed to summarise the LED report. */
export type BriefLedInput = {
  ledScreens: Array<{
    id: string;
    name: string;
    panelType?: string;
    cols: number;
    rows: number;
    panelWatts?: number;
  }>;
  processor?: string;
};

/** Minimal rigging state needed to summarise systems. Hoist labels are
 *  resolved against the App's `hoistModels` table on the producer side
 *  and passed in pre-stringified. */
export type BriefRiggingInput = {
  systems: Array<{
    id: string;
    name: string;
    pointCount: number;
    dynamicFactor: number;
    hoistLabel: string;
    hoistWatt: number;
    riggingRowCount: number;
    fixtureRowCount: number;
    ledRowCount: number;
  }>;
};

/** Production schedule shipped in the brief — one optional range per
 *  phase. Empty strings allowed for partially-set phases. */
export type BriefSchedulePhaseKey = "setup" | "rehearsal" | "show" | "downrig";
export type BriefSchedulePhase = { from: string; to: string };
export type BriefSchedule = Partial<
  Record<BriefSchedulePhaseKey, BriefSchedulePhase>
>;

export type BuildBriefInput = {
  venue: string;
  reportDate: string;
  /** Optional ISO end date for multi-day shows. */
  reportEndDate?: string;
  /** Optional schedule covering setup/rehearsal/show/downrig. */
  schedule?: BriefSchedule;
  engineer: string;
  recipientCrewId: string | null;
  crew: CrewMember[];
  rigging: BriefRiggingInput;
  lighting: BriefLightingInput;
  led: BriefLedInput;
  stages: Stage[];
  sound: SoundItem[];
  riggPlan: RiggPlan;
};

function summariseLighting(lighting: BriefLightingInput): BriefLightingTotals {
  const fixtureCount = lighting.showFixtures.reduce(
    (n, f) => n + Math.max(0, f.qty || 0),
    0,
  );
  const totalFixtureWatts = lighting.showFixtures.reduce(
    (n, f) => n + Math.max(0, f.qty || 0) * Math.max(0, f.watts || 0),
    0,
  );
  const universes = Array.from(
    new Set(
      lighting.showFixtures
        .map((f) => f.universe)
        .filter((u): u is number => typeof u === "number" && u > 0),
    ),
  ).sort((a, b) => a - b);
  let totalCircuitW = 0;
  let worstPct = 0;
  for (const c of lighting.power.circuits) {
    const phaseLoad: Record<"L1" | "L2" | "L3", number> = { L1: 0, L2: 0, L3: 0 };
    for (const it of c.items) {
      const w = Math.max(0, it.qty || 0) * Math.max(0, it.wattsPerUnit || 0);
      phaseLoad[it.phase] = (phaseLoad[it.phase] ?? 0) + w;
      totalCircuitW += w;
    }
    const capacity = Math.max(1, c.voltage * c.ampsPerPhase);
    const pct = Math.max(
      phaseLoad.L1 / capacity,
      phaseLoad.L2 / capacity,
      phaseLoad.L3 / capacity,
    );
    if (pct > worstPct) worstPct = pct;
  }
  return {
    fixtureCount,
    totalFixtureWatts,
    universes,
    circuitCount: lighting.power.circuits.length,
    totalCircuitW,
    worstCircuitPct: Math.round(worstPct * 100) / 100,
  };
}

function summariseLed(led: BriefLedInput): BriefLedTotals {
  const screens: BriefLedScreen[] = led.ledScreens.map((s) => {
    const totalPanels = Math.max(0, s.cols) * Math.max(0, s.rows);
    return {
      id: s.id,
      name: s.name,
      panelType: s.panelType ?? "",
      cols: s.cols,
      rows: s.rows,
      totalPanels,
      estimatedWatts: Math.round(totalPanels * (s.panelWatts ?? 0)),
    };
  });
  return {
    screenCount: screens.length,
    totalPanels: screens.reduce((n, s) => n + s.totalPanels, 0),
    processor: led.processor ?? "",
    screens,
  };
}

function summariseStages(stages: Stage[]): BriefStageTotals {
  const out: BriefStage[] = [];
  let totalArea = 0;
  let totalLoad = 0;
  for (const s of stages) {
    const calc = computeStage(s);
    totalArea += calc.areaM2;
    totalLoad += calc.loadCapacityKg;
    // `nivtecBracingNote` is in lib/stage.ts but kept inline-light here:
    // we compute the same critical thresholds for compactness.
    const notes: string[] = [];
    if (s.legHeightCm > 140) {
      notes.push("Diagonal + horizontal bracing required (> 140 cm)");
    } else if (s.legHeightCm >= 80) {
      notes.push("Diagonal bracing required (≥ 80 cm)");
    }
    if (s.legHeightCm >= 100) {
      notes.push("Handrails required (≥ 100 cm fall height)");
    }
    out.push({
      id: s.id,
      name: s.name,
      width: s.width,
      depth: s.depth,
      legHeightCm: s.legHeightCm,
      loadCapacityKg: calc.loadCapacityKg,
      area: calc.areaM2,
      bracingNotes: notes,
      deckCounts: calc.deckCounts,
    });
  }
  return {
    stageCount: stages.length,
    totalArea,
    totalLoadCapacityKg: totalLoad,
    stages: out,
  };
}

function summariseSound(items: SoundItem[]): BriefSoundTotals {
  const totals = computeSoundTotals(items);
  const byCategory: BriefSoundCategory[] = [];
  for (const [cat, count] of Object.entries(totals.countsByCategory)) {
    if (count > 0) {
      byCategory.push({
        category: cat as SoundCategory,
        count,
        totalWeight: totals.weightsByCategory[cat as SoundCategory] ?? 0,
        totalPower: totals.powersByCategory[cat as SoundCategory] ?? 0,
      });
    }
  }
  return {
    rowCount: totals.rowCount,
    totalQty: totals.totalQty,
    totalWeight: totals.totalWeight,
    totalPower: totals.totalPower,
    byCategory,
  };
}

function summariseRigging(rigging: BriefRiggingInput): BriefRiggingTotals {
  const systems: BriefSystem[] = rigging.systems.map((s) => ({
    id: s.id,
    name: s.name,
    pointCount: s.pointCount,
    hoist: s.hoistLabel,
    dynamicFactor: s.dynamicFactor,
    riggingRowCount: s.riggingRowCount,
    fixtureRowCount: s.fixtureRowCount,
    ledRowCount: s.ledRowCount,
  }));
  const hoistCount = systems.reduce((n, s) => n + s.pointCount, 0);
  const totalMotorW = rigging.systems.reduce(
    (n, s) => n + s.pointCount * (s.hoistWatt || 0),
    0,
  );
  return {
    systemCount: systems.length,
    hoistCount,
    totalMotorW,
    systems,
  };
}

function summariseRiggPlan(plan: RiggPlan, systemNameById: Map<string, string>): BriefRiggPlan | null {
  const ids = Object.keys(plan.trussById);
  if (ids.length === 0) return null;
  const trusses = ids.map((id) => {
    const t = plan.trussById[id];
    const ends = trussEndpoints(t);
    return {
      systemId: id,
      systemName: systemNameById.get(id) ?? id,
      x: t.x,
      y: t.y,
      z: t.z,
      lengthM: t.lengthM,
      rotation: t.rotation,
      x1: ends.x1,
      y1: ends.y1,
      x2: ends.x2,
      y2: ends.y2,
    };
  });
  return {
    venue: { ...plan.venue },
    trusses,
  };
}

export function buildBrief(input: BuildBriefInput): ProjectBrief {
  const assignments: BriefAssignment[] = input.crew.map((m) => ({
    crewId: m.id,
    name: m.name,
    role: m.role,
    callTime: m.callTime,
    offTime: m.offTime,
    hours: crewHours(m),
    dayRate: m.dayRate,
    notes: m.notes,
  }));
  const systemNames = new Map<string, string>();
  for (const s of input.rigging.systems) systemNames.set(s.id, s.name);
  return {
    version: BRIEF_VERSION,
    generatedAt: Date.now(),
    briefId: newBriefId(),
    recipientCrewId: input.recipientCrewId,
    project: {
      venue: input.venue,
      date: input.reportDate,
      endDate: input.reportEndDate ? input.reportEndDate : undefined,
      schedule: input.schedule ? cleanSchedule(input.schedule) : undefined,
      preparedBy: input.engineer,
    },
    assignments,
    rigging: summariseRigging(input.rigging),
    lighting: summariseLighting(input.lighting),
    led: summariseLed(input.led),
    stage: summariseStages(input.stages),
    sound: summariseSound(input.sound),
    riggPlan: summariseRiggPlan(input.riggPlan, systemNames),
  };
}

// ────────────────────────────────────────────────────────────────────────
// Safe coercion helpers used by `normalizeBrief`. The goal is total
// robustness: a tampered or truncated URL payload must never throw inside
// the rendering tree. Each helper returns a sane default for a malformed
// input so render code can safely call `.map`, format numbers, etc.
// ────────────────────────────────────────────────────────────────────────

function asString(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v : fallback;
}
function asNumber(v: unknown, fallback = 0): number {
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}
function asArray(v: unknown): unknown[] {
  return Array.isArray(v) ? v : [];
}
function asObject(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" ? (v as Record<string, unknown>) : {};
}
function asEnum<T extends string | number>(
  v: unknown,
  allowed: readonly T[],
  fallback: T,
): T {
  return (allowed as readonly (string | number)[]).includes(
    v as string | number,
  )
    ? (v as T)
    : fallback;
}

const SCHEDULE_PHASE_KEYS: readonly BriefSchedulePhaseKey[] = [
  "setup",
  "rehearsal",
  "show",
  "downrig",
] as const;

/** Strip empty phases from a schedule before serialising — saves
 *  bytes in the share link and keeps Briefs tidy. */
function cleanSchedule(schedule: BriefSchedule): BriefSchedule | undefined {
  const out: BriefSchedule = {};
  let any = false;
  SCHEDULE_PHASE_KEYS.forEach((k) => {
    const ph = schedule[k];
    if (!ph) return;
    const from = asString(ph.from);
    const to = asString(ph.to);
    if (!from && !to) return;
    out[k] = { from, to };
    any = true;
  });
  return any ? out : undefined;
}

/** Defensive read of an arbitrary value (e.g. from a decoded share link
 *  or stored brief) into a `BriefSchedule`. Unknown keys are ignored. */
function normalizeSchedule(raw: unknown): BriefSchedule | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const obj = raw as Record<string, unknown>;
  const out: BriefSchedule = {};
  let any = false;
  SCHEDULE_PHASE_KEYS.forEach((k) => {
    const ph = obj[k];
    if (!ph || typeof ph !== "object") return;
    const phObj = ph as Record<string, unknown>;
    const from = asString(phObj.from);
    const to = asString(phObj.to);
    if (!from && !to) return;
    out[k] = { from, to };
    any = true;
  });
  return any ? out : undefined;
}

// Use the canonical enum lists from the source modules so the brief
// normalizer stays in sync with the rest of the app automatically.
const ROLE_VALUES = CREW_ROLES;
const SOUND_CATEGORY_VALUES = SOUND_CATEGORIES;
const STAGE_DECK_KEYS: readonly StageDeckKey[] = [
  "2x1",
  "1x1",
  "0.5x2",
  "0.5x1",
] as const;
const TRUSS_ROTATIONS: readonly TrussRotation[] = [0, 90] as const;

function normalizeAssignment(raw: unknown): BriefAssignment {
  const r = asObject(raw);
  return {
    crewId: asString(r.crewId),
    name: asString(r.name),
    role: asEnum<CrewRole>(r.role, ROLE_VALUES, "Other"),
    callTime: asString(r.callTime),
    offTime: asString(r.offTime),
    hours: asNumber(r.hours),
    dayRate: asNumber(r.dayRate),
    notes: asString(r.notes),
  };
}

function normalizeSystem(raw: unknown): BriefSystem {
  const r = asObject(raw);
  return {
    id: asString(r.id),
    name: asString(r.name),
    pointCount: asNumber(r.pointCount),
    hoist: asString(r.hoist),
    dynamicFactor: asNumber(r.dynamicFactor, 1),
    riggingRowCount: asNumber(r.riggingRowCount),
    fixtureRowCount: asNumber(r.fixtureRowCount),
    ledRowCount: asNumber(r.ledRowCount),
  };
}

function normalizeRigging(raw: unknown): BriefRiggingTotals {
  const r = asObject(raw);
  return {
    systemCount: asNumber(r.systemCount),
    hoistCount: asNumber(r.hoistCount),
    totalMotorW: asNumber(r.totalMotorW),
    systems: asArray(r.systems).map(normalizeSystem),
  };
}

function normalizeLighting(raw: unknown): BriefLightingTotals {
  const r = asObject(raw);
  return {
    fixtureCount: asNumber(r.fixtureCount),
    totalFixtureWatts: asNumber(r.totalFixtureWatts),
    universes: asArray(r.universes)
      .map((u) => asNumber(u))
      .filter((u) => u > 0),
    circuitCount: asNumber(r.circuitCount),
    totalCircuitW: asNumber(r.totalCircuitW),
    worstCircuitPct: asNumber(r.worstCircuitPct),
  };
}

function normalizeLedScreen(raw: unknown): BriefLedScreen {
  const r = asObject(raw);
  return {
    id: asString(r.id),
    name: asString(r.name),
    panelType: asString(r.panelType),
    cols: asNumber(r.cols),
    rows: asNumber(r.rows),
    totalPanels: asNumber(r.totalPanels),
    estimatedWatts: asNumber(r.estimatedWatts),
  };
}

function normalizeLed(raw: unknown): BriefLedTotals {
  const r = asObject(raw);
  return {
    screenCount: asNumber(r.screenCount),
    totalPanels: asNumber(r.totalPanels),
    processor: asString(r.processor),
    screens: asArray(r.screens).map(normalizeLedScreen),
  };
}

function normalizeStage(raw: unknown): BriefStage {
  const r = asObject(raw);
  const deckRaw = asObject(r.deckCounts);
  const deckCounts = STAGE_DECK_KEYS.reduce(
    (acc, key) => {
      acc[key] = asNumber(deckRaw[key]);
      return acc;
    },
    {} as Record<StageDeckKey, number>,
  );
  return {
    id: asString(r.id),
    name: asString(r.name),
    width: asNumber(r.width),
    depth: asNumber(r.depth),
    legHeightCm: asNumber(r.legHeightCm),
    loadCapacityKg: asNumber(r.loadCapacityKg),
    area: asNumber(r.area),
    bracingNotes: asArray(r.bracingNotes).map((n) => asString(n)),
    deckCounts,
  };
}

function normalizeStageTotals(raw: unknown): BriefStageTotals {
  const r = asObject(raw);
  return {
    stageCount: asNumber(r.stageCount),
    totalArea: asNumber(r.totalArea),
    totalLoadCapacityKg: asNumber(r.totalLoadCapacityKg),
    stages: asArray(r.stages).map(normalizeStage),
  };
}

function normalizeSoundCategory(raw: unknown): BriefSoundCategory {
  const r = asObject(raw);
  return {
    category: asEnum<SoundCategory>(r.category, SOUND_CATEGORY_VALUES, "Other"),
    count: asNumber(r.count),
    totalWeight: asNumber(r.totalWeight),
    totalPower: asNumber(r.totalPower),
  };
}

function normalizeSoundTotals(raw: unknown): BriefSoundTotals {
  const r = asObject(raw);
  return {
    rowCount: asNumber(r.rowCount),
    totalQty: asNumber(r.totalQty),
    totalWeight: asNumber(r.totalWeight),
    totalPower: asNumber(r.totalPower),
    byCategory: asArray(r.byCategory).map(normalizeSoundCategory),
  };
}

function normalizeRiggPlan(raw: unknown): BriefRiggPlan | null {
  if (!raw || typeof raw !== "object") return null;
  const r = asObject(raw);
  const v = asObject(r.venue);
  const trusses = asArray(r.trusses).map((tRaw) => {
    const t = asObject(tRaw);
    return {
      systemId: asString(t.systemId),
      systemName: asString(t.systemName),
      x: asNumber(t.x),
      y: asNumber(t.y),
      z: asNumber(t.z),
      lengthM: asNumber(t.lengthM),
      rotation: asEnum<TrussRotation>(t.rotation, TRUSS_ROTATIONS, 0),
      x1: asNumber(t.x1),
      y1: asNumber(t.y1),
      x2: asNumber(t.x2),
      y2: asNumber(t.y2),
    };
  });
  return {
    venue: {
      widthM: asNumber(v.widthM),
      depthM: asNumber(v.depthM),
      ceilingM: asNumber(v.ceilingM),
    },
    trusses,
  };
}

/** Coerce a parsed-JSON unknown value into a ProjectBrief. Bad fields
 *  are dropped or zeroed rather than throwing — better to render a
 *  partial brief than fail outright when an old client opens a brief
 *  generated by a newer producer, or when a tampered URL is opened.
 *
 *  Every nested array/object/number is defended so that the render tree
 *  can safely call `.map`, format numbers, etc. without crashing. */
export function normalizeBrief(raw: unknown): ProjectBrief | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const briefId = asString(r.briefId);
  if (!briefId) return null;
  if (typeof r.version !== "number") return null;
  const project = asObject(r.project);
  return {
    version: BRIEF_VERSION,
    generatedAt:
      typeof r.generatedAt === "number" && Number.isFinite(r.generatedAt)
        ? r.generatedAt
        : Date.now(),
    briefId,
    recipientCrewId:
      typeof r.recipientCrewId === "string" ? r.recipientCrewId : null,
    project: {
      venue: asString(project.venue),
      date: asString(project.date),
      endDate:
        typeof project.endDate === "string" && project.endDate
          ? project.endDate
          : undefined,
      schedule: normalizeSchedule(project.schedule),
      preparedBy: asString(project.preparedBy),
    },
    assignments: asArray(r.assignments).map(normalizeAssignment),
    rigging: normalizeRigging(r.rigging),
    lighting: normalizeLighting(r.lighting),
    led: normalizeLed(r.led),
    stage: normalizeStageTotals(r.stage),
    sound: normalizeSoundTotals(r.sound),
    riggPlan: normalizeRiggPlan(r.riggPlan),
  };
}
