import {
  computeDistroLoad,
  computeDistroPlanTotals,
  computeUnpoweredFixtures,
  makeFixtureWattsLookup,
  type DistroLoad,
  type FixtureRef,
  type PowerPlan,
} from "./power";

type SystemLite = { id: string; name: string };

type ProjectMeta = {
  venue: string;
  date: string;
  /** Optional ISO end date (YYYY-MM-DD) for multi-day shows. When set,
   *  the export header shows the date as a "from → to" range — same
   *  convention as the Stage Build Sheet export. */
  endDate?: string;
  preparedBy: string;
};

type ExportInput = {
  plan: PowerPlan;
  fixtures: FixtureRef[];
  systems: SystemLite[];
  project: ProjectMeta;
  /** Pre-loaded EHS logo (data URL). The caller is expected to fetch
   *  this with `getLogoDataUrl(ehsLogo)` so we can render it in the
   *  manifest header — same lookup as Stage Build Sheet uses. May be
   *  null if the logo couldn't be loaded; the header still renders. */
  logoDataUrl: string | null;
  /** Pre-opened popup window from the click handler (sync open keeps
   *  the browser from classifying it as a programmatic pop-up). */
  targetWin: Window | null;
};

const fmt = (n: number, d = 1) =>
  n.toLocaleString("en-US", { maximumFractionDigits: d });

const fmtInt = (n: number) =>
  Math.round(n).toLocaleString("en-US", { maximumFractionDigits: 0 });

const escapeHtml = (s: string): string =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

/** Versioned JSON contract bundled into the export window for download.
 *  Mirrors the visible HTML — distros, channels, drops, per-truss
 *  totals, plus project metadata. Crew tools can ingest this directly. */
export type PowerPlanManifest = {
  schema: "ehs-power-plan-manifest@1";
  generatedAt: string;
  project: ProjectMeta;
  totals: {
    distroCount: number;
    totalWatts: number;
    totalAmpsWorstLeg: number;
    unpoweredFixtureCount: number;
  };
  distros: Array<{
    id: string;
    name: string;
    source: string;
    preset: string;
    feedVoltage: number;
    feedAmps: number;
    feedPhases: 1 | 3;
    feedsTrusses: string[];
    totalWatts: number;
    feederWorstAmps: number;
    feederUtilization: number;
    imbalance: number;
    phases: Array<{
      phase: "L1" | "L2" | "L3";
      watts: number;
      amps: number;
      channels: number[];
    }>;
    channels: Array<{
      index: number;
      breakerAmps: number;
      phase: "L1" | "L2" | "L3" | null;
      watts: number;
      amps: number;
      drops: Array<{
        trussId: string;
        trussName: string;
        fixtureRef: string;
        qty: number;
        watts: number;
        amps: number;
        cable: string | null;
      }>;
    }>;
  }>;
};

function buildManifest(input: ExportInput): PowerPlanManifest {
  const { plan, fixtures, systems, project } = input;
  const wattsLookup = makeFixtureWattsLookup(fixtures);
  const systemNameById = new Map(systems.map((s) => [s.id, s.name]));
  const loads: DistroLoad[] = plan.distros.map((d) =>
    computeDistroLoad(d, wattsLookup),
  );
  const unpowered = computeUnpoweredFixtures(plan.distros, fixtures);
  const totals = computeDistroPlanTotals(loads, unpowered);

  return {
    schema: "ehs-power-plan-manifest@1",
    generatedAt: new Date().toISOString(),
    project,
    totals: {
      distroCount: totals.distroCount,
      totalWatts: totals.totalWatts,
      totalAmpsWorstLeg: loads.reduce(
        (m, l) => Math.max(m, l.feederWorstAmps),
        0,
      ),
      unpoweredFixtureCount: totals.unpoweredFixtureCount,
    },
    distros: loads.map((l) => ({
      id: l.distro.id,
      name: l.distro.name,
      source: l.distro.source,
      preset: l.distro.preset,
      feedVoltage: l.distro.feedVoltage,
      feedAmps: l.distro.feedAmps,
      feedPhases: l.distro.feedPhases,
      feedsTrusses: l.distro.feedsTrusses
        .map((id) => systemNameById.get(id) ?? id),
      totalWatts: l.totalWatts,
      feederWorstAmps: l.feederWorstAmps,
      feederUtilization: l.feederUtilization,
      imbalance: l.imbalance,
      phases: l.phases.map((p) => ({
        phase: p.phase,
        watts: p.watts,
        amps: p.amps,
        channels: p.channelIndexes,
      })),
      channels: l.channels.map((cl) => ({
        index: cl.channel.index,
        breakerAmps: cl.channel.breakerAmps,
        phase: cl.phase,
        watts: cl.watts,
        amps: cl.amps,
        drops: cl.drops.map((dl) => ({
          trussId: dl.drop.trussId,
          trussName: systemNameById.get(dl.drop.trussId) ?? "—",
          fixtureRef: dl.drop.fixtureRef,
          qty: dl.drop.qty,
          watts: dl.watts,
          amps: dl.amps,
          cable: dl.drop.cable ?? null,
        })),
      })),
    })),
  };
}

