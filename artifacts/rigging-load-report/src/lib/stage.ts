/**
 * Stage Report — Nivtec staging calculator.
 *
 * Computes deck breakdown, leg count and (optional) handrail breakdown for a
 * rectangular stage of a given Width × Depth × Height.
 *
 * Numbers below come from the official Nivtec sources:
 *   - Nivtec 2024 catalogue (https://nivtec.com/.../09.-Catalogues_EN.pdf)
 *   - Nivtec set-up rules     (https://nivtec.com/.../02.-Set-up-rules_EN.pdf)
 *   - Nivtec assembly manual  (rental.imersis.ch / NIVTEC_Manual.pdf)
 *
 * Standard Nivtec deck sizes used (and only these):
 *   - 2.0 × 1.0 m  (200 × 100 cm)  — 33 kg / 750 kg/m²
 *   - 1.0 × 1.0 m  (100 × 100 cm)  — 19.5 kg / 750 kg/m²
 *   - 0.5 × 2.0 m  (200 ×  50 cm)  — 22 kg / 750 kg/m² (catalogue uses
 *     two 100×50 panels stacked — modelled here as one combined deck for
 *     tiling convenience).
 *   - 0.5 × 1.0 m  (100 ×  50 cm)  — 11 kg / 750 kg/m²
 *
 * Leg heights available (cm) per Nivtec catalogue:
 *   - Fixed alu legs with swivel base plate: 20 / 40 / 60 / 80 cm
 *   - Adjustable / extension legs:           100 / 120 / 140 cm
 *
 * Bracing requirements per the Nivtec set-up rules:
 *   - From a stage height of 80 cm   → diagonal bracing required.
 *   - Above 140 cm                   → additional horizontal bracing.
 *
 * Handrail lengths available: 1 m and 2 m (greedy fill per enabled side).
 *
 * All dimensions are in metres (0.5 m increments). Internally the tiler
 * works on a half-metre integer grid so a 6 × 4 m stage becomes a 12 × 8
 * cell grid (each cell = 0.5 m × 0.5 m).
 *
 * The "shared" leg mode implements Nivtec's official "4-2-2-1 assembly
 * principle": adjacent decks share their corner legs, so the first deck
 * uses 4 legs, the second 2 more, the third 2 more, and a fourth deck
 * closing a 2×2 block adds only 1 — reducing leg count by up to 60% vs
 * 4-per-deck.
 */

export type StageDeckKey = "2x1" | "1x1" | "0.5x2" | "0.5x1";

export type StageDeck = {
  key: StageDeckKey;
  /** Human label shown in the breakdown. */
  label: string;
  /** Width in metres (long horizontal dimension as oriented in the catalog). */
  width: number;
  /** Depth in metres. */
  depth: number;
  /** Mass per deck in kilograms. */
  weight: number;
  /** Safe Working Load in kg per square metre (for reference only). */
  swl: number;
};

export const STAGE_DECKS: readonly StageDeck[] = [
  {
    key: "2x1",
    label: "Nivtec 2 × 1 m",
    width: 2.0,
    depth: 1.0,
    weight: 33,
    swl: 750,
  },
  {
    key: "1x1",
    label: "Nivtec 1 × 1 m",
    width: 1.0,
    depth: 1.0,
    weight: 19.5,
    swl: 750,
  },
  {
    key: "0.5x2",
    label: "Nivtec 0.5 × 2 m",
    width: 0.5,
    depth: 2.0,
    weight: 22,
    swl: 750,
  },
  {
    key: "0.5x1",
    label: "Nivtec 0.5 × 1 m",
    width: 0.5,
    depth: 1.0,
    weight: 11,
    swl: 750,
  },
];

export type StageLeg = {
  /** Height in centimetres. */
  heightCm: number;
  /** Mass per leg in kilograms. */
  weight: number;
};

