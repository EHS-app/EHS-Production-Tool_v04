import {
  computeDistroLoad,
  computeDistroPlanTotals,
  computeUnpoweredFixtures,
  makeFixtureWattsLookup,
  type DistroLoad,
  type FixtureRef,
  type PowerPlan,
} from "./power";
import { type CrewMember } from "./crew";
import { computeSoundTotals, type SoundItem } from "./sound";
import {
  computeStage,
  computeStageTotals,
  type Stage,
  type StageCalc,
} from "./stage";
import {
  computeLedTotals,
  type LedPanel,
  type LedScreen,
  type LedSettings,
} from "./led";
import type {
  ClientPackSystem,
  ClientPackSchedulePhase,
  ClientPackProject,
} from "./clientPackExport";

export type ShowSimulationInput = {
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
  logoDataUrl: string | null;
  targetWin: Window | null;
};

// ─── Formatting helpers ───────────────────────────────────────────────

const NS = "Not specified";

const fmt = (n: number, d = 1): string =>
  Number.isFinite(n)
    ? n.toLocaleString("en-US", { maximumFractionDigits: d })
    : NS;

const fmtInt = (n: number): string =>
  Number.isFinite(n)
    ? Math.round(n).toLocaleString("en-US", { maximumFractionDigits: 0 })
    : NS;

const escapeHtml = (s: string): string =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const orNS = (v: string | number | null | undefined): string => {
  if (v === null || v === undefined) return NS;
  if (typeof v === "string" && v.trim() === "") return NS;
  if (typeof v === "number" && !Number.isFinite(v)) return NS;
  return escapeHtml(String(v));
};

// ─── Risk model ───────────────────────────────────────────────────────

type RiskLevel = "safe" | "warn" | "danger";

type RiskItem = {
  level: RiskLevel;
  area: string;
  message: string;
};

const riskPill = (level: RiskLevel, label?: string): string => {
  const dot = level === "danger" ? "🔴" : level === "warn" ? "🟠" : "🟢";
  const text =
    label ??
    (level === "danger" ? "AT RISK" : level === "warn" ? "WARNING" : "READY");
  return `<span class="risk-pill risk-${level}">${dot} ${escapeHtml(text)}</span>`;
};

const worstLevel = (risks: RiskItem[]): RiskLevel => {
  if (risks.some((r) => r.level === "danger")) return "danger";
  if (risks.some((r) => r.level === "warn")) return "warn";
  return "safe";
};

// Per-discipline risk collectors

function riggingRisks(systems: ClientPackSystem[]): RiskItem[] {
  const out: RiskItem[] = [];
  for (const sys of systems) {
    const m = sys.metrics;
    if (m.swl > 0 && m.peak > m.swl) {
      out.push({
        level: "danger",
        area: `Rigging · ${sys.name}`,
        message: `Peak point ${fmtInt(m.peak)} kg over SWL ${fmtInt(m.swl)} kg (${fmt((m.peak / m.swl) * 100, 0)} %).`,
      });
    } else if (m.swl > 0 && m.peak / m.swl > 0.85) {
      out.push({
        level: "warn",
        area: `Rigging · ${sys.name}`,
        message: `Peak at ${fmt((m.peak / m.swl) * 100, 0)} % of SWL — review.`,
      });
    }
  }
  if (systems.length === 0) {
    out.push({
      level: "warn",
      area: "Rigging",
      message: "No rigging systems defined.",
    });
  }
  return out;
}

function lightingRisks(
  loads: DistroLoad[],
  unpoweredFixtureCount: number,
): RiskItem[] {
  const out: RiskItem[] = [];
  loads.forEach((d) => {
    const name = d.distro.name || "Distro";
    if (d.feederUtilization > 1) {
      out.push({
        level: "danger",
        area: `Power · ${name}`,
        message: `Feeder ${fmt(d.feederUtilization * 100, 0)} % — over breaker.`,
      });
    } else if (d.feederUtilization > 0.85) {
      out.push({
        level: "warn",
        area: `Power · ${name}`,
        message: `Feeder ${fmt(d.feederUtilization * 100, 0)} % — close to limit.`,
      });
    }
    if (d.distro.feedPhases === 3 && d.imbalance > 0.2) {
      out.push({
        level: "warn",
        area: `Power · ${name}`,
        message: `Phase imbalance ${fmt(d.imbalance * 100, 0)} % — re-balance L1/L2/L3.`,
      });
    }
  });
  if (unpoweredFixtureCount > 0) {
    out.push({
      level: "warn",
      area: "Power",
      message: `${unpoweredFixtureCount} fixture${unpoweredFixtureCount === 1 ? "" : "s"} not assigned to a distro channel.`,
    });
  }
  return out;
}

/** Capacity-aware LED risk:
 *  - if no processor is selected AND there are screens needing ports →
 *    warn (we cannot validate capacity);
 *  - if any single screen exceeds the configured pixels-per-output cap →
 *    critical. We deliberately don't duplicate the in-app processor
 *    capacity banner here — that's the source of truth for the chosen
 *    processor's published output count. */
