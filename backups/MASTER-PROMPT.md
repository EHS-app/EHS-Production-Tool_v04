# EHS Production Tool + Freelance Portal — Master Build Prompt

> Paste this entire file into Replit Agent (or any other coding agent) as the
> starting brief. It describes the whole product as it exists today so the
> agent can rebuild, extend, or migrate it without losing context.

---

## 1. What I want you to build

A **bilingual (English / Norwegian Bokmål) internal web app for a Norwegian
event-production company called EHS (Lyd · Lys · Bilde)**. It has two
audiences sharing one codebase:

1. **Production Tool** — used by internal producers to plan a show end-to-end
   (rigging loads, lighting, LED screens, stage build, sound, crew &
   logistics, AI-assisted drawing analysis, client PDF pack, brief sharing).
2. **Freelance Portal** — used by external freelancers (riggers, LDs, A2s,
   stage hands, drivers) to receive briefs, accept gigs, manage availability,
   view their itinerary, and track earnings.

Both halves talk to **one shared Postgres database** so a producer's brief
flows directly to the freelancer's portal in real time.

There is **no public landing page** — this is invitation-only / open-sign-up
internal tooling. The sign-in card is the entry point.

---

## 2. Tech stack (non-negotiable defaults)

- **Monorepo:** pnpm workspaces, TypeScript 5.9, Node 24
- **Frontend:** React 18 + Vite, single-page app per artifact
- **Backend:** Express 5, served as one API artifact at `/api`
- **Database:** Replit-managed Postgres + Drizzle ORM
- **Validation:** Zod (+ `drizzle-zod` for schema-derived types)
- **API contract:** OpenAPI spec → Orval codegen → generated React Query
  hooks + Zod schemas (contract-first, no hand-rolled fetch helpers)