export const STAGE_LEGS: readonly StageLeg[] = [
  { heightCm: 20, weight: 1.7 },
  { heightCm: 40, weight: 2.6 },
  { heightCm: 60, weight: 3.5 },
  { heightCm: 80, weight: 4.4 },
  { heightCm: 100, weight: 5.5 },
  { heightCm: 120, weight: 6.5 },
  { heightCm: 140, weight: 7.5 },
];

/** Bracing requirement triggered by a stage / leg height, per the Nivtec
 *  set-up rules. Returned as a short user-facing string the UI can render
 *  next to the leg-height field, or `null` if no bracing is required. */
export function nivtecBracingNote(heightCm: number): string | null {
  if (heightCm > 140) {
    return "Diagonal AND additional horizontal bracing required (Nivtec set-up rules, > 140 cm).";
  }
  if (heightCm >= 80) {
    return "Diagonal bracing required from 80 cm (Nivtec set-up rules).";
  }
  return null;
}

export type StageRail = {
  /** Length in metres. */
  length: number;
  /** Mass in kilograms. */
  weight: number;
};

export const STAGE_RAILS: readonly StageRail[] = [
  { length: 2.0, weight: 5.0 },
  { length: 1.0, weight: 3.0 },
];

/** Which sides of the stage have handrails. Standard convention:
 *  front = audience-facing edge, back = upstage, left/right = stage left/right
 *  from the performer's POV (= viewer's right/left). */
export type StageRailSides = {
  front: boolean;
  back: boolean;
  left: boolean;
  right: boolean;
};

export const DEFAULT_RAIL_SIDES: StageRailSides = {
  front: false,
  back: false,
  left: false,
  right: false,
};

/** How legs are counted across the stage.
 *  - "shared" (default): adjacent decks share their corner legs, so the
 *    total is the union of unique deck-corner positions. This produces
 *    the smallest part count (the classic "4, 2, 2, …" sequence as you
 *    add decks side-by-side) and matches how a typical Nivtec stage is
 *    actually built.
 *  - "perDeck": every single deck gets its own 4 legs, regardless of
 *    neighbours. Use this when you don't want shared legs (e.g. quick
 *    de-rig, mixed configurations, or per-deck rigging). */
export type StageLegMode = "shared" | "perDeck";

export type Stage = {
  id: string;
  name: string;
  /** Width in metres (must be a multiple of 0.5). */
  width: number;
  /** Depth in metres (must be a multiple of 0.5). */
  depth: number;
  /** Leg height in centimetres. Must match one of STAGE_LEGS heights. */
  legHeightCm: number;
  /** How legs are counted (see StageLegMode). */
  legMode: StageLegMode;
  /** Which sides have handrails. */
  rails: StageRailSides;
  notes: string;
};

export type DeckPlacement = {
  key: StageDeckKey;
  /** X position in metres from the front-left corner. */
  x: number;
  /** Y position in metres from the front-left corner. */
  y: number;
  /** Width as placed (metres). Equal to deck.width — orientations are baked into the catalog. */
  w: number;
  /** Depth as placed (metres). Equal to deck.depth. */
  d: number;
};

