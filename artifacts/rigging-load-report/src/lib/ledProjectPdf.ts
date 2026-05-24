/**
 * LED Project PDF — single multi-page PDF that captures the whole
 * pixel-map workspace as a deliverable for the venue / freelancer
 * crew. The output is A4 landscape and contains:
 *
 *   1. Cover           — EHS logo + project metadata (no snapshot)
 *   2. Power drawing   — canvas snapshot with ONLY power overlays
 *   3. Signal drawing  — canvas snapshot with ONLY signal overlays
 *   4. Technical summary — per-screen pixels, area, weight, power
 *   5. Cable summary     — per-screen signal/power jumpers + brackets
 *
 * The two canvas snapshots are produced by cloning the live
 * `<svg class="led-canvas">` in the DOM and selectively showing or
 * hiding the elements tagged with `data-paint-overlay`,
 * `data-marker-kind`, and `data-painted-badge`. The EHS logo is
 * stamped onto the snapshot SVG so it shows up in the drawing
 * itself, mirroring how the canvas reads on screen. This avoids any
 * React state round-trip and keeps export logic decoupled from the
 * paint toolbar's `paintMode` UI state.
 */
import type { LedPanel, LedScreen, LedSettings } from "./led";
import {
  computeScreenMetrics,
  computeScreenCableBOM,
  enabledPanelCount,
  resolveScreenPanel,
  SIGNAL_CABLE_LENGTH_M,
  POWER_TRUE1_CABLE_LENGTH_M,
} from "./led";
import { estimateScreenPower } from "./led/engine/power";
import { rasterizeSvgToPng, safeFilename } from "./ledExport";

type Mode = "power" | "signal";

export type LedProjectPdfInput = {
  screens: LedScreen[];
  panels: LedPanel[];
  settings: LedSettings;
  projectName: string;
  venue: string;
  client: string;
  reportDate: string;
  /** URL or data URI for the EHS logo. The caller passes the
   *  imported asset (e.g. `import ehsLogo from "./assets/ehs-logo.png"`).
   *  The logo is fetched once, converted to a data URL, and reused
   *  for every page header + the in-canvas watermark. */
  logoSrc?: string;
  /** Optional override for the canvas SVG element. Defaults to the
   *  first `.led-canvas` found in the document. */
  canvasSvg?: SVGSVGElement | null;
};

/** Build the PDF and trigger a browser download. */
export async function downloadLedProjectPdf(
  input: LedProjectPdfInput,
): Promise<void> {
  const live = input.canvasSvg ??
    document.querySelector<SVGSVGElement>(".led-canvas");
  if (!live) {
    throw new Error(
      "Open the LED tab and add at least one screen before exporting the project PDF.",
    );
  }
  if (input.screens.length === 0) {
    throw new Error(
      "Add at least one LED screen before exporting the project PDF.",
    );
  }

  // Load the EHS logo once, up-front. Fall back to an empty data
  // URI on failure so the rest of the export still succeeds.
  const logoDataUrl = await loadLogoDataUrl(input.logoSrc);

  const [powerPng, signalPng] = await Promise.all([
    snapshotCanvas(live, "power", logoDataUrl),
    snapshotCanvas(live, "signal", logoDataUrl),
  ]);

  const { default: jsPDF } = await import("jspdf");
  const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "landscape" });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const margin = 12;

  // ── Page 1 — Cover (logo + metadata, no snapshot) ───────────────
  drawHeader(pdf, "LED Project Pack", pageW, margin, logoDataUrl);
  drawMetaBlock(pdf, input, margin, 36, pageW - margin * 2);

  // ── Page 2 — Power drawing ──────────────────────────────────────
  pdf.addPage();
  drawHeader(pdf, "Power drawing", pageW, margin, logoDataUrl);
  drawSubLine(pdf, input, margin, 26, pageW - margin * 2);
  await drawFittedImage(pdf, powerPng, margin, 32, pageW - margin * 2, pageH - 32 - margin);

  // ── Page 3 — Signal drawing ─────────────────────────────────────
  pdf.addPage();
  drawHeader(pdf, "Signal drawing", pageW, margin, logoDataUrl);
  drawSubLine(pdf, input, margin, 26, pageW - margin * 2);
  await drawFittedImage(pdf, signalPng, margin, 32, pageW - margin * 2, pageH - 32 - margin);

  // ── Page 4 — Technical summary ──────────────────────────────────
  pdf.addPage();
  drawHeader(pdf, "Technical summary", pageW, margin, logoDataUrl);
  drawSubLine(pdf, input, margin, 26, pageW - margin * 2);
  drawTechSummary(
    pdf,
    input.screens,
    input.panels,
    input.settings,
    margin,
    32,
    pageW - margin * 2,
    input,
    pageW,
    pageH,
    margin,
    logoDataUrl,
  );

  // ── Page 5 — Cable summary ──────────────────────────────────────
  pdf.addPage();
  drawHeader(pdf, "Cable summary", pageW, margin, logoDataUrl);
  drawSubLine(pdf, input, margin, 26, pageW - margin * 2);
  drawCableSummary(
    pdf,
    input.screens,
    input.panels,
    margin,
    32,
    pageW - margin * 2,
    input,
    pageW,
    pageH,
    margin,
    logoDataUrl,
  );

  const base = safeFilename(input.projectName || input.venue || "led-project");
  pdf.save(`${base}_led-project.pdf`);
}