function ledRisks(
  ledScreens: LedScreen[],
  ledSettings: LedSettings,
  ledPanels: LedPanel[],
): RiskItem[] {
  const out: RiskItem[] = [];
  if (ledScreens.length === 0) return out;
  const totals = computeLedTotals(ledScreens, ledSettings, ledPanels);
  if (ledSettings.portLimit > 0 && totals.largestScreenPixels > ledSettings.portLimit) {
    out.push({
      level: "danger",
      area: "LED",
      message: `Largest screen is ${fmtInt(totals.largestScreenPixels)} px — exceeds the ${fmtInt(ledSettings.portLimit)} px / output cap.`,
    });
  }
  if (!ledSettings.processorId && totals.portsNeeded > 0) {
    out.push({
      level: "warn",
      area: "LED",
      message: `${totals.portsNeeded} processor output${totals.portsNeeded === 1 ? "" : "s"} needed but no processor selected — capacity not validated.`,
    });
  }
  return out;
}

function stageRisks(stages: Stage[], stageCalcs: StageCalc[]): RiskItem[] {
  const out: RiskItem[] = [];
  stageCalcs.forEach((s, i) => {
    const name = stages[i]?.name || "Stage";
    if (
      s.loadCapacityKg > 0 &&
      s.totalWeight > 0 &&
      s.totalWeight > s.loadCapacityKg
    ) {
      out.push({
        level: "danger",
        area: `Stage · ${name}`,
        message: `Build weight ${fmtInt(s.totalWeight)} kg over capacity ${fmtInt(s.loadCapacityKg)} kg.`,
      });
    } else if (
      s.loadCapacityKg > 0 &&
      s.totalWeight / s.loadCapacityKg > 0.85
    ) {
      out.push({
        level: "warn",
        area: `Stage · ${name}`,
        message: `Build weight at ${fmt((s.totalWeight / s.loadCapacityKg) * 100, 0)} % of capacity.`,
      });
    }
  });
  return out;
}

function crewRisks(crew: CrewMember[]): RiskItem[] {
  const out: RiskItem[] = [];
  if (crew.length === 0) {
    out.push({
      level: "warn",
      area: "Crew",
      message: "No crew assigned.",
    });
    return out;
  }
  const missingCall = crew.filter((c) => !c.callTime);
  const missingName = crew.filter((c) => !c.name?.trim());
  if (missingCall.length > 0) {
    out.push({
      level: "warn",
      area: "Crew",
      message: `${missingCall.length} crew member${missingCall.length === 1 ? "" : "s"} missing call time.`,
    });
  }
  if (missingName.length > 0) {
    out.push({
      level: "warn",
      area: "Crew",
      message: `${missingName.length} crew slot${missingName.length === 1 ? "" : "s"} missing name.`,
    });
  }
  return out;
}

function scheduleRisks(schedule: ClientPackSchedulePhase[]): RiskItem[] {
  const out: RiskItem[] = [];
  if (schedule.length === 0) {
    out.push({
      level: "warn",
      area: "Schedule",
      message: "No schedule phases defined — load-in/show/load-out times missing.",
    });
    return out;
  }
  for (const phase of schedule) {
    const blank = phase.segments.filter((s) => !s.from && !s.to);
    if (blank.length > 0) {
      out.push({
        level: "warn",
        area: `Schedule · ${phase.label}`,
        message: `${blank.length} segment${blank.length === 1 ? "" : "s"} without dates — possible delay.`,
      });
    }
  }
  return out;
}

// ─── Discipline status blocks ─────────────────────────────────────────

function riggingBlock(systems: ClientPackSystem[]): string {
  if (systems.length === 0) {
    return `<div class="disc-block">
      <div class="disc-head">RIGGING ${riskPill("warn", "NO SYSTEMS")}</div>
      <p class="muted">${NS}</p>
    </div>`;
  }
  const rows = systems
    .map((sys) => {
      const m = sys.metrics;
      const util = m.swl > 0 ? (m.peak / m.swl) * 100 : 0;
      const lvl: RiskLevel =
        m.swl > 0 && m.peak > m.swl
          ? "danger"
          : m.swl > 0 && m.peak / m.swl > 0.85
            ? "warn"
            : "safe";
      return `<tr>
        <td><strong>${escapeHtml(sys.name)}</strong></td>
        <td>${escapeHtml(sys.hoistName || NS)}</td>
        <td class="num">${fmtInt(m.peak)} kg</td>
        <td class="num">${m.swl > 0 ? fmtInt(m.swl) + " kg" : NS}</td>
        <td class="num">${m.swl > 0 ? fmt(util, 0) + " %" : NS}</td>
        <td>${riskPill(lvl, lvl === "danger" ? "OVER SWL" : lvl === "warn" ? "WATCH" : "SAFE")}</td>
      </tr>`;
    })
    .join("");
  const overall = worstLevel(riggingRisks(systems));
  return `<div class="disc-block">
    <div class="disc-head">RIGGING — Load &amp; SWL ${riskPill(overall)}</div>
    <table>
      <thead><tr><th>System</th><th>Motor</th><th class="num">Peak</th><th class="num">SWL</th><th class="num">Util</th><th>Status</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  </div>`;
}

