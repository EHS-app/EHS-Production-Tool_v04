/**
 * English translations — the source of truth.
 *
 * Every key declared here defines the contract that every other locale
 * (see sibling files like `no.ts`) must satisfy via the `Translations`
 * type. Keep the structure flat and dot-namespaced so editors can fuzzy-find
 * keys and so untranslated strings stay obvious in code review.
 *
 * Use `{name}` style placeholders for runtime interpolation; the `t()`
 * helper substitutes them via `params`.
 */
export const en = {
  // ---------- Common ----------
  "common.save": "Save",
  "common.cancel": "Cancel",
  "common.close": "Close",
  "common.delete": "Delete",
  "common.add": "Add",
  "common.remove": "Remove",
  "common.edit": "Edit",
  "common.loading": "Loading…",
  "common.back": "Back",
  "common.continue": "Continue",
  "common.confirm": "Confirm",
  "common.yes": "Yes",
  "common.no": "No",
  "common.ok": "OK",
  "common.print": "Print",
  "common.error": "Error",

  // ---------- Language selector ----------
  "language.label": "Language",
  "language.english": "English",
  "language.norwegian": "Norsk (Bokmål)",
  "language.short.en": "EN",
  "language.short.no": "NO",

  // ---------- Producer header (top doc actions) ----------
  "header.exportReport": "Export Report",
  "header.clientPack": "Client Pack",
  "header.simulateShow": "Simulate Show",
  "header.shareWithCrew": "Share with Crew",
  "header.projectSettings": "Project Settings",
  "header.reset": "Reset",
  "header.shareBrief": "Share Brief",
  "header.help": "Help",
  "header.helpTitle": "How the Production Tool works",

  // ---------- Help modal ----------
  "help.subtitle":
    "A quick tour of the Production Tool — the buttons in the header, every tab, and the small things that save you time.",
  "help.section.overview": "What is the Production Tool?",
  "help.overview.body":
    "It's the producer's worksheet for an entire show — rigging loads, lighting, sound, LED, stage build, crew & logistics, and the venue drawing analyser. Everything you type is saved in your browser as you go (look for the green ● Saved pill in the header). When you're ready to share, generate a Client Pack PDF or push per-crew briefs out to the Freelance Portal.",
  "help.section.headerActions": "Header buttons",
  "help.headerActions.reset":
    "Wipes the whole project — systems, crew, lighting, sound, stage and LED — back to a blank slate. Useful when you start a new show.",
  "help.headerActions.csv":
    "Downloads the active Rigging Report as a spreadsheet-friendly CSV (one row per hoist point).",
  "help.headerActions.exportReport":
    "Sends the Rigging Report to your printer / Save-as-PDF dialog. The print stylesheet is tuned for A4 landscape.",
  "help.headerActions.clientPack":
    "Opens a printable, client-facing pack covering schedule, crew, rigging, lighting, sound, stage, LED, risks and a cost summary — everything in one PDF.",
  "help.headerActions.simulateShow":
    "Runs a 10-phase dry-run from load-in through show to load-out. Each phase reports per-discipline status, risks and a final readiness verdict, so you can spot gaps before they bite you.",
  "help.headerActions.shareWithCrew":
    "Generates per-freelancer brief links you can hand out. The crew open them in the Freelance Portal to accept or decline, see their gigs, hotel and call times.",
  "help.section.tabs": "The tabs",
  "help.tabs.rigging":
    "Add hoist systems, drop in trusses and points, and watch the kg/W counters in the dark stat bar update live. Overload points turn red.",
  "help.tabs.lighting":
    "Track fixtures per system: type, count, wattage, dimmer / DMX needs. Feeds total power into the rigging summary.",
  "help.tabs.led":
    "Log LED panels, processing and rigging method. Catches power and weight in the project totals.",
  "help.tabs.stage":
    "Define stage geometry, decking and per-deck assembly numbering. The SVG preview shows leg counts and build direction.",
  "help.tabs.sound":
    "Capture the PA, monitor and mic plot for the show.",
  "help.tabs.crew":
    "One unified master sheet for everyone on the show: name, role, status, days worked, hotel, roommate, food and phone. Toggle Production details for call/off times and day rate, then Print for an A4 hand-off to the runner, hotel or catering.",
  "help.tabs.riggPlan":
    "Upload a venue PDF or photo. The drawing analyser extracts trusses, lighting, LED and sound items into editable overlay boxes — pre-fills the other tabs and learns from your corrections per venue.",
  "help.section.tips": "Good to know",
  "help.tips.autosave":
    "Everything autosaves to your browser. The ● Saved pill in the header shows the last write time.",
  "help.tips.language":
    "Switch between English and Norwegian any time using the EN / NO selector in the top-right corner.",
  "help.tips.portal":
    "The Portal button (top-right) opens the freelance side, where crew see the briefs you've shared.",
  "help.tips.print":
    "All Export and Print buttons are tuned for A4 landscape — Save-as-PDF in the print dialog produces the cleanest output.",
  "help.close": "Got it",

  // ---------- Project meta card ----------
  "project.venueProject": "Venue / Project",
  "project.client": "Client",
  "project.schedule": "Schedule",
  "project.projectManager": "Project manager",
  "project.placeholder.venue": "e.g. Sentrum Scene",
  "project.placeholder.client": "Customer name",
  "project.placeholder.manager": "Name",

  // ---------- Main view switcher ----------
  "view.rigging": "Rigging Report",
  "view.lighting": "Lighting Report",
  "view.led": "LED Screen Report",
  "view.stage": "Stage Report",
  "view.crew": "Crew & Logistics",
  "view.sound": "Sound Report",
  "view.riggPlan": "Smash It",

  // ---------- Reset confirm ----------
  "reset.confirm":
    "Reset the entire project? This will clear all systems, crew, lighting, sound, stage and LED data.",

  // ---------- Portal: navigation ----------
  "portal.nav.hub": "Hub",
  "portal.nav.briefs": "Briefs",
  "portal.nav.gigs": "Gigs",
  "portal.nav.availability": "Availability",
  "portal.nav.earnings": "Earnings",
  "portal.nav.profile": "Profile",
  "portal.nav.help": "Help",

  // ---------- Portal: header chrome ----------
  "portal.header.title": "Freelance Portal",
  "portal.header.subtitle": "EHS personal logbook",
  "portal.header.productionTool": "Production Tool",
  "portal.header.productionToolShort": "Tool",
  "portal.header.lightMode": "Light mode",
  "portal.header.darkMode": "Dark mode",
  "portal.header.signOut": "Sign out",

  // ---------- Portal: briefs list ----------
  "portal.briefs.title": "Briefs",
  "portal.briefs.subtitle": "Project briefings shared with you by EHS production",
  "portal.briefs.empty.title": "No briefs yet",
  "portal.briefs.empty.body":
    "When EHS production shares a project with you, it'll show up here.",
  "portal.briefs.pendingBadge": "{count} new",
  "portal.briefs.for": "for {client}",
  "portal.briefs.relative.justNow": "just now",
  "portal.briefs.relative.minutesAgo": "{n} min ago",
  "portal.briefs.relative.hoursAgo": "{n} h ago",
  "portal.briefs.relative.daysAgo": "{n} d ago",
  "portal.briefs.decision.new": "New",
  "portal.briefs.decision.accepted": "Accepted",
  "portal.briefs.decision.declined": "Declined",

  // ---------- Portal: brief detail ----------
  "portal.brief.for": "for {client}",
  "portal.brief.accept": "Accept",
  "portal.brief.decline": "Decline",
  "portal.brief.accepted": "Accepted",
  "portal.brief.declined": "Declined",
  "portal.brief.preparedBy": "Prepared by {name}",
  "portal.brief.phase.setup": "Setup",
  "portal.brief.phase.rehearsal": "Rehearsal",
  "portal.brief.phase.show": "Show",
  "portal.brief.phase.loadOut": "Load Out",

  // ---------- Errors / notifications ----------
  "error.generic": "Something went wrong. Please try again.",
  "error.network": "Network error. Check your connection and retry.",
  "error.saveFailed": "Could not save your changes.",
  "notif.saved": "Saved.",
  "notif.briefShared": "Brief shared.",
  "notif.briefAccepted": "Brief accepted.",
  "notif.briefDeclined": "Brief declined.",

  // ---------- Fart button (lighthearted feature) ----------
  "fart.tooltip": "Emergency Fart",
  "fart.input.placeholder": "Enter name",
  "fart.submit": "Fart 💨",
  "fart.title.default": "{name} just farted 💨",
  "fart.title.destroyed": "{name} destroyed the atmosphere 💨",
  "fart.title.nuclear": "{name} unleashed a nuclear blast 💨",
} as const;
