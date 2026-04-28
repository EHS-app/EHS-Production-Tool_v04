/** Lighting → Power Plan — data model, defaults and per-phase load
 *  calculations.
 *
 *  Mirrors the "Power Calculation" page from the EHS spreadsheet: you
 *  define one or more 3-phase circuits ("HOT 1", "HOT 2" …), assign
 *  items (typically lighting fixtures) to phase L1, L2 or L3 with a
 *  quantity and a per-unit wattage, and the app computes the load on
 *  each phase in W and A, plus % of the per-phase capacity.
 *
 *  v1 keeps things deliberately simple:
 *    - Only 3-phase circuits (3 phases L1/L2/L3).
 *    - Per-phase capacity = voltage × ampsPerPhase (e.g. 230 V × 32 A
 *      = 7360 W). Total circuit capacity = 3 × per-phase.
 *    - Items are free-text rows. Linking to existing rigging/lighting
 *      fixtures can come later.
 *    - Money/PF/derating not modelled. */

export const POWER_PHASES = ["L1", "L2", "L3"] as const;
export type PowerPhase = (typeof POWER_PHASES)[number];

export type PowerItem = {
  id: string;
  /** Display name, e.g. "Wash – R1 BeamWash". */
  name: string;
  /** Number of identical units on this row. Always >= 1. */
  qty: number;
  /** Continuous draw per unit, in watts. >= 0. */
  wattsPerUnit: number;
  /** Which phase the item is plugged into. */
  phase: PowerPhase;
  /** Free-form notes (e.g. "Truss SR", "Spare"). */
  notes: string;
};

export type PowerCircuit = {
  id: string;
  /** Circuit name, e.g. "HOT 1". */
  name: string;
  /** Where this circuit feeds from / its physical label, e.g.
   *  "PD11 - 230V 32A Bary". Free text, optional. */
  source: string;
  /** Phase voltage in V (line-to-neutral). Default 230. */
  voltage: number;
  /** Breaker rating per phase, in A. Default 32. */
  ampsPerPhase: number;
  /** Items connected to this circuit (each tagged with a phase). */
  items: PowerItem[];
};

export type PowerPlan = {
  circuits: PowerCircuit[];
};

function newId(prefix: string): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
}

/** Create a fresh item, defaulting to L1. */
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

/** Create a fresh circuit named after its position (1-based index).
 *  Defaults: 230 V / 32 A / 3-phase. */
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

/** Empty plan with no circuits. Show first-run "+ Add circuit" CTA. */
export function defaultPowerPlan(): PowerPlan {
  return { circuits: [] };
}

function isPhase(v: unknown): v is PowerPhase {
  return typeof v === "string" && (POWER_PHASES as readonly string[]).includes(v);
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

export function normalizePowerPlan(raw: unknown): PowerPlan {
  if (!raw || typeof raw !== "object") return defaultPowerPlan();
  const r = raw as Record<string, unknown>;
  const circuits = Array.isArray(r.circuits)
    ? r.circuits.map((c, i) => normalizeCircuit(c, i + 1))
    : [];
  return { circuits };
}

export type PhaseLoad = {
  phase: PowerPhase;
  /** Total continuous draw on this phase, in watts. */
  watts: number;
  /** Total continuous draw on this phase, in amps (W / V). */
  amps: number;
  /** Capacity of this phase in watts (V × A). */
  capacityWatts: number;
  /** load / capacity, 0–∞. 1.0 == exactly at breaker. */
  ratio: number;
};

export type CircuitLoad = {
  /** Per-phase loads, one entry per L1/L2/L3 in POWER_PHASES order. */
  phases: PhaseLoad[];
  /** Sum of all three phase loads, in watts. */
  totalWatts: number;
  /** Sum of all three phase capacities, in watts. */
  totalCapacityWatts: number;
  /** Worst phase ratio (max of the three). Drives the colour. */
  worstRatio: number;
};

/** Severity bucket used by the UI to colour bars/badges. */
export type LoadSeverity = "ok" | "warn" | "over";

export function severityForRatio(ratio: number): LoadSeverity {
  if (ratio > 1) return "over";
  if (ratio >= 0.8) return "warn";
  return "ok";
}

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
  /** Number of circuits in the plan. */
  circuitCount: number;
  /** Number of items across all circuits. */
  itemCount: number;
  /** Sum of all per-circuit total loads, in watts. */
  totalWatts: number;
  /** Sum of all per-circuit capacities, in watts. */
  totalCapacityWatts: number;
  /** Number of circuits whose worst phase exceeds capacity (ratio > 1). */
  overloadedCircuits: number;
  /** Number of circuits whose worst phase is in the warning band (>= 0.8
   *  and <= 1.0). */
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
