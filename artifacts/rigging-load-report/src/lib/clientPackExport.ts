import {
  computeDistroLoad,
  computeDistroPlanTotals,
  computeUnpoweredFixtures,
  makeFixtureWattsLookup,
  type DistroLoad,
  type FixtureRef,
  type PowerPlan,
} from "./power";
import {
  computeCrewTotals,
  crewHours,
  formatCrewDayRate,
  type CrewMember,
} from "./crew";
import { computeSoundTotals, type SoundItem } from "./sound";
import {
  computeStage,
  computeStageTotals,
  type Stage,
  type StageCalc,
} from "./stage";
import {
  computeLedTotals,
  hasHalfLastRow,
  NOVASTAR_PROCESSOR_CATALOG,
  type LedPanel,
  type LedScreen,
  type LedSettings,
} from "./led";
import { findProcessor } from "./ledProcessors";

/** Minimal slice of `System` we need from the producer app. We accept a
 *  pre-computed metric bundle so the export module stays free of the
 *  rigging math (the producer app already memoizes those per system). */
export type ClientPackSystem = {
  id: string;
  name: string;
  pointCount: number;
  hoistName: string;
  /** Truss / row labels for the system, in display order. */
  truss: string[];
  metrics: {
    static: number;
    dynamic: number;
    peak: number;
    swl: number;
    headroom: number;
  };
};

export type ClientPackSchedulePhase = {
  key: "setup" | "rehearsal" | "show" | "downrig";
  label: string;
  segments: Array<{
    from: string;
    to: string;
    fromTime?: string;
    toTime?: string;
  }>;
};

export type ClientPackProject = {
  eventName: string;
  client: string;
  venue: string;
  date: string;
  endDate?: string;
  preparedBy: string;
  summary: string;
};

export type ClientPackInput = {
  project: ClientPackProject;
  schedule: ClientPackSchedulePhase[];
  systems: ClientPackSystem[];
  power: PowerPlan;
  fixtures: FixtureRef[];
  crew: CrewMember[];
  sound: SoundItem[];
  stages: Stage[];
  ledScreens: LedScreen[];
  ledSettings: LedSettings;
  ledPanels: LedPanel[];
  /** Optional pre-rendered pixel-map PNGs (data URLs) keyed by screen
   *  id. When present the LED section embeds each diagram below the
   *  summary table so the printed pack matches the on-screen Pixel Map
   *  view. Screens without an entry simply skip the figure. */
  ledPixelMaps?: Record<string, string>;
  /** Pre-loaded EHS logo (data URL). Same lookup the Stage Build Sheet
   *  + Power Plan exports use, so the cover page matches branding. */
  logoDataUrl: string | null;
  /** Pre-opened popup window from the click handler (sync open keeps
   *  the browser from classifying it as a programmatic pop-up). */
  targetWin: Window | null;
};

// ─── Formatting helpers ───────────────────────────────────────────────

const NS = "Not specified";

const fmt = (n: number, d = 1): string =>
  n.toLocaleString("en-US", { maximumFractionDigits: d });

const fmtInt = (n: number): string =>
  Math.round(n).toLocaleString("en-US", { maximumFractionDigits: 0 });

const escapeHtml = (s: string): string =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

/** Render a value or "Not specified" if the value is empty / blank. */
const orNS = (v: string | number | null | undefined): string => {
  if (v === null || v === undefined) return NS;
  if (typeof v === "string" && v.trim() === "") return NS;
  if (typeof v === "number" && !Number.isFinite(v)) return NS;
  return escapeHtml(String(v));
};

/** Format a YYYY-MM-DD date as "Fri 12 Sep 2025". Falls back to NS for
 *  empty strings — the producer might leave a phase undated. */
