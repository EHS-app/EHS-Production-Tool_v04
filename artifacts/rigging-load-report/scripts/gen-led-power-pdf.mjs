import { jsPDF } from "jspdf";
import { writeFileSync } from "node:fs";

const ORANGE = [248, 128, 0];
const INK = [28, 28, 36];
const SOFT = [90, 96, 110];
const RULE = [220, 224, 230];
const CODEBG = [244, 246, 249];

const doc = new jsPDF({ unit: "pt", format: "a4" });
const PW = doc.internal.pageSize.getWidth();
const PH = doc.internal.pageSize.getHeight();
const M = 54;
const CW = PW - M * 2;
let y = M;

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
  doc.text("EHS Production Tool — LED Power Reference", M, PH - 28);
  doc.text(`Page ${doc.internal.getNumberOfPages()}`, PW - M, PH - 28, { align: "right" });
}
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

// ---- Header band ----
doc.setFillColor(...INK);
doc.rect(0, 0, PW, 92, "F");
doc.setFillColor(...ORANGE);
doc.rect(0, 92, PW, 4, "F");
doc.setFont("helvetica", "bold");
doc.setFontSize(20);
doc.setTextColor(255, 255, 255);
doc.text("LED Power Consumption", M, 46);
doc.setFont("helvetica", "normal");
doc.setFontSize(11);
doc.setTextColor(210, 214, 222);
doc.text("How the EHS Production Tool calculates LED wall power & current", M, 68);
y = 130;

para(
  "This note explains, end to end, how the tool turns a panel's rated wattage into the power and amperage figures you see on the LED tab and in the project PDF. Every value below can be overridden per screen.",
  { color: SOFT },
);

h1("The build-up, step by step");
step(
  1,
  "Start with the panel's rated power",
  "Every cabinet in the catalog has a rated wattage (its peak draw running full white). This is the starting point for one cabinet.",
);
step(
  2,
  "Scale it for brightness",
  "You rarely run full brightness. The nominal calibration point is 5000 nits. Even at 0 nits a panel still pulls 30% of rated power (receiving cards, fans, processors never switch off) — that is the floor. Above the floor it scales linearly up to 100% at nominal.",
);
code("brightnessFactor = 0.30 + 0.70 x (yourNits / 5000)   (capped at 1.0)");
para(
  "Example: a screen set to 2500 nits = 0.30 + 0.70 x 0.5 = 65% of rated power.",
  { color: SOFT, size: 10 },
);
step(
  3,
  "Add PSU overhead",
  "Power supplies lose energy and you want a safety margin, so a percentage is added on top (default 25%, overridable per screen).",
);
code("wattsPerCabinet = panel.power x brightnessFactor x (1 + overhead/100)");
step(
  4,
  "Multiply by enabled cabinets",
  "Only cabinets that are actually powered count — disabled or blanked ones are excluded.",
);
code("totalWatts = wattsPerCabinet x (number of enabled cabinets)");
step(
  5,
  "Convert watts to amps",
  "Using the region's mains voltage (e.g. 230 V EU, 120 V US) and the power factor (default 0.95).",
);
code("amps = totalWatts / (voltage x powerFactor)");
step(
  6,
  "Split across power chains",
  "If you set a max-cabinets-per-chain, the tool works out how many chains you need and divides the amps evenly. A chain is flagged as overloaded when it exceeds 80% of the breaker rating (the standard de-rate).",
);

h1("Max output vs Average output");
para(
  "Max output  =  totalWatts above — peak draw, full white. Size your cable, distro and breakers off THIS number.",
  { bold: true },
);
para(
  "Average output  =  Max x 1/3. Real content (video, text, logos) almost never lights every pixel white, so realistic running draw is roughly a third of peak. Use it for generator fuel and heat planning — never for sizing power infrastructure.",
);

h1("What you can override per screen");
para(
  "Voltage region  -  Power factor (default 0.95)  -  PSU overhead % (default 25%)  -  Brightness in nits  -  Cabinets per power chain. Each has a sensible default but can be set per screen.",
  { color: SOFT },
);

h1("In one line");
para(
  "Rated cabinet watts -> dim it for brightness -> pad it for PSU losses -> multiply by cabinet count -> divide by volts to get amps -> split across chains and check against breakers.",
  { bold: true },
);

footer();

const buf = Buffer.from(doc.output("arraybuffer"));
writeFileSync(process.argv[2], buf);
console.log("wrote", process.argv[2], buf.length, "bytes");