/** Render a single distro card in the Stage-style sectioned layout —
 *  H2 heading, meta line, phase table, and per-channel drop tables. */
function renderDistroSection(d: PowerPlanManifest["distros"][number]): string {
  const phaseRows = d.phases
    .map(
      (p) => `
        <tr>
          <td><strong>${p.phase}</strong></td>
          <td>${fmtInt(p.watts)} W</td>
          <td>${fmt(p.amps, 1)} A</td>
          <td class="muted">${
            p.channels.length === 0
              ? "—"
              : `Ch${p.channels.join(" + Ch")}`
          }</td>
        </tr>`,
    )
    .join("");

  // Channels render as compact drop tables — empty channels collapse
  // to a single dim row so the crew can still see "Ch4: nothing here".
  const channelTables = d.channels
    .map((cl) => {
      const dropRows =
        cl.drops.length === 0
          ? `<tr><td colspan="5" class="muted">— no drops on this channel —</td></tr>`
          : cl.drops
              .map(
                (dr) => `
                <tr>
                  <td>${escapeHtml(dr.trussName)}</td>
                  <td>${escapeHtml(dr.fixtureRef || "—")}</td>
                  <td>${dr.qty}</td>
                  <td>${fmtInt(dr.watts)} W</td>
                  <td class="muted">${escapeHtml(dr.cable ?? "—")}</td>
                </tr>`,
              )
              .join("") +
            `<tr class="row-total"><td colspan="3">Channel subtotal</td><td>${fmtInt(cl.watts)} W</td><td>${fmt(cl.amps, 1)} A</td></tr>`;
      return `
        <div class="channel-block">
          <h3>Ch${cl.index} <span class="ch-tag">${cl.phase ?? "—"}</span> <span class="ch-tag">${cl.breakerAmps} A breaker</span></h3>
          <table>
            <thead>
              <tr>
                <th>Truss</th>
                <th>Fixture</th>
                <th>Qty</th>
                <th>Watts</th>
                <th>Cable</th>
              </tr>
            </thead>
            <tbody>${dropRows}</tbody>
          </table>
        </div>`;
    })
    .join("");

  return `
    <section class="distro-section">
      <h2>${escapeHtml(d.name || "Distro")}</h2>
      <div class="distro-meta">
        <span class="ch-tag">${d.feedVoltage} V · ${d.feedAmps} A · ${d.feedPhases}ph</span>
        ${d.source ? `<span class="muted">${escapeHtml(d.source)}</span>` : ""}
        <span class="muted">Feeds: ${
          d.feedsTrusses.length === 0
            ? "—"
            : d.feedsTrusses.map(escapeHtml).join(", ")
        }</span>
      </div>

      <div class="specs-grid">
        <div class="spec-card">
          <div class="label">Total load</div>
          <div class="value">${fmtInt(d.totalWatts)}<span class="unit">W</span></div>
        </div>
        <div class="spec-card">
          <div class="label">Worst leg</div>
          <div class="value">${fmt(d.feederWorstAmps, 1)}<span class="unit">A</span></div>
        </div>
        <div class="spec-card">
          <div class="label">Feeder util</div>
          <div class="value">${fmt(d.feederUtilization * 100, 0)}<span class="unit">%</span></div>
        </div>
        <div class="spec-card">
          <div class="label">Imbalance</div>
          <div class="value">${d.feedPhases === 3 ? `${fmt(d.imbalance * 100, 0)}` : "—"}<span class="unit">${d.feedPhases === 3 ? "%" : ""}</span></div>
        </div>
      </div>

      <h3>Phases</h3>
      <table>
        <thead>
          <tr><th>Phase</th><th>Watts</th><th>Amps</th><th>Channels</th></tr>
        </thead>
        <tbody>${phaseRows}</tbody>
      </table>

      <h3>Channels</h3>
      <div class="channel-grid">${channelTables}</div>
    </section>`;
}

