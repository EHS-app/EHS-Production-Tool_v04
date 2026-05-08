import {
  CONNECTOR_SIDES,
  STAGE_DECKS,
  STAGE_LEGS,
  computeStage,
  effectiveConnectorSide,
  nivtecBracingNote,
  type ConnectorSide,
  type Stage,
  type StageDeckKey,
} from "./stage";

/** Human label for a male-connector compass side (matches the on-screen
 *  dropdown in StageReportView). */
const CONNECTOR_LABEL: Record<ConnectorSide, string> = {
  N: "Upstage (back)",
  E: "Stage right",
  S: "Downstage (front)",
  W: "Stage left",
};

/** Compact compass label used in tables and badges. */
const CONNECTOR_SHORT: Record<ConnectorSide, string> = {
  N: "↑ Up",
  E: "→ SR",
  S: "↓ Down",
  W: "← SL",
};

/** EHS orange — male connector edge stripe. Matches StageReportView. */
const MALE_EDGE_COLOR = "#f88000";

type StageCalc = ReturnType<typeof computeStage>;

const DECK_FILL: Record<StageDeckKey, string> = {
  "2x1": "#1f3b8a",
  "1x1": "#5a8edc",
  "0.5x2": "#10b981",
  "0.5x1": "#f59e0b",
};

const DECK_LABEL: Record<StageDeckKey, string> = {
  "2x1": "2 × 1",
  "1x1": "1 × 1",
  "0.5x2": "0.5 × 2",
  "0.5x1": "0.5 × 1",
};

const fmt = (n: number, d = 1) =>
  n.toLocaleString("en-US", { maximumFractionDigits: d });

const escapeHtml = (s: string): string =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

/** Build a static, top-down SVG of the stage layout — same colours and
 *  geometry as StageSvg but with no interactivity, hover preview, or
 *  click-catcher cells. Includes deck colour fills, deck labels, leg
 *  dots (shared or per-deck), rails, and dimension labels along the
 *  edges. The SVG is sized to roughly fit on an A4 portrait page. */