- **Auth:** Clerk (Replit's managed Clerk integration — free, no MAU limit)
- **AI:** Anthropic Claude (drawing analyser only)
- **Object storage:** Replit App Storage (brief attachments)
- **Logging:** Pino via `req.log` in routes, singleton `logger` elsewhere —
  **never `console.log` in server code**
- **Routing:** wouter on the client; path-based artifact routing
- **Build:** esbuild for the API, Vite for each web artifact, static publish
  for frontends
- **Deployment target:** Replit Autoscale for the API, static for the SPA

### Monorepo layout

```
artifacts/
  rigging-load-report/      # main React SPA — Production Tool + Portal
  api-server/               # Express API
  phase-b-deck/             # internal slide deck (optional)
  mockup-sandbox/           # design/preview sandbox (optional)
lib/
  db/                       # drizzle schemas + migrations
  api-spec/                 # OpenAPI source of truth
  api-zod/                  # Zod schemas generated from spec
  api-client-react/         # React Query hooks generated from spec
  crewRoster/               # shared roster merge logic
scripts/                    # one-off / maintenance scripts
```

Libs are composite (`tsc --build` / `emitDeclarationOnly`); artifacts are
leaf packages typechecked with `tsc --noEmit`.

---

## 3. Authentication & access model

- **Provider:** Clerk via Replit integration. Google sign-in is the active
  method on production (email/password is currently disabled at the Clerk
  instance).
- **Sign-in screen:** unified card with EHS logo, dynamic product subtitle,
  a role toggle (**Producer** vs **Freelancer**), tabbed Sign in / Sign up,
  embedded Clerk widget. Bilingual.
- **Dev-only auto-sign-in:** in `import.meta.env.DEV` only, the API exposes
  `POST /api/dev/auto-signin-token` and the client auto-signs in as a fixed
  test admin so reloads don't require manual login. **Must be hard-gated by
  NODE_ENV — never present in production builds.**
- **Role routing:** if Clerk metadata or sign-in intent says "freelancer",
  redirect to `/portal`; otherwise the user lands on the Production Tool root.
- **Admin passwords never touch the browser.** All privileged ops are
  server-side.

---

## 4. Feature catalogue

### 4.1 Production Tool (root path `/`)

The producer's workspace. Top of page is a dark hero with logo, "Production
Tool" wordmark, a bottom-of-the-button row of doc-actions and a tabbed
report area underneath.

**Header doc-actions row (left → right):**

- **Save indicator** (live "Saved HH:MM" pill — autosave to localStorage v2)
- **Help** (`?`) — opens a responsive modal explaining every header button,
  every tab, four tips. Bilingual, focus-trapped, Esc/×/backdrop close,
  responsive: 820 px on big laptops, 760 px on standard laptops, full-screen
  bottom sheet on phones.
- **Reset** — clears the project (with confirm)
- **CSV** — exports current report as CSV
- **Export Report** — exports a printable report PDF
- **Client Pack** — generates an 11-section client-facing PDF
- **Simulate Show** — opens the Show Simulation engine
- **Share with Crew** — gzip+base64url-encodes the project context into a
  share URL the freelancer can open in the Portal

**Project metadata row:** Venue/Project, Client, Schedule (multi-phase
production schedule popover), Project Manager.

**Tabs (each is a full report view):**

1. **Rigging Report** — load calculations per system, hoist points, peak
   SWL utilization with chart, motor power totals, overload detection.
2. **Lighting Report** — fixture inventory, DMX universes, dimmer planning.
3. **LED Screen Report** — pixel mapping, processor planning, panel grids.
4. **Stage Report** — deck layout SVG preview with build direction
   (left-to-right or right-to-left), per-deck assembly numbering, leg
   counts, riser stairs.
5. **Sound Report** — PA design, amp racks, monitor world, infrastructure.
6. **Crew & Logistics** — see 4.2.
7. **Smash It** (Rigg Plan) — see 4.3.

### 4.2 Crew & Logistics tab (Production Tool)

**Layout:** one unified `MasterCrewSheet` table replaces the older split
between RosterTable + inline call sheet. One row per person with columns:
Name, Role, Status, Days, Hotel, Roommate, Food, Phone, Notes.

- "Production details" toggle adds Call / Off / Day rate columns.
- **Print** button → A4-landscape printable handoff (runner / hotel /
  catering versions).
- **AvailableCrewSidebar** — filterable roster panel (skills, availability)
  with one-click add to the call sheet.
- **AdequacyPanel** — sits below as a non-dominant sidekick, flags missing
  roles.
- **Catering Aggregation** — per-day breakdown of meals, dietary
  restrictions, allergies; one-click PDF export for the venue chef.
- **Hotel Logistics** — producer toggles "needs hotel" per crew member;
  check-in/check-out default to first/morning-after-last working day with
  per-person overrides; pairing engine suggests twin-share rooms by overlap
  + room-share preference + optional gender hint; producer can lock pairings
  and swap individuals between rooms (server uses `FOR UPDATE` row locking
  on writes); rooming-list PDF export. Multi-gig freelancers aggregate into
  one row per person across the GET / PATCH / pairing / lock pipeline.
- **Crew Request Loop — first-to-accept-wins** — transactional: the first
  freelancer to accept a brief wins, others get "too late".
- **Crew Request → Gig conversion** — accepting a brief materialises a gig,
  updates calendars and rosters atomically.
- **Crew Request email-on-send (Gmail)** — sends notification emails to new
  brief recipients via the producer's connected Gmail account.

### 4.3 Smash It tab — AI Drawing Analyser & Overlay Editor

- Producer uploads a PDF or image of a venue drawing.
- **Drawing Analyser** sends it to Claude with one of three prompts:
  - **Classic** — schema-only extraction
  - **Geometry** — adds truss anchoring + alignment + motor heuristics
  - **Production** — drawing tables are source-of-truth, mismatches flagged
    in `notes`, supports Position Groups and Floor / Pipe mounting
- Claude returns structured items (venue dimensions, stages, trusses,
  lighting positions, LED screens, sound items) each with a per-item
  bounding box and confidence score; low-confidence items are flagged for
  review.
- **Overlay Editor** — click-to-edit boxes layered on the rasterised
  drawing. Producers can drag, resize, relabel, add or delete items.
  Round-trip preserves payload fields the editor doesn't surface (e.g.
  fixture wattages) so untouched values aren't accidentally erased.
