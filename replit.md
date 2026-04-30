# Overview

This project is a pnpm workspace monorepo serving as an internal stage-tech tool for EHS Rigging Load Report. Its primary goal is to optimize calculations and inventory management across various event production disciplines such as Rigging, Lighting, LED Screens, and Stage. Key functionalities include load calculation, DMX management, pixel mapping, stage design, and crew management. The application offers secure, invitation-only access for internal users via Clerk, alongside a Freelance Portal enabling producers to share project briefings and freelancers to manage gigs, availability, and earnings. The overarching business vision is to streamline event production workflows and enhance efficiency for both internal teams and external collaborators.

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
- **Reporting Views**: Rigging, Lighting, LED Screen, Rigg Plan, Crew, Sound, and Stage Reports providing specialized calculations, inventory management, and design tools.
- **EHS Equipment Library Picker**: Reusable modal for selecting items from a static JSON catalog.
- **Persistence**: All view states persist to `localStorage` v2, with transparent migration from v1.
- **Freelance Portal**: Dedicated interface for external freelancers covering Hub, Briefs, Gigs, Availability, Earnings, and Profile management, including iCal export and conflict warnings.
- **Production Schedule Picker**: Compact popover for managing multi-phase production schedules.
- **Internationalization (i18n)**: Custom typed i18n module supporting English and Norwegian Bokmål, with browser language detection, persistence, and locale-aware formatting.
- **Client Field**: Integrated "Client" text input in project metadata, propagated to Client Pack, Show Simulation, and Project Briefs, and surfaced in the Freelancer Portal.
- **Show Simulation Engine**: Generates printable phase-by-phase live-event simulation reports with discipline status, aggregated risks, and readiness scores.
- **Client PDF Pack Export**: Generates a single, printable client-facing PDF document with 11 numbered sections covering all project details.
- **Production Tool ↔ Portal Brief Bridge**: Enables sharing project context with freelancers via Gzip-compressed, base64url-encoded share URLs.
- **Shared Internal Database (Production Tool ↔ Portal)**: Replit-managed Postgres database storing freelancer profiles, project briefs, brief assignments, and gigs, ensuring a single source of truth for cross-app state.
- **Logistics Foundation**: Groundwork for catering, hotel, and schedule pipelines, including new profile fields and gig attributes.
- **Stage Report — Build Direction & Per-Deck Assembly Numbering**: Allows stage builds from left-to-right or right-to-left, with per-deck assembly numbering and leg counts displayed in the SVG preview.
- **Available Crew Sidebar (Production Tool, Crew Report tab)**: Producer-facing roster panel with filter chips for skills, availability status (available, pending, booked), and direct crew addition to call sheets.
- **Drawing Analyser (Rigg Plan tab)**: AI-powered extraction from PDF/image drawings for venue dimensions, stages, trusses, lighting, LED screens, and sound items, including security and motor capacity.
- **Brief Attachments**: Integration with Replit App Storage for handling brief attachments, including API endpoints for upload and view/download.
- **Crew Request Loop — First-to-Accept-Wins**: Producer can send the same brief to N freelancers as candidates. The server's `POST /briefs/:id/respond` runs inside a transaction with `SELECT ... FOR UPDATE` on the brief row, so the first accept wins and all sibling pending rows flip to `too_late`. The terminal `too_late` decision is also guarded server-side. If a winner later un-accepts (accepted → pending), siblings that were `too_late` are reopened to `pending` in the same transaction. Client surfaces a red "Filled" pill, an inline "Position filled" banner on the freelancer's brief page, and a sync-error banner with retry on transient failures. The server poll respects a 60s `FRESH_DECISION_WINDOW_MS` so freshly-made local decisions cannot be overwritten by stale snapshots.
- **Crew Request Confirm → Gig Conversion**: When a freelancer wins an accept, the same `POST /briefs/:id/respond` transaction also materialises a `gigs` row so the freelancer's calendar, the producer's booked roster, and the directory's `booked` status pill all light up. Idempotency is keyed on `(briefId, freelancerUserId)` — never on the client-supplied `acceptedGigId`, which is treated as advisory only — so a retried accept or an "acknowledge changes" re-confirm cannot duplicate gigs or be used to overwrite somebody else's gig by guessing an id (closes IDOR vector). Existing gigs in terminal statuses (`done` / `invoiced` / `paid`) preserve status on re-accept; non-terminal gigs are promoted to `confirmed`. The transaction returns the resolved gig and the assignment, and the freelancer client swaps its optimistic local gig over to the server's authoritative id. On a winner-undoing-accept (decline or pending), the same transaction tears the gig down, and the client mirrors by removing the local gig and reverting on sync failure. Multi-device convergence: `/portal/gigs` is polled every 60s; `mergeServerGigs` drops brief-linked local gigs absent from the server (gated by the same 60s freshness window so an in-flight POST doesn't flicker), preserves local edits via id match for in-store rows, and never touches local-only logbook gigs (no `briefId`). Files: `artifacts/api-server/src/routes/portalBriefs.ts`, `artifacts/rigging-load-report/src/portal/Portal.tsx`, `artifacts/rigging-load-report/src/portal/screens/BriefDetail.tsx`.
- **Crew Request Email-on-Send (Gmail)**: When the producer sends a brief, every newly-added recipient gets a Norwegian email from the producer's connected Gmail account. New-ness is detected via `.returning()` on the `onConflictDoNothing` assignment insert, so a re-save of the same brief never re-emails existing recipients. The producer's display name is resolved through Clerk; the message links to `${REPLIT_DOMAINS}/?view=portal&brief=<id>` (falls back to `REPLIT_DEV_DOMAIN` in dev). Send is fire-and-forget so HTTP responses are not blocked by mail delivery; every attempt and failure is logged with `briefId` + `freelancerUserId` (recipient address is intentionally NOT logged). RFC 822 header construction strips CR/LF from name/subject and validates the recipient address shape to block header injection from user-edited profile data. Files: `artifacts/api-server/src/lib/gmail.ts`, `artifacts/api-server/src/lib/briefEmail.ts`, wiring in `artifacts/api-server/src/routes/portalBriefs.ts`. SDK: `@replit/connectors-sdk` (Gmail connector `google-mail`).

# External Dependencies

- **Clerk**: Authentication and user management.
- **PostgreSQL**: Relational database.
- **Drizzle ORM**: TypeScript ORM.
- **Zod**: Schema validation.
- **Orval**: OpenAPI code generator.
- **esbuild**: JavaScript bundler.
- **Anthropic Claude**: AI model for drawing analysis.
- **Replit App Storage**: Object storage for brief attachments.