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
  "header.helpTitle": "EHS Produksjonsverktøy",

  // ---------- Help modal ----------
  "help.subtitle":
    "Ditt taktiske kommandosenter for teknisk produksjon — alle fagområder, alle tall, ett arbeidsområde.",
  "help.section.overview": "Hva er dette?",
  "help.overview.body":
    "Produksjonsverktøyet er et komplett arbeidsområde for planlegging og styring av live-eventer. Du bygger showet på tvers av fanene i sidemenyen — riggvekter, lys, LED, lyd, scene, crew og logistikk — og Oversikt-dashbordet gir deg et sanntidsbilde av hele produksjonen. Alt lagres automatisk i nettleseren mens du jobber.",

  "help.section.sidebar": "Sidemeny — prosjektet ditt",
  "help.sidebar.overview":
    "Det levende dashbordet. Viser KPI-kort (topplast, effekt, LED-paneler, crew-antall), et crew-ruteskjema, systemkort, logistikk-chips for hotell og catering, og en aktivitetslogg — alt oppdateres i sanntid.",
  "help.sidebar.rigging":
    "Bygg heisesystemer med punkter og trusser. Statisk og dynamisk last beregnes per punkt med live SWL-varsler — overlastede punkter blir røde umiddelbart.",
  "help.sidebar.lighting":
    "Hold styr på armaturer per system: type, antall, watt, DMX-kanaler. Total effekt mates automatisk tilbake til riggsammendraget.",
  "help.sidebar.led":
    "Konfigurer LED-skjermer — paneltype, prosessorkapasitet, pikseltetthet, riggemetode. Effekt og vekt rulles opp i prosjektets totaler.",
  "help.sidebar.sound":
    "Logg PA, monitorer og mik-oppsett. Vekt per enhet mates inn i riggberegningene.",
  "help.sidebar.stage":
    "Definer scenegeometri, dekke og monteringsnummerering. SVG-forhåndsvisningen viser bein-antall og byggeretning.",
  "help.sidebar.riggPlan":
    "Et 2D-lerret sett ovenfra for plassering av trusser på venue-plantegningen. Last opp en PDF eller et bilde, og dra og slipp rigg-oppsettet ditt.",
  "help.sidebar.crew":
    "Hovedark for crew — navn, rolle, status, tildelte dager, hotell, kostholdsbehov og telefon. Slå på produksjonsdetaljer for innkallingstider og dagspris.",
  "help.sidebar.hotel":
    "Romliste aggregert fra crew-briefer. Aktiveres automatisk når du deler en brief og crew svarer med sine hotellbehov.",
  "help.sidebar.catering":
    "Kostholdsbehov og måltidsplan aggregert fra crew-svar. Viser allergier, dietter og antall per måltid.",

  "help.section.headerActions": "Handlinger i topplinjen",
  "help.headerActions.shareBrief":
    "Hovedhandlingen. Oppretter personlige brieflenker for hver frilanser — de åpner dem i Frilanserportalen for å akseptere eller avslå, se sine gigs, hotell og innkallingstider.",
  "help.headerActions.clientPack":
    "Genererer en komplett, klar-for-kunden PDF som dekker plan, crew, rigg, lys, lyd, scene, LED, risikovurdering og kostnadsoppsummering — hele produksjonen i ett dokument.",
  "help.headerActions.reset":
    "Tømmer hele prosjektet — alle systemer, crew, lys, lyd, scene og LED — tilbake til blanke ark. Bruk når du starter et nytt show.",
  "help.headerActions.csv":
    "Laster ned riggrapporten som en regnearksvennlig CSV-fil (én rad per heisepunkt).",
  "help.headerActions.exportReport":
    "Sender riggrapporten til skriveren eller Lagre-som-PDF-dialogen. Utskriftsmalen er optimalisert for A4 liggende.",
  "help.headerActions.simulateShow":
    "Kjører en 10-fases gjennomgang fra inn-rigg til utlast. Hver fase rapporterer status per fagområde, risiko og en klar-vurdering — så du fanger opp hull før de blir problemer.",

  "help.section.tips": "Verdt å vite",
  "help.tips.autosave":
    "Alt lagres automatisk i nettleseren. Den grønne «Lagret»-indikatoren i topplinjen viser siste lagringstidspunkt.",
  "help.tips.language":
    "Bytt mellom engelsk og norsk når som helst med EN/NO-knappen oppe til høyre.",
  "help.tips.portal":
    "Frilanserportal-lenken nederst i sidemenyen åpner crew-siden, der frilansere ser briefene du har delt, håndterer sine gigs og ser sin reiseplan.",
  "help.tips.print":
    "Alle utskrifts- og eksportfunksjoner er optimalisert for A4 liggende. Bruk Lagre-som-PDF i utskriftsdialogen for det reneste resultatet.",
  "help.tips.theme":
    "Bytt mellom lyst, mørkt og system-tema fra innstillingsmenyen ved siden av navnet ditt nederst i sidemenyen.",
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
  "view.lighting": "Lights",
  "view.led": "LED Screen",
  "view.stage": "Stage",
  "view.crew": "Mannskap og logistikk",
  "view.sound": "Sound",
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

  // ---------- Shell / sidebar (Production Tool chrome) ----------
  "shell.nav.project": "Prosjekt",
  "shell.nav.logistics": "Logistikk",
  "shell.nav.overview": "Oversikt",
  "shell.nav.rigging": "Rigg",
  "shell.nav.lighting": "Lys",
  "shell.nav.led": "LED",
  "shell.nav.sound": "Lyd",
  "shell.nav.stage": "Scene",
  "shell.nav.riggPlan": "Rigg-plan",
  "shell.nav.crew": "Crew",
  "shell.nav.hotel": "Hotell",
  "shell.nav.catering": "Catering",
  "shell.search": "Søk i prosjekt",
  "shell.searchTitle": "Søk i prosjekt",
  "shell.searchPlaceholder": "Skriv for å søke sider og handlinger…",
  "shell.searchNoResults": "Ingen resultater funnet.",
  "shell.searchGroupPages": "Sider",
  "shell.searchGroupActions": "Handlinger",
  "shell.newSystem": "Nytt system",
  "shell.newSystemTitle": "Legg til nytt system",
  "shell.help": "Hjelp",
  "shell.settings": "Innstillinger",
  "shell.signOut": "Logg ut",
  "shell.breadcrumb.projects": "Prosjekter",
  "shell.breadcrumb.untitled": "Uten navn",
  "shell.saved": "Lagret {time}",
  "shell.savedTitle": "Lagret lokalt i nettleseren",
  "shell.savedCloud": "Lagret i skyen {time}",
  "projects.title": "Dine prosjekter",
  "projects.subtitle": "Åpne et lagret prosjekt eller start et nytt.",
  "projects.new": "Nytt prosjekt",
  "projects.saveAs": "Lagre som nytt prosjekt",
  "projects.saveAsTitle": "Lagre nåværende arbeid som et nytt prosjekt",
  "projects.open": "Åpne",
  "projects.delete": "Slett",
  "projects.deleteConfirm": "Slette dette prosjektet? Dette kan ikke angres.",
  "projects.noProjects": "Ingen lagrede prosjekter ennå.",
  "projects.noProjectsSub": "Arbeidet ditt lagres automatisk. Det vises her.",
  "projects.search": "Søk i prosjekter…",
  "projects.updated": "Oppdatert",
  "projects.created": "Opprettet",
  "projects.loading": "Laster prosjekter…",
  "projects.untitled": "Prosjekt uten navn",
  "shell.moreActions": "Flere handlinger",
  "shell.portalLink": "Frilanserportalen",
  "shell.userRole.producer": "Produsent",
  "shell.action.shareBrief": "Del brief",
  "shell.action.shareBriefTitle": "Generer per-crew brief-lenker for frilansere",
  "shell.action.clientPack": "Kundepakke",
  "shell.action.clientPackTitle": "Åpne klient-pack med tidsplan, crew, rigg og kost",
  "shell.action.printReport": "Skriv ut rapport",
  "shell.action.printReportTitle": "Skriv ut rigg-rapporten",
  "shell.action.downloadCsv": "Last ned CSV",
  "shell.action.simulate": "Simuler show",
  "shell.action.simulateTitle": "Gå gjennom 10 produksjonsfaser med risiko og verdikt",
  "shell.action.resetProject": "Nullstill prosjekt",

  // ---------- Overview dashboard ----------
  "overview.crewSchedule": "Crew & Tidsplan",
  "overview.viewFullSchedule": "Se full tidsplan",
  "overview.noCrew": "Ingen crew lagt til ennå.",
  "overview.addCrew": "Legg til crew",
  "overview.nameRole": "Navn & Rolle",
  "overview.legend.confirmed": "Bekreftet",
  "overview.legend.pending": "Venter svar",
  "overview.legend.cancelled": "Avlyst",
  "overview.technicalSystems": "Tekniske Systemer",
  "overview.openRigReport": "Åpne rigg-rapport",
  "overview.noSystems": "Ingen systemer registrert ennå.",
  "overview.buildFirstSystem": "Bygg første system",
  "overview.logistics": "Logistikk",
  "overview.hotel": "Hotell",
  "overview.shareBriefHotel": "Del brief for å aktivere hotell-info",
  "overview.catering": "Catering",
  "overview.shareBriefCatering": "Del brief for å aktivere catering",
  "overview.activityTitle": "Aktivitet",
  "overview.noActivity": "Ingen aktivitet ennå.",

  // Overview KPI labels
  "overview.kpi.crew": "Crew",
  "overview.kpi.confirmedOf": "{confirmed} bekreftet",
  "overview.kpi.readyPct": "{pct}% klart",
  "overview.kpi.peakLoad": "Topplast",
  "overview.kpi.tonnes": "tonn",
  "overview.kpi.overloadCount": "{n} overlast",
  "overview.kpi.swlCap": "SWL-tak {value} t",
  "overview.kpi.ledPanels": "LED-paneler",
  "overview.kpi.inScreens": "i {n} skjerm",
  "overview.kpi.inScreensPlural": "i {n} skjermer",
  "overview.kpi.power": "Effekt",
  "overview.kpi.hoistPoints": "{n} hoist-punkt",

  // Overview system card labels
  "overview.system.points": "{n} punkt",
  "overview.system.static": "Statisk",
  "overview.system.peakLoad": "Topplast",
  "overview.system.power": "Effekt",
  "overview.system.ledWall": "LED-vegg",
  "overview.system.screens": "{n} skjerm · {panels} paneler",
  "overview.system.screensPlural": "{n} skjermer · {panels} paneler",
  "overview.system.area": "Areal",
  "overview.system.weight": "Vekt",
  "overview.system.sound": "Lyd",
  "overview.system.units": "{n} enhet",
  "overview.system.unitsPlural": "{n} enheter",
  "overview.system.lights": "Lysrigg",
  "overview.system.fixturesTotalPlural": "{n} fixtures totalt",
  "overview.system.stage": "Scene",
  "overview.system.stageUnits": "{n} scene-enhet",
  "overview.system.stageUnitsPlural": "{n} scene-enheter",

  // Overview activity feed
  "overview.activity.saved": "Prosjekt lagret",
  "overview.activity.savedBody": "Endringer er lagret i nettleseren din",
  "overview.activity.overloadTitle": "{n} hoist-punkt over SWL",
  "overview.activity.overloadBody": "Sjekk Rigg-rapporten og fordel lasten",
  "overview.activity.now": "Nå",
  "overview.activity.briefShared": "Brief delt med crew",
  "overview.activity.briefSharedBody": "Catering- og hotell-info aktiveres når crew svarer",
  "overview.activity.active": "Aktiv",
  "overview.activity.noBrief": "Brief ikke delt ennå",
  "overview.activity.noBriefBody": "Klikk \"Del brief\" for å sende invitasjon til crew",
  "overview.activity.welcome": "Velkommen til EHS Production Tool",
  "overview.activity.welcomeBody": "Start med å registrere venue og legg inn ditt første rigg-system.",

  // Overview project status
  "overview.status.overload": "Overlast",
  "overview.status.empty": "Tomt",
  "overview.status.active": "Aktiv",
  "overview.status.draft": "Utkast",

  // Overview crew summary
  "overview.crewSummary.none": "Ingen crew lagt til",
  "overview.crewSummary.line": "{confirmed}/{total} bekreftet · {pending} venter · {declined} avlyst",

  // Overview hotel/catering active
  "overview.hotelActive": "Hotell aktivt",
  "overview.hotelActiveSub": "Per-natt aggregert fra brief",
  "overview.openHotelTab": "Åpne hotell-fane",
  "overview.cateringActive": "Catering aktivt",
  "overview.cateringActiveSub": "Allergier og dietter aggregert fra crew",
  "overview.openCateringTab": "Åpne catering-fane",

  // Misc
  "overview.defaultUser": "Bruker",
};
