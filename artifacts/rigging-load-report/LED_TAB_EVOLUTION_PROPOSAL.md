# LED Tab → Touring-Grade Evolution — Proposal & Roadmap

> **Status:** Proposal only. Nothing in here has been merged. Read, mark up,
> tell me which phase to ship first. Every change is additive +
> migration-safe — existing saved projects keep working untouched.

> **Ground rules (re-stated from your brief):**
> - Do **not** replace what exists. Extend it.
> - Backward-compatible. New fields are optional with safe defaults.
> - Strict TS, modular, no monolithic components, no expensive re-renders.
> - Two modes — **Basic** (today's UX, unchanged) and **Advanced** (new
>   engineering controls), gated by a single toggle in LED Settings.

---

## 1. Updated TypeScript interfaces

All additions live in `lib/led.ts` and are **optional**. Readers treat
`undefined` as today's behaviour.

### 1.1 `LedScreen` — engineering extensions

```ts
export type LedScreen = {
  /* …existing fields stay verbatim… */

  // ── Display engineering ────────────────────────────────────────
  /** Peak brightness in nits. Used by power model + brief. */
  brightnessNits?: number;
  /** 1920 / 2400 / 3840 / 7680 Hz etc. Drives camera-safe checks. */
  refreshRateHz?: number;
  /** 8 / 10 / 12 bit. Feeds processor capacity model. */
  bitDepth?: 8 | 10 | 12;
  /** Toggles HDR profile in the brief + Client Pack. */
  hdrEnabled?: boolean;

  // ── Physical ───────────────────────────────────────────────────
  /** "flat" (default) | "concave" | "convex" | "polyline". */
  curveType?: LedCurveType;
  /** Degrees of bend per seam when curveType ≠ "flat". */
  curveAnglePerSeam?: number;
  /** 0 | 90 | 180 | 270 — rotation applied to every cabinet face. */
  cabinetRotation?: 0 | 90 | 180 | 270;
  /** "opaque" | "mesh" | "transparent" — used for see-through walls. */
  transparencyMode?: LedTransparencyMode;

  // ── Signal ─────────────────────────────────────────────────────
  /** Cabinet → port assignment. Owned by the routing engine; see §2. */
  processorPortAssignments?: LedPortAssignment[];
  /** Hard cap from the cabinet spec (e.g. Uniview UR Pro = 16). */
  maxCabinetsPerDataChain?: number;
  /** Producer enables backup-CAT runs for redundancy. */
  backupSignalEnabled?: boolean;
  /** Producer enables loop-out chains. */
  signalLoopEnabled?: boolean;

  // ── Power ──────────────────────────────────────────────────────
  /** "EU-230" | "US-120" | "US-208" | "JP-100". Drives amperage. */
  voltageRegion?: LedVoltageRegion;
  /** Cap from cabinet spec (e.g. UR Pro = 6 cabinets / 16 A circuit). */
  maxCabinetsPerPowerChain?: number;
  /** PSU overhead %, default 25. */
  powerOverheadPct?: number;
  /** Producer override of the global power factor (default 0.95). */
  powerFactor?: number;

  // ── Broadcast ──────────────────────────────────────────────────
  cameraSafeMode?: boolean;
  scanRateProfile?: "studio-50" | "studio-60" | "live-60" | "custom";
  genlockEnabled?: boolean;

  // ── Rigging accessories (new section on the card) ──────────────
  rigAccessories?: LedRigAccessory[];
};
```

### 1.2 New supporting types

```ts
export type LedCurveType = "flat" | "concave" | "convex" | "polyline";
export type LedTransparencyMode = "opaque" | "mesh" | "transparent";
export type LedVoltageRegion = "EU-230" | "US-120" | "US-208" | "JP-100";

export type LedPortAssignment = {
  /** FK → LedScreenProcessor.id on the same screen. */
  processorId: string;
  /** 1-indexed output port on that processor. */
  portIndex: number;
  /** Cells owned by this port, as cell indexes
   *  (= row * panelsWide + col). Disjoint across ports. */
  cells: number[];
  /** Chain start cabinet (cell index). First in the daisy-chain. */
  chainStart: number;
  /** "row" | "column" | "serpentine-row" | "serpentine-col" | "custom" */
  chainPattern: LedChainPattern;
  /** Optional backup port (same processor or redundant). */
  backupPortIndex?: number;
};

export type LedChainPattern =
  | "row"
  | "column"
  | "serpentine-row"
  | "serpentine-col"
  | "custom";

export type LedRigAccessory = {
  id: string;
  /** Inventory name from "LED Screen" category (incl. beams). */
  inventoryName: string;
  qty: number;
  /** Optional notes — "downstage left fly bar", etc. */
  note?: string;
};
```

