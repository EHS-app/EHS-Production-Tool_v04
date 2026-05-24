import {
  PILL_CHAR_W_RATIO,
  PILL_PAD_X_RATIO,
  PILL_PAD_Y_RATIO,
  clampNameScale,
  colLabel,
  rowLabel,
  computeScreenMetrics,
  panelCellColor,
  cellArrowDirection,
  disabledCellSet,
  isCellDisabled,
  resolveScreenPanel,
  type LedPanel,
  type LedPanelMarker,
  type LedScreen,
  type LedScreenMarker,
  type LedSettings,
} from "./led";

const ESC_RE = /[<>&"']/g;
const ESC_MAP: Record<string, string> = {
  "<": "&lt;",
  ">": "&gt;",
  "&": "&amp;",
  '"': "&quot;",
  "'": "&apos;",
};
const escXml = (s: string) => s.replace(ESC_RE, (c) => ESC_MAP[c]);

/** Browsers cap canvas dimensions; clamp the rasterized output so we never
 *  silently produce a blank blob on huge screens. The user still gets the
 *  full SVG download path; only the PNG is scaled. */
const MAX_PNG_DIM = 8192;

const FONT_FAMILY =
  "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";

const COLOR_BG = "#3a3f47";
const COLOR_PANEL_DARK = "#1f3b8a";
const COLOR_PANEL_LIGHT = "#5a8edc";
const COLOR_LABEL = "#ffffff";
const COLOR_OVERLAY = "#ffffff";
const COLOR_INFO_BG = "#1c1f24";
const COLOR_INFO_TEXT = "#f5f6f7";
const COLOR_OUTPUT_BG = "#ffffff";
const COLOR_OUTPUT_TEXT = "#1c1f24";

let cachedLogoDataUrl: string | null = null;
let cachedLogoPromise: Promise<string | null> | null = null;

/** Fetch the EHS logo and convert to a base64 data URL so it embeds inside
 *  the SVG (canvas tainting blocks export of cross-origin URLs). Cached. */
export async function getLogoDataUrl(logoUrl: string): Promise<string | null> {
  if (cachedLogoDataUrl) return cachedLogoDataUrl;
  if (cachedLogoPromise) return cachedLogoPromise;
  cachedLogoPromise = (async () => {
    try {
      const res = await fetch(logoUrl);
      if (!res.ok) return null;
      const blob = await res.blob();
      const dataUrl: string = await new Promise((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(String(r.result));
        r.onerror = () => reject(r.error);
        r.readAsDataURL(blob);
      });
      cachedLogoDataUrl = dataUrl;
      return dataUrl;
    } catch {
      return null;
    } finally {
      cachedLogoPromise = null;
    }
  })();
  return cachedLogoPromise;
}

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

function aspectRatio(w: number, h: number): string {
  const g = gcd(w, h) || 1;
  return `${w / g}:${h / g}`;
}

export type BuildSvgInput = {
  screen: LedScreen;
  panels: LedPanel[];
  settings: LedSettings;
  logoDataUrl: string | null;
};

/** Build a self-contained SVG string at the screen's native pixel resolution.
 *  This SVG is also what the PNG export rasterizes from. */
export function buildScreenSvg(input: BuildSvgInput): string {
  const { screen, panels, settings, logoDataUrl } = input;
  const panel = resolveScreenPanel(screen, panels);
  const m = computeScreenMetrics(screen, panels);

  const W = m.pixelsX;
  const H = m.pixelsY;
  const cellW = panel.pixelWidth;
  const cellH = panel.pixelHeight;
  const minDim = Math.min(W, H);

  // Font sizes scale with screen size but with sensible floors so they
  // remain legible on small screens too.
  const labelFont = clamp(Math.min(cellW, cellH) * 0.16, 12, 80);
  const outputFont = clamp(minDim * 0.04, 24, 140);
  const screenNameFont = clamp(minDim * 0.07, 36, 220);
  const infoFont = clamp(minDim * 0.022, 14, 64);

  const parts: string[] = [];
  parts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">`,
  );
  // Background
  parts.push(`<rect width="${W}" height="${H}" fill="${COLOR_BG}"/>`);

  // Panel cells — colors are picked via `panelCellColor()` so the on-
  // screen preview and the exported PNG always agree on the pattern
  // (checker by default; columns optional). Cabinets toggled OFF via
  // `disabledCells` (L / U / T / freeform shapes) render as a darker
  // "void" colour so the silhouette of the screen is visible to the
  // crew but it's obvious those positions aren't loaded.
  const dark = settings.panelColorDark || COLOR_PANEL_DARK;
  const light = settings.panelColorLight || COLOR_PANEL_LIGHT;
  const offCells = disabledCellSet(screen);
  for (let cy = 0; cy < screen.panelsTall; cy++) {
    for (let cx = 0; cx < screen.panelsWide; cx++) {
      const x = cx * cellW;
      const y = cy * cellH;
      if (isCellDisabled(offCells, cx, cy, screen.panelsWide)) {
        // Match the page background so the void reads as "no cabinet
        // here" — the gridlines below still draw on top so the cell
        // outline is visible.
        parts.push(
          `<rect x="${x}" y="${y}" width="${cellW}" height="${cellH}" fill="${COLOR_BG}"/>`,
        );
        continue;
      }
      const fill = panelCellColor(cx, cy, settings.panelPattern, dark, light);
      parts.push(
        `<rect x="${x}" y="${y}" width="${cellW}" height="${cellH}" fill="${fill}"/>`,
      );
    }
  }

  // Panel gridlines — drawn once as a single overlay (one line per interior
  // boundary plus the four outer edges) so each individual panel is visible
  // regardless of physical aspect ratio. This avoids the double-stroke
  // alpha-compounding that would happen if every cell rect got its own
  // outline. Width is clamped so it stays sensible at tiny custom panels
  // (1–4 px) and at very large pixel-pitch panels (e.g. 256+ px cells).
  const panelStroke = clamp(Math.min(cellW, cellH) * 0.012, 1, 4);
  const gridColor = "#0f172a";
  const gridOpacity = 0.55;
  for (let i = 0; i <= screen.panelsWide; i++) {
    const x = i * cellW;
    parts.push(
      `<line x1="${x}" y1="0" x2="${x}" y2="${H}" stroke="${gridColor}" stroke-width="${panelStroke}" stroke-opacity="${gridOpacity}"/>`,
    );
  }
  for (let i = 0; i <= screen.panelsTall; i++) {
    const y = i * cellH;
    parts.push(
      `<line x1="0" y1="${y}" x2="${W}" y2="${y}" stroke="${gridColor}" stroke-width="${panelStroke}" stroke-opacity="${gridOpacity}"/>`,
    );
  }

  // Cell labels: "A,1" "B,1" … in the top-left corner of each panel.
  // Skipped on disabled cells — no point labelling a void.
  if (settings.showLabels) {
    const padX = Math.max(4, cellW * 0.04);
    const padY = Math.max(4, cellH * 0.04);
    for (let cy = 0; cy < screen.panelsTall; cy++) {
      for (let cx = 0; cx < screen.panelsWide; cx++) {
        if (isCellDisabled(offCells, cx, cy, screen.panelsWide)) continue;
        const tx = cx * cellW + padX;
        const ty = cy * cellH + padY + labelFont * 0.85;
        const txt = `${cx + 1}.${rowLabel(cy)}`;
        const labelFill = screen.labelColor || COLOR_LABEL;
        parts.push(
          `<text x="${tx}" y="${ty}" font-family="${FONT_FAMILY}" font-size="${labelFont}" fill="${labelFill}" font-weight="600">${escXml(txt)}</text>`,
        );
      }
    }
  }

  // Per-cell data-flow arrows. Direction is decided centrally in
  // `cellArrowDirection()` so the on-screen preview and this PNG export
  // can never disagree. Each arrow sits in the centre of its cell.
  // Disabled cells get no arrow, AND any arrow whose target neighbour
  // is disabled is suppressed too — otherwise the data-flow visual
  // appears to point into a void.
  if (settings.showArrows) {
    const arrowSize = Math.max(8, Math.min(cellW, cellH) * 0.32);
    const stroke = Math.max(2, arrowSize * 0.16);
    for (let cy = 0; cy < screen.panelsTall; cy++) {
      for (let cx = 0; cx < screen.panelsWide; cx++) {
        if (isCellDisabled(offCells, cx, cy, screen.panelsWide)) continue;
        const dir = cellArrowDirection(
          cx,
          cy,
          screen.panelsWide,
          screen.panelsTall,
          settings.wirePath,
        );
        if (!dir) continue;
        // Compute the neighbour the arrow points to; if it's disabled
        // (or out of bounds), skip the arrow.
        const nx =
          dir === "right" ? cx + 1 : dir === "left" ? cx - 1 : cx;
        const ny =
          dir === "down" ? cy + 1 : dir === "up" ? cy - 1 : cy;
        if (
          nx < 0 ||
          nx >= screen.panelsWide ||
          ny < 0 ||
          ny >= screen.panelsTall ||
          isCellDisabled(offCells, nx, ny, screen.panelsWide)
        ) {
          continue;
        }
        const midX = cx * cellW + cellW / 2;
        const midY = cy * cellH + cellH / 2;
        parts.push(cellArrowSvg(midX, midY, arrowSize, stroke, dir));
      }
    }
  }

  // Test-pattern overlay: large white circle + dashed corner X.
  if (settings.showTestPattern) {
    const cx = W / 2;
    const cy = H / 2;
    const r = Math.min(W, H) / 2 - Math.min(W, H) * 0.04;
    const stroke = Math.max(2, minDim * 0.004);
    parts.push(
      `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${COLOR_OVERLAY}" stroke-opacity="0.7" stroke-width="${stroke}"/>`,
    );
    const dash = stroke * 6;
    parts.push(
      `<line x1="0" y1="0" x2="${W}" y2="${H}" stroke="${COLOR_OVERLAY}" stroke-opacity="0.5" stroke-width="${stroke}" stroke-dasharray="${dash} ${dash}"/>`,
    );
    parts.push(
      `<line x1="${W}" y1="0" x2="0" y2="${H}" stroke="${COLOR_OVERLAY}" stroke-opacity="0.5" stroke-width="${stroke}" stroke-dasharray="${dash} ${dash}"/>`,
    );
  }

  // Output number circles.
  if (settings.wirePath === "column-serpentine") {
    // One circle per pair of columns, sitting just inside the top edge.
    // White fill, dark border to match a typical processor build sheet.
    const pairs = Math.ceil(screen.panelsWide / 2);
    const r = Math.min(cellW * 0.45, minDim * 0.05);
    const margin = Math.max(r * 0.4, minDim * 0.012);
    const startIndex = screen.outputIndex ?? 1;
    for (let p = 0; p < pairs; p++) {
      const col0 = p * 2;
      const col1 = Math.min(col0 + 1, screen.panelsWide - 1);
      const cxPx = ((col0 + col1 + 1) * cellW) / 2;
      const cyPx = margin + r;
      parts.push(
        outputBadgeSvg(
          cxPx,
          cyPx,
          r,
          String(startIndex + p),
          Math.min(outputFont, r * 1.1),
        ),
      );
    }
  } else if (settings.outputMode === "per-row") {
    // One circle per row, centered vertically in the row, sitting at the
    // left edge just inside the screen.
    const r = Math.min(cellH * 0.32, minDim * 0.035);
    const margin = Math.max(r * 0.6, minDim * 0.012);
    for (let cy = 0; cy < screen.panelsTall; cy++) {
      const cyPx = cy * cellH + cellH / 2;
      const cxPx = margin + r;
      parts.push(
        outputBadgeSvg(cxPx, cyPx, r, String(cy + 1), Math.min(outputFont, r * 1.1)),
      );
    }
  } else if (screen.outputIndex != null) {
    // Single circle in the top-left of the screen.
    const r = Math.min(cellH, minDim * 0.06);
    const margin = Math.max(r * 0.4, minDim * 0.015);
    parts.push(
      outputBadgeSvg(
        margin + r,
        margin + r,
        r,
        String(screen.outputIndex),
        Math.min(outputFont, r * 1.1),
      ),
    );
  }

  // Screen name pill — centered. Per-screen `nameScale` lets the
  // producer tune the pill independently of the dynamic floor (e.g.
  // shrink it on a long IMAG name, blow it up for a stage backdrop).
  if (settings.showScreenName && screen.name.trim()) {
    const text = screen.name.trim();
    const scaledFont = screenNameFont * clampNameScale(screen.nameScale);
    const padX = scaledFont * PILL_PAD_X_RATIO;
    const padY = scaledFont * PILL_PAD_Y_RATIO;
    const approxTextW = text.length * scaledFont * PILL_CHAR_W_RATIO;
    const pillW = approxTextW + padX * 2;
    const pillH = scaledFont + padY * 2;
    const px = (W - pillW) / 2;
    const py = (H - pillH) / 2;
    const radius = pillH * 0.18;
    parts.push(
      `<rect x="${px}" y="${py}" width="${pillW}" height="${pillH}" rx="${radius}" ry="${radius}" fill="#ffffff"/>`,
    );
    parts.push(
      `<text x="${W / 2}" y="${py + pillH / 2 + scaledFont * 0.35}" text-anchor="middle" font-family="${FONT_FAMILY}" font-size="${scaledFont}" fill="#1c1f24" font-weight="700">${escXml(text)}</text>`,
    );
  }

  // Producer-drawn power / signal markers — drawn last so they sit on
  // top of every other overlay (test pattern, info bar, even the name
  // pill if a marker happens to land there). Mirrors the on-screen
  // preview, so the PNG and the live visual look identical.
  const markers = screen.markers ?? [];
  if (markers.length > 0) {
    const markerR = clamp(minDim * 0.04, 28, 160);
    for (const mk of markers) {
      const cx = clamp(mk.x, 0, 1) * W;
      const cy = clamp(mk.y, 0, 1) * H;
      parts.push(buildMarkerSvg(cx, cy, markerR, mk));
    }
  }

  // Panel-anchored markers — pinned to a specific (col, row) cabinet.
  // Drawn smaller than the free-coord markers and positioned in the
  // top-left of the cell so they read as a "wire enters here" sticker
  // on the cabinet, not as a free-floating overlay. Skipped on
  // disabled cells (the cabinet isn't there).
  const panelMarkers = screen.panelMarkers ?? [];
  if (panelMarkers.length > 0) {
    const pmR = clamp(Math.min(cellW, cellH) * 0.22, 14, 96);
    const inset = pmR * 1.1;
    for (const pm of panelMarkers) {
      if (
        pm.col < 0 ||
        pm.col >= screen.panelsWide ||
        pm.row < 0 ||
        pm.row >= screen.panelsTall
      ) {
        continue;
      }
      if (isCellDisabled(offCells, pm.col, pm.row, screen.panelsWide)) {
        continue;
      }
      const cx = pm.col * cellW + inset;
      const cy = pm.row * cellH + inset;
      parts.push(
        buildMarkerSvg(cx, cy, pmR, {
          // Re-use the same renderer as free-coord markers; only the
          // (kind, index) fields are read.
          id: pm.id,
          kind: pm.kind,
          index: pm.index,
          x: 0,
          y: 0,
        }),
      );
    }
  }

  // Logo — user-uploaded custom logo if set, else the built-in EHS
  // mark. Position is drag-controlled via settings.logoX/Y (normalised
  // 0..1 to this screen rect). If unset, falls back to the legacy
  // top-right anchor. Size is multiplied by settings.logoScale.
  const effectiveLogoUrl = settings.customLogoUrl ?? logoDataUrl;
  if (settings.showLogo && effectiveLogoUrl) {
    const aspect =
      settings.customLogoUrl && settings.customLogoAspect
        ? settings.customLogoAspect
        : 2.6;
    const scale = settings.logoScale ?? 1;
    const logoH = Math.max(40, minDim * 0.08) * scale;
    const logoW = logoH * aspect;
    const margin = Math.max(16, minDim * 0.018);
    // Clamp persisted normalised coords so the logo can never render
    // off-canvas if the user resized it after dragging (matches the
    // live canvas clamp in ScreenSvg).
    const maxX = Math.max(0, 1 - logoW / W);
    const maxY = Math.max(0, 1 - logoH / H);
    const lx =
      typeof settings.logoX === "number"
        ? Math.min(maxX, Math.max(0, settings.logoX)) * W
        : W - logoW - margin;
    const ly =
      typeof settings.logoY === "number"
        ? Math.min(maxY, Math.max(0, settings.logoY)) * H
        : margin;
    parts.push(
      `<image href="${effectiveLogoUrl}" x="${lx}" y="${ly}" width="${logoW}" height="${logoH}" preserveAspectRatio="xMidYMid meet"/>`,
    );
  }

  // Info bar — bottom centered.
  if (settings.showInfoBar) {
    const text = `Panel Count: ${screen.panelsWide} wide × ${screen.panelsTall} high  •  ${m.panels} panels total  •  Resolution: ${W} × ${H} px  •  Aspect Ratio: ${aspectRatio(W, H)}`;
    const padX = infoFont * 1.2;
    const padY = infoFont * 0.45;
    const approxTextW = text.length * infoFont * 0.5;
    const barW = Math.min(W * 0.96, approxTextW + padX * 2);
    const barH = infoFont + padY * 2;
    const bx = (W - barW) / 2;
    const by = H - barH - Math.max(16, minDim * 0.02);
    const radius = barH * 0.22;
    parts.push(
      `<rect x="${bx}" y="${by}" width="${barW}" height="${barH}" rx="${radius}" ry="${radius}" fill="${COLOR_INFO_BG}" fill-opacity="0.92"/>`,
    );
    parts.push(
      `<text x="${W / 2}" y="${by + barH / 2 + infoFont * 0.35}" text-anchor="middle" font-family="${FONT_FAMILY}" font-size="${infoFont}" fill="${COLOR_INFO_TEXT}" font-weight="500">${escXml(text)}</text>`,
    );
  }

  parts.push(`</svg>`);
  return parts.join("");
}

