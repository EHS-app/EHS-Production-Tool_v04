# Overview

This project is a pnpm workspace monorepo designed as an internal stage-tech tool for EHS Rigging Load Report. Its core purpose is to optimize calculations and inventory management across various event production disciplines including Rigging, Lighting, LED Screens, and Stage. Key capabilities include load calculation, DMX management, pixel mapping, stage design, and crew management. The application provides secure, invitation-only access via Clerk for internal users and a Freelance Portal for producers to share project briefings and for freelancers to manage gigs, availability, and earnings. The overarching business vision is to streamline event production workflows and enhance efficiency for both internal teams and external collaborators.

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
- **Auth Screen**: Unified card with EHS logo, dynamic product subtitle, role toggle, sign-in/sign-up tabs, and an integrated Clerk widget.

## UI/UX and Features
- **Frontend**: React single-page application built with Vite.
- **Theme**: Dark/light mode toggle with persistence and Clerk integration.
- **Reporting Views**:
    - **Rigging Report**: Multi-system calculator for inventory, motor selection, load distribution, and SWL detection.
    - **Lighting Report**: Manages fixture lists, DMX mode selection, channel auto-fill, and a distro-centric Power Plan (v2.2 for UI and crew export).
    - **LED Screen Report**: Pixel map generator, dynamic panel library, SVG canvas for layouts, processor capacity checks, and BOM generation.
    - **Rigg Plan View**: Top-down floor plan with venue dimensions, dynamic truss placement, real-time SWL warnings, and a floor-plan library.
    - **Crew Report**: Call-sheet management, including departments, call times, day rates, and financial summaries.
    - **Sound Report**: Audio inventory management with category-tagged rows, quantity, weight, and power tracking.
    - **Stage Report View**: Nivtec deck calculator for standard sizes, leg heights, bracing notes, and custom layouts with load capacity.
- **EHS Equipment Library Picker**: Reusable modal for selecting items from a static JSON catalog.
- **Persistence**: All view states persist to `localStorage` v2, with transparent migration from v1.
- **Freelance Portal**: A dedicated interface under `/portal/*` for external freelancers, covering Hub, Briefs, Gigs, Availability, Earnings, and Profile management, including brief diff banners, iCal export, personal call sheets, and conflict warnings.
- **Production Schedule Picker**: Compact popover for managing multi-phase production schedules.
- **Show Simulation Engine**: Generates a printable phase-by-phase live-event simulation report with discipline status blocks, aggregated risks, and a readiness score.
- **Client PDF Pack Export**: Generates a printable, single-document client-facing pack with 11 numbered sections covering project details, schedules, crew, rigging, lighting, sound, stage, LED, risks, and total cost.
- **Production Tool ↔ Portal Brief Bridge**: Enables sharing project context with freelancers via Gzip-compressed, base64url-encoded share URLs.
- **Drawing Analyser (Rigg Plan tab)**: AI-powered extraction from PDF/image drawings for venue dimensions, stages, trusses, lighting, LED screens, and sound items, including security measures and motor capacity auto-pick.
- **Brief Attachments**: Integration with Replit App Storage for handling attachments in briefs, including object storage API endpoints and a flow for producers to upload and freelancers to view/download.

# External Dependencies

- **Clerk**: Authentication and user management.
- **PostgreSQL**: Relational database.
- **Drizzle ORM**: TypeScript ORM.
- **Zod**: Schema validation.
- **Orval**: OpenAPI code generator.
- **esbuild**: JavaScript bundler.
- **Anthropic Claude**: AI model for drawing analysis.
- **Replit App Storage**: Object storage for brief attachments.