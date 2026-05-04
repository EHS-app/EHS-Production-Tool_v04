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
    "One unified master sheet for everyone on the show: name, role, status, days worked, hotel, food and phone. Toggle Production details for call/off times and day rate, then Print for an A4 hand-off to the runner, hotel or catering.",
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
  "view.lighting": "Lights",
  "view.led": "LED Screen",
  "view.stage": "Stage",
  "view.crew": "Crew & Logistics",
  "view.sound": "Sound",
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

  // ---------- Theme picker (shared 3-way segmented control) ----------
  "theme.label": "Theme",
  "theme.light": "Light",
  "theme.dark": "Dark",
  "theme.system": "System",
  "theme.lightAria": "Light theme",
  "theme.darkAria": "Dark theme",
  "theme.systemAria": "System theme",
  "theme.title": "Choose theme: Light, Dark, or System",

  // ---------- Sign-in screen (additional) ----------
  "signin.title": "Sign in to EHS",
  "signin.role.employee": "Employee",
  "signin.role.employee.sub": "Production Tool",
  "signin.role.freelancer": "Freelancer",
  "signin.role.freelancer.sub": "Freelance Portal",
  "signin.role.aria": "I am signing in as",
  "signin.tab.signIn": "Sign in",
  "signin.tab.signUp": "Sign up",
  "signin.contact": "Questions? Contact {email}",
  "signin.product.tool": "Production Tool",
  "signin.product.portal": "Freelance Portal",

  // ---------- Portal: header chrome (additional) ----------
  "portal.header.helpAria": "Help",
  "portal.header.helpTitle": "Help & tips",
  "portal.header.toolTitle": "Switch to Production Tool",
  "portal.header.briefsBadgeAria": "{count} new briefs",
  "portal.header.signedInAs": "Signed in as {label}. Click to sign out.",
  "portal.header.sectionsAria": "Portal sections",

  // ---------- Portal: gig status (used in Hub, Gigs, Briefs) ----------
  "portal.gigStatus.invited": "Invited",
  "portal.gigStatus.confirmed": "Confirmed",
  "portal.gigStatus.done": "Done",
  "portal.gigStatus.invoiced": "Invoiced",
  "portal.gigStatus.paid": "Paid",

  // ---------- Portal: Hub screen ----------
  "portal.hub.greetingNamed": "Hi {name}",
  "portal.hub.greetingAnon": "Hi",
  "portal.hub.banner.singleNew": "New project briefing: {venue}",
  "portal.hub.banner.manyNew": "{count} new project briefings waiting",
  "portal.hub.untitledShow": "Untitled show",
  "portal.hub.stat.monthToDate": "Month-to-date",
  "portal.hub.stat.readyToInvoice": "Ready to invoice",
  "portal.hub.stat.daysMarked": "Days marked",
  "portal.hub.stat.daysSingular": "day",
  "portal.hub.stat.daysPlural": "days",
  "portal.hub.stat.loggedGigs": "Logged gigs",
  "portal.hub.section.today": "Today",
  "portal.hub.section.thisWeek": "This week",
  "portal.hub.section.upcoming": "Upcoming",
  "portal.hub.empty.today": "Nothing on the schedule today.",
  "portal.hub.empty.week": "No more gigs this week.",
  "portal.hub.empty.upcoming": "No future gigs logged yet.",
  "portal.hub.cta.logGig": "Log a gig",
  "portal.hub.cta.viewAllUpcoming": "View all {count} upcoming →",
  "portal.hub.profile.title": "Finish your profile",
  "portal.hub.profile.body":
    "A complete profile helps EHS leads find you for the right gigs. Add your contact details, skills and certifications.",
  "portal.hub.profile.cta": "Edit profile",

  // ---------- Portal: Briefs screen (additional) ----------
  "portal.briefs.section.awaiting": "Awaiting your decision",
  "portal.briefs.section.history": "History",
  "portal.briefs.untitledShow": "Untitled show",
  "portal.briefs.genericBriefing": "Generic briefing",
  "portal.briefs.callPrefix": "call {time}",
  "portal.briefs.decision.filled": "Filled",
  "portal.briefs.newBadge": "{count} new",
  /* portal.briefs.empty.body already defined above (line ~138) */

  // ---------- Portal: Help screen ----------
  "portal.help.kicker": "Help & tips",
  "portal.help.title": "How to use the Freelance Portal",
  "portal.help.intro":
    "A quick tour of every section, plus the shortcuts that save the most time. Tap any heading below to jump in.",
  "portal.help.jumpTo": "Jump to a section",
  "portal.help.shortcuts.title": "Shortcuts you should know",
  "portal.help.shortcuts.intro": "Five small features that make a big difference.",
  "portal.help.tipPrefix": "Tip:",
  "portal.help.stuck.title": "Still stuck?",
  "portal.help.stuck.before":
    "Reach out to your EHS contact or the producer who shared the brief. You can also ",
  "portal.help.stuck.linkText": "update your contact details",
  "portal.help.stuck.after": " so producers know how to reach you.",

  // Hub section
  "portal.help.hub.short": "Hub",
  "portal.help.hub.title": "Hub — your dashboard",
  "portal.help.hub.intro":
    "The Hub is the first thing you see. It shows what you're working on this week, this month and what's coming next.",
  "portal.help.hub.step1": "Scan the top cards for week-to-date and month-to-date earnings.",
  "portal.help.hub.step2":
    "Check the upcoming gig list to see your next call times at a glance.",
  "portal.help.hub.step3":
    "Tap any gig card to jump into its details on the Gigs page.",
  "portal.help.hub.tip":
    "If a card looks empty, you probably have no accepted gigs yet — head to Briefs to accept one, or to Gigs to add one manually.",

  // Briefs section
  "portal.help.briefs.short": "Briefs",
  "portal.help.briefs.title": "Briefs — incoming work offers",
  "portal.help.briefs.intro":
    "When a producer shares a project briefing with you, it lands here. The number badge on the Briefs tab tells you how many are waiting for a decision.",
  "portal.help.briefs.step1":
    "Open a brief to see the venue, schedule, your role, call/off times and day rate.",
  "portal.help.briefs.step2":
    "Tap Accept to add it to your gigs as Confirmed, or Decline if you can't take it.",
  "portal.help.briefs.step3":
    "If the producer changes a brief after you accepted, you'll see a yellow \"The producer updated this brief\" banner the next time you open it — tap Acknowledge changes once you've read what changed.",
  "portal.help.briefs.tip":
    "If a brief overlaps with a gig you already accepted (or a day you marked Busy), a red Schedule conflict warning appears before you commit, and the Accept button changes to \"Accept anyway\".",

  // Gigs section
  "portal.help.gigs.short": "Gigs",
  "portal.help.gigs.title": "Gigs — your logbook",
  "portal.help.gigs.intro":
    "Every confirmed job lives here. You can also add gigs by hand if a producer didn't go through the portal.",
  "portal.help.gigs.step1":
    "Tap + Add gig to log a job manually with venue, dates, role and rate.",
  "portal.help.gigs.step2":
    "On the day of a Confirmed gig, tap On the way when you leave, then Arrived when you reach the venue. The pills turn indigo and green and remember the timestamp.",
  "portal.help.gigs.step3":
    "Tap Add to calendar on a gig to download a calendar file (.ics) you can open in Apple Calendar, Google Calendar or Outlook.",
  "portal.help.gigs.step4":
    "Mark gigs Done once they're complete so they roll into your Earnings totals.",
  "portal.help.gigs.tip":
    "Tap a green ✓ Arrived pill again to clear it if you tapped it by mistake.",

  // Availability section
  "portal.help.availability.short": "Availability",
  "portal.help.availability.title": "Availability — block out days you can't work",
  "portal.help.availability.intro":
    "Mark days as Busy to keep your own schedule honest. The portal uses these dates to warn you about conflicts when accepting new briefs.",
  "portal.help.availability.step1":
    "Tap a day on the calendar to toggle it between Available and Busy.",
  "portal.help.availability.step2":
    "Busy days appear in conflict warnings on briefs that fall on those dates.",

  // Earnings section
  "portal.help.earnings.short": "Earnings",
  "portal.help.earnings.title": "Earnings — see what you're billing",
  "portal.help.earnings.intro":
    "A monthly breakdown of what you've earned across all your gigs. Useful when you're doing your books or invoicing.",
  "portal.help.earnings.step1":
    "Pick a month to see the gigs that contributed and the total NOK.",
  "portal.help.earnings.step2":
    "Status filters let you separate Confirmed (still upcoming), Done (worked, awaiting payment) and Paid.",

  // Profile section
  "portal.help.profile.short": "Profile",
  "portal.help.profile.title": "Profile — who you are to producers",
  "portal.help.profile.intro":
    "The name, phone and contact details producers see when you accept their brief.",
  "portal.help.profile.step1":
    "Fill in your full name, phone and any role tags so producers can find you.",
  "portal.help.profile.step2":
    "Switch theme (Light, Dark or System) using the segmented control in the top bar.",

  // Quick action shortcuts
  "portal.help.qa.calendar.title": "Add to calendar",
  "portal.help.qa.calendar.body":
    "On any brief or accepted gig, this button downloads a standard .ics file. Open it once and the event lands in your phone or laptop calendar with the right dates and times.",
  "portal.help.qa.callsheet.title": "Personal call sheet PDF",
  "portal.help.qa.callsheet.body":
    "Inside a brief, this opens a printable one-page call sheet with your role, call/off times and the full schedule. From the print dialog you can save it as a PDF.",
  "portal.help.qa.conflict.title": "Schedule conflict warning",
  "portal.help.qa.conflict.body":
    "Before you accept a brief, the portal cross-checks it against your existing gigs and your Busy days. If anything overlaps, you'll see a red alert listing the clashes.",
  "portal.help.qa.checkin.title": "On the way / Arrived check-in",
  "portal.help.qa.checkin.body":
    "On Confirmed gigs in the Gigs page, two pill buttons let you stamp the time you set off and arrived. They persist across reloads so you have a record afterwards.",
  "portal.help.qa.update.title": "Brief update banner",
  "portal.help.qa.update.body":
    "If a producer re-shares a brief you already accepted, the BriefDetail page shows a banner listing what changed (venue, date, your call time, notes…) so you don't miss silent edits.",

  // ---------- Shell / sidebar (Production Tool chrome) ----------
  "shell.nav.project": "Project",
  "shell.nav.logistics": "Logistics",
  "shell.nav.overview": "Overview",
  "shell.nav.rigging": "Rigging",
  "shell.nav.lighting": "Lights",
  "shell.nav.led": "LED",
  "shell.nav.sound": "Sound",
  "shell.nav.stage": "Stage",
  "shell.nav.riggPlan": "Rigg Plan",
  "shell.nav.crew": "Crew",
  "shell.nav.hotel": "Hotel",
  "shell.nav.catering": "Catering",
  "shell.search": "Search project",
  "shell.searchTitle": "Search project (coming soon)",
  "shell.newSystem": "New system",
  "shell.newSystemTitle": "Add new system",
  "shell.help": "Help",
  "shell.settings": "Settings",
  "shell.signOut": "Sign out",
  "shell.breadcrumb.projects": "Projects",
  "shell.breadcrumb.untitled": "Untitled",
  "shell.saved": "Saved {time}",
  "shell.savedTitle": "Saved locally in browser",
  "shell.moreActions": "More actions",
  "shell.portalLink": "Freelance Portal",
  "shell.userRole.producer": "Producer",
  "shell.action.shareBrief": "Share brief",
  "shell.action.shareBriefTitle": "Generate per-crew brief links for freelancers",
  "shell.action.clientPack": "Client Pack",
  "shell.action.clientPackTitle": "Open client pack with schedule, crew, rigging and cost",
  "shell.action.printReport": "Print report",
  "shell.action.printReportTitle": "Print rigging report",
  "shell.action.downloadCsv": "Download CSV",
  "shell.action.simulate": "Simulate show",
  "shell.action.simulateTitle": "Run through 10 production phases with risk and verdict",
  "shell.action.resetProject": "Reset project",

  // ---------- Overview dashboard ----------
  "overview.crewSchedule": "Crew & Schedule",
  "overview.viewFullSchedule": "View full schedule",
  "overview.noCrew": "No crew added yet.",
  "overview.addCrew": "Add crew",
  "overview.nameRole": "Name & Role",
  "overview.legend.confirmed": "Confirmed",
  "overview.legend.pending": "Awaiting reply",
  "overview.legend.cancelled": "Cancelled",
  "overview.technicalSystems": "Technical Systems",
  "overview.openRigReport": "Open rigging report",
  "overview.noSystems": "No systems registered yet.",
  "overview.buildFirstSystem": "Build first system",
  "overview.logistics": "Logistics",
  "overview.hotel": "Hotel",
  "overview.shareBriefHotel": "Share brief to activate hotel info",
  "overview.catering": "Catering",
  "overview.shareBriefCatering": "Share brief to activate catering",
  "overview.activityTitle": "Activity",
  "overview.noActivity": "No activity yet.",

  // Overview KPI labels
  "overview.kpi.crew": "Crew",
  "overview.kpi.confirmedOf": "{confirmed} confirmed",
  "overview.kpi.readyPct": "{pct}% ready",
  "overview.kpi.peakLoad": "Peak load",
  "overview.kpi.tonnes": "tonnes",
  "overview.kpi.overloadCount": "{n} overload",
  "overview.kpi.swlCap": "SWL cap {value} t",
  "overview.kpi.ledPanels": "LED panels",
  "overview.kpi.inScreens": "in {n} screen",
  "overview.kpi.inScreensPlural": "in {n} screens",
  "overview.kpi.power": "Power",
  "overview.kpi.hoistPoints": "{n} hoist points",

  // Overview system card labels
  "overview.system.points": "{n} points",
  "overview.system.static": "Static",
  "overview.system.peakLoad": "Peak load",
  "overview.system.power": "Power",
  "overview.system.ledWall": "LED wall",
  "overview.system.screens": "{n} screen · {panels} panels",
  "overview.system.screensPlural": "{n} screens · {panels} panels",
  "overview.system.area": "Area",
  "overview.system.weight": "Weight",
  "overview.system.sound": "Sound",
  "overview.system.units": "{n} unit",
  "overview.system.unitsPlural": "{n} units",
  "overview.system.lights": "Lighting rig",
  "overview.system.fixturesTotalPlural": "{n} fixtures total",
  "overview.system.stage": "Stage",
  "overview.system.stageUnits": "{n} stage unit",
  "overview.system.stageUnitsPlural": "{n} stage units",

  // Overview activity feed
  "overview.activity.saved": "Project saved",
  "overview.activity.savedBody": "Changes are saved in your browser",
  "overview.activity.overloadTitle": "{n} hoist points over SWL",
  "overview.activity.overloadBody": "Check the Rigging Report and redistribute the load",
  "overview.activity.now": "Now",
  "overview.activity.briefShared": "Brief shared with crew",
  "overview.activity.briefSharedBody": "Catering and hotel info will activate when crew responds",
  "overview.activity.active": "Active",
  "overview.activity.noBrief": "Brief not shared yet",
  "overview.activity.noBriefBody": "Click \"Share brief\" to send invitations to crew",
  "overview.activity.welcome": "Welcome to EHS Production Tool",
  "overview.activity.welcomeBody": "Start by registering the venue and adding your first rigging system.",

  // Overview project status
  "overview.status.overload": "Overload",
  "overview.status.empty": "Empty",
  "overview.status.active": "Active",
  "overview.status.draft": "Draft",

  // Overview crew summary
  "overview.crewSummary.none": "No crew added",
  "overview.crewSummary.line": "{confirmed}/{total} confirmed · {pending} pending · {declined} cancelled",

  // Overview hotel/catering active
  "overview.hotelActive": "Hotel active",
  "overview.hotelActiveSub": "Per-night aggregated from brief",
  "overview.openHotelTab": "Open hotel tab",
  "overview.cateringActive": "Catering active",
  "overview.cateringActiveSub": "Allergies and diets aggregated from crew",
  "overview.openCateringTab": "Open catering tab",

  // Misc
  "overview.defaultUser": "User",
} as const;
