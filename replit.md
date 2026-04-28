# Overview

This project is a pnpm workspace monorepo designed as an internal stage-tech tool for EHS Rigging Load Report. It provides specialized reporting views for Rigging, Lighting, LED Screens, and Stage, aiming to streamline calculations and inventory management for event production. Key functionalities include load calculation, DMX channel management, pixel mapping, and stage design. The application is secured with invitation-only access via Clerk sign-in.

# User Preferences

- **Internal Tool**: This is an internal tool, so there is intentionally no public landing page.
- **Invitation-Only Access**: Access is by invitation only. To request an invite, users should email utleie@ehs.no.
- **No Sign-Up**: The sign-up footer link is hidden, and no `/sign-up` route exists.
- **No Google Sign-in**: The Google "Continue with Google" button is hidden.
- **No Client-side Credentials**: Admin passwords should not touch the browser.
- **Development Auto-sign-in**: In development, the preview should auto-log the user in as Admin to avoid manual credential entry on reloads. This functionality must be strictly gated by `NODE_ENV` / `import.meta.env.DEV` and not leak to production builds.

# System Architecture

## Monorepo Structure
- **Tooling**: pnpm workspaces
- **Language**: TypeScript 5.9
- **Package Manager**: pnpm
- **Node.js**: Version 24

## API and Data
- **API Framework**: Express 5
- **Database**: PostgreSQL with Drizzle ORM
- **Validation**: Zod and `drizzle-zod`
- **API Codegen**: Orval, from OpenAPI specifications

## Build and Deployment
- **Build Tool**: esbuild for CJS bundles
- **Deployment**: Supports GitHub Pages via `BASE_PATH` environment variable

## Authentication
- **Provider**: Clerk for sign-in and user management. Sign-up is restricted to invitation only, and Google OAuth is disabled.
- **Admin Setup**: Seeded admin account for `olti@ehs.no` provisioned via Clerk Backend API.
- **Dev Auto-sign-in**: A development-only feature that auto-logs in as Admin via Clerk's ticket strategy, ensuring no admin credentials reach the client. This is strictly guarded by `NODE_ENV`.

## UI/UX and Features
- **Frontend**: Single-page application using React and Vite.
- **Theme**: Dark/light mode toggle with persistence and Clerk integration.
- **Rigging Report View**: Multi-system rigging calculator with inventory management, motor selection (EXE Rise D8+), dynamic load factor, multi-point load distribution, SWL overload detection, visualizations, dashboard, and export functionality.
- **Lighting Report View**: Fixture list derived from rigging, DMX mode selection, channel auto-fill, standalone fixture rows, and DMX address calculation.
    - **Power Plan**: A section above the fixture list (modelled after page 1 of the EHS "Power Calculation" spreadsheet) where you build a list of power circuits ("HOT 1", "HOT 2" …). Each circuit has an editable name, source label (e.g. "PD11 - 230V 32A"), voltage (default 230) and amps-per-phase (default 32). The card shows three colour-coded phase tiles (L1 / L2 / L3) with live load (W and A) and a percent-of-capacity bar; the card border turns amber at ≥80% and red at >100% on the worst phase. Items inside a circuit are free-form rows tagged with a phase, qty and watts/unit; subtotals (W and A per row) and per-phase aggregates are computed from `computeCircuitLoad()` in `lib/power.ts` (per-phase capacity = voltage × ampsPerPhase, severity buckets `ok` / `warn` / `over`). The header dashboard shows total circuits, total items, total planned watts, total capacity, and counts of over-capacity / near-limit circuits. State lives in `App.tsx` as `power: PowerPlan` and is persisted under `power` in `localStorage` v2; reset clears it. UI is in `components/PowerPlanView.tsx`; styles in `index.css` under `.power-plan*`.