export type StageCalc = {
  /** Ordered list of placed decks (front-left origin, scanning rows). */
  decks: DeckPlacement[];
  /** Count by deck key (only keys that occur are present). */
  deckCounts: Record<StageDeckKey, number>;
  /** Number of legs needed. In "shared" mode this is the count of unique
   *  deck-corner positions; in "perDeck" mode this is `decks.length × 4`. */
  legCount: number;
  /** Unique deck-corner positions (used to draw the leg dots in shared
   *  mode). Always populated regardless of legMode so the preview can
   *  illustrate either layout. */
  legPositions: { x: number; y: number }[];
  /** Maximum distributed load the stage can carry, in kilograms. Computed
   *  as `areaM2 × ratedSwlPerM2 × heightFactor`, where the rated SWL is
   *  the minimum SWL across the deck types actually used (typ. 750 kg/m²
   *  for Nivtec aluminium decks at low height) and the height factor
   *  derates capacity for taller leg setups (see `heightSwlFactor`). */
  loadCapacityKg: number;
  /** SWL value (kg/m²) actually used after height derating. Surfaced so
   *  the UI can show "X kg/m² @ <height>cm" alongside the total. */
  effectiveSwlPerM2: number;
  /** Total weight of decks (kg). */
  deckWeight: number;
  /** Total weight of all legs (kg). */
  legWeight: number;
  /** Per-side rail breakdown (length in metres + a count of 2m and 1m pieces). */
  railBreakdown: {
    side: keyof StageRailSides;
    lengthM: number;
    count2m: number;
    count1m: number;
  }[];
  /** Total count of 2m rails across all enabled sides. */
  rails2mTotal: number;
  /** Total count of 1m rails across all enabled sides. */
  rails1mTotal: number;
  /** Total length of railing in metres. */
  railLengthTotal: number;
  /** Total weight of railing (kg). */
  railWeight: number;
  /** Combined weight of decks + legs + rails (kg). */
  totalWeight: number;
  /** Stage area in m². */
  areaM2: number;
  /** True when the stage size could be tiled with the standard decks. */
  fits: boolean;
};

export const STAGE_LEG_HEIGHTS_CM = STAGE_LEGS.map((l) => l.heightCm);

const HALF_M = 0.5;
/** All deck placements in half-metre cells, sorted largest-area-first then by
 *  the orientation we prefer (catalog orientation first, rotated second).
 *  Each non-square deck is listed in BOTH orientations so the greedy tiler
 *  can rotate it to fill awkward edges (e.g. a 0.5 × 1 m gap can be filled
 *  by a 0.5×1 deck rotated 90°, and a 1 × 0.5 m strip can be filled with one
 *  rotated 2×1 or 0.5×1). The original catalog `key` is preserved so the
 *  breakdown table still groups by physical deck type. */
const DECK_CELLS: ReadonlyArray<{ key: StageDeckKey; cw: number; cd: number }> = [
  { key: "2x1", cw: 4, cd: 2 },     // 2.0 × 1.0  catalog orientation
  { key: "2x1", cw: 2, cd: 4 },     // 1.0 × 2.0  rotated
  { key: "1x1", cw: 2, cd: 2 },     // 1.0 × 1.0
  { key: "0.5x2", cw: 1, cd: 4 },   // 0.5 × 2.0  catalog orientation
  { key: "0.5x2", cw: 4, cd: 1 },   // 2.0 × 0.5  rotated
  { key: "0.5x1", cw: 1, cd: 2 },   // 0.5 × 1.0  catalog orientation
  { key: "0.5x1", cw: 2, cd: 1 },   // 1.0 × 0.5  rotated
];

/** Snap a metre value to the half-metre grid. */
export function snapHalfMetre(m: number): number {
  return Math.max(0, Math.round(m / HALF_M) * HALF_M);
}

/**
 * Greedy tiler. Scans cells row-by-row top-to-bottom, left-to-right; at each
 * empty cell it places the largest deck (from DECK_CELLS) that fits without
 * overlap and without overflowing the stage. Any cell that cannot be filled
 * causes `fits = false`.
 */
