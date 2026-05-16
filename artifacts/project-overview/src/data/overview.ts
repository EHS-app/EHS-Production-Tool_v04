export type FeatureCategory =
  | "Core"
  | "LED"
  | "Crew & Logistics"
  | "Freelance Portal"
  | "AI"
  | "Persistence"
  | "Internationalization";

export type Feature = {
  title: string;
  category: FeatureCategory;
  description: string;
};

export type FlowStep = {
  actor: "Producer" | "Freelancer" | "System";
  action: string;
  result: string;
};

export type FileEntry = {
  path: string;
  role: string;
};

export type LogicEntry = {
  title: string;
  description: string;
  where: string;
};

export type GapEntry = {
  title: string;
  status: "Deferred" | "Partial" | "Not started";
  detail: string;
};

export type KnownIssue = {
  title: string;
  severity: "Cosmetic" | "Dev-only" | "Functional";
  detail: string;
};

export const projectMeta = {
  name: "EHS Rigging Load Report",
  tagline:
    "Internal stage-tech tool for EHS — rigging, lighting, LED, sound, stage, and crew/logistics in one place.",
  audience:
    "EHS production team (internal) and contracted freelancers via a separate portal.",
  stack: [
    "React 18 + Vite (frontend)",
    "Express 5 + Drizzle ORM + PostgreSQL (backend)",
    "TypeScript 5.9 + Zod + Orval-generated React Query hooks",
    "Clerk (auth)",
    "React Flow v12 (LED System Designer)",
    "Anthropic Claude (AI extraction for inspections + drawings)",
    "pnpm workspaces (monorepo)",
  ],
} as const;

