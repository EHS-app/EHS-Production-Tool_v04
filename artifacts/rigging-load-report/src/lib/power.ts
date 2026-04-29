/** Lighting → Power Plan — data model, defaults and load calculations.
 *
 *  v2 (current): the plan is **distro-centric**. A `Distro` is a real
 *  physical power source (e.g. HOT1 = CEE 32 A 3-phase) that contains a
 *  fixed set of `Channel`s. Each channel is mapped to a phase via the
 *  distro's `channelMapping` (default Ch1+Ch4→L1, Ch2+Ch5→L2,
 *  Ch3+Ch6→L3). Each channel holds `Drop`s — daisy-chains of fixtures
 *  on a specific truss. Fixtures are **referenced** from the Lighting
 *  tab (the Show Fixture List), never duplicated.
 *
 *  Calculations follow real-world rules:
 *    - A = (qty × W) / (V × PF), V = 230 L–N, PF default 0.95 per distro
 *    - 80 % continuous-load derate (warning band)
 *    - Per-channel, per-phase, per-feeder checks run independently so a
 *      distro can be flagged when individual channels look fine but
 *      their phase total exceeds the feeder.
 *    - Phase imbalance > 20 % surfaces an advisory.
 *    - Auto-balance is **never** applied automatically — only
 *      suggestions are surfaced (with a cabling-reach constraint:
 *      moves only between channels feeding the same truss).
 *
 *  v1 data (PowerCircuit + PowerItem with free-text rows on L1/L2/L3)
 *  is preserved verbatim for back-compat. The view renders any old
 *  `circuits` data as a read-only "Legacy circuits" panel so nothing is
 *  lost during the migration. */

export const POWER_PHASES = ["L1", "L2", "L3"] as const;
export type PowerPhase = (typeof POWER_PHASES)[number];

// ─── Legacy v1 model (preserved as read-only) ──────────────────────────

export type PowerItem = {
  id: string;
  name: string;
  qty: number;
  wattsPerUnit: number;
  phase: PowerPhase;
  notes: string;
};

export type PowerCircuit = {
  id: string;
  name: string;
  source: string;
  voltage: number;
  ampsPerPhase: number;
  items: PowerItem[];
};

// ─── v2 Distro model ───────────────────────────────────────────────────

/** Catalog of common distro feeds. Each preset describes the feeder
 *  (phases / V / A) and the breakout the distro provides (channel count
 *  + per-channel breaker rating). `custom` is a starting point; the
 *  producer can then change anything. */
export type DistroPresetId =
  | "schuko-16-1ph"
  | "cee-32-1ph"
  | "cee-16-3ph-6x10"
  | "cee-32-3ph-6x16"
  | "cee-63-3ph-6x32"
  | "cee-125-3ph-6x63"
  | "custom";

export type DistroPreset = {
  id: DistroPresetId;
  label: string;
  feedPhases: 1 | 3;
  feedVoltage: number;
  feedAmps: number;
  channelCount: number;
  channelBreakerAmps: number;
};

export const DISTRO_PRESETS: Record<DistroPresetId, DistroPreset> = {
  "schuko-16-1ph": {
    id: "schuko-16-1ph",
    label: "Schuko 16 A · 1ph",
    feedPhases: 1,
    feedVoltage: 230,
    feedAmps: 16,
    channelCount: 1,
    channelBreakerAmps: 16,
  },
  "cee-32-1ph": {
    id: "cee-32-1ph",
    label: "CEE 32 A · 1ph",
    feedPhases: 1,
    feedVoltage: 230,
    feedAmps: 32,
    channelCount: 1,
    channelBreakerAmps: 32,
  },
  "cee-16-3ph-6x10": {
    id: "cee-16-3ph-6x10",
    label: "CEE 16 A · 3ph · 6 × 10 A",
    feedPhases: 3,
    feedVoltage: 400,
    feedAmps: 16,
    channelCount: 6,
    channelBreakerAmps: 10,
  },
  "cee-32-3ph-6x16": {
    id: "cee-32-3ph-6x16",
    label: "CEE 32 A · 3ph · 6 × 16 A",
    feedPhases: 3,
    feedVoltage: 400,
    feedAmps: 32,
    channelCount: 6,
    channelBreakerAmps: 16,
  },
  "cee-63-3ph-6x32": {
    id: "cee-63-3ph-6x32",
    label: "CEE 63 A · 3ph · 6 × 32 A",
    feedPhases: 3,
    feedVoltage: 400,
    feedAmps: 63,
    channelCount: 6,
    channelBreakerAmps: 32,
  },
  "cee-125-3ph-6x63": {
    id: "cee-125-3ph-6x63",
    label: "CEE 125 A · 3ph · 6 × 63 A",
    feedPhases: 3,
    feedVoltage: 400,
    feedAmps: 125,
    channelCount: 6,
    channelBreakerAmps: 63,
  },
  custom: {
    id: "custom",
    label: "Custom",
    feedPhases: 3,
    feedVoltage: 400,
    feedAmps: 32,
    channelCount: 6,
    channelBreakerAmps: 16,
  },
};