export function tileStage(
  widthM: number,
  depthM: number,
): { placements: DeckPlacement[]; fits: boolean } {
  const W = Math.round(widthM / HALF_M);
  const D = Math.round(depthM / HALF_M);
  if (W <= 0 || D <= 0) return { placements: [], fits: false };

  const occ: boolean[] = new Array(W * D).fill(false);
  const idx = (cx: number, cy: number) => cy * W + cx;
  const fits = (cx: number, cy: number, cw: number, cd: number) => {
    if (cx + cw > W || cy + cd > D) return false;
    for (let y = cy; y < cy + cd; y++) {
      for (let x = cx; x < cx + cw; x++) {
        if (occ[idx(x, y)]) return false;
      }
    }
    return true;
  };
  const fill = (cx: number, cy: number, cw: number, cd: number) => {
    for (let y = cy; y < cy + cd; y++) {
      for (let x = cx; x < cx + cw; x++) {
        occ[idx(x, y)] = true;
      }
    }
  };

  const placements: DeckPlacement[] = [];
  let allFilled = true;

  for (let cy = 0; cy < D; cy++) {
    for (let cx = 0; cx < W; cx++) {
      if (occ[idx(cx, cy)]) continue;
      let placed = false;
      for (const d of DECK_CELLS) {
        if (fits(cx, cy, d.cw, d.cd)) {
          fill(cx, cy, d.cw, d.cd);
          placements.push({
            key: d.key,
            x: cx * HALF_M,
            y: cy * HALF_M,
            w: d.cw * HALF_M,
            d: d.cd * HALF_M,
          });
          placed = true;
          break;
        }
      }
      if (!placed) {
        // Mark as filled so we don't loop forever, but flag the failure.
        occ[idx(cx, cy)] = true;
        allFilled = false;
      }
    }
  }

  return { placements, fits: allFilled };
}

function legWeight(heightCm: number): number {
  const leg = STAGE_LEGS.find((l) => l.heightCm === heightCm);
  return leg?.weight ?? 0;
}

/**
 * Conservative SWL derating by leg height. Aluminium platform systems
 * (Nivtec, Litec, Prolyte) all publish height-dependent capacity tables;
 * the exact numbers vary by brand and bracing configuration, but the
 * shape is consistent: full rated load at low heights, dropping with
 * height. We use a simple lookup so the user sees a realistic, safety-
 * conscious capacity number rather than the optimistic "rated" figure.
 *
 *   ≤  60 cm → 1.00 (full rating)
 *      80 cm → 0.85
 *     100 cm → 0.70
 *     120 cm → 0.55
 *     140 cm → 0.45
 *
 * If your manufacturer datasheet says otherwise, use the lower number.
 */
function heightSwlFactor(heightCm: number): number {
  if (heightCm <= 60) return 1.0;
  if (heightCm <= 80) return 0.85;
  if (heightCm <= 100) return 0.7;
  if (heightCm <= 120) return 0.55;
  return 0.45;
}

/**
 * Greedy rail breakdown for a single side: prefer 2 m pieces, then fill the
 * remainder with 1 m pieces. Sides whose length isn't a multiple of 1 m
 * (e.g. 1.5 m) round up to the next metre — Nivtec rail kits don't include
 * sub-metre pieces.
 */
function railsForSide(lengthM: number): { count2m: number; count1m: number } {
  const round = Math.max(0, Math.ceil(lengthM));
  const count2m = Math.floor(round / 2);
  const count1m = round - count2m * 2;
  return { count2m, count1m };
}