function buildStageSvg(stage: Stage, calc: StageCalc): string {
  const PAD = 32;
  const MAX = 720;
  const HALF_M = 0.5;
  const LABEL = 22;

  // For the visual the canvas matches the effective stage rectangle:
  //  - auto mode → the entered W × D (the tiler may leave 0.5 m gaps in
  //    the corners; we still draw the full requested rectangle).
  //  - manual mode → the bounding box of placed decks. Falls back to
  //    the entered W × D if nothing has been placed yet so the page
  //    still renders something readable.
  let canvasW = stage.width;
  let canvasD = stage.depth;
  if (stage.editMode === "manual" && calc.decks.length > 0) {
    let maxX = 0;
    let maxY = 0;
    for (const p of calc.decks) {
      if (p.x + p.w > maxX) maxX = p.x + p.w;
      if (p.y + p.d > maxY) maxY = p.y + p.d;
    }
    canvasW = maxX;
    canvasD = maxY;
  }
  canvasW = Math.max(canvasW, 0.5);
  canvasD = Math.max(canvasD, 0.5);

  const scale = Math.min(MAX / canvasW, MAX / canvasD);
  const W = canvasW * scale + PAD * 2 + LABEL;
  const H = canvasD * scale + PAD * 2 + LABEL;

  const parts: string[] = [];

  // Background canvas (the stage outline).
  parts.push(
    `<rect x="${PAD + LABEL}" y="${PAD}" width="${canvasW * scale}" height="${
      canvasD * scale
    }" fill="#0f172a" fill-opacity="0.04" stroke="#0f172a" stroke-opacity="0.25" stroke-width="1.5" />`,
  );

  // Half-metre grid lines.
  const cellsW = Math.round(canvasW / HALF_M);
  const cellsD = Math.round(canvasD / HALF_M);
  for (let cx = 1; cx < cellsW; cx++) {
    const x = PAD + LABEL + cx * HALF_M * scale;
    parts.push(
      `<line x1="${x}" y1="${PAD}" x2="${x}" y2="${
        PAD + canvasD * scale
      }" stroke="#0f172a" stroke-opacity="${cx % 2 === 0 ? 0.18 : 0.08}" stroke-width="${cx % 2 === 0 ? 1 : 0.5}" />`,
    );
  }
  for (let cy = 1; cy < cellsD; cy++) {
    const y = PAD + cy * HALF_M * scale;
    parts.push(
      `<line x1="${PAD + LABEL}" y1="${y}" x2="${
        PAD + LABEL + canvasW * scale
      }" y2="${y}" stroke="#0f172a" stroke-opacity="${cy % 2 === 0 ? 0.18 : 0.08}" stroke-width="${cy % 2 === 0 ? 1 : 0.5}" />`,
    );
  }

  // Deck rectangles + size labels + assembly badges. Layout matches
  // the on-screen StageSvg view: a white-circle badge with the build
  // sequence number sits ABOVE the size label, and a "+N legs"
  // caption sits below — all centred horizontally on the deck.
  for (let i = 0; i < calc.decks.length; i++) {
    const p = calc.decks[i];
    const asm = calc.assembly[i];
    const dx = PAD + LABEL + p.x * scale;
    const dy = PAD + p.y * scale;
    const dw = p.w * scale;
    const dh = p.d * scale;
    const cxDeck = dx + dw / 2;
    const cyDeck = dy + dh / 2;
    parts.push(
      `<rect x="${dx}" y="${dy}" width="${dw}" height="${dh}" fill="${DECK_FILL[p.key]}" fill-opacity="0.7" stroke="#0f172a" stroke-opacity="0.7" stroke-width="1" />`,
    );
    const sizeFont = Math.min(dw, dh) * 0.22;
    const showSize = dw >= 32 && dh >= 22;
    if (showSize) {
      parts.push(
        `<text x="${cxDeck}" y="${cyDeck}" text-anchor="middle" dominant-baseline="central" font-size="${sizeFont}" font-family="system-ui, sans-serif" fill="#fff" font-weight="600">${DECK_LABEL[p.key]}</text>`,
      );
    }
    if (asm) {
      const badgeRadius = Math.max(8, Math.min(13, Math.min(dw, dh) * 0.16));
      const badgeCy = showSize
        ? cyDeck - sizeFont * 0.55 - badgeRadius - 2
        : cyDeck;
      const captionFont = Math.max(9, badgeRadius * 0.95);
      const captionY = cyDeck + sizeFont * 0.55 + captionFont * 0.9 + 2;
      const stackHeight =
        badgeRadius * 2 + (showSize ? sizeFont : 0) + captionFont + 12;
      const showCaption = showSize && dh >= stackHeight && dw >= 56;
      parts.push(
        `<circle cx="${cxDeck}" cy="${badgeCy}" r="${badgeRadius}" fill="#fff" stroke="#0f172a" stroke-width="1.25" />`,
        `<text x="${cxDeck}" y="${badgeCy}" text-anchor="middle" dominant-baseline="central" font-size="${badgeRadius * 1.15}" font-family="system-ui, sans-serif" fill="#0f172a" font-weight="700">${asm.sequence}</text>`,
      );
      if (showCaption) {
        parts.push(
          `<text x="${cxDeck}" y="${captionY}" text-anchor="middle" dominant-baseline="central" font-size="${captionFont}" font-family="system-ui, sans-serif" fill="#fff" font-weight="600">+${asm.legsAdded} ${asm.legsAdded === 1 ? "leg" : "legs"}</text>`,
        );
      }
    }
  }

  // Male-connector edge stripes — one thin orange band along the side
  // of each deck where the male pins face. Matches the on-screen view.
  const STRIPE_PX = 5;
  for (const p of calc.decks) {
    const primary = effectiveConnectorSide(stage, p);
    // Per Nivtec's "tongue rear AND right" rule each deck has TWO male
    // edges 90° apart, clockwise from the primary.
    const adjacent =
      CONNECTOR_SIDES[
        (CONNECTOR_SIDES.indexOf(primary) + 1) % CONNECTOR_SIDES.length
      ];
    const dx = PAD + LABEL + p.x * scale;
    const dy = PAD + p.y * scale;
    const dw = p.w * scale;
    const dh = p.d * scale;
    for (const side of [primary, adjacent]) {
      let rx = dx;
      let ry = dy;
      let rw = dw;
      let rh = dh;
      if (side === "N") {
        rh = STRIPE_PX;
      } else if (side === "S") {
        ry = dy + dh - STRIPE_PX;
        rh = STRIPE_PX;
      } else if (side === "E") {
        rx = dx + dw - STRIPE_PX;
        rw = STRIPE_PX;
      } else {
        rw = STRIPE_PX;
      }
      parts.push(
        `<rect x="${rx}" y="${ry}" width="${rw}" height="${rh}" fill="${MALE_EDGE_COLOR}" fill-opacity="0.9" />`,
      );
    }
  }

  // Leg dots.
  if (stage.legMode === "perDeck") {
    for (const p of calc.decks) {
      const inset = Math.min(p.w, p.d) * 0.12 * scale;
      const x1 = PAD + LABEL + p.x * scale + inset;
      const y1 = PAD + p.y * scale + inset;
      const x2 = PAD + LABEL + (p.x + p.w) * scale - inset;
      const y2 = PAD + (p.y + p.d) * scale - inset;
      parts.push(
        `<circle cx="${x1}" cy="${y1}" r="3" fill="#0f172a" />`,
        `<circle cx="${x2}" cy="${y1}" r="3" fill="#0f172a" />`,
        `<circle cx="${x1}" cy="${y2}" r="3" fill="#0f172a" />`,
        `<circle cx="${x2}" cy="${y2}" r="3" fill="#0f172a" />`,
      );
    }
  } else {
    for (const lp of calc.legPositions) {
      // Find any deck that owns this corner so we can offset the dot
      // slightly inward (matches the on-screen rendering).
      const owner = calc.decks.find(
        (p) =>
          (Math.abs(lp.x - p.x) < 1e-6 || Math.abs(lp.x - (p.x + p.w)) < 1e-6) &&
          (Math.abs(lp.y - p.y) < 1e-6 || Math.abs(lp.y - (p.y + p.d)) < 1e-6),
      );
      if (!owner) continue;
      const inset = Math.min(owner.w, owner.d) * 0.12;
      const cxIn = Math.abs(lp.x - owner.x) < 1e-6 ? lp.x + inset : lp.x - inset;
      const cyIn = Math.abs(lp.y - owner.y) < 1e-6 ? lp.y + inset : lp.y - inset;
      parts.push(
        `<circle cx="${PAD + LABEL + cxIn * scale}" cy="${PAD + cyIn * scale}" r="3" fill="#0f172a" />`,
      );
    }
  }

  // Rails: drawn as thick red lines along whichever sides are enabled.
  // The rail length per side is the full effective stage extent on that
  // axis, so we draw across the bounding box.
  if (stage.rails.front || stage.rails.back || stage.rails.left || stage.rails.right) {
    const left = PAD + LABEL;
    const right = PAD + LABEL + canvasW * scale;
    const top = PAD;
    const bot = PAD + canvasD * scale;
    // Rails follow the same convention as the on-screen StageSvg:
    //   front → bottom edge,  back → top edge.
    if (stage.rails.front) {
      parts.push(
        `<line x1="${left}" y1="${bot}" x2="${right}" y2="${bot}" stroke="#dc2626" stroke-width="4" />`,
      );
    }
    if (stage.rails.back) {
      parts.push(
        `<line x1="${left}" y1="${top}" x2="${right}" y2="${top}" stroke="#dc2626" stroke-width="4" />`,
      );
    }
    if (stage.rails.left) {
      parts.push(
        `<line x1="${left}" y1="${top}" x2="${left}" y2="${bot}" stroke="#dc2626" stroke-width="4" />`,
      );
    }
    if (stage.rails.right) {
      parts.push(
        `<line x1="${right}" y1="${top}" x2="${right}" y2="${bot}" stroke="#dc2626" stroke-width="4" />`,
      );
    }
  }

  // Dimension labels: width across the top, depth along the left side.
  parts.push(
    `<text x="${PAD + LABEL + (canvasW * scale) / 2}" y="${PAD - 8}" text-anchor="middle" font-size="13" font-family="system-ui, sans-serif" fill="#0f172a" font-weight="600">${fmt(canvasW, 2)} m</text>`,
  );
  parts.push(
    `<text x="${PAD + LABEL - 8}" y="${PAD + (canvasD * scale) / 2}" text-anchor="middle" font-size="13" font-family="system-ui, sans-serif" fill="#0f172a" font-weight="600" transform="rotate(-90 ${PAD + LABEL - 8} ${PAD + (canvasD * scale) / 2})">${fmt(canvasD, 2)} m</text>`,
  );

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="100%" style="max-width:${W}px;height:auto;display:block">${parts.join(
    "",
  )}</svg>`;
}

/** Project metadata that appears in the header of the export. */
export type StageExportProject = {
  venue: string;
  date: string;
  /** Optional ISO end date (YYYY-MM-DD) for multi-day shows. When set,
   *  the export header shows the date as a "from → to" range. */
  endDate?: string;
  preparedBy: string;
};

/** Build the standalone HTML document for a Stage Build Sheet. Returned
 *  as a string so callers can either (a) render it into a popup window
 *  for printing, or (b) hand it to `downloadHtmlAsPdf` for a direct
 *  PDF download with no print dialog.
 *
 *  Includes everything the build crew needs: project meta, top-down
 *  stage visual, deck list, leg list, rails, load capacity, bracing
 *  requirements, and notes. */
export function buildStageReportHtml(input: {
  stage: Stage;
  calc: StageCalc;
  project: StageExportProject;
  logoDataUrl: string | null;
}): string {
  const { stage, calc, project, logoDataUrl } = input;
  const usedDecks = STAGE_DECKS.filter((d) => calc.deckCounts[d.key] > 0);
  const legSpec = STAGE_LEGS.find((l) => l.heightCm === stage.legHeightCm);
  const bracing = nivtecBracingNote(stage.legHeightCm);
  const stageName = stage.name.trim() || "Untitled stage";
  const generatedAt = new Date().toLocaleString();
  const svg = buildStageSvg(stage, calc);

  // Effective stage size: in auto mode it's the entered W × D; in manual
  // mode it's the bounding box of the placed decks.
  let effectiveW = stage.width;
  let effectiveD = stage.depth;
  if (stage.editMode === "manual") {
    effectiveW = 0;
    effectiveD = 0;
    for (const p of calc.decks) {
      if (p.x + p.w > effectiveW) effectiveW = p.x + p.w;
      if (p.y + p.d > effectiveD) effectiveD = p.y + p.d;
    }
  }

  const railsRows =
    calc.railBreakdown.length === 0
      ? `<tr><td colspan="4" class="muted">— no handrails —</td></tr>`
      : calc.railBreakdown
          .map(
            (r) =>
              `<tr><td style="text-transform:capitalize">${r.side}</td><td>${fmt(r.lengthM, 1)} m</td><td>${r.count2m}</td><td>${r.count1m}</td></tr>`,
          )
          .join("") +
        `<tr class="row-total"><td>Subtotal</td><td>${fmt(calc.railLengthTotal, 1)} m</td><td>${calc.rails2mTotal}</td><td>${calc.rails1mTotal}</td></tr>` +
        `<tr><td colspan="3">Weight</td><td>${fmt(calc.railWeight, 1)} kg</td></tr>`;

  const decksRows =
    usedDecks.length === 0
      ? `<tr><td colspan="4" class="muted">— no decks placed —</td></tr>`
      : usedDecks
          .map(
            (d) =>
              `<tr><td>${d.label}</td><td>${calc.deckCounts[d.key]}</td><td>${fmt(d.weight, 1)} kg</td><td>${fmt(d.weight * calc.deckCounts[d.key], 1)} kg</td></tr>`,
          )
          .join("") +
        `<tr class="row-total"><td>Subtotal</td><td></td><td></td><td>${fmt(calc.deckWeight, 1)} kg</td></tr>`;

  // Build sequence: numbered, in the order the crew should assemble.
  // Mirrors the on-screen badges (1, 2, 3…) and shows how many legs
  // are added per deck so the build crew can pre-stage hardware.
  const assemblyRows =
    calc.assembly.length === 0
      ? `<tr><td colspan="4" class="muted">— no decks placed —</td></tr>`
      : calc.assembly
          .map((a) => {
            const deck = calc.decks[a.sequence - 1];
            const sizeLabel = deck ? DECK_LABEL[deck.key] : "—";
            const side = deck ? effectiveConnectorSide(stage, deck) : null;
            const isOverride = deck
              ? stage.connectorOverrides[
                  `${deck.x.toFixed(2)},${deck.y.toFixed(2)}`
                ] !== undefined
              : false;
            const sideCell = side
              ? `${CONNECTOR_SHORT[side]}${isOverride ? ' <span style="color:#b45309;font-weight:600">●</span>' : ""}`
              : "—";
            return `<tr><td><strong>${a.sequence}</strong></td><td>${sizeLabel}</td><td>${sideCell}</td><td>+${a.legsAdded} ${a.legsAdded === 1 ? "leg" : "legs"}</td></tr>`;
          })
          .join("") +
        `<tr class="row-total"><td>Total</td><td>${calc.decks.length} decks</td><td></td><td>${calc.legCount} legs</td></tr>`;

  const railsEnabled = (
    ["front", "back", "left", "right"] as const
  ).filter((side) => stage.rails[side]);

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>Stage Build Sheet — ${escapeHtml(stageName)}</title>
<style>
  *, *::before, *::after { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body {
    font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
    color: #0f172a;
    background: #fff;
    padding: 24px;
    font-size: 13px;
    line-height: 1.45;
  }
  h1 { font-size: 22px; margin: 0 0 4px; }
  h2 { font-size: 16px; margin: 18px 0 8px; padding-bottom: 4px; border-bottom: 1px solid #e2e8f0; }
  h3 { font-size: 13px; margin: 12px 0 6px; color: #475569; text-transform: uppercase; letter-spacing: 0.04em; }
  .header {
    display: flex; align-items: flex-start; justify-content: space-between;
    gap: 16px; padding-bottom: 16px; border-bottom: 2px solid #f88000;
    margin-bottom: 16px;
  }
  .header-left { display: flex; gap: 12px; align-items: center; }
  .logo { height: 48px; width: auto; }
  .brand { font-size: 13px; color: #64748b; }
  .brand strong { color: #0f172a; font-size: 15px; display: block; }
  .header-right { text-align: right; font-size: 12px; color: #64748b; }
  .meta-grid {
    display: grid; grid-template-columns: repeat(4, 1fr);
    gap: 12px 24px; margin-bottom: 16px;
  }
  .meta-item .label { font-size: 11px; color: #64748b; text-transform: uppercase; letter-spacing: 0.04em; }
  .meta-item .value { font-weight: 600; font-size: 14px; word-break: break-word; }
  .stage-visual {
    border: 1px solid #e2e8f0; border-radius: 6px; padding: 16px;
    background: #f8fafc; margin-bottom: 16px;
  }
  .legend {
    display: flex; flex-wrap: wrap; gap: 14px; margin-top: 10px;
    font-size: 11px; color: #475569;
  }
  .legend span { display: inline-flex; align-items: center; gap: 6px; }
  .legend i {
    width: 12px; height: 12px; display: inline-block; border-radius: 2px;
    border: 1px solid rgba(15, 23, 42, 0.4);
  }
  .legend i.leg { border-radius: 50%; background: #0f172a; border: none; width: 9px; height: 9px; }
  .specs-grid {
    display: grid; grid-template-columns: repeat(4, 1fr);
    gap: 8px; margin-bottom: 16px;
  }
  .spec-card {
    border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px 12px;
    background: #fff;
  }
  .spec-card .label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.04em; color: #64748b; }
  .spec-card .value { font-size: 18px; font-weight: 700; color: #0f172a; }
  .spec-card .unit { font-size: 12px; font-weight: 500; color: #64748b; margin-left: 4px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 12px; font-size: 12px; }
  th, td { text-align: left; padding: 6px 8px; border-bottom: 1px solid #e2e8f0; }
  th { font-size: 11px; color: #64748b; text-transform: uppercase; letter-spacing: 0.04em; font-weight: 600; }
  .row-total td { font-weight: 700; background: #f1f5f9; }
  .muted { color: #64748b; font-style: italic; }
  .warn {
    background: #fff7ed; border: 1px solid #fdba74; color: #9a3412;
    padding: 8px 12px; border-radius: 4px; margin: 8px 0; font-size: 12px;
  }
  .notes-box {
    border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px 12px;
    background: #f8fafc; white-space: pre-wrap; font-size: 12px;
  }
  .grand-total {
    margin-top: 16px; padding: 12px 16px; background: #0f172a; color: #fff;
    border-radius: 6px; display: flex; justify-content: space-between;
    align-items: center; font-size: 14px;
  }
  .grand-total strong { font-size: 18px; }
  .footer { margin-top: 18px; padding-top: 10px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #94a3b8; text-align: center; }
  .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; }
  @media print {
    body { padding: 12mm; font-size: 11px; }
    .stage-visual { break-inside: avoid; }
    table { break-inside: avoid; }
    .grand-total { break-inside: avoid; }
    .no-print { display: none !important; }
  }
  @page { size: A4 portrait; margin: 12mm; }
  .print-bar {
    position: fixed; top: 12px; right: 12px; display: flex; gap: 8px; z-index: 10;
  }
  .print-bar button {
    padding: 8px 14px; font-size: 13px; font-weight: 600;
    border: 1px solid #cbd5e1; border-radius: 4px; background: #fff;
    cursor: pointer;
  }
  .print-bar .primary { background: #f88000; color: #fff; border-color: #f88000; }
</style>
</head>
<body>
<div class="print-bar no-print">
  <button onclick="window.print()" class="primary">Print / Save as PDF</button>
  <button onclick="window.close()">Close</button>
</div>

<div class="header">
  <div class="header-left">
    ${logoDataUrl ? `<img src="${logoDataUrl}" alt="EHS" class="logo" />` : ""}
    <div class="brand">
      <strong>Production Tool</strong>
      Stage Build Sheet
    </div>
  </div>
  <div class="header-right">
    Generated ${escapeHtml(generatedAt)}
  </div>
</div>

<h1>${escapeHtml(stageName)}</h1>

<div class="meta-grid">
  <div class="meta-item">
    <div class="label">Venue / Project</div>
    <div class="value">${escapeHtml(project.venue || "—")}</div>
  </div>
  <div class="meta-item">
    <div class="label">Date</div>
    <div class="value">${
      project.endDate && project.endDate !== project.date
        ? `${escapeHtml(project.date || "—")} → ${escapeHtml(project.endDate)}`
        : escapeHtml(project.date || "—")
    }</div>
  </div>
  <div class="meta-item">
    <div class="label">Project manager</div>
    <div class="value">${escapeHtml(project.preparedBy || "—")}</div>
  </div>
  <div class="meta-item">
    <div class="label">Layout mode</div>
    <div class="value">${stage.editMode === "manual" ? "Manual placement" : "Auto-tiled"}</div>
  </div>
  <div class="meta-item">
    <div class="label">Build direction</div>
    <div class="value">${stage.buildOrder === "rightToLeft" ? "Right → left" : "Left → right"}</div>
  </div>
  <div class="meta-item">
    <div class="label">Male side faces</div>
    <div class="value">${CONNECTOR_LABEL[stage.connectorSide]}${
      Object.keys(stage.connectorOverrides).length > 0
        ? ` <span style="color:#b45309;font-weight:600">(+${Object.keys(stage.connectorOverrides).length} override${Object.keys(stage.connectorOverrides).length === 1 ? "" : "s"})</span>`
        : ""
    }</div>
  </div>
</div>

<h2>Stage Layout (top-down)</h2>
<div class="stage-visual">
  ${
    stage.editMode === "manual" && calc.decks.length === 0
      ? `<div style="padding:32px;text-align:center;color:#64748b;font-style:italic">No decks placed yet — switch to Manual mode in the app and add decks before exporting.</div>`
      : svg
  }
  <div class="legend">
    <span><i style="background:${DECK_FILL["2x1"]}"></i> 2 × 1</span>
    <span><i style="background:${DECK_FILL["1x1"]}"></i> 1 × 1</span>
    <span><i style="background:${DECK_FILL["0.5x2"]}"></i> 0.5 × 2</span>
    <span><i style="background:${DECK_FILL["0.5x1"]}"></i> 0.5 × 1</span>
    <span><i style="background:#dc2626"></i> Handrail</span>
    <span><i class="leg"></i> Leg</span>
    <span><i style="background:${MALE_EDGE_COLOR}"></i> Male edges / tongue (${CONNECTOR_SHORT[stage.connectorSide]} + adjacent short side)</span>
  </div>
  <p class="muted" style="font-size:11px;margin:6px 0 0;line-height:1.4">
    Tongue (male) hooks into groove (female) — never the other way around.
    The opposite (female / groove) side is where the stage can be expanded later,
    so plan future thrusts, B-stages or runways accordingly.
  </p>
</div>

<div class="specs-grid">
  <div class="spec-card">
    <div class="label">Width</div>
    <div class="value">${fmt(effectiveW, 2)}<span class="unit">m</span></div>
  </div>
  <div class="spec-card">
    <div class="label">Depth</div>
    <div class="value">${fmt(effectiveD, 2)}<span class="unit">m</span></div>
  </div>
  <div class="spec-card">
    <div class="label">Area</div>
    <div class="value">${fmt(calc.areaM2, 2)}<span class="unit">m²</span></div>
  </div>
  <div class="spec-card">
    <div class="label">Total weight</div>
    <div class="value">${fmt(calc.totalWeight, 0)}<span class="unit">kg</span></div>
  </div>
</div>

${
  !calc.fits
    ? `<div class="warn">⚠ Some cells of this stage cannot be tiled with the available Nivtec deck sizes (only multiples of 0.5 m are supported, and 0.5 m × 0.5 m gaps cannot be filled).</div>`
    : ""
}

<div class="two-col">
  <div>
    <h2>Decks</h2>
    <table>
      <thead><tr><th>Size</th><th>Qty</th><th>Unit</th><th>Total</th></tr></thead>
      <tbody>${decksRows}</tbody>
    </table>
  </div>
  <div>
    <h2>Legs (${stage.legHeightCm} cm · ${stage.legMode === "perDeck" ? "4 per deck" : "shared corners"})</h2>
    <table>
      <tbody>
        <tr><td>Quantity</td><td>${calc.legCount} pcs</td></tr>
        <tr><td>Unit weight</td><td>${fmt(legSpec?.weight ?? 0, 2)} kg</td></tr>
        <tr class="row-total"><td>Subtotal</td><td>${fmt(calc.legWeight, 1)} kg</td></tr>
      </tbody>
    </table>
    ${
      bracing.length > 0
        ? `<div class="warn"><strong>Bracing required:</strong><br />${bracing.map((b) => escapeHtml(b)).join("<br />")}</div>`
        : ""
    }
  </div>
</div>

<h2>Build sequence (${stage.buildOrder === "rightToLeft" ? "right → left" : "left → right"})</h2>
<table>
  <thead><tr><th>#</th><th>Deck</th><th>Male side</th><th>Legs to install</th></tr></thead>
  <tbody>${assemblyRows}</tbody>
</table>
<p class="muted" style="font-size:11px;margin:0 0 12px">
  Numbers match the badges drawn on each deck above. Each row shows the
  marginal legs added for that deck (shared corners are only counted once).
</p>

<h2>Load capacity</h2>
<table>
  <tbody>
    <tr><td>Distributed load</td><td><strong>${fmt(calc.loadCapacityKg, 0)} kg</strong>${!calc.fits ? " (placed area only)" : ""}</td></tr>
    <tr><td>Rated SWL</td><td>${fmt(calc.effectiveSwlPerM2, 0)} kg/m² @ ${stage.legHeightCm} cm</td></tr>
  </tbody>
</table>
<p class="muted" style="font-size:11px;margin:0 0 12px">
  Capacity is derated for leg height (Nivtec aluminium typical: ≤60 cm full
  rating; 80 cm ~85%; 100 cm ~70%; 120 cm ~55%; 140 cm ~45%). Always confirm
  against the manufacturer datasheet for your exact configuration.
</p>

<h2>Handrails ${railsEnabled.length > 0 ? `(${railsEnabled.join(", ")})` : ""}</h2>
<table>
  <thead><tr><th>Side</th><th>Length</th><th>2 m</th><th>1 m</th></tr></thead>
  <tbody>${railsRows}</tbody>
</table>

${
  stage.notes && stage.notes.trim().length > 0
    ? `<h2>Notes</h2><div class="notes-box">${escapeHtml(stage.notes)}</div>`
    : ""
}

<div class="grand-total">
  <span>Total weight (decks + legs + rails)</span>
  <strong>${fmt(calc.totalWeight, 1)} kg</strong>
</div>

<div class="footer">
  Generated by Production Tool — Nivtec deck calculator. Always cross-check
  against the manufacturer's official datasheet before building.
</div>
</body>
</html>`;

  return html;
}