export const DISTRO_PRESET_ORDER: DistroPresetId[] = [
  "schuko-16-1ph",
  "cee-32-1ph",
  "cee-16-3ph-6x10",
  "cee-32-3ph-6x16",
  "cee-63-3ph-6x32",
  "cee-125-3ph-6x63",
  "custom",
];

/** Continuous-load derate (channels and feeders): a load above
 *  `breakerAmps × POWER_DERATE_FACTOR` is the warning band. */
export const POWER_DERATE_FACTOR = 0.8;

/** Phase imbalance flagged when (max − min) / max > this on a 3ph distro. */
export const PHASE_IMBALANCE_THRESHOLD = 0.2;

/** Default L–N voltage used per channel (configurable per channel). */
export const DEFAULT_CHANNEL_VOLTAGE = 230;

/** Default power factor per distro. */
export const DEFAULT_POWER_FACTOR = 0.95;

/** Standard 6-channel rack mapping — Ch1+Ch4→L1, Ch2+Ch5→L2, Ch3+Ch6→L3. */
export const DEFAULT_CHANNEL_MAPPING: ChannelMapping = {
  L1: [1, 4],
  L2: [2, 5],
  L3: [3, 6],
};

/** Single-phase mapping — every channel sits on L1. */
export const SINGLE_PHASE_MAPPING: ChannelMapping = {
  L1: [1],
  L2: [],
  L3: [],
};

export type ChannelMapping = {
  /** Channel indexes (1-based) sitting on each phase. A channel index
   *  must appear in exactly one phase array on a 3ph distro. On a 1ph
   *  distro everything sits on L1 (L2/L3 are empty). */
  L1: number[];
  L2: number[];
  L3: number[];
};

export type DropCableKind =
  | "hybrid"
  | "soca-tail"
  | "trueone"
  | "powercon"
  | "schuko";

export const DROP_CABLE_KINDS: DropCableKind[] = [
  "hybrid",
  "soca-tail",
  "trueone",
  "powercon",
  "schuko",
];

/** A daisy-chain of identical fixtures on a specific truss, fed by one
 *  channel. Fixtures are **referenced** by name + truss so the Lighting
 *  tab remains the single source of truth for fixture data. */
export type Drop = {
  id: string;
  /** Truss / system id — must be one of `distro.feedsTrusses`. */
  trussId: string;
  /** Display name of a Show Fixture row (matched case-insensitively to
   *  resolve watts-per-unit and the assigned-vs-total qty check). */
  fixtureRef: string;
  /** Fixtures in this daisy-chain (>= 1). */
  qty: number;
  /** Optional cable type to colour the cable BOM later. */
  cable?: DropCableKind;
  /** Optional free-form notes ("loom #2", "spare", …). */
  notes?: string;
};

export type Channel = {
  id: string;
  /** 1-based channel index within the distro. Drives phase assignment
   *  via the distro's `channelMapping`. */
  index: number;
  /** Breaker rating in A. Typically 16 for the standard 6×16 rack. */
  breakerAmps: number;
  /** L–N voltage seen by fixtures on this channel. Default 230. */
  voltage: number;
  /** Optional override of the distro-level PF (e.g. one channel on
   *  tungsten dimmers). */
  powerFactor?: number;
  drops: Drop[];
};

export type Distro = {
  id: string;
  /** Friendly label, e.g. "HOT1". */
  name: string;
  /** Free text describing where the feed comes from. */
  source: string;
  preset: DistroPresetId;
  feedPhases: 1 | 3;
  /** L–L voltage for 3ph (400) or L–N for 1ph (230). Display only. */
  feedVoltage: number;
  /** Breaker rating in A — per leg for 3ph, total for 1ph. */
  feedAmps: number;
  /** System / truss ids this distro can physically reach. Multi-entry
   *  for Soca-split jobs. The fixture picker filters to this set. */
  feedsTrusses: string[];
  /** Per-distro channel → phase mapping (configurable). */
  channelMapping: ChannelMapping;
  /** Default power factor used by every channel that doesn't override. */
  defaultPowerFactor: number;
  channels: Channel[];
};

export type PowerPlan = {
  /** Distros — primary v2 model. */
  distros: Distro[];
  /** Legacy v1 circuits — preserved verbatim and rendered as a
   *  read-only panel so producers don't lose their old data. */
  circuits: PowerCircuit[];
};

// ─── Constructors ──────────────────────────────────────────────────────

function newId(prefix: string): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
}

export function makePowerItem(phase: PowerPhase = "L1"): PowerItem {
  return {
    id: newId("pwi"),
    name: "",
    qty: 1,
    wattsPerUnit: 0,
    phase,
    notes: "",
  };
}

export function makePowerCircuit(index = 1): PowerCircuit {
  return {
    id: newId("pwc"),
    name: `HOT ${index}`,
    source: "",
    voltage: 230,
    ampsPerPhase: 32,
    items: [],
  };
}