// ─── Logo loading ──────────────────────────────────────────────────

/** Load the logo URL into a canvas and return a PNG data URL.
 *  Using an Image element (rather than `fetch`) lets the browser
 *  resolve the URL exactly as it would in the live app — including
 *  any Vite BASE path prefix — so the asset reliably loads in both
 *  development and production builds. Returns "" on failure so
 *  callers can guard with a simple truthiness check. */
async function loadLogoDataUrl(src: string | undefined): Promise<string> {
  if (!src) return "";
  // Already a data URL — pass through.
  if (src.startsWith("data:")) return src;
  try {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.decoding = "async";
    img.src = src;
    await new Promise<void>((resolve, reject) => {
      if (img.complete && img.naturalWidth > 0) return resolve();
      img.onload = () => resolve();
      img.onerror = () => reject(new Error(`Failed to load logo: ${src}`));
    });
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth || 256;
    canvas.height = img.naturalHeight || 96;
    const ctx = canvas.getContext("2d");
    if (!ctx) return "";
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/png");
  } catch (err) {
    console.warn("[ledProjectPdf] could not load logo:", err);
    return "";
  }
}

/** Logo dimensions in mm for the PDF page header. */
const LOGO_HEADER_W_MM = 24;
const LOGO_HEADER_H_MM = 10;

// ─── Canvas snapshot ───────────────────────────────────────────────

/** Clone the live canvas SVG, filter overlays/markers/badges by the
 *  requested mode, stamp the EHS logo onto the top-left corner, and
 *  rasterise to a PNG data URL. */
