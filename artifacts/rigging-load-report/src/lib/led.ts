export type LedPanelKey = string;

export type LedPanel = {
  key: LedPanelKey;
  name: string;
  pixelWidth: number;
  pixelHeight: number;
  /** Cabinet width in metres. */
  physicalWidth: number;
  /** Cabinet height in metres. */
  physicalHeight: number;
  /** Cabinet weight in kg. */
  weight: number;
  /** Maximum cabinet power in W (aka "peak white"). */
  power: number;
  /** Official manufacturer bracket part-number / name for this cabinet
   *  type (e.g. Uniview hanging bar). Optional — when blank, the bracket
   *  BOM line for that screen prints "(set bracket on inventory)" so the
   *  producer knows to fill it in but the rest of the report still ships. */
  bracketName?: string;
};

export type LedCustomPanel = {
  pixelWidth: number;
  pixelHeight: number;
  physicalWidth: number;
  physicalHeight: number;
  weight: number;
  power: number;
  /** Same semantics as `LedPanel.bracketName`, scoped to the per-screen
   *  custom-panel override. */
  bracketName?: string;
};

/** A producer-placed annotation on a screen visual, used to show the
 *  crew where to land power or signal cables. `x` and `y` are normalized
 *  coordinates within the screen rectangle (0–1, top-left origin) so a
 *  marker stays in the same spot if the panel grid is later resized. */
export type LedScreenMarker = {
  id: string;
  kind: "power" | "signal";
  /** 1-based index per kind on this screen, used for the visible label
   *  (P1, P2, S1…). Stored rather than recomputed so labels don't shuffle
   *  if the user deletes a middle marker. */
  index: number;
  /** Normalized horizontal position within the screen rect (0 = left,
   *  1 = right). May briefly fall outside [0,1] during a drag; consumers
   *  should clamp at render time. */
  x: number;
  /** Normalized vertical position within the screen rect (0 = top,
   *  1 = bottom). Same clamping note as `x`. */
  y: number;
};

export type LedScreen = {
  id: string;
  name: string;
  panelKey: LedPanelKey;
  panelsWide: number;
  panelsTall: number;
  color: string;
  outputIndex: number | null;
  notes: string;
  customPanel?: LedCustomPanel;
  linked?: boolean;
  sourceRowId?: string;
  /** Multiplier for the centred "Main" / "IMAG" name pill on the visual
   *  and the exported PNG. 1 = built-in default size; 0.5 = half; 2 =
   *  double. Optional so older persisted blobs keep working — readers
   *  treat `undefined` as 1. Always clamped to a sane range at render. */
  nameScale?: number;
  /** Producer-drawn power / signal markers shown to the crew. Optional
   *  for backwards compatibility — readers treat `undefined` as []. */
  markers?: LedScreenMarker[];
  /** Per-screen panel-grid colors. When set, override the global
   *  `ledSettings.panelColorDark/Light` for this screen only — used to
   *  visually distinguish multiple screens on the pixel-map canvas (the
   *  PDF importer auto-assigns a different `LED_PANEL_COLOR_PRESETS`
   *  preset to each new screen). Both fields are optional and either
   *  may be undefined; consumers fall back to the global setting per
   *  field, so older persisted blobs keep working. */
  panelColorDark?: string;
  panelColorLight?: string;
  /** Explicit position of the screen on the pixel-map canvas, in canvas
   *  pixels. When set the screen is rendered at (posX, posY) and is
   *  excluded from the auto-flow layout; when undefined the screen
   *  flows left-to-right with the other auto-positioned screens. Set
   *  by the in-canvas drag handle and cleared by "Reset positions". */
  posX?: number;
  posY?: number;
  /** Sparse list of cell indexes (= row*panelsWide + col) that have been
   *  toggled OFF for this screen — used to draw non-rectangular shapes
   *  like L / U / T / freeform. Disabled cells are excluded from the
   *  cabinet-count, weight, power and pixel totals (the bounding box
   *  width × height is still derived from `panelsWide` × `panelsTall`).
   *  Optional + sparse so older persisted blobs and rectangle screens
   *  carry zero overhead. */
  disabledCells?: number[];
  /** Last `LedShapeTemplate` the producer applied. Used by the brief
   *  to label non-rectangular screens with their template name (e.g.
   *  "L-shape" instead of a generic "Custom shape"). Optional — direct
   *  freeform cell edits leave it undefined so the brief falls back to
   *  the generic label. */
  shapeTemplate?: LedShapeTemplate;
  /** Cell-anchored power / signal markers — distinct from the legacy
   *  free-coord `markers` field. Each marker pins to a specific (col,
   *  row) cabinet so it stays accurate when the producer toggles cells
   *  off or rebuilds the grid. Rendered as small badges in the cell
   *  corner on both the live preview and the exported PNG; also fed
   *  into the cable BOM. Optional for back-compat. */
  panelMarkers?: LedPanelMarker[];
  /** LED video processors attached to THIS screen. Empty / undefined
   *  means "fall back to the global `ledSettings.processorId`" so older
   *  data keeps working. Multi-processor capacity is the sum of each
   *  attached processor's max-pixels, used to flag under-capacity. */
  processors?: LedScreenProcessor[];
  /** Per-screen override of the panel's `bracketName`. Lets a producer
   *  swap the bracket for a one-off screen without touching the panel
   *  inventory. Empty / undefined means "use the panel's bracket". */
  bracketOverride?: string;

  // ── Touring-grade engineering fields (Phase 1+) ────────────────
  // All optional + back-compat. Legacy persisted blobs that don't
  // carry these load identically to today; readers fall back to the
  // show-wide defaults on `LedSettings` (or the proposal-defined
  // nominal values) when a field is absent.

  /** Peak brightness target in nits. Feeds the power engine + brief. */
  brightnessNits?: number;
  /** Refresh rate (Hz). 3840 / 7680 etc. — drives camera-safe checks. */
  refreshRateHz?: number;
  /** Display bit depth: 8 / 10 / 12. */
  bitDepth?: 8 | 10 | 12;
  /** HDR profile enabled. Surfaced in the brief + Client Pack. */
  hdrEnabled?: boolean;

  /** Curvature mode of the wall — "flat" (default) or a curve type. */
  curveType?: LedCurveType;
  /** Degrees of bend per seam when curveType ≠ "flat". */
  curveAnglePerSeam?: number;
  /** Cabinet rotation in degrees (0 / 90 / 180 / 270) — used for
   *  upside-down hanging or sideways stacked walls. */
  cabinetRotation?: 0 | 90 | 180 | 270;
  /** "opaque" (default) | "mesh" | "transparent" for see-through walls. */
  transparencyMode?: LedTransparencyMode;

  /** Cabinet-to-processor-port assignments. Owned by the routing
   *  solver (`lib/led/engine/routing.ts`); also editable manually. */
  processorPortAssignments?: LedPortAssignment[];
  /** Hard cap from the cabinet receiving-card spec (e.g. 16 for UR Pro). */
  maxCabinetsPerDataChain?: number;
  /** Producer enables a redundant CAT-B chain. */
  backupSignalEnabled?: boolean;
  /** Producer enables signal loop-out daisy chains. */
  signalLoopEnabled?: boolean;

  /** Mains voltage region for this screen. Overrides settings default. */
  voltageRegion?: LedVoltageRegion;
  /** Cabinets per power chain (e.g. 6 on a 16 A EU circuit). */
  maxCabinetsPerPowerChain?: number;
  /** PSU overhead %, default 25 — applied on top of catalog wattage. */
  powerOverheadPct?: number;
  /** Override of the show-wide power factor (default 0.95). */
  powerFactor?: number;

  /** Broadcast / camera-safe operation toggle. */
  cameraSafeMode?: boolean;
  /** Scan-rate profile for broadcast. */
  scanRateProfile?: LedScanRateProfile;
  /** Genlock reference required. */
  genlockEnabled?: boolean;

  /** Per-screen rigging accessories (beams, fly bars, ground support).
   *  Each entry references an inventory item by name from the
   *  "LED Screen" category. Weight rolls into screen total when
   *  rendered via the Rig Accessories panel. */
  rigAccessories?: LedRigAccessory[];
  /** When true, beams are auto-suggested from screen width. See the
   *  same field on `LedLinkedMeta` — the two stay in sync. */
  autoFitBeams?: boolean;
};