export function makeChannel(index: number, breakerAmps: number): Channel {
  return {
    id: newId("pch"),
    index,
    breakerAmps,
    voltage: DEFAULT_CHANNEL_VOLTAGE,
    drops: [],
  };
}

export function makeDrop(
  trussId: string,
  fixtureRef: string,
  qty: number,
  cable?: DropCableKind,
): Drop {
  return {
    id: newId("drp"),
    trussId,
    fixtureRef,
    qty: Math.max(1, Math.round(qty || 1)),
    cable,
  };
}

export function defaultMappingForPreset(preset: DistroPreset): ChannelMapping {
  if (preset.feedPhases !== 3) return cloneMapping(SINGLE_PHASE_MAPPING);
  if (preset.channelCount === 6) return cloneMapping(DEFAULT_CHANNEL_MAPPING);
  // Generic fallback: spread sequential channels across L1 / L2 / L3.
  const m: ChannelMapping = { L1: [], L2: [], L3: [] };
  for (let i = 1; i <= preset.channelCount; i++) {
    const phase: PowerPhase = i % 3 === 1 ? "L1" : i % 3 === 2 ? "L2" : "L3";
    m[phase].push(i);
  }
  return m;
}

function cloneMapping(m: ChannelMapping): ChannelMapping {
  return { L1: [...m.L1], L2: [...m.L2], L3: [...m.L3] };
}

export function makeDistro(presetId: DistroPresetId, index = 1): Distro {
  const preset = DISTRO_PRESETS[presetId];
  const channels: Channel[] = [];
  for (let i = 1; i <= preset.channelCount; i++) {
    channels.push(makeChannel(i, preset.channelBreakerAmps));
  }
  return {
    id: newId("dst"),
    name: `HOT ${index}`,
    source: "",
    preset: presetId,
    feedPhases: preset.feedPhases,
    feedVoltage: preset.feedVoltage,
    feedAmps: preset.feedAmps,
    feedsTrusses: [],
    channelMapping: defaultMappingForPreset(preset),
    defaultPowerFactor: DEFAULT_POWER_FACTOR,
    channels,
  };
}

/** Apply a new preset to an existing distro: rebuild channels (preserving
 *  drops where the channel index still exists), reset the mapping, and
 *  update feeder fields. The distro id, name, source and feedsTrusses
 *  are kept. */
export function applyPresetToDistro(
  distro: Distro,
  presetId: DistroPresetId,
): Distro {
  const preset = DISTRO_PRESETS[presetId];
  const channels: Channel[] = [];
  for (let i = 1; i <= preset.channelCount; i++) {
    const existing = distro.channels.find((c) => c.index === i);
    if (existing) {
      channels.push({
        ...existing,
        breakerAmps: preset.channelBreakerAmps,
      });
    } else {
      channels.push(makeChannel(i, preset.channelBreakerAmps));
    }
  }
  return {
    ...distro,
    preset: presetId,
    feedPhases: preset.feedPhases,
    feedVoltage: preset.feedVoltage,
    feedAmps: preset.feedAmps,
    channelMapping: defaultMappingForPreset(preset),
    channels,
  };
}

export function defaultPowerPlan(): PowerPlan {
  return { distros: [], circuits: [] };
}

// ─── Normalization (back-compat hydration) ─────────────────────────────

function isPhase(v: unknown): v is PowerPhase {
  return (
    typeof v === "string" && (POWER_PHASES as readonly string[]).includes(v)
  );
}

function isPresetId(v: unknown): v is DistroPresetId {
  return typeof v === "string" && v in DISTRO_PRESETS;
}

function normalizeItem(raw: unknown): PowerItem {
  const base = makePowerItem();
  if (!raw || typeof raw !== "object") return base;
  const r = raw as Record<string, unknown>;
  const qty =
    typeof r.qty === "number" && Number.isFinite(r.qty) && r.qty > 0
      ? Math.max(1, Math.round(r.qty))
      : base.qty;
  const wattsPerUnit =
    typeof r.wattsPerUnit === "number" &&
    Number.isFinite(r.wattsPerUnit) &&
    r.wattsPerUnit >= 0
      ? r.wattsPerUnit
      : base.wattsPerUnit;
  return {
    id: typeof r.id === "string" && r.id ? r.id : base.id,
    name: typeof r.name === "string" ? r.name : base.name,
    qty,
    wattsPerUnit,
    phase: isPhase(r.phase) ? r.phase : base.phase,
    notes: typeof r.notes === "string" ? r.notes : base.notes,
  };
}

function normalizeCircuit(raw: unknown, index: number): PowerCircuit {
  const base = makePowerCircuit(index);
  if (!raw || typeof raw !== "object") return base;
  const r = raw as Record<string, unknown>;
  const voltage =
    typeof r.voltage === "number" && Number.isFinite(r.voltage) && r.voltage > 0
      ? r.voltage
      : base.voltage;
  const ampsPerPhase =
    typeof r.ampsPerPhase === "number" &&
    Number.isFinite(r.ampsPerPhase) &&
    r.ampsPerPhase > 0
      ? r.ampsPerPhase
      : base.ampsPerPhase;
  const items = Array.isArray(r.items) ? r.items.map(normalizeItem) : [];
  return {
    id: typeof r.id === "string" && r.id ? r.id : base.id,
    name: typeof r.name === "string" && r.name ? r.name : base.name,
    source: typeof r.source === "string" ? r.source : base.source,
    voltage,
    ampsPerPhase,
    items,
  };
}

