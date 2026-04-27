import {
  colLabel,
  computeScreenMetrics,
  resolveScreenPanel,
  type LedPanel,
  type LedScreen,
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

  // Panel cells — alternate columns dark/light to match reference image.
  for (let cy = 0; cy < screen.panelsTall; cy++) {
    for (let cx = 0; cx < screen.panelsWide; cx++) {
      const x = cx * cellW;
      const y = cy * cellH;
      const fill = cx % 2 === 0 ? COLOR_PANEL_DARK : COLOR_PANEL_LIGHT;
      parts.push(
        `<rect x="${x}" y="${y}" width="${cellW}" height="${cellH}" fill="${fill}"/>`,
      );
    }
  }

  // Cell labels: "A,1" "B,1" … in the top-left corner of each panel.
  if (settings.showLabels) {
    const padX = Math.max(4, cellW * 0.04);
    const padY = Math.max(4, cellH * 0.04);
    for (let cy = 0; cy < screen.panelsTall; cy++) {
      for (let cx = 0; cx < screen.panelsWide; cx++) {
        const tx = cx * cellW + padX;
        const ty = cy * cellH + padY + labelFont * 0.85;
        const txt = `${colLabel(cx)},${cy + 1}`;
        parts.push(
          `<text x="${tx}" y="${ty}" font-family="${FONT_FAMILY}" font-size="${labelFont}" fill="${COLOR_LABEL}" font-weight="600">${escXml(txt)}</text>`,
        );
      }
    }
  }

  // Data-flow arrows.
  if (settings.showArrows) {
    const arrowSize = Math.max(6, Math.min(cellW, cellH) * 0.14);
    const stroke = Math.max(2, arrowSize * 0.18);
    // For each row, draw arrows between adjacent cells. Direction follows
    // wirePath: linear = always L→R; serpentine = alternates.
    for (let cy = 0; cy < screen.panelsTall; cy++) {
      const reversed =
        settings.wirePath === "serpentine" && cy % 2 === 1;
      const yMid = cy * cellH + cellH / 2;
      for (let cx = 0; cx < screen.panelsWide - 1; cx++) {
        const xJoin = (cx + 1) * cellW;
        const fromX = reversed ? xJoin + arrowSize * 1.2 : xJoin - arrowSize * 1.2;
        const toX = reversed ? xJoin - arrowSize * 1.2 : xJoin + arrowSize * 1.2;
        parts.push(arrowSvg(fromX, yMid, toX, yMid, arrowSize, stroke));
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
  if (settings.outputMode === "per-row") {
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

  // Screen name pill — centered.
  if (settings.showScreenName && screen.name.trim()) {
    const text = screen.name.trim();
    const padX = screenNameFont * 0.7;
    const padY = screenNameFont * 0.35;
    const approxTextW = text.length * screenNameFont * 0.55;
    const pillW = approxTextW + padX * 2;
    const pillH = screenNameFont + padY * 2;
    const px = (W - pillW) / 2;
    const py = (H - pillH) / 2;
    const radius = pillH * 0.18;
    parts.push(
      `<rect x="${px}" y="${py}" width="${pillW}" height="${pillH}" rx="${radius}" ry="${radius}" fill="#ffffff"/>`,
    );
    parts.push(
      `<text x="${W / 2}" y="${py + pillH / 2 + screenNameFont * 0.35}" text-anchor="middle" font-family="${FONT_FAMILY}" font-size="${screenNameFont}" fill="#1c1f24" font-weight="700">${escXml(text)}</text>`,
    );
  }

  // EHS logo — top-right corner. Embedded as data URL so the rasterizer
  // doesn't taint the canvas.
  if (settings.showLogo && logoDataUrl) {
    const logoH = Math.max(40, minDim * 0.08);
    // Logo aspect roughly 2.6:1 from inspection of the brand mark.
    const logoW = logoH * 2.6;
    const margin = Math.max(16, minDim * 0.018);
    parts.push(
      `<image href="${logoDataUrl}" x="${W - logoW - margin}" y="${margin}" width="${logoW}" height="${logoH}" preserveAspectRatio="xMidYMid meet"/>`,
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

function arrowSvg(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  size: number,
  stroke: number,
): string {
  const dir = x2 >= x1 ? 1 : -1;
  const headBackX = x2 - dir * size;
  const headHalf = size * 0.6;
  return [
    `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#0a0a0a" stroke-opacity="0.85" stroke-width="${stroke}"/>`,
    `<polygon points="${x2},${y2} ${headBackX},${y2 - headHalf} ${headBackX},${y2 + headHalf}" fill="#0a0a0a" fill-opacity="0.85"/>`,
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

/** End-to-end: build SVG, rasterize, download as PNG. */
export async function exportScreenAsPng(input: {
  screen: LedScreen;
  panels: LedPanel[];
  settings: LedSettings;
  logoDataUrl: string | null;
}): Promise<void> {
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
  const fname = `${safeFilename(input.screen.name)}_${m.pixelsX}x${m.pixelsY}.png`;
  downloadBlob(blob, fname);
}