- **Per-Venue Learning Memory** — each `(Clerk userId, venue-name)` pair has
  a `venue_memory` row storing the last set of corrected items. Next
  analysis of the same venue injects a hint into the prompt
  ("trusses usually present: LX1, LX2…"). Writes are best-effort, fire on
  both Save-corrections and Apply-to-reports, and are guarded against stale
  completions via a token + venue-identity check.
- One click pushes corrected items into the Lighting / LED / Stage /
  Rigging report tabs.

### 4.4 Freelance Portal (path `/portal`)

Sidebar nav with sections: **Hub, Briefs, Gigs, Availability, Earnings,
Profile, Help**. Header shows the EHS logo, "Freelance Portal" title,
"EHS personal logbook" subtitle, a link back to the Production Tool (only
visible if the user has producer role), the Help "?", a 3-way Light/Dark/
System theme control, the user's email and Sign out. The whole portal is
fully bilingual via `useT()`.

**Hub** — greeting (locale-aware date), 4 stat cards (Month-to-date NOK,
Ready to invoice NOK, Days marked, Logged gigs), Today / This week /
Upcoming sections with empty states and "Log a gig →" CTAs, and a
"Finish your profile" banner if profile is incomplete.

**Briefs** — list of incoming briefs (pending / accepted / declined / too
late), header with subtitle, "New" badge, decision pills, locale-aware
relative time, empty state ("No briefs yet").

**BriefDetail** — full brief view with attachments, schedule, role, call &
off times, dietary / hotel preferences, **personal call-sheet PDF** button
(print-to-PDF one-page sheet), **Add to calendar** (`.ics` enriched with
all-day check-in / check-out events from the itinerary).

**Gigs** — log past/upcoming gigs manually, edit auto-generated ones from
accepted briefs. Bidirectional optimistic sync with conflict resolution
across multiple devices.

**Availability** — calendar of "Busy" days the producer must respect.
Schedule conflict warning fires before a brief can be accepted.

**Earnings** — monthly NOK totals, ready-to-invoice list, full ledger.
NOK currency always rendered `nb-NO` regardless of UI language.

**Profile** — contact details, skills, certifications, room-share
preference, dietary restrictions / allergies — feeds Hotel & Catering on
the producer side.

**Itinerary section** (inside BriefDetail) — per-day combined view of call/
off times + active schedule phases + hotel state (check-in/out + room key +
roommate name when both are accepted). Backed by
`GET /api/portal/briefs/:id/itinerary`, accepted-only access gate.

**Help** — assembled from key descriptors (`SECTIONS` + `QUICK_ACTIONS`
arrays). Sections: Overview, Hub, Briefs, Gigs, Availability, Earnings,
Profile, Shortcuts; quick-action cards: Add to calendar, Personal call
sheet PDF, Schedule conflict warning, Hotel/roommate, Room-share preference.

### 4.5 Cross-cutting UX features

- **i18n:** custom typed module. Two locales: `en` and `no` (Bokmål).
  `I18nProvider` mounted **above** `ClerkProvider` so signed-out and
  signed-in surfaces share one locale. Floating `LanguageSelector` chip
  (top-right, 2-letter trigger → popup with "English" / "Norsk") visible
  on every screen including sign-in. Browser-language detection on first
  visit, then persisted. Locale-sensitive `Intl.DateTimeFormat` uses
  `nb-NO` or `en-GB`. NOK currency always `nb-NO`. Translation keys live
  in `src/lib/i18n/translations/{en,no}.ts` — `en.ts` is the source of
  truth for the `TranslationKey` type; `no.ts` must mirror every key.

- **Theme:** 3-way segmented control (Light / Dark / System). System is the
  install default — follows OS `prefers-color-scheme` and live-updates if
  the OS scheme changes. Same control on the sign-in screen
  (`InlineThemeSegmentedControl`) and the Portal header (`PortalThemeSeg`).
  Implemented as `role="radiogroup"` with three `role="radio"` buttons,
  `aria-checked`, roving `tabIndex`, Arrow / Home / End keyboard nav.
  Selected option uses EHS orange `#f88000`.