function normalizeDrop(raw: unknown): Drop | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const trussId = typeof r.trussId === "string" ? r.trussId : "";
  const fixtureRef = typeof r.fixtureRef === "string" ? r.fixtureRef : "";
  const qty =
    typeof r.qty === "number" && Number.isFinite(r.qty) && r.qty > 0
      ? Math.max(1, Math.round(r.qty))
      : 1;
  const cable =
    typeof r.cable === "string" &&
    DROP_CABLE_KINDS.includes(r.cable as DropCableKind)
      ? (r.cable as DropCableKind)
      : undefined;
  return {
    id: typeof r.id === "string" && r.id ? r.id : newId("drp"),
    trussId,
    fixtureRef,
    qty,
    cable,
    notes: typeof r.notes === "string" ? r.notes : undefined,
  };
}

function normalizeChannel(raw: unknown, fallbackIndex: number): Channel {
  const base = makeChannel(fallbackIndex, 16);
  if (!raw || typeof raw !== "object") return base;
  const r = raw as Record<string, unknown>;
  const index =
    typeof r.index === "number" &&
    Number.isFinite(r.index) &&
    r.index >= 1
      ? Math.round(r.index)
      : fallbackIndex;
  const breakerAmps =
    typeof r.breakerAmps === "number" &&
    Number.isFinite(r.breakerAmps) &&
    r.breakerAmps > 0
      ? r.breakerAmps
      : base.breakerAmps;
  const voltage =
    typeof r.voltage === "number" &&
    Number.isFinite(r.voltage) &&
    r.voltage > 0
      ? r.voltage
      : base.voltage;
  const powerFactor =
    typeof r.powerFactor === "number" &&
    Number.isFinite(r.powerFactor) &&
    r.powerFactor > 0 &&
    r.powerFactor <= 1
      ? r.powerFactor
      : undefined;
  const drops = Array.isArray(r.drops)
    ? r.drops
        .map(normalizeDrop)
        .filter((d): d is Drop => d !== null)
    : [];
  return {
    id: typeof r.id === "string" && r.id ? r.id : base.id,
    index,
    breakerAmps,
    voltage,
    powerFactor,
    drops,
  };
}

function normalizeChannelMapping(
  raw: unknown,
  fallback: ChannelMapping,
): ChannelMapping {
  if (!raw || typeof raw !== "object") return cloneMapping(fallback);
  const r = raw as Record<string, unknown>;
  const norm = (v: unknown, def: number[]): number[] => {
    if (!Array.isArray(v)) return [...def];
    const seen = new Set<number>();
    for (const n of v) {
      if (typeof n === "number" && Number.isFinite(n) && n >= 1) {
        seen.add(Math.round(n));
      }
    }
    return Array.from(seen).sort((a, b) => a - b);
  };
  // Cross-phase exclusivity: each channel index must appear in exactly one
  // phase. Resolve duplicates with L1→L2→L3 priority (matches
  // phaseOfChannel's first-match order) so phase math can never
  // double-count a channel from malformed/migrated state.
  const claimed = new Set<number>();
  const dedupe = (arr: number[]): number[] => {
    const out: number[] = [];
    for (const idx of arr) {
      if (claimed.has(idx)) continue;
      claimed.add(idx);
      out.push(idx);
    }
    return out;
  };
  return {
    L1: dedupe(norm(r.L1, fallback.L1)),
    L2: dedupe(norm(r.L2, fallback.L2)),
    L3: dedupe(norm(r.L3, fallback.L3)),
  };
}