export function computeStage(stage: Stage): StageCalc {
  const { placements, fits } = tileStage(stage.width, stage.depth);

  // Deck counts.
  const deckCounts = {
    "2x1": 0,
    "1x1": 0,
    "0.5x2": 0,
    "0.5x1": 0,
  } as Record<StageDeckKey, number>;
  let deckWeight = 0;
  for (const p of placements) {
    deckCounts[p.key] += 1;
    const def = STAGE_DECKS.find((d) => d.key === p.key);
    if (def) deckWeight += def.weight;
  }

  // Leg positions: union of all deck corners. Always computed so the
  // preview can draw them in shared mode; perDeck mode draws its own.
  const corners = new Set<string>();
  for (const p of placements) {
    const x1 = p.x;
    const y1 = p.y;
    const x2 = p.x + p.w;
    const y2 = p.y + p.d;
    corners.add(`${x1.toFixed(2)},${y1.toFixed(2)}`);
    corners.add(`${x2.toFixed(2)},${y1.toFixed(2)}`);
    corners.add(`${x1.toFixed(2)},${y2.toFixed(2)}`);
    corners.add(`${x2.toFixed(2)},${y2.toFixed(2)}`);
  }
  const legPositions = [...corners].map((c) => {
    const [x, y] = c.split(",").map(Number);
    return { x, y };
  });
  const legCount =
    stage.legMode === "perDeck" ? placements.length * 4 : corners.size;
  const legW = legWeight(stage.legHeightCm);
  const legWeightTotal = legCount * legW;

  // Rails by side. front/back run along the width; left/right run along the depth.
  const sideLengths: Record<keyof StageRailSides, number> = {
    front: stage.width,
    back: stage.width,
    left: stage.depth,
    right: stage.depth,
  };
  const railBreakdown: StageCalc["railBreakdown"] = [];
  let rails2mTotal = 0;
  let rails1mTotal = 0;
  let railLengthTotal = 0;
  let railWeight = 0;
  (Object.keys(sideLengths) as (keyof StageRailSides)[]).forEach((side) => {
    if (!stage.rails[side]) return;
    const lengthM = sideLengths[side];
    const { count2m, count1m } = railsForSide(lengthM);
    railBreakdown.push({ side, lengthM, count2m, count1m });
    rails2mTotal += count2m;
    rails1mTotal += count1m;
    railLengthTotal += count2m * 2 + count1m * 1;
    railWeight +=
      count2m * (STAGE_RAILS.find((r) => r.length === 2)?.weight ?? 0) +
      count1m * (STAGE_RAILS.find((r) => r.length === 1)?.weight ?? 0);
  });

  // Load capacity: minimum SWL across used deck types × placed area ×
  // height factor. We use the SUM OF PLACED DECK AREAS (not the
  // requested stage W×D) so partial tilings (`fits === false`, e.g. a
  // 5.5×3.5 m stage with unfillable 0.5×0.5 gaps) don't overstate the
  // safe load. Falls back to 0 if no decks were placed.
  const usedSwls = placements
    .map((p) => STAGE_DECKS.find((d) => d.key === p.key)?.swl ?? 0)
    .filter((s) => s > 0);
  const minSwl = usedSwls.length > 0 ? Math.min(...usedSwls) : 0;
  const factor = heightSwlFactor(stage.legHeightCm);
  const effectiveSwlPerM2 = Math.round(minSwl * factor);
  const areaM2 = stage.width * stage.depth;
  const placedAreaM2 = placements.reduce((sum, p) => sum + p.w * p.d, 0);
  const loadCapacityKg = Math.round(placedAreaM2 * effectiveSwlPerM2);

  return {
    decks: placements,
    deckCounts,
    legCount,
    legPositions,
    deckWeight,
    legWeight: legWeightTotal,
    railBreakdown,
    rails2mTotal,
    rails1mTotal,
    railLengthTotal,
    railWeight,
    totalWeight: deckWeight + legWeightTotal + railWeight,
    areaM2,
    fits,
    loadCapacityKg,
    effectiveSwlPerM2,
  };
}

export type StageTotals = {
  stageCount: number;
  totalArea: number;
  totalDeckWeight: number;
  totalLegCount: number;
  totalLegWeight: number;
  totalRailLength: number;
  totalRailWeight: number;
  totalWeight: number;
  /** Sum of per-stage `loadCapacityKg` — i.e. how much weight all stages
   *  combined can carry as distributed load. */
  totalLoadCapacityKg: number;
  /** Aggregate deck counts across all stages, by deck key. */
  deckCountsByKey: Record<StageDeckKey, number>;
  /** Aggregate leg counts across all stages, by leg height (cm). */
  legCountsByHeight: Record<number, number>;
  /** Aggregate rail counts (1m + 2m totals across all stages). */
  rails2mTotal: number;
  rails1mTotal: number;
};

