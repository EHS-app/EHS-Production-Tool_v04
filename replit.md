# Overview

This project is a pnpm workspace monorepo designed as an internal stage-tech tool for EHS Rigging Load Report. Its main purpose is to optimize calculations and inventory management across event production disciplines such as Rigging, Lighting, LED Screens, and Stage. Key capabilities include load calculation, DMX management, pixel mapping, stage design, and crew management. The application offers secure, invitation-only access for internal users and a Freelance Portal for producers to share briefings and for freelancers to manage their gigs, availability, and earnings. The business vision is to streamline event production workflows and enhance efficiency for both internal teams and external collaborators.

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
- **Reporting Views**: Rigging, Lighting, LED Screen, Rigg Plan, Crew, Sound, and Stage Reports with specialized calculations, inventory management, and design tools.
- **EHS Equipment Library Picker**: Reusable modal for selecting items from a static JSON catalog.
- **Persistence**: All view states persist to `localStorage` v2, with transparent migration from v1.
- **Freelance Portal**: Interface for external freelancers covering Hub, Briefs, Gigs, Availability, Earnings, and Profile management, including iCal export and conflict warnings.
- **Production Schedule Picker**: Compact popover for managing multi-phase production schedules.
- **Internationalization (i18n)**: Custom typed i18n module supporting English and Norwegian Bokmål, with browser language detection, persistence, and locale-aware formatting.
- **Client Field**: Integrated "Client" text input in project metadata, propagated to Client Pack, Show Simulation, and Project Briefs, and surfaced in the Freelancer Portal.
- **Show Simulation Engine**: Generates printable phase-by-phase live-event simulation reports with discipline status, aggregated risks, and readiness scores.
- **Client PDF Pack Export**: Generates a single, printable client-facing PDF document with 11 numbered sections covering all project details.
- **Production Tool ↔ Portal Brief Bridge**: Enables sharing project context with freelancers via Gzip-compressed, base64url-encoded share URLs.
- **Shared Internal Database (Production Tool ↔ Portal)**: Replit-managed Postgres database storing freelancer profiles, project briefs, brief assignments, and gigs.
- **Logistics Foundation**: Groundwork for catering, hotel, and schedule pipelines, including new profile fields and gig attributes.
- **Stage Report — Build Direction & Per-Deck Assembly Numbering**: Allows stage builds from left-to-right or right-to-left, with per-deck assembly numbering and leg counts displayed in the SVG preview.
- **Available Crew Sidebar (Production Tool, Crew Report tab)**: Producer-facing roster panel with filter chips for skills, availability status, and direct crew addition to call sheets.
- **Drawing Analyser (Rigg Plan tab)**: AI-powered extraction from PDF/image drawings for venue dimensions, stages, trusses, lighting, LED screens, and sound items.
- **Brief Attachments**: Integration with Replit App Storage for handling brief attachments, including API endpoints for upload and view/download.
- **Crew Request Loop — First-to-Accept-Wins**: Implements a transactional system where the first freelancer to accept a brief wins, and others are marked as "too late".
- **Crew Request Confirm → Gig Conversion**: When a freelancer accepts a brief, it materializes as a gig in the system, updating calendars and rosters.
- **Crew Request Email-on-Send (Gmail)**: Sends email notifications to new brief recipients using the producer's connected Gmail account.
- **Catering Aggregation**: Provides a per-day breakdown of confirmed crew meals, dietary restrictions, and allergies, with a one-click PDF export for venue chefs.
- **Auto-Assign Schedules → Gigs (Editable Working Days)**: Freelancers can override auto-computed assigned working days for gigs via a checkbox grid.
- **Freelancer Gig Edits — Bidirectional Sync**: Gig edits by freelancers are optimistically applied locally and then synchronized bidirectionally with the server, including conflict resolution and multi-device convergence.

# External Dependencies

- **Clerk**: Authentication and user management.
- **PostgreSQL**: Relational database.
- **Drizzle ORM**: TypeScript ORM.
- **Zod**: Schema validation.
- **Orval**: OpenAPI code generator.
- **esbuild**: JavaScript bundler.
- **Anthropic Claude**: AI model for drawing analysis.
- **Replit App Storage**: Object storage for brief attachments.