function lightingBlock(
  loads: DistroLoad[],
  unpowered: number,
  totals: { totalWatts: number; worstLegA: number; loaded: number },
): string {
  if (loads.length === 0) {
    return `<div class="disc-block">
      <div class="disc-head">LIGHTING (v2.2) — Power &amp; Phase ${riskPill("warn", "NO DISTROS")}</div>
      <p class="muted">${NS}</p>
    </div>`;
  }
  const rows = loads
    .map((d) => {
      const name = d.distro.name || "Distro";
      const lvl: RiskLevel =
        d.feederUtilization > 1
          ? "danger"
          : d.feederUtilization > 0.85
            ? "warn"
            : d.distro.feedPhases === 3 && d.imbalance > 0.2
              ? "warn"
              : "safe";
      const phaseCells =
        d.distro.feedPhases === 3
          ? `L1 ${fmtInt(d.phases[0]?.amps ?? 0)} A · L2 ${fmtInt(d.phases[1]?.amps ?? 0)} A · L3 ${fmtInt(d.phases[2]?.amps ?? 0)} A · Δ ${fmt(d.imbalance * 100, 0)} %`
          : `${fmtInt(d.phases[0]?.amps ?? 0)} A`;
      return `<tr>
        <td><strong>${escapeHtml(name)}</strong></td>
        <td class="num">${fmtInt(d.totalWatts)} W</td>
        <td class="num">${fmtInt(d.feederWorstAmps)} A</td>
        <td class="num">${fmt(d.feederUtilization * 100, 0)} %</td>
        <td class="phases">${phaseCells}</td>
        <td>${riskPill(lvl, lvl === "danger" ? "OVERLOAD" : lvl === "warn" ? "WATCH" : "OK")}</td>
      </tr>`;
    })
    .join("");
  const overall = worstLevel(lightingRisks(loads, unpowered));
  const unpoweredNote =
    unpowered > 0
      ? `<p class="warn-note">${unpowered} fixture${unpowered === 1 ? "" : "s"} not yet on a distro channel.</p>`
      : "";
  return `<div class="disc-block">
    <div class="disc-head">LIGHTING (v2.2) — Power &amp; Phase ${riskPill(overall)}</div>
    <p class="muted">Plan total ${fmtInt(totals.totalWatts)} W · worst leg ${fmtInt(totals.worstLegA)} A · ${loads.length} distro${loads.length === 1 ? "" : "s"}.</p>
    <table>
      <thead><tr><th>Distro</th><th class="num">Total W</th><th class="num">Worst leg</th><th class="num">Util</th><th>Phase balance</th><th>Status</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    ${unpoweredNote}
  </div>`;
}

function ledBlock(
  ledScreens: LedScreen[],
  ledSettings: LedSettings,
  ledPanels: LedPanel[],
): string {
  if (ledScreens.length === 0) {
    return `<div class="disc-block">
      <div class="disc-head">LED — Processor &amp; Panel Status ${riskPill("safe", "NONE PLANNED")}</div>
      <p class="muted">${NS}</p>
    </div>`;
  }
  const totals = computeLedTotals(ledScreens, ledSettings, ledPanels);
  // Status pill must agree with the per-phase risk panel + final
  // verdict — derive it from `ledRisks(...)` rather than a separate
  // hardcoded threshold.
  const ledRiskList = ledRisks(ledScreens, ledSettings, ledPanels);
  const lvl: RiskLevel = worstLevel(ledRiskList);
  const pillLabel =
    lvl === "danger"
      ? "OVER CAP"
      : lvl === "warn"
        ? "VERIFY PROCESSOR"
        : "OK";
  const rows = ledScreens
    .map((s) => {
      const panel = ledPanels.find((p) => p.key === s.panelKey);
      const panelLabel = panel?.name ?? s.panelKey ?? NS;
      const cabinets = s.panelsWide * s.panelsTall;
      return `<tr>
        <td><strong>${orNS(s.name)}</strong></td>
        <td>${escapeHtml(panelLabel)}</td>
        <td class="num">${s.panelsWide} × ${s.panelsTall}</td>
        <td class="num">${cabinets}</td>
      </tr>`;
    })
    .join("");
  return `<div class="disc-block">
    <div class="disc-head">LED — Processor &amp; Panel Status ${riskPill(lvl, pillLabel)}</div>
    <p class="muted">${totals.screens} screen${totals.screens === 1 ? "" : "s"} · ${totals.panels} cabinet${totals.panels === 1 ? "" : "s"} · ${fmtInt(totals.pixels)} px · processor needs ${totals.portsNeeded} port${totals.portsNeeded === 1 ? "" : "s"}.</p>
    <table>
      <thead><tr><th>Screen</th><th>Panel</th><th class="num">Grid</th><th class="num">Cabinets</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  </div>`;
}