- **Persistence:** all view state autosaves to `localStorage` v2 with
  transparent migration from v1.

- **Production Tool ↔ Portal Brief Bridge:** project context can be shared
  with a freelancer via gzip-compressed, base64url-encoded URL (works even
  for non-account-holders).

- **Brief Attachments:** Replit App Storage; API endpoints for upload and
  signed view/download.

- **Client PDF Pack:** single printable client-facing PDF, 11 numbered
  sections, generated client-side from current project state.

- **Show Simulation Engine:** printable phase-by-phase report with
  discipline status, aggregated risks, readiness scores.

- **"Fart button"** (lighthearted internal joke): floating bottom-right
  launcher that plays a sound effect. **Production Tool only — never on
  the Portal.** Mounted inside the catchall Route alongside `<App />`.

- **Help modal** (Production Tool): focus-trapped, Esc / × / backdrop
  closes, responsive (820 / 760 px / mobile bottom sheet at ≤ 600 px).
  Styled with `.modal-content.help-modal` compound selector to beat the
  base `.modal-content` width: 400px rule.

---

## 5. Data model (Drizzle schemas in `lib/db/src/schema/`)

- **`freelancerProfiles`** — clerkUserId, displayName, contact, skills[],
  certifications[], roomSharePref, dietary[], allergies[], gender hint
  (optional, hotel-pairing only).
- **`projectBriefs`** — owner clerkUserId, project metadata, schedule
  phases, attachments, snapshot of report state at send time.
- **`briefAssignments`** — many-to-many brief ↔ freelancer with status
  (`pending` / `accepted` / `declined` / `too_late`), accepted timestamp,
  per-assignment overrides.
- **`gigs`** — materialised when a brief is accepted; one per
  (freelancer, brief, role). Stores assignedWorkingDays (overridable).
- **`briefRoomAssignments`** — hotel rooms; (briefId, roomKey,
  occupants[clerkUserId, clerkUserId]). Locked-by-producer flag. Writes
  use `SELECT ... FOR UPDATE`.
- **`venueMemory`** — `(clerkUserId, venueNameNormalized)` → JSON blob of
  last corrected items, last analysis token. Best-effort upsert.

All writes are server-side, validated with Zod schemas derived from the
Drizzle table definitions.

---

## 6. API surface (`artifacts/api-server/src/routes/`)

- `GET  /api/healthz` — health check
- `POST /api/dev/auto-signin-token` — DEV ONLY, returns a Clerk token for
  the test admin
- `GET  /api/portal/briefs/mine` — accepted/pending briefs for the signed-in
  freelancer
- `GET  /api/portal/briefs/:id` — single brief detail (access-gated)
- `GET  /api/portal/briefs/:id/roster` — roster including phone +
  roomKey + roommateName (producer/owner only)
- `GET  /api/portal/briefs/:id/itinerary` — per-day itinerary (accepted
  freelancers only)
- `POST /api/portal/briefs/:id/decision` — accept / decline (transactional)
- `GET  /api/portal/gigs` — freelancer's gigs (auto + manual)
- `POST /api/portal/gigs` / `PATCH /api/portal/gigs/:id` — bidirectional
  sync with optimistic conflict resolution
- `GET/PATCH /api/portal/profile`
- `POST /api/rigplan/analyze` — Claude-powered drawing analysis
- `POST /api/storage/uploads/sign` + `GET /api/storage/objects/:key` —
  brief attachments

Every route uses Pino via `req.log`. All payloads validated with Zod
schemas generated by Orval from the OpenAPI spec.

---

## 7. Visual / brand

- **Primary brand colour:** EHS orange `#f88000`
- **Logo:** orange "EHS" wordmark with thin "LYD · LYS · BILDE" footer
- **Typography:** clean sans (system stack); h1/h2 are bold; uppercase
  small-caps section kickers in muted colour
