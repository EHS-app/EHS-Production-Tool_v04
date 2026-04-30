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
- **Internationalization (i18n)**: Custom typed i18n module under `src/lib/i18n/` supporting English and Norwegian Bokmål. `<I18nProvider>` (mounted once in `main.tsx` so the producer Production Tool and the Freelancer Portal share one locale) detects the browser language (`nb*`/`no*`/`nn*` → NO, else EN), persists the user choice to `localStorage["ehs:locale"]`, and updates `<html lang>`. The `useT()` hook returns a translator with `{name}` interpolation and a fallback chain (requested locale → English → key string). `format.ts` provides locale-aware date (MM/DD/YYYY vs DD.MM.YYYY), number, and currency (NOK by default) helpers usable from non-React code. `<LanguageSelector />` lives in the producer header and translated surfaces include header doc actions, project meta labels/placeholders, the main view-tab switcher, and the reset confirm dialog. New languages need only a translation file + a registry entry.
- **Fart Button (lighthearted feature)**: A self-contained floating bottom-right button (`💨`) mounted once at the signed-in root. Click → modal with name input → fullscreen overlay (rendered via `createPortal`) with bouncy headline ("{name} just farted 💨" + variants), animated cloud emojis at random positions, screen shake (intensity-scaled), and a green humour flash. Sound is synthesised at runtime via the Web Audio API in three intensities (small / medium / nuclear) so no binary assets ship; if `AudioContext` is unavailable the visual effect still plays. Dismiss via Escape, click anywhere on the overlay, or auto-close timer; centralised `handleClose` cancels both the auto-close and shake timers and removes the html shake class so no callback fires after dismissal. All chrome (tooltip, headline variants) is translated via i18n. Files: `src/components/fart/FartButton.tsx`, `FartPopup.tsx`, `fartSounds.ts`, `fart.css`.
- **Client field**: A "Client" text input lives between "Venue / Project" and "Schedule" in the project meta card (`App.tsx`). Backed by a `client` state hook persisted in `PersistedV2.client` (optional for back-compat). The client name is propagated everywhere a producer's audience reads project metadata: the **Client Pack** cover (was previously empty), the **Show Simulation** cover, and every shared **ProjectBrief** (`ProjectBrief.project.client` is now a required string in `lib/projectBrief.ts`, populated by `buildBrief` and defensively coerced by `normalizeBrief`). The Freelancer Portal Oslo surfaces the client on the brief detail screen ("for {client}" line under the venue title), in the brief inbox row subtitle, and on accepted Gigs (the Earnings/Gigs screens already display `g.client` — `gigFromBrief` now copies `brief.project.client` rather than `preparedBy`, with a `preparedBy` fallback for legacy briefs that pre-date the field).
- **Show Simulation Engine**: Generates a printable phase-by-phase live-event simulation report with discipline status blocks, aggregated risks, and a readiness score.
- **Client PDF Pack Export**: Generates a printable, single-document client-facing pack with 11 numbered sections covering project details, schedules, crew, rigging, lighting, sound, stage, LED, risks, and total cost.
- **Production Tool ↔ Portal Brief Bridge**: Enables sharing project context with freelancers via Gzip-compressed, base64url-encoded share URLs.
- **Shared Internal Database (Production Tool ↔ Portal)**: A Replit-managed Postgres backs cross-app state so both halves of the app see the same source of truth. Three Drizzle tables in `lib/db/src/schema/`: `freelancer_profiles` (PK = Clerk user id; the freelancer's own profile, skills, languages, base rates), `project_briefs` + `brief_assignments` (producer-authored briefs as jsonb with denormalised `venue`/`client`/`startDate`/`endDate` columns; assignments junction is uniquely indexed on `(brief_id, freelancer_user_id)` so producer re-saves are idempotent), and `gigs` (the freelancer's accepted-or-logged work, optionally linked back to a `briefId`). All Clerk-gated routes live under `/api/portal/*` in `artifacts/api-server/src/routes/portal{Profile,Briefs,Gigs}.ts`. The brief upsert + assignment sync runs in a single `db.transaction()`; gig POST pre-checks ownership before upsert to close an IDOR path. Skill labels on profiles are validated server-side against the canonical strict library in `@workspace/skills` (~80 entries, 4 groups: Work Type, Console & Software, Certification, Language) — the same library the Profile picker uses on the client, so unknown labels can never reach the directory.
- **Logistics Foundation (Phase A — schema + Profile fields)**: Groundwork for the planned Catering / Hotel / Schedule pipeline. `freelancer_profiles` gained `email`, `allergies`, and three derived skill arrays — `work_types`, `consoles`, `certs` — split from the union `skills` column on every write via the new `groupSkills(labels)` helper in `@workspace/skills` (canonicalises labels through the existing `SKILL_CANONICAL` map, then routes each into its `SkillGroup` bucket; unknown labels are dropped). The existing `dietary` column is reused as "dietary requirements" — exposed in the API under both `dietary` and the canonical `dietaryRequirements` alias via a new `projectProfile()` helper, with PUT and GET response shapes kept identical so clients can migrate at their own pace. `gigs` gained `assigned_dates` (`date[]`), `hotel_required` (`boolean`), `check_in_date`, `check_out_date` — the foundation for per-day catering counts, schedule-driven hotel inheritance, and personal itineraries. Portal Profile UI now has a dedicated Catering section (between Personal and Skills) with separate Dietary requirements and Allergies inputs (the producer's catering Order List will treat them differently — allergens are cross-contamination warnings, dietary needs drive meal counts), and an Email field in the Personal section distinct from the Clerk identity email so freelancers can route booking enquiries elsewhere. Privacy posture for `/api/portal/freelancers` is unchanged — email and dietary fields are NOT projected into the directory list.
- **Available Crew Sidebar (Production Tool, Crew Report tab)**: A producer-facing roster panel that lives beside the call-sheet table (`AvailableCrewSidebar.tsx`, mounted via the `directorySidebar` slot on `CrewReportView`). Filter chips for Work Type / Console & Software / Certification let the producer drill down across all three groups simultaneously — every active chip is sent as a separate `?skill=` param and AND-ed server-side. The chip strip backs onto `GET /api/portal/freelancers`, which was extended to: parse repeatable `skill[]` params (canonical labels only via `isValidSkill`, capped at 8); accept `startDate` / `endDate` and annotate every row with a `status` of `"available" | "pending" | "booked"`. `booked` is computed from any global confirmed/done/invoiced/paid gig overlapping the project window (privacy-safe — no producer/project leaks across); `pending` is producer-scoped via `b.owner_user_id = caller`. Status surfaces as a coloured pill (green/amber/red) on each card, alongside name, primary role, city, and up to three Certification badges (e.g. "Forklift G4 (NO)"). Phone numbers stay excluded from the projection. The fetch lifecycle uses `AbortController` + a request-id ref + a 220ms debounce so a chip-toggle storm collapses to one round-trip and stale responses can never overwrite fresh state. Clicking "+ Add to crew" pre-fills a fresh row in the call sheet with the freelancer's name and best-guess `CrewRole` department via `lib/skillToCrewRole.ts` (e.g. "Lyd FOH" → Sound, "Lys FOH" → Lighting FOH, "Topp Rigger" → Rigging, "Runner" → Driver). Booked cards aren't hard-disabled — clicking shows a `window.confirm` so producers can override for hold options or deliberate double-bookings. Layout uses CSS grid with a 1100px breakpoint: side-by-side on desktop with a sticky aside, stacked below on iPad / phone.
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