const fmtDate = (iso: string | undefined): string => {
  if (!iso) return NS;
  const d = new Date(iso + "T00:00:00");
  if (Number.isNaN(d.getTime())) return escapeHtml(iso);
  return d.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const fmtTimeRange = (from?: string, to?: string): string => {
  if (!from && !to) return "";
  return `${from || "—"} → ${to || "—"}`;
};

// ─── Risk pill ────────────────────────────────────────────────────────

type RiskLevel = "safe" | "warn" | "danger";

const riskPill = (level: RiskLevel, label?: string): string => {
  const dot = level === "danger" ? "🔴" : level === "warn" ? "🟠" : "🟢";
  const text =
    label ??
    (level === "danger" ? "OVERLOAD" : level === "warn" ? "WARNING" : "SAFE");
  return `<span class="risk-pill risk-${level}">${dot} ${escapeHtml(text)}</span>`;
};

// ─── Risk collection ──────────────────────────────────────────────────

type RiskItem = {
  level: RiskLevel;
  area: string;
  message: string;
};

function collectRisks(
  input: ClientPackInput,
  loads: DistroLoad[],
  unpoweredFixtureCount: number,
): RiskItem[] {
  const out: RiskItem[] = [];

  // Rigging SWL risks
  for (const sys of input.systems) {
    const m = sys.metrics;
    if (m.swl > 0 && m.peak > m.swl) {
      out.push({
        level: "danger",
        area: `Rigging · ${sys.name}`,
        message: `Peak point load ${fmtInt(m.peak)} kg exceeds hoist SWL ${fmtInt(m.swl)} kg (${fmt((m.peak / m.swl) * 100, 0)} %).`,
      });
    } else if (m.swl > 0 && m.peak / m.swl > 0.85) {
      out.push({
        level: "warn",
        area: `Rigging · ${sys.name}`,
        message: `Peak point load at ${fmt((m.peak / m.swl) * 100, 0)} % of SWL — review before show.`,
      });
    }
  }

  // Power risks: per-distro overload + imbalance
  loads.forEach((d) => {
    const name = d.distro.name || "Distro";
    if (d.feederUtilization > 1) {
      out.push({
        level: "danger",
        area: `Power · ${name}`,
        message: `Feeder utilization ${fmt(d.feederUtilization * 100, 0)} % — over breaker rating.`,
      });
    } else if (d.feederUtilization > 0.85) {
      out.push({
        level: "warn",
        area: `Power · ${name}`,
        message: `Feeder utilization ${fmt(d.feederUtilization * 100, 0)} % — close to breaker limit.`,
      });
    }
    if (d.distro.feedPhases === 3 && d.imbalance > 0.2) {
      out.push({
        level: "warn",
        area: `Power · ${name}`,
        message: `Phase imbalance ${fmt(d.imbalance * 100, 0)} % — re-balance L1 / L2 / L3.`,
      });
    }
  });
  if (unpoweredFixtureCount > 0) {
    out.push({
      level: "warn",
      area: "Power",
      message: `${unpoweredFixtureCount} fixture${unpoweredFixtureCount === 1 ? "" : "s"} not yet assigned to any distro channel.`,
    });
  }

  // Crew: missing call time
  const missingCall = input.crew.filter((c) => !c.callTime);
  if (missingCall.length > 0) {
    out.push({
      level: "warn",
      area: "Crew",
      message: `${missingCall.length} crew member${missingCall.length === 1 ? "" : "s"} missing call time: ${missingCall
        .map((c) => c.name || "(unnamed)")
        .join(", ")}.`,
    });
  }
  if (input.crew.length === 0) {
    out.push({
      level: "warn",
      area: "Crew",
      message: "No crew assigned yet.",
    });
  }

  // Schedule risks: missing dates on enabled phases
  for (const phase of input.schedule) {
    const blank = phase.segments.filter((s) => !s.from && !s.to);
    if (blank.length > 0) {
      out.push({
        level: "warn",
        area: `Schedule · ${phase.label}`,
        message: `${blank.length} segment${blank.length === 1 ? "" : "s"} without dates.`,
      });
    }
  }
  if (input.schedule.length === 0) {
    out.push({
      level: "warn",
      area: "Schedule",
      message: "No schedule phases defined.",
    });
  }

  return out;
}

// ─── Section renderers ────────────────────────────────────────────────

function renderCover(p: ClientPackProject, logoDataUrl: string | null): string {
  const dateLabel =
    p.endDate && p.endDate !== p.date
      ? `${fmtDate(p.date)} → ${fmtDate(p.endDate)}`
      : fmtDate(p.date);
  return `
<section class="cover">
  ${logoDataUrl ? `<img src="${logoDataUrl}" alt="EHS" class="cover-logo" />` : ""}
  <div class="cover-brand">EHS Production · Client Pack</div>
  <h1 class="cover-title">${orNS(p.eventName) === NS ? orNS(p.venue) : escapeHtml(p.eventName)}</h1>
  <div class="cover-meta">
    <div><span class="cover-meta-label">Client</span><span class="cover-meta-value">${orNS(p.client)}</span></div>
    <div><span class="cover-meta-label">Venue</span><span class="cover-meta-value">${orNS(p.venue)}</span></div>
    <div><span class="cover-meta-label">Date</span><span class="cover-meta-value">${dateLabel}</span></div>
    <div><span class="cover-meta-label">EHS Production</span><span class="cover-meta-value">${orNS(p.preparedBy)}</span></div>
  </div>
  <div class="cover-footer">Generated ${escapeHtml(new Date().toLocaleString())}</div>
</section>`;
}

function renderOverview(input: ClientPackInput): string {
  const totalFixtures = input.fixtures.reduce(
    (sum, f) =>
      sum +
      (typeof (f as { qty?: number }).qty === "number"
        ? (f as { qty: number }).qty
        : 1),
    0,
  );
  const totalDistros = input.power.distros.length;
  const totalSound = input.sound.length;
  const totalStages = input.stages.length;
  const totalLed = input.ledScreens.length;
  const totalCrew = input.crew.length;
  const summary = input.project.summary?.trim()
    ? escapeHtml(input.project.summary)
    : NS;

  return `
<section class="section">
  <h2>2 · Overview</h2>
  <p class="lead">${summary}</p>
  <div class="overview-grid">
    <div class="ov-card"><div class="ov-label">Total crew</div><div class="ov-value">${totalCrew}</div></div>
    <div class="ov-card"><div class="ov-label">Rigging systems</div><div class="ov-value">${input.systems.length}</div></div>
    <div class="ov-card"><div class="ov-label">Lighting fixtures</div><div class="ov-value">${totalFixtures}</div></div>
    <div class="ov-card"><div class="ov-label">Distros</div><div class="ov-value">${totalDistros}</div></div>
    <div class="ov-card"><div class="ov-label">Sound items</div><div class="ov-value">${totalSound}</div></div>
    <div class="ov-card"><div class="ov-label">Stages</div><div class="ov-value">${totalStages}</div></div>
    <div class="ov-card"><div class="ov-label">LED screens</div><div class="ov-value">${totalLed}</div></div>
  </div>
</section>`;
}

function renderSchedule(phases: ClientPackSchedulePhase[]): string {
  if (phases.length === 0) {
    return `<section class="section">
  <h2>3 · Schedule</h2>
  <p class="muted">${NS}</p>
</section>`;
  }
  const rows = phases
    .flatMap((phase) =>
      phase.segments.length === 0
        ? [
            `<tr><td><strong>${escapeHtml(phase.label)}</strong></td><td colspan="2" class="muted">${NS}</td></tr>`,
          ]
        : phase.segments.map((seg) => {
            const dateRange =
              seg.from && seg.to && seg.from !== seg.to
                ? `${fmtDate(seg.from)} → ${fmtDate(seg.to)}`
                : fmtDate(seg.from || seg.to);
            const time = fmtTimeRange(seg.fromTime, seg.toTime);
            return `<tr>
              <td><strong>${escapeHtml(phase.label)}</strong></td>
              <td>${dateRange}</td>
              <td>${time || `<span class="muted">—</span>`}</td>
            </tr>`;
          }),
    )
    .join("");
  return `
<section class="section">
  <h2>3 · Schedule</h2>
  <table>
    <thead><tr><th>Phase</th><th>Date</th><th>Time</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
</section>`;
}

function renderCrew(crew: CrewMember[]): string {
  if (crew.length === 0) {
    return `<section class="section">
  <h2>4 · Crew List</h2>
  <p class="muted">${NS}</p>
</section>`;
  }
  let totalRooms = 0;
  let totalNights = 0;
  const rows = crew
    .map((c) => {
      const hours = crewHours(c);
      const nights = c.hotelDates?.length ?? 0;
      if (nights > 0) {
        totalRooms += 1;
        totalNights += nights;
      }
      const hotelCell =
        nights > 0
          ? `🏨 ${nights}n`
          : c.needsHotel
            ? `hotel`
            : `<span class="muted">—</span>`;
      return `<tr>
        <td>${orNS(c.name)}</td>
        <td>${escapeHtml(c.role)}</td>
        <td>${orNS(c.callTime)}</td>
        <td>${orNS(c.offTime)}</td>
        <td class="num">${hours > 0 ? `${fmt(hours, 1)} h` : `<span class="muted">—</span>`}</td>
        <td>${hotelCell}</td>
        <td class="num">${c.dayRate > 0 ? escapeHtml(formatCrewDayRate(c.dayRate)) : `<span class="muted">—</span>`}</td>
      </tr>`;
    })
    .join("");
  const totals = computeCrewTotals(crew);
  const hotelTotal =
    totalRooms > 0
      ? `${totalRooms} room${totalRooms === 1 ? "" : "s"} · ${totalNights} night${totalNights === 1 ? "" : "s"}`
      : `<span class="muted">—</span>`;
  return `
<section class="section">
  <h2>4 · Crew List</h2>
  <table>
    <thead>
      <tr><th>Name</th><th>Role</th><th>Call</th><th>Off</th><th class="num">Hours</th><th>Hotel</th><th class="num">Day rate</th></tr>
    </thead>
    <tbody>${rows}</tbody>
    <tfoot>
      <tr class="row-total">
        <td colspan="4">Totals · ${totals.count} crew · ${fmt(totals.totalHours, 1)} h</td>
        <td class="num">${fmt(totals.totalHours, 1)} h</td>
        <td>${hotelTotal}</td>
        <td class="num">${escapeHtml(formatCrewDayRate(totals.totalCost))}</td>
      </tr>
    </tfoot>
  </table>
</section>`;
}

function rigSwlLevel(m: ClientPackSystem["metrics"]): RiskLevel {
  if (m.swl <= 0) return "safe";
  if (m.peak > m.swl) return "danger";
  if (m.peak / m.swl > 0.85) return "warn";
  return "safe";
}

function renderRigging(systems: ClientPackSystem[]): string {
  if (systems.length === 0) {
    return `<section class="section">
  <h2>5 · Rigging</h2>
  <p class="muted">${NS}</p>
</section>`;
  }
  const rows = systems
    .map((s) => {
      const m = s.metrics;
      const util = m.swl > 0 ? `${fmt((m.peak / m.swl) * 100, 0)} %` : "—";
      return `<tr>
        <td><strong>${orNS(s.name)}</strong></td>
        <td>${s.truss.length === 0 ? `<span class="muted">${NS}</span>` : escapeHtml(s.truss.join(", "))}</td>
        <td class="num">${s.pointCount}</td>
        <td>${orNS(s.hoistName)}</td>
        <td class="num">${fmtInt(m.static)} kg</td>
        <td class="num">${fmtInt(m.dynamic)} kg</td>
        <td class="num">${fmtInt(m.peak)} / ${m.swl > 0 ? fmtInt(m.swl) : "—"} kg</td>
        <td class="num">${util}</td>
        <td>${riskPill(rigSwlLevel(m))}</td>
      </tr>`;
    })
    .join("");
  return `
<section class="section">
  <h2>5 · Rigging</h2>
  <table>
    <thead>
      <tr>
        <th>System</th>
        <th>Trusses</th>
        <th class="num">Pts</th>
        <th>Motor</th>
        <th class="num">Static</th>
        <th class="num">Dynamic</th>
        <th class="num">Peak / SWL</th>
        <th class="num">Util</th>
        <th>Status</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
</section>`;
}

function powerLevel(d: DistroLoad): RiskLevel {
  if (d.feederUtilization > 1) return "danger";
  if (d.feederUtilization > 0.85) return "warn";
  if (d.distro.feedPhases === 3 && d.imbalance > 0.2) return "warn";
  return "safe";
}

function renderLighting(input: ClientPackInput): {
  html: string;
  loads: DistroLoad[];
  unpoweredFixtureCount: number;
} {
  const wattsLookup = makeFixtureWattsLookup(input.fixtures);
  const loads = input.power.distros.map((d) =>
    computeDistroLoad(d, wattsLookup),
  );
  const unpowered = computeUnpoweredFixtures(input.power.distros, input.fixtures);
  const totals = computeDistroPlanTotals(loads, unpowered);
  const unpoweredFixtureCount = totals.unpoweredFixtureCount;

  const fixtureCount = input.fixtures.reduce(
    (sum, f) =>
      sum +
      (typeof (f as { qty?: number }).qty === "number"
        ? (f as { qty: number }).qty
        : 1),
    0,
  );

  if (loads.length === 0 && fixtureCount === 0) {
    return {
      loads,
      unpoweredFixtureCount,
      html: `<section class="section">
  <h2>6 · Lighting (v2.2)</h2>
  <p class="muted">${NS}</p>
</section>`,
    };
  }

  const distroRows =
    loads.length === 0
      ? `<tr><td colspan="8" class="muted">${NS}</td></tr>`
      : loads
          .map((d) => {
            const phaseCells = (
              ["L1", "L2", "L3"] as const
            ).map((p) => {
              const ph = d.phases.find((x) => x.phase === p);
              return ph
                ? `<span class="phase-cell">${fmtInt(ph.watts)} W</span>`
                : `<span class="muted">—</span>`;
            });
            const dist = d.distro;
            return `<tr>
            <td><strong>${orNS(dist.name)}</strong></td>
            <td>${escapeHtml(`${dist.feedVoltage} V · ${dist.feedAmps} A · ${dist.feedPhases}ph`)}</td>
            <td class="num">${fmtInt(d.totalWatts)} W</td>
            <td class="num">${fmt(d.feederWorstAmps, 1)} A</td>
            <td class="num">${fmt(d.feederUtilization * 100, 0)} %</td>
            <td class="num">${dist.feedPhases === 3 ? `${fmt(d.imbalance * 100, 0)} %` : "—"}</td>
            <td class="phase-row">${phaseCells.join(" ")}</td>
            <td>${riskPill(powerLevel(d))}</td>
          </tr>`;
          })
          .join("");

  return {
    loads,
    unpoweredFixtureCount,
    html: `
<section class="section">
  <h2>6 · Lighting (v2.2)</h2>
  <div class="overview-grid lighting-summary">
    <div class="ov-card"><div class="ov-label">Fixtures</div><div class="ov-value">${fixtureCount}</div></div>
    <div class="ov-card"><div class="ov-label">Distros</div><div class="ov-value">${loads.length}</div></div>
    <div class="ov-card"><div class="ov-label">Total load</div><div class="ov-value">${fmtInt(totals.totalWatts)} <span class="ov-unit">W</span></div></div>
    <div class="ov-card"><div class="ov-label">Unpowered</div><div class="ov-value">${unpoweredFixtureCount}</div></div>
  </div>
  ${unpoweredFixtureCount > 0 ? `<div class="warn">⚠ ${unpoweredFixtureCount} fixture${unpoweredFixtureCount === 1 ? "" : "s"} not yet assigned to a distro channel.</div>` : ""}
  <table>
    <thead>
      <tr>
        <th>Distro</th>
        <th>Feed</th>
        <th class="num">Total W</th>
        <th class="num">Worst leg A</th>
        <th class="num">Util</th>
        <th class="num">Imbalance</th>
        <th>L1 · L2 · L3</th>
        <th>Status</th>
      </tr>
    </thead>
    <tbody>${distroRows}</tbody>
  </table>
</section>`,
  };
}

function renderSound(items: SoundItem[]): string {
  if (items.length === 0) {
    return `<section class="section">
  <h2>7 · Sound</h2>
  <p class="muted">${NS}</p>
</section>`;
  }
  const totals = computeSoundTotals(items);
  const rows = items
    .map(
      (it) => `<tr>
        <td>${orNS(it.name)}</td>
        <td>${escapeHtml(it.category)}</td>
        <td class="num">${it.qty}</td>
        <td class="num">${it.weightPerUnit > 0 ? `${fmt(it.qty * it.weightPerUnit, 1)} kg` : `<span class="muted">—</span>`}</td>
        <td class="num">${it.powerPerUnit > 0 ? `${fmtInt(it.qty * it.powerPerUnit)} W` : `<span class="muted">—</span>`}</td>
        <td>${it.notes ? escapeHtml(it.notes) : `<span class="muted">—</span>`}</td>
      </tr>`,
    )
    .join("");
  return `
<section class="section">
  <h2>7 · Sound</h2>
  <table>
    <thead>
      <tr>
        <th>Item</th><th>Category</th>
        <th class="num">Qty</th><th class="num">Weight</th>
        <th class="num">Power</th><th>Placement / notes</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
    <tfoot>
      <tr class="row-total">
        <td colspan="2">Totals · ${totals.rowCount} rows · ${totals.totalQty} pieces</td>
        <td class="num">${totals.totalQty}</td>
        <td class="num">${fmt(totals.totalWeight, 0)} kg</td>
        <td class="num">${fmtInt(totals.totalPower)} W</td>
        <td></td>
      </tr>
    </tfoot>
  </table>
</section>`;
}

function renderStage(stages: Stage[]): string {
  if (stages.length === 0) {
    return `<section class="section">
  <h2>8 · Stage</h2>
  <p class="muted">${NS}</p>
</section>`;
  }
  const calcs: StageCalc[] = stages.map((s) => computeStage(s));
  const totals = computeStageTotals(stages, calcs);
  const rows = stages
    .map((s, i) => {
      const c = calcs[i];
      return `<tr>
        <td><strong>${orNS(s.name)}</strong></td>
        <td>${fmt(s.width, 1)} × ${fmt(s.depth, 1)} m</td>
        <td class="num">${s.legHeightCm} cm</td>
        <td class="num">${fmt(c.areaM2, 1)} m²</td>
        <td class="num">${fmtInt(c.totalWeight)} kg</td>
        <td class="num">${fmtInt(c.loadCapacityKg)} kg <span class="muted">@ ${fmtInt(c.effectiveSwlPerM2)} kg/m²</span></td>
      </tr>`;
    })
    .join("");
  return `
<section class="section">
  <h2>8 · Stage</h2>
  <table>
    <thead>
      <tr>
        <th>Stage</th><th>Dimensions</th><th class="num">Leg height</th>
        <th class="num">Area</th><th class="num">Build weight</th><th class="num">Load capacity</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
    <tfoot>
      <tr class="row-total">
        <td colspan="3">Totals · ${totals.stageCount} stage${totals.stageCount === 1 ? "" : "s"}</td>
        <td class="num">${fmt(totals.totalArea, 1)} m²</td>
        <td class="num">${fmtInt(totals.totalWeight)} kg</td>
        <td class="num">${fmtInt(totals.totalLoadCapacityKg)} kg</td>
      </tr>
    </tfoot>
  </table>
</section>`;
}

function renderLed(input: ClientPackInput): string {
  if (input.ledScreens.length === 0) {
    return `<section class="section">
  <h2>9 · LED Screen</h2>
  <p class="muted">${NS}</p>
</section>`;
  }
  const totals = computeLedTotals(
    input.ledScreens,
    input.ledSettings,
    input.ledPanels,
  );
  // Resolve processor labels for a single screen. Per-screen processors
  // (`screen.processors`) take precedence — that's what the producer
  // explicitly assigned in the LED tab. If none are attached we fall
  // back to the global `ledSettings.processorId` so older projects that
  // never adopted per-screen processors still surface a sensible value.
  const globalProcName =
    findProcessor(input.ledSettings.processorId)?.name ?? null;
  const procLabelsFor = (screen: LedScreen): string => {
    const list = screen.processors ?? [];
    if (list.length === 0) return globalProcName ?? NS;
    return list
      .map((p) => {
        const name =
          NOVASTAR_PROCESSOR_CATALOG[p.model]?.name ?? p.model ?? "Processor";
        return p.label ? `${name} (${p.label})` : name;
      })
      .join(", ");
  };

  const rows = input.ledScreens
    .map((s) => {
      const panel = input.ledPanels.find((p) => p.key === s.panelKey);
      const panelLabel = panel?.name ?? s.panelKey ?? NS;
      const grid = `${s.panelsWide} × ${s.panelsTall}`;
      const panelCount = s.panelsWide * s.panelsTall;
      const px =
        panel && panel.pixelWidth && panel.pixelHeight
          ? `${s.panelsWide * panel.pixelWidth} × ${Math.round(
              s.panelsTall * panel.pixelHeight -
                (hasHalfLastRow(s) ? panel.pixelHeight / 2 : 0),
            )} px`
          : NS;
      const procLabels = procLabelsFor(s);
      return `<tr>
        <td><strong>${orNS(s.name)}</strong></td>
        <td>${escapeHtml(panelLabel)}</td>
        <td class="num">${grid}</td>
        <td class="num">${panelCount}</td>
        <td class="num">${px}</td>
        <td>${escapeHtml(procLabels)}</td>
      </tr>`;
    })
    .join("");

  const portStatus =
    input.ledSettings.portLimit > 0 && totals.pixels > 0
      ? riskPill(
          totals.portsNeeded > 8 ? "warn" : "safe",
          `${totals.portsNeeded} ports needed`,
        )
      : "";

  const pixelMaps = input.ledPixelMaps ?? {};
  const figures = input.ledScreens
    .map((s) => {
      const dataUrl = pixelMaps[s.id];
      if (!dataUrl) return "";
      const procLabels = procLabelsFor(s);
      const caption = procLabels && procLabels !== NS
        ? `${escapeHtml(s.name || "LED screen")} — pixel map · Processor: ${escapeHtml(procLabels)}`
        : `${escapeHtml(s.name || "LED screen")} — pixel map`;
      return `<figure class="led-figure">
        <img src="${dataUrl}" alt="${escapeHtml(s.name || "LED screen")} pixel map" />
        <figcaption>${caption}</figcaption>
      </figure>`;
    })
    .filter(Boolean)
    .join("");

  return `
<section class="section">
  <h2>9 · LED Screen</h2>
  <div class="overview-grid lighting-summary">
    <div class="ov-card"><div class="ov-label">Screens</div><div class="ov-value">${totals.screens}</div></div>
    <div class="ov-card"><div class="ov-label">Cabinets</div><div class="ov-value">${totals.panels}</div></div>
    <div class="ov-card"><div class="ov-label">Pixels</div><div class="ov-value">${fmtInt(totals.pixels)}</div></div>
    <div class="ov-card"><div class="ov-label">Peak power</div><div class="ov-value">${fmtInt(totals.powerW)} <span class="ov-unit">W</span></div></div>
  </div>
  ${portStatus ? `<p>Processor load: ${portStatus}</p>` : ""}
  <table>
    <thead>
      <tr>
        <th>Screen</th><th>Panel type</th>
        <th class="num">Grid (W×H)</th><th class="num">Cabinets</th><th class="num">Resolution</th>
        <th>Processor</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
  ${figures}
</section>`;
}

function renderRiskSummary(risks: RiskItem[]): string {
  if (risks.length === 0) {
    return `<section class="section">
  <h2>10 · Risk Summary</h2>
  <div class="risk-empty">${riskPill("safe", "No issues detected")} — all systems within limits and complete.</div>
</section>`;
  }
  // Sort danger first, then warn
  const sorted = [...risks].sort((a, b) => {
    const score = (l: RiskLevel) =>
      l === "danger" ? 0 : l === "warn" ? 1 : 2;
    return score(a.level) - score(b.level);
  });
  const rows = sorted
    .map(
      (r) => `<tr>
        <td>${riskPill(r.level)}</td>
        <td>${escapeHtml(r.area)}</td>
        <td>${escapeHtml(r.message)}</td>
      </tr>`,
    )
    .join("");
  return `
<section class="section">
  <h2>10 · Risk Summary</h2>
  <table>
    <thead><tr><th>Status</th><th>Area</th><th>Detail</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
</section>`;
}

function renderCostSummary(crew: CrewMember[]): string {
  const totals = computeCrewTotals(crew);
  if (crew.length === 0 || totals.totalCost === 0) {
    return `<section class="section">
  <h2>11 · Total Cost Summary</h2>
  <p class="muted">${NS}</p>
</section>`;
  }
  const byRoleRows = (
    Object.keys(totals.costsByRole) as Array<keyof typeof totals.costsByRole>
  )
    .filter((r) => totals.costsByRole[r] > 0 || totals.countsByRole[r] > 0)
    .map(
      (r) => `<tr>
        <td>${escapeHtml(String(r))}</td>
        <td class="num">${totals.countsByRole[r]}</td>
        <td class="num">${escapeHtml(formatCrewDayRate(totals.costsByRole[r]))}</td>
      </tr>`,
    )
    .join("");
  return `
<section class="section">
  <h2>11 · Total Cost Summary</h2>
  <table>
    <thead><tr><th>Department</th><th class="num">Headcount</th><th class="num">Cost (NOK)</th></tr></thead>
    <tbody>${byRoleRows}</tbody>
    <tfoot>
      <tr class="row-total">
        <td>Total crew cost</td>
        <td class="num">${totals.count}</td>
        <td class="num">${escapeHtml(formatCrewDayRate(totals.totalCost))}</td>
      </tr>
    </tfoot>
  </table>
  <p class="muted footnote">Day-rate totals only. Equipment, transport and venue costs are not tracked in this tool — confirm with EHS Production.</p>
</section>`;
}

// ─── Document assembly ────────────────────────────────────────────────

function renderHtml(input: ClientPackInput): string {
  const cover = renderCover(input.project, input.logoDataUrl);
  const overview = renderOverview(input);
  const schedule = renderSchedule(input.schedule);
  const crew = renderCrew(input.crew);
  const rigging = renderRigging(input.systems);
  const lighting = renderLighting(input);
  const sound = renderSound(input.sound);
  const stage = renderStage(input.stages);
  const led = renderLed(input);
  const risks = collectRisks(input, lighting.loads, lighting.unpoweredFixtureCount);
  const riskSummary = renderRiskSummary(risks);
  const costSummary = renderCostSummary(input.crew);

  const projTitle =
    input.project.eventName.trim() || input.project.venue.trim() || "Client Pack";
  const generatedAt = new Date().toLocaleString();

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>Client Pack — ${escapeHtml(projTitle)}</title>
<meta name="ehs-pdf-name" content="${escapeHtml(projTitle)} — Client Pack.pdf" />
<style>
  *, *::before, *::after { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body {
    font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
    color: #0f172a; background: #fff;
    padding: 24px; font-size: 13px; line-height: 1.45;
  }
  h1 { font-size: 28px; margin: 0 0 4px; }
  h2 {
    font-size: 16px; margin: 28px 0 10px;
    padding: 6px 12px; background: #fff7ed; color: #9a3412;
    border-left: 4px solid #f88000; border-radius: 0 4px 4px 0;
  }
  table { width: 100%; border-collapse: collapse; margin-bottom: 12px; font-size: 12px; }
  th, td { text-align: left; padding: 6px 8px; border-bottom: 1px solid #e2e8f0; vertical-align: top; }
  th { font-size: 11px; color: #64748b; text-transform: uppercase; letter-spacing: 0.04em; font-weight: 600; }
  td.num, th.num { text-align: right; font-variant-numeric: tabular-nums; }
  .row-total td { font-weight: 700; background: #f1f5f9; }
  .muted { color: #64748b; font-style: italic; }
  .lead { font-size: 14px; margin: 6px 0 14px; color: #334155; }
  .footnote { font-size: 11px; margin-top: 8px; }
  .warn {
    background: #fff7ed; border: 1px solid #fdba74; color: #9a3412;
    padding: 8px 12px; border-radius: 4px; margin: 8px 0; font-size: 12px;
  }
  .section { margin-bottom: 8px; page-break-inside: auto; }

  /* Cover */
  .cover {
    min-height: 80vh; padding: 60px 20px;
    border: 4px solid #f88000; border-radius: 8px;
    display: flex; flex-direction: column; align-items: center;
    justify-content: center; text-align: center;
    background: linear-gradient(180deg, #fff7ed 0%, #fff 60%);
    margin-bottom: 32px; page-break-after: always;
  }
  .cover-logo { max-height: 80px; margin-bottom: 24px; }
  .cover-brand { font-size: 13px; color: #9a3412; letter-spacing: 0.2em;
    text-transform: uppercase; font-weight: 600; margin-bottom: 12px; }
  .cover-title {
    font-size: 36px; font-weight: 800; color: #0f172a;
    margin: 0 0 32px; max-width: 720px;
  }
  .cover-meta {
    display: grid; grid-template-columns: repeat(2, minmax(200px, 280px));
    gap: 16px 32px; margin-bottom: 32px;
  }
  .cover-meta > div {
    display: flex; flex-direction: column; gap: 2px;
    border-top: 2px solid #f88000; padding-top: 8px; text-align: left;
  }
  .cover-meta-label { font-size: 11px; color: #64748b;
    text-transform: uppercase; letter-spacing: 0.06em; }
  .cover-meta-value { font-size: 16px; font-weight: 600; color: #0f172a; }
  .cover-footer { font-size: 11px; color: #94a3b8; margin-top: 24px; }

  /* Overview cards */
  .overview-grid {
    display: grid; grid-template-columns: repeat(4, 1fr);
    gap: 8px; margin: 12px 0 16px;
  }
  .ov-card {
    border: 1px solid #e2e8f0; border-radius: 6px;
    padding: 10px 12px; background: #fff;
  }
  .ov-label { font-size: 10px; text-transform: uppercase;
    letter-spacing: 0.04em; color: #64748b; }
  .ov-value { font-size: 18px; font-weight: 700; color: #0f172a; }
  .ov-unit { font-size: 12px; font-weight: 500; color: #64748b; margin-left: 2px; }
  .lighting-summary { grid-template-columns: repeat(4, 1fr); }

  /* LED pixel-map figures */
  .led-figure {
    margin: 14px 0 0; padding: 8px;
    border: 1px solid #e2e8f0; border-radius: 6px;
    background: #fff; break-inside: avoid; page-break-inside: avoid;
    text-align: center;
  }
  .led-figure img {
    display: block; max-width: 100%; height: auto;
    margin: 0 auto; border-radius: 4px;
  }
  .led-figure figcaption {
    margin-top: 6px; font-size: 11px; color: #64748b;
    letter-spacing: 0.02em;
  }

  /* Risk pill */
  .risk-pill {
    display: inline-block; padding: 2px 8px; border-radius: 999px;
    font-size: 11px; font-weight: 600; white-space: nowrap;
  }
  .risk-safe { background: #dcfce7; color: #166534; }
  .risk-warn { background: #fef3c7; color: #92400e; }
  .risk-danger { background: #fee2e2; color: #991b1b; }
  .risk-empty { padding: 12px; background: #f0fdf4;
    border: 1px solid #bbf7d0; border-radius: 6px; }

  /* Phase row in lighting table */
  .phase-row { white-space: nowrap; }
  .phase-cell {
    display: inline-block; padding: 1px 6px; margin-right: 4px;
    background: #eef2ff; color: #3730a3; border-radius: 999px;
    font-size: 10px; font-weight: 600;
  }

  /* Print bar */
  .print-bar {
    position: fixed; top: 12px; right: 12px;
    display: flex; gap: 8px; z-index: 10;
  }
  .print-bar button {
    padding: 8px 14px; font-size: 13px; font-weight: 600;
    border: 1px solid #cbd5e1; border-radius: 4px;
    background: #fff; cursor: pointer;
  }
  .print-bar .primary { background: #f88000; color: #fff; border-color: #f88000; }

  @media print {
    body { padding: 12mm; font-size: 11px; }
    .no-print { display: none !important; }
    .cover { min-height: 240mm; }
    table { break-inside: avoid; }
    .section { break-inside: auto; }
    h2 { page-break-after: avoid; }
  }
  @page { size: A4 portrait; margin: 12mm; }

  /* "Download PDF" mode — applied by App.tsx while html2canvas
     rasterises the popup at true A4 width (794px). Tightens cover
     and section spacing so each PDF page is properly filled. */
  body.pdf-export {
    padding: 14px 18px 24px;
    font-size: 11px; line-height: 1.4;
  }
  body.pdf-export h1 { font-size: 22px; }
  body.pdf-export h2 { font-size: 14px; }
  body.pdf-export .cover {
    min-height: 0; padding: 28px 20px 32px;
    margin-bottom: 18px; page-break-after: always;
  }
  body.pdf-export .cover-logo { max-height: 56px; margin-bottom: 14px; }
  body.pdf-export .cover-title { font-size: 26px; margin-bottom: 14px; }
  body.pdf-export .section {
    margin-bottom: 14px; padding: 12px 14px;
    page-break-inside: auto; break-inside: auto;
  }
  body.pdf-export table { font-size: 10.5px; margin: 6px 0; }
  body.pdf-export th, body.pdf-export td { padding: 4px 6px; }
  body.pdf-export th { font-size: 9px; }
  body.pdf-export .ov-card { padding: 8px 10px; }
  body.pdf-export .ov-value { font-size: 16px; }
  body.pdf-export .ov-label { font-size: 9px; }
  body.pdf-export .led-figure {
    margin-top: 10px; padding: 6px;
    page-break-inside: avoid; break-inside: avoid;
  }
  body.pdf-export .led-figure figcaption { font-size: 10px; }
</style>
</head>
<body>
<div class="print-bar no-print">
  <button id="ehs-download-pdf" class="primary">Download PDF</button>
  <button onclick="window.print()">Print</button>
  <button onclick="window.close()">Close</button>
</div>
<script>
(function () {
  var btn = document.getElementById('ehs-download-pdf');
  if (!btn) return;
  btn.addEventListener('click', function () {
    var opener = window.opener;
    var fn = opener && opener.__ehsDownloadPopupPdf;
    if (typeof fn !== 'function') {
      window.print();
      return;
    }
    var meta = document.querySelector('meta[name="ehs-pdf-name"]');
    var filename = (meta && meta.getAttribute('content')) || (document.title + '.pdf');
    var orig = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'Generating PDF…';
    Promise.resolve(fn(window, filename)).catch(function (err) {
      console.error(err);
      alert('Could not generate the PDF. Falling back to the browser print dialog.');
      window.print();
    }).then(function () {
      btn.disabled = false;
      btn.textContent = orig;
    });
  });
})();
</script>

${cover}
${overview}
${schedule}
${crew}
${rigging}
${lighting.html}
${sound}
${stage}
${led}
${riskSummary}
${costSummary}

<div class="muted footnote" style="margin-top:24px;text-align:center;border-top:1px solid #e2e8f0;padding-top:12px">
  Generated by EHS Production Tool · ${escapeHtml(generatedAt)} ·
  Risk indicators are advisory and based on data entered by the producer.
</div>

</body>
</html>`;
}

/** Open a printable Client Pack in a new browser window. The popup
 *  MUST be opened SYNCHRONOUSLY in the click handler (before any async
 *  work such as logo loading) and passed in as `targetWin`, otherwise
 *  pop-up blockers will swallow it. */
export function exportClientPack(input: ClientPackInput): { ok: boolean } {
  const html = renderHtml(input);
  const win = input.targetWin ?? window.open("", "_blank");
  if (!win) return { ok: false };
  win.document.open();
  win.document.write(html);
  win.document.close();
  return { ok: true };
}