- **Cards:** soft border + 14–18 px radius + subtle shadow
- **Status pills:** orange (active/accepted), grey (pending), red
  (declined / too late / overload), green (saved / ready)
- **Dark mode:** deep navy header, near-black body (`#0b1220`-ish), white
  text, orange accents
- **Icons:** lucide-react throughout

---

## 8. Hard rules / pitfalls to avoid

- **Never `console.log` in server code** — use Pino.
- **Never put admin passwords or service keys in the browser bundle.**
- **Never re-mount `<I18nProvider>` inside the Clerk subtree** — it lives
  at root above ClerkProvider so the language selector works on the
  sign-in screen too.
- **Never run `pnpm dev` at the workspace root** — each artifact has its
  own workflow that wires up `PORT` and `BASE_PATH`.
- **Never add Vite proxy configs to reach the API** — the Replit shared
  proxy already routes `/api` to the API server.
- **Never hardcode a port in `vite.config.ts`** — read `PORT` from env.
- **Never edit `artifact.toml` or `.replit` by hand** — use the artifact
  skill.
- **Dev auto-sign-in must be hard-gated by `import.meta.env.DEV`** — must
  not leak to production.
- **NOK currency must always format as `nb-NO`** even when UI language is
  English (Norwegian invoice convention).
- **`en.ts` is the source of truth for `TranslationKey`; `no.ts` must
  mirror every key** — missing keys break typecheck.
- **The Fart button is Production Tool only** — never render it on the
  Portal.
- **Use the OpenAPI spec as the contract** — generate Zod schemas + React
  Query hooks via Orval; do not hand-roll fetch helpers or DTOs.
- **Hotel pairing writes need `SELECT ... FOR UPDATE`** to avoid races
  between producers editing simultaneously.
- **Help modal must be responsive** — use the compound selector
  `.modal-content.help-modal` to beat base `.modal-content` width.

---

## 9. Build / restore order (when starting from this prompt)

1. Scaffold the pnpm monorepo (`pnpm-workspace.yaml`, root `package.json`,
   `tsconfig.base.json`, `tsconfig.json` solution file).
2. Create `lib/db` (Drizzle schemas above) and run initial migration
   against the Replit-managed Postgres.
3. Create `lib/api-spec` with the OpenAPI document covering routes in §6;
   wire up Orval to emit `lib/api-zod` and `lib/api-client-react`.
4. Scaffold `artifacts/api-server` (Express 5 + Pino + Clerk middleware +
   Drizzle), implement routes in §6.
5. Scaffold `artifacts/rigging-load-report` (React + Vite). Implement in
   this order:
   1. App shell (Clerk + I18nProvider at root, theme system, language
      selector, sign-in screen)
   2. Production Tool report tabs (Rigging → Lighting → LED → Stage →
      Sound → Crew & Logistics → Smash It)
   3. Help modal + share-with-crew encoding
   4. Freelance Portal (PortalLayout → Hub → Briefs → BriefDetail →
      Gigs → Availability → Earnings → Profile → Help)
   5. Drawing analyser (server route + Smash It tab UI + Overlay Editor)
   6. Hotel & Catering aggregation
   7. Itinerary + .ics enrichment
6. Add the Replit App Storage bucket and wire `/api/storage` routes.
7. Connect Clerk via the Replit integration; add Google as the sign-in
   provider.
8. Add the Anthropic integration via Replit AI Integrations (so billing
   goes through Replit, no separate Anthropic key needed).
9. Configure deployment: API as Autoscale, SPA as static.

---

## 10. Out-of-scope follow-ups (known unfinished work)

- The Portal screens **Gigs / Availability / Earnings / Profile /
  BriefDetail** still contain hardcoded English strings — wire `useT()`
  through them the same way Hub / Briefs / Help were done.
- A CI guard that diffs `en.ts` vs `no.ts` keys would prevent locale drift.
- Optional: localize remaining sign-in ARIA labels.

---

*This prompt was generated as a snapshot of the EHS Rigging Load Report
project on 2 May 2026.*
