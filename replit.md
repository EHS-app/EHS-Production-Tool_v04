# Overview

This project is a pnpm workspace monorepo using TypeScript, designed to be an internal stage-tech tool for EHS Rigging Load Report. It features multiple specialized reporting views: Rigging Report, Lighting Report, LED Screen Report, and Stage Report. The application aims to streamline calculations and inventory management for various event production aspects, offering functionalities like load calculation, DMX channel management, pixel mapping, and stage design. The entire application is gated behind Clerk sign-in, intended for invitation-only access.

# User Preferences

- **Internal Tool**: This is an internal tool, so there is intentionally no public landing page.
- **Invitation-Only Access**: Access is by invitation only. To request an invite, users should email utleie@ehs.no.
- **No Sign-Up**: The sign-up footer link is hidden, and no `/sign-up` route exists.
- **No Google Sign-in**: The Google "Continue with Google" button is hidden.
- **No Client-side Credentials**: Admin passwords should not touch the browser.
- **Development Auto-sign-in**: In development, the preview should auto-log the user in as Admin to avoid manual credential entry on reloads. This functionality must be strictly gated by `NODE_ENV` / `import.meta.env.DEV` and not leak to production builds.

# System Architecture

## Monorepo Structure

- **Tooling**: pnpm workspaces for monorepo management.
- **Language**: TypeScript 5.9.
- **Package Manager**: pnpm.
- **Node.js**: Version 24.

## API and Data

- **API Framework**: Express 5.
- **Database**: PostgreSQL with Drizzle ORM.
- **Validation**: Zod (`zod/v4`) and `drizzle-zod`.
- **API Codegen**: Orval, generating from OpenAPI specifications.

## Build and Deployment

- **Build Tool**: esbuild for CJS bundles.
- **Deployment**: Supports GitHub Pages via `BASE_PATH` environment variable.

## Authentication

- **Provider**: Clerk for sign-in and user management.
- **Security**:
    - `clerkProxyMiddleware()` is mounted before `express.json()`.
    - `clerkMiddleware()` is mounted after body parsers.
    - Clerk's sign-up mode is set to "Restricted" for invitation-only access.
    - Google OAuth is disabled at the Clerk instance level.
- **Admin Setup**: A seeded admin account (`olti@ehs.no` with password `EHS986!`) is provisioned via Clerk Backend API, with email auto-verified.
- **Dev Auto-sign-in** (preview convenience only — fully gated by `NODE_ENV` / `import.meta.env.DEV`):
    - Backend route `POST /api/dev/auto-signin-token` (`artifacts/api-server/src/routes/devAutoSignIn.ts`) returns 404 in production. In dev it calls Clerk Backend API `POST /v1/sign_in_tokens` for the seeded admin user (`user_3Cx5qiY52TcaJowheSkwll49BRQ`, expires in 60s) using `CLERK_SECRET_KEY` (server-only) and returns `{ ticket }`.
    - Frontend (`AuthGate` in `main.tsx`) fetches that ticket on mount when signed-out, then calls `signIn.create({ strategy: "ticket", ticket })` followed by `signIn.finalize()`. While in flight, a `DevSigningInScreen` splash ("Signing in as Admin (preview only)…") is shown instead of the regular `<SignIn>` card to avoid flash-of-login. State machine `devStatus: "pending" | "done"` flips to `"done"` in a try/finally on completion (success or failure), so the regular sign-in card is shown if/when the user signs out.
    - **Sign-out skip flag**: Clerk's `signOut()` triggers a navigation that remounts `AuthGate`, which would normally re-trigger auto-login on the next page load. To make explicit sign-out actually show the manual sign-in screen, the `SignOutButton` in `App.tsx` writes `sessionStorage["ehs-skip-dev-auto-signin"] = "1"` _before_ calling `signOut()`. `AuthGate`'s `useState` initializer reads & deletes that flag and starts in `"done"` state, skipping auto-login exactly once. Reloading the page after that brings auto-login back.
    - **No credentials in the client bundle.** We use Clerk's `ticket` strategy (Backend API issues a one-time token) instead of `signIn.password()`, so the admin password never reaches the browser. (The Clerk instance is configured with `email_code` as the only first factor — `user_settings.attributes.email_address.first_factors = ["email_code"]` — so a direct `signIn.password()` call would fail with `needs_second_factor` anyway.)
    - **Vite tree-shakes** the dev-only branches in production: `import.meta.env.DEV` is statically replaced with `false` at build time, so the auto-login `useEffect`, `DevSigningInScreen`, and the `useState` initial value all collapse to no-ops in the published bundle.