export const features: Feature[] = [
  {
    title: "Rigging Report",
    category: "Core",
    description:
      "Hoist systems with points and trusses. Static + dynamic loads calculated per point with live SWL warnings; overloaded points turn red instantly.",
  },
  {
    title: "Lighting Report",
    category: "Core",
    description:
      "Fixtures per system: type, count, wattage, DMX channels. Total power feeds back into the rigging summary automatically.",
  },
  {
    title: "LED Screen Report",
    category: "LED",
    description:
      "Touring-grade LED workflow. Basic mode for quoting, Advanced mode for engineering (brightness, refresh, bit depth, HDR, voltage region, scan profile, genlock, backup signal).",
  },
  {
    title: "Sound, Stage, Crew, Hotel, Catering, Rigg Plan tabs",
    category: "Core",
    description:
      "Specialized calculators and inventory pages for every discipline. SVG stage previews with leg counts and build direction; rigg plan drag-and-drop on uploaded venue plans.",
  },
  {
    title: "LED Port Mapping",
    category: "LED",
    description:
      "Cell-level assignment of each cabinet to a specific processor port. Cells tint by port colour; validation flags ports that exceed the processor's max cabinets per data chain.",
  },
  {
    title: "LED Validation Drawer",
    category: "LED",
    description:
      "Slide-out panel listing every issue — power-chain overloads, CAT-6 over 90 m, fiber over 300 m, processor over capacity, orphaned screens. Click to jump.",
  },
  {
    title: "LED System Designer",
    category: "LED",
    description:
      "React Flow canvas for full signal/fiber/power topology. Palette: Screens, Processors, CVT10 Pro-S fiber boxes, PSUs, Media Servers, Network Switches, UPS, Power Distros, Genlock. Typed cables (Signal / Fiber / Power) with backup + bandwidth metadata.",
  },
  {
    title: "Patch sheet + Cabinet-ID CSV exports",
    category: "LED",
    description:
      "One-click CSV exports — one row per cabinet (screen, port, chain, row, column, pixel offset) and a cabinet-ID list for the video tech.",
  },
  {
    title: "Client PDF Pack",
    category: "Core",
    description:
      "Single printable client-facing PDF with 11 numbered sections covering schedule, crew, rigging, lighting, sound, stage, LED, risk assessment, and cost summary.",
  },
  {
    title: "Show Simulation Engine",
    category: "Core",
    description:
      "10-phase dry-run from load-in through show day to load-out. Reports per-discipline status, aggregated risks, and a readiness verdict per phase.",
  },
  {
    title: "Crew & Logistics master sheet",
    category: "Crew & Logistics",
    description:
      "Unified table — one row per person with Name, Role, Status, Days, Hotel, Roommate, Food, Phone, Notes. Production-details toggle adds Call / Off / Day rate. A4 landscape print for runner / hotel / catering handoff.",
  },
  {
    title: "Available Crew Sidebar",
    category: "Crew & Logistics",
    description:
      "Producer-facing roster panel with filter chips for skills and availability. Direct crew addition to call sheets.",
  },
  {
    title: "Hotel Logistics (twin-share pairing)",
    category: "Crew & Logistics",
    description:
      "Per-person needs hotel toggle, auto check-in/out, pairing engine by overlap + share preference + optional gender hint, lockable pairings, swap individuals. PDF rooming list for the front desk. Row-level locking on writes.",
  },
  {
    title: "Catering Aggregation",
    category: "Crew & Logistics",
    description:
      "Per-day breakdown of confirmed crew meals, dietary restrictions, and allergies. One-click PDF export for venue chefs.",
  },
  {
    title: "Freelance Portal",
    category: "Freelance Portal",
    description:
      "External-facing app for freelancers — Hub, Briefs, Gigs, Availability, Earnings, Profile, Help. iCal export and conflict warnings.",
  },
  {
    title: "Crew Request Loop (first-to-accept-wins)",
    category: "Freelance Portal",
    description:
      "Transactional system — the first freelancer to accept a brief wins, others are marked as 'too late'. Accepted briefs materialize as gigs.",
  },
  {
    title: "Gmail send-on-brief",
    category: "Freelance Portal",
    description:
      "Sends email notifications to new brief recipients using the producer's connected Gmail account.",
  },
  {
    title: "Freelancer Itinerary + .ics",
    category: "Freelance Portal",
    description:
      "Per-day view combining call/off times, active schedule phases, hotel state (check-in/out, room key, roommate). 'Add to calendar' enriches the .ics with hotel events.",
  },
  {
    title: "Inspection / Befaring tab",
    category: "AI",
    description:
      "Free-form notes during a venue visit. Claude extracts and organizes into Equipment / Schedule / Technical / General. Confidence indicators per item, editable inline. Supports Norwegian and English input.",
  },
  {
    title: "Drawing Analyser (Rigg Plan)",
    category: "AI",
    description:
      "Claude extracts venue dimensions, stages, trusses, lighting, LED screens, and sound items from PDF/image drawings. Three modes — Classic, Geometry, Production. Per-item bounding box + confidence.",
  },
  {
    title: "Overlay Editor + Per-Venue Learning Memory",
    category: "AI",
    description:
      "Click-to-edit boxes on top of the drawing — drag, resize, relabel. Each (user, venue) pair stores last corrected items as a hint injected into the next analysis prompt.",
  },
  {
    title: "Auto-save + Project switcher",
    category: "Persistence",
    description:
      "localStorage v2 (instant, offline) + 5-second debounced cloud sync. Multiple projects per user, load/switch, 'Save as new project' fork. Pending saves flush before switching.",
  },
  {
    title: "Production Tool ↔ Portal Brief Bridge",
    category: "Persistence",
    description:
      "Share project context with freelancers via gzip-compressed base64url share URLs. Shared Postgres tables store freelancer profiles, briefs, brief assignments, and gigs.",
  },
  {
    title: "Brief Attachments (Object Storage)",
    category: "Persistence",
    description:
      "Replit App Storage integration for brief attachments. API endpoints for upload, view, and download.",
  },
  {
    title: "Internationalization (EN / NB)",
    category: "Internationalization",
    description:
      "Custom typed i18n with browser language detection. Locale-aware formatting (nb-NO for Norwegian, en-GB for English). NOK currency always nb-NO. Mounted above ClerkProvider so signed-out + signed-in surfaces share one locale.",
  },
  {
    title: "Theme (Light / Dark / System)",
    category: "Internationalization",
    description:
      "3-way segmented control. System default follows OS prefers-color-scheme and live-updates. Inline control on both sign-in and Portal header.",
  },
  {
    title: "Help modal + Command palette",
    category: "Core",
    description:
      "Help walks through sidebar, top bar, and the LED tab in 8 steps. Command palette (Cmd/Ctrl+K) lists all pages and shell actions with live filtering.",
  },
];

