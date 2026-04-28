# Overview

This project is a pnpm workspace monorepo designed as an internal stage-tech tool for EHS Rigging Load Report. It aims to optimize calculations and inventory management across Rigging, Lighting, LED Screens, and Stage disciplines for event production. Key features include load calculation, DMX management, pixel mapping, stage design, and crew management. The application uses secure, invitation-only access via Clerk sign-in, with an open sign-up for internal users. It also includes a Freelance Portal for producers to share project briefings with external freelancers, facilitating gig tracking, availability management, and earnings reporting.

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
- **Provider**: Clerk for sign-in and user management, with role-based access control.
- **Auth Screen**: Unified card with EHS logo, dynamic product subtitle, role toggle ("Employee" / "Freelancer"), "Sign in / Sign up" tabs, and an integrated Clerk widget. Role choice is persisted in `sessionStorage` and `localStorage`.
- **Dev Auto-sign-in**: Development-only auto-login as Admin via Clerk's ticket strategy, guarded by `NODE_ENV`.

## UI/UX and Features
- **Frontend**: React single-page application built with Vite.
- **Theme**: Dark/light mode toggle with persistence and Clerk integration.
- **Reporting Views**:
    - **Rigging Report**: Multi-system calculator with inventory, motor selection, load distribution, and SWL detection.
        - **"None" motor option**: The Motor Type dropdown includes a "None" entry (`hoistIndex = -1`) so a system marked as dead-hung / pre-rigged from venue infrastructure contributes 0 kg / 0 W and does not trip the per-point SWL warning. SWL, headroom, utilisation %, peak colour, mini-card overload tag, system-tab warning ⚠, CSV "Status" column, and the print page all show "—" / "No motor" instead of a misleading 100 % overload. The "Static (incl. N hoists)" footer on the print page becomes "Static (no motor)" for these systems.
        - **Thorough top-bar Reset**: The "Reset" button now wipes every persisted tab — systems, lighting fixtures, LED screens (and per-screen markers / pill scale), stages, crew, sound, power plan, rigg plan, project info, and the floor plan — plus any open modal / picker / custom-item form / share-modal state. The seeded post-reset system has no truss row and no motor selected, so the Rigging Report comes up truly empty rather than carrying over a default 4× FD34 row + first hoist.
    - **Lighting Report**: Fixture list, DMX mode selection, channel auto-fill, DMX address calculation, and power plan section.
    - **LED Screen Report**: Pixel map generator, dynamic panel library, SVG canvas for layouts, and processor capacity checks.
        - **Per-screen name-pill scaling**: Each row has a "Pill size" slider (0.3×–4×, click the value chip to reset). Scale is applied to both the live preview and the exported PNG so what the producer sees is what the crew gets.
        - **Power & signal markers**: Per-row "+P", "+S", and "Clear" buttons let the producer drop labelled P1/P2/S1/S2 dots on each screen visual to show the crew where to land cables. Markers are draggable; alt-click or right-click deletes; "Clear" wipes a screen. Same markers render on the exported PNG.
    - **Rigg Plan View**: Top-down floor plan with venue dimensions, dynamic truss placement, and real-time SWL warnings.
    - **Crew Report**: Call-sheet management for crew members including departments, call times, day rates, and financial summaries.
    - **Sound Report**: Audio inventory management with category-tagged rows, quantity, weight, and power tracking.
    - **Stage Report View**: Nivtec deck calculator supporting standard sizes, leg heights, bracing notes, and custom layouts with load capacity.
- **EHS Equipment Library Picker**: Reusable modal for selecting items from a static JSON catalog.
- **Persistence**: All view states persist to `localStorage` v2, with transparent migration from v1.
- **Freelance Portal**: A dedicated interface mounted under `/portal/*` for external freelancers, including Hub, Briefs, Gigs, Availability, Earnings, and Profile management. All portal data is stored in `localStorage` namespaced per Clerk user.
- **Production Schedule Picker**: A compact popover in the dashboard header for managing multi-phase production schedules (Setup, Rehearsal, Show, Load Out) with date and time inputs.
- **Production Tool ↔ Portal Brief Bridge**: Producers can share project context with freelancers via self-contained, Gzip-compressed, and base64url-encoded share URLs. These briefs can be imported by freelancers to create pre-filled Gigs.
- **Drawing Analyser (Rigg Plan tab)**: Allows producers to upload PDF or image drawings for AI-powered extraction of venue dimensions, stages, trusses, lighting fixtures, LED screens, and sound items. The backend uses Anthropic Claude for analysis and includes robust normalization, deduplication, and filtering of AI output.
    - **Security**: The analyser route is Clerk-guarded and rate-limited.
    - **Apply Step**: Extracted items can be applied to respective report tabs, generating editable rows.
    - **Motor Capacity Auto-pick**: Automatically suggests motor types based on hoist capacity hints in drawings.
    - **Floor-plan Backdrop**: Uploaded drawings can be used as an SVG image backdrop in the Rigg Plan View.
    - **Lighting → Rigging Report routing**: Extracted lighting fixtures whose `trussName` resolves to a rigging system (existing or auto-created) are added directly to that system's "Lighting Fixtures" group as `fixtureRows`, so they contribute to the rigging load. Each fixture name is matched against the user's `inventory.Fixtures` library (substring + token-overlap, gated to ≥ 2 meaningful tokens / ≥ 6 chars to avoid false positives); on match the user's calibrated weight/wattage/DMX modes are used, otherwise a Custom row carries the analyser's data verbatim. Analyser notes ride along via `linkedMeta`. Fixtures with no truss tag still land on the Lighting tab as standalone rows so the producer can assign them manually.
- **Brief Attachments**: Integration with Replit App Storage for handling brief attachments (e.g., drawings).
    - **Object Storage**: API endpoints for requesting presigned PUT URLs and streaming object content, with size and type validations.
    - **Producer Flow**: Producers can upload floor plans or other attachments which are then embedded as metadata in shared briefs.
    - **Freelancer Flow**: Freelancers can view and download attachments directly from the brief detail page.
    - **Auto-attached LED Diagrams**: When the producer hits "Share with Crew", the modal renders one PNG per non-empty LED screen (with the producer's pill-size scaling and power/signal markers baked in) and uploads each as a brief attachment alongside the floor plan. Failures are non-fatal and surface a soft warning so the textual brief still ships.

# External Dependencies

- **Clerk**: Authentication and user management.
- **PostgreSQL**: Relational database.
- **Drizzle ORM**: TypeScript ORM.
- **Zod**: Schema validation.
- **Orval**: OpenAPI code generator.
- **esbuild**: JavaScript bundler.
- **Anthropic Claude**: AI model for drawing analysis.
- **Replit App Storage**: Object storage for brief attachments.