/** Draw a single arrow centred at (cx, cy), pointing in the given
 *  direction. Mirror of `<CellArrow>` in LedScreenReportView so the PNG
 *  export and the on-screen preview look identical. */
function cellArrowSvg(
  cx: number,
  cy: number,
  size: number,
  stroke: number,
  dir: "right" | "left" | "up" | "down",
): string {
  const half = size / 2;
  const head = size * 0.55;
  let x1 = cx;
  let y1 = cy;
  let x2 = cx;
  let y2 = cy;
  let p1x = 0;
  let p1y = 0;
  let p2x = 0;
  let p2y = 0;
  if (dir === "right") {
    x1 = cx - half;
    x2 = cx + half;
    y1 = y2 = cy;
    p1x = x2 - head;
    p1y = cy - head * 0.6;
    p2x = x2 - head;
    p2y = cy + head * 0.6;
  } else if (dir === "left") {
    x1 = cx + half;
    x2 = cx - half;
    y1 = y2 = cy;
    p1x = x2 + head;
    p1y = cy - head * 0.6;
    p2x = x2 + head;
    p2y = cy + head * 0.6;
  } else if (dir === "down") {
    y1 = cy - half;
    y2 = cy + half;
    x1 = x2 = cx;
    p1x = cx - head * 0.6;
    p1y = y2 - head;
    p2x = cx + head * 0.6;
    p2y = y2 - head;
  } else {
    // up
    y1 = cy + half;
    y2 = cy - half;
    x1 = x2 = cx;
    p1x = cx - head * 0.6;
    p1y = y2 + head;
    p2x = cx + head * 0.6;
    p2y = y2 + head;
  }
  return [
    `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#0a0a0a" stroke-opacity="0.9" stroke-width="${stroke}" stroke-linecap="round"/>`,
    `<polygon points="${x2},${y2} ${p1x},${p1y} ${p2x},${p2y}" fill="#0a0a0a" fill-opacity="0.9"/>`,
  ].join("");
}

