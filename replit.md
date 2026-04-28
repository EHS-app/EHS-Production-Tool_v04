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
- **LED Screen Report View**: Pixel map generator, dynamic panel library, visual SVG canvas for screen layouts, PNG export, dual panel color picker, wire-path modes (linear, serpentine, column-serpentine), LED processor capacity checks (Novastar MX30/MX40), and a dashboard for screen metrics.
- **Rigg Plan View**: Top-down floor plan with venue dimensions, dynamic truss placement from rigging systems, 1m grid snapping, real-time SWL warnings, and numeric editing.
- **Crew Report View**: Call-sheet management for crew members with department, call times, day rates, and financial summaries.
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