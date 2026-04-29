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
  "header.exportReport": "Eksporter rapport",
  "header.clientPack": "Kundepakke",
  "header.simulateShow": "Simuler show",
  "header.shareWithCrew": "Del med crew",
  "header.projectSettings": "Prosjektinnstillinger",
  "header.reset": "Nullstill",
  "header.shareBrief": "Del brief",

  // ---------- Project meta card ----------
  "project.venueProject": "Spillested / Prosjekt",
  "project.client": "Kunde",
  "project.schedule": "Tidsplan",
  "project.projectManager": "Prosjektleder",
  "project.placeholder.venue": "f.eks. Sentrum Scene",
  "project.placeholder.client": "Kundenavn",
  "project.placeholder.manager": "Navn",

  // ---------- Main view switcher ----------
  "view.rigging": "Riggrapport",
  "view.lighting": "Lysrapport",
  "view.led": "LED-skjermrapport",
  "view.stage": "Scenerapport",
  "view.crew": "Crew-rapport",
  "view.sound": "Lydrapport",
  "view.riggPlan": "Riggplan",

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
};