### 1.3 `LedSettings` — show-wide additions

```ts
export type LedSettings = {
  /* …existing… */
  uiMode?: "basic" | "advanced";          // default "basic"
  defaultVoltageRegion?: LedVoltageRegion; // default "EU-230"
  defaultPowerFactor?: number;             // default 0.95
  defaultPsuOverheadPct?: number;          // default 25
  defaultBrightnessNits?: number;          // default 5000
  autoTopologyOnAdd?: boolean;             // default false
  redundancyMode?: "none" | "backup" | "main-backup"; // default "none"
};
```

### 1.4 System Designer — new node + edge metadata

```ts
export type LedSystemNodeKind =
  | "screen" | "processor" | "fiberbox" | "psu"
  // NEW:
  | "backup-processor"
  | "media-server"
  | "network-switch"
  | "genlock"
  | "ups"
  | "power-distro";

export type LedSystemEdgeKind =
  | "signal" | "fiber" | "power"
  // NEW:
  | "genlock" | "control" | "redundant-signal" | "redundant-fiber";

export type LedSystemEdge = {
  /* …existing… */
  cableType?: string;       // "Cat6a", "OM3", "SMF", "TrueOne 16A"
  protocol?: string;        // "TICO", "ST2110-22", "HDBaseT"
  bandwidthGbps?: number;
  latencyFrames?: number;
  redundancyRole?: "main" | "backup";
  direction?: "uni" | "bi";
};
```

---

## 2. Migration-safe schema changes

### 2.1 LocalStorage (PersistedV2)

- Bump nothing. PersistedV2 already wraps each screen as JSON, so adding
  optional fields needs **zero migration code** in the reader.
- Add **schema fence** in `normalizeLedScreen()` (new helper) to coerce
  invalid enum values back to defaults (e.g. `curveType = "flat"` if a
  malformed save lands).

### 2.2 Postgres `projects` table

- Project data is stored as a JSONB blob — no DDL changes required.
- Add a `schema_version` field inside the blob (currently implicit) so
  future migrations can be branched. Default `1` on load if absent.

### 2.3 Backward compatibility tests (new — Vitest)

A new file `lib/__tests__/ledMigration.test.ts` with fixtures:
- pre-today saved blob → loads cleanly, no Custom fallbacks
- screen with no engineering fields → all calculations match current values
- screen with `processorPortAssignments` but no ports defined → ignored,
  not crashing.

---

## 3. Calculation-engine architecture

### 3.1 Folder layout (new)

```
src/lib/led/
  engine/
    power.ts           // amperage, PSU overhead, chain validation
    signal.ts          // chain length, port balance, fan-out
    capacity.ts        // processor pixel/output/canvas (today's logic, moved)
    topology.ts        // BFS reachability, auto-topology solver
    redundancy.ts      // main+backup path resolution
    routing.ts         // cabinet-to-port assignment solver
  validation/
    rules.ts           // declarative rule list
    runValidation.ts   // single entry point — returns LedValidationReport
  derived/
    selectors.ts       // memoised selectors over PersistedV2
```

### 3.2 Key principles

- **Pure functions only.** No React imports. Easy to unit-test.
- **Determinism.** Same input → same output. Routing solver uses a stable
  cell-index ordering so it never thrashes between renders.
- **Memoisation at the selector layer**, not inside engines. Components
  consume `useLedDerived(projectId)` which returns memoised slices.

### 3.3 Power engine sketch

```ts
export function estimateAmperage(
  screen: LedScreen,
  panel: LedPanel,
  settings: LedSettings,
): {
  totalWatts: number;
  amps: number;
  region: LedVoltageRegion;
  overheadPct: number;
  chainsNeeded: number;
  chainsConfigured: number;
  warnings: LedWarning[];
} {
  const region = screen.voltageRegion ?? settings.defaultVoltageRegion ?? "EU-230";
  const voltage = VOLTAGE_BY_REGION[region];                  // 230 / 120 / 208 / 100
  const pf      = screen.powerFactor ?? settings.defaultPowerFactor ?? 0.95;
  const overhead= (screen.powerOverheadPct ?? settings.defaultPsuOverheadPct ?? 25) / 100;
  const enabled = enabledPanelCount(screen);
  const brightnessFactor = (screen.brightnessNits ?? settings.defaultBrightnessNits ?? 5000) / 5000;
  // Realistic: PSU draw scales ~linearly with brightness above 30 % floor.
  const watts   = enabled * panel.power * (0.3 + 0.7 * brightnessFactor) * (1 + overhead);
  const amps    = watts / (voltage * pf);
  /* …chain counting + warnings… */
}
```

### 3.4 Signal engine sketch

```ts
export function validateChain(
  cells: number[],           // cabinets owned by this port, in chain order
  cabinetSpec: LedCabinetSpec,
): { ok: boolean; warnings: LedWarning[] } {
  // Checks: length <= cabinetSpec.maxPerChain
  //         total pixels <= portLimit
  //         all cells contiguous in the chain pattern
  //         no loops
}
```

---

## 4. Validation rules (declarative)

`engine/validation/rules.ts` — one source of truth, consumed by the
banner, the screen card, the System Designer, and the brief.

```ts
export type LedRule = {
  id: string;          // "POWER_CHAIN_OVERLOAD"
  level: "info" | "warn" | "error";
  scope: "screen" | "processor" | "system" | "show";
  message: (ctx: LedRuleCtx) => string;   // i18n-keyed
  check: (ctx: LedRuleCtx) => boolean;
};

export const LED_RULES: LedRule[] = [
  { id: "POWER_CHAIN_OVERLOAD", level: "error", scope: "screen", … },
  { id: "DATA_CHAIN_TOO_LONG",  level: "error", scope: "screen", … },
  { id: "PROCESSOR_PORT_OVERLOAD", level: "error", scope: "processor", … },
  { id: "ORPHAN_SCREEN",         level: "warn",  scope: "system", … },
  { id: "FIBER_RUN_TOO_LONG",    level: "warn",  scope: "system", … },
  { id: "CVT10_FANOUT",          level: "error", scope: "system", … },
  { id: "MISSING_BACKUP",        level: "warn",  scope: "screen", … },
  { id: "BROADCAST_SCAN_MISMATCH", level: "warn", scope: "screen", … },
  /* …more… */
];
```

`runValidation(persisted)` returns `{ violations: LedViolation[] }` once,
the UI just renders.

---

## 5. React component changes

### 5.1 Existing components — incremental

| Component | Change | Risk |
|---|---|---|
| `LedScreenReportView.tsx` | Add **Advanced** collapsible block per screen card. Existing fields untouched. | Low |
| `ScreenCard` inspector | Tabs inside the card: **Basic** / **Routing** / **Power** / **Rigging** / **Notes**. Basic tab = today's UI 1:1. | Low |
| `LedSystemDesigner.tsx` | New node-type registrations only. No replacement. | Low |
| Pixel-map canvas | Pass-through overlay layer system (§7). Today's renderer becomes the "base" layer. | Med |

### 5.2 New components

```
src/components/led/
  ScreenCardAdvanced.tsx         // collapsible advanced inspector
  PortMappingPanel.tsx           // cabinet→port grid editor
  PowerChainPanel.tsx            // per-chain amperage gauges
  RigAccessoriesPanel.tsx        // beam + accessory picker
  ValidationDrawer.tsx           // global show-readiness drawer
  ModeToggle.tsx                 // Basic / Advanced switch in LED Settings
  TopologyAutoSuggestDialog.tsx  // optional auto-topology UX
```

### 5.3 State

- One new context: `LedDerivedContext` exposes the memoised selector
  output. Components read derived data instead of recomputing.
- All writes stay on the existing `setLedScreens` / `setLedSettings`
  pattern in `App.tsx` — no new global state lib.

---

## 6. React Flow node / edge extensions

### 6.1 Custom node React components

Each new node kind gets its own component in
`components/led/system/nodes/`, registered through React Flow's
`nodeTypes` map. They share a base `<TopologyNode />` for consistent
chrome (title bar, badges, port handles).

```
nodes/
  ScreenNode.tsx          (exists)
  ProcessorNode.tsx       (exists)
  BackupProcessorNode.tsx (new — visually mirrored, dashed border)
  FiberboxNode.tsx        (exists)
  PsuNode.tsx             (exists)
  MediaServerNode.tsx     (new)
  NetworkSwitchNode.tsx   (new)
  GenlockNode.tsx         (new)
  UpsNode.tsx             (new)
  PowerDistroNode.tsx     (new)
```

### 6.2 Edge metadata UI

Click an edge → inspector pane on the right with: cable type dropdown,
protocol, length m, redundancy role, direction. Defaults preserve
today's behaviour (`signal`, no metadata).

### 6.3 Live overlays on the graph

- Reachability shading — screens not reached from any processor get a
  red halo.
- Redundancy indicator — node corner badge when a node has main + backup
  paths.
- Latency annotation on hover over an edge (sum of upstream
  `latencyFrames`).

---

## 7. SVG renderer upgrades

Goal: keep the existing renderer; add a **layer system** so new visuals
plug in without touching the base.

### 7.1 Layer architecture

```
PixelMapCanvas
  ├─ BaseLayer       (today's cabinets + flow arrows)
  ├─ <LayerStack>
  │   ├─ CabinetIdLayer       (toggleable — labels every cabinet)
  │   ├─ PortAssignmentLayer  (color-tints cells per port; chain arrows)
  │   ├─ RedundancyLayer      (dashed backup-chain arrows)
  │   ├─ DeadCabinetLayer     (X-out a cabinet to simulate a failure)
  │   ├─ GhostCabinetLayer    (faint silhouette of disabled cells)
  │   ├─ RotationLayer        (rotates cabinet glyph by cabinetRotation)
  │   └─ CurvePreviewLayer    (small inset preview of curveType / angle)
  └─ MarkerLayer     (today's +P / +S badges)
```

Each layer is a React component that takes the same screen + viewport
props and renders SVG. Toggleable from the canvas toolbar.

### 7.2 Performance

- Memoise per-screen layer trees on `(screen, layerSettings)` identity.
- Use `<g>` element keys keyed by `screen.id + layer.id` so React reuses
  DOM nodes.
- Pre-compute cell→cabinet-id maps in a derived selector; layers index
  into the map instead of recomputing.
- Heavy layers (PortAssignment with arrows) get a CSS
  `will-change: transform` and use `<path>` not per-cabinet `<line>`.

---

## 8. Export architecture

### 8.1 New export library

```
src/lib/led/export/
  patchSheet.ts        // processor → screen → port table (PDF + CSV)
  cabinetIdReport.ts   // CSV of (screen, cabinet#, row, col, port, chain)
  cableRunSheet.ts     // per-edge cable runs (length, type, label)
  powerDistroSheet.ts  // per-screen amperage + circuit assignment
  signalRoutingReport.ts // diagrammatic + tabular routing
  novastarMapping.ts   // CSV in Novastar Mapper's import format
```

### 8.2 Client Pack PDF (existing — `clientPackExport.ts`)

Add three sub-sections to section 6 ("LED"):
1. **Topology diagram** — System Designer rendered as SVG, exported via
   the same path that already renders the pixel map.
2. **Processor utilization** — bar charts.
3. **Chain map** — pixel map with `PortAssignmentLayer` enabled.

All sub-sections are optional flags so the producer can keep the brief
short.

### 8.3 CSV exports

A single `csvDownload(filename, rows)` helper, used by every CSV export
above so we don't duplicate the BOM logic.

---

## 9. Performance optimizations

### 9.1 Selectors

- `useLedDerived(persisted)` returns:
  - `metricsByScreenId`
  - `validation` (full report)
  - `portMaps` (cabinet→port lookup per screen)
  - `topology` (reachability sets)
- Each piece memoised on its own input slice, so editing a notes field
  doesn't invalidate validation.

### 9.2 React Flow

- Pin `nodeTypes` / `edgeTypes` objects outside the component (already
  done — preserve this).
- Use `react-flow`'s `useNodesState` / `useEdgesState` only for view
  state. Persisted graph stays in our reducer.

### 9.3 SVG

- Cabinet glyph is a single `<symbol>` referenced via `<use>` — already
  partly done; expand to all cabinet variants so the DOM count stays
  near-flat as screens scale.
- Disable layer rendering when zoomed out below a threshold (only show
  base + markers).

### 9.4 Save throughput

- Debounced 5 s cloud save stays. Add a **dirty fence** so unrelated
  edits (e.g. project name) don't trigger a full LED diff.

---

## 10. Phased implementation roadmap