// ────────────────────────────────────────────────────────────────────
//  Touring-grade engineering — supporting types
// ────────────────────────────────────────────────────────────────────

export type LedCurveType = "flat" | "concave" | "convex" | "polyline";
export type LedTransparencyMode = "opaque" | "mesh" | "transparent";
export type LedVoltageRegion = "EU-230" | "US-120" | "US-208" | "JP-100";
export type LedScanRateProfile =
  | "studio-50"
  | "studio-60"
  | "live-60"
  | "custom";

export const LED_VOLTAGE_REGION_OPTIONS: Array<{
  value: LedVoltageRegion;
  label: string;
}> = [
  { value: "EU-230", label: "EU · 230 V" },
  { value: "US-120", label: "US · 120 V" },
  { value: "US-208", label: "US · 208 V (3-phase)" },
  { value: "JP-100", label: "JP · 100 V" },
];

export const LED_CURVE_TYPE_OPTIONS: Array<{
  value: LedCurveType;
  label: string;
}> = [
  { value: "flat", label: "Flat" },
  { value: "concave", label: "Concave" },
  { value: "convex", label: "Convex" },
  { value: "polyline", label: "Polyline (multi-angle)" },
];

export const LED_TRANSPARENCY_OPTIONS: Array<{
  value: LedTransparencyMode;
  label: string;
}> = [
  { value: "opaque", label: "Opaque" },
  { value: "mesh", label: "Mesh" },
  { value: "transparent", label: "Transparent" },
];

export const LED_SCAN_RATE_OPTIONS: Array<{
  value: LedScanRateProfile;
  label: string;
}> = [
  { value: "studio-50", label: "Studio · 50 Hz" },
  { value: "studio-60", label: "Studio · 60 Hz" },
  { value: "live-60", label: "Live · 60 Hz" },
  { value: "custom", label: "Custom" },
];

export type LedChainPattern =
  | "row"
  | "column"
  | "serpentine-row"
  | "serpentine-col"
  | "custom";

export type LedPortAssignment = {
  /** FK to a `LedScreenProcessor.id` on the same screen, OR the
   *  ad-hoc string id of an external processor in the System Designer
   *  graph. The router uses string equality only. */
  processorId: string;
  /** 1-indexed port number on that processor. */
  portIndex: number;
  /** Enabled cells owned by this port, in chain order. */
  cells: number[];
  /** First cell in the daisy-chain (always === cells[0] unless the
   *  producer reordered the chain). */
  chainStart: number;
  /** Walk pattern used to produce `cells`. Producer can override per
   *  port — e.g. one port row-walked and a sibling column-walked. */
  chainPattern: LedChainPattern;
  /** Optional backup port for redundancy. Same processor or a hot
   *  spare. */
  backupPortIndex?: number;
};

export type LedRigAccessory = {
  id: string;
  /** Inventory name from the "LED Screen" category. Must round-trip
   *  through the rigging report's inventory by exact name. */
  inventoryName: string;
  qty: number;
  /** Free-form note (e.g. "downstage left fly bar"). */
  note?: string;
  /** Auto-suggested by the screen's width-based auto-fit. Stored only
   *  on virtual entries returned by `effectiveRigAccessories` — never
   *  persisted into `LedScreen.rigAccessories` (which always holds the
   *  producer's manual additions). */
  auto?: boolean;
};

/** Catalog row passed in from App.tsx — inventory name + per-unit weight. */
export type LedBeamCatalogItem = { name: string; weight: number };

/** Parse a beam length in metres from its inventory name.
 *  Matches "1m", "0.5 m", "2.0m". Returns null if no length token. */
export function parseBeamLengthM(name: string): number | null {
  const m = name.match(/(\d+(?:\.\d+)?)\s*m\b/i);
  if (!m) return null;
  const v = Number(m[1]);
  return Number.isFinite(v) && v > 0 ? v : null;
}

/** Is this a STRAIGHT hang/stack beam (eligible for width auto-fit)?
 *  Requires the inventory row to look like a beam (name contains
 *  "beam", "hang", or "stack") so unrelated rows that happen to
 *  carry a length token (e.g. "Molton 6x4m") are not pulled into
 *  auto-fit. Excludes corner / angled pieces (90°, "corner",
 *  "angle") which are special-case fittings the producer adds
 *  manually. */
export function isStraightBeam(name: string): boolean {
  if (parseBeamLengthM(name) == null) return false;
  if (!/\bbeam\b|\bhang\b|\bstack\b/i.test(name)) return false;
  if (/90°|90 deg|corner|angle/i.test(name)) return false;
  return true;
}

/** Pick beams from the catalog whose lengths sum to the screen's
 *  physical width, preferring the longest pieces first (greedy).
 *  Returns one accessory entry per length used, with `auto: true`.
 *  Returns [] when the catalog has no straight beams or the width
 *  is zero / not divisible by the smallest beam length. */
export function suggestAutoBeams(
  screen: LedScreen,
  panels: LedPanel[],
  catalog: LedBeamCatalogItem[],
): LedRigAccessory[] {
  const panel = resolveScreenPanel(screen, panels);
  const widthM = screen.panelsWide * panel.physicalWidth;
  if (widthM <= 0) return [];

  // Catalog of straight beams sorted longest → shortest.
  const beams = catalog
    .filter((c) => isStraightBeam(c.name))
    .map((c) => ({ name: c.name, length: parseBeamLengthM(c.name)! }))
    .sort((a, b) => b.length - a.length);
  if (beams.length === 0) return [];

  // Quantize to mm to avoid FP drift, then greedy-pack.
  const EPS = 1e-6;
  let remaining = Math.round(widthM * 1000);
  const out: LedRigAccessory[] = [];
  for (const beam of beams) {
    const beamMm = Math.round(beam.length * 1000);
    if (beamMm <= 0) continue;
    const qty = Math.floor((remaining + EPS) / beamMm);
    if (qty > 0) {
      out.push({
        id: `auto-${screen.id}-${beam.name.replace(/\W+/g, "_")}`,
        inventoryName: beam.name,
        qty,
        auto: true,
      });
      remaining -= qty * beamMm;
    }
    if (remaining <= 0) break;
  }
  // Width not perfectly tileable (e.g. screen has odd half-panel) —
  // we still return what we found; the producer can switch to manual.
  return out;
}

/** Resolve the accessories actually deployed on a screen: the
 *  producer's manual entries plus, when `autoFitBeams` is on, the
 *  width-based suggestion. Used for weight rollup and display. */
export function effectiveRigAccessories(
  screen: LedScreen,
  panels: LedPanel[],
  catalog: LedBeamCatalogItem[],
): LedRigAccessory[] {
  const manual = screen.rigAccessories ?? [];
  if (!screen.autoFitBeams) return manual;
  return [...suggestAutoBeams(screen, panels, catalog), ...manual];
}