async function snapshotCanvas(
  live: SVGSVGElement,
  mode: Mode,
  logoDataUrl: string,
): Promise<{ dataUrl: string; width: number; height: number }> {
  const clone = live.cloneNode(true) as SVGSVGElement;

  // Apply mode filter to the clone.
  const showPower = mode === "power";
  const showSignal = mode === "signal";

  // Painted port-chain overlays.
  clone.querySelectorAll<SVGElement>('[data-paint-overlay="power"]').forEach((el) => {
    el.style.display = showPower ? "block" : "none";
  });
  clone.querySelectorAll<SVGElement>('[data-paint-overlay="signal"]').forEach((el) => {
    el.style.display = showSignal ? "block" : "none";
  });

  // Drop pins (free-floating markers) + per-panel badges share the
  // same `data-marker-kind` attribute.
  clone.querySelectorAll<SVGElement>('[data-marker-kind="power"]').forEach((el) => {
    el.style.display = showPower ? "" : "none";
  });
  clone.querySelectorAll<SVGElement>('[data-marker-kind="signal"]').forEach((el) => {
    el.style.display = showSignal ? "" : "none";
  });

  // "Cabled" indicator badges in the corner of each screen.
  clone.querySelectorAll<SVGElement>('[data-painted-badge="power"]').forEach((el) => {
    el.style.display = showPower ? "" : "none";
  });
  clone.querySelectorAll<SVGElement>('[data-painted-badge="signal"]').forEach((el) => {
    el.style.display = showSignal ? "" : "none";
  });

  // Inline the viewBox geometry so the rasteriser has explicit pixel
  // size. We pick a generous render size for high-DPI print output;
  // rasterizeSvgToPng will clamp to MAX_PNG_DIM internally.
  const vb = clone.viewBox?.baseVal;
  const viewW = vb && vb.width > 0 ? vb.width : 1920;
  const viewH = vb && vb.height > 0 ? vb.height : 1080;
  const aspect = viewW / viewH;
  // Target ~3200 px on the long edge — comfortable for A4 landscape
  // print at 300 DPI without blowing past the canvas cap.
  const targetLong = 3200;
  const pixelW = aspect >= 1 ? targetLong : Math.round(targetLong * aspect);
  const pixelH = aspect >= 1 ? Math.round(targetLong / aspect) : targetLong;

  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  clone.setAttribute("xmlns:xlink", "http://www.w3.org/1999/xlink");
  clone.setAttribute("width", String(pixelW));
  clone.setAttribute("height", String(pixelH));
  // Paint a white background so transparent regions read on paper.
  const bg = document.createElementNS("http://www.w3.org/2000/svg", "rect");
  bg.setAttribute("x", String(vb?.x ?? 0));
  bg.setAttribute("y", String(vb?.y ?? 0));
  bg.setAttribute("width", String(viewW));
  bg.setAttribute("height", String(viewH));
  bg.setAttribute("fill", "#ffffff");
  clone.insertBefore(bg, clone.firstChild);

  // Stamp the EHS logo onto the snapshot in the same way as the
  // canvas reads on screen — top-left corner, sized to ~9% of the
  // long edge for legibility at print resolution.
  if (logoDataUrl) {
    const logoLong = Math.max(viewW, viewH) * 0.09;
    const aspectGuess = 2.4; // ehs-logo.png is wide; refined by browser if needed.
    const logoW = logoLong;
    const logoH = logoLong / aspectGuess;
    const pad = Math.max(viewW, viewH) * 0.012;
    const img = document.createElementNS("http://www.w3.org/2000/svg", "image");
    img.setAttributeNS(
      "http://www.w3.org/1999/xlink",
      "xlink:href",
      logoDataUrl,
    );
    img.setAttribute("href", logoDataUrl);
    img.setAttribute("x", String((vb?.x ?? 0) + pad));
    img.setAttribute("y", String((vb?.y ?? 0) + pad));
    img.setAttribute("width", String(logoW));
    img.setAttribute("height", String(logoH));
    img.setAttribute("preserveAspectRatio", "xMinYMin meet");
    clone.appendChild(img);
  }

  const svgString = new XMLSerializer().serializeToString(clone);
  const blob = await rasterizeSvgToPng(svgString, pixelW, pixelH);
  const dataUrl = await blobToDataUrl(blob);
  return { dataUrl, width: pixelW, height: pixelH };
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(String(fr.result));
    fr.onerror = () => reject(fr.error);
    fr.readAsDataURL(blob);
  });
}

// ─── Page primitives ───────────────────────────────────────────────

type JsPDF = import("jspdf").jsPDF;