/** Filled disc + white border + label ("P1", "S2"…). The fill colour
 *  signals the cable kind: red-orange for power, indigo for signal —
 *  the same palette as the on-screen preview so the crew can recognise
 *  the symbols across both. */
function buildMarkerSvg(
  cx: number,
  cy: number,
  r: number,
  mk: LedScreenMarker,
): string {
  const fill = mk.kind === "power" ? "#dc2626" : "#2563eb";
  const stroke = "#ffffff";
  const strokeW = Math.max(2, r * 0.14);
  const fontSize = r * 1.05;
  const label = `${mk.kind === "power" ? "P" : "S"}${mk.index}`;
  return [
    // Drop-shadow so the dot remains visible against bright cabinet
    // colours (yellow, white test pattern, etc).
    `<circle cx="${cx + strokeW * 0.4}" cy="${cy + strokeW * 0.4}" r="${r}" fill="#000" fill-opacity="0.35"/>`,
    `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeW}"/>`,
    `<text x="${cx}" y="${cy + fontSize * 0.35}" text-anchor="middle" font-family="${FONT_FAMILY}" font-size="${fontSize}" font-weight="700" fill="#ffffff">${escXml(label)}</text>`,
  ].join("");
}

function outputBadgeSvg(
  cx: number,
  cy: number,
  r: number,
  label: string,
  fontSize: number,
): string {
  const stroke = Math.max(1.5, r * 0.06);
  return [
    `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${COLOR_OUTPUT_BG}" stroke="${COLOR_OUTPUT_TEXT}" stroke-width="${stroke}"/>`,
    `<text x="${cx}" y="${cy + fontSize * 0.35}" text-anchor="middle" font-family="${FONT_FAMILY}" font-size="${fontSize}" fill="${COLOR_OUTPUT_TEXT}" font-weight="700">${escXml(label)}</text>`,
  ].join("");
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

/** Rasterize an SVG string to a PNG blob at the given pixel size. */
export async function rasterizeSvgToPng(
  svgString: string,
  pixelW: number,
  pixelH: number,
): Promise<Blob> {
  // Cap output size while preserving aspect ratio.
  const scale = Math.min(
    1,
    MAX_PNG_DIM / Math.max(pixelW, pixelH),
  );
  const outW = Math.max(1, Math.round(pixelW * scale));
  const outH = Math.max(1, Math.round(pixelH * scale));

  const blob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  try {
    const img = await loadImage(url);
    const canvas = document.createElement("canvas");
    canvas.width = outW;
    canvas.height = outH;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("2D context not available");
    ctx.drawImage(img, 0, 0, outW, outH);
    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error("toBlob returned null"))),
        "image/png",
      );
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to load SVG image"));
    img.src = src;
  });
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Slight delay before revoke so the download has time to start.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function safeFilename(name: string, fallback = "screen"): string {
  const cleaned = name
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return cleaned || fallback;
}