/** Sum the weight of a list of accessories against a catalog. */
export function accessoriesWeightKg(
  accessories: LedRigAccessory[],
  catalog: LedBeamCatalogItem[],
): number {
  let w = 0;
  for (const a of accessories) {
    const c = catalog.find((x) => x.name === a.inventoryName);
    if (c) w += c.weight * a.qty;
  }
  return w;
}

export function newRigAccessoryId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `rig-${crypto.randomUUID()}`;
  }
  return `rig-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/** A marker pinned to a specific cabinet on a screen. Differs from
 *  `LedScreenMarker` (free x/y) in that toggling cells off, resizing
 *  the grid, or swapping panel models keeps the marker on the same
 *  CABINET — important for actual power / signal landing instructions
 *  to the crew. */
export type LedPanelMarker = {
  id: string;
  /** "power" lands a TrueOne in-feed; "signal" lands a CAT-from-processor
   *  in-feed. Drives the badge color (red vs blue). */
  kind: "power" | "signal";
  /** 1-based per-kind label index (P1, P2, S1…) — same semantics as the
   *  legacy `LedScreenMarker.index`. */
  index: number;
  /** 0-based column of the anchor cell within the screen's panel grid. */
  col: number;
  /** 0-based row of the anchor cell within the screen's panel grid. */
  row: number;
};

/** A Novastar processor attached to a single LED screen. The full spec
 *  (output count, per-port pixel cap, total pixel cap) lives in
 *  `NOVASTAR_PROCESSOR_CATALOG` keyed by `model`; this carries only
 *  what the user has chosen plus an optional label so the producer can
 *  distinguish "MX40 #1" from "MX40 #2" on the same screen. */
export type LedScreenProcessor = {
  id: string;
  model: NovastarProcessorModel;
  /** Optional producer-typed display label (e.g. "Main", "IMAG-A"). */
  label?: string;
};

export type NovastarProcessorModel = "novastar-mx30" | "novastar-mx40";

/** Hard-coded specs for the Novastar processors the producer actually
 *  owns. Sourced from Novastar's official spec sheets:
 *  - MX30:  https://oss.novastar.tech/.../MX30-LED-Display-Controller-Specifications-V1.0.1.pdf
 *  - MX40 Pro: https://oss.novastar.tech/.../MX40-Pro-LED-Display-Controller-Specifications-V1.2.2.pdf
 *  Per-port and total-pixel caps are the 8-bit @ 60 Hz numbers (the
 *  most permissive); 10-bit / 12-bit / HDR all reduce capacity, so the
 *  capacity banner is a "best-case" check by design. */
export const NOVASTAR_PROCESSOR_CATALOG: Record<
  NovastarProcessorModel,
  {
    name: string;
    outputs: number;
    pixelsPerOutput: number;
    maxPixels: number;
  }
> = {
  "novastar-mx30": {
    name: "Novastar MX30",
    outputs: 10,
    pixelsPerOutput: 650_000,
    maxPixels: 6_500_000,
  },
  "novastar-mx40": {
    name: "Novastar MX40 Pro",
    outputs: 20,
    pixelsPerOutput: 650_000,
    // Spec-sheet hard cap (9.0 M total despite 20×650K theoretical).
    maxPixels: 9_000_000,
  },
};

/** Convenience: list the catalog as an ordered array for menus. */
export const NOVASTAR_PROCESSOR_OPTIONS: Array<{
  model: NovastarProcessorModel;
  name: string;
}> = (Object.keys(NOVASTAR_PROCESSOR_CATALOG) as NovastarProcessorModel[]).map(
  (model) => ({ model, name: NOVASTAR_PROCESSOR_CATALOG[model].name }),
);

/** Generate a stable enough id for a per-screen processor entry. */
export function newProcessorId(): string {
  return `proc_${Math.random().toString(36).slice(2, 10)}`;
}

/** Generate an id for a panel-anchored marker. Same shape as
 *  `newMarkerId` so logs stay consistent. */
export function newPanelMarkerId(): string {
  return `pm_${Math.random().toString(36).slice(2, 10)}`;
}

/** Pick the next 1-based label index for a panel-anchored marker of
 *  `kind`. Mirrors `nextMarkerIndex` for free-coord markers but
 *  considers `panelMarkers` only. */
export function nextPanelMarkerIndex(
  markers: LedPanelMarker[] | undefined,
  kind: LedPanelMarker["kind"],
): number {
  const used = new Set(
    (markers ?? []).filter((m) => m.kind === kind).map((m) => m.index),
  );
  let i = 1;
  while (used.has(i)) i++;
  return i;
}

export type LedLinkedMeta = {
  panelKey: LedPanelKey;
  panelsWide: number;
  panelsTall: number;
  color: string;
  outputIndex: number | null;
  notes: string;
  customPanel?: LedCustomPanel;
  /** Optional user-typed display name for a linked screen. When present it
   *  overrides the auto-generated "<system> · <item>" label so the user can
   *  rename a linked screen to "Main", "IMAG", etc. Empty/undefined means
   *  fall back to the auto-generated name. */
  nameOverride?: string;
  /** Same semantics as `LedScreen.nameScale`. Optional for backwards
   *  compatibility. */
  nameScale?: number;
  /** Same semantics as `LedScreen.markers`. */
  markers?: LedScreenMarker[];
  /** Same semantics as `LedScreen.disabledCells`. */
  disabledCells?: number[];
  /** Same semantics as `LedScreen.shapeTemplate`. */
  shapeTemplate?: LedShapeTemplate;
  /** Same semantics as `LedScreen.panelMarkers`. */
  panelMarkers?: LedPanelMarker[];
  /** Same semantics as `LedScreen.processors`. */
  processors?: LedScreenProcessor[];
  /** Same semantics as `LedScreen.bracketOverride`. */
  bracketOverride?: string;
  // ── Touring-grade (Phase 1-3) — all optional + back-compat ───
  // Without these branches, edits made through the Advanced
  // inspector / RigAccessoriesPanel / PortMappingPanel on a
  // **linked** screen would round-trip to nothing — the meta
  // would be regenerated from the rigging row defaults on the
  // next render. Mirror every persisted advanced field here so
  // linked and standalone screens behave identically.
  brightnessNits?: number;
  refreshRateHz?: number;
  bitDepth?: 8 | 10 | 12;
  hdrEnabled?: boolean;
  curveType?: LedCurveType;
  cabinetRotation?: 0 | 90 | 180 | 270;
  transparencyMode?: LedTransparencyMode;
  processorPortAssignments?: LedPortAssignment[];
  maxCabinetsPerDataChain?: number;
  maxCabinetsPerPowerChain?: number;
  voltageRegion?: LedVoltageRegion;
  powerOverheadPct?: number;
  powerFactor?: number;
  cameraSafeMode?: boolean;
  scanRateProfile?: LedScanRateProfile;
  genlockEnabled?: boolean;
  backupSignalEnabled?: boolean;
  signalLoopEnabled?: boolean;
  curveAnglePerSeam?: number;
  rigAccessories?: LedRigAccessory[];
  /** When true, beams are auto-suggested from the screen's physical
   *  width on top of any manual `rigAccessories`. Default for newly
   *  added screens; legacy screens without this flag stay manual-only. */
  autoFitBeams?: boolean;
};

/** Lower / upper bounds for the name-pill multiplier. Values outside this
 *  range either disappear entirely (nameScale=0) or overflow the screen,
 *  neither of which is useful — we clamp at every read site. */
export const NAME_SCALE_MIN = 0.3;
export const NAME_SCALE_MAX = 4;
export const NAME_SCALE_DEFAULT = 1;

/** Shared name-pill geometry ratios. Both the live SVG preview and the
 *  exported PNG renderer key off these so the producer's preview matches
 *  the file the crew actually receives. Live and export use different
 *  base font sizes (since they render in different coordinate systems),
 *  but the *shape* of the pill — padding and approx text width — must
 *  stay proportional. */
export const PILL_PAD_X_RATIO = 0.7;
export const PILL_PAD_Y_RATIO = 0.35;
export const PILL_CHAR_W_RATIO = 0.6;

/** Normalize a possibly-undefined nameScale into a finite, clamped
 *  number. Used by both the on-screen preview and the PNG export so they
 *  can never disagree on what "scale = 1.7" means. */
export function clampNameScale(value: number | undefined | null): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return NAME_SCALE_DEFAULT;
  }
  if (value < NAME_SCALE_MIN) return NAME_SCALE_MIN;
  if (value > NAME_SCALE_MAX) return NAME_SCALE_MAX;
  return value;
}

/** Pick the next 1-based label index for a marker of `kind` on a screen.
 *  Indexes are per-kind: deleting P1 then adding a new power marker
 *  re-uses index 1, but signal markers count independently. */
export function nextMarkerIndex(
  markers: LedScreenMarker[] | undefined,
  kind: LedScreenMarker["kind"],
): number {
  const used = new Set(
    (markers ?? []).filter((m) => m.kind === kind).map((m) => m.index),
  );
  let i = 1;
  while (used.has(i)) i++;
  return i;
}

/** Generate a marker id that is short, URL-safe, and unique enough for
 *  per-screen scope (markers persist per screen, never globally). */
export function newMarkerId(): string {
  return `m_${Math.random().toString(36).slice(2, 10)}`;
}

export type LedWirePath = "linear" | "serpentine" | "column-serpentine";

/** Per-cell arrow direction returned by `cellArrowDirection()`. `null`
 *  means the cell sits at the very end of the data path so it gets no
 *  arrow. */
export type CellArrowDir = "right" | "left" | "up" | "down" | null;

/** Compute which way the data-flow arrow should point inside the cell at
 *  (col, row), given the screen's grid size and wiring mode. Centralized
 *  so the in-app preview and the PNG export can never disagree. */
export function cellArrowDirection(
  col: number,
  row: number,
  panelsWide: number,
  panelsTall: number,
  wirePath: LedWirePath,
): CellArrowDir {
  if (panelsWide < 1 || panelsTall < 1) return null;
  if (wirePath === "column-serpentine") {
    // Bottom-right cell has no successor — terminus of the snake.
    if (row === panelsTall - 1 && col === panelsWide - 1) return null;
    // Bottom row of every other column shows a → transition to the
    // next column, matching the visual style users expect on processor
    // build maps.
    if (row === panelsTall - 1) return "right";
    // Odd column index (0, 2, 4…) flows DOWN; even (1, 3, 5…) flows UP.
    return col % 2 === 0 ? "down" : "up";
  }
  if (wirePath === "serpentine") {
    const reversed = row % 2 === 1;
    if (reversed) {
      // Right → Left flow. First cell of the row drops down at the
      // start of the previous (left-to-right) row's end; here we just
      // point left between cells. The first cell (col 0) ends the row
      // and drops down to the next row.
      if (col === 0) return row < panelsTall - 1 ? "down" : null;
      return "left";
    }
    // Left → Right flow.
    if (col === panelsWide - 1) return row < panelsTall - 1 ? "down" : null;
    return "right";
  }
  // Linear: every row goes left-to-right. Last column drops down to the
  // start of the next row.
  if (col === panelsWide - 1) return row < panelsTall - 1 ? "down" : null;
  return "right";
}
export type LedOutputMode = "per-screen" | "per-row";
/** How the two `panelColor*` colors are distributed across the panel grid.
 *  - "checker" (default): every panel alternates with its neighbours in
 *    BOTH directions, so each individual panel is always visually
 *    distinct — important for non-square panels (e.g. Uniview 1×0.5 m)
 *    where column-only striping would merge a vertical stack of panels
 *    into a single tall block of one colour.
 *  - "columns": every column of panels uses one colour, every other
 *    column uses the other (the original look). */
export type LedPanelPattern = "checker" | "columns";

export type LedSettings = {
  /** Pixels per processor output (used in per-screen mode). */
  portLimit: number;
  /** Show A1, B1… cell labels on both the on-screen pixel map and PNG export. */
  showLabels: boolean;
  /** Show right-pointing data-flow arrows between cells in the PNG export. */
  showArrows: boolean;
  /** Overlay alignment circle + dashed corner X on the PNG export. */
  showTestPattern: boolean;
  /** Render the screen name as a centered white pill on the PNG export. */
  showScreenName: boolean;
  /** Render the bottom info bar (panel count / resolution / aspect) on PNG. */
  showInfoBar: boolean;
  /** Render the EHS logo in the top-right corner of the PNG export. */
  showLogo: boolean;
  /** Wiring path drawn by the data-flow arrows. */
  wirePath: LedWirePath;
  /** How to assign processor outputs.
   *  - per-screen: one circle per screen (uses portLimit for capacity calc)
   *  - per-row: each panel row of each screen is its own output */
  outputMode: LedOutputMode;
  /** Two colors used for the alternating shading on the panel grid.
   *  Visible in both the in-app preview and the exported PNG. */
  panelColorDark: string;
  panelColorLight: string;
  /** How the two colors are tiled across the panel grid. See `LedPanelPattern`. */
  panelPattern: LedPanelPattern;
  /** Optional id of the chosen LED processor (e.g. "novastar-mx30").
   *  When set, the LED tab shows a capacity banner that compares the
   *  current screens-and-panels totals against the processor's published
   *  pixel / output / canvas-size limits. `null` means "no processor
   *  picked" — capacity validation is hidden. */
  processorId: string | null;

  // ── Touring-grade defaults (Phase 1+) ───────────────────────────
  // All optional + back-compat. Persisted blobs that pre-date these
  // load fine; the normalizer below defaults each one.
  /** UI complexity mode — "basic" preserves today's screen card; the
   *  advanced inspector tabs, port-mapping panel, and validation
   *  drawer are gated behind "advanced". */
  uiMode?: "basic" | "advanced";
  /** Show-wide default voltage region — applied when a screen has no
   *  per-screen `voltageRegion` set. */
  defaultVoltageRegion?: LedVoltageRegion;
  /** Show-wide power factor default (e.g. 0.95). */
  defaultPowerFactor?: number;
  /** Show-wide PSU overhead percentage default (e.g. 25). */
  defaultPsuOverheadPct?: number;
  /** Nominal brightness in nits used when a screen has no per-screen
   *  brightness target (defaults to 5000). */
  defaultBrightnessNits?: number;
  /** When true, adding a screen offers to auto-build a Processor →
   *  Fiberbox → Screen → PSU topology in the System Designer. */
  autoTopologyOnAdd?: boolean;
  /** Redundancy preset: "none" / "backup" / "main-backup". Drives
   *  default `backupSignalEnabled` on newly-created screens. */
  redundancyMode?: "none" | "backup" | "main-backup";
};

export const DEFAULT_LED_SETTINGS: LedSettings = {
  portLimit: 650000,
  showLabels: true,
  showArrows: true,
  showTestPattern: true,
  showScreenName: true,
  showInfoBar: true,
  showLogo: true,
  wirePath: "linear",
  outputMode: "per-screen",
  panelColorDark: "#1f3b8a",
  panelColorLight: "#5a8edc",
  panelPattern: "checker",
  processorId: null,
  uiMode: "basic",
  defaultVoltageRegion: "EU-230",
  defaultPowerFactor: 0.95,
  defaultPsuOverheadPct: 25,
  defaultBrightnessNits: 5000,
  autoTopologyOnAdd: false,
  redundancyMode: "none",
};

/** Curated dual-color presets for the panel grid (dark, light). */
export const LED_PANEL_COLOR_PRESETS: Array<{
  label: string;
  dark: string;
  light: string;
}> = [
  { label: "Blue", dark: "#1f3b8a", light: "#5a8edc" },
  { label: "Red", dark: "#7f1d1d", light: "#ef4444" },
  { label: "Red + Blue", dark: "#3b82f6", light: "#dc4040" },
  { label: "Green", dark: "#14532d", light: "#22c55e" },
  { label: "Purple", dark: "#4c1d95", light: "#a78bfa" },
  { label: "Orange", dark: "#7c2d12", light: "#fb923c" },
  { label: "Teal", dark: "#134e4a", light: "#2dd4bf" },
  { label: "Mono", dark: "#1f2937", light: "#9ca3af" },
];

export const LED_SCREEN_COLORS = [
  "#3b82f6",
  "#ef4444",
  "#10b981",
  "#f59e0b",
  "#8b5cf6",
  "#ec4899",
  "#14b8a6",
  "#f97316",
];

/** Synthetic "Custom panel…" entry — not from rigging inventory. The user
 *  enters pixel/physical/weight/power per-screen via the customPanel field. */
export const CUSTOM_PANEL_KEY = "custom";
export const CUSTOM_LED_PANEL: LedPanel = {
  key: CUSTOM_PANEL_KEY,
  name: "Custom panel…",
  pixelWidth: 128,
  pixelHeight: 128,
  physicalWidth: 0.5,
  physicalHeight: 0.5,
  weight: 7.0,
  power: 175,
};

/** Anything carrying enough info to be exposed as a panel option. The rigging
 *  report's InventoryItem shape conforms to this naturally. */
export type LedPanelSource = {
  name: string;
  weight: number;
  wattage: number;
  pixelWidth?: number;
  pixelHeight?: number;
  physicalWidth?: number;
  physicalHeight?: number;
};

/** Build the LED panel library directly from the rigging inventory. Items
 *  that don't carry pixel/physical info (e.g. Molton fabric) are skipped.
 *  The "Custom panel…" entry is always appended last. */
export function buildLedPanels(items: LedPanelSource[]): LedPanel[] {
  const panels: LedPanel[] = [];
  for (const it of items) {
    if (
      typeof it.pixelWidth === "number" &&
      typeof it.pixelHeight === "number" &&
      typeof it.physicalWidth === "number" &&
      typeof it.physicalHeight === "number" &&
      it.pixelWidth > 0 &&
      it.pixelHeight > 0 &&
      it.physicalWidth > 0 &&
      it.physicalHeight > 0
    ) {
      panels.push({
        key: it.name,
        name: it.name,
        pixelWidth: it.pixelWidth,
        pixelHeight: it.pixelHeight,
        physicalWidth: it.physicalWidth,
        physicalHeight: it.physicalHeight,
        weight: it.weight,
        power: it.wattage,
      });
    }
  }
  panels.push(CUSTOM_LED_PANEL);
  return panels;
}

/** Default panel key for a freshly-added screen.
 *
 *  Preference order (most-realistic-truck-weight first):
 *   1. The "0.5x1m + cable" Uniview cabinet — the standard EHS portrait
 *      cabinet *with* its captive cable loom, so totals reflect what
 *      actually ships out of the warehouse.
 *   2. Any "+ cable" cabinet (future-proof if we add more cable
 *      variants).
 *   3. The first inventory panel.
 *   4. The synthetic Custom panel (inventory had no LED-capable items).
 */
export function defaultPanelKeyOf(panels: LedPanel[]): LedPanelKey {
  const primary = panels.find((p) => /0\.5x1m \+ cable/i.test(p.name));
  if (primary) return primary.key;
  const anyCable = panels.find((p) => /\+ cable/i.test(p.name));
  if (anyCable) return anyCable.key;
  return panels[0]?.key ?? CUSTOM_PANEL_KEY;
}

/** Look up a panel by key. If not found (e.g. an inventory item was renamed
 *  or removed since the screen was saved), fall back to the synthetic Custom
 *  panel rather than the first inventory entry — silently substituting a
 *  similarly-named-but-different panel would corrupt totals. The UI surfaces
 *  the stale key as "(missing)" so the user can re-pick. */
export function getLedPanel(key: LedPanelKey, panels: LedPanel[]): LedPanel {
  return panels.find((p) => p.key === key) ?? CUSTOM_LED_PANEL;
}

/** True if this rigging inventory item is mapped to a panel in the library. */
export function findPanelKeyForInventoryName(
  name: string,
  panels: LedPanel[],
): LedPanelKey | null {
  const found = panels.find((p) => p.key === name);
  return found ? found.key : null;
}

/** Migrate panel keys from older builds to the current inventory-name-based
 *  keys. The catalog was reweighted (10.8→12.3kg, 7.2→8.8kg) and the 0.5×0.5m
 *  cabinet was relabelled as 90°, which means every prior key — pitch-suffixed
 *  slugs, the old landscape orientation, AND the previous-weight name — no
 *  longer resolves on its own. Forward them all so getLedPanel doesn't silently
 *  drop saved screens to Custom (which would corrupt pixel / weight totals).
 *  Unknown keys are still returned as-is so the existing fallback can run. */
export function migrateLedPanelKey(key: string): LedPanelKey {
  switch (key) {
    // 500 × 500 cabinet — old pitch slugs + previous-weight name forward to
    // the current 90° variant. The flat (non-90°) cabinet is no longer in
    // inventory; the 90° row is its closest physical equivalent (same pixel
    // grid + face dimensions) so totals stay sensible.
    case "uniview-ur-pro-05-3.9":
    case "uniview-ur-pro-05-2.9":
    case "Uniview UR Pro 0.5x0.5m (7.2kg)":
      return "Uniview UR Pro 0.5x0.5m 90° (8.8kg)";

    // 500 × 1000 cabinet — old pitch slugs, the legacy landscape-orientation
    // name, and the previous-weight portrait name all forward to the current
    // 12.3 kg entry.
    case "uniview-ur-pro-10-3.9":
    case "uniview-ur-pro-10-2.9":
    case "Uniview UR Pro 1x0.5m (10.8kg)":
    case "Uniview UR Pro 0.5x1m (10.8kg)":
      return "Uniview UR Pro 0.5x1m (12.3kg)";

    default:
      return key;
  }
}

/** Validate a #rrggbb hex color; fall back to `fallback` on anything else. */
function normalizeHexColor(value: unknown, fallback: string): string {
  return typeof value === "string" && /^#[0-9a-fA-F]{6}$/.test(value)
    ? value
    : fallback;
}

export function normalizeLedSettings(s: unknown): LedSettings {
  const obj = (s ?? {}) as Partial<LedSettings>;
  const rawLimit = Number(obj.portLimit);
  const portLimit =
    Number.isFinite(rawLimit) && rawLimit >= 1000
      ? rawLimit
      : DEFAULT_LED_SETTINGS.portLimit;
  const wirePath: LedWirePath =
    obj.wirePath === "serpentine"
      ? "serpentine"
      : obj.wirePath === "column-serpentine"
        ? "column-serpentine"
        : "linear";
  const outputMode: LedOutputMode =
    obj.outputMode === "per-row" ? "per-row" : "per-screen";
  const panelPattern: LedPanelPattern =
    obj.panelPattern === "columns" ? "columns" : "checker";
  const processorId =
    typeof obj.processorId === "string" && obj.processorId.length > 0
      ? obj.processorId
      : null;
  return {
    portLimit,
    showLabels: obj.showLabels !== false,
    showArrows: obj.showArrows !== false,
    showTestPattern: obj.showTestPattern !== false,
    showScreenName: obj.showScreenName !== false,
    showInfoBar: obj.showInfoBar !== false,
    showLogo: obj.showLogo !== false,
    wirePath,
    outputMode,
    panelColorDark: normalizeHexColor(
      obj.panelColorDark,
      DEFAULT_LED_SETTINGS.panelColorDark,
    ),
    panelColorLight: normalizeHexColor(
      obj.panelColorLight,
      DEFAULT_LED_SETTINGS.panelColorLight,
    ),
    panelPattern,
    processorId,
    uiMode: obj.uiMode === "advanced" ? "advanced" : "basic",
    defaultVoltageRegion:
      obj.defaultVoltageRegion === "US-120" ||
      obj.defaultVoltageRegion === "US-208" ||
      obj.defaultVoltageRegion === "JP-100"
        ? obj.defaultVoltageRegion
        : "EU-230",
    defaultPowerFactor:
      typeof obj.defaultPowerFactor === "number" &&
      obj.defaultPowerFactor > 0 &&
      obj.defaultPowerFactor <= 1
        ? obj.defaultPowerFactor
        : 0.95,
    defaultPsuOverheadPct:
      typeof obj.defaultPsuOverheadPct === "number" &&
      obj.defaultPsuOverheadPct >= 0 &&
      obj.defaultPsuOverheadPct <= 100
        ? obj.defaultPsuOverheadPct
        : 25,
    defaultBrightnessNits:
      typeof obj.defaultBrightnessNits === "number" &&
      obj.defaultBrightnessNits > 0
        ? obj.defaultBrightnessNits
        : 5000,
    autoTopologyOnAdd: obj.autoTopologyOnAdd === true,
    redundancyMode:
      obj.redundancyMode === "backup" || obj.redundancyMode === "main-backup"
        ? obj.redundancyMode
        : "none",
  };
}

/** Pick which of the two panel colours a cell at (col, row) should use,
 *  given the active pattern. Centralized so the in-app preview and the
 *  PNG export can never drift out of sync. */
export function panelCellColor(
  col: number,
  row: number,
  pattern: LedPanelPattern,
  dark: string,
  light: string,
): string {
  const useDark =
    pattern === "checker" ? (col + row) % 2 === 0 : col % 2 === 0;
  return useDark ? dark : light;
}

/** Resolve a screen's effective panel (using customPanel if panelKey === custom). */
export function resolveScreenPanel(
  screen: { panelKey: LedPanelKey; customPanel?: LedCustomPanel },
  panels: LedPanel[],
): LedPanel {
  const base = getLedPanel(screen.panelKey, panels);
  if (screen.panelKey === CUSTOM_PANEL_KEY && screen.customPanel) {
    return {
      ...base,
      pixelWidth: screen.customPanel.pixelWidth,
      pixelHeight: screen.customPanel.pixelHeight,
      physicalWidth: screen.customPanel.physicalWidth,
      physicalHeight: screen.customPanel.physicalHeight,
      weight: screen.customPanel.weight,
      power: screen.customPanel.power,
      bracketName: screen.customPanel.bracketName ?? base.bracketName,
    };
  }
  return base;
}

/** Compute the cell index for (col, row) in a `panelsWide`-wide grid.
 *  `disabledCells` stores these indexes sparsely — using a single int
 *  per disabled cell keeps the persisted blob small even for huge
 *  screens. */
export function cellIndex(
  col: number,
  row: number,
  panelsWide: number,
): number {
  return row * panelsWide + col;
}

/** Reverse of `cellIndex` — used by template fills that emit an index
 *  list. */
export function cellFromIndex(
  index: number,
  panelsWide: number,
): { col: number; row: number } {
  return { col: index % panelsWide, row: Math.floor(index / panelsWide) };
}

/** O(1) "is this cell turned OFF on this screen?" lookup, given the
 *  Set returned by `disabledCellSet`. Centralised so the live SVG and
 *  the PNG export can never drift out of sync. */
export function isCellDisabled(
  set: ReadonlySet<number>,
  col: number,
  row: number,
  panelsWide: number,
): boolean {
  return set.has(cellIndex(col, row, panelsWide));
}

/** Build the disabled-cells Set for a screen. Empty Set when the
 *  screen is a clean rectangle (the common case), so the caller can
 *  cheaply early-exit on `set.size === 0`.
 *
 *  IMPORTANT: when the second argument is provided, indices that fall
 *  OUTSIDE the current `panelsWide × panelsTall` grid are dropped.
 *  This prevents stale indices (left over from a larger grid that the
 *  producer later shrunk) from bleeding into the panel/pixel counts
 *  and the cable BOM. Without this guard, shrinking the grid after a
 *  template fill could subtract more cabinets than actually exist. */
export function disabledCellSet(
  screen:
    | { disabledCells?: number[]; panelsWide?: number; panelsTall?: number }
    | undefined,
): Set<number> {
  if (!screen || !screen.disabledCells || screen.disabledCells.length === 0) {
    return new Set();
  }
  const w = screen.panelsWide;
  const h = screen.panelsTall;
  if (typeof w === "number" && typeof h === "number" && w > 0 && h > 0) {
    const max = w * h;
    const out = new Set<number>();
    for (const idx of screen.disabledCells) {
      if (Number.isInteger(idx) && idx >= 0 && idx < max) out.add(idx);
    }
    return out;
  }
  return new Set(screen.disabledCells);
}

/** Cabinet count after subtracting any disabled cells. Used by metrics
 *  and the cable / bracket BOMs. Filters out-of-range / duplicate
 *  indices via `disabledCellSet` so resizing the grid never causes a
 *  negative or over-subtracted count. */
export function enabledPanelCount(screen: LedScreen): number {
  const total = Math.max(0, screen.panelsWide * screen.panelsTall);
  const disabled = disabledCellSet(screen).size;
  return Math.max(0, total - Math.min(disabled, total));
}

export type LedScreenMetrics = {
  panels: number;
  pixelsX: number;
  pixelsY: number;
  /** Pixel count of the ENABLED cabinets only (disabled cells subtracted). */
  pixels: number;
  /** Physical width of the bounding box in metres (panelsWide × panel
   *  width). Note this is the bounding box, not the silhouette of an
   *  L / U / T shape — the bounding box is what matters for floor /
   *  truss footprint and cabling estimates. */
  widthM: number;
  heightM: number;
  /** Surface area of ENABLED cabinets only. */
  areaM2: number;
  /** Total weight of ENABLED cabinets. */
  weightKg: number;
  /** Maximum power of ENABLED cabinets. */
  powerW: number;
};

export function computeScreenMetrics(
  screen: LedScreen,
  panels: LedPanel[],
  /** Optional beam catalog. When provided, rig-accessory weight
   *  (manual + auto-fit) is added to `weightKg`. Omit to get the
   *  bare cabinet weight only. */
  beamCatalog?: LedBeamCatalogItem[],
): LedScreenMetrics {
  const panel = resolveScreenPanel(screen, panels);
  const enabled = enabledPanelCount(screen);
  const pixelsX = screen.panelsWide * panel.pixelWidth;
  const pixelsY = screen.panelsTall * panel.pixelHeight;
  const onePanelPixels = panel.pixelWidth * panel.pixelHeight;
  const accessoryKg = beamCatalog
    ? accessoriesWeightKg(
        effectiveRigAccessories(screen, panels, beamCatalog),
        beamCatalog,
      )
    : 0;
  return {
    panels: enabled,
    pixelsX,
    pixelsY,
    pixels: enabled * onePanelPixels,
    widthM: screen.panelsWide * panel.physicalWidth,
    heightM: screen.panelsTall * panel.physicalHeight,
    areaM2: enabled * (panel.physicalWidth * panel.physicalHeight),
    weightKg: enabled * panel.weight + accessoryKg,
    powerW: enabled * panel.power,
  };
}

// ───────────────────────────────────────────────────────────
// Shape templates
// ───────────────────────────────────────────────────────────

export type LedShapeTemplate =
  | "rectangle"
  | "l-shape"
  | "u-shape"
  | "t-shape"
  | "plus"
  | "stairs"
  | "ribbon"
  | "columns";

export const LED_SHAPE_TEMPLATE_OPTIONS: Array<{
  value: LedShapeTemplate;
  label: string;
  description: string;
}> = [
  { value: "rectangle", label: "Rectangle", description: "All cabinets ON (no disabled cells)" },
  { value: "l-shape", label: "L-shape", description: "Bottom-left quarter removed" },
  { value: "u-shape", label: "U-shape", description: "Top-centre column removed" },
  { value: "t-shape", label: "T-shape", description: "Bottom-left + bottom-right corners removed" },
  { value: "plus", label: "Plus / cross", description: "Four corner blocks removed" },
  { value: "stairs", label: "Stairs", description: "Diagonal step removed top-left" },
  { value: "ribbon", label: "Ribbon", description: "Even rows on, odd rows off (header strip)" },
  { value: "columns", label: "Columns", description: "Every other column off" },
];

/** Compute the disabled-cell index list for a given shape on a
 *  panelsWide × panelsTall grid. Pure / deterministic so the same
 *  template always produces the same shape — useful for both the
 *  live preview and the PDF importer. */
export function computeShapeTemplate(
  template: LedShapeTemplate,
  panelsWide: number,
  panelsTall: number,
): number[] {
  if (panelsWide <= 0 || panelsTall <= 0) return [];
  const w = panelsWide;
  const h = panelsTall;
  const out: number[] = [];
  const off = (col: number, row: number) => {
    if (col < 0 || col >= w || row < 0 || row >= h) return;
    out.push(cellIndex(col, row, w));
  };
  switch (template) {
    case "rectangle":
      return [];
    case "l-shape": {
      // Remove the top-right block (so the L sits with its corner at
      // the bottom-left, the long stroke going right and the tall
      // stroke going up). Cut size: ceil(w/2) × floor(h/2).
      const cutW = Math.ceil(w / 2);
      const cutH = Math.floor(h / 2);
      for (let r = 0; r < cutH; r++) {
        for (let c = w - cutW; c < w; c++) off(c, r);
      }
      return out;
    }
    case "u-shape": {
      // Remove the centre column from the top down to (h-1) so the U
      // opens upward. Cut width is ceil(w/3), centred horizontally.
      const cutW = Math.max(1, Math.floor(w / 3));
      const cutH = Math.max(1, h - 1);
      const cutStartC = Math.floor((w - cutW) / 2);
      for (let r = 0; r < cutH; r++) {
        for (let c = cutStartC; c < cutStartC + cutW; c++) off(c, r);
      }
      return out;
    }
    case "t-shape": {
      // Remove the bottom-left and bottom-right corners — leaves a T
      // (wide top bar + centre stem). Each corner is floor(w/3) wide
      // by (h - ceil(h/3)) tall.
      const armW = Math.max(1, Math.floor(w / 3));
      const stemH = Math.max(1, Math.ceil(h / 3));
      for (let r = stemH; r < h; r++) {
        for (let c = 0; c < armW; c++) off(c, r);
        for (let c = w - armW; c < w; c++) off(c, r);
      }
      return out;
    }
    case "plus": {
      // Cut all four corners. Corner = floor(w/3) × floor(h/3).
      const cw = Math.max(1, Math.floor(w / 3));
      const ch = Math.max(1, Math.floor(h / 3));
      for (let r = 0; r < ch; r++) {
        for (let c = 0; c < cw; c++) off(c, r);
        for (let c = w - cw; c < w; c++) off(c, r);
      }
      for (let r = h - ch; r < h; r++) {
        for (let c = 0; c < cw; c++) off(c, r);
        for (let c = w - cw; c < w; c++) off(c, r);
      }
      return out;
    }
    case "stairs": {
      // Diagonal staircase: top-left rises by one column per row.
      // Cell (c, r) is OFF when c + r < min(w, h) - 1 along the top-
      // left triangle.
      const limit = Math.min(w, h);
      for (let r = 0; r < limit; r++) {
        for (let c = 0; c < limit - 1 - r; c++) off(c, r);
      }
      return out;
    }
    case "ribbon": {
      // Header / status-strip style: keep only the top row and the
      // bottom row, OFF everything in between. Useful for building a
      // banner / ribbon shape. Falls back to "all on" if h <= 2.
      if (h <= 2) return [];
      for (let r = 1; r < h - 1; r++) {
        for (let c = 0; c < w; c++) off(c, r);
      }
      return out;
    }
    case "columns": {
      // Every other column OFF (vertical pillars / sticks look).
      for (let c = 1; c < w; c += 2) {
        for (let r = 0; r < h; r++) off(c, r);
      }
      return out;
    }
  }
}

// ───────────────────────────────────────────────────────────
// Cable + bracket BOM
// ───────────────────────────────────────────────────────────

/** Standard cable lengths used to wire one cabinet to the next. The
 *  user provided these as project defaults — exposed as constants so
 *  the BOM line (and the brief text) all read the same numbers and
 *  any future swap is a single-line change. */
export const SIGNAL_CABLE_LENGTH_M = 1.3;
export const POWER_TRUE1_CABLE_LENGTH_M = 0.6;

export type LedScreenCableBOM = {
  /** Number of inter-cabinet signal jumpers needed (CAT). */
  signalCables: number;
  /** Total signal jumper length in metres. */
  signalLengthM: number;
  /** Number of inter-cabinet TrueOne power jumpers needed. */
  powerCables: number;
  /** Total TrueOne jumper length in metres. */
  powerLengthM: number;
  /** Bracket BOM, one row per distinct bracket (after applying any
   *  per-screen `bracketOverride`). `count` is the cabinet count for
   *  that bracket. */
  brackets: Array<{ name: string; count: number }>;
  /** True when the producer has not (yet) entered a bracket name on
   *  the panel inventory and no per-screen override exists. The UI
   *  uses this to show a soft "(set bracket on inventory)" hint. */
  bracketsUnset: boolean;
};

/** Compute the cable & bracket BOM for a single screen. Daisy-chain
 *  estimate: enabled-panel count - 1, floored at 0 (a single-cabinet
 *  screen needs no inter-cabinet jumpers). The PER-SCREEN drop from
 *  the processor / distro is OUT of scope here — this counts only the
 *  cabinet-to-cabinet jumpers, which is what the user specified. */
export function computeScreenCableBOM(
  screen: LedScreen,
  panels: LedPanel[],
): LedScreenCableBOM {
  const enabled = enabledPanelCount(screen);
  const jumpers = Math.max(0, enabled - 1);
  const panel = resolveScreenPanel(screen, panels);
  const bracketName =
    (screen.bracketOverride && screen.bracketOverride.trim()) ||
    panel.bracketName ||
    "";
  const brackets = enabled > 0
    ? [{ name: bracketName || "(set bracket on inventory)", count: enabled }]
    : [];
  return {
    signalCables: jumpers,
    signalLengthM: jumpers * SIGNAL_CABLE_LENGTH_M,
    powerCables: jumpers,
    powerLengthM: jumpers * POWER_TRUE1_CABLE_LENGTH_M,
    brackets,
    bracketsUnset: enabled > 0 && !bracketName,
  };
}

// ───────────────────────────────────────────────────────────
// Per-screen processor capacity
// ───────────────────────────────────────────────────────────

export type ScreenProcessorCapacity = {
  /** Total Ethernet outputs available across all attached processors. */
  outputs: number;
  /** Sum of each processor's max-pixels cap. */
  maxPixels: number;
  /** Per-output pixel cap (we use the worst of all attached processors
   *  so the warning stays conservative). */
  worstPixelsPerOutput: number;
};

export function computeScreenProcessorCapacity(
  processors: LedScreenProcessor[] | undefined,
): ScreenProcessorCapacity {
  const list = processors ?? [];
  let outputs = 0;
  let maxPixels = 0;
  let worstPpo = Infinity;
  for (const p of list) {
    const spec = NOVASTAR_PROCESSOR_CATALOG[p.model];
    if (!spec) continue;
    outputs += spec.outputs;
    maxPixels += spec.maxPixels;
    if (spec.pixelsPerOutput < worstPpo) worstPpo = spec.pixelsPerOutput;
  }
  return {
    outputs,
    maxPixels,
    worstPixelsPerOutput: worstPpo === Infinity ? 0 : worstPpo,
  };
}

export type LedTotals = {
  screens: number;
  panels: number;
  pixels: number;
  areaM2: number;
  weightKg: number;
  /** Sum of every panel's MAX power in W (peak white). */
  powerW: number;
  portsNeeded: number;
  /** Width in pixels of the widest screen — used by the processor
   *  capacity check to compare against the processor's max canvas width. */
  largestWidthPx: number;
  /** Height in pixels of the tallest screen — same purpose, height axis. */
  largestHeightPx: number;
  /** Pixel count of the single largest screen — used to flag when a
   *  screen by itself exceeds a processor's per-output cap. */
  largestScreenPixels: number;
};

export function outputsForScreen(
  screen: LedScreen,
  settings: LedSettings,
  panels: LedPanel[],
  /** Optional pixels-per-output override. When provided, overrides
   *  `settings.portLimit` for this calculation only — used by the
   *  processor capacity check so we always count outputs at the
   *  PROCESSOR's per-port cap (e.g. 650 000 for Novastar MX30/MX40),
   *  not the user's chosen `portLimit` (which might be higher). */
  portLimitOverride?: number,
): number {
  if (settings.outputMode === "per-row") {
    return Math.max(1, screen.panelsTall);
  }
  const m = computeScreenMetrics(screen, panels);
  const limit = Math.max(1, portLimitOverride ?? settings.portLimit);
  return Math.max(1, Math.ceil(m.pixels / limit));
}

export function computeLedTotals(
  screens: LedScreen[],
  settings: LedSettings,
  panels: LedPanel[],
  /** Optional beam catalog — forwarded to `computeScreenMetrics` so
   *  rig-accessory weight is included in the project-wide `weightKg`. */
  beamCatalog?: LedBeamCatalogItem[],
): LedTotals {
  const t: LedTotals = {
    screens: screens.length,
    panels: 0,
    pixels: 0,
    areaM2: 0,
    weightKg: 0,
    powerW: 0,
    portsNeeded: 0,
    largestWidthPx: 0,
    largestHeightPx: 0,
    largestScreenPixels: 0,
  };
  for (const s of screens) {
    const m = computeScreenMetrics(s, panels, beamCatalog);
    t.panels += m.panels;
    t.pixels += m.pixels;
    t.areaM2 += m.areaM2;
    t.weightKg += m.weightKg;
    t.powerW += m.powerW;
    t.portsNeeded += outputsForScreen(s, settings, panels);
    if (m.pixelsX > t.largestWidthPx) t.largestWidthPx = m.pixelsX;
    if (m.pixelsY > t.largestHeightPx) t.largestHeightPx = m.pixelsY;
    if (m.pixels > t.largestScreenPixels) t.largestScreenPixels = m.pixels;
  }
  return t;
}

const COL_BASE = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
export function colLabel(i: number): string {
  let n = i;
  let out = "";
  do {
    out = COL_BASE[n % 26] + out;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return out;
}

export function newLedScreen(
  defaultPanelKey: LedPanelKey,
  seed?: Partial<LedScreen>,
): LedScreen {
  const id = `led-${Math.random().toString(36).slice(2, 9)}`;
  return {
    id,
    name: seed?.name ?? "Screen",
    panelKey: seed?.panelKey ?? defaultPanelKey,
    panelsWide: seed?.panelsWide ?? 8,
    panelsTall: seed?.panelsTall ?? 4,
    color: seed?.color ?? LED_SCREEN_COLORS[0],
    outputIndex: seed?.outputIndex ?? null,
    notes: seed?.notes ?? "",
    customPanel: seed?.customPanel,
    linked: seed?.linked,
    sourceRowId: seed?.sourceRowId,
    // Default annotations — `undefined` would also be fine (readers
    // tolerate it) but materialising them here keeps the in-memory shape
    // predictable for the spread-based update paths.
    nameScale: seed?.nameScale ?? NAME_SCALE_DEFAULT,
    markers: seed?.markers ? [...seed.markers] : [],
    // Optional per-screen overrides — only forwarded when the seed
    // provides them, so a freshly-added "Add Screen" stays governed by
    // the global panel colours and the auto-flow layout.
    panelColorDark: seed?.panelColorDark,
    panelColorLight: seed?.panelColorLight,
    posX: seed?.posX,
    posY: seed?.posY,
    // Pass through any new shape / cable / processor fields so callers
    // that import a screen with disabled cells, panel markers, or a
    // pre-attached processor list keep that data intact. All optional —
    // a vanilla "Add Screen" omits all four.
    disabledCells: seed?.disabledCells ? [...seed.disabledCells] : undefined,
    panelMarkers: seed?.panelMarkers ? [...seed.panelMarkers] : undefined,
    processors: seed?.processors ? [...seed.processors] : undefined,
    bracketOverride: seed?.bracketOverride,
    // New screens default to auto-fit beams ON so the rigging weight
    // matches the screen geometry without producer effort. Legacy
    // screens loaded from persistence keep their existing flag
    // (undefined → manual-only).
    autoFitBeams: seed?.autoFitBeams ?? true,
  };
}

export function defaultLinkedLedMeta(
  qty: number,
  defaultPanelKey: LedPanelKey,
): LedLinkedMeta {
  const w = Math.max(1, Math.ceil(Math.sqrt(qty)));
  const h = Math.max(1, Math.ceil(qty / w));
  return {
    panelKey: defaultPanelKey,
    panelsWide: w,
    panelsTall: h,
    color: LED_SCREEN_COLORS[0],
    outputIndex: null,
    notes: "",
    nameScale: NAME_SCALE_DEFAULT,
    markers: [],
  };
}