function drawHeader(
  pdf: JsPDF,
  title: string,
  pageW: number,
  margin: number,
  logoDataUrl: string,
) {
  // Logo top-left. The image silently no-ops if the data URL is empty.
  let titleX = margin;
  if (logoDataUrl) {
    try {
      pdf.addImage(
        logoDataUrl,
        "PNG",
        margin,
        margin - 2,
        LOGO_HEADER_W_MM,
        LOGO_HEADER_H_MM,
        undefined,
        "FAST",
      );
      titleX = margin + LOGO_HEADER_W_MM + 6;
    } catch {
      // Bad image format — skip and fall through to text-only header.
    }
  }
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(16);
  pdf.setTextColor(20, 20, 20);
  pdf.text(title, titleX, margin + 5);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  pdf.setTextColor(120, 120, 120);
  pdf.text("EHS Production Tool — LED Pixel Map", pageW - margin, margin + 5, {
    align: "right",
  });
  pdf.setDrawColor(248, 128, 0);
  pdf.setLineWidth(0.8);
  pdf.line(margin, margin + 10, pageW - margin, margin + 10);
}

function drawSubLine(
  pdf: JsPDF,
  input: LedProjectPdfInput,
  x: number,
  y: number,
  _width: number,
) {
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);
  pdf.setTextColor(70, 70, 70);
  const parts: string[] = [];
  if (input.projectName) parts.push(input.projectName);
  if (input.venue) parts.push(input.venue);
  if (input.client) parts.push(input.client);
  if (input.reportDate) parts.push(input.reportDate);
  pdf.text(parts.join("  ·  "), x, y);
}

function drawMetaBlock(
  pdf: JsPDF,
  input: LedProjectPdfInput,
  x: number,
  y: number,
  width: number,
) {
  pdf.setDrawColor(220, 220, 220);
  pdf.setFillColor(248, 248, 248);
  pdf.roundedRect(x, y, width, 36, 2, 2, "FD");

  const colW = width / 4;
  const fields: Array<[string, string]> = [
    ["Project", input.projectName || "—"],
    ["Venue", input.venue || "—"],
    ["Client", input.client || "—"],
    ["Date", input.reportDate || "—"],
  ];
  fields.forEach(([label, value], i) => {
    const cx = x + 6 + i * colW;
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    pdf.setTextColor(130, 130, 130);
    pdf.text(label.toUpperCase(), cx, y + 10);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(12);
    pdf.setTextColor(30, 30, 30);
    const text = pdf.splitTextToSize(value, colW - 12);
    pdf.text(text, cx, y + 20);
  });
}

async function drawFittedImage(
  pdf: JsPDF,
  png: { dataUrl: string; width: number; height: number },
  x: number,
  y: number,
  maxW: number,
  maxH: number,
) {
  const ratio = png.width / png.height;
  let w = maxW;
  let h = w / ratio;
  if (h > maxH) {
    h = maxH;
    w = h * ratio;
  }
  const cx = x + (maxW - w) / 2;
  const cy = y + (maxH - h) / 2;
  pdf.addImage(png.dataUrl, "PNG", cx, cy, w, h, undefined, "FAST");
}

// ─── Summary tables ────────────────────────────────────────────────

/** Draw a table that wraps long cell content and paginates onto a
 *  fresh A4 landscape page when the running cursor would clip past
 *  the bottom margin. Returns the final cursor Y so the caller can
 *  place footnotes immediately below the last row. */