- **LED Screen Report View**: Pixel map generator, dynamic panel library, visual SVG canvas for screen layouts, PNG export, dual panel color picker, wire-path modes (linear, serpentine, column-serpentine), LED processor capacity checks (Novastar MX30/MX40), and a dashboard for screen metrics.
- **Rigg Plan View**: Top-down floor plan with venue dimensions, dynamic truss placement from rigging systems, 1m grid snapping, real-time SWL warnings, and numeric editing.
- **Crew Report View**: Call-sheet management for crew members with department, call times, day rates, and financial summaries.
- **Sound Report View**: Audio inventory with category-tagged rows (PA Mains, Subs, Monitors, IEMs, Console, Mic Wired, Mic Wireless, DI, Stand, Cable, Other), per-row qty / weight-per-unit / power-per-unit fields, automatic subtotal calculations, and a header dashboard summarising row count, total pieces, total weight (kg) and total continuous power (W), plus a per-category breakdown card grid. Items live in `lib/sound.ts` (`SoundItem`, `computeSoundTotals`) with the view in `components/SoundReportView.tsx`; state is held in `App.tsx` as `soundItems` and persisted to `localStorage` v2 under the `soundItems` key. Reset clears the list. The tab sits between Crew Report and Rigg Plan.
- **EHS Equipment Library Picker**: A reusable modal (`components/EquipmentPicker.tsx`) that lists items from the company's Easyjob export and lets the user add a row directly to the active tab. The slim catalog (~341 KB, 1767 unique SKUs deduped from `attached_assets/EHS_database_*.json`) is shipped as a static asset at `public/equipment-library.json` with fields `id, name, category, subCategory, weight, watts, va, width/height/depth, stock, notes`. `lib/equipmentLibrary.ts` exposes `loadEquipmentLibrary()` (fetched once and cached relative to `import.meta.env.BASE_URL`), `searchLibrary(items, query)` (multi-token AND search across name/category/subCategory/notes), `tabsFor(item)` (routes to `sound | lighting | power | rigging | stage | led` based on category/sub-category and watt presence), and `tabLabel(tab)` for the modal heading. The picker takes an optional `tab` prop to filter results, has a search box plus a sub-category dropdown, dismisses on Escape or backdrop-click, and emits `onPick(item)` to the host. Wiring lives in `App.tsx`: a discriminated `pickerTarget` state (`{kind:"sound"} | {kind:"lighting"} | {kind:"power", circuitId, phase}`) plus a single `handleLibraryPick` that maps the LibraryItem to the right shape — Sound rows get a category mapped via `mapLibrarySoundCategory`, Lighting rows get `weight + watts`, Power Plan rows append a new `PowerItem` to the targeted circuit/phase (with a defensive fallback to the first remaining circuit if the targeted one was deleted between open and pick). Entry points: a "+ From EHS Library" button next to "+ Add item" in `SoundReportView`, the same button next to "+ Add Extra Fixture" in `LightingPlanView`'s Show Fixture List, and per-circuit "Lib → L1 / Lib → L2 / Lib → L3" buttons in `PowerPlanView`'s `CircuitCard` footer. Styles are in `index.css` under `.equip-picker*` and use the shared `--text-main / --text-muted / --card-bg / --border` CSS variables so dark mode is covered automatically. Stage / Rigging / LED tabs are intentionally not wired yet (deferred).
- **Stage Report View**: Nivtec deck calculator, supporting standard deck sizes, leg heights (20-140 cm) with bracing notes, user-defined rectangular stages with 0.5m snapping, "auto" and "manual" layout modes, per-stage export ("Stage Build Sheet"), configurable leg configurations (4-2-2-1 shared corners or 4 legs per deck), load capacity calculation, optional handrails, and SVG visualization.
    - **Manual mode rotation**: the deck palette has a global "Rotate 90°" toggle that affects new placements (`placedDims(key, rotated)` swaps w/d for non-square decks). For decks that are *already on the canvas*, the user can rotate them in place via **right-click** (`onContextMenu` with `preventDefault()`) or **Shift + click** on a transparent click-catcher cell — both routes call `rotateDeckAtCell(cellX, cellY)` which finds the deck under the cell, swaps `w/d` keeping the top-left corner anchored, ignores `1×1` (square — rotation is a no-op), and refuses silently if the rotated rectangle would collide with another placement (`placementCollides` against the array minus self). Plain click still removes a placed deck (original behaviour preserved). Right-click also fires `preventDefault()` on empty cells so the browser context menu never appears while editing the stage canvas.
- **Persistence**: All view states persist to `localStorage` v2, with transparent migration from v1.

# External Dependencies

- **Clerk**: Authentication and user management.
- **PostgreSQL**: Relational database.
- **Drizzle ORM**: TypeScript ORM for PostgreSQL.
- **Zod**: Schema declaration and validation.
- **Orval**: OpenAPI spec code generator.
- **esbuild**: JavaScript bundler.