function normalizeDistro(raw: unknown, fallbackIndex: number): Distro {
  const base = makeDistro("cee-32-3ph-6x16", fallbackIndex);
  if (!raw || typeof raw !== "object") return base;
  const r = raw as Record<string, unknown>;
  const presetId: DistroPresetId = isPresetId(r.preset) ? r.preset : base.preset;
  const preset = DISTRO_PRESETS[presetId];
  const feedPhases: 1 | 3 = r.feedPhases === 1 || r.feedPhases === 3 ? r.feedPhases : preset.feedPhases;
  const feedVoltage =
    typeof r.feedVoltage === "number" &&
    Number.isFinite(r.feedVoltage) &&
    r.feedVoltage > 0
      ? r.feedVoltage
      : preset.feedVoltage;
  const feedAmps =
    typeof r.feedAmps === "number" &&
    Number.isFinite(r.feedAmps) &&
    r.feedAmps > 0
      ? r.feedAmps
      : preset.feedAmps;
  const feedsTrusses = Array.isArray(r.feedsTrusses)
    ? r.feedsTrusses.filter((t): t is string => typeof t === "string" && t.length > 0)
    : [];
  const defaultPowerFactor =
    typeof r.defaultPowerFactor === "number" &&
    Number.isFinite(r.defaultPowerFactor) &&
    r.defaultPowerFactor > 0 &&
    r.defaultPowerFactor <= 1
      ? r.defaultPowerFactor
      : DEFAULT_POWER_FACTOR;
  const channelMapping = normalizeChannelMapping(
    r.channelMapping,
    defaultMappingForPreset(preset),
  );
  const channels = Array.isArray(r.channels)
    ? r.channels.map((c, i) => normalizeChannel(c, i + 1))
    : Array.from({ length: preset.channelCount }, (_, i) =>
        makeChannel(i + 1, preset.channelBreakerAmps),
      );
  return {
    id: typeof r.id === "string" && r.id ? r.id : base.id,
    name: typeof r.name === "string" && r.name ? r.name : base.name,
    source: typeof r.source === "string" ? r.source : base.source,
    preset: presetId,
    feedPhases,
    feedVoltage,
    feedAmps,
    feedsTrusses,
    channelMapping,
    defaultPowerFactor,
    channels,
  };
}

export function normalizePowerPlan(raw: unknown): PowerPlan {
  if (!raw || typeof raw !== "object") return defaultPowerPlan();
  const r = raw as Record<string, unknown>;
  const circuits = Array.isArray(r.circuits)
    ? r.circuits.map((c, i) => normalizeCircuit(c, i + 1))
    : [];
  const distros = Array.isArray(r.distros)
    ? r.distros.map((d, i) => normalizeDistro(d, i + 1))
    : [];
  return { circuits, distros };
}

// ─── Severity ──────────────────────────────────────────────────────────

export type LoadSeverity = "ok" | "warn" | "over";

export function severityForRatio(ratio: number): LoadSeverity {
  if (ratio > 1) return "over";
  if (ratio >= POWER_DERATE_FACTOR) return "warn";
  return "ok";
}

// ─── Legacy v1 calculations (kept for the legacy panel) ────────────────

export type PhaseLoad = {
  phase: PowerPhase;
  watts: number;
  amps: number;
  capacityWatts: number;
  ratio: number;
};

export type CircuitLoad = {
  phases: PhaseLoad[];
  totalWatts: number;
  totalCapacityWatts: number;
  worstRatio: number;
};

export function computeCircuitLoad(circuit: PowerCircuit): CircuitLoad {
  const capacityWatts = circuit.voltage * circuit.ampsPerPhase;
  const wattsByPhase: Record<PowerPhase, number> = { L1: 0, L2: 0, L3: 0 };
  for (const it of circuit.items) {
    wattsByPhase[it.phase] += it.qty * it.wattsPerUnit;
  }
  const phases: PhaseLoad[] = POWER_PHASES.map((p) => {
    const watts = wattsByPhase[p];
    return {
      phase: p,
      watts,
      amps: circuit.voltage > 0 ? watts / circuit.voltage : 0,
      capacityWatts,
      ratio: capacityWatts > 0 ? watts / capacityWatts : 0,
    };
  });
  const totalWatts = phases.reduce((s, p) => s + p.watts, 0);
  const worstRatio = phases.reduce((m, p) => (p.ratio > m ? p.ratio : m), 0);
  return {
    phases,
    totalWatts,
    totalCapacityWatts: capacityWatts * 3,
    worstRatio,
  };
}

export type PlanTotals = {
  circuitCount: number;
  itemCount: number;
  totalWatts: number;
  totalCapacityWatts: number;
  overloadedCircuits: number;
  warningCircuits: number;
};

export function computePlanTotals(plan: PowerPlan): PlanTotals {
  let totalWatts = 0;
  let totalCapacityWatts = 0;
  let itemCount = 0;
  let overloadedCircuits = 0;
  let warningCircuits = 0;
  for (const c of plan.circuits) {
    itemCount += c.items.length;
    const load = computeCircuitLoad(c);
    totalWatts += load.totalWatts;
    totalCapacityWatts += load.totalCapacityWatts;
    const sev = severityForRatio(load.worstRatio);
    if (sev === "over") overloadedCircuits += 1;
    else if (sev === "warn") warningCircuits += 1;
  }
  return {
    circuitCount: plan.circuits.length,
    itemCount,
    totalWatts,
    totalCapacityWatts,
    overloadedCircuits,
    warningCircuits,
  };
}

// ─── v2 distro calculations ────────────────────────────────────────────

/** Resolves a fixture reference (name + truss) to its watts-per-unit by
 *  looking up the Show Fixture List on the producer side. */
export type FixtureWattsLookup = (fixtureRef: string, trussId: string) => number;

export type DropLoad = {
  drop: Drop;
  watts: number;
  amps: number;
};

