# EHS Production Tool & Freelance Portal — System Overview

A plain-English tour of what the whole system does today.

---

## The big picture

One app, two sides:

- **The Production Tool** — used internally at EHS by producers, riggers, and crew chiefs to plan a show end-to-end (what's hanging where, what it weighs, how it gets power, who's showing up, what gets paid).
- **The Freelance Portal** — used by external freelancers (techs, riggers, lighting ops, etc.) to receive job offers from EHS, accept or decline them, track their gigs, and keep their own logbook.

The two sides talk to each other through a single "share brief" button on the producer side that generates a private link the freelancer opens to import the job.

Sign-in for both sides goes through Clerk (Google login is the active method on production). Anyone can sign up; role choice (producer vs freelancer) lives on the sign-in screen.

---

## Production Tool — what each report does

When a producer opens the app they get a tabbed interface, one tab per discipline. Everything saves to the browser automatically, so they can close the tab and come back later.

### Rigging Report

The load-distribution calculator. Type in your truss systems, the gear hanging on each, the motor type, and the tool computes loads per pickup, picks safe motors (with a "None" fallback), flags Safe Working Load violations, and lets you reset cleanly if you want to start over.

### Lighting Report

The fixture list with DMX mode selection, channel auto-fill, and a feature-rich **Power Plan** that has gone through three big iterations:

- **v2 (distro-centric):** one card per physical distro/HOT (Schuko 16, CEE 32 1ph, CEE 16/32/63/125 3ph + custom). Drops on a channel reference fixtures from the Lighting list directly — no double-bookkeeping. Math uses 80% derate, 0.95 power factor, and warns if you're over 20% out of phase balance.
- **v2.1 (lighting workflow):** turns the rack diagram into something a producer actually wants to look at. Big L1/L2/L3 phase-stress bars on every distro, a visible "feed graph" showing how each HOT splits to which trusses, an Auto-suggest layout button that proposes a balanced power layout for unpowered fixtures and lets you Apply with one click, and a truss-first panel listing every truss with its fixtures, watts, and a per-truss Auto-assign button.
- **v2.2 (UI restructuring + crew export):** squeezes all that density into a clean accordion. Empty distros stay collapsed. Channel rows expand to show drops + cable selectors. Each distro has a Reset button, and a header **Export** button opens a printable Crew Manifest in a new tab — orange EHS header, project meta, per-distro spec cards, channel-by-channel drop tables, and a grand-total band — styled to match the Stage Build Sheet pixel-for-pixel.

### LED Screen Report

Pixel map generator with a dynamic panel library, an SVG canvas you can drag panels around on, processor capacity checks, build-by-size templates, cell-level on/off, cable & bracket BOMs, multi-processor support, and per-screen color presets.

### Rigg Plan View

A top-down floor plan with venue dimensions and dynamic truss placement, real-time SWL warnings, and a floor-plan library that handles multi-upload PDFs and dedupes across them.

### Crew Report

The call sheet: departments, names, call times, day rates (in NOK), and financial summaries.

### Sound Report

Audio inventory with category tags, quantity, weight, and power tracking.

### Stage Report View

Nivtec deck calculator: standard sizes, leg heights, bracing notes, and custom layouts with load capacity.

### Drawing Analyser (in Rigg Plan)

Drag in a PDF or image of a venue drawing and Anthropic's Claude extracts venue dimensions, stages, trusses, lighting, LED screens, and sound items. There's an "apply" step so you review before it writes into your reports, and extracted fixtures get auto-routed to the Rigging report when they're linked to a truss. Motor capacity auto-picks based on the load.

### EHS Equipment Library Picker

A reusable modal that pulls from a static catalog so you don't have to type fixture names.

### Persistence

Every tab's state is saved to the browser automatically (with a one-time migration from the old v1 format, so nothing is lost from older sessions).

---

## Freelance Portal — what freelancers use

Freelancers see a separate, simplified interface at `/portal/*`. Their data is namespaced per Clerk account, so two freelancers on the same browser don't see each other's gigs.

| Section | What it's for |
| --- | --- |
| **Hub** | Dashboard. Week-to-date and month-to-date earnings, upcoming gigs at a glance, jump links into details. |
| **Briefs** | Inbox of incoming job offers. The tab shows a number badge for pending briefs. Open a brief to see venue, dates, schedule, role, call/off times, and day rate, then Accept or Decline. |
| **Gigs** | Personal logbook. Every accepted brief lands here as Confirmed. You can also add gigs by hand. Mark them Done when worked, Paid when invoiced. |
| **Availability** | Calendar where you mark days as Busy. Those days feed into conflict checking on new briefs. |
| **Earnings** | Monthly breakdown of NOK earned, with status filters (Confirmed / Done / Paid). |
| **Profile** | Your name, phone, contact details — the bits producers see when you accept their brief. |
| **Help** | Guided tour of every screen plus a "Shortcuts you should know" card. Always reachable via the **?** button in the top bar. |

### Five quick wins

1. **Add to calendar (.ics)** — one click on any brief or accepted gig downloads a standard calendar file. Open it once and the events land in Apple Calendar, Google Calendar, Outlook, etc., with one entry per phase (Setup, Rehearsal, Show, Load Out).
2. **Personal call sheet PDF** — inside a brief, opens a printable one-pager (orange EHS header, your role, call/off times, full schedule) in a new tab. Save as PDF from the print dialog.
3. **Schedule conflict warning** — when accepting a brief that overlaps with a gig you already said yes to, or with a Busy day, you see a red alert listing the clashes and the Accept button changes to "Accept anyway" so it's a deliberate choice.
4. **On the way / Arrived check-in** — two pill buttons on every Confirmed gig. Tap once to stamp the time you set off and arrived; the pill turns indigo / green and remembers across reloads. Tap again to clear.
5. **Brief update banner** — if a producer re-shares a brief you already accepted, the next time you open it you see a yellow "The producer updated this brief" banner listing exactly what changed (venue, date, your call time, your notes, even "removed from the call sheet"). Acknowledge once you've read it.

---

## How the two sides connect — the Brief Bridge

This is the link between the Production Tool and the Portal:

1. The producer sets up the project on the Production Tool side (Crew Report fills in names and roles, project metadata fills in venue/date/manager, the Production Schedule Picker handles multi-phase production schedules).
2. They click **Share with crew**. The app gzip-compresses the relevant slice of project data and base64url-encodes it into a URL (so it fits in a chat message and needs no server). They send the link.
3. The freelancer opens the link. The Portal decodes it, normalises the data, and creates (or updates) a Brief in their inbox.
4. **Brief Attachments** use Replit App Storage — producers upload PDFs, photos, and the system also auto-attaches LED diagrams as PNGs. Freelancers view or download them inside the brief.
5. If the producer changes the project later and re-shares, the new brief overwrites the old one — but the Portal compares against the snapshot it took when the freelancer accepted, and shows the diff banner so nothing changes silently.

---

## What's running under the hood

The whole project is a pnpm monorepo with TypeScript, a React + Vite single-page app for the UI, and an Express + PostgreSQL + Drizzle backend for the bits that need a server (currently the AI drawing analysis, brief attachments via App Storage, and the API contracts that Orval generates type-safe React Query hooks for). Authentication is Clerk. Themes (light/dark) persist per user. State that doesn't need a server lives in the browser's `localStorage` with a versioned migration path, so producers and freelancers can pick up where they left off even without a network round-trip.

---

*Last updated: April 2026.*