export const userFlow: FlowStep[] = [
  {
    actor: "Producer",
    action: "Signs in (Clerk — email/password or Google)",
    result: "Lands in Production Tool with their last project auto-loaded",
  },
  {
    actor: "Producer",
    action: "Fills discipline tabs (Rigging, Lighting, LED, Sound, Stage, Rigg Plan)",
    result: "Live calcs roll up into the Overview KPI cards",
  },
  {
    actor: "Producer",
    action: "Adds crew to the master sheet and toggles hotel / catering needs",
    result: "Logistics chips on the Overview tab update; rooming/catering aggregations are ready to export",
  },
  {
    actor: "Producer",
    action: "Clicks Share Brief and selects freelancers",
    result: "Personal brief links are generated; Gmail sends invitation emails",
  },
  {
    actor: "Freelancer",
    action: "Opens brief link in the Freelance Portal and accepts",
    result: "Brief converts to a gig; calendars and rosters update; first-to-accept wins",
  },
  {
    actor: "Freelancer",
    action: "Sets availability, hotel needs, and dietary restrictions",
    result: "Hotel pairing engine suggests roommates; catering aggregation picks up restrictions",
  },
  {
    actor: "Producer",
    action: "Exports Client Pack PDF / CSV / rigging report",
    result: "Single document covering the entire production goes to the client",
  },
  {
    actor: "System",
    action: "Auto-saves every change",
    result: "localStorage v2 instantly + 5s debounced cloud sync to Postgres",
  },
];

export const inputs: string[] = [
  "Panel + processor catalog selections (LED, lighting, sound, stage)",
  "Hoist points and truss geometry",
  "Crew assignments, working days, hotel/food preferences",
  "Production schedule phases (load-in → show → load-out)",
  "Free-form inspection notes (text)",
  "PDF / image venue drawings",
  "Brief metadata (client, venue, dates) and attachments",
  "Freelancer availability and accept/decline responses",
];

export const outputs: string[] = [
  "Rigging report (live SWL warnings, point-by-point loads)",
  "Client Pack PDF (11 numbered sections)",
  "Rigging CSV export (one row per hoist point)",
  "LED Patch-sheet CSV + Cabinet-ID CSV",
  "Hotel rooming list PDF",
  "Catering allergen + headcount PDF",
  "Show Simulation report (per-phase readiness)",
  "Brief share URLs (gzip + base64url)",
  ".ics calendar exports with hotel events",
  "AI-extracted structured data from inspections + drawings",
];

export const keyFiles: FileEntry[] = [
  { path: "artifacts/rigging-load-report/src/App.tsx", role: "Main shell — Production Tool routes, sidebar, project state" },
  { path: "artifacts/rigging-load-report/src/components/LedScreenReportView.tsx", role: "LED tab dashboard + per-screen rows + advanced inspector mount" },
  { path: "artifacts/rigging-load-report/src/components/LedSystemDesigner.tsx", role: "React Flow v12 topology canvas with node + edge editors" },
  { path: "artifacts/rigging-load-report/src/components/led/*", role: "Mode toggle, Rig Accessories, Advanced Screen Inspector, Validation Drawer, Port Mapping" },
  { path: "artifacts/rigging-load-report/src/lib/led.ts", role: "LedScreen / LedSettings / LedLinkedMeta types + sanitizers" },
  { path: "artifacts/rigging-load-report/src/lib/ledSystem.ts", role: "LedSystemNode + LedSystemEdge types incl. new touring node kinds" },
  { path: "artifacts/rigging-load-report/src/lib/led/engine/{power,signal,routing}.ts", role: "Pure calculation engines (no React)" },
  { path: "artifacts/rigging-load-report/src/lib/led/validation/{rules,runValidation}.ts", role: "Declarative validation rules + composer" },
  { path: "artifacts/rigging-load-report/src/components/HelpModal.tsx", role: "Bilingual help walkthrough — sidebar, top bar, LED how-to (8 steps), tips" },
  { path: "artifacts/rigging-load-report/src/components/CommandPalette.tsx", role: "Cmd/Ctrl+K palette — pages + shell actions, live filter, arrow nav" },
  { path: "artifacts/rigging-load-report/src/lib/i18n/translations/{en,no}.ts", role: "Source-of-truth EN translations + matching NB translations" },
  { path: "artifacts/api-server/src/routes/*", role: "Express route handlers — projects, briefs, gigs, hotel pairing, inspection, drawing analyser" },
  { path: "lib/db/src/schema/*", role: "Drizzle table definitions — projects, freelancerProfiles, projectBriefs, gigs, briefRoomAssignments, venueMemory" },
  { path: "lib/api-spec/openapi.yaml", role: "Single source of truth for API contracts (Orval → Zod + React Query hooks)" },
];