## UI/UX and Features

- **Theme**: Dark/light mode toggle with persistence in `localStorage`. Clerk's appearance dynamically adjusts to the selected theme.
- **Rigging Report View**:
    - Multi-system rigging calculator.
    - Inventory management for trusses, fixtures, LED gear.
    - Motor selection (EXE Rise D8+), dynamic load factor.
    - Multi-point load distribution (2–8 points) with SWL overload detection.
    - Visualizations: side-by-side static/dynamic bar chart.
    - Project-wide dashboard.
    - CSV download and print/export functionality.
- **Lighting Report View**:
    - Fixture list with derived rows from rigging system's `fixtureRows`.
    - DMX mode selection per fixture with channel count auto-fill and custom options.
    - Standalone "extra" fixture rows.
    - Totals dashboard with DMX end address calculation and overflow warnings.
- **LED Screen Report View**:
    - Pixel map generator.
    - Panel library dynamically derived from rigging report's `inventory["LED Screen"]`.
    - Linked screens from rigging inventory and standalone customizable screens.
    - Visual SVG canvas: grids of color-tinted panels with labels, output assignments, and name pills.
    - Per-screen PNG export with configurable options (labels, arrows, test patterns, info bar, logo, output badges).
    - Dual panel color picker and curated presets (Blue, Red, **Red + Blue**, Green, Purple, Orange, Teal, Mono).
    - Panel pattern selector (`checker` or `columns`).
    - **Wire-path modes** (`LedSettings.wirePath`): `linear` (every row L→R), `serpentine` (alternating-row snake L→R / R→L), and `column-serpentine` (snake by column — odd columns flow down, even columns flow up, with a → transition along the bottom row). Direction per cell is computed by `cellArrowDirection()` in `lib/led.ts`, which is shared by the in-app `<ScreenSvg>` preview (`components/LedScreenReportView.tsx`) and the PNG export (`lib/ledExport.ts`) so the two can never drift out of sync. Arrows are drawn inside each panel cell — no longer between cells — by the `<CellArrow>` React component and its mirror `cellArrowSvg()`.
    - In `column-serpentine` mode the single per-screen output badge is replaced by **per-column-pair output badges**: one numbered white circle per pair of columns sitting just above the screen, starting from `screen.outputIndex ?? 1` (matches how Brompton / NovaStar processors typically slice a wall — one output per 2 columns).
    - Dashboard displaying screens, panels, pixels, area, weight, power, and outputs.
    - **LED panel inventory** — `InventoryItem` carries only the fields the report actually uses: pixel dimensions, physical dimensions (m), weight (kg) and max wattage. The default inventory ships two Uniview UR Pro 3.9 cabinets: **0.5 × 0.5 m (7.2 kg, 175 W)** and **0.5 × 1 m (10.8 kg, 350 W)**. The 500 × 1000 cabinet is stored mounted in **portrait** orientation (0.5 m wide × 1 m tall, 128 × 256 px) because that is how the crew rigs it; `migrateLedPanelKey()` forwards the older "Uniview UR Pro 1x0.5m" landscape key onto the new portrait entry so saved screens keep resolving.
    - **LED Processor capacity check** (`lib/ledProcessors.ts`): curated catalogue of real LED video controllers (currently **Novastar MX30** — 6.5 MP / 10 outputs / 4096×4096 max canvas, and **Novastar MX40** — 9 MP / 20 outputs / 10240×7680 max canvas; specs sourced from novastar.tech). Picked from a "Processor" dropdown inside Export options. When set, a coloured banner is shown above the screens table comparing the live project against the chosen processor on three axes: total pixels (used / capacity), Ethernet outputs (used / capacity), and largest screen pixel dimensions vs the processor's max canvas. Banner level is `ok` (green, comfortably under), `warn` (amber, > 90 % utilisation, or a single screen exceeds per-output cap), or `fail` (red, project doesn't fit). `validateAgainstProcessor()` returns a structured result with per-issue messages so the user knows exactly what failed (e.g. "needs 182 outputs but MX30 only has 10"). `computeLedTotals()` was extended with `largestWidthPx`, `largestHeightPx`, and `largestScreenPixels` to feed the canvas-size and per-output checks. Selection is stored in `LedSettings.processorId` and persisted with the rest of the LED settings.