export type ChannelLoad = {
  channel: Channel;
  /** Phase derived from the distro's mapping. `null` when the channel
   *  isn't mapped (e.g. mapping was hand-edited and left it out). */
  phase: PowerPhase | null;
  watts: number;
  amps: number;
  derateAmps: number;
  utilization: number;
  status: LoadSeverity;
  drops: DropLoad[];
};

export type DistroPhaseLoad = {
  phase: PowerPhase;
  channelIndexes: number[];
  watts: number;
  amps: number;
};

export type DistroLoad = {
  distro: Distro;
  channels: ChannelLoad[];
  /** Always 3 entries (L1/L2/L3) — for 1ph distros L2/L3 are empty/zero. */
  phases: DistroPhaseLoad[];
  /** Per-leg worst phase amps for 3ph; total for 1ph. Used vs feedAmps. */
  feederWorstAmps: number;
  feederUtilization: number;
  feederDerateAmps: number;
  feederStatus: LoadSeverity;
  /** Total distro draw in watts (sum across all channels). */
  totalWatts: number;
  /** Phase imbalance ratio (max−min)/max on a 3ph distro, 0 otherwise. */
  imbalance: number;
  imbalanceWarn: boolean;
  /** True when a channel is "over". */
  hasChannelOverload: boolean;
  /** True when a channel is in the warn band. */
  hasChannelWarning: boolean;
}

export function phaseOfChannel(
  distro: Distro,
  channelIndex: number,
): PowerPhase | null {
  const m = distro.channelMapping;
  if (m.L1.includes(channelIndex)) return "L1";
  if (m.L2.includes(channelIndex)) return "L2";
  if (m.L3.includes(channelIndex)) return "L3";
  return null;
}

function channelDenominator(channel: Channel, distro: Distro): number {
  const v = channel.voltage > 0 ? channel.voltage : DEFAULT_CHANNEL_VOLTAGE;
  const pf =
    channel.powerFactor && channel.powerFactor > 0
      ? channel.powerFactor
      : distro.defaultPowerFactor || DEFAULT_POWER_FACTOR;
  return v * pf;
}

export function computeDropLoad(
  drop: Drop,
  channel: Channel,
  distro: Distro,
  lookup: FixtureWattsLookup,
): DropLoad {
  const watts = Math.max(0, drop.qty * lookup(drop.fixtureRef, drop.trussId));
  const denom = channelDenominator(channel, distro);
  const amps = denom > 0 ? watts / denom : 0;
  return { drop, watts, amps };
}

export function computeChannelLoad(
  channel: Channel,
  distro: Distro,
  lookup: FixtureWattsLookup,
): ChannelLoad {
  const drops = channel.drops.map((d) =>
    computeDropLoad(d, channel, distro, lookup),
  );
  const watts = drops.reduce((s, d) => s + d.watts, 0);
  const denom = channelDenominator(channel, distro);
  const amps = denom > 0 ? watts / denom : 0;
  const derateAmps = channel.breakerAmps * POWER_DERATE_FACTOR;
  const utilization = channel.breakerAmps > 0 ? amps / channel.breakerAmps : 0;
  return {
    channel,
    phase: phaseOfChannel(distro, channel.index),
    watts,
    amps,
    derateAmps,
    utilization,
    status: severityForRatio(utilization),
    drops,
  };
}

export function computeDistroLoad(
  distro: Distro,
  lookup: FixtureWattsLookup,
): DistroLoad {
  const channels = distro.channels.map((c) =>
    computeChannelLoad(c, distro, lookup),
  );
  const phaseAmps: Record<PowerPhase, number> = { L1: 0, L2: 0, L3: 0 };
  const phaseWatts: Record<PowerPhase, number> = { L1: 0, L2: 0, L3: 0 };
  for (const cl of channels) {
    if (cl.phase) {
      phaseAmps[cl.phase] += cl.amps;
      phaseWatts[cl.phase] += cl.watts;
    }
  }
  const phases: DistroPhaseLoad[] = POWER_PHASES.map((p) => ({
    phase: p,
    channelIndexes: distro.channelMapping[p],
    watts: phaseWatts[p],
    amps: phaseAmps[p],
  }));
  const totalWatts = channels.reduce((s, c) => s + c.watts, 0);

  let feederWorstAmps: number;
  if (distro.feedPhases === 3) {
    feederWorstAmps = Math.max(phaseAmps.L1, phaseAmps.L2, phaseAmps.L3);
  } else {
    feederWorstAmps = phaseAmps.L1 + phaseAmps.L2 + phaseAmps.L3;
  }
  const feederDerateAmps = distro.feedAmps * POWER_DERATE_FACTOR;
  const feederUtilization =
    distro.feedAmps > 0 ? feederWorstAmps / distro.feedAmps : 0;

  let imbalance = 0;
  let imbalanceWarn = false;
  if (distro.feedPhases === 3) {
    const arr = [phaseAmps.L1, phaseAmps.L2, phaseAmps.L3];
    const mx = Math.max(...arr);
    const mn = Math.min(...arr);
    if (mx > 0) {
      imbalance = (mx - mn) / mx;
      // ignore noise when total load is tiny (< 1A on the heaviest leg)
      imbalanceWarn = imbalance > PHASE_IMBALANCE_THRESHOLD && mx >= 1;
    }
  }

  return {
    distro,
    channels,
    phases,
    feederWorstAmps,
    feederUtilization,
    feederDerateAmps,
    feederStatus: severityForRatio(feederUtilization),
    totalWatts,
    imbalance,
    imbalanceWarn,
    hasChannelOverload: channels.some((c) => c.status === "over"),
    hasChannelWarning: channels.some((c) => c.status === "warn"),
  };
}