export function computeStageTotals(
  stages: Stage[],
  calcs: StageCalc[],
): StageTotals {
  const deckCountsByKey: Record<StageDeckKey, number> = {
    "2x1": 0,
    "1x1": 0,
    "0.5x2": 0,
    "0.5x1": 0,
  };
  const legCountsByHeight: Record<number, number> = {};
  let totalArea = 0;
  let totalDeckWeight = 0;
  let totalLegCount = 0;
  let totalLegWeight = 0;
  let totalRailLength = 0;
  let totalRailWeight = 0;
  let totalWeight = 0;
  let totalLoadCapacityKg = 0;
  let rails2mTotal = 0;
  let rails1mTotal = 0;

  stages.forEach((stage, i) => {
    const calc = calcs[i];
    if (!calc) return;
    totalArea += calc.areaM2;
    totalDeckWeight += calc.deckWeight;
    totalLegCount += calc.legCount;
    totalLegWeight += calc.legWeight;
    totalRailLength += calc.railLengthTotal;
    totalRailWeight += calc.railWeight;
    totalWeight += calc.totalWeight;
    totalLoadCapacityKg += calc.loadCapacityKg;
    rails2mTotal += calc.rails2mTotal;
    rails1mTotal += calc.rails1mTotal;
    (Object.keys(calc.deckCounts) as StageDeckKey[]).forEach((k) => {
      deckCountsByKey[k] += calc.deckCounts[k];
    });
    legCountsByHeight[stage.legHeightCm] =
      (legCountsByHeight[stage.legHeightCm] ?? 0) + calc.legCount;
  });

  return {
    stageCount: stages.length,
    totalArea,
    totalDeckWeight,
    totalLegCount,
    totalLegWeight,
    totalRailLength,
    totalRailWeight,
    totalWeight,
    totalLoadCapacityKg,
    deckCountsByKey,
    legCountsByHeight,
    rails2mTotal,
    rails1mTotal,
  };
}

/**
 * Validate / repair a stage object loaded from localStorage. Older or
 * partial payloads may be missing fields (e.g. `rails`) which would
 * crash the renderer on `stage.rails.front`. Anything missing or out of
 * range falls back to a safe default.
 */
export function normalizeStage(raw: Partial<Stage>): Stage {
  const validHeights = new Set(STAGE_LEG_HEIGHTS_CM);
  const id =
    typeof raw.id === "string" && raw.id.length > 0
      ? raw.id
      : typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `stage-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const width = snapHalfMetre(
    typeof raw.width === "number" && raw.width > 0 ? raw.width : 6,
  );
  const depth = snapHalfMetre(
    typeof raw.depth === "number" && raw.depth > 0 ? raw.depth : 4,
  );
  const legHeightCm =
    typeof raw.legHeightCm === "number" && validHeights.has(raw.legHeightCm)
      ? raw.legHeightCm
      : 60;
  const r = (raw.rails ?? {}) as Partial<StageRailSides>;
  const rails: StageRailSides = {
    front: !!r.front,
    back: !!r.back,
    left: !!r.left,
    right: !!r.right,
  };
  const legMode: StageLegMode =
    raw.legMode === "perDeck" ? "perDeck" : "shared";
  return {
    id,
    name: typeof raw.name === "string" ? raw.name : "Stage",
    width: Math.max(0.5, width),
    depth: Math.max(0.5, depth),
    legHeightCm,
    legMode,
    rails,
    notes: typeof raw.notes === "string" ? raw.notes : "",
  };
}

/** Make a sane default new stage. */
export function makeDefaultStage(name: string): Stage {
  return {
    id:
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `stage-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name,
    width: 6,
    depth: 4,
    legHeightCm: 60,
    legMode: "shared",
    rails: { ...DEFAULT_RAIL_SIDES },
    notes: "",
  };
}
