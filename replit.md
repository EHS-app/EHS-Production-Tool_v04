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
    - Dual panel color picker and curated presets.
    - Panel pattern selector (`checker` or `columns`).
    - Dashboard displaying screens, panels, pixels, area, weight, power, and outputs.
- **Stage Report View**:
    - Nivtec deck calculator.
    - User-defined rectangular stages with 0.5 m snapping.
    - Greedy tiling algorithm for optimal deck placement.
    - Leg configuration per stage: "shared" (counts unique deck corners) or "perDeck" (4 legs per deck).
    - Configurable leg heights (20-140 cm) with load capacity derating.
    - Load capacity calculation (`StageCalc.loadCapacityKg`, `effectiveSwlPerM2`).
    - Optional handrails per side.
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