function soundBlock(soundItems: SoundItem[]): string {
  if (soundItems.length === 0) {
    return `<div class="disc-block">
      <div class="disc-head">SOUND — Setup Status ${riskPill("safe", "NONE PLANNED")}</div>
      <p class="muted">${NS}</p>
    </div>`;
  }
  const totals = computeSoundTotals(soundItems);
  return `<div class="disc-block">
    <div class="disc-head">SOUND — Setup Status ${riskPill("safe", "READY")}</div>
    <p class="muted">${soundItems.length} line item${soundItems.length === 1 ? "" : "s"} · ${totals.totalQty} unit${totals.totalQty === 1 ? "" : "s"} · ${fmtInt(totals.totalWeight)} kg · ${fmtInt(totals.totalPower)} W.</p>
  </div>`;
}

function stageBlock(stages: Stage[], stageCalcs: StageCalc[]): string {
  if (stages.length === 0) {
    return `<div class="disc-block">
      <div class="disc-head">STAGE — Build Status ${riskPill("safe", "NONE PLANNED")}</div>
      <p class="muted">${NS}</p>
    </div>`;
  }
  const totals = computeStageTotals(stages, stageCalcs);
  const overall = worstLevel(stageRisks(stages, stageCalcs));
  const rows = stageCalcs
    .map((s, i) => {
      const name = stages[i]?.name || "";
      const util =
        s.loadCapacityKg > 0 ? (s.totalWeight / s.loadCapacityKg) * 100 : 0;
      const lvl: RiskLevel =
        s.loadCapacityKg > 0 && s.totalWeight > s.loadCapacityKg
          ? "danger"
          : s.loadCapacityKg > 0 && s.totalWeight / s.loadCapacityKg > 0.85
            ? "warn"
            : "safe";
      return `<tr>
        <td><strong>${orNS(name)}</strong></td>
        <td class="num">${fmt(s.areaM2, 1)} m²</td>
        <td class="num">${fmtInt(s.totalWeight)} kg</td>
        <td class="num">${s.loadCapacityKg > 0 ? fmtInt(s.loadCapacityKg) + " kg" : NS}</td>
        <td class="num">${s.loadCapacityKg > 0 ? fmt(util, 0) + " %" : NS}</td>
        <td>${riskPill(lvl, lvl === "danger" ? "OVER" : lvl === "warn" ? "WATCH" : "OK")}</td>
      </tr>`;
    })
    .join("");
  return `<div class="disc-block">
    <div class="disc-head">STAGE — Build Status ${riskPill(overall)}</div>
    <p class="muted">${totals.stageCount} stage${totals.stageCount === 1 ? "" : "s"} · ${fmt(totals.totalArea, 1)} m² · ${fmtInt(totals.totalWeight)} kg.</p>
    <table>
      <thead><tr><th>Stage</th><th class="num">Area</th><th class="num">Weight</th><th class="num">Capacity</th><th class="num">Util</th><th>Status</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  </div>`;
}

function crewBlock(crew: CrewMember[]): string {
  if (crew.length === 0) {
    return `<div class="disc-block">
      <div class="disc-head">CREW — Present / Missing ${riskPill("warn", "UNASSIGNED")}</div>
      <p class="muted">${NS}</p>
    </div>`;
  }
  const present = crew.filter((c) => c.callTime && c.name?.trim());
  const missing = crew.filter((c) => !c.callTime || !c.name?.trim());
  const lvl: RiskLevel = missing.length > 0 ? "warn" : "safe";
  const presentList = present
    .map(
      (c) =>
        `<li><strong>${escapeHtml(c.name)}</strong> · ${escapeHtml(c.role || NS)} · call ${escapeHtml(c.callTime || NS)}</li>`,
    )
    .join("");
  const missingList = missing
    .map(
      (c) =>
        `<li>${escapeHtml(c.name?.trim() || "(unnamed)")} · ${escapeHtml(c.role || NS)} — ${
          !c.name?.trim() ? "missing name" : "no call time"
        }</li>`,
    )
    .join("");
  return `<div class="disc-block">
    <div class="disc-head">CREW — Present / Missing ${riskPill(lvl, missing.length > 0 ? `${missing.length} MISSING` : "ALL PRESENT")}</div>
    <div class="crew-grid">
      <div>
        <div class="crew-sub">Present (${present.length})</div>
        ${present.length > 0 ? `<ul class="crew-list">${presentList}</ul>` : `<p class="muted">${NS}</p>`}
      </div>
      <div>
        <div class="crew-sub">Missing / incomplete (${missing.length})</div>
        ${missing.length > 0 ? `<ul class="crew-list missing">${missingList}</ul>` : `<p class="muted">None</p>`}
      </div>
    </div>
  </div>`;
}

// ─── Phase definitions ────────────────────────────────────────────────

type PhaseDef = {
  key: string;
  num: number;
  label: string;
  blurb: string;
  /** The discipline most under load during this phase. Used to call out
   *  the "primary focus" in the phase header — but every phase still
   *  renders all 6 discipline blocks and all 5 risk categories per the
   *  Show Simulation Engine spec. */
  focus: "rigging" | "lighting" | "led" | "sound" | "stage" | "crew" | "all";
};

