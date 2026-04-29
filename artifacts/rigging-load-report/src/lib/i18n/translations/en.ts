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
  "view.crew": "Crew Report",
  "view.sound": "Sound Report",
  "view.riggPlan": "Rigg Plan",

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
