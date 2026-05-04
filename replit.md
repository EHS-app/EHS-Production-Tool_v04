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
- **Theme**: Dark/light mode toggle with persistence and Clerk integration. All UI surfaces use CSS custom properties (`--card-bg`, `--surface`, `--surface-soft`, `--input-bg`, `--ink`, `--border`, etc.) so dark mode applies uniformly. The `[data-theme="dark"]` block defines all variable aliases including `--surface`, `--ink`, `--ink-soft`, `--surface-muted`, `--surface-soft-hover`. Status badges (`.acs-status-ok/warn/bad`, `.acs-error`) have dedicated dark overrides using semi-transparent rgba backgrounds. The portal `PALETTE.dark` in `portalTheme.ts` is aligned with the production tool CSS variables (`#1C1C24`, `#25252F`, `#22222C`, etc.) so all portal screens (Help, Hub, Briefs, Gigs, etc.) match the AppShell dark sidebar chrome.
- **Reporting Views**: Rigging, Lighting, LED Screen, Rigg Plan, Crew, Sound, and Stage Reports with specialized calculations, inventory management, and design tools.
- **EHS Equipment Library Picker**: Reusable modal for selecting items from a static JSON catalog.
- **Persistence**: All view states persist to `localStorage` v2 (instant, offline-capable) with transparent migration from v1. Additionally, projects are auto-saved to the PostgreSQL database via debounced cloud sync (5-second delay after last change). Users can manage multiple projects through the Projects list modal (accessible from the "Projects" breadcrumb or command palette), load/switch between saved projects, and "Save as new project" to fork work. The `projects` table stores per-user project metadata (name, venue, client) alongside the full `PersistedV2` data blob as JSONB. Project switching flushes pending saves before loading new data to prevent data loss.
- **Freelance Portal**: Interface for external freelancers covering Hub, Briefs, Gigs, Availability, Earnings, and Profile management, including iCal export and conflict warnings.
- **Production Schedule Picker**: Compact popover for managing multi-phase production schedules.
- **Internationalization (i18n)**: Custom typed i18n module supporting English and Norwegian Bokmål, with browser language detection, persistence, and locale-aware formatting. The `I18nProvider` is mounted above `ClerkProvider` in `main.tsx` so signed-out (Sign-in screen) and signed-in (Production Tool + Freelance Portal) surfaces share a single locale and the floating language selector is visible everywhere. Portal screens covered by `useT()`: PortalLayout (chrome/nav/badges/sign-out), Hub (greeting, stats, sections, banners, profile card, gig status pills), Briefs (header, sections, decision pills, relative-time, empty state), Help (sections + quick-actions assembled from key descriptors). Locale-sensitive `Intl.DateTimeFormat` uses `nb-NO` for Norwegian and `en-GB` for English; NOK currency stays `nb-NO` regardless of UI language because that's how Norwegian invoices read.
- **Theme preference (3-way Light/Dark/System)**: System is the install default — when the user has never picked a preference the portal/sign-in/production tool follow OS `prefers-color-scheme` and live-update if the OS scheme changes. Both the sign-in screen (`InlineThemeSegmentedControl` in `main.tsx`) and the Freelance Portal header (`PortalThemeSeg` in `PortalLayout.tsx`) render an inline 3-way segmented control (`role="radiogroup"` with three `role="radio"` buttons, `aria-checked`, roving `tabIndex`, and Arrow/Home/End keyboard navigation) replacing the older single-icon cycle button. The selected option uses the EHS orange (`#f88000`) background.
- **Client Field**: Integrated "Client" text input in project metadata, propagated to Client Pack, Show Simulation, and Project Briefs, and surfaced in the Freelancer Portal.
- **Show Simulation Engine**: Generates printable phase-by-phase live-event simulation reports with discipline status, aggregated risks, and readiness scores.
- **Client PDF Pack Export**: Generates a single, printable client-facing PDF document with 11 numbered sections covering all project details.
- **Production Tool ↔ Portal Brief Bridge**: Enables sharing project context with freelancers via Gzip-compressed, base64url-encoded share URLs.
- **Shared Internal Database (Production Tool ↔ Portal)**: Replit-managed Postgres database storing freelancer profiles, project briefs, brief assignments, and gigs.
- **Logistics Foundation**: Groundwork for catering, hotel, and schedule pipelines, including new profile fields and gig attributes.
- **Stage Report — Build Direction & Per-Deck Assembly Numbering**: Allows stage builds from left-to-right or right-to-left, with per-deck assembly numbering and leg counts displayed in the SVG preview.
- **Available Crew Sidebar (Production Tool, Crew & Logistics tab)**: Producer-facing roster panel with filter chips for skills, availability status, and direct crew addition to call sheets.
- **Crew & Logistics master sheet (Production Tool, Crew & Logistics tab)**: Single unified table that replaces the previous split between RosterTable + inline call sheet. Shows one row per person with Name, Role, Status, Days, Hotel, Roommate, Food, Phone, Notes. "Production details" toggle adds Call / Off / Day rate columns. Print button opens an A4-landscape printable handoff for runner / hotel / catering. AdequacyPanel sits below as a non-dominant sidekick. Backed by `MasterCrewSheet.tsx` + `masterSheetExport.ts`; merged-roster source is the same `lib/crewRoster.ts` mergeRoster used by other tabs. Server `GET /api/portal/briefs/:id/roster` returns phone + roomKey + roommateName per gig-backed row (computed via the same `assignRooms` pairing engine the Hotel page uses, gated to brief owners).
- **Help modal (Production Tool sidebar)**: User-facing onboarding/reference modal opened by the Help button in the sidebar bottom. Component lives at `components/HelpModal.tsx` and walks through four sections: "What is this?" overview, "Sidebar — your project" (10 sidebar tabs), "Top bar actions" (6 action buttons), and "Good to know" (5 tips). Bilingual (EN/NO) — every string is keyed under `help.*` in the i18n catalog. Accessible: `role="dialog"`, focus trap, focus return on close, Escape / × / "Got it" / backdrop-click all close.
- **Command Palette (Production Tool sidebar)**: Search/navigate palette opened by clicking "Search project" in the sidebar or pressing `Cmd/Ctrl+K`. Component lives at `components/CommandPalette.tsx`. Lists all sidebar pages (filtered by showHotel/showCatering) under "Pages" and all shell actions (dynamic from AppShell props) under "Actions". Supports live text filtering, arrow-key navigation with highlight, Enter to execute, Escape to close. Bilingual — uses existing `shell.nav.*` keys for pages and dynamic action labels. CSS in `index.css` under `.cmd-*` with light-mode overrides.
- **Inspection / Befaring Tab**: Site inspection notes with AI-powered data extraction. Users write free-form notes during a client visit and click "Extract Data" to automatically organize them into structured categories: Equipment (stage dimensions, screens, furniture), Schedule (setup dates/times), Technical (power specs, rigging points), and General (client requests, access info). Uses Claude AI via `POST /api/inspection/extract`. Extracted items are editable inline with confidence indicators. Supports both Norwegian and English input. Inspection data persists with the project via auto-save.
- **Drawing Analyser (Rigg Plan tab)**: AI-powered extraction from PDF/image drawings for venue dimensions, stages, trusses, lighting, LED screens, and sound items. Three interpretation modes are available — Classic (schema-only), Geometry (truss anchoring + alignment / motor heuristics), and Production (drawing tables as source-of-truth, mismatch flagging in `notes`, Position Groups, Floor / Pipe mounting). The model returns a per-item bounding box and confidence score so each detected item is flagged for review when uncertain.
- **Overlay Editor (Rigg Plan tab)**: Click-to-edit boxes rendered on top of the rasterised drawing. Producers can drag, resize, relabel, add or delete items; the round-trip preserves payload fields the editor doesn't surface (e.g. fixture wattages) so untouched values aren't accidentally erased.
- **Per-Venue Learning Memory**: Each (Clerk user, venue-name) pair has a `venue_memory` row that stores the last set of corrected items. On the next analysis of the same venue the server reads the saved blob and injects a short hint ("trusses usually present: LX1, LX2…") into the Claude prompt, so the analyser learns from past corrections. Memory writes are best-effort, fire on both Save-corrections and Apply-to-reports, and are guarded against stale completions via a token + venue-identity check.
- **Brief Attachments**: Integration with Replit App Storage for handling brief attachments, including API endpoints for upload and view/download.
- **Crew Request Loop — First-to-Accept-Wins**: Implements a transactional system where the first freelancer to accept a brief wins, and others are marked as "too late".
- **Crew Request Confirm → Gig Conversion**: When a freelancer accepts a brief, it materializes as a gig in the system, updating calendars and rosters.
- **Crew Request Email-on-Send (Gmail)**: Sends email notifications to new brief recipients using the producer's connected Gmail account.
- **Catering Aggregation**: Provides a per-day breakdown of confirmed crew meals, dietary restrictions, and allergies, with a one-click PDF export for venue chefs.
- **Hotel Logistics**: Producer toggles "needs hotel" per crew member; check-in/check-out default to the first / morning-after-the-last assigned working day with per-person overrides; pairing engine suggests twin-share rooms by overlap + room-share preference + (optional) gender hint; producer can lock pairings and swap individuals between rooms (with `FOR UPDATE` row-locking on writes); one-click rooming list PDF export for the hotel front desk. Multi-gig freelancers are aggregated into one row per person across the GET / PATCH / pairing / lock pipeline.
- **Auto-Assign Schedules → Gigs (Editable Working Days)**: Freelancers can override auto-computed assigned working days for gigs via a checkbox grid.
- **Freelancer Gig Edits — Bidirectional Sync**: Gig edits by freelancers are optimistically applied locally and then synchronized bidirectionally with the server, including conflict resolution and multi-device convergence.
- **Freelancer Itinerary**: Per-day view in the freelancer portal combining call/off times, schedule phases active each day, and hotel state (check-in/out + room key + roommate name when both occupants are accepted on the brief). Backed by `GET /api/portal/briefs/:id/itinerary` with an accepted-only access gate. The "Add to calendar" button enriches the `.ics` download with all-day check-in / check-out events derived from the same itinerary, falling back to the brief-only export if the itinerary fetch fails.

# External Dependencies

- **Clerk**: Authentication and user management.
- **PostgreSQL**: Relational database.
- **Drizzle ORM**: TypeScript ORM.
- **Zod**: Schema validation.
- **Orval**: OpenAPI code generator.
- **esbuild**: JavaScript bundler.
- **Anthropic Claude**: AI model for drawing analysis and inspection note extraction.
- **Replit App Storage**: Object storage for brief attachments.