/** Open a printable Stage Build Sheet in a new browser window. The user
 *  can save it as PDF (Print → Save as PDF) or send it straight to a
 *  printer. Kept for the legacy popup-print flow — most callers should
 *  prefer `buildStageReportHtml` + `downloadHtmlAsPdf` for a direct
 *  download with no print dialog.
 *
 *  Caller must open the target window SYNCHRONOUSLY inside the user's
 *  click handler and pass it in as `targetWin` — otherwise pop-up
 *  blockers will silently swallow the new tab. */
export function exportStageReport(input: {
  stage: Stage;
  calc: StageCalc;
  project: StageExportProject;
  logoDataUrl: string | null;
  /** Pre-opened popup window from the click handler. */
  targetWin: Window | null;
}): void {
  const { targetWin } = input;
  const html = buildStageReportHtml(input);

  if (!targetWin) {
    // Caller's synchronous window.open() was blocked. Try a last-ditch
    // open here (will likely also be blocked, but we leave the door
    // open for browsers configured permissively).
    const fallback = window.open("", "_blank");
    if (!fallback) {
      alert(
        "Could not open the export window. Please allow pop-ups for this site and try again.",
      );
      return;
    }
    fallback.document.open();
    fallback.document.write(html);
    fallback.document.close();
    return;
  }
  targetWin.document.open();
  targetWin.document.write(html);
  targetWin.document.close();
}
