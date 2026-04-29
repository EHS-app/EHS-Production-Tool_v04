# Overview

This project is a pnpm workspace monorepo acting as an internal stage-tech tool for EHS Rigging Load Report. Its primary purpose is to optimize calculations and inventory management across various event production disciplines including Rigging, Lighting, LED Screens, and Stage. Key capabilities encompass load calculation, DMX management, pixel mapping, stage design, and crew management. The application features secure, invitation-only access via Clerk sign-in for internal users, alongside a Freelance Portal for producers to share project briefings, and for freelancers to track gigs, manage availability, and report earnings. The business vision is to streamline event production workflows and enhance efficiency for both internal teams and external collaborators.

# User Preferences

- **Internal Tool**: This is an internal tool, so there is intentionally no public landing page.
- **Open Sign-Up**: Anyone can create an account from the sign-in screen via the Sign in / Sign up tab toggle.
- **Google Sign-in**: Visible on the production sign-in page (the auth instance currently has email/password disabled, so Google is the active sign-in method on prod). Email/password sign-in can be re-enabled from the Auth pane in the Replit Workspace toolbar.
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
- **Provider**: Clerk for sign-in, user management, and role-based access control.
- **Auth Screen**: Unified card with EHS logo, dynamic product subtitle, role toggle, sign-in/sign-up tabs, and an integrated Clerk widget. Role choice is persisted in `sessionStorage` and `localStorage`.

## UI/UX and Features
- **Frontend**: React single-page application built with Vite.
- **Theme**: Dark/light mode toggle with persistence and Clerk integration.
- **Reporting Views**:
    - **Rigging Report**: Multi-system calculator for inventory, motor selection, load distribution, and SWL detection, with a "None" motor option and comprehensive reset functionality.
    - **Lighting Report**: Manages fixture lists, DMX mode selection, channel auto-fill, and a distro-centric Power Plan.
        - **Power Plan v2 (distro-centric)**: One card per physical distro/HOT (presets for Schuko 16, CEE 32 1ph, CEE 16/32/63/125 3ph + custom), each with 6 (or fewer) channels and a configurable channel→phase mapping (default Ch1+Ch4→L1, Ch2+Ch5→L2, Ch3+Ch6→L3). Drops on a channel reference fixtures from the Lighting list (single source of truth) instead of duplicating watts. Math uses A = W / (V × PF) with PF 0.95, 80 % derate, and a >20 % phase-imbalance warning. Suggestions are advisory only — they never auto-rebalance the producer's plan. Legacy v1 PowerCircuit data renders as a read-only "Legacy circuits" panel for migration.
    - **LED Screen Report**: Pixel map generator, dynamic panel library, SVG canvas for layouts, processor capacity checks, per-screen name-pill scaling, power/signal markers, build-by-size/shape templates, cell-level ON/OFF toggling, cable/bracket BOM generation, and multi-processor support. It also includes per-screen color presets, canvas selection, and drag-and-drop positioning.
    - **Rigg Plan View**: Top-down floor plan with optional venue dimensions, dynamic truss placement, real-time SWL warnings, and a floor-plan library supporting multi-upload and cross-PDF deduplication. Trusses can be deleted from the table, and the last system can be removed to start fresh.
    - **Crew Report**: Call-sheet management including departments, call times, day rates (formatted in NOK), and financial summaries.
    - **Sound Report**: Audio inventory management with category-tagged rows, quantity, weight, and power tracking.
    - **Stage Report View**: Nivtec deck calculator for standard sizes, leg heights, bracing notes, and custom layouts with load capacity.
- **EHS Equipment Library Picker**: Reusable modal for selecting items from a static JSON catalog.
- **Persistence**: All view states persist to `localStorage` v2, with transparent migration from v1.
- **Freelance Portal**: A dedicated interface under `/portal/*` for external freelancers, covering Hub, Briefs, Gigs, Availability, Earnings, and Profile management. Data is stored in `localStorage` namespaced per Clerk user.
- **Production Schedule Picker**: Compact popover for managing multi-phase production schedules.
- **Production Tool ↔ Portal Brief Bridge**: Enables sharing project context with freelancers via Gzip-compressed, base64url-encoded share URLs, which freelancers can import to create pre-filled Gigs.
- **Drawing Analyser (Rigg Plan tab)**: AI-powered extraction from PDF/image drawings using Anthropic Claude for venue dimensions, stages, trusses, lighting, LED screens, and sound items. Includes security measures, an apply step, motor capacity auto-pick, and floor-plan backdrop functionality. It routes extracted lighting fixtures to the rigging report when linked to a truss.
- **Brief Attachments**: Integration with Replit App Storage for handling attachments in briefs, including object storage API endpoints, and a flow for producers to upload and freelancers to view/download attachments. Automatically attaches LED diagrams as PNGs to shared briefs.

# External Dependencies

- **Clerk**: Authentication and user management.
- **PostgreSQL**: Relational database.
- **Drizzle ORM**: TypeScript ORM.
- **Zod**: Schema validation.
- **Orval**: OpenAPI code generator.
- **esbuild**: JavaScript bundler.
- **Anthropic Claude**: AI model for drawing analysis.
- **Replit App Storage**: Object storage for brief attachments.