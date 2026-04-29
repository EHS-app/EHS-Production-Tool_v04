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
        - **Build-by-size + shape templates + per-cell ON/OFF + cable/bracket BOM + multi-processor per screen**: Each row's new "Shape" cell exposes a "Shape…" popover (target W/H in m → snaps `panelsWide` × `panelsTall` to the nearest fit for the chosen panel) and template chips (Rectangle, L, U, T, +, Stairs, Ribbon, Columns) that fill `disabledCells` so the producer can build non-rectangular walls without hand-toggling. A sibling "Edit" button arms cell-toggle mode so any cabinet on the live preview can be flipped on/off; disabled cells render hatched in both the in-app SVG and the exported PNG, and are subtracted from the panel/pixel/area/weight/power totals (the bounding-box `pixelsX/pixelsY` are kept so framing stays unchanged). Cell-anchored markers (`panelMarkers: { kind: "power"|"signal", index, col, row }`) replace free-coord placement: clicking a cabinet while +P/+S is armed drops a corner badge (P1, S1, …); clicking the same cell+kind again removes it. A new "Cable & bracket BOM" card under the Screens table lists per-screen TrueOne power cables (0.6 m daisy-chains) + signal cables (1.3 m daisy-chains) + brackets (per panel `bracketName`, with a soft "(set bracket on inventory)" hint when the panel has none) and totals across all screens. Each row also gets a per-screen Processors strip ("+ Add" → Novastar MX30 / MX40 Pro from `NOVASTAR_PROCESSOR_CATALOG`) so a single screen can be fed by multiple processors; the strip shows combined outputs / pixel cap vs the screen's required pixels with an "Under capacity" pill when over-budget. The Share-with-Crew brief and `BriefDetail` portal view list the shape, disabled-panel count, cables, brackets, and processor allocation per screen.
        - **Per-screen color presets + canvas selection + drag**: Each LED screen carries optional `panelColorDark` / `panelColorLight` (per-screen panel-grid override; falls back to global `ledSettings` when undefined) and optional `posX` / `posY` (explicit canvas coordinates; falls back to left-to-right auto-flow when undefined). Adding a screen or importing screens from a PDF cycles through `LED_PANEL_COLOR_PRESETS` so the second, third, etc. screens get distinct colors automatically. The Color column in the Screens table now has a per-row preset chip picker (with an "Auto" chip that clears the override). On the Pixel Map canvas, clicking anywhere inside a screen selects it (blue halo + matching `led-row-selected` row tint in the table); clicking a row selects its screen too. A small ⠿ drag handle at the top-left of each screen lets the producer reposition screens around the canvas — the viewBox grows to include negative positions. A "Reset positions" button in the Pixel Map header (enabled only when at least one screen has been moved) clears all `posX` / `posY` to return everything to auto-flow. Linked screens (from the rigging report) intentionally hide the drag handle since their position is derived data, not LED-tab state.
    - **Rigg Plan View**: Top-down floor plan with venue dimensions, dynamic truss placement, and real-time SWL warnings. The venue is **optional**: producers can delete it (the "Delete venue" button on the Venue card head, which also clears every placed truss because trusses live in the venue's coordinate frame) and re-create it with the standard 20×12×8 m default via the "+ Add venue" CTA in the empty state. The top-bar Reset wipes the venue too (the new `DEFAULT_RIGG_PLAN.venue` is `null`). Brief generation skips the rigg plan section when there's no venue, so a "Share with Crew" with no venue still works for the rest of the report.
        - **Floor-plan library** (multi-upload): Floor plans are stored as a `{ plans: FloorPlan[]; activeId: string|null }` library (localStorage key `ehs-rigging-floor-plan-library-v1`, with one-shot migration from the legacy single-plan key `ehs-rigging-floor-plan-v1`). Each plan has its own id; the producer can upload several PDFs/images per project (rigging plan + lighting plan + stage layout, etc.), pick which one the canvas renders via a radio in the new "Floor plans" card, and delete individual ones. The 8 MB total budget drops oldest non-active plans first when overflowing. The Share-with-Crew modal embeds the active plan via `loadActiveFloorPlan()`.
        - **Cross-PDF dedup on import**: When a producer uploads multiple drawings of the same project, `applyExtractedItems` collapses recurring items by normalised name so a truss labelled "LX1" on every PDF becomes ONE rigging system, not three. Same dedup applies to lighting fixtures (per-system + name), LED screens, stages, and sound items. The function now returns an `ApplySummary` (per-category added/skipped counts) which the importer renders as an "Added N items, skipped N duplicates" banner so producers can see exactly what landed and what was already there.
        - **Truss delete from the Rigg Plan table**: Each row of the Trusses table on the Rigg Plan tab now ends with a red "Delete" column that calls the host's existing `removeSystem` (which keeps its own confirm dialog, so the inline button does NOT add a second confirm).
        - **Delete the last system → clean slate**: `removeSystem` no longer hard-blocks when only one system remains. Instead, the × on the very last system tab prompts a "remove and start fresh?" confirm and replaces the array with a single `makeEmptySystem("System 1")` (no truss row, no motor, no fixtures). This lets producers wipe a set of imported LX1/LX2/... systems and end on a clean blank starting point without touching the venue, floor plans, or inventory. The × control is now also rendered on every tab regardless of count.
    - **Crew Report**: Call-sheet management for crew members including departments, call times, day rates, and financial summaries. Day rates and per-department / total cost summaries are formatted in **NOK** (Norwegian kroner, `nb-NO` locale, "kr 5 000" style) so they line up with the Freelance Portal's earnings reporting. Departments include: Rigging, Lighting, Lighting FOH, Video / LED, AV FOH, Sound, System Tech, Stage, Stage Hand, Driver, Project Manager, Other. The brief share modal sublabels and the portal's "My assignment" pill also render the day rate as "kr {rate}".
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