> Each phase ships independently. After every phase the tool is fully
> usable; new behaviour is gated behind the Advanced mode toggle so
> Basic-mode users see no change until phases 1+2 land.

### Phase 0 — Foundations (1 sprint)
Goal: zero user-visible change, unblock everything else.
- [ ] Move `computeScreenMetrics` + cable BOM + Novastar capacity into
      `lib/led/engine/{power,signal,capacity}.ts`. Pure functions.
- [ ] Add `lib/led/validation/{rules,runValidation}.ts` with today's
      checks ported in.
- [ ] Add `useLedDerived` selector hook.
- [ ] Vitest fixtures for backward compat.

### Phase 1 — Engineering fields + Advanced mode (1–2 sprints)
- [ ] Add the optional fields in §1.1 to `LedScreen` + `LedSettings`.
- [ ] Add `<ModeToggle />` in LED Settings.
- [ ] Add tabbed inspector in `ScreenCard` — Basic / Routing / Power /
      Rigging / Notes. Advanced tabs hidden in Basic mode.
- [ ] Add `RigAccessoriesPanel` (uses inventory beams — replaces the
      earlier "go to Rigging Report tab" workaround).
- [ ] Power engine + amperage estimate per screen.
- [ ] Validation drawer renders the current rule set.

### Phase 2 — Processor port mapping (2 sprints — highest priority)
- [ ] Add `LedPortAssignment` data model + routing solver.
- [ ] Build `PortMappingPanel` (cabinet-grid editor with port colors).
- [ ] Auto-balanced routing modes (row, column, serpentine, custom).
- [ ] Add `PortAssignmentLayer` to the SVG canvas.
- [ ] Validation rules: PORT_OVERLOAD, CHAIN_TOO_LONG, ORPHAN_CABINET.
- [ ] Patch-sheet + Novastar-mapping CSV exports.

### Phase 3 — Redundancy + broadcast (1 sprint)
- [ ] Backup port + main/backup edge metadata.
- [ ] `RedundancyLayer` on canvas.
- [ ] Broadcast fields (cameraSafeMode, scanRateProfile, genlockEnabled)
      + matching validation rules.
- [ ] Backup-processor + genlock node types in System Designer.

### Phase 4 — System Designer expansion (1–2 sprints)
- [ ] All new node kinds (§1.4) + their inspectors.
- [ ] Edge metadata UI.
- [ ] Latency + bandwidth annotations.
- [ ] Reachability + redundancy overlays.

### Phase 5 — Auto-topology + curves + transparency (1 sprint)
- [ ] `TopologyAutoSuggestDialog` — opt-in auto-build on screen add.
- [ ] Curve preview + cabinet rotation + transparency rendering layers.
- [ ] Dead-cabinet simulation toggle.

### Phase 6 — Exports completion (1 sprint)
- [ ] Cable run sheet, power distro sheet, signal routing report.
- [ ] Client Pack additions (topology diagram, chain map, processor
      utilization).
- [ ] CSV unification.

### Phase 7 — Polish + perf pass (1 sprint)
- [ ] Cabinet `<symbol>`/`<use>` rollout.
- [ ] Layer-rendering thresholds.
- [ ] Dirty-fence on cloud save.
- [ ] e2e tests on the testing skill.

Total: roughly **9–11 sprints** if executed end-to-end, but every phase
ships value on its own.

---

## What I need from you before I start

1. **Pick the entry point.** I'd recommend shipping **Phase 0** first
   (no user-visible change, makes everything else safe) then **Phase 1**
   (rig accessories on the screen card, Advanced mode, power engine).
   Confirm or tell me which phase matters most.
2. **Confirm engineering targets.**
   - Voltage regions to support? (defaults: EU-230, US-120, US-208, JP-100)
   - Power factor default? (0.95 proposed)
   - Brightness baseline for the "nominal" power figure? (5000 nits proposed)
   - Max cabinets per CAT chain — is 16 right for Uniview UR Pro, or do
     you carry mixed-spec cabinets?
3. **Approve `uiMode` gating** — Basic mode preserves today's UX
   verbatim; Advanced unlocks everything. Or do you want everything
   visible at once?
4. **Naming.** "Advanced engineering mode" OK or do you prefer "Touring
   mode" / "Engineer mode"?

When you've answered those, I'll start with Phase 0 (it's the safest
ground to break before anything user-visible lands).

---

*End of proposal.*