- **Stage Report View** — Nivtec deck calculator, sourced from the official Nivtec 2024 catalogue, set-up rules, and assembly manual:
    - Standard Nivtec deck sizes only: 2×1 m (33 kg), 1×1 m (19.5 kg), 0.5×2 m (22 kg), 0.5×1 m (11 kg). All decks rated 750 kg/m² SWL.
    - Leg heights 20–140 cm with official Nivtec weights (1.7 / 2.6 / 3.5 / 4.4 kg for fixed alu legs at 20/40/60/80; 5.5 / 6.5 / 7.5 kg estimated for the 100/120/140 cm extension/adjustable legs).
    - Bracing requirement note shown beneath the leg-height field per the Nivtec set-up rules: diagonal bracing required from 80 cm; additional horizontal bracing above 140 cm. (`nivtecBracingNote()` in `lib/stage.ts`.)
    - User-defined rectangular stages with 0.5 m snapping; greedy tiler places decks (rotates non-square decks for awkward edges).
    - **Layout mode per stage** (`Stage.editMode`): "auto" lets the user enter Width × Depth and the tiler fills it; "manual" hides the W×D inputs and shows a deck palette ("2×1", "1×1", "0.5×2", "0.5×1") plus Rotate / Clear all. The user clicks an empty cell on the half-metre grid to place the selected deck and clicks any placed deck to remove it. The stage's actual size (and rails / area / load) is then derived from the bounding box of placements; the working canvas auto-grows by 1 m around them. Manual placements are stored in `Stage.manualPlacements` and validated by `placementCollides()` / bounded by `placementsBounds()` (`lib/stage.ts`). The interactive grid lives in `StageSvg` (`components/StageReportView.tsx`) — a transparent `<rect>` per cell catches clicks and renders a hover preview before placement.
    - **Per-stage Export ("Stage Build Sheet")**: each stage card has an Export button (in the header alongside Copy / Delete) that opens a printable, self-contained HTML page in a new browser window via `exportStageReport()` in `lib/stageExport.ts`. The sheet contains the EHS-branded header, venue / date / prepared-by meta, a top-down SVG visual of the stage layout (decks, leg dots, handrails, dimension labels), a specs grid (W × D × area, total weight), Decks / Legs / Load-capacity / Handrails tables, the Nivtec bracing-requirement note for the chosen leg height, optional notes, and a grand total. The popup includes a "Print / Save as PDF" button — printing is user-initiated (no auto-print), so the crew sees a preview first. CSS includes an `@media print` block plus `@page A4 portrait` for clean PDF output.
    - Leg configuration per stage:
        - **Nivtec 4-2-2-1 (shared corner legs)** — implements the official Nivtec assembly principle: adjacent decks share their corner legs (4 legs for the first deck, +2 for each adjacent deck, +1 to close a 2×2 block), reducing leg count by up to 60% vs 4-per-deck.
        - **4 legs per deck** — every deck gets its own 4 legs (no sharing).
    - Load capacity calculation (`StageCalc.loadCapacityKg`, `effectiveSwlPerM2`) derates SWL for leg height (1.0 ≤60 cm, 0.85 @80, 0.70 @100, 0.55 @120, 0.45 @140).
    - Optional handrails per side (1 m + 2 m greedy fill).
    - Top-down SVG visualization of stage layout, deck colours, leg dots, and rail strokes.
- **Persistence**: All three views persist their state to `localStorage` v2 (key `ehs-rigging-report-v2`), with transparent migration from v1. A reset function clears all view states.
- **Frontend**: Single-page application using React and Vite.

# External Dependencies

- **Clerk**: For authentication and user management.
- **PostgreSQL**: Relational database.
- **Drizzle ORM**: TypeScript ORM for PostgreSQL.
- **Zod**: Schema declaration and validation library.
- **Orval**: OpenAPI spec code generator.
- **esbuild**: JavaScript bundler.