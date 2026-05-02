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

  // ---------- Theme picker ----------
  "theme.label": "Tema",
  "theme.light": "Lyst",
  "theme.dark": "Mørkt",
  "theme.system": "System",
  "theme.lightAria": "Lyst tema",
  "theme.darkAria": "Mørkt tema",
  "theme.systemAria": "Systemtema",
  "theme.title": "Velg tema: Lyst, Mørkt eller System",

  // ---------- Sign-in screen ----------
  "signin.title": "Logg inn på EHS",
  "signin.role.employee": "Ansatt",
  "signin.role.employee.sub": "Produksjonsverktøy",
  "signin.role.freelancer": "Frilanser",
  "signin.role.freelancer.sub": "Frilansportal",
  "signin.role.aria": "Jeg logger inn som",
  "signin.tab.signIn": "Logg inn",
  "signin.tab.signUp": "Registrer deg",
  "signin.contact": "Spørsmål? Kontakt {email}",
  "signin.product.tool": "Produksjonsverktøy",
  "signin.product.portal": "Frilansportal",

  // ---------- Portal: header chrome (additional) ----------
  "portal.header.helpAria": "Hjelp",
  "portal.header.helpTitle": "Hjelp og tips",
  "portal.header.toolTitle": "Bytt til Produksjonsverktøyet",
  "portal.header.briefsBadgeAria": "{count} nye briefer",
  "portal.header.signedInAs": "Innlogget som {label}. Klikk for å logge ut.",
  "portal.header.sectionsAria": "Portal-seksjoner",

  // ---------- Portal: gig status ----------
  "portal.gigStatus.invited": "Invitert",
  "portal.gigStatus.confirmed": "Bekreftet",
  "portal.gigStatus.done": "Ferdig",
  "portal.gigStatus.invoiced": "Fakturert",
  "portal.gigStatus.paid": "Betalt",

  // ---------- Portal: Hub screen ----------
  "portal.hub.greetingNamed": "Hei {name}",
  "portal.hub.greetingAnon": "Hei",
  "portal.hub.banner.singleNew": "Ny prosjekt-brief: {venue}",
  "portal.hub.banner.manyNew": "{count} nye prosjekt-briefer venter",
  "portal.hub.untitledShow": "Show uten navn",
  "portal.hub.stat.monthToDate": "Hittil i måneden",
  "portal.hub.stat.readyToInvoice": "Klar for fakturering",
  "portal.hub.stat.daysMarked": "Markerte dager",
  "portal.hub.stat.daysSingular": "dag",
  "portal.hub.stat.daysPlural": "dager",
  "portal.hub.stat.loggedGigs": "Loggførte oppdrag",
  "portal.hub.section.today": "I dag",
  "portal.hub.section.thisWeek": "Denne uken",
  "portal.hub.section.upcoming": "Kommende",
  "portal.hub.empty.today": "Ingenting på planen i dag.",
  "portal.hub.empty.week": "Ingen flere oppdrag denne uken.",
  "portal.hub.empty.upcoming": "Ingen fremtidige oppdrag loggført ennå.",
  "portal.hub.cta.logGig": "Loggfør et oppdrag",
  "portal.hub.cta.viewAllUpcoming": "Se alle {count} kommende →",
  "portal.hub.profile.title": "Fullfør profilen din",
  "portal.hub.profile.body":
    "En komplett profil hjelper EHS-ledere å finne deg til de riktige oppdragene. Legg til kontaktdetaljer, ferdigheter og sertifiseringer.",
  "portal.hub.profile.cta": "Rediger profil",

  // ---------- Portal: Briefs screen (additional) ----------
  "portal.briefs.section.awaiting": "Venter på din avgjørelse",
  "portal.briefs.section.history": "Historikk",
  "portal.briefs.untitledShow": "Show uten navn",
  "portal.briefs.genericBriefing": "Generell brief",
  "portal.briefs.callPrefix": "innkalling {time}",
  "portal.briefs.decision.filled": "Fylt",
  "portal.briefs.newBadge": "{count} nye",
  /* portal.briefs.empty.body already defined above */

  // ---------- Portal: Help screen ----------
  "portal.help.kicker": "Hjelp og tips",
  "portal.help.title": "Slik bruker du Frilansportalen",
  "portal.help.intro":
    "En rask omvisning i alle seksjoner, pluss snarveiene som sparer deg mest tid. Trykk på en overskrift under for å hoppe inn.",
  "portal.help.jumpTo": "Hopp til en seksjon",
  "portal.help.shortcuts.title": "Snarveier du bør kjenne til",
  "portal.help.shortcuts.intro": "Fem små funksjoner som utgjør en stor forskjell.",
  "portal.help.tipPrefix": "Tips:",
  "portal.help.stuck.title": "Står du fortsatt fast?",
  "portal.help.stuck.before":
    "Ta kontakt med din EHS-kontakt eller produsenten som delte briefen. Du kan også ",
  "portal.help.stuck.linkText": "oppdatere kontaktdetaljene dine",
  "portal.help.stuck.after": " så produsentene vet hvordan de kan nå deg.",

  // Hub section
  "portal.help.hub.short": "Hub",
  "portal.help.hub.title": "Hub — dashbordet ditt",
  "portal.help.hub.intro":
    "Hub er det første du ser. Det viser hva du jobber med denne uken, denne måneden og hva som kommer videre.",
  "portal.help.hub.step1":
    "Skum gjennom toppkortene for inntjening hittil i uken og måneden.",
  "portal.help.hub.step2":
    "Sjekk listen over kommende oppdrag for å se neste innkallingstider på et øyeblikk.",
  "portal.help.hub.step3":
    "Trykk på et oppdragskort for å hoppe til detaljene på Oppdrag-siden.",
  "portal.help.hub.tip":
    "Om et kort ser tomt ut har du sannsynligvis ingen aksepterte oppdrag ennå — gå til Briefer for å akseptere ett, eller til Oppdrag for å legge til ett manuelt.",

  // Briefs section
  "portal.help.briefs.short": "Briefer",
  "portal.help.briefs.title": "Briefer — innkommende oppdragsforespørsler",
  "portal.help.briefs.intro":
    "Når en produsent deler en prosjekt-brief med deg, havner den her. Tallet på Briefer-fanen viser hvor mange som venter på en avgjørelse.",
  "portal.help.briefs.step1":
    "Åpne en brief for å se venue, plan, rolle, innkalling/avslutning og dagspris.",
  "portal.help.briefs.step2":
    "Trykk Aksepter for å legge den til som Bekreftet i oppdragene dine, eller Avslå hvis du ikke kan ta den.",
  "portal.help.briefs.step3":
    "Hvis produsenten endrer en brief etter du har akseptert, ser du et gult \"Produsenten har oppdatert briefen\"-banner neste gang du åpner den — trykk Bekreft endringer når du har lest hva som er nytt.",
  "portal.help.briefs.tip":
    "Hvis en brief overlapper med et oppdrag du allerede har akseptert (eller en dag du har markert som Opptatt), vises et rødt Tidskonflikt-varsel før du bekrefter, og Aksepter-knappen endres til \"Aksepter likevel\".",

  // Gigs section
  "portal.help.gigs.short": "Oppdrag",
  "portal.help.gigs.title": "Oppdrag — loggboken din",
  "portal.help.gigs.intro":
    "Hver bekreftet jobb bor her. Du kan også legge til oppdrag manuelt hvis en produsent ikke gikk via portalen.",
  "portal.help.gigs.step1":
    "Trykk + Legg til oppdrag for å loggføre en jobb manuelt med venue, datoer, rolle og pris.",
  "portal.help.gigs.step2":
    "På selve dagen for et Bekreftet oppdrag, trykk På vei når du drar, deretter Ankommet når du er på venue. Pillene blir indigo og grønne og husker tidspunktet.",
  "portal.help.gigs.step3":
    "Trykk Legg til i kalender på et oppdrag for å laste ned en kalenderfil (.ics) du kan åpne i Apple Calendar, Google Calendar eller Outlook.",
  "portal.help.gigs.step4":
    "Marker oppdrag som Ferdig når de er fullført, slik at de teller med i Inntjening-totalen din.",
  "portal.help.gigs.tip":
    "Trykk en grønn ✓ Ankommet-pille en gang til for å fjerne den hvis du trykket feil.",

  // Availability section
  "portal.help.availability.short": "Tilgjengelighet",
  "portal.help.availability.title":
    "Tilgjengelighet — blokker dager du ikke kan jobbe",
  "portal.help.availability.intro":
    "Marker dager som Opptatt for å holde din egen kalender ærlig. Portalen bruker disse datoene til å varsle deg om konflikter når du aksepterer nye briefer.",
  "portal.help.availability.step1":
    "Trykk på en dag i kalenderen for å bytte mellom Tilgjengelig og Opptatt.",
  "portal.help.availability.step2":
    "Opptatte dager dukker opp i konfliktvarsler på briefer som faller på de datoene.",

  // Earnings section
  "portal.help.earnings.short": "Inntjening",
  "portal.help.earnings.title": "Inntjening — se hva du fakturerer",
  "portal.help.earnings.intro":
    "En månedlig oversikt over hva du har tjent på alle oppdrag. Nyttig når du fører regnskap eller fakturerer.",
  "portal.help.earnings.step1":
    "Velg en måned for å se oppdragene som bidro og total NOK.",
  "portal.help.earnings.step2":
    "Statusfiltre lar deg skille Bekreftet (kommer), Ferdig (utført, venter på betaling) og Betalt.",

  // Profile section
  "portal.help.profile.short": "Profil",
  "portal.help.profile.title": "Profil — hvem du er for produsenter",
  "portal.help.profile.intro":
    "Navn, telefon og kontaktdetaljer som produsentene ser når du aksepterer briefen deres.",
  "portal.help.profile.step1":
    "Fyll inn fullt navn, telefon og rolletagger så produsentene finner deg.",
  "portal.help.profile.step2":
    "Bytt tema (Lyst, Mørkt eller System) med segmentvelgeren i toppen.",

  // Quick actions
  "portal.help.qa.calendar.title": "Legg til i kalender",
  "portal.help.qa.calendar.body":
    "På enhver brief eller akseptert oppdrag laster denne knappen ned en standard .ics-fil. Åpne den én gang så havner hendelsen i telefon- eller laptop-kalenderen med riktige datoer og tider.",
  "portal.help.qa.callsheet.title": "Personlig call sheet PDF",
  "portal.help.qa.callsheet.body":
    "Inne i en brief åpner dette en utskriftsvennlig én-sides call sheet med rolle, innkalling/avslutning og hele planen. Fra utskriftsdialogen kan du lagre den som PDF.",
  "portal.help.qa.conflict.title": "Tidskonflikt-varsel",
  "portal.help.qa.conflict.body":
    "Før du aksepterer en brief, kryssjekker portalen den mot eksisterende oppdrag og Opptatt-dager. Overlapper noe, ser du et rødt varsel som lister opp konfliktene.",
  "portal.help.qa.checkin.title": "På vei / Ankommet-innsjekk",
  "portal.help.qa.checkin.body":
    "På Bekreftede oppdrag i Oppdrag-siden lar to pill-knapper deg stemple tidspunktet du dro og kom frem. De ligger igjen ved omlasting så du har et notat etterpå.",
  "portal.help.qa.update.title": "Brief-oppdateringsbanner",
  "portal.help.qa.update.body":
    "Hvis en produsent deler en brief du allerede har akseptert på nytt, viser BriefDetail-siden et banner som lister opp hva som har endret seg (venue, dato, innkalling, notater…) så du ikke går glipp av stille endringer.",
};