/** Build the full HTML document. Visual language mirrors stageExport
 *  exactly: orange-bar header with logo + brand on the left and
 *  generated-time on the right; project meta-grid below the H1; sticky
 *  print-bar in the corner; sectioned content on a white page; A4
 *  portrait print rules. The only Power-Plan-specific addition is the
 *  Download JSON button next to Print. */
function renderHtml(
  manifest: PowerPlanManifest,
  jsonText: string,
  logoDataUrl: string | null,
): string {
  const distros =
    manifest.distros.length === 0
      ? `<div class="warn">No distros in this power plan yet — add a distro on the Power Plan tab before exporting.</div>`
      : manifest.distros.map(renderDistroSection).join("\n");

  const projTitle = manifest.project.venue || "Power Plan";
  const generatedAt = new Date(manifest.generatedAt).toLocaleString();

  // Embed the JSON in a script tag (escape closing tags) for Download.
  const safeJson = jsonText.replace(/<\/script/gi, "<\\/script");

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>Power Plan — ${escapeHtml(projTitle)}</title>
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
  .specs-grid {
    display: grid; grid-template-columns: repeat(4, 1fr);
    gap: 8px; margin: 8px 0 16px;
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
  .grand-total {
    margin-top: 16px; padding: 12px 16px; background: #0f172a; color: #fff;
    border-radius: 6px; display: flex; justify-content: space-between;
    align-items: center; font-size: 14px;
  }
  .grand-total strong { font-size: 18px; }
  .footer { margin-top: 18px; padding-top: 10px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #94a3b8; text-align: center; }
  .distro-section {
    margin-top: 20px; padding-top: 6px;
    border-top: 1px dashed #e2e8f0;
  }
  .distro-section:first-of-type { border-top: none; padding-top: 0; }
  .distro-section h2 {
    border-bottom: none; margin-bottom: 4px;
    padding-bottom: 0; font-size: 17px;
  }
  .distro-meta {
    display: flex; flex-wrap: wrap; gap: 6px 12px;
    margin-bottom: 8px; font-size: 12px; align-items: center;
  }
  .ch-tag {
    display: inline-block; padding: 1px 8px; background: #eef2ff;
    color: #3730a3; border-radius: 999px; font-size: 11px; font-weight: 500;
  }
  .channel-grid {
    display: grid; grid-template-columns: 1fr 1fr; gap: 12px 16px;
  }
  .channel-block {
    border: 1px solid #e2e8f0; border-radius: 6px; padding: 8px 12px;
    background: #f8fafc; break-inside: avoid;
  }
  .channel-block h3 {
    margin: 0 0 6px; display: flex; gap: 6px; align-items: center;
    color: #0f172a; text-transform: none; letter-spacing: 0; font-size: 13px;
  }
  .channel-block table { background: #fff; margin-bottom: 0; }
  @media print {
    body { padding: 12mm; font-size: 11px; }
    .channel-grid { grid-template-columns: 1fr; }
    .channel-block { break-inside: avoid; }
    .distro-section { break-inside: auto; page-break-before: auto; }
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
  <button onclick="downloadJson()">Download JSON</button>
  <button onclick="window.close()">Close</button>
</div>

<div class="header">
  <div class="header-left">
    ${logoDataUrl ? `<img src="${logoDataUrl}" alt="EHS" class="logo" />` : ""}
    <div class="brand">
      <strong>Production Tool</strong>
      Power Plan — Crew Manifest
    </div>
  </div>
  <div class="header-right">
    Generated ${escapeHtml(generatedAt)}
  </div>
</div>

<h1>${escapeHtml(projTitle)}</h1>

<div class="meta-grid">
  <div class="meta-item">
    <div class="label">Venue / Project</div>
    <div class="value">${escapeHtml(manifest.project.venue || "—")}</div>
  </div>
  <div class="meta-item">
    <div class="label">Date</div>
    <div class="value">${
      manifest.project.endDate &&
      manifest.project.endDate !== manifest.project.date
        ? `${escapeHtml(manifest.project.date || "—")} → ${escapeHtml(manifest.project.endDate)}`
        : escapeHtml(manifest.project.date || "—")
    }</div>
  </div>
  <div class="meta-item">
    <div class="label">Project manager</div>
    <div class="value">${escapeHtml(manifest.project.preparedBy || "—")}</div>
  </div>
  <div class="meta-item">
    <div class="label">Distros</div>
    <div class="value">${manifest.totals.distroCount}</div>
  </div>
</div>

<div class="specs-grid">
  <div class="spec-card">
    <div class="label">Total load</div>
    <div class="value">${fmtInt(manifest.totals.totalWatts)}<span class="unit">W</span></div>
  </div>
  <div class="spec-card">
    <div class="label">Worst leg</div>
    <div class="value">${fmt(manifest.totals.totalAmpsWorstLeg, 1)}<span class="unit">A</span></div>
  </div>
  <div class="spec-card">
    <div class="label">Distros</div>
    <div class="value">${manifest.totals.distroCount}<span class="unit">racks</span></div>
  </div>
  <div class="spec-card">
    <div class="label">Unpowered</div>
    <div class="value">${manifest.totals.unpoweredFixtureCount}<span class="unit">fixtures</span></div>
  </div>
</div>

${manifest.totals.unpoweredFixtureCount > 0 ? `<div class="warn">⚠ ${manifest.totals.unpoweredFixtureCount} fixture${manifest.totals.unpoweredFixtureCount === 1 ? "" : "s"} are not yet assigned to any distro channel. Please review on the Power Plan tab before sending to crew.</div>` : ""}

<h2>Distros &amp; channel breakdown</h2>
${distros}

<div class="grand-total">
  <span>Total connected load</span>
  <strong>${fmtInt(manifest.totals.totalWatts)} W · worst leg ${fmt(manifest.totals.totalAmpsWorstLeg, 1)} A</strong>
</div>

<div class="footer">
  Generated by Production Tool — Power Plan v2.2. Math uses A = W / (V × PF)
  with PF 0.95 and an 80 % derate for continuous loads. Always cross-check
  feeder sizing and breaker coordination on site.
</div>

<script id="manifest-json" type="application/json">${safeJson}</script>
<script>
  function downloadJson() {
    var raw = document.getElementById("manifest-json").textContent || "{}";
    var blob = new Blob([raw], { type: "application/json" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    var venue = ${JSON.stringify(manifest.project.venue || "power-plan")};
    var slug = venue.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "power-plan";
    a.href = url; a.download = slug + "-power-plan.json";
    document.body.appendChild(a); a.click();
    setTimeout(function () { document.body.removeChild(a); URL.revokeObjectURL(url); }, 100);
  }
</script>
</body>
</html>`;
}

/** Open a printable Power Plan manifest in a new browser window. The
 *  layout mirrors the Stage Build Sheet export — same orange-bar
 *  header with EHS logo + brand on the left, generated-time on the
 *  right, project meta-grid, spec-card summary, sectioned distro
 *  breakdowns, grand-total band and footer. The window also exposes
 *  Print / Save as PDF and Download JSON controls.
 *
 *  The popup MUST be opened SYNCHRONOUSLY in the click handler (before
 *  any async work) and passed in as `targetWin`, otherwise pop-up
 *  blockers will silently swallow the new tab. The caller can preload
 *  the window with a "Generating…" message while async work (logo
 *  fetch) finishes; this function then writes the final HTML in. */
export function exportPowerPlanToCrew(input: ExportInput): {
  manifest: PowerPlanManifest;
  ok: boolean;
} {
  const manifest = buildManifest(input);
  const jsonText = JSON.stringify(manifest, null, 2);
  const html = renderHtml(manifest, jsonText, input.logoDataUrl);
  const win = input.targetWin;
  if (!win) {
    // Caller's synchronous window.open() was blocked — try a last
    // ditch open (will likely also be blocked but lets permissive
    // browsers through).
    const fallback = window.open("", "_blank");
    if (!fallback) return { manifest, ok: false };
    fallback.document.open();
    fallback.document.write(html);
    fallback.document.close();
    return { manifest, ok: true };
  }
  win.document.open();
  win.document.write(html);
  win.document.close();
  return { manifest, ok: true };
}
