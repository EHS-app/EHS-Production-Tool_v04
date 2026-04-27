# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.

## Artifacts

- **rigging-load-report** (`artifacts/rigging-load-report`) — EHS Rigging Load Report. A single-page React + Vite stage-tech tool with a top-level view switcher:
  - **Rigging Report view** — multi-system rigging calculator (mirrors the user-supplied HTML): inventory of trusses / fixtures / LED gear, motor selection (EXE Rise D8+), dynamic load factor, multi-point distribution (2–8 points), per-point load calculation with SWL overload detection, side-by-side static/dynamic bar chart, project-wide dashboard, dark/light mode, CSV download and print/export.
  - **Lighting Report view** — fixture list with two layers:
    - Linked rows auto-derived from each system's `fixtureRows`. Base info (name/qty/weight/watts/truss) is read-only on this view (edit on rigging side); DMX/position/circuit overlays are stored in `linkedMeta: Record<rigRowId, LinkedMeta>` and persist independently. Orphan meta entries are garbage-collected when the source row/system is deleted.
    - Each fixture in the inventory carries a `dmxModes: DmxMode[]` list (e.g. Mythos 2 → Standard 30ch / Vector 34ch; MAC Aura PXL → Compact 17 / Basic 32 / Extended 89 / Ludicrous 512; etc.). The Lighting Report's DMX Ch cell renders a mode dropdown for linked rows so the user can pick a known mode and the channel count auto-fills (with a "Custom…" fallback for free entry). Mode selection is stored as `dmxModeIndex` (number for preset, `null` for custom). Defaults to the item's first mode on first link.
    - Standalone "extra" rows added via `+ Add Extra Fixture`, fully editable.
    - Totals dashboard sums both layers. Auto-computed DMX end address (`start + ch*qty − 1`) with >512 overflow warning.
  - **LED Screen Report view** — pixel map generator (inspired by blinkingthings.com / led.fyi). Code lives in `src/lib/led.ts` (types + helpers) and `src/components/LedScreenReportView.tsx` (UI + SVG canvas).
    - **Panel library is derived directly from the rigging report's `inventory["LED Screen"]`**, not hardcoded. Inventory items that carry `pixelWidth/pixelHeight/physicalWidth/physicalHeight` (added as optional fields on `InventoryItem`) become panel options; items without (e.g. Molton fabric) are filtered out by `buildLedPanels()`. A synthetic `CUSTOM_LED_PANEL` ("Custom panel…") entry is appended last for one-off pixel-map overrides via `screen.customPanel`.
    - Linked screens auto-derived from each system's `ledRows` whose item is panel-mappable (`findPanelKeyForInventoryName`). Per-screen layout/output/color/notes/customPanel stored in `ledLinkedMeta: Record<rigRowId, LedLinkedMeta>` and GC'd alongside linkedMeta. First-edit on a linked row seeds from the currently-resolved screen so the qty-derived default layout is preserved.
    - Persisted `panelKey` values from older builds (slug-style like `uniview-ur-pro-05-3.9`) are mapped to the new inventory-name keys via `migrateLedPanelKey()` on load. Unknown keys fall through to a "(missing)" placeholder option in the dropdown, and `getLedPanel()` falls back to `CUSTOM_LED_PANEL` rather than substituting a different inventory panel — this keeps totals honest until the user re-picks.
    - Standalone screens added via `+ Add Screen`, fully editable.
    - Visual SVG canvas: each screen is a grid of color-tinted panels labeled A1, B1, … (Excel-style column letters × row numbers), with a numbered output-assignment circle. Labels auto-hide when cells are too small.
    - Dashboard totals: screens, panels, total pixels, area m², weight kg, power kW, and outputs needed via `outputsForScreen()` — driven by `settings.outputMode` ("per-screen" = `ceil(screen_pixels / portLimit)`; "per-row" = `panelsTall`). `portLimit` default 650,000 px/output. Settings normalized on load to prevent malformed persisted values.
    - **Per-screen PNG export** (`src/lib/ledExport.ts`, action button "PNG" on each row). Builds a self-contained SVG (alternating column shading, A,1 / B,1 cell labels, optional data-flow arrows along `wirePath` linear or serpentine, optional centered white name pill, optional EHS logo top-right, optional bottom info bar with panel count / total panels / pixel resolution / aspect ratio, optional alignment-circle + corner-X test pattern, output badges either per-screen top-left or per-row left edge). Rasterized via `<canvas>` to PNG (longest side capped at 8192 px, aspect preserved). Logo is fetched once and cached as a data URL via `getLogoDataUrl()` to avoid canvas tainting. All toggles live in an "Export options (PNG)" disclosure card backed by `LedSettings.{showLabels, showArrows, showTestPattern, showScreenName, showInfoBar, showLogo, wirePath, outputMode, portLimit}`.
  - All three views persist to localStorage v2 (key `ehs-rigging-report-v2`, additive/back-compat with v1; `ledScreens`, `ledLinkedMeta`, `ledSettings` all optional). Reset clears all three views together.
  - No backend. Single-file `App.tsx`. Top-level state migrates v1 → v2 transparently. Build accepts `BASE_PATH` env for GitHub Pages deploy via `.github/workflows/deploy-pages.yml`.
