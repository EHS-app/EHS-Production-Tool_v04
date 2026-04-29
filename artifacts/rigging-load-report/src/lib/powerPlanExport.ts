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
  endDate?: string;
  preparedBy: string;
};

type ExportInput = {
  plan: PowerPlan;
  fixtures: FixtureRef[];
  systems: SystemLite[];
  project: ProjectMeta;
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

/** Build the JSON manifest that is bundled into the export window for
 *  download. Mirrors the visible HTML — distros, channels, drops,
 *  per-truss totals, plus project metadata. */
export type PowerPlanManifest = {
  schema: "ehs-power-plan-manifest@1";
  generatedAt: string;
  project: ProjectMeta;
  totals: {
    distroCount: number;
    totalWatts: number;
    totalAmpsWorstLeg: number;
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

function renderDistroSection(d: PowerPlanManifest["distros"][number]): string {
  const phaseRows = d.phases
    .map(
      (p) => `
        <tr>
          <td><strong>${p.phase}</strong></td>
          <td>${fmtInt(p.watts)} W</td>
          <td>${fmt(p.amps, 1)} A</td>
          <td class="dim">${
            p.channels.length === 0 ? "—" : `Ch${p.channels.join(" + Ch")}`
          }</td>
        </tr>`,
    )
    .join("");

  const channelTables = d.channels
    .map((cl) => {
      const dropRows =
        cl.drops.length === 0
          ? `<tr><td colspan="5" class="dim">— no drops —</td></tr>`
          : cl.drops
              .map(
                (dr) => `
                <tr>
                  <td>${escapeHtml(dr.trussName)}</td>
                  <td>${escapeHtml(dr.fixtureRef || "—")}</td>
                  <td class="num">${dr.qty}</td>
                  <td class="num">${fmtInt(dr.watts)} W</td>
                  <td class="dim">${escapeHtml(dr.cable ?? "—")}</td>
                </tr>`,
              )
              .join("");
      return `
        <div class="channel-block">
          <div class="channel-head">
            <strong>Ch${cl.index}</strong>
            <span class="pill">${cl.phase ?? "—"}</span>
            <span class="pill">${cl.breakerAmps} A breaker</span>
            <span class="dim">${fmtInt(cl.watts)} W · ${fmt(cl.amps, 1)} A</span>
          </div>
          <table class="drop-table">
            <thead>
              <tr>
                <th>Truss</th>
                <th>Fixture</th>
                <th class="num">Qty</th>
                <th class="num">Watts</th>
                <th>Cable</th>
              </tr>
            </thead>
            <tbody>${dropRows}</tbody>
          </table>
        </div>`;
    })
    .join("");

  return `
    <section class="distro">
      <header class="distro-head">
        <h2>${escapeHtml(d.name || "Distro")}</h2>
        <div class="distro-meta">
          <span class="pill">${d.feedVoltage} V · ${d.feedAmps} A · ${d.feedPhases}ph</span>
          ${d.source ? `<span class="dim">${escapeHtml(d.source)}</span>` : ""}
          <span class="dim">Feeds: ${
            d.feedsTrusses.length === 0
              ? "—"
              : d.feedsTrusses.map(escapeHtml).join(", ")
          }</span>
        </div>
        <div class="distro-totals">
          <span><strong>${fmtInt(d.totalWatts)}</strong> W total</span>
          <span>worst leg <strong>${fmt(d.feederWorstAmps, 1)}</strong> A</span>
          <span>util <strong>${fmt(d.feederUtilization * 100, 0)} %</strong></span>
          ${d.feedPhases === 3 ? `<span>imbal <strong>${fmt(d.imbalance * 100, 0)} %</strong></span>` : ""}
        </div>
      </header>

      <table class="phase-table">
        <thead>
          <tr><th>Phase</th><th>Watts</th><th>Amps</th><th>Channels</th></tr>
        </thead>
        <tbody>${phaseRows}</tbody>
      </table>

      <div class="channel-grid">${channelTables}</div>
    </section>`;
}

function renderHtml(manifest: PowerPlanManifest, jsonText: string): string {
  const distros =
    manifest.distros.length === 0
      ? `<p class="empty">No distros in this power plan.</p>`
      : manifest.distros.map(renderDistroSection).join("\n");

  const projTitle = manifest.project.venue || "Power Plan";
  const dateLine =
    manifest.project.endDate &&
    manifest.project.endDate !== manifest.project.date
      ? `${manifest.project.date} → ${manifest.project.endDate}`
      : manifest.project.date;

  // Embed the JSON in a script tag (escape closing tags) for Download.
  const safeJson = jsonText.replace(/<\/script/gi, "<\\/script");

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(projTitle)} — Power Plan Crew Manifest</title>
  <style>
    :root { color-scheme: light; }
    * { box-sizing: border-box; }
    body {
      font: 13px/1.45 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
      color: #0f172a; background: #f8fafc; margin: 0; padding: 24px 32px 64px;
    }
    .toolbar {
      position: sticky; top: 0; z-index: 10;
      background: #f8fafc; border-bottom: 1px solid #e2e8f0;
      padding: 8px 0 12px; margin: -24px -32px 24px; padding-left: 32px; padding-right: 32px;
      display: flex; gap: 8px; align-items: center; justify-content: flex-end;
    }
    .toolbar button {
      padding: 6px 14px; border: 1px solid #cbd5e1; border-radius: 6px;
      background: #fff; color: #0f172a; font: inherit; cursor: pointer;
    }
    .toolbar button.primary { background: #1e40af; color: #fff; border-color: #1e40af; }
    .toolbar button:hover { background: #f1f5f9; }
    .toolbar button.primary:hover { background: #1d4ed8; }

    header.doc-head { margin-bottom: 24px; }
    header.doc-head h1 { margin: 0 0 4px; font-size: 22px; }
    header.doc-head .subtitle { color: #475569; font-size: 13px; }

    .top-meta {
      display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 8px 24px; margin: 16px 0 24px;
      padding: 12px 16px; background: #fff; border: 1px solid #e2e8f0; border-radius: 8px;
    }
    .top-meta div { display: flex; flex-direction: column; gap: 2px; }
    .top-meta .label { font-size: 11px; color: #64748b; text-transform: uppercase; letter-spacing: 0.04em; }
    .top-meta .value { font-weight: 600; font-size: 14px; }

    section.distro {
      background: #fff; border: 1px solid #e2e8f0; border-radius: 8px;
      padding: 16px 18px; margin-bottom: 18px;
      page-break-inside: avoid;
    }
    .distro-head { border-bottom: 1px solid #e2e8f0; padding-bottom: 10px; margin-bottom: 12px; }
    .distro-head h2 { margin: 0 0 4px; font-size: 17px; }
    .distro-meta { display: flex; flex-wrap: wrap; gap: 8px 12px; align-items: center; font-size: 12px; }
    .distro-totals { display: flex; flex-wrap: wrap; gap: 6px 16px; margin-top: 6px; font-size: 12px; color: #334155; }

    .pill {
      display: inline-block; padding: 2px 8px; background: #eef2ff; color: #3730a3;
      border-radius: 999px; font-size: 11px; font-weight: 500;
    }
    .dim { color: #64748b; }
    .num { text-align: right; font-variant-numeric: tabular-nums; }

    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    th, td { text-align: left; padding: 5px 8px; border-bottom: 1px solid #f1f5f9; }
    th { font-weight: 600; color: #475569; background: #f8fafc; }

    .phase-table { margin-bottom: 14px; }
    .channel-grid { display: grid; grid-template-columns: 1fr; gap: 12px; }
    .channel-block { border: 1px solid #f1f5f9; border-radius: 6px; padding: 8px 10px; background: #fafbfd; }
    .channel-head { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; margin-bottom: 6px; }
    .drop-table th { background: transparent; }
    .drop-table { background: #fff; }

    .empty { padding: 24px; text-align: center; color: #64748b;
      background: #fff; border: 1px dashed #cbd5e1; border-radius: 8px; }

    @media print {
      body { background: #fff; padding: 12mm 12mm 16mm; }
      .toolbar { display: none; }
      .top-meta, section.distro { box-shadow: none; }
    }
  </style>
</head>
<body>
  <div class="toolbar">
    <button class="primary" onclick="window.print()">Print / Save as PDF</button>
    <button onclick="downloadJson()">Download JSON</button>
  </div>

  <header class="doc-head">
    <h1>${escapeHtml(projTitle)} — Power Plan</h1>
    <div class="subtitle">Crew manifest · generated ${escapeHtml(
      new Date(manifest.generatedAt).toLocaleString(),
    )}</div>
  </header>

  <div class="top-meta">
    <div><span class="label">Venue</span><span class="value">${escapeHtml(manifest.project.venue || "—")}</span></div>
    <div><span class="label">Dates</span><span class="value">${escapeHtml(dateLine || "—")}</span></div>
    <div><span class="label">Prepared by</span><span class="value">${escapeHtml(manifest.project.preparedBy || "—")}</span></div>
    <div><span class="label">Distros</span><span class="value">${manifest.totals.distroCount}</span></div>
    <div><span class="label">Total load</span><span class="value">${fmtInt(manifest.totals.totalWatts)} W</span></div>
    <div><span class="label">Worst leg</span><span class="value">${fmt(manifest.totals.totalAmpsWorstLeg, 1)} A</span></div>
  </div>

  ${distros}

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

/** Open a new window with a printable Power Plan manifest. The window
 *  also exposes a "Download JSON" button so the crew can ingest the
 *  data into their own tools. The popup must be opened SYNCHRONOUSLY
 *  in the click handler (before any await) so browsers don't classify
 *  it as a programmatic pop-up and block it. */
export function exportPowerPlanToCrew(input: ExportInput): {
  manifest: PowerPlanManifest;
  ok: boolean;
} {
  const manifest = buildManifest(input);
  const jsonText = JSON.stringify(manifest, null, 2);
  const html = renderHtml(manifest, jsonText);
  const win = input.targetWin;
  if (!win) {
    return { manifest, ok: false };
  }
  win.document.open();
  win.document.write(html);
  win.document.close();
  return { manifest, ok: true };
}