function drawTable(
  pdf: JsPDF,
  x: number,
  yStart: number,
  width: number,
  headers: string[],
  rows: string[][],
  colWeights: number[],
  pageTitle: string,
  pageBottom: number,
  drawPageHeader: (pdf: JsPDF, x: number) => number,
): number {
  const totalWeight = colWeights.reduce((a, b) => a + b, 0);
  const colWidths = colWeights.map((w) => (w / totalWeight) * width);
  const headerH = 7;
  const lineH = 4.5;
  const cellPadY = 2.2;
  const cellPadX = 2;

  const drawHeaderRow = (cy: number): number => {
    pdf.setFillColor(28, 28, 36);
    pdf.rect(x, cy, width, headerH, "F");
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(9);
    pdf.setTextColor(255, 255, 255);
    let cx = x;
    for (let i = 0; i < headers.length; i++) {
      pdf.text(headers[i], cx + cellPadX, cy + 5);
      cx += colWidths[i];
    }
    return cy + headerH;
  };

  let cy = drawHeaderRow(yStart);
  const tableTopY: { value: number } = { value: yStart };
  let rowsOnPage = 0;

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  pdf.setTextColor(30, 30, 30);

  for (let r = 0; r < rows.length; r++) {
    // Pre-wrap each cell to compute the row's effective height.
    const wrapped: string[][] = headers.map((_, i) => {
      const raw = rows[r][i] ?? "";
      return pdf.splitTextToSize(raw, colWidths[i] - cellPadX * 2) as string[];
    });
    const maxLines = wrapped.reduce((m, w) => Math.max(m, w.length || 1), 1);
    const rowH = Math.max(headerH, cellPadY * 2 + lineH * maxLines);

    // Paginate if this row would overflow the printable area.
    if (cy + rowH > pageBottom) {
      // Close the current table's outline before paginating.
      pdf.setDrawColor(220, 220, 220);
      pdf.setLineWidth(0.2);
      pdf.rect(x, tableTopY.value, width, cy - tableTopY.value);
      pdf.addPage();
      const headerOffset = drawPageHeader(pdf, x);
      // Place "(continued)" subtitle so the reader knows this is the
      // same table.
      pdf.setFont("helvetica", "italic");
      pdf.setFontSize(9);
      pdf.setTextColor(110, 110, 110);
      pdf.text(`${pageTitle} (continued)`, x, headerOffset);
      const next = headerOffset + 4;
      tableTopY.value = next;
      cy = drawHeaderRow(next);
      rowsOnPage = 0;
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(9);
      pdf.setTextColor(30, 30, 30);
    }

    // Zebra stripe.
    if (rowsOnPage % 2 === 0) {
      pdf.setFillColor(245, 245, 245);
      pdf.rect(x, cy, width, rowH, "F");
    }
    // Render each wrapped cell.
    let cx = x;
    for (let i = 0; i < headers.length; i++) {
      const lines = wrapped[i];
      for (let li = 0; li < lines.length; li++) {
        pdf.text(lines[li], cx + cellPadX, cy + cellPadY + lineH * (li + 1) - 1);
      }
      cx += colWidths[i];
    }
    cy += rowH;
    rowsOnPage++;
  }

  pdf.setDrawColor(220, 220, 220);
  pdf.setLineWidth(0.2);
  pdf.rect(x, tableTopY.value, width, cy - tableTopY.value);
  return cy;
}

