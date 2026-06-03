import { jsPDF } from "jspdf";
import { writeFileSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dir = dirname(fileURLToPath(import.meta.url));
const logoB64 = readFileSync(
  join(__dir, "../src/assets/ehs-logo.png"),
).toString("base64");
const LOGO_AR = 452 / 116;

const ORANGE = [248, 128, 0];
const INK = [28, 28, 36];
const SOFT = [90, 96, 110];
const RULE = [220, 224, 230];
const CODEBG = [244, 246, 249];

// Layout state — reset per document.
let doc, PW, PH, CW;
const M = 54;
let y = M;
let footerLabel = "";

function ensure(h) {
  if (y + h > PH - 54) {
    footer();
    doc.addPage();
    y = M;
  }
}
function footer() {
  doc.setDrawColor(...RULE);
  doc.setLineWidth(0.6);
  doc.line(M, PH - 40, PW - M, PH - 40);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...SOFT);
  doc.text(footerLabel, M, PH - 28);
  doc.text(
    `${pageWord} ${doc.internal.getNumberOfPages()}`,
    PW - M,
    PH - 28,
    { align: "right" },
  );
}
let pageWord = "Page";
function h1(t) {
  ensure(40);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.setTextColor(...INK);
  doc.text(t, M, y);
  y += 8;
  doc.setDrawColor(...ORANGE);
  doc.setLineWidth(2);
  doc.line(M, y, M + 40, y);
  y += 18;
}
function para(t, opts = {}) {
  const size = opts.size ?? 10.5;
  const color = opts.color ?? INK;
  doc.setFont("helvetica", opts.bold ? "bold" : "normal");
  doc.setFontSize(size);
  doc.setTextColor(...color);
  const lines = doc.splitTextToSize(t, CW);
  for (const ln of lines) {
    ensure(size + 5);
    doc.text(ln, M, y);
    y += size + 4.5;
  }
  y += 4;
}
function step(n, title, body) {
  ensure(46);
  doc.setFillColor(...ORANGE);
  doc.circle(M + 9, y - 3, 9, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.setTextColor(255, 255, 255);
  doc.text(String(n), M + 9, y, { align: "center" });
  doc.setTextColor(...INK);
  doc.setFontSize(11);
  doc.text(title, M + 26, y - 1);
  y += 16;
  const lines = doc.splitTextToSize(body, CW - 26);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...SOFT);
  for (const ln of lines) {
    ensure(15);
    doc.text(ln, M + 26, y);
    y += 14;
  }
  y += 8;
}
function table(headers, rows, widths) {
  const rowH = 20;
  const totalH = rowH * (rows.length + 1) + 6;
  ensure(totalH);
  let x = M;
  doc.setFillColor(...INK);
  doc.rect(M, y - 4, CW, rowH, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(255, 255, 255);
  headers.forEach((h, i) => {
    const align = i === 0 ? "left" : "right";
    const tx = align === "left" ? x + 8 : x + widths[i] - 8;
    doc.text(h, tx, y + 9, { align });
    x += widths[i];
  });
  y += rowH;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  rows.forEach((r, ri) => {
    if (ri % 2 === 1) {
      doc.setFillColor(...CODEBG);
      doc.rect(M, y - 4, CW, rowH, "F");
    }
    x = M;
    r.forEach((cell, i) => {
      const align = i === 0 ? "left" : "right";
      const tx = align === "left" ? x + 8 : x + widths[i] - 8;
      doc.setTextColor(...(i === 0 ? INK : SOFT));
      doc.text(String(cell), tx, y + 9, { align });
      x += widths[i];
    });
    y += rowH;
  });
  doc.setDrawColor(...RULE);
  doc.setLineWidth(0.6);
  doc.rect(M, y - 4 - rowH * (rows.length + 1), CW, rowH * (rows.length + 1));
  y += 10;
}
function code(t) {
  doc.setFont("courier", "normal");
  doc.setFontSize(10);
  const lines = doc.splitTextToSize(t, CW - 24);
  const boxH = lines.length * 14 + 16;
  ensure(boxH);
  doc.setFillColor(...CODEBG);
  doc.roundedRect(M, y - 4, CW, boxH, 4, 4, "F");
  doc.setTextColor(...INK);
  let yy = y + 12;
  for (const ln of lines) {
    doc.text(ln, M + 12, yy);
    yy += 14;
  }
  y += boxH + 8;
}

function generate(S, outPath) {
  doc = new jsPDF({ unit: "pt", format: "a4" });
  PW = doc.internal.pageSize.getWidth();
  PH = doc.internal.pageSize.getHeight();
  CW = PW - M * 2;
  y = M;
  footerLabel = S.footer;
  pageWord = S.page;

  // Header band
  doc.setFillColor(...INK);
  doc.rect(0, 0, PW, 92, "F");
  doc.setFillColor(...ORANGE);
  doc.rect(0, 92, PW, 4, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(255, 255, 255);
  doc.text(S.title, M, 46);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(210, 214, 222);
  doc.text(S.subtitle, M, 68);
  const logoH = 30;
  const logoW = logoH * LOGO_AR;
  doc.addImage(
    `data:image/png;base64,${logoB64}`,
    "PNG",
    PW - M - logoW,
    30,
    logoW,
    logoH,
  );
  y = 130;

  para(S.intro, { color: SOFT });

  h1(S.panelsTitle);
  para(S.panelsIntro, { color: SOFT, size: 10 });
  table(
    S.panelsHeaders,
    [
      ["Uniview UR Pro 0.5x1m", "0.5 x 1.0", "128 x 256", "350 W"],
      ["Uniview UR Pro 0.5x1m + cable", "0.5 x 1.0", "128 x 256", "350 W"],
      ["Uniview UR Pro 0.5x0.5m 90 deg", "0.5 x 0.5", "128 x 128", "175 W"],
      [
        "Uniview UR Pro 0.5x0.5m 90 deg + cable",
        "0.5 x 0.5",
        "128 x 128",
        "175 W",
      ],
      [S.customPanel, "0.5 x 0.5", "128 x 128", "175 W"],
    ],
    [CW * 0.46, CW * 0.16, CW * 0.18, CW * 0.2],
  );

  h1(S.buildTitle);
  S.steps.forEach((st, i) =>
    step(i + 1, st.t.replace(/^\d+\s+/, ""), st.b),
  );

  h1(S.exampleTitle);
  para(S.exampleIntro, { color: SOFT, size: 10 });
  table(S.exampleHeaders, S.exampleRows, [CW * 0.3, CW * 0.45, CW * 0.25]);
  para(S.exampleReadout, { size: 10 });
  para(S.exampleDim, { color: SOFT, size: 10 });

  h1(S.maxAvgTitle);
  para(S.maxLine, { bold: true });
  para(S.avgLine);

  h1(S.chainTitle);
  para(S.chainIntro, { color: SOFT, size: 10 });
  para(S.chainSignalLabel, { bold: true, size: 10.5 });
  table(S.chainSignalHeaders, S.chainSignalRows, [CW * 0.55, CW * 0.45]);
  para(S.chainSignalNote, { color: SOFT, size: 10 });
  para(S.chainPowerLabel, { bold: true, size: 10.5 });
  table(S.chainPowerHeaders, S.chainPowerRows, [CW * 0.5, CW * 0.25, CW * 0.25]);
  para(S.chainPowerNote, { color: SOFT, size: 10 });
  para(S.chainToolNote, { color: SOFT, size: 10 });

  h1(S.overrideTitle);
  para(S.overrideLine, { color: SOFT });

  h1(S.oneLineTitle);
  para(S.oneLine, { bold: true });

  footer();
  writeFileSync(outPath, Buffer.from(doc.output("arraybuffer")));
  console.log("wrote", outPath);
}

// Build steps with their formulas folded in as separate step bodies.
function withFormulas(S) {
  return S;
}

const EN = {
  title: "LED Power Consumption",
  subtitle: "How the EHS Production Tool calculates LED wall power & current",
  footer: "EHS Production Tool — LED Power Reference",
  page: "Page",
  intro:
    "This note explains, end to end, how the tool turns a panel's rated wattage into the power and amperage figures you see on the LED tab and in the project PDF. Every value below can be overridden per screen.",
  panelsTitle: "Panel wattages (current catalog)",
  panelsIntro:
    "These are the rated (peak, full-white) wattages per cabinet in the tool today. The 0.5 x 1 m cabinet exists in two rows — bare and with its captive cable loom — but both pull the same power.",
  panelsHeaders: ["Cabinet", "Size (m)", "Pixels", "Rated power"],
  customPanel: "Custom panel (fallback)",
  buildTitle: "The build-up, step by step",
  steps: [
    {
      t: "1  Start with the panel's rated power",
      b: "Every cabinet in the catalog has a rated wattage (its peak draw running full white). This is the starting point for one cabinet.",
    },
    {
      t: "2  Scale it for brightness",
      b: "You rarely run full brightness. Nominal calibration point is 5000 nits. Even at 0 nits a panel still pulls 30% of rated power (receiving cards, fans, processors never switch off) — that is the floor. Above the floor it scales linearly up to 100% at nominal.  Formula: brightnessFactor = 0.30 + 0.70 x (yourNits / 5000), capped at 1.0. Example: 2500 nits = 0.30 + 0.70 x 0.5 = 65%.",
    },
    {
      t: "3  Add PSU overhead",
      b: "Power supplies lose energy and you want a safety margin, so a percentage is added on top (default 25%, overridable per screen).  Formula: wattsPerCabinet = panel.power x brightnessFactor x (1 + overhead/100).",
    },
    {
      t: "4  Multiply by enabled cabinets",
      b: "Only cabinets that are actually powered count — disabled or blanked ones are excluded.  Formula: totalWatts = wattsPerCabinet x (number of enabled cabinets).",
    },
    {
      t: "5  Convert watts to amps",
      b: "Using the region's mains voltage (e.g. 230 V EU, 120 V US) and the power factor (default 0.95).  Formula: amps = totalWatts / (voltage x powerFactor).",
    },
    {
      t: "6  Split across power chains",
      b: "If you set a max-cabinets-per-chain, the tool works out how many chains you need and divides the amps evenly. A chain is flagged as overloaded when it exceeds 80% of the breaker rating (the standard de-rate).",
    },
  ],
  exampleTitle: "Worked example — a 5 m x 3 m wall",
  exampleIntro:
    "A wall 5 m wide x 3 m tall (physical size). With the Uniview UR Pro 0.5 x 1 m cabinet (0.5 m wide x 1.0 m tall) that is 10 cabinets wide x 3 tall = 30 cabinets, all powered. At full brightness, 25% PSU overhead, 230 V EU mains, 0.95 power factor.",
  exampleHeaders: ["Step", "Calculation", "Result"],
  exampleRows: [
    ["Wall -> cabinets", "(5.0 / 0.5) x (3.0 / 1.0)", "10 x 3 = 30"],
    ["Brightness factor", "full (5000 nits) -> 1.0", "1.0"],
    ["Watts per cabinet", "350 x 1.0 x 1.25", "437.5 W"],
    ["Total (Max output)", "437.5 x 30", "13,125 W"],
    ["Current", "13125 / (230 x 0.95)", "60.1 A"],
    ["Average output", "13125 / 3", "4,375 W"],
    ["Chains (6/chain)", "ceil(30 / 6)", "5 chains"],
    ["Amps per chain", "60.1 / 5", "12.0 A"],
  ],
  exampleReadout:
    "Read-out: this 5 x 3 m wall needs about 60 A total at full white — across 5 power chains that is ~12 A each, just inside a 16 A breaker's 80% ceiling (12.8 A). For generator and heat planning, expect roughly 4.4 kW average on real content.",
  exampleDim:
    "Dim the wall and it drops fast: the same 5 x 3 m wall at 2500 nits uses brightness factor 0.65, so watts per cabinet = 350 x 0.65 x 1.25 = 284 W, total = 8,531 W (Max), and current = 39.0 A.",
  maxAvgTitle: "Max output vs Average output",
  maxLine:
    "Max output  =  totalWatts above — peak draw, full white. Size your cable, distro and breakers off THIS number.",
  avgLine:
    "Average output  =  Max x 1/3. Real content (video, text, logos) almost never lights every pixel white, so realistic running draw is roughly a third of peak. Use it for generator fuel and heat planning — never for sizing power infrastructure.",
  chainTitle: "Signal & power chaining (rigging limits)",
  chainIntro:
    "Beyond raw load, two practical limits decide how you cable a wall: how many cabinets you can daisy-chain on one data link, and how many on one power feed. The figures below are for the Uniview UR Pro 0.5 x 1 m cabinet at 50 Hz refresh, fed by a 16 A powerCON TRUE1 via a Soca breakout mounted at the top of the screen.",
  chainSignalLabel: "Signal — panels per data link",
  chainSignalHeaders: ["Colour depth", "Panels per data link (50 Hz)"],
  chainSignalRows: [
    ["10-bit", "up to 18"],
    ["8-bit", "up to 24"],
  ],
  chainSignalNote:
    "Lower colour depth carries more panels per port because each pixel costs fewer bits of the port's fixed bandwidth budget. These are 50 Hz figures (standard in Norway); at 60 Hz the counts drop by roughly a sixth.",
  chainPowerLabel: "Power — panels per TRUE1 chain (top-fed)",
  chainPowerHeaders: ["Daisy-chain on one 16 A TRUE1", "Panels", "Approx. current"],
  chainPowerRows: [
    ["Comfortable design link", "9", "~14.4 A"],
    ["Hard maximum", "10", "~16.0 A"],
  ],
  chainPowerNote:
    "At nameplate 350 W per cabinet, each draws ~1.6 A (230 V, 0.95 PF). Nine leaves headroom; ten sits right at the 16 A connector limit at full white. Feeding from the top means the top cabinet's connector carries the whole chain's current, so it sets the ceiling.",
  chainToolNote:
    "Note: the LED tab is deliberately more cautious — about 6 cabinets per chain — because it adds 25% PSU overhead and an 80% breaker de-rate on top of the nameplate. That is the safe continuous design target; 9-10 is the physical hardware ceiling.",
  overrideTitle: "What you can override per screen",
  overrideLine:
    "Voltage region  -  Power factor (default 0.95)  -  PSU overhead % (default 25%)  -  Brightness in nits  -  Cabinets per power chain. Each has a sensible default but can be set per screen.",
  oneLineTitle: "In one line",
  oneLine:
    "Rated cabinet watts -> dim it for brightness -> pad it for PSU losses -> multiply by cabinet count -> divide by volts to get amps -> split across chains and check against breakers.",
};

const NO = {
  title: "LED Effektforbruk",
  subtitle: "Slik beregner EHS Production Tool effekt og strøm for LED-vegger",
  footer: "EHS Production Tool — LED Effektreferanse",
  page: "Side",
  intro:
    "Dette notatet forklarer, fra start til slutt, hvordan verktøyet gjør et panels nominelle wattforbruk om til effekt- og strømtallene du ser i LED-fanen og i prosjekt-PDF-en. Alle verdier under kan overstyres per skjerm.",
  panelsTitle: "Panelwattforbruk (gjeldende katalog)",
  panelsIntro:
    "Dette er det nominelle (maks, helhvitt) wattforbruket per kabinett i verktøyet i dag. 0,5 x 1 m-kabinettet finnes i to rader — uten og med fast kabelloom — men begge trekker samme effekt.",
  panelsHeaders: ["Kabinett", "Størrelse (m)", "Piksler", "Nominell effekt"],
  customPanel: "Egendefinert panel (reserve)",
  buildTitle: "Oppbygging, steg for steg",
  steps: [
    {
      t: "1  Start med panelets nominelle effekt",
      b: "Hvert kabinett i katalogen har et nominelt wattforbruk (maksimalt trekk ved helhvitt). Dette er utgangspunktet for ett kabinett.",
    },
    {
      t: "2  Skalér for lysstyrke",
      b: "Du kjører sjelden full lysstyrke. Nominelt kalibreringspunkt er 5000 nits. Selv ved 0 nits trekker et panel 30 % av nominell effekt (mottakerkort, vifter, prosessorer slår aldri av) — det er gulvet. Over gulvet skaleres det lineært opp til 100 % ved nominelt.  Formel: lysstyrkefaktor = 0,30 + 0,70 x (dineNits / 5000), maks 1,0. Eksempel: 2500 nits = 0,30 + 0,70 x 0,5 = 65 %.",
    },
    {
      t: "3  Legg til PSU-overhead",
      b: "Strømforsyninger taper energi og du vil ha en sikkerhetsmargin, så en prosentandel legges til på toppen (standard 25 %, kan overstyres per skjerm).  Formel: wattPerKabinett = panel.effekt x lysstyrkefaktor x (1 + overhead/100).",
    },
    {
      t: "4  Multiplisér med antall aktive kabinetter",
      b: "Bare kabinetter som faktisk får strøm telles — deaktiverte eller svartede utelates.  Formel: totalWatt = wattPerKabinett x (antall aktive kabinetter).",
    },
    {
      t: "5  Gjør om watt til ampere",
      b: "Med regionens nettspenning (f.eks. 230 V EU, 120 V US) og effektfaktoren (standard 0,95).  Formel: ampere = totalWatt / (spenning x effektfaktor).",
    },
    {
      t: "6  Fordel over strømkjeder",
      b: "Hvis du angir maks kabinetter per kjede, regner verktøyet ut hvor mange kjeder du trenger og fordeler amperene jevnt. En kjede flagges som overbelastet når den overstiger 80 % av sikringens merkestrøm (standard nedjustering).",
    },
  ],
  exampleTitle: "Regneeksempel — en vegg på 5 m x 3 m",
  exampleIntro:
    "En vegg 5 m bred x 3 m høy (fysisk størrelse). Med Uniview UR Pro 0,5 x 1 m-kabinett (0,5 m bredt x 1,0 m høyt) blir det 10 kabinetter bredt x 3 høyt = 30 kabinetter, alle med strøm. Ved full lysstyrke, 25 % PSU-overhead, 230 V EU-nett, 0,95 effektfaktor.",
  exampleHeaders: ["Steg", "Beregning", "Resultat"],
  exampleRows: [
    ["Vegg -> kabinetter", "(5,0 / 0,5) x (3,0 / 1,0)", "10 x 3 = 30"],
    ["Lysstyrkefaktor", "full (5000 nits) -> 1,0", "1,0"],
    ["Watt per kabinett", "350 x 1,0 x 1,25", "437,5 W"],
    ["Totalt (Maks)", "437,5 x 30", "13 125 W"],
    ["Strøm", "13125 / (230 x 0,95)", "60,1 A"],
    ["Gjennomsnitt", "13125 / 3", "4 375 W"],
    ["Kjeder (6/kjede)", "ceil(30 / 6)", "5 kjeder"],
    ["Ampere per kjede", "60,1 / 5", "12,0 A"],
  ],
  exampleReadout:
    "Tolkning: denne 5 x 3 m-veggen trenger ca. 60 A totalt ved helhvitt — fordelt på 5 strømkjeder er det ~12 A hver, så vidt innenfor 80 %-taket for en 16 A-sikring (12,8 A). For aggregat- og varmeplanlegging, regn med rundt 4,4 kW gjennomsnitt på reelt innhold.",
  exampleDim:
    "Demp veggen og det faller raskt: samme 5 x 3 m-vegg ved 2500 nits bruker lysstyrkefaktor 0,65, så watt per kabinett = 350 x 0,65 x 1,25 = 284 W, totalt = 8 531 W (Maks), og strøm = 39,0 A.",
  maxAvgTitle: "Maks effekt vs gjennomsnittlig effekt",
  maxLine:
    "Maks effekt  =  totalWatt over — topptrekk, helhvitt. Dimensjonér kabel, distro og sikringer etter DETTE tallet.",
  avgLine:
    "Gjennomsnitt  =  Maks x 1/3. Reelt innhold (video, tekst, logoer) lyser nesten aldri hver piksel hvit, så realistisk driftstrekk er omtrent en tredel av topp. Bruk det til aggregatdrivstoff og varmeplanlegging — aldri til å dimensjonere strøminfrastruktur.",
  chainTitle: "Signal- og strømkjeding (riggegrenser)",
  chainIntro:
    "Utover ren last er det to praktiske grenser som avgjør hvordan du kabler en vegg: hvor mange kabinetter du kan kjede på én signallinje, og hvor mange på én strømtilførsel. Tallene under gjelder Uniview UR Pro 0,5 x 1 m-kabinettet ved 50 Hz oppdatering, matet av en 16 A powerCON TRUE1 via et Soca-utlegg montert på toppen av skjermen.",
  chainSignalLabel: "Signal — paneler per signallinje",
  chainSignalHeaders: ["Fargedybde", "Paneler per signallinje (50 Hz)"],
  chainSignalRows: [
    ["10-bit", "opptil 18"],
    ["8-bit", "opptil 24"],
  ],
  chainSignalNote:
    "Lavere fargedybde bærer flere paneler per port fordi hver piksel koster færre bits av portens faste båndbredde. Dette er 50 Hz-tall (standard i Norge); ved 60 Hz faller antallet med omtrent en sjettedel.",
  chainPowerLabel: "Strøm — paneler per TRUE1-kjede (matet fra toppen)",
  chainPowerHeaders: ["Kjede på én 16 A TRUE1", "Paneler", "Ca. strøm"],
  chainPowerRows: [
    ["Komfortabel designkjede", "9", "~14,4 A"],
    ["Absolutt maks", "10", "~16,0 A"],
  ],
  chainPowerNote:
    "Ved nominelle 350 W per kabinett trekker hvert ~1,6 A (230 V, 0,95 effektfaktor). Ni gir margin; ti ligger rett på 16 A-koblingens grense ved helhvitt. Mating fra toppen betyr at det øverste kabinettets kobling fører hele kjedens strøm, så det setter taket.",
  chainToolNote:
    "Merk: LED-fanen er bevisst mer forsiktig — omtrent 6 kabinetter per kjede — fordi den legger til 25 % PSU-overhead og en 80 % nedjustering av sikringen oppå det nominelle. Det er det trygge kontinuerlige designmålet; 9-10 er den fysiske maskinvaregrensen.",
  overrideTitle: "Hva du kan overstyre per skjerm",
  overrideLine:
    "Spenningsregion  -  Effektfaktor (standard 0,95)  -  PSU-overhead % (standard 25 %)  -  Lysstyrke i nits  -  Kabinetter per strømkjede. Hver har en fornuftig standard, men kan settes per skjerm.",
  oneLineTitle: "Kort oppsummert",
  oneLine:
    "Nominell kabinettwatt -> demp for lysstyrke -> legg til PSU-tap -> multiplisér med antall kabinetter -> del på volt for ampere -> fordel over kjeder og sjekk mot sikringer.",
};

const outDir = process.argv[2] ?? ".";
generate(withFormulas(EN), join(outDir, "LED-Power-Calculation.pdf"));
generate(withFormulas(NO), join(outDir, "LED-Effektberegning-NO.pdf"));