// ─── Suggestions (advisory, never auto-applied) ────────────────────────

export type DistroSuggestion = {
  type: "rebalance";
  message: string;
  fromChannelIndex: number;
  toChannelIndex: number;
  qty: number;
  fixtureRef: string;
  trussId: string;
};

/** Generate up to 3 advisory rebalance suggestions for a distro. The
 *  cabling-reach constraint is enforced: we only suggest moves between
 *  channels feeding the **same truss** (the destination drop's truss
 *  must be in `distro.feedsTrusses`, which is true by construction
 *  since drops can only be added to feedable trusses). */
export function computeDistroSuggestions(load: DistroLoad): DistroSuggestion[] {
  const out: DistroSuggestion[] = [];
  if (load.distro.feedPhases !== 3) return out;
  if (
    !load.imbalanceWarn &&
    load.feederStatus === "ok" &&
    !load.hasChannelOverload &&
    !load.hasChannelWarning
  ) {
    return out;
  }

  // Heaviest and lightest phases (descending by amps).
  const sorted = [...load.phases].sort((a, b) => b.amps - a.amps);
  const heavy = sorted[0];
  const light = sorted[2];
  if (heavy.amps - light.amps < 1) return out;

  const heavyChannels = load.channels.filter(
    (c) => c.phase === heavy.phase && c.drops.length > 0,
  );
  const lightChannels = load.channels.filter((c) => c.phase === light.phase);
  if (lightChannels.length === 0) return out;

  for (const hc of heavyChannels) {
    for (const dl of hc.drops) {
      const ampsPerUnit = dl.drop.qty > 0 ? dl.amps / dl.drop.qty : 0;
      if (ampsPerUnit <= 0) continue;
      // Cabling-reach constraint: destination channel must already be
      // serving the same truss as the source drop, OR be empty (so a fresh
      // soca/cable run can be pulled to that same truss). This keeps the
      // suggestion physically achievable without dragging a new cable to a
      // different truss.
      const sourceTruss = dl.drop.trussId;
      const dest = lightChannels.find((lc) => {
        const fits =
          lc.amps + ampsPerUnit <=
          lc.channel.breakerAmps * POWER_DERATE_FACTOR;
        if (!fits) return false;
        if (lc.drops.length === 0) return true;
        return lc.drops.some((d) => d.drop.trussId === sourceTruss);
      });
      if (!dest) continue;
      // Aim to move enough units to flatten the gap by ~half.
      const targetMoveAmps = (heavy.amps - light.amps) / 2;
      let moveQty = Math.max(
        1,
        Math.min(dl.drop.qty, Math.floor(targetMoveAmps / ampsPerUnit)),
      );
      // Don't push the destination into warn band.
      const destHeadroomAmps =
        dest.channel.breakerAmps * POWER_DERATE_FACTOR - dest.amps;
      moveQty = Math.min(moveQty, Math.floor(destHeadroomAmps / ampsPerUnit));
      if (moveQty < 1) continue;
      out.push({
        type: "rebalance",
        message: `Move ${moveQty} × ${dl.drop.fixtureRef} from Ch${hc.channel.index} (${heavy.phase}) → Ch${dest.channel.index} (${light.phase}) to drop ${heavy.phase} by ~${(moveQty * ampsPerUnit).toFixed(1)} A.`,
        fromChannelIndex: hc.channel.index,
        toChannelIndex: dest.channel.index,
        qty: moveQty,
        fixtureRef: dl.drop.fixtureRef,
        trussId: dl.drop.trussId,
      });
      if (out.length >= 3) return out;
    }
  }
  return out;
}

// ─── Unpowered fixtures ────────────────────────────────────────────────

/** Minimal shape needed from a Show Fixture row. */
export type FixtureRef = {
  name: string;
  systemId: string;
  qty: number;
  watts: number;
};

export type UnpoweredFixture = {
  fixtureRef: string;
  trussId: string;
  totalQty: number;
  assignedQty: number;
  remainingQty: number;
  wattsPerUnit: number;
};

function fixtureKey(name: string, trussId: string): string {
  return `${name.trim().toLowerCase()}|${trussId}`;
}

/** Sum the assigned qty for a fixture (name + truss) across all distros. */
export function assignedQtyForFixture(
  distros: Distro[],
  name: string,
  trussId: string,
): number {
  const key = fixtureKey(name, trussId);
  let total = 0;
  for (const d of distros) {
    for (const ch of d.channels) {
      for (const drop of ch.drops) {
        if (fixtureKey(drop.fixtureRef, drop.trussId) === key) {
          total += drop.qty;
        }
      }
    }
  }
  return total;
}