export type RenderScreenPng = {
  blob: Blob;
  fileName: string;
  sizeBytes: number;
};

/** Build SVG → rasterize → return the PNG blob (and a suggested
 *  filename) without triggering a download. The brief-share flow uses
 *  this to upload the diagram straight to object storage; the in-app
 *  "PNG" button uses it via `exportScreenAsPng` to download. */
export async function renderScreenPngBlob(input: {
  screen: LedScreen;
  panels: LedPanel[];
  settings: LedSettings;
  logoDataUrl: string | null;
}): Promise<RenderScreenPng> {
  // Per-screen colour overrides (set via the row colour-pickers in the
  // LED tab) take precedence over the global Export-options colours, so
  // the exported PNG matches what the producer sees on the canvas.
  const mergedSettings: LedSettings = {
    ...input.settings,
    panelColorDark:
      input.screen.panelColorDark ?? input.settings.panelColorDark,
    panelColorLight:
      input.screen.panelColorLight ?? input.settings.panelColorLight,
  };
  input = { ...input, settings: mergedSettings };
  const m = computeScreenMetrics(input.screen, input.panels);
  if (
    !Number.isFinite(m.pixelsX) ||
    !Number.isFinite(m.pixelsY) ||
    m.pixelsX <= 0 ||
    m.pixelsY <= 0 ||
    input.screen.panelsWide <= 0 ||
    input.screen.panelsTall <= 0
  ) {
    throw new Error(
      "Cannot export: this screen has no panels or zero pixel dimensions. Set the panel grid first.",
    );
  }
  const svg = buildScreenSvg(input);
  const blob = await rasterizeSvgToPng(svg, m.pixelsX, m.pixelsY);
  const fileName = `${safeFilename(input.screen.name)}_${m.pixelsX}x${m.pixelsY}.png`;
  return { blob, fileName, sizeBytes: blob.size };
}

/** End-to-end: build SVG, rasterize, download as PNG. */
export async function exportScreenAsPng(input: {
  screen: LedScreen;
  panels: LedPanel[];
  settings: LedSettings;
  logoDataUrl: string | null;
}): Promise<void> {
  const { blob, fileName } = await renderScreenPngBlob(input);
  downloadBlob(blob, fileName);
}