const PHASES: PhaseDef[] = [
  {
    key: "loadin",
    num: 1,
    label: "Load-in",
    blurb:
      "Crew arrival, truck unload, gear staged on deck. Verify everyone is on-site and on call.",
    focus: "crew",
  },
  {
    key: "rigging",
    num: 2,
    label: "Rigging",
    blurb:
      "Motors flown, points set, trusses lifted to trim. Verify SWL on every system.",
    focus: "rigging",
  },
  {
    key: "lighting",
    num: 3,
    label: "Lighting setup",
    blurb:
      "Distros powered, fixtures rigged and addressed. Verify power load per distro and L1/L2/L3 phase balance.",
    focus: "lighting",
  },
  {
    key: "led",
    num: 4,
    label: "LED setup",
    blurb:
      "Cabinets assembled, processor mapped. Verify port load and panel count.",
    focus: "led",
  },
  {
    key: "sound",
    num: 5,
    label: "Sound setup",
    blurb: "PA flown, FOH/monitors rigged, lines run.",
    focus: "sound",
  },
  {
    key: "stage",
    num: 6,
    label: "Stage build",
    blurb:
      "Decks built, skirting + stairs in place. Verify stage build weight vs capacity.",
    focus: "stage",
  },
  {
    key: "testing",
    num: 7,
    label: "Testing",
    blurb:
      "All systems energized — first full-power check across rigging, lighting, LED, sound and stage.",
    focus: "all",
  },
  {
    key: "rehearsal",
    num: 8,
    label: "Rehearsal",
    blurb:
      "Production rehearsal at near-show levels. Phase balance and feeder utilization watched closely.",
    focus: "all",
  },
  {
    key: "show",
    num: 9,
    label: "Show",
    blurb:
      "Doors open, full draw on distros. Final risk check before audience walks in.",
    focus: "all",
  },
  {
    key: "loadout",
    num: 10,
    label: "Load-out",
    blurb:
      "Reverse the build — strike, pack and load trucks. Verify crew is rested and present.",
    focus: "crew",
  },
];

// ─── Phase rendering ──────────────────────────────────────────────────

type PhaseContext = {
  systems: ClientPackSystem[];
  loads: DistroLoad[];
  unpowered: number;
  lightingTotals: { totalWatts: number; worstLegA: number; loaded: number };
  ledScreens: LedScreen[];
  ledSettings: LedSettings;
  ledPanels: LedPanel[];
  sound: SoundItem[];
  stages: Stage[];
  stageCalcs: StageCalc[];
  crew: CrewMember[];
  schedule: ClientPackSchedulePhase[];
};

/** Per-spec: every phase must surface ALL 5 risk categories
 *  (SWL, power overload, phase imbalance >20%, missing crew, delays) so
 *  a critical issue surfaces in every phase context, not just the one
 *  most-related to it. */
function phaseRisks(ctx: PhaseContext): RiskItem[] {
  return [
    ...riggingRisks(ctx.systems),
    ...lightingRisks(ctx.loads, ctx.unpowered),
    ...ledRisks(ctx.ledScreens, ctx.ledSettings, ctx.ledPanels),
    ...stageRisks(ctx.stages, ctx.stageCalcs),
    ...crewRisks(ctx.crew),
    ...scheduleRisks(ctx.schedule),
  ];
}

const FOCUS_LABEL: Record<PhaseDef["focus"], string> = {
  rigging: "Rigging",
  lighting: "Lighting",
  led: "LED",
  sound: "Sound",
  stage: "Stage",
  crew: "Crew",
  all: "All systems",
};

function renderPhase(ctx: PhaseContext, phase: PhaseDef): string {
  const risks = phaseRisks(ctx);
  const overall = worstLevel(risks);
  const verdict =
    overall === "danger"
      ? "BLOCKED"
      : overall === "warn"
        ? "AT RISK"
        : "READY";

  // Per-spec: render every discipline at every phase (Rigging,
  // Lighting v2.2, LED, Sound, Stage, Crew). The phase blurb + focus
  // pill tell the reader what's most under load right now.
  const blocks: string[] = [
    riggingBlock(ctx.systems),
    lightingBlock(ctx.loads, ctx.unpowered, ctx.lightingTotals),
    ledBlock(ctx.ledScreens, ctx.ledSettings, ctx.ledPanels),
    soundBlock(ctx.sound),
    stageBlock(ctx.stages, ctx.stageCalcs),
    crewBlock(ctx.crew),
  ];

  const riskList =
    risks.length === 0
      ? `<div class="risk-empty">${riskPill("safe", "No issues")} — all systems within limits for this phase.</div>`
      : `<ul class="risk-list">${[...risks]
          .sort((a, b) => {
            const score = (l: RiskLevel) =>
              l === "danger" ? 0 : l === "warn" ? 1 : 2;
            return score(a.level) - score(b.level);
          })
          .map(
            (r) =>
              `<li>${riskPill(r.level)} <strong>${escapeHtml(r.area)}</strong> — ${escapeHtml(r.message)}</li>`,
          )
          .join("")}</ul>`;

  return `<section class="phase">
    <div class="phase-head">
      <div class="phase-num">Phase ${phase.num}</div>
      <h2>${escapeHtml(phase.label)} ${riskPill(overall, verdict)}</h2>
      <p class="phase-blurb">
        <span class="phase-focus">Focus: ${escapeHtml(FOCUS_LABEL[phase.focus])}</span>
        ${escapeHtml(phase.blurb)}
      </p>
    </div>
    ${blocks.join("\n")}
    <div class="phase-risks">
      <div class="risk-head">⚠️ Risks at this phase</div>
      ${riskList}
    </div>
  </section>`;
}