export const businessLogic: LogicEntry[] = [
  {
    title: "Rigging load calculation",
    description:
      "Static + dynamic loads per hoist point with live SWL warnings. Overloaded points turn red as you edit the report.",
    where: "components/RiggingReportView.tsx + lib/load/*",
  },
  {
    title: "LED power engine",
    description:
      "Per-screen amperage from area × W/m² × brightness factor × overhead × power factor, divided by per-screen breaker rating from voltageRegion (EU-230 / US-208 / US-120). Power-chain overload only fires when chainsRequired is non-null.",
    where: "lib/led/engine/power.ts + lib/led/validation/rules.ts",
  },
  {
    title: "LED signal / routing engine",
    description:
      "Cabinets-per-chain limits (16 default for Uniview URPro-B), CAT-6 max 90 m, fiber max 300 m, processor max ports/pixels per model. Auto / row / column / manual port assignment.",
    where: "lib/led/engine/{signal,routing}.ts",
  },
  {
    title: "LED validation composer",
    description:
      "Declarative rule list categorised by STRUCTURAL / SIGNAL / POWER / RIGGING / BROADCAST. Each issue has screenId so the drawer can jump to it.",
    where: "lib/led/validation/runValidation.ts",
  },
  {
    title: "Hotel pairing engine",
    description:
      "Suggests twin-share rooms by overlap + room-share preference + (optional) gender hint. Producer can lock pairings and swap individuals between rooms. Writes use FOR UPDATE row-locking.",
    where: "api-server hotel routes + assignRooms() helper",
  },
  {
    title: "First-to-accept-wins crew request",
    description:
      "Transactional gate on brief assignment — the first accept wins, all others are marked 'too late'. Materialises a gig on success.",
    where: "api-server brief routes",
  },
  {
    title: "Brief Bridge share URLs",
    description:
      "Project context gzip-compressed and base64url-encoded into a URL the Freelance Portal can decode and render.",
    where: "components/ShareBriefModal.tsx + brief encode/decode helpers",
  },
  {
    title: "Show Simulation",
    description:
      "10-phase dry-run engine. Each phase reports per-discipline status, risks, and a readiness verdict.",
    where: "lib/showSim/* + components/ShowSimReport.tsx",
  },
  {
    title: "Auto-save & project switching",
    description:
      "localStorage v2 first (instant, offline-capable, v1→v2 migration transparent). Cloud sync to Postgres debounced 5 s. Switching projects flushes pending saves first.",
    where: "lib/persist/* + api-server project routes",
  },
];

export const gaps: GapEntry[] = [
  {
    title: "SVG overlays on Pixel Map",
    status: "Deferred",
    detail:
      "Port-tint, curve preview, and rotation visual layers — engineering data is captured per cabinet, just not painted onto the SVG canvas yet.",
  },
  {
    title: "Failure simulation",
    status: "Not started",
    detail:
      "'Simulate failed port / broken CAT / dead cabinet / PSU failure / broken redundant loop' UI is in the charter but not built. Data model supports it.",
  },
  {
    title: "Deployment profiles (Festival / Touring / Corporate / Broadcast / Permanent Install)",
    status: "Not started",
    detail:
      "Profile-level strictness, redundancy, margins, brightness, and overhead presets. Engine reads each setting per-screen today, not from a project profile.",
  },
  {
    title: "Extra LED exports",
    status: "Partial",
    detail:
      "Patch sheet + Cabinet IDs shipped. Processor mappings CSV, cable-runs CSV, power-distro CSV, and engineering-warning PDF are deferred.",
  },
  {
    title: "Edge latency + cycle detection",
    status: "Partial",
    detail:
      "System Designer captures bandwidth + backup. Latency estimation and cycle detection in topology are deferred.",
  },
  {
    title: "Touring height + curve hang validation rules",
    status: "Not started",
    detail:
      "Manual specifies 8 m max hang at 10× safety factor / 10 m at 8× safety factor, and curve hangs must use 500 mm trimmed beams. Not yet encoded as validation rules.",
  },
];

export const knownIssues: KnownIssue[] = [
  {
    title: "Stale HMR / Fast-Refresh warnings during dev",
    severity: "Dev-only",
    detail:
      "Editing files that export both components and non-component values (SCHEDULE_PHASE_LABELS, clearUserRole) triggers Vite's 'Could not Fast Refresh' invalidation. A page reload clears it.",
  },
  {
    title: "Dev-only auto-sign-in path",
    severity: "Dev-only",
    detail:
      "Preview auto-logs in as Admin. Strictly gated by NODE_ENV / import.meta.env.DEV, never ships to production builds.",
  },
  {
    title: "React Flow nodeTypes/edgeTypes warning",
    severity: "Cosmetic",
    detail:
      "React Flow logs a warning when nodeTypes/edgeTypes objects change identity per render. Both are module-level constants now, so the warning is only fired during HMR reloads.",
  },
  {
    title: "Email/password sign-in disabled on prod Clerk instance",
    severity: "Functional",
    detail:
      "Currently Google sign-in is the only active method on prod. Email/password can be re-enabled from the Auth pane in the Replit Workspace toolbar.",
  },
];
