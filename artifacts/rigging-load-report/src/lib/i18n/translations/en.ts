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
  "header.helpTitle": "EHS Production Tool",

  // ---------- Help modal ----------
  "help.subtitle":
    "Your tactical command center for technical production — every discipline, every number, one workspace.",
  "help.section.overview": "What is this?",
  "help.overview.body":
    "The Production Tool is a complete workspace for planning and managing live events. You build your show across the sidebar tabs — rigging loads, lighting, LED, sound, stage, crew and logistics — and the Overview dashboard gives you a real-time snapshot of the entire production. Everything autosaves to your browser as you work.",

  "help.section.sidebar": "Sidebar — your project",
  "help.sidebar.overview":
    "The live dashboard. Shows KPI cards (peak load, power, LED panels, crew count), a crew schedule grid, system status cards, logistics chips for hotel and catering, and an activity feed — all updating in real time.",
  "help.sidebar.rigging":
    "Build hoist systems with points and trusses. Static and dynamic loads are calculated per point with live SWL warnings — overloaded points turn red instantly.",
  "help.sidebar.lighting":
    "Track fixtures per system: type, count, wattage, DMX channels. Total power feeds back into the rigging summary automatically.",
  "help.sidebar.led":
    "Configure LED screens end-to-end — panel catalog, processor outputs, pixel pitch, rigging method, Basic / Advanced mode with touring-grade engineering fields (brightness, refresh, bit depth, HDR, voltage region, scan profile, genlock, backup signal), per-screen Rig Accessories (hanging beams, corner pieces, motors, safety bonds), cell-level Port Mapping, a live Validation drawer that flags chain overloads / runs over CAT‑6 90 m / fiber 300 m / processor capacity / orphaned screens, a System Designer with media servers, network switches, UPS and power-distro nodes, and one-click Patch-sheet + Cabinet-ID CSV exports. Power and weight roll up into the project totals.",
  "help.sidebar.sound":
    "Log your PA, monitors, and mic setup. Weight per unit feeds into the rigging calculations.",
  "help.sidebar.stage":
    "Define stage geometry, decking, and assembly numbering. The SVG preview shows leg counts and build direction.",
  "help.sidebar.riggPlan":
    "A top-down 2D canvas for placing trusses on the venue floor plan. Upload a PDF or image, and drag-and-drop your rigging layout.",
  "help.sidebar.crew":
    "Master crew sheet — name, role, status, assigned days, hotel, dietary needs, and phone. Toggle production details for call times and day rates.",
  "help.sidebar.hotel":
    "Rooming list aggregated from crew briefs. Activates automatically when you share a brief and crew respond with their hotel needs.",
  "help.sidebar.catering":
    "Dietary requirements and meal scheduling aggregated from crew responses. Shows allergies, diets, and headcounts per meal.",

  "help.section.headerActions": "Top bar actions",
  "help.headerActions.shareBrief":
    "The main action button. Creates personal brief links for each freelancer — they open them in the Freelance Portal to accept or decline, see their gigs, hotel, and call times.",
  "help.headerActions.clientPack":
    "Generates a complete, client-ready PDF covering schedule, crew, rigging, lighting, sound, stage, LED, risk assessment, and cost summary — the entire production in one document.",
  "help.headerActions.reset":
    "Clears the entire project — all systems, crew, lighting, sound, stage, and LED — back to a blank slate. Use when you start a new show.",
  "help.headerActions.csv":
    "Downloads the rigging report as a spreadsheet-friendly CSV file (one row per hoist point).",
  "help.headerActions.exportReport":
    "Sends the rigging report to your printer or Save-as-PDF dialog. The print layout is optimized for A4 landscape.",
  "help.headerActions.simulateShow":
    "Runs a 10-phase dry-run from load-in through show day to load-out. Each phase reports per-discipline status, risks, and a readiness verdict — so you can spot gaps before they become problems.",

  "help.section.ledHowto": "How to use the LED tab",
  "help.ledHowto.intro":
    "The LED tab is a top-down workflow. Start in Basic mode for fast quoting; flip on Advanced mode when you need touring-grade engineering (brightness, refresh, voltage, port mapping, validation, rig accessories). Every section reads from the screens you set up at the top.",
  "help.ledHowto.step1.title": "1. Add screens",
  "help.ledHowto.step1.body":
    "Click \"+ Add Screen\" or add an LED row on the Rigging Report — linked screens appear here automatically. Pick a panel from the catalog (e.g. Uniview URPro-B 0.5×1 m or 0.5×0.5 m 90° corner), set the panels-wide × panels-tall grid, and assign a processor output. The Pixel Map and BOM update live.",
  "help.ledHowto.step2.title": "2. Shape the Pixel Map",
  "help.ledHowto.step2.body":
    "Drag screens around the canvas to lay out the wall. Use per-screen \"Shape\" mode to disable individual cabinets for L-shapes, ribbons, columns, or any custom geometry. Drop power and signal markers on specific cabinets to document where each cable lands.",
  "help.ledHowto.step3.title": "3. Switch to Advanced mode",
  "help.ledHowto.step3.body":
    "The Mode toggle above the screen table flips every row into Advanced. Each screen gets an inspector for brightness (nits), refresh rate, bit depth (8/10/12+), HDR, gamma curve, cabinet rotation, transparency, voltage region (EU‑230 / US‑208 / US‑120), power overhead %, power factor, scan profile, camera-safe mode, genlock and backup signal. All fields are optional — leave them blank for quick quotes.",
  "help.ledHowto.step4.title": "4. Rig Accessories per screen",
  "help.ledHowto.step4.body":
    "In Advanced mode, open Rig Accessories on any screen to add hanging beams (500 mm / 1000 mm), corner pieces, hoisting suites, motors, and safety bonds with per-line quantities. Weights roll into the rigging totals so the truck list and point loads stay correct.",
  "help.ledHowto.step5.title": "5. Port Mapping (cell-level)",
  "help.ledHowto.step5.body":
    "The Port Mapping panel lets you assign each cabinet to a specific processor port. Cells tint by port colour so you can see at a glance which cabinet goes where. The validation engine flags any port that exceeds the processor's max cabinets per data chain.",
  "help.ledHowto.step6.title": "6. Run Validation",
  "help.ledHowto.step6.body":
    "Click the Validation button in the touring strip to open the slide-out drawer. It lists every error and warning — power-chain overloads (per the screen's voltage region), data-chain overloads, CAT‑6 over 90 m, fiber over 300 m, processor over pixel/port capacity, orphaned screens, missing port assignments. Click any issue to jump straight to that screen.",
  "help.ledHowto.step7.title": "7. Draw the System",
  "help.ledHowto.step7.body":
    "In the System Designer, the palette covers Screens, Processors, CVT10 Pro-S fiber boxes, Power Supplies, and the touring add-ons: Media Servers, Network Switches, UPS, Power Distros, and Genlock generators. Pick a cable type (Signal / Fiber / Power) and drag from one node's edge to another. Click any cable to mark it as Backup or set its bandwidth. Click any node to edit it in the inspector — set the Novastar model on a processor, link a screen node to a real LED screen for live pixel counts, or enter the cable distance in metres.",
  "help.ledHowto.step8.title": "8. Export the patch sheet",
  "help.ledHowto.step8.body":
    "The CSV menu in the touring strip exports a Patch sheet (one row per cabinet — screen, port, chain, row, column, pixel offset) and a Cabinet-ID list. Send the patch sheet to your video tech ahead of load-in so the processors are pre-mapped before cabinets are even unflightcased.",

  "help.section.tips": "Good to know",
  "help.tips.autosave":
    "Everything autosaves to your browser. The green \"Saved\" indicator in the top bar shows the last save time.",
  "help.tips.language":
    "Switch between English and Norwegian any time with the EN/NO button in the top-right corner.",
  "help.tips.portal":
    "The Freelance Portal link in the sidebar footer opens the crew-facing side, where freelancers see the briefs you've shared, manage their gigs, and view their itinerary.",
  "help.tips.print":
    "All print and export features are optimized for A4 landscape. Use Save-as-PDF in the print dialog for the cleanest output.",
  "help.tips.theme":
    "Switch between light, dark, and system theme from the settings menu next to your name at the bottom of the sidebar.",
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
  "portal.nav.hours": "Hours",
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
  "shell.nav.inspection": "Inspection",
  "shell.nav.crew": "Crew",
  "shell.nav.hotel": "Hotel",
  "shell.nav.catering": "Catering",
  "shell.search": "Search project",
  "shell.searchTitle": "Search project",
  "shell.searchPlaceholder": "Type to search pages and actions…",
  "shell.searchNoResults": "No results found.",
  "shell.searchGroupPages": "Pages",
  "shell.searchGroupActions": "Actions",
  "shell.newSystem": "New system",
  "shell.newSystemTitle": "Add new system",
  "shell.help": "Help",
  "shell.settings": "Settings",
  "shell.signOut": "Sign out",
  "shell.breadcrumb.projects": "Projects",
  "shell.breadcrumb.untitled": "Untitled",
  "shell.saved": "Saved {time}",
  "shell.savedTitle": "Saved locally in browser",
  "shell.savedCloud": "Saved to cloud {time}",
  "projects.title": "Your Projects",
  "projects.subtitle": "Open a saved project or start a new one.",
  "projects.new": "New project",
  "projects.saveAs": "Save as new project",
  "projects.saveAsTitle": "Save current work as a new project",
  "projects.open": "Open",
  "projects.delete": "Delete",
  "projects.deleteConfirm": "Delete this project? This cannot be undone.",
  "projects.noProjects": "No saved projects yet.",
  "projects.noProjectsSub": "Your work is saved automatically. It will appear here.",
  "projects.search": "Search projects…",
  "projects.updated": "Updated",
  "projects.created": "Created",
  "projects.loading": "Loading projects…",
  "projects.untitled": "Untitled project",
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

  // ---------- Inspection / Befaring ----------
  "inspection.title": "Site Inspection",
  "inspection.notesLabel": "Inspection Notes",
  "inspection.notesPlaceholder": "Write your notes here…\n\nExample:\nStage: 6x4 meters, 60 cm height\nSetup date: 12-06-2026 at 09:00\nPower in the house: 1x 400V 63A\nExtra: Backstage area needed",
  "inspection.extract": "Extract Data",
  "inspection.extracting": "Extracting…",
  "inspection.extracted": "Structured Data",
  "inspection.noData": "Write your inspection notes and click \"Extract Data\" to automatically organize them into structured fields.",
  "inspection.equipment": "Equipment",
  "inspection.schedule": "Schedule",
  "inspection.technical": "Technical",
  "inspection.general": "General Notes",
  "inspection.field": "Field",
  "inspection.value": "Value",
  "inspection.confidence": "Confidence",
  "inspection.high": "High",
  "inspection.medium": "Medium",
  "inspection.low": "Low",
  "inspection.save": "Confirm & Save",
  "inspection.saved": "Data saved",
  "inspection.reExtract": "Re-extract",
  "inspection.clear": "Clear All",
  "inspection.clearConfirm": "Clear all inspection data? This cannot be undone.",
  "inspection.originalNotes": "Original Notes",
  "inspection.error": "Could not extract data. Please try again.",
  "inspection.addRow": "Add row",
  "inspection.deleteRow": "Delete row",
  "inspection.emptyCategory": "No items extracted for this category.",

  // Misc
  "overview.defaultUser": "User",

  // Portal — gig status (used across Gigs, Earnings, Hub etc.)
  "portal.status.invited": "Invited",
  "portal.status.confirmed": "Confirmed",
  "portal.status.done": "Done",
  "portal.status.invoiced": "Invoiced",
  "portal.status.paid": "Paid",
  "portal.status.all": "All",

  // Portal — Availability screen
  "portal.availability.title": "Availability",
  "portal.availability.painting": "Painting:",
  "portal.availability.available": "Available",
  "portal.availability.busy": "Busy",
  "portal.availability.tapHint": "Tap a day to mark · tap again to clear",
  "portal.availability.allAvailable": "All available",
  "portal.availability.allBusy": "All busy",
  "portal.availability.fromTodayAvailable": "From today → available",
  "portal.availability.fromTodayBusy": "From today → busy",
  "portal.availability.clearMonth": "Clear month",
  "portal.availability.notSet": "Not set",
  "portal.availability.gigConflict": "⚠ Gig conflict",
  "portal.availability.conflictTooltip": "Available marked but a gig is logged on this date",
  "portal.availability.conflictShort": "Conflict",
  "portal.availability.prevMonth": "Previous month",
  "portal.availability.nextMonth": "Next month",
  "portal.availability.weekday.mon": "Mon",
  "portal.availability.weekday.tue": "Tue",
  "portal.availability.weekday.wed": "Wed",
  "portal.availability.weekday.thu": "Thu",
  "portal.availability.weekday.fri": "Fri",
  "portal.availability.weekday.sat": "Sat",
  "portal.availability.weekday.sun": "Sun",

  // Portal — Earnings screen
  "portal.earnings.title": "Earnings",
  "portal.earnings.exportYearCsv": "Export {year} CSV",
  "portal.earnings.exportCsv": "Export CSV",
  "portal.earnings.thisMonth": "This month",
  "portal.earnings.ytd": "{year} YTD",
  "portal.earnings.readyToInvoice": "Ready to invoice",
  "portal.earnings.outstanding": "Outstanding",
  "portal.earnings.paidAllTime": "Paid all-time",
  "portal.earnings.invoicedAwaiting": "Invoiced — awaiting payment",
  "portal.earnings.paidHistory": "Paid history",
  "portal.earnings.emptyReady": "Mark a gig as Done to queue it here.",
  "portal.earnings.emptyInvoiced": "No invoices outstanding.",
  "portal.earnings.emptyPaid": "No paid gigs yet.",

  // Portal — Hours screen
  "portal.hours.title": "Hours",
  "portal.hours.intro": "Log start, end and break for each working day, then submit for the producer to approve.",
  "portal.hours.empty": "No active gigs with working days yet. Accept a brief and the days you worked will appear here.",
  "portal.hours.untitledProject": "Untitled project",
  "portal.hours.totalLogged": "{n}h logged",
  "portal.hours.start": "Start",
  "portal.hours.end": "End",
  "portal.hours.minBreak": "min break",
  "portal.hours.save": "Save",
  "portal.hours.submit": "Submit",
  "portal.hours.approvedBy": "Approved by producer",
  "portal.hours.lockedPayroll": "Locked for payroll",
  "portal.hours.awaiting": "Awaiting decision",
  "portal.hours.saveFailed": "Save failed",
  "portal.hours.submitFailed": "Submit failed",
  "portal.hours.netSave": "Network error while saving",
  "portal.hours.netSubmit": "Network error while submitting",
  "portal.hours.statusPill.submitted": "Submitted",
  "portal.hours.statusPill.approved": "Approved",
  "portal.hours.statusPill.rejected": "Rejected",
  "portal.hours.statusPill.locked": "Locked",
  "portal.hours.statusPill.draft": "Draft",

  // Portal — Profile screen
  "portal.profile.title": "Profile",
  "portal.profile.saved": "✓ Saved",
  "portal.profile.section.personal": "Personal",
  "portal.profile.section.catering": "Catering",
  "portal.profile.section.travel": "Travel & accommodation",
  "portal.profile.section.skills": "Skills & equipment",
  "portal.profile.section.languages": "Languages",
  "portal.profile.section.insurance": "Insurance",
  "portal.profile.section.invoicing": "Invoicing details",
  "portal.profile.field.fullName": "Full name",
  "portal.profile.field.phone": "Phone",
  "portal.profile.field.email": "Email",
  "portal.profile.field.primaryRole": "Primary role",
  "portal.profile.cateringHint": "Producers see this on the kitchen Order List. Keep dietary needs and allergens separate — allergens flag cross-contamination warnings, dietary needs drive meal counts.",
  "portal.profile.field.dietary": "Dietary requirements",
  "portal.profile.field.allergies": "Allergies",
  "portal.profile.travelHint": "Used only by the producer's hotel suggester when a project needs accommodation. Twin = OK to share a twin room with another crew member; Single = needs a private room. Gender is optional and only used to default to same-gender twin pairings (most crew prefer it, hotels expect it). Producers always have the final say.",
  "portal.profile.field.roomShare": "Room sharing",
  "portal.profile.room.twin": "Twin (will share)",
  "portal.profile.room.single": "Single (private)",
  "portal.profile.room.either": "Either",
  "portal.profile.field.gender": "Gender (optional)",
  "portal.profile.gender.unset": "Prefer not to say",
  "portal.profile.gender.female": "Female",
  "portal.profile.gender.male": "Male",
  "portal.profile.gender.other": "Other",
  "portal.profile.skillsHint": "Add the disciplines, consoles and certifications you can cover. Type to search the library or just hit Enter to add anything.",
  "portal.profile.skillsPlaceholder": "Type to search or add a custom tag…",
  "portal.profile.field.insurance": "Insurance number / company",
  "portal.profile.field.bank": "Bank account / IBAN",
  "portal.profile.field.org": "Org. number",
  "portal.profile.save": "Save changes",
  "portal.profile.discard": "Discard",

  // Portal — Gigs screen (visible chrome)
  "portal.gigs.title": "Gigs",
  "portal.gigs.logGig": "+ Log a gig",
  "portal.gigs.noMatch": "No gigs match this filter.",
  "portal.gigs.empty.title": "No gigs logged yet",
  "portal.gigs.empty.tapLine": "Tap Log a gig to add your first one.",
  "portal.gigs.empty.flowLine": "Each gig flows through Invited → Confirmed → Done → Invoiced → Paid.",
  "portal.gigs.advanceTitle": "Tap to advance status",
  "portal.gigs.edit": "Edit",
  "portal.gigs.addToCalendar": "Add to calendar",
  "portal.gigs.calendarTitle": "Download an .ics file you can open in your calendar app",
  "portal.gigs.workingDay": "working day",
  "portal.gigs.workingDays": "working days",
  "portal.gigs.flatFee": "flat fee",
  "portal.gigs.editor.titleNew": "Log a gig",
  "portal.gigs.editor.titleEdit": "Edit gig",
  "portal.gigs.editor.close": "Close",
  "portal.gigs.editor.projectName": "Project name *",
  "portal.gigs.editor.client": "Client",
  "portal.gigs.editor.role": "Role",
  "portal.gigs.editor.venue": "Venue",
  "portal.gigs.editor.startDate": "Start date *",
  "portal.gigs.editor.endDate": "End date",
  "portal.gigs.editor.hours": "Hours",
  "portal.gigs.editor.rate": "Rate (kr/h)",
  "portal.gigs.editor.flatFee": "Flat fee (kr)",
  "portal.gigs.editor.flatFeePh": "overrides h×rate",
  "portal.gigs.editor.status": "Status",
  "portal.gigs.editor.notes": "Notes",
  "portal.gigs.editor.notesPh": "Anything to remember about this gig…",
  "portal.gigs.editor.save": "Save gig",
  "portal.gigs.editor.delete": "Delete",
  "portal.gigs.checkin.onTheWay": "On the way",
  "portal.gigs.checkin.arrived": "Arrived",
  "portal.gigs.checkin.clearHint": "Tap to clear",
  "portal.gigs.workingDays.title": "Working days",
  "portal.gigs.workingDays.summary": "{sel} of {total} selected",
  "portal.gigs.workingDays.preserved": "+{n} preserved",
  "portal.gigs.workingDays.selectAll": "Select all",
  "portal.gigs.workingDays.clearAll": "Clear all",
  "portal.profile.lang.no": "Norwegian",
  "portal.profile.lang.en": "English",
  "portal.profile.lang.sv": "Swedish",
  "portal.profile.lang.da": "Danish",
  "portal.profile.lang.de": "German",
  "portal.profile.lang.fr": "French",
  "portal.profile.lang.es": "Spanish",
  "portal.profile.dietPh": "None / Vegetarian / Vegan / Halal / Kosher",
  "portal.profile.allergiesPh": "Peanuts, shellfish, gluten…",
  "portal.tag.remove": "Remove {tag}",
  "portal.common.dismiss": "Dismiss",
  "portal.gigs.err.save": "Saved locally, but couldn't reach the server — please try editing again to retry.",
  "portal.gigs.err.delete": "Couldn't delete the gig — please check your connection and try again.",
  "portal.gigs.err.status": "Couldn't update the status — please try again in a moment.",
  "portal.gigs.err.checkin": "Couldn't save the check-in — please try again in a moment.",
} as const;