export function computeUnpoweredFixtures(
  distros: Distro[],
  fixtures: FixtureRef[],
): UnpoweredFixture[] {
  // Group fixtures by name + truss (the Lighting tab can list multiple
  // rows of the same fixture on the same truss).
  const grouped = new Map<string, FixtureRef>();
  for (const f of fixtures) {
    if (!f.name.trim() || !f.systemId) continue;
    const key = fixtureKey(f.name, f.systemId);
    const existing = grouped.get(key);
    if (existing) {
      existing.qty += Math.max(0, f.qty);
    } else {
      grouped.set(key, { ...f, qty: Math.max(0, f.qty) });
    }
  }
  // Sum assigned qty per key in one pass.
  const assigned = new Map<string, number>();
  for (const d of distros) {
    for (const ch of d.channels) {
      for (const drop of ch.drops) {
        const key = fixtureKey(drop.fixtureRef, drop.trussId);
        assigned.set(key, (assigned.get(key) ?? 0) + drop.qty);
      }
    }
  }
  const out: UnpoweredFixture[] = [];
  for (const [key, f] of grouped) {
    const a = assigned.get(key) ?? 0;
    if (a < f.qty) {
      out.push({
        fixtureRef: f.name,
        trussId: f.systemId,
        totalQty: f.qty,
        assignedQty: a,
        remainingQty: f.qty - a,
        wattsPerUnit: f.watts,
      });
    }
  }
  return out;
}

// ─── Plan totals ───────────────────────────────────────────────────────

export type DistroPlanTotals = {
  distroCount: number;
  totalWatts: number;
  worstChannelUtilization: number;
  worstChannelLabel: string;
  worstFeederUtilization: number;
  worstFeederLabel: string;
  unpoweredFixtureCount: number;
  /** Distros with a channel or feeder over capacity. */
  overloadedDistros: number;
  /** Distros in the 80–100 % warn band on a channel or feeder. */
  warningDistros: number;
  /** Distros flagged for phase imbalance > 20 %. */
  imbalancedDistros: number;
};

export function computeDistroPlanTotals(
  loads: DistroLoad[],
  unpowered: UnpoweredFixture[],
): DistroPlanTotals {
  let totalWatts = 0;
  let worstChannelU = 0;
  let worstChannelLabel = "—";
  let worstFeederU = 0;
  let worstFeederLabel = "—";
  let overloadedDistros = 0;
  let warningDistros = 0;
  let imbalancedDistros = 0;
  for (const l of loads) {
    totalWatts += l.totalWatts;
    if (l.feederUtilization > worstFeederU) {
      worstFeederU = l.feederUtilization;
      worstFeederLabel = l.distro.name;
    }
    const distroOver = l.feederStatus === "over" || l.hasChannelOverload;
    const distroWarn =
      !distroOver &&
      (l.feederStatus === "warn" || l.hasChannelWarning);
    if (distroOver) overloadedDistros += 1;
    else if (distroWarn) warningDistros += 1;
    if (l.imbalanceWarn) imbalancedDistros += 1;
    for (const c of l.channels) {
      if (c.utilization > worstChannelU) {
        worstChannelU = c.utilization;
        worstChannelLabel = `${l.distro.name} · Ch${c.channel.index}`;
      }
    }
  }
  return {
    distroCount: loads.length,
    totalWatts,
    worstChannelUtilization: worstChannelU,
    worstChannelLabel,
    worstFeederUtilization: worstFeederU,
    worstFeederLabel,
    unpoweredFixtureCount: unpowered.reduce((n, u) => n + u.remainingQty, 0),
    overloadedDistros,
    warningDistros,
    imbalancedDistros,
  };
}

/** Convenience helper for building a watts lookup from a Show Fixture
 *  list. Falls back to 0 W when a fixture is missing (so the caller
 *  doesn't have to defend against bad references). */
export function makeFixtureWattsLookup(
  fixtures: FixtureRef[],
): FixtureWattsLookup {
  // First match by name + truss (most specific). Then fall back to a
  // truss-agnostic match by name only — useful when the producer has
  // edited the truss assignment on the Lighting tab and the drop is
  // momentarily orphaned.
  const exact = new Map<string, number>();
  const byName = new Map<string, number>();
  for (const f of fixtures) {
    if (!f.name.trim()) continue;
    const w = Math.max(0, f.watts || 0);
    const k1 = fixtureKey(f.name, f.systemId);
    if (!exact.has(k1)) exact.set(k1, w);
    const k2 = f.name.trim().toLowerCase();
    if (!byName.has(k2)) byName.set(k2, w);
  }
  return (name, trussId) => {
    if (!name.trim()) return 0;
    const e = exact.get(fixtureKey(name, trussId));
    if (typeof e === "number") return e;
    const n = byName.get(name.trim().toLowerCase());
    return typeof n === "number" ? n : 0;
  };
}
