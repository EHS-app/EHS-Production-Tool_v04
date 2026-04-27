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
  - **Lighting Plan view** — fixture list with two layers:
    - Linked rows auto-derived from each system's `fixtureRows`. Base info (name/qty/weight/watts/truss) is read-only on this view (edit on rigging side); DMX/position/circuit overlays are stored in `linkedMeta: Record<rigRowId, LinkedMeta>` and persist independently. Orphan meta entries are garbage-collected when the source row/system is deleted.
    - Each fixture in the inventory carries a `dmxModes: DmxMode[]` list (e.g. Mythos 2 → Standard 30ch / Vector 34ch; MAC Aura PXL → Compact 17 / Basic 32 / Extended 89 / Ludicrous 512; etc.). The Lighting Plan's DMX Ch cell renders a mode dropdown for linked rows so the user can pick a known mode and the channel count auto-fills (with a "Custom…" fallback for free entry). Mode selection is stored as `dmxModeIndex` (number for preset, `null` for custom). Defaults to the item's first mode on first link.
    - Standalone "extra" rows added via `+ Add Extra Fixture`, fully editable.
    - Totals dashboard sums both layers. Auto-computed DMX end address (`start + ch*qty − 1`) with >512 overflow warning.
    - Persists to localStorage v2 (key `ehs-rigging-report-v2`, additive/back-compat with v1). Reset clears both views together (incl. linkedMeta).
  - No backend. Single-file `App.tsx`. Top-level state migrates v1 → v2 transparently. Build accepts `BASE_PATH` env for GitHub Pages deploy via `.github/workflows/deploy-pages.yml`.
