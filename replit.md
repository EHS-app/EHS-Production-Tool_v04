# Overview

This project is a pnpm workspace monorepo acting as an internal stage-tech tool for EHS Rigging Load Report. Its primary purpose is to streamline calculations and inventory management for event production across Rigging, Lighting, LED Screens, and Stage disciplines. Key capabilities include load calculation, DMX channel management, pixel mapping, stage design, and crew management. The application features secure, invitation-only access via Clerk sign-in, with an open sign-up for internal users. A significant component is the Freelance Portal, which allows producers to share project briefings with external freelancers, enabling gig tracking, availability management, and earnings reporting.

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
- **Provider**: Clerk for sign-in and user management.
- **Auth Screen**: Single unified card containing (top-down): EHS logo, "Sign in to EHS" heading, a product subtitle that mirrors the active role ("Production Tool" or "Freelance Portal"), a segmented role toggle ("Employee" / "Freelancer", defaulting to Employee), an underlined "Sign in / Sign up" tab row, and the Clerk widget — all on one surface (Clerk's own `cardBox` is set to transparent/borderless so it merges with the outer card; `header` is hidden so titles aren't duplicated). The role choice is persisted to `sessionStorage` under `ehs-login-intent` so OAuth redirects keep the right context, and the auth mode under `ehs-auth-mode`. After sign-in, a `<PostLoginRedirect />` component mounted inside the signed-in `<Router>` reads `ehs-login-intent` once on mount: freelancers landing outside `/portal/*` are pushed to `/portal`, employees landing inside `/portal/*` are pushed to `/`, then the intent key is cleared. Deep links (e.g. `/portal/brief/import?b=...`) are preserved because the redirect skips when the user's current path already matches their chosen role.
- **Role-based access control**: The chosen role is also persisted to `localStorage` under `ehs-user-role` (key `USER_ROLE_KEY`). A `<FreelancerGuard />` component mounted inside the signed-in `<Router>` watches every location change: if the persisted role is `"freelancer"` and the current path is not `/portal` or under `/portal/*`, it redirects to `/portal`. The catch-all `<Route>` additionally renders `<Redirect to="/portal" />` for freelancers instead of mounting the producer `<App />`, so the Production Tool UI never even mounts for them. Both sign-out buttons (header in `App.tsx`, sidebar in `PortalLayout.tsx`) clear `ehs-user-role` from localStorage before calling `signOut()` so the next user starts from a clean state.
- **Admin Setup**: Seeded admin account for `olti@ehs.no` provisioned via Clerk Backend API, with `tsako.olti@gmail.com` as a verified secondary email for Google sign-in.
- **Dev Auto-sign-in**: Development-only auto-login as Admin via Clerk's ticket strategy, guarded by `NODE_ENV`.

## UI/UX and Features
- **Frontend**: Single-page application using React and Vite.
- **Theme**: Dark/light mode toggle with persistence and Clerk integration.
- **Reporting Views**:
    - **Rigging Report**: Multi-system calculator with inventory, motor selection, load distribution, SWL detection, visualizations, and export.
    - **Lighting Report**: Fixture list, DMX mode selection, channel auto-fill, DMX address calculation, and a power plan section for circuit management with load calculations and capacity warnings.
    - **LED Screen Report**: Pixel map generator, dynamic panel library, SVG canvas for layouts, PNG export, wire-path modes, LED processor capacity checks, and dashboard.
    - **Rigg Plan View**: Top-down floor plan with venue dimensions, dynamic truss placement, grid snapping, real-time SWL warnings.
    - **Crew Report**: Call-sheet management for crew members including department, call times, day rates, and financial summaries.
    - **Sound Report**: Audio inventory management with category-tagged rows, quantity, weight, power tracking, automatic subtotal calculations, and a header dashboard.
- **EHS Equipment Library Picker**: Reusable modal for selecting items from a static JSON equipment catalog, integrating into various report views.
- **Stage Report View**: Nivtec deck calculator supporting standard deck sizes, leg heights, bracing notes, user-defined stages, "auto" and "manual" layout modes, load capacity calculation, optional handrails, and SVG visualization. Manual mode supports deck rotation via right-click or Shift+click.
- **Persistence**: All view states persist to `localStorage` v2, with transparent migration from v1.
- **Freelance Portal**: A second product surface mounted under `/portal/*`, targeting external freelancers.
    - **Features**: Hub (earnings, prompts), Briefs (project briefings with status), Gigs (CRUD logbook with status pipeline), Availability (month calendar with conflict flagging), Earnings (derived totals, CSV export), and Profile (personal, dietary, insurance, skills).
    - **Data Storage**: All portal data stored in `localStorage` namespaced per Clerk user.
- **Header layout & theme picker**: The dashboard header is split into two right-side rows. The top-right cluster (`.header-account`) holds the three-way theme picker `<ThemeSegmentedControl>` (Light / Dark / System), the "Portal" link, and the signed-in user's email + Sign out button. The bottom row (`.header-doc-actions`) holds the Saved pill, Reset, CSV, Export Report, and Share with Crew actions. The theme preference is stored as `theme: "light" | "dark" | "system"` in `ehs-rigging-report-v2` and resolved against `window.matchMedia("(prefers-color-scheme: dark)")` for both `App` and the Clerk-wrapping `Root` in `main.tsx`. New users default to `system`.
- **Production Schedule Picker**: The dashboard header has a compact `<ScheduleField>` popover replacing the previous From/To date inputs. The trigger button shows a summarised range like "Jun 14 → Jun 18 · 4 phases"; the popover contains four phase rows — Setup, Rehearsal, Show, and Load Out (the internal phase key remains `downrig` for backwards compatibility with already-persisted state). Each row has both a "Day" sub-row with two date inputs and a "Time" sub-row with two time inputs (`<input type="time">`). The "Show" phase writes its dates to the existing `reportDate` / `reportEndDate` state for backwards compatibility; all other date ranges and all time-of-day fields live in `extraSchedule` (`Partial<Record<SchedulePhaseKey, {from, to, fromTime?, toTime?}>>`). Outside-click is handled by a transparent fixed overlay (z-index 49 behind the dialog at 50) and Escape via a document keydown capture-phase listener. The full schedule is shipped on every brief as `project.schedule` (a `BriefSchedule`, where each `BriefSchedulePhase` carries optional `fromTime` / `toTime`) and rendered by `<ScheduleList>` in the freelancer's brief detail.
- **Production Tool ↔ Portal Brief Bridge**: Producers can share full project context via self-contained share URLs.
    - **Schema**: `ProjectBrief` defines compact summaries of project elements.
    - **Encoder**: Gzip-compresses and base64url-encodes JSON briefs for URL sharing.
    - **Producer side**: "Share with Crew" modal generates generic and personalized brief links with copy-to-clipboard and warnings for payload size.
    - **Freelancer side**: Routes for importing (`/portal/brief/import?b=<encoded>`), viewing (`/portal/briefs/:id`), and managing (`/portal/briefs`) briefs. Briefs are upserted, and acceptance creates pre-filled Gigs.
    - **Routing**: Portal routes are mounted with a wildcard `path="/portal/*"` in Wouter.

# External Dependencies

- **Clerk**: Authentication and user management.
- **PostgreSQL**: Relational database.
- **Drizzle ORM**: TypeScript ORM for PostgreSQL.
- **Zod**: Schema declaration and validation.
- **Orval**: OpenAPI spec code generator.
- **esbuild**: JavaScript bundler.