function drawTechSummary(
  pdf: JsPDF,
  screens: LedScreen[],
  panels: LedPanel[],
  settings: LedSettings,
  x: number,
  y: number,
  width: number,
  input: LedProjectPdfInput,
  pageW: number,
  pageH: number,
  margin: number,
  logoDataUrl: string,
) {
  const headers = [
    "Screen",
    "Panel",
    "Grid (W×H)",
    "Pixels",
    "Area m²",
    "Weight kg",
    "Power W",
    "Amps",
  ];
  const rows: string[][] = [];
  let totPanels = 0;
  let totPixels = 0;
  let totArea = 0;
  let totWeight = 0;
  let totWatts = 0;

  for (const s of screens) {
    const panel = resolveScreenPanel(s, panels);
    const m = computeScreenMetrics(s, panels);
    const power = estimateScreenPower(s, panel, settings);
    const enabled = enabledPanelCount(s);
    totPanels += enabled;
    totPixels += m.pixelsX * m.pixelsY;
    totArea += m.widthM * m.heightM;
    totWeight += enabled * panel.weight;
    totWatts += power.totalWatts;

    rows.push([
      s.name || "(unnamed)",
      panel.name || "—",
      `${s.panelsWide} × ${s.panelsTall}`,
      `${m.pixelsX} × ${m.pixelsY}`,
      (m.widthM * m.heightM).toFixed(2),
      (enabled * panel.weight).toFixed(1),
      Math.round(power.totalWatts).toString(),
      power.amps.toFixed(1),
    ]);
  }

  rows.push([
    `TOTAL (${screens.length} screens)`,
    `${totPanels} panels`,
    "",
    `${totPixels.toLocaleString()} px`,
    totArea.toFixed(2),
    totWeight.toFixed(1),
    Math.round(totWatts).toString(),
    "",
  ]);

  drawTable(
    pdf,
    x,
    y,
    width,
    headers,
    rows,
    [3, 3, 2, 2.5, 1.5, 1.8, 1.8, 1.5],
    "Technical summary",
    pageH - margin,
    (p, px) => {
      drawHeader(p, "Technical summary", pageW, margin, logoDataUrl);
      drawSubLine(p, input, px, 26, pageW - margin * 2);
      return 32;
    },
  );
}

function drawCableSummary(
  pdf: JsPDF,
  screens: LedScreen[],
  panels: LedPanel[],
  x: number,
  y: number,
  width: number,
  input: LedProjectPdfInput,
  pageW: number,
  pageH: number,
  margin: number,
  logoDataUrl: string,
) {
  const headers = [
    "Screen",
    "Signal jumpers (CAT)",
    `Signal length m (×${SIGNAL_CABLE_LENGTH_M})`,
    "TrueOne jumpers",
    `Power length m (×${POWER_TRUE1_CABLE_LENGTH_M})`,
    "Brackets",
  ];
  const rows: string[][] = [];
  let totSig = 0;
  let totSigM = 0;
  let totPwr = 0;
  let totPwrM = 0;

  for (const s of screens) {
    const bom = computeScreenCableBOM(s, panels);
    totSig += bom.signalCables;
    totSigM += bom.signalLengthM;
    totPwr += bom.powerCables;
    totPwrM += bom.powerLengthM;
    const brackets =
      bom.brackets.length > 0
        ? bom.brackets.map((b) => `${b.count}× ${b.name}`).join(", ")
        : "—";
    rows.push([
      s.name || "(unnamed)",
      String(bom.signalCables),
      bom.signalLengthM.toFixed(1),
      String(bom.powerCables),
      bom.powerLengthM.toFixed(1),
      brackets,
    ]);
  }

  rows.push([
    "TOTAL",
    String(totSig),
    totSigM.toFixed(1),
    String(totPwr),
    totPwrM.toFixed(1),
    "",
  ]);

  const endY = drawTable(
    pdf,
    x,
    y,
    width,
    headers,
    rows,
    [3, 2, 2.5, 2, 2.5, 4],
    "Cable summary",
    pageH - margin - 12, // Reserve space for the footnote at page bottom.
    (p, px) => {
      drawHeader(p, "Cable summary", pageW, margin, logoDataUrl);
      drawSubLine(p, input, px, 26, pageW - margin * 2);
      return 32;
    },
  );

  // Footnote — placed below the (possibly paginated) table.
  pdf.setFont("helvetica", "italic");
  pdf.setFontSize(8);
  pdf.setTextColor(110, 110, 110);
  pdf.text(
    `Counts cabinet-to-cabinet jumpers only; per-screen feed from the processor / distro is out of scope. Standard lengths: signal ${SIGNAL_CABLE_LENGTH_M} m, TrueOne ${POWER_TRUE1_CABLE_LENGTH_M} m.`,
    x,
    endY + 6,
    { maxWidth: width },
  );
}