// ─── Final verdict ────────────────────────────────────────────────────

type Verdict = {
  readiness: number;
  label: "SHOW READY" | "SHOW AT RISK" | "SHOW FAILS";
  level: RiskLevel;
  biggest: RiskItem | null;
  dangerCount: number;
  warnCount: number;
};

/** All-discipline + schedule risk fold used to compute the final
 *  verdict. Identical to `phaseRisks` (the per-phase view), so a
 *  critical risk surfaced in any phase is the same one rolled up into
 *  the verdict — there is no hidden risk surface. */
function buildAllRisks(ctx: PhaseContext): RiskItem[] {
  return phaseRisks(ctx);
}

function computeVerdict(allRisks: RiskItem[]): Verdict {
  const dangerCount = allRisks.filter((r) => r.level === "danger").length;
  const warnCount = allRisks.filter((r) => r.level === "warn").length;
  const readiness = Math.max(0, 100 - 25 * dangerCount - 8 * warnCount);
  const label: Verdict["label"] =
    readiness >= 85
      ? "SHOW READY"
      : readiness >= 50
        ? "SHOW AT RISK"
        : "SHOW FAILS";
  const level: RiskLevel =
    readiness >= 85 ? "safe" : readiness >= 50 ? "warn" : "danger";
  const sorted = [...allRisks].sort((a, b) => {
    const score = (l: RiskLevel) =>
      l === "danger" ? 0 : l === "warn" ? 1 : 2;
    return score(a.level) - score(b.level);
  });
  return {
    readiness,
    label,
    level,
    biggest: sorted[0] ?? null,
    dangerCount,
    warnCount,
  };
}

function renderVerdict(verdict: Verdict): string {
  const verdictClass =
    verdict.level === "danger"
      ? "verdict-fail"
      : verdict.level === "warn"
        ? "verdict-risk"
        : "verdict-ready";
  const biggest = verdict.biggest
    ? `<div class="verdict-biggest">
         <span class="verdict-biggest-label">Biggest risk:</span>
         ${riskPill(verdict.biggest.level)}
         <strong>${escapeHtml(verdict.biggest.area)}</strong> — ${escapeHtml(verdict.biggest.message)}
       </div>`
    : `<div class="verdict-biggest">
         <span class="verdict-biggest-label">Biggest risk:</span>
         ${riskPill("safe", "NONE")} — no issues detected.
       </div>`;
  return `<section class="verdict ${verdictClass}">
    <div class="verdict-row">
      <div class="verdict-score">
        <div class="verdict-score-label">Show readiness</div>
        <div class="verdict-score-value">${verdict.readiness}<span class="verdict-score-pct">%</span></div>
      </div>
      <div class="verdict-tally">
        <div><span class="tally-num">${verdict.dangerCount}</span><span class="tally-label">🔴 Critical</span></div>
        <div><span class="tally-num">${verdict.warnCount}</span><span class="tally-label">🟠 Warnings</span></div>
      </div>
      <div class="verdict-final">
        <div class="verdict-final-label">Final verdict</div>
        <div class="verdict-final-value">${escapeHtml(verdict.label)}</div>
      </div>
    </div>
    ${biggest}
  </section>`;
}

// ─── Cover ────────────────────────────────────────────────────────────

function renderCover(
  project: ClientPackProject,
  logoDataUrl: string | null,
  verdict: Verdict,
): string {
  const title =
    project.eventName.trim() || project.venue.trim() || "Show Simulation";
  const dateRange =
    project.endDate && project.endDate !== project.date
      ? `${project.date} → ${project.endDate}`
      : project.date;
  const logoImg = logoDataUrl
    ? `<img src="${logoDataUrl}" class="cover-logo" alt="EHS" />`
    : "";
  return `<section class="cover">
    ${logoImg}
    <div class="cover-brand">EHS Production · Show Simulation Engine</div>
    <h1 class="cover-title">${escapeHtml(title)}</h1>
    <div class="cover-verdict ${verdict.level === "danger" ? "verdict-fail" : verdict.level === "warn" ? "verdict-risk" : "verdict-ready"}">
      <div class="cover-verdict-score">${verdict.readiness}<span class="cover-verdict-pct">%</span></div>
      <div class="cover-verdict-label">${escapeHtml(verdict.label)}</div>
    </div>
    <div class="cover-meta">
      <div><span class="cover-meta-label">Client</span><span class="cover-meta-value">${orNS(project.client)}</span></div>
      <div><span class="cover-meta-label">Venue</span><span class="cover-meta-value">${orNS(project.venue)}</span></div>
      <div><span class="cover-meta-label">Date</span><span class="cover-meta-value">${orNS(dateRange)}</span></div>
      <div><span class="cover-meta-label">Prepared by</span><span class="cover-meta-value">${orNS(project.preparedBy)}</span></div>
    </div>
    <div class="cover-footer">Generated ${escapeHtml(new Date().toLocaleString())}</div>
  </section>`;
}

