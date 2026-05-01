import type { Translations } from "../types";

/**
 * Norwegian Bokmål translations.
 *
 * The `Translations` type guarantees every English key has a Norwegian
 * value — adding a new key in `en.ts` will produce a TypeScript error
 * here until it's translated. Untranslated strings should be left out
 * (so the runtime fallback to English kicks in) rather than copy-pasted
 * from English, which would silently mask missing translations.
 *
 * Conventions:
 *  - Sentence case in NO mirrors EN (we keep proper nouns intact: EHS,
 *    Bokmål, etc.).
 *  - `{placeholder}` tokens MUST be preserved 1:1.
 */
export const no: Translations = {
  // ---------- Common ----------
  "common.save": "Lagre",
  "common.cancel": "Avbryt",
  "common.close": "Lukk",
  "common.delete": "Slett",
  "common.add": "Legg til",
  "common.remove": "Fjern",
  "common.edit": "Rediger",
  "common.loading": "Laster…",
  "common.back": "Tilbake",
  "common.continue": "Fortsett",
  "common.confirm": "Bekreft",
  "common.yes": "Ja",
  "common.no": "Nei",
  "common.ok": "OK",
  "common.print": "Skriv ut",
  "common.error": "Feil",

  // ---------- Language selector ----------
  "language.label": "Språk",
  "language.english": "English",
  "language.norwegian": "Norsk (Bokmål)",
  "language.short.en": "EN",
  "language.short.no": "NO",

  // ---------- Producer header (top doc actions) ----------
  // Header buttons sit in a single row; Norwegian labels here are kept
  // tight (similar character widths to the English originals) so the
  // row never wraps onto a second line at the same viewport width.
  "header.exportReport": "Eksporter",
  "header.clientPack": "Kundepakke",
  "header.simulateShow": "Simuler show",
  "header.shareWithCrew": "Del med crew",
  "header.projectSettings": "Prosjektinnstillinger",
  "header.reset": "Nullstill",
  "header.shareBrief": "Del brief",
  "header.help": "Hjelp",
  "header.helpTitle": "Slik fungerer Produksjonsverktøyet",

  // ---------- Help modal ----------
  "help.subtitle":
    "En rask omvisning i Produksjonsverktøyet — knappene i toppen, alle fanene, og småtingene som sparer deg tid.",
  "help.section.overview": "Hva er Produksjonsverktøyet?",
  "help.overview.body":
    "Det er produsentens arbeidsark for hele showet — riggvekter, lys, lyd, LED, scenebygg, mannskap og logistikk, og tegningsanalysatoren. Alt du skriver lagres automatisk i nettleseren mens du jobber (se etter den grønne ● Lagret-pillen i toppen). Når du er klar til å dele kan du lage en Kundepakke-PDF eller sende personlige briefer ut i Frilanserportalen.",
  "help.section.headerActions": "Knappene i toppen",
  "help.headerActions.reset":
    "Tømmer hele prosjektet — systemer, mannskap, lys, lyd, scene og LED — tilbake til blanke ark. Nyttig når du starter et nytt show.",
  "help.headerActions.csv":
    "Laster ned aktiv Riggrapport som regnearksvennlig CSV (én rad per heisepunkt).",
  "help.headerActions.exportReport":
    "Sender Riggrapporten til skriveren / Lagre-som-PDF-dialogen. Utskriftsmalen er tilpasset A4 liggende.",
  "help.headerActions.clientPack":
    "Åpner en kundeklar utskrift som dekker plan, mannskap, rigg, lys, lyd, scene, LED, risiko og kostnadsoppsummering — alt i én PDF.",
  "help.headerActions.simulateShow":
    "Kjører en gjennomgang i 10 faser fra inn-rigg til utlast. Hver fase rapporterer status per fagområde, risiko og en endelig klar-til-å-kjøre-vurdering, så du fanger opp hull før de blir et problem.",
  "help.headerActions.shareWithCrew":
    "Genererer personlige brieflenker du kan sende til frilansere. Mannskapet åpner dem i Frilanserportalen for å akseptere eller avslå, og se sine gigs, hotell og innkalling.",
  "help.section.tabs": "Fanene",
  "help.tabs.rigging":
    "Legg til heisesystemer, fyll på trusser og punkter, og se kg/W-tellerne i den mørke statlinjen oppdateres live. Overlastede punkter blir røde.",
  "help.tabs.lighting":
    "Hold styr på armaturer per system: type, antall, watt, dimmer / DMX-behov. Mater total effekt videre til riggsammendraget.",
  "help.tabs.led":
    "Logg LED-paneler, prosessering og riggemetode. Tar effekt og vekt med i prosjektets totaler.",
  "help.tabs.stage":
    "Definer scenegeometri, dekke og bygge-nummerering per dekk. SVG-forhåndsvisningen viser bein-antall og byggeretning.",
  "help.tabs.sound":
    "Fang opp PA, monitor og mikrofon-oppsett for showet.",
  "help.tabs.crew":
    "Ett samlet hovedark for alle på showet: navn, rolle, status, antall dager, hotell, romkamerat, mat og telefon. Slå på Produksjonsdetaljer for innkalling/avslutning og dagspris, og trykk Skriv ut for en A4-overlevering til runner, hotell eller catering.",
  "help.tabs.riggPlan":
    "Last opp en venue-PDF eller -bilde. Tegningsanalysatoren henter ut trusser, lys, LED og lyd til redigerbare overlegg — fyller forhåndvis de andre fanene og lærer av rettelsene dine per venue.",
  "help.section.tips": "Verdt å vite",
  "help.tips.autosave":
    "Alt lagres automatisk i nettleseren. ● Lagret-pillen i toppen viser tidspunktet for siste skriving.",
  "help.tips.language":
    "Bytt mellom engelsk og norsk når som helst med EN / NO-velgeren oppe til høyre.",
  "help.tips.portal":
    "Portal-knappen (oppe til høyre) åpner frilanser-siden, der mannskapet ser briefene du har delt.",
  "help.tips.print":
    "Alle Eksport- og Skriv ut-knapper er tilpasset A4 liggende — Lagre-som-PDF i utskriftsdialogen gir det reneste resultatet.",
  "help.close": "Skjønner",

  // ---------- Project meta card ----------
  // Venue / Project is intentionally kept in English even when the
  // UI language is Norwegian — these labels are industry-standard
  // production terminology that the EHS team prefers to read in
  // English regardless of locale.
  "project.venueProject": "Venue / Project",
  "project.client": "Kunde",
  "project.schedule": "Tidsplan",
  "project.projectManager": "Prosjektleder",
  "project.placeholder.venue": "f.eks. Sentrum Scene",
  "project.placeholder.client": "Kundenavn",
  "project.placeholder.manager": "Navn",

  // ---------- Main view switcher ----------
  // The main report tabs are kept in English in Norwegian mode by
  // explicit request — these are the canonical names of the
  // report tabs across the EHS production toolset and need to
  // match what the rest of the team sees in printed reports,
  // exports, and internal documentation.
  "view.rigging": "Rigging Report",
  "view.lighting": "Lighting Report",
  "view.led": "LED Screen Report",
  "view.stage": "Stage Report",
  "view.crew": "Mannskap og logistikk",
  "view.sound": "Sound Report",
  "view.riggPlan": "Smash It",

  // ---------- Reset confirm ----------
  "reset.confirm":
    "Nullstille hele prosjektet? Dette fjerner alle systemer, crew, lys-, lyd-, scene- og LED-data.",

  // ---------- Portal: navigation ----------
  "portal.nav.hub": "Hub",
  "portal.nav.briefs": "Briefer",
  "portal.nav.gigs": "Oppdrag",
  "portal.nav.availability": "Tilgjengelighet",
  "portal.nav.earnings": "Inntjening",
  "portal.nav.profile": "Profil",
  "portal.nav.help": "Hjelp",

  // ---------- Portal: header chrome ----------
  "portal.header.title": "Frilansportal",
  "portal.header.subtitle": "EHS personlig loggbok",
  "portal.header.productionTool": "Produksjonsverktøy",
  "portal.header.productionToolShort": "Verktøy",
  "portal.header.lightMode": "Lyst tema",
  "portal.header.darkMode": "Mørkt tema",
  "portal.header.signOut": "Logg ut",

  // ---------- Portal: briefs list ----------
  "portal.briefs.title": "Briefer",
  "portal.briefs.subtitle": "Prosjektbriefer som EHS-produksjonen har delt med deg",
  "portal.briefs.empty.title": "Ingen briefer ennå",
  "portal.briefs.empty.body":
    "Når EHS-produksjonen deler et prosjekt med deg, dukker det opp her.",
  "portal.briefs.pendingBadge": "{count} nye",
  "portal.briefs.for": "for {client}",
  "portal.briefs.relative.justNow": "akkurat nå",
  "portal.briefs.relative.minutesAgo": "{n} min siden",
  "portal.briefs.relative.hoursAgo": "{n} t siden",
  "portal.briefs.relative.daysAgo": "{n} d siden",
  "portal.briefs.decision.new": "Ny",
  "portal.briefs.decision.accepted": "Akseptert",
  "portal.briefs.decision.declined": "Avslått",

  // ---------- Portal: brief detail ----------
  "portal.brief.for": "for {client}",
  "portal.brief.accept": "Aksepter",
  "portal.brief.decline": "Avslå",
  "portal.brief.accepted": "Akseptert",
  "portal.brief.declined": "Avslått",
  "portal.brief.preparedBy": "Utarbeidet av {name}",
  "portal.brief.phase.setup": "Rigg opp",
  "portal.brief.phase.rehearsal": "Prøve",
  "portal.brief.phase.show": "Show",
  "portal.brief.phase.loadOut": "Rigg ned",

  // ---------- Errors / notifications ----------
  "error.generic": "Noe gikk galt. Prøv igjen.",
  "error.network": "Nettverksfeil. Sjekk tilkoblingen og prøv på nytt.",
  "error.saveFailed": "Kunne ikke lagre endringene dine.",
  "notif.saved": "Lagret.",
  "notif.briefShared": "Brief delt.",
  "notif.briefAccepted": "Brief akseptert.",
  "notif.briefDeclined": "Brief avslått.",

  // ---------- Fart button (lighthearted feature) ----------
  "fart.tooltip": "Akutt promp",
  "fart.input.placeholder": "Skriv inn navn",
  "fart.submit": "Promp 💨",
  "fart.title.default": "{name} prompet nettopp 💨",
  "fart.title.destroyed": "{name} ødela atmosfæren 💨",
  "fart.title.nuclear": "{name} slapp løs en atombombe 💨",
};