// ─── Document assembly ────────────────────────────────────────────────

function renderHtml(input: ShowSimulationInput): string {
  const wattsLookup = makeFixtureWattsLookup(input.fixtures);
  const loads: DistroLoad[] = input.power.distros.map((d) =>
    computeDistroLoad(d, wattsLookup),
  );
  const unpoweredArr = computeUnpoweredFixtures(
    input.power.distros,
    input.fixtures,
  );
  const unpowered = unpoweredArr.length;
  const lightingTotals = computeDistroPlanTotals(loads, unpoweredArr);
  const worstLegA = loads.length
    ? Math.max(...loads.map((l) => l.feederWorstAmps))
    : 0;
  const stageCalcs = input.stages.map((s) => computeStage(s));

  const ctx: PhaseContext = {
    systems: input.systems,
    loads,
    unpowered,
    lightingTotals: {
      totalWatts: lightingTotals.totalWatts,
      worstLegA,
      loaded: loads.length,
    },
    ledScreens: input.ledScreens,
    ledSettings: input.ledSettings,
    ledPanels: input.ledPanels,
    sound: input.sound,
    stages: input.stages,
    stageCalcs,
    crew: input.crew,
    schedule: input.schedule,
  };

  const allRisks = buildAllRisks(ctx);
  const verdict = computeVerdict(allRisks);

  const cover = renderCover(input.project, input.logoDataUrl, verdict);
  const phasesHtml = PHASES.map((p) => renderPhase(ctx, p)).join("\n");
  const verdictHtml = renderVerdict(verdict);

  const projTitle =
    input.project.eventName.trim() ||
    input.project.venue.trim() ||
    "Show Simulation";

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>Show Simulation — ${escapeHtml(projTitle)}</title>
<style>
  *, *::before, *::after { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body {
    font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
    color: #0f172a; background: #fff;
    padding: 24px 24px 48px; font-size: 13px; line-height: 1.45;
  }
  h1 { font-size: 28px; margin: 0 0 4px; }
  h2 {
    font-size: 16px; margin: 0;
    padding: 0; background: transparent; border: 0; color: #0f172a;
  }
  table { width: 100%; border-collapse: collapse; margin: 8px 0; font-size: 12px; }
  th, td { text-align: left; padding: 5px 8px; border-bottom: 1px solid #e2e8f0; vertical-align: top; }
  th { font-size: 10px; color: #64748b; text-transform: uppercase; letter-spacing: 0.04em; font-weight: 600; }
  td.num, th.num { text-align: right; font-variant-numeric: tabular-nums; }
  .muted { color: #64748b; }
  .warn-note { color: #9a3412; font-size: 12px; margin: 6px 0 0; }

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
  .cover-brand {
    font-size: 13px; color: #9a3412; letter-spacing: 0.2em;
    text-transform: uppercase; font-weight: 600; margin-bottom: 12px;
  }
  .cover-title {
    font-size: 36px; font-weight: 800; color: #0f172a;
    margin: 0 0 24px; max-width: 720px;
  }
  .cover-verdict {
    display: flex; flex-direction: column; align-items: center;
    padding: 20px 40px; border-radius: 12px; margin-bottom: 32px;
    border: 3px solid; min-width: 280px;
  }
  .cover-verdict.verdict-ready { background: #f0fdf4; border-color: #22c55e; color: #166534; }
  .cover-verdict.verdict-risk { background: #fff7ed; border-color: #f97316; color: #9a3412; }
  .cover-verdict.verdict-fail { background: #fef2f2; border-color: #ef4444; color: #991b1b; }
  .cover-verdict-score { font-size: 56px; font-weight: 800; line-height: 1; }
  .cover-verdict-pct { font-size: 24px; font-weight: 600; margin-left: 4px; }
  .cover-verdict-label { font-size: 16px; font-weight: 700; letter-spacing: 0.1em; margin-top: 6px; }
  .cover-meta {
    display: grid; grid-template-columns: repeat(2, minmax(200px, 280px));
    gap: 16px 32px; margin-bottom: 32px;
  }
  .cover-meta > div {
    display: flex; flex-direction: column; gap: 2px;
    border-top: 2px solid #f88000; padding-top: 8px; text-align: left;
  }
  .cover-meta-label {
    font-size: 11px; color: #64748b;
    text-transform: uppercase; letter-spacing: 0.06em;
  }
  .cover-meta-value { font-size: 16px; font-weight: 600; color: #0f172a; }
  .cover-footer { font-size: 11px; color: #94a3b8; margin-top: 16px; }

  /* Phase block */
  .phase {
    border: 1px solid #e2e8f0; border-radius: 8px;
    margin-bottom: 18px; padding: 16px 18px;
    page-break-inside: avoid;
  }
  .phase-head { border-bottom: 2px solid #f88000; padding-bottom: 10px; margin-bottom: 12px; }
  .phase-num {
    font-size: 11px; color: #9a3412; font-weight: 700;
    letter-spacing: 0.12em; text-transform: uppercase; margin-bottom: 2px;
  }
  .phase-head h2 {
    display: flex; align-items: center; gap: 12px;
    font-size: 22px; font-weight: 800;
  }
  .phase-blurb {
    font-size: 12px; color: #475569; margin: 6px 0 0; font-style: italic;
  }
  .phase-focus {
    display: inline-block;
    font-style: normal;
    font-weight: 700;
    font-size: 10px;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: #9a3412;
    background: #fff7ed;
    border: 1px solid #fed7aa;
    border-radius: 999px;
    padding: 2px 8px;
    margin-right: 8px;
    vertical-align: middle;
  }
  .disc-block { margin-top: 14px; }
  .disc-head {
    font-size: 11px; font-weight: 700; letter-spacing: 0.08em;
    text-transform: uppercase; color: #334155;
    display: flex; align-items: center; gap: 10px;
    border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; margin-bottom: 6px;
  }
  .phases { font-size: 11px; color: #475569; }
  .crew-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
  .crew-sub {
    font-size: 11px; font-weight: 600; color: #475569;
    text-transform: uppercase; letter-spacing: 0.04em; margin-bottom: 4px;
  }
  .crew-list { margin: 0; padding-left: 18px; font-size: 12px; }
  .crew-list.missing li { color: #9a3412; }

  /* Risk pill */
  .risk-pill {
    display: inline-block; padding: 2px 8px; border-radius: 999px;
    font-size: 11px; font-weight: 700; white-space: nowrap;
  }
  .risk-safe { background: #dcfce7; color: #166534; }
  .risk-warn { background: #fef3c7; color: #92400e; }
  .risk-danger { background: #fee2e2; color: #991b1b; }
  .risk-empty {
    padding: 10px 12px; background: #f0fdf4; border: 1px solid #bbf7d0;
    border-radius: 6px; font-size: 12px;
  }

  .phase-risks { margin-top: 14px; padding-top: 10px; border-top: 1px dashed #cbd5e1; }
  .risk-head {
    font-size: 12px; font-weight: 700; color: #9a3412;
    margin-bottom: 6px; letter-spacing: 0.04em; text-transform: uppercase;
  }
  .risk-list { margin: 0; padding-left: 0; list-style: none; }
  .risk-list li {
    padding: 4px 0; font-size: 12px;
    border-bottom: 1px dotted #e2e8f0;
  }
  .risk-list li:last-child { border-bottom: 0; }

  /* Final verdict band */
  .verdict {
    margin-top: 24px; padding: 20px 24px; border-radius: 8px;
    border: 3px solid; page-break-inside: avoid;
  }
  .verdict.verdict-ready { background: #f0fdf4; border-color: #22c55e; color: #166534; }
  .verdict.verdict-risk { background: #fff7ed; border-color: #f97316; color: #9a3412; }
  .verdict.verdict-fail { background: #fef2f2; border-color: #ef4444; color: #991b1b; }
  .verdict-row {
    display: grid; grid-template-columns: 1fr 1fr 1fr;
    gap: 24px; align-items: center; margin-bottom: 16px;
  }
  .verdict-score-label, .verdict-final-label {
    font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em;
    font-weight: 700; opacity: 0.75;
  }
  .verdict-score-value { font-size: 48px; font-weight: 800; line-height: 1; }
  .verdict-score-pct { font-size: 22px; font-weight: 600; margin-left: 4px; }
  .verdict-tally { display: flex; gap: 24px; justify-content: center; }
  .verdict-tally > div { display: flex; flex-direction: column; align-items: center; }
  .tally-num { font-size: 32px; font-weight: 800; line-height: 1; }
  .tally-label { font-size: 11px; font-weight: 600; letter-spacing: 0.04em; }
  .verdict-final-value { font-size: 28px; font-weight: 800; line-height: 1.1; letter-spacing: 0.04em; }
  .verdict-biggest {
    font-size: 13px; padding-top: 12px;
    border-top: 1px solid currentColor; opacity: 0.95;
  }
  .verdict-biggest-label { font-weight: 700; margin-right: 6px; }

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
    .phase { break-inside: avoid; }
    .verdict { break-inside: avoid; }
  }
  @page { size: A4 portrait; margin: 12mm; }
</style>
</head>
<body>
<div class="print-bar no-print">
  <button onclick="window.print()" class="primary">Print / Save as PDF</button>
  <button onclick="window.close()">Close</button>
</div>

${cover}
${phasesHtml}
${verdictHtml}

<div class="muted" style="margin-top:24px;text-align:center;font-size:11px;border-top:1px solid #e2e8f0;padding-top:12px">
  Generated by EHS Production Tool · Show Simulation Engine ·
  Risk indicators are advisory and based on data entered by the producer.
</div>

</body>
</html>`;
}

/** Open a printable Show Simulation report in a new browser window.
 *  The popup MUST be opened SYNCHRONOUSLY in the click handler (before
 *  any async work such as logo loading) and passed in as `targetWin`,
 *  otherwise pop-up blockers will swallow it. */
export function exportShowSimulation(
  input: ShowSimulationInput,
): { ok: boolean } {
  const html = renderHtml(input);
  const win = input.targetWin ?? window.open("", "_blank");
  if (!win) return { ok: false };
  win.document.open();
  win.document.write(html);
  win.document.close();
  return { ok: true };
}
