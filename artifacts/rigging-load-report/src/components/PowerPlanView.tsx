/** Distro-centric Power Plan view — see lib/power.ts for the data model.
 *
 *  Layout:
 *    PlanSummaryStrip
 *    DistroList → one DistroCard per HOT
 *      header (name / source / preset / feeds-trusses)
 *      feeder summary (per-phase amps + imbalance + feeder utilisation)
 *      warnings + advisory suggestions
 *      ChannelGrid (one row per channel)
 *        breaker badge · drop list · inline AddDrop form · channel bar
 *    UnpoweredFixturesPanel (only if there are leftovers)
 *    LegacyCircuitsPanel (only if legacy v1 circuits exist) */

import { useEffect, useMemo, useState } from "react";
import { NumberField } from "./NumberField";
import {
  applyPresetToDistro,
  computeCircuitLoad,
  computeDistroLoad,
  computeDistroPlanTotals,
  computeDistroSuggestions,
  computeDistroTrussSplit,
  computeTrussPowerSummary,
  computeUnpoweredFixtures,
  DEFAULT_CHANNEL_MAPPING,
  DISTRO_PRESETS,
  DISTRO_PRESET_ORDER,
  DROP_CABLE_KINDS,
  makeFixtureWattsLookup,
  POWER_DERATE_FACTOR,
  POWER_PHASES,
  severityForRatio,
  SINGLE_PHASE_MAPPING,
  suggestPowerLayout,
  type Channel,
  type ChannelLoad,
  type ChannelMapping,
  type Distro,
  type DistroLoad,
  type DistroPresetId,
  type DistroSuggestion,
  type DistroTrussShare,
  type Drop,
  type DropCableKind,
  type FixtureRef,
  type LoadSeverity,
  type PowerCircuit,
  type PowerItem,
  type PowerPhase,
  type PowerPlan,
  type SuggestedDistro,
  type TrussPowerRow,
} from "../lib/power";

type SystemLite = { id: string; name: string };

type Props = {
  plan: PowerPlan;
  fixtures: FixtureRef[];
  systems: SystemLite[];

  // Distro v2 handlers
  onAddDistro: (presetId?: DistroPresetId) => void;
  onUpdateDistro: (
    id: string,
    patch: Partial<Omit<Distro, "channels" | "channelMapping" | "id">>,
  ) => void;
  onRemoveDistro: (id: string) => void;
  onResetDistro: (id: string) => void;
  onExportPowerPlan: () => void;
  powerExportToast: string | null;
  onDismissPowerExportToast: () => void;
  onApplyDistroPreset: (id: string, presetId: DistroPresetId) => void;
  onUpdateDistroChannelMapping: (id: string, mapping: ChannelMapping) => void;
  onUpdateDistroChannel: (
    distroId: string,
    channelIndex: number,
    patch: Partial<Omit<Channel, "drops" | "id" | "index">>,
  ) => void;
  onAddDrop: (
    distroId: string,
    channelIndex: number,
    drop: { trussId: string; fixtureRef: string; qty: number; cable?: DropCableKind },
  ) => void;
  onUpdateDrop: (
    distroId: string,
    channelIndex: number,
    dropId: string,
    patch: Partial<Omit<Drop, "id">>,
  ) => void;
  onRemoveDrop: (distroId: string, channelIndex: number, dropId: string) => void;
  onApplyDistroSuggestion: (distroId: string, suggestion: DistroSuggestion) => void;
  onApplyPowerLayoutSuggestion: (suggested: SuggestedDistro[]) => void;

  // Legacy v1 handlers (kept for the read-only Legacy panel)
  onAddCircuit: () => void;
  onUpdateCircuit: (id: string, patch: Partial<Omit<PowerCircuit, "items">>) => void;
  onRemoveCircuit: (id: string) => void;
  onAddItem: (circuitId: string, phase?: PowerPhase) => void;
  onAddItemFromLibrary?: (circuitId: string, phase: PowerPhase) => void;
  onUpdateItem: (
    circuitId: string,
    itemId: string,
    patch: Partial<PowerItem>,
  ) => void;
  onRemoveItem: (circuitId: string, itemId: string) => void;
  onDuplicateItem: (circuitId: string, itemId: string) => void;
};

const fmtNum = (n: number, d = 1) =>
  n.toLocaleString("en-US", { maximumFractionDigits: d });
const fmtInt = (n: number) =>
  n.toLocaleString("en-US", { maximumFractionDigits: 0 });
const fmtPct = (ratio: number) =>
  `${(ratio * 100).toLocaleString("en-US", { maximumFractionDigits: 0 })}%`;

function severityClass(sev: LoadSeverity, base: string): string {
  if (sev === "over") return `${base} ${base}--over`;
  if (sev === "warn") return `${base} ${base}--warn`;
  return base;
}

export function PowerPlanView(props: Props) {
  const { plan, fixtures, systems } = props;

  const wattsLookup = useMemo(
    () => makeFixtureWattsLookup(fixtures),
    [fixtures],
  );
  const distroLoads = useMemo(
    () => plan.distros.map((d) => computeDistroLoad(d, wattsLookup)),
    [plan.distros, wattsLookup],
  );
  const unpowered = useMemo(
    () => computeUnpoweredFixtures(plan.distros, fixtures),
    [plan.distros, fixtures],
  );
  const totals = useMemo(
    () => computeDistroPlanTotals(distroLoads, unpowered),
    [distroLoads, unpowered],
  );
  const trussRows = useMemo(
    () => computeTrussPowerSummary(plan.distros, systems, fixtures, wattsLookup),
    [plan.distros, systems, fixtures, wattsLookup],
  );
  const suggestedLayout = useMemo(
    () => suggestPowerLayout(unpowered, systems),
    [unpowered, systems],
  );

  const [autoSuggestOpen, setAutoSuggestOpen] = useState(false);

  return (
    <section className="power-plan">
      <div className="power-plan-head">
        <div>
          <h2>Power Plan</h2>
          <p className="power-plan-sub">
            Add a distro for each physical power source (e.g. HOT 1 = CEE 32 A
            3-phase). Pick which truss(es) it feeds, then drop fixtures from
            the Lighting list onto its channels. Per-channel and per-phase
            amps update live, with 80 % derate and phase-imbalance warnings.
          </p>
        </div>
        <div className="power-plan-meta">
          <span className="badge">
            <strong>{totals.distroCount}</strong>{" "}
            {totals.distroCount === 1 ? "distro" : "distros"}
          </span>
          <span className="badge">
            <strong>{fmtInt(totals.totalWatts)}</strong> W planned
          </span>
          {totals.distroCount > 0 && (
            <>
              <span className="badge">
                worst feeder <strong>{fmtPct(totals.worstFeederUtilization)}</strong>{" "}
                <span className="badge-sub">{totals.worstFeederLabel}</span>
              </span>
              <span className="badge">
                worst channel <strong>{fmtPct(totals.worstChannelUtilization)}</strong>{" "}
                <span className="badge-sub">{totals.worstChannelLabel}</span>
              </span>
            </>
          )}
          {totals.overloadedDistros > 0 && (
            <span className="badge badge-danger">
              <strong>{totals.overloadedDistros}</strong> over capacity
            </span>
          )}
          {totals.warningDistros > 0 && (
            <span className="badge badge-warn">
              <strong>{totals.warningDistros}</strong> near limit
            </span>
          )}
          {totals.imbalancedDistros > 0 && (
            <span className="badge badge-warn">
              <strong>{totals.imbalancedDistros}</strong> imbalanced
            </span>
          )}
          {totals.unpoweredFixtureCount > 0 && (
            <span className="badge badge-warn">
              <strong>{totals.unpoweredFixtureCount}</strong> fixtures not powered
            </span>
          )}
          <button
            type="button"
            className="btn btn-soft btn-sm"
            onClick={() => setAutoSuggestOpen(true)}
            disabled={unpowered.length === 0}
            title={
              unpowered.length === 0
                ? "No unpowered fixtures — nothing to auto-suggest"
                : "Propose distros for the trusses with unpowered fixtures"
            }
          >
            ⚡ Auto-suggest layout
          </button>
          {/* Mirrors the "Export" button on Stage Report cards. Opens a
              new tab with a printable / JSON crew manifest. */}
          <button
            type="button"
            className="btn btn-tab-action"
            onClick={props.onExportPowerPlan}
            disabled={plan.distros.length === 0}
            title={
              plan.distros.length === 0
                ? "Add at least one distro before exporting"
                : "Open a printable Power Plan crew manifest (PDF + JSON)"
            }
          >
            Export
          </button>
        </div>
      </div>

      {/* Transient toast — auto-dismisses after 4 s. The state lives on
          the App level so the export handler can fire it without
          re-rendering a separate provider. */}
      <PowerExportToast
        message={props.powerExportToast}
        onDismiss={props.onDismissPowerExportToast}
      />
      

      {/* Truss-first workflow layer: producers think trusses → fixtures →
          power. This panel surfaces that mental model above the distro
          editor so the rig drives the power, not the other way around. */}
      {trussRows.length > 0 && (
        <TrussPowerPanel
          rows={trussRows}
          unpowered={unpowered}
          onAutoAssignTruss={(trussId) => {
            const trussUnpowered = unpowered.filter((u) => u.trussId === trussId);
            if (trussUnpowered.length === 0) return;
            const proposals = suggestPowerLayout(trussUnpowered, systems);
            if (proposals.length > 0) {
              props.onApplyPowerLayoutSuggestion(proposals);
            }
          }}
        />
      )}

      {plan.distros.length === 0 ? (
        <div className="led-empty">
          No distros yet — add your first power source. The default preset is
          a CEE 32 A 3-phase rack with six 16 A breakers (Ch1+Ch4&nbsp;→&nbsp;L1,
          Ch2+Ch5&nbsp;→&nbsp;L2, Ch3+Ch6&nbsp;→&nbsp;L3).
          <div style={{ marginTop: 12 }}>
            <button
              className="btn btn-primary"
              onClick={() => props.onAddDistro()}
            >
              + Add distro
            </button>
          </div>
        </div>
      ) : (
        <>
          {plan.distros.map((d) => {
            const load = distroLoads.find((l) => l.distro.id === d.id);
            if (!load) return null;
            return (
              <DistroCard
                key={d.id}
                load={load}
                systems={systems}
                fixtures={fixtures}
                wattsLookup={wattsLookup}
                onUpdate={(patch) => props.onUpdateDistro(d.id, patch)}
                onRemove={() => props.onRemoveDistro(d.id)}
                onReset={() => props.onResetDistro(d.id)}
                onApplyPreset={(presetId) =>
                  props.onApplyDistroPreset(d.id, presetId)
                }
                onUpdateMapping={(m) =>
                  props.onUpdateDistroChannelMapping(d.id, m)
                }
                onUpdateChannel={(idx, patch) =>
                  props.onUpdateDistroChannel(d.id, idx, patch)
                }
                onAddDrop={(idx, drop) => props.onAddDrop(d.id, idx, drop)}
                onUpdateDrop={(idx, dropId, patch) =>
                  props.onUpdateDrop(d.id, idx, dropId, patch)
                }
                onRemoveDrop={(idx, dropId) =>
                  props.onRemoveDrop(d.id, idx, dropId)
                }
                onApplySuggestion={(s) =>
                  props.onApplyDistroSuggestion(d.id, s)
                }
              />
            );
          })}

          <div className="power-add-distro-row">
            <button
              className="btn btn-primary"
              onClick={() => props.onAddDistro()}
            >
              + Add distro
            </button>
            <PresetQuickAdd onPick={(id) => props.onAddDistro(id)} />
          </div>
        </>
      )}

      {unpowered.length > 0 && (
        <UnpoweredFixturesPanel unpowered={unpowered} systems={systems} />
      )}

      {plan.circuits.length > 0 && (
        <LegacyCircuitsPanel
          circuits={plan.circuits}
          onRemoveCircuit={props.onRemoveCircuit}
        />
      )}

      {autoSuggestOpen && (
        <AutoSuggestModal
          suggested={suggestedLayout}
          onApply={(picks) => {
            props.onApplyPowerLayoutSuggestion(picks);
            setAutoSuggestOpen(false);
          }}
          onClose={() => setAutoSuggestOpen(false)}
        />
      )}
    </section>
  );
}

// ──────────────────────────────────────────────────────────────────────
// Quick-add preset menu
// ──────────────────────────────────────────────────────────────────────

function PresetQuickAdd({
  onPick,
}: {
  onPick: (id: DistroPresetId) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="power-preset-menu">
      <button
        type="button"
        className="btn btn-soft"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        + Add… ▾
      </button>
      {open && (
        <div className="power-preset-menu-list" role="menu">
          {DISTRO_PRESET_ORDER.map((id) => (
            <button
              key={id}
              type="button"
              className="power-preset-menu-item"
              onClick={() => {
                onPick(id);
                setOpen(false);
              }}
              role="menuitem"
            >
              {DISTRO_PRESETS[id].label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────
// Distro card
// ──────────────────────────────────────────────────────────────────────

type DistroCardProps = {
  load: DistroLoad;
  systems: SystemLite[];
  fixtures: FixtureRef[];
  wattsLookup: ReturnType<typeof makeFixtureWattsLookup>;
  onUpdate: (
    patch: Partial<Omit<Distro, "channels" | "channelMapping" | "id">>,
  ) => void;
  onRemove: () => void;
  onReset: () => void;
  onApplyPreset: (presetId: DistroPresetId) => void;
  onUpdateMapping: (mapping: ChannelMapping) => void;
  onUpdateChannel: (
    channelIndex: number,
    patch: Partial<Omit<Channel, "drops" | "id" | "index">>,
  ) => void;
  onAddDrop: (
    channelIndex: number,
    drop: { trussId: string; fixtureRef: string; qty: number; cable?: DropCableKind },
  ) => void;
  onUpdateDrop: (
    channelIndex: number,
    dropId: string,
    patch: Partial<Omit<Drop, "id">>,
  ) => void;
  onRemoveDrop: (channelIndex: number, dropId: string) => void;
  onApplySuggestion: (suggestion: DistroSuggestion) => void;
};

function DistroCard(props: DistroCardProps) {
  const { load, systems } = props;
  const distro = load.distro;
  const sevForCard = load.feederStatus === "over"
    ? "over"
    : (load.hasChannelOverload ? "over" : (load.feederStatus === "warn" || load.hasChannelWarning ? "warn" : "ok"));

  const systemNameById = new Map(systems.map((s) => [s.id, s.name]));
  const suggestions = useMemo(() => computeDistroSuggestions(load), [load]);
  const trussSplit = useMemo(
    () => computeDistroTrussSplit(load),
    [load],
  );
  const topSuggestion = suggestions[0];
  const restSuggestions = suggestions.slice(1);
  const [mappingOpen, setMappingOpen] = useState(false);

  // Accordion-style collapse for the whole distro card. Default state
  // depends on whether the distro is carrying any load — empty distros
  // (0 W) auto-collapse to reduce visual noise on a fresh project.
  // Once the user toggles, we honour their choice and don't re-derive
  // from load (which would feel "fighting back" if they expand a 0 W
  // distro to add fixtures).
  const [collapsed, setCollapsed] = useState<boolean>(load.totalWatts === 0);
  const cardClass = severityClass(
    sevForCard,
    `led-card power-distro${collapsed ? " power-distro--collapsed" : ""}`,
  );

  return (
    <section className={cardClass}>
      {/* Header — always visible. The chevron toggles the body. */}
      <div className="power-distro-head">
        <button
          type="button"
          className="power-distro-chevron"
          onClick={() => setCollapsed((v) => !v)}
          aria-expanded={!collapsed}
          aria-label={
            collapsed ? `Expand ${distro.name || "distro"}` : `Collapse ${distro.name || "distro"}`
          }
          title={collapsed ? "Expand distro" : "Collapse distro"}
        >
          <span aria-hidden="true">{collapsed ? "▸" : "▾"}</span>
        </button>
        <div className="power-distro-id">
          <input
            className="led-input power-distro-name"
            type="text"
            value={distro.name}
            onChange={(e) => props.onUpdate({ name: e.target.value })}
            placeholder="HOT 1"
            aria-label="Distro name"
          />
          <input
            className="led-input"
            type="text"
            value={distro.source}
            onChange={(e) => props.onUpdate({ source: e.target.value })}
            placeholder="Source / label (e.g. PD11 — Stage Left Bay)"
            aria-label={`Source label for ${distro.name || "distro"}`}
          />
        </div>
        <div className="power-distro-rating">
          {/* Collapsed-state summary chip — keeps the row scannable
              when many distros are folded. */}
          {collapsed && (
            <span
              className="power-distro-summary-chip"
              title={`${fmtInt(load.totalWatts)} W on ${distro.feedAmps} A · ${distro.feedPhases}ph`}
            >
              {fmtInt(load.totalWatts)} W
            </span>
          )}
          <label className="power-preset-label">
            <span>Preset</span>
            <select
              className="led-input"
              value={distro.preset}
              onChange={(e) =>
                props.onApplyPreset(e.target.value as DistroPresetId)
              }
              aria-label={`Preset for ${distro.name}`}
            >
              {DISTRO_PRESET_ORDER.map((id) => (
                <option key={id} value={id}>
                  {DISTRO_PRESETS[id].label}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className="btn btn-soft btn-sm"
            onClick={() => {
              if (load.totalWatts === 0) {
                props.onReset();
                return;
              }
              const ok = window.confirm(
                `Reset ${distro.name || "this distro"}? This empties every channel but keeps the distro shell, preset and mapping.`,
              );
              if (ok) props.onReset();
            }}
            title="Empty every channel on this distro (keeps the distro shell)"
            disabled={load.totalWatts === 0}
          >
            Reset
          </button>
          <button
            type="button"
            className="btn btn-danger btn-sm"
            onClick={props.onRemove}
            title="Remove distro"
          >
            Remove
          </button>
        </div>
      </div>

      {/* Everything below the header is hidden when collapsed. */}
      {!collapsed && (
      <>
      

      {/* Feed badge + truss chips */}
      <div className="power-distro-feed">
        <span className="power-feed-badge">
          {distro.feedVoltage} V · {distro.feedAmps} A · {distro.feedPhases}ph
        </span>
        <span className="power-feed-derate">
          derate {fmtNum(load.feederDerateAmps, 1)} A
        </span>
        <span className="power-feed-divider" aria-hidden="true">
          •
        </span>
        <span className="power-feeds-label">Feeds:</span>
        <FeedsTrussesEditor
          systems={systems}
          selected={distro.feedsTrusses}
          onChange={(next) => props.onUpdate({ feedsTrusses: next })}
        />
        <button
          type="button"
          className="btn btn-soft btn-sm"
          onClick={() => setMappingOpen((v) => !v)}
          aria-expanded={mappingOpen}
          title="Edit channel → phase mapping"
        >
          Mapping
        </button>
      </div>

      {/* === v2.1 LIGHTING WORKFLOW LAYER ====================================
          Producers want to see at-a-glance:  phase stress  →  what feeds
          where  →  what to do next.  We render those THREE things first,
          before any electrician-style channel/mapping editor. */}

      {/* 1. Per-phase + feeder summary (big bars) */}
      <FeederSummary load={load} />

      {/* 2. "HOT1 → LX1 60% · LX2 40%" feed graph */}
      {trussSplit.length > 0 && (
        <FeedGraph
          distroName={distro.name || "Distro"}
          split={trussSplit}
          systems={systems}
        />
      )}

      {/* 3. Top suggestion banner with one-click Apply */}
      {topSuggestion && (
        <SuggestionBanner
          suggestion={topSuggestion}
          load={load}
          systems={systems}
          onApply={() => props.onApplySuggestion(topSuggestion)}
        />
      )}

      {/* === Editor layer (mapping + remaining warnings) ================ */}

      {mappingOpen && (
        <ChannelMappingEditor
          mapping={distro.channelMapping}
          channelCount={distro.channels.length}
          feedPhases={distro.feedPhases}
          onChange={props.onUpdateMapping}
          onResetDefault={() =>
            props.onUpdateMapping(
              distro.feedPhases === 3
                ? { ...DEFAULT_CHANNEL_MAPPING }
                : { ...SINGLE_PHASE_MAPPING },
            )
          }
        />
      )}

      {/* Remaining warnings (overloads, etc) — top suggestion already
          shown in the banner above. */}
      <WarningsPanel load={load} suggestions={restSuggestions} />

      {/* Channel grid — each channel renders as a collapsible group so
          the user sees the channel load FIRST and can dropdown to see
          the specific fixtures (drops) on that line. */}
      <div className="power-channel-grid">
        {load.channels.map((cl) => (
          <ChannelRow
            key={cl.channel.id}
            distro={distro}
            channelLoad={cl}
            systems={systems}
            systemNameById={systemNameById}
            fixtures={props.fixtures}
            onUpdateChannel={(patch) =>
              props.onUpdateChannel(cl.channel.index, patch)
            }
            onAddDrop={(drop) => props.onAddDrop(cl.channel.index, drop)}
            onUpdateDrop={(dropId, patch) =>
              props.onUpdateDrop(cl.channel.index, dropId, patch)
            }
            onRemoveDrop={(dropId) =>
              props.onRemoveDrop(cl.channel.index, dropId)
            }
          />
        ))}
      </div>
      </>
      )}
    </section>
  );
}

/** Self-dismissing toast that lives inline in the Power Plan header.
 *  Auto-clears after 4 s; also exposes a manual close (×). Renders
 *  nothing when message is null so it doesn't reserve layout space. */
function PowerExportToast({
  message,
  onDismiss,
}: {
  message: string | null;
  onDismiss: () => void;
}) {
  useEffect(() => {
    if (!message) return;
    const t = window.setTimeout(onDismiss, 4000);
    return () => window.clearTimeout(t);
  }, [message, onDismiss]);
  if (!message) return null;
  return (
    <div
      className="power-export-toast"
      role="status"
      aria-live="polite"
    >
      <span aria-hidden="true">✓</span>
      <span>{message}</span>
      <button
        type="button"
        className="power-export-toast-close"
        onClick={onDismiss}
        aria-label="Dismiss notification"
      >
        ×
      </button>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────
// Truss multi-select chips
// ──────────────────────────────────────────────────────────────────────

function FeedsTrussesEditor({
  systems,
  selected,
  onChange,
}: {
  systems: SystemLite[];
  selected: string[];
  onChange: (next: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const selectedSet = new Set(selected);
  const toggle = (id: string) => {
    if (selectedSet.has(id)) onChange(selected.filter((s) => s !== id));
    else onChange([...selected, id]);
  };
  const labels = selected
    .map((id) => systems.find((s) => s.id === id)?.name ?? "—")
    .filter((n) => n !== "—");

  return (
    <div className="power-feeds-editor">
      {labels.length === 0 ? (
        <span className="power-feeds-empty">none</span>
      ) : (
        labels.map((name, i) => (
          <span key={`${name}-${i}`} className="power-truss-chip">
            {name}
          </span>
        ))
      )}
      <button
        type="button"
        className="btn btn-soft btn-sm"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        {selected.length === 0 ? "Pick truss…" : "Edit"}
      </button>
      {open && (
        <div className="power-feeds-menu" role="menu">
          {systems.length === 0 ? (
            <div className="power-feeds-empty-row">
              No systems on the Rigging Report yet.
            </div>
          ) : (
            systems.map((s) => (
              <label key={s.id} className="power-feeds-menu-item">
                <input
                  type="checkbox"
                  checked={selectedSet.has(s.id)}
                  onChange={() => toggle(s.id)}
                />
                <span>{s.name}</span>
              </label>
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────
// Channel mapping editor
// ──────────────────────────────────────────────────────────────────────

function ChannelMappingEditor({
  mapping,
  channelCount,
  feedPhases,
  onChange,
  onResetDefault,
}: {
  mapping: ChannelMapping;
  channelCount: number;
  feedPhases: 1 | 3;
  onChange: (m: ChannelMapping) => void;
  onResetDefault: () => void;
}) {
  const phaseFor = (idx: number): PowerPhase | "" => {
    if (mapping.L1.includes(idx)) return "L1";
    if (mapping.L2.includes(idx)) return "L2";
    if (mapping.L3.includes(idx)) return "L3";
    return "";
  };
  const setPhase = (idx: number, phase: PowerPhase | "") => {
    const next: ChannelMapping = {
      L1: mapping.L1.filter((n) => n !== idx),
      L2: mapping.L2.filter((n) => n !== idx),
      L3: mapping.L3.filter((n) => n !== idx),
    };
    if (phase) next[phase] = [...next[phase], idx].sort((a, b) => a - b);
    onChange(next);
  };
  return (
    <div className="power-mapping-editor">
      <div className="power-mapping-grid">
        {Array.from({ length: channelCount }, (_, i) => i + 1).map((idx) => (
          <label key={idx} className="power-mapping-row">
            <span>Ch{idx}</span>
            <select
              className="led-input"
              value={phaseFor(idx)}
              onChange={(e) => setPhase(idx, e.target.value as PowerPhase | "")}
              disabled={feedPhases !== 3}
            >
              <option value="L1">L1</option>
              {feedPhases === 3 && <option value="L2">L2</option>}
              {feedPhases === 3 && <option value="L3">L3</option>}
              <option value="">—</option>
            </select>
          </label>
        ))}
      </div>
      <div className="power-mapping-actions">
        <button type="button" className="btn btn-soft btn-sm" onClick={onResetDefault}>
          Reset to default
        </button>
        <span className="power-mapping-help">
          {feedPhases === 3
            ? "Default: Ch1+Ch4 → L1, Ch2+Ch5 → L2, Ch3+Ch6 → L3."
            : "1-phase distro — every channel sits on L1."}
        </span>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────
// Feeder summary (per-phase amps + feeder utilisation + imbalance)
// ──────────────────────────────────────────────────────────────────────

function FeederSummary({ load }: { load: DistroLoad }) {
  return (
    <div className="power-feeder-summary">
      {load.distro.feedPhases === 3 ? (
        <div className="power-phase-grid">
          {load.phases.map((p) => {
            const ratio = load.distro.feedAmps > 0 ? p.amps / load.distro.feedAmps : 0;
            const sev = severityForRatio(ratio);
            return (
              <div key={p.phase} className={severityClass(sev, "power-phase")}>
                <div className="power-phase-head">
                  <strong>{p.phase}</strong>
                  <span>{fmtPct(ratio)}</span>
                </div>
                <div className="power-phase-bar">
                  <div
                    className="power-phase-bar-fill"
                    style={{ width: `${Math.min(100, ratio * 100)}%` }}
                  />
                  <div
                    className="power-phase-bar-derate"
                    style={{ left: `${POWER_DERATE_FACTOR * 100}%` }}
                    aria-hidden="true"
                  />
                </div>
                <div className="power-phase-stats">
                  <span>{fmtInt(p.watts)} W</span>
                  <span>{fmtNum(p.amps, 1)} A</span>
                  <span className="power-phase-cap">
                    / {load.distro.feedAmps} A
                  </span>
                </div>
                <div className="power-phase-channels">
                  {p.channelIndexes.length === 0
                    ? "—"
                    : `Ch${p.channelIndexes.join(" + Ch")}`}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="power-phase-grid power-phase-grid--single">
          {(() => {
            const p = load.phases[0];
            const ratio = load.distro.feedAmps > 0 ? p.amps / load.distro.feedAmps : 0;
            const sev = severityForRatio(ratio);
            return (
              <div className={severityClass(sev, "power-phase")}>
                <div className="power-phase-head">
                  <strong>1ph</strong>
                  <span>{fmtPct(ratio)}</span>
                </div>
                <div className="power-phase-bar">
                  <div
                    className="power-phase-bar-fill"
                    style={{ width: `${Math.min(100, ratio * 100)}%` }}
                  />
                  <div
                    className="power-phase-bar-derate"
                    style={{ left: `${POWER_DERATE_FACTOR * 100}%` }}
                    aria-hidden="true"
                  />
                </div>
                <div className="power-phase-stats">
                  <span>{fmtInt(p.watts)} W</span>
                  <span>{fmtNum(p.amps, 1)} A</span>
                  <span className="power-phase-cap">
                    / {load.distro.feedAmps} A
                  </span>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      <div className="power-feeder-totals">
        <span>
          Total <strong>{fmtInt(load.totalWatts)}</strong> W
        </span>
        <span>
          Worst leg <strong>{fmtNum(load.feederWorstAmps, 1)}</strong> A /{" "}
          {load.distro.feedAmps} A ({fmtPct(load.feederUtilization)})
        </span>
        {load.distro.feedPhases === 3 && (
          <span>
            Imbalance <strong>{fmtPct(load.imbalance)}</strong>
          </span>
        )}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────
// Warnings + advisory suggestions
// ──────────────────────────────────────────────────────────────────────

function WarningsPanel({
  load,
  suggestions,
}: {
  load: DistroLoad;
  suggestions: ReturnType<typeof computeDistroSuggestions>;
}) {
  const messages: { kind: "danger" | "warn" | "info"; text: string }[] = [];

  if (load.feederStatus === "over") {
    messages.push({
      kind: "danger",
      text: `Feeder over capacity — worst leg ${fmtNum(load.feederWorstAmps, 1)} A exceeds ${load.distro.feedAmps} A breaker.`,
    });
  } else if (load.feederStatus === "warn") {
    messages.push({
      kind: "warn",
      text: `Feeder above 80 % derate (${fmtNum(load.feederWorstAmps, 1)} A / ${load.distro.feedAmps} A).`,
    });
  }

  for (const ch of load.channels) {
    if (ch.status === "over") {
      messages.push({
        kind: "danger",
        text: `Ch${ch.channel.index} over capacity — ${fmtNum(ch.amps, 1)} A exceeds ${ch.channel.breakerAmps} A breaker.`,
      });
    } else if (ch.status === "warn") {
      messages.push({
        kind: "warn",
        text: `Ch${ch.channel.index} above 80 % derate (${fmtNum(ch.amps, 1)} A / ${ch.channel.breakerAmps} A).`,
      });
    }
  }

  if (load.imbalanceWarn) {
    messages.push({
      kind: "warn",
      text: `Phase imbalance ${fmtPct(load.imbalance)} > 20 % threshold.`,
    });
  }

  if (messages.length === 0 && suggestions.length === 0) return null;

  return (
    <div className="power-warnings">
      {messages.map((m, i) => (
        <div
          key={i}
          className={
            m.kind === "danger"
              ? "power-warning power-warning--danger"
              : m.kind === "warn"
                ? "power-warning power-warning--warn"
                : "power-warning"
          }
        >
          {m.text}
        </div>
      ))}
      {suggestions.map((s, i) => (
        <div key={`s${i}`} className="power-warning power-warning--info">
          <strong>Suggestion:</strong> {s.message}{" "}
          <span className="power-warning-hint">
            (advisory only — apply manually)
          </span>
        </div>
      ))}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────
// Feed graph — "HOT1 → LX1 60% · LX2 40%"
// ──────────────────────────────────────────────────────────────────────

function FeedGraph({
  distroName,
  split,
  systems,
}: {
  distroName: string;
  split: DistroTrussShare[];
  systems: SystemLite[];
}) {
  const trussNameById = new Map(systems.map((s) => [s.id, s.name]));
  return (
    <div className="power-feed-graph" aria-label="Soca split — distro to truss feed shares">
      <div className="power-feed-graph-head">
        <span className="power-feed-graph-from">{distroName}</span>
        <span className="power-feed-graph-arrow" aria-hidden="true">→</span>
        <span className="power-feed-graph-summary">
          {split
            .map(
              (s) =>
                `${trussNameById.get(s.trussId) ?? s.trussId} ${Math.round(s.ratio * 100)}%`,
            )
            .join(" · ")}
        </span>
      </div>
      <div className="power-feed-graph-bar" role="img" aria-label="Feed share bar">
        {split.map((s, i) => (
          <div
            key={s.trussId}
            className={`power-feed-graph-seg power-feed-graph-seg--${i % 4}`}
            style={{ width: `${Math.max(2, s.ratio * 100)}%` }}
            title={`${trussNameById.get(s.trussId) ?? s.trussId}: ${fmtInt(s.watts)} W (${Math.round(s.ratio * 100)}%)`}
          >
            <span className="power-feed-graph-seg-label">
              {trussNameById.get(s.trussId) ?? s.trussId}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────
// Suggestion banner — top-of-card, one-click "Apply"
// ──────────────────────────────────────────────────────────────────────

function SuggestionBanner({
  suggestion,
  load,
  systems,
  onApply,
}: {
  suggestion: DistroSuggestion;
  load: DistroLoad;
  systems: SystemLite[];
  onApply: () => void;
}) {
  const trussName =
    systems.find((s) => s.id === suggestion.trussId)?.name ?? suggestion.trussId;
  // Severity colour follows the distro's worst state so the banner
  // matches the urgency of the card.
  const sev =
    load.feederStatus === "over" || load.hasChannelOverload
      ? "over"
      : load.feederStatus === "warn" ||
          load.hasChannelWarning ||
          load.imbalanceWarn
        ? "warn"
        : "ok";
  return (
    <div className={severityClass(sev, "power-suggestion-banner")}>
      <div className="power-suggestion-banner-icon" aria-hidden="true">💡</div>
      <div className="power-suggestion-banner-text">
        <strong>Suggested fix:</strong> {suggestion.message}{" "}
        <span className="power-suggestion-banner-truss">on {trussName}</span>
      </div>
      <button
        type="button"
        className="btn btn-primary btn-sm"
        onClick={onApply}
        title="Apply this rebalance now"
      >
        Apply
      </button>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────
// Truss-first panel — fixtures → power, above the distro list
// ──────────────────────────────────────────────────────────────────────

function TrussPowerPanel({
  rows,
  unpowered,
  onAutoAssignTruss,
}: {
  rows: TrussPowerRow[];
  unpowered: ReturnType<typeof computeUnpoweredFixtures>;
  onAutoAssignTruss: (trussId: string) => void;
}) {
  const unpoweredByTruss = useMemo(() => {
    const m = new Map<string, number>();
    for (const u of unpowered) {
      m.set(u.trussId, (m.get(u.trussId) ?? 0) + u.remainingQty);
    }
    return m;
  }, [unpowered]);

  return (
    <section className="power-truss-panel led-card">
      <header className="power-truss-panel-head">
        <h3>Trusses</h3>
        <span className="power-truss-panel-hint">
          Each row is a rig position. Power is what the fixtures on it need.
        </span>
      </header>
      <div className="power-truss-panel-rows">
        {rows.map((row) => {
          const unpoweredOnRow = unpoweredByTruss.get(row.trussId) ?? 0;
          const ratioFed =
            row.totalWatts > 0 ? row.assignedWatts / row.totalWatts : 0;
          const sev: LoadSeverity =
            unpoweredOnRow > 0 ? "warn" : row.totalQty === 0 ? "ok" : "ok";
          return (
            <div
              key={row.trussId}
              className={severityClass(sev, "power-truss-row")}
            >
              <div className="power-truss-row-head">
                <strong className="power-truss-row-name">{row.trussName}</strong>
                <span className="power-truss-row-totals">
                  {fmtInt(row.totalWatts)} W
                  <span className="power-truss-row-cap">
                    {" "}
                    · {fmtInt(row.assignedWatts)} W fed ({fmtPct(ratioFed)})
                  </span>
                </span>
                {unpoweredOnRow > 0 ? (
                  <button
                    type="button"
                    className="btn btn-soft btn-sm"
                    onClick={() => onAutoAssignTruss(row.trussId)}
                    title={`Add a distro for the ${unpoweredOnRow} unpowered fixtures on ${row.trussName}`}
                  >
                    ⚡ Auto-assign
                  </button>
                ) : (
                  <span className="power-truss-row-ok-badge" title="All fixtures on this truss are powered">
                    ✓ powered
                  </span>
                )}
              </div>
              {row.fixtures.length > 0 ? (
                <ul className="power-truss-row-fixtures">
                  {row.fixtures.map((f) => (
                    <li key={f.name} className="power-truss-row-fixture">
                      <span className="power-truss-row-fixture-qty">
                        {f.qty}×
                      </span>{" "}
                      <span className="power-truss-row-fixture-name">
                        {f.name}
                      </span>{" "}
                      <span className="power-truss-row-fixture-w">
                        ({fmtInt(f.watts)} W)
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="power-truss-row-empty">No fixtures on this truss.</div>
              )}
              {row.feedingDistros.length > 0 ? (
                <div className="power-truss-row-feeders">
                  <span className="power-truss-row-feeders-label">Fed by:</span>
                  {row.feedingDistros.map((fd) => (
                    <span key={fd.distroId} className="power-truss-feeder-chip">
                      {fd.distroName}
                      {fd.watts > 0 && (
                        <span className="power-truss-feeder-share">
                          {" "}
                          {Math.round(fd.ratio * 100)}%
                        </span>
                      )}
                    </span>
                  ))}
                </div>
              ) : row.totalQty > 0 ? (
                <div className="power-truss-row-feeders power-truss-row-feeders--empty">
                  <span className="power-truss-row-feeders-label">Fed by:</span>
                  <span className="power-truss-feeder-chip power-truss-feeder-chip--missing">
                    nothing yet
                  </span>
                </div>
              ) : null}
              {unpoweredOnRow > 0 && (
                <div className="power-truss-row-unpowered">
                  {unpoweredOnRow} fixture{unpoweredOnRow === 1 ? "" : "s"} not powered
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ──────────────────────────────────────────────────────────────────────
// Auto-suggest modal — confirms the proposed power layout before append
// ──────────────────────────────────────────────────────────────────────

function AutoSuggestModal({
  suggested,
  onApply,
  onClose,
}: {
  suggested: SuggestedDistro[];
  onApply: (picks: SuggestedDistro[]) => void;
  onClose: () => void;
}) {
  const totalWatts = suggested.reduce((s, x) => s + x.totalWatts, 0);
  const totalUnits = suggested.reduce((s, x) => s + x.fixtureUnits, 0);
  return (
    <div
      className="power-modal-backdrop"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="power-modal power-auto-suggest-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="power-modal-head">
          <h3>Auto-suggest power layout</h3>
          <button
            type="button"
            className="btn btn-soft btn-sm"
            onClick={onClose}
            aria-label="Close"
          >
            ✕
          </button>
        </header>
        {suggested.length === 0 ? (
          <p className="power-modal-intro">
            No proposal could be generated. The unpowered fixtures don't
            have wattage on file yet — set a non-zero watts value on each
            fixture row in the Lighting Report and try again.
          </p>
        ) : (
          <p className="power-modal-intro">
            Proposed <strong>{suggested.length}</strong> new distro
            {suggested.length === 1 ? "" : "s"} to power{" "}
            <strong>{totalUnits}</strong> currently-unpowered fixture
            {totalUnits === 1 ? "" : "s"} (<strong>{fmtInt(totalWatts)}</strong> W
            total). Existing distros are left untouched.
          </p>
        )}
        <ul className="power-auto-suggest-list">
          {suggested.map((s) => (
            <li key={s.key} className="power-auto-suggest-item">
              <div className="power-auto-suggest-item-head">
                <strong>{s.trussName}</strong>{" "}
                <span className="power-auto-suggest-item-preset">
                  → {s.presetLabel}
                </span>
              </div>
              <div className="power-auto-suggest-item-stats">
                {fmtInt(s.totalWatts)} W · {s.fixtureUnits} fixture
                {s.fixtureUnits === 1 ? "" : "s"} · {s.drops.length} drop
                {s.drops.length === 1 ? "" : "s"}
              </div>
              <ul className="power-auto-suggest-item-drops">
                {s.drops.map((d, i) => (
                  <li key={i}>
                    Ch{d.channelIndex}: {d.qty} × {d.fixtureRef}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
        <footer className="power-modal-foot">
          <button type="button" className="btn btn-soft" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => onApply(suggested)}
            disabled={suggested.length === 0}
          >
            Apply all ({suggested.length})
          </button>
        </footer>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────
// Channel row
// ──────────────────────────────────────────────────────────────────────

type ChannelRowProps = {
  distro: Distro;
  channelLoad: ChannelLoad;
  systems: SystemLite[];
  systemNameById: Map<string, string>;
  fixtures: FixtureRef[];
  onUpdateChannel: (
    patch: Partial<Omit<Channel, "drops" | "id" | "index">>,
  ) => void;
  onAddDrop: (
    drop: { trussId: string; fixtureRef: string; qty: number; cable?: DropCableKind },
  ) => void;
  onUpdateDrop: (
    dropId: string,
    patch: Partial<Omit<Drop, "id">>,
  ) => void;
  onRemoveDrop: (dropId: string) => void;
};

function ChannelRow(props: ChannelRowProps) {
  const { channelLoad: cl, distro, systems, systemNameById, fixtures } = props;
  const channel = cl.channel;
  const sev = cl.status;
  const phaseLabel = cl.phase ?? "—";
  const dropCount = cl.drops.length;
  const fixtureCount = cl.drops.reduce((s, d) => s + d.drop.qty, 0);

  // Channel-level accordion: header (Ch1 · phase · breaker · summary
  // load) is always shown; drop list + add-drop form collapse. Empty
  // channels default to collapsed so the user sees the channel grid
  // as a scannable strip first; channels with drops default open.
  const [open, setOpen] = useState<boolean>(dropCount > 0);

  return (
    <div
      className={severityClass(
        sev,
        `power-channel${open ? "" : " power-channel--collapsed"}`,
      )}
    >
      {/* Channel header is a single click-target so the whole row is
          easy to expand/collapse. We use a button so keyboard users
          can toggle with Enter / Space. */}
      <button
        type="button"
        className="power-channel-head power-channel-head--toggle"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={
          open
            ? `Collapse Ch${channel.index} details`
            : `Expand Ch${channel.index} details`
        }
      >
        <span className="power-channel-chevron" aria-hidden="true">
          {open ? "▾" : "▸"}
        </span>
        <span className="power-channel-id">
          <strong>Ch{channel.index}</strong>
          <span className="power-channel-phase">{phaseLabel}</span>
          <span className="power-channel-breaker">
            {channel.breakerAmps} A
          </span>
        </span>
        <span className="power-channel-stats">
          <span>{fmtInt(cl.watts)} W</span>
          <span>{fmtNum(cl.amps, 1)} A</span>
          <span>{fmtPct(cl.utilization)}</span>
          <span className="power-channel-fixtures">
            {fixtureCount === 0
              ? "no fixtures"
              : `${fixtureCount} fixture${fixtureCount === 1 ? "" : "s"}`}
          </span>
        </span>
      </button>

      <div className="power-channel-bar">
        <div
          className="power-channel-bar-fill"
          style={{ width: `${Math.min(100, cl.utilization * 100)}%` }}
        />
        <div
          className="power-channel-bar-derate"
          style={{ left: `${POWER_DERATE_FACTOR * 100}%` }}
          aria-hidden="true"
        />
      </div>

      {open && (
        <>
          <div className="power-drops">
            {cl.drops.length === 0 ? (
              <div className="power-drops-empty">No drops on this channel.</div>
            ) : (
              cl.drops.map((dl) => (
                <DropChip
                  key={dl.drop.id}
                  drop={dl.drop}
                  watts={dl.watts}
                  amps={dl.amps}
                  trussName={systemNameById.get(dl.drop.trussId) ?? "—"}
                  onChangeQty={(qty) => props.onUpdateDrop(dl.drop.id, { qty })}
                  onChangeCable={(cable) =>
                    props.onUpdateDrop(dl.drop.id, { cable })
                  }
                  onRemove={() => props.onRemoveDrop(dl.drop.id)}
                />
              ))
            )}
          </div>

          <AddDropForm
            distro={distro}
            systems={systems}
            fixtures={fixtures}
            onAdd={(drop) => props.onAddDrop(drop)}
          />
        </>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────
// Drop chip
// ──────────────────────────────────────────────────────────────────────

function DropChip({
  drop,
  watts,
  amps,
  trussName,
  onChangeQty,
  onChangeCable,
  onRemove,
}: {
  drop: Drop;
  watts: number;
  amps: number;
  trussName: string;
  onChangeQty: (qty: number) => void;
  onChangeCable: (cable: DropCableKind | undefined) => void;
  onRemove: () => void;
}) {
  // Condensed by default — show only Fixture name, Qty, Total Load.
  // Click reveals secondary metadata (source truss, per-unit amps,
  // cable type) and editor controls. The remove (×) button always
  // sits on the right so destructive action stays predictable.
  const [expanded, setExpanded] = useState(false);
  return (
    <div
      className={`power-drop-chip${expanded ? " power-drop-chip--expanded" : ""}`}
    >
      <button
        type="button"
        className="power-drop-chip-summary"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        title={
          expanded
            ? "Collapse drop details"
            : "Click to edit qty, cable, source truss"
        }
      >
        <span className="power-drop-chevron" aria-hidden="true">
          {expanded ? "▾" : "▸"}
        </span>
        <span className="power-drop-fx" title={drop.fixtureRef}>
          {drop.fixtureRef || "—"}
        </span>
        <span className="power-drop-qty-pill">×{drop.qty}</span>
        <span className="power-drop-load">{fmtInt(watts)} W</span>
      </button>

      {expanded && (
        <div className="power-drop-chip-detail">
          <label className="power-drop-detail-field">
            <span>Truss</span>
            <span className="power-drop-truss">{trussName}</span>
          </label>
          <label className="power-drop-detail-field">
            <span>Qty</span>
            <NumberField
              className="led-input led-input-num power-drop-qty"
              min={1}
              step={1}
              value={drop.qty}
              transform={(n) => Math.max(1, Math.round(n || 1))}
              emptyValue={1}
              onCommit={(qty) => onChangeQty(qty)}
              aria-label="Drop quantity"
            />
          </label>
          <label className="power-drop-detail-field">
            <span>Cable</span>
            <select
              className="led-input power-drop-cable"
              value={drop.cable ?? ""}
              onChange={(e) =>
                onChangeCable(
                  e.target.value
                    ? (e.target.value as DropCableKind)
                    : undefined,
                )
              }
              aria-label="Cable type"
            >
              <option value="">cable…</option>
              {DROP_CABLE_KINDS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
          <span className="power-drop-detail-stats">
            {fmtNum(amps, 1)} A draw
          </span>
        </div>
      )}

      <button
        type="button"
        className="btn btn-danger btn-sm power-drop-remove"
        onClick={onRemove}
        title="Remove drop"
      >
        ×
      </button>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────
// Add drop inline form
// ──────────────────────────────────────────────────────────────────────

function AddDropForm({
  distro,
  systems,
  fixtures,
  onAdd,
}: {
  distro: Distro;
  systems: SystemLite[];
  fixtures: FixtureRef[];
  onAdd: (drop: { trussId: string; fixtureRef: string; qty: number; cable?: DropCableKind }) => void;
}) {
  const [open, setOpen] = useState(false);

  // Truss options — restricted to distro.feedsTrusses (or all if none picked).
  const trussOptions = useMemo(() => {
    const allowed =
      distro.feedsTrusses.length > 0
        ? new Set(distro.feedsTrusses)
        : new Set(systems.map((s) => s.id));
    return systems.filter((s) => allowed.has(s.id));
  }, [systems, distro.feedsTrusses]);

  const [trussId, setTrussId] = useState<string>("");
  const [fixtureRef, setFixtureRef] = useState<string>("");
  const [qty, setQty] = useState<number>(1);
  const [cable, setCable] = useState<DropCableKind | "">("");

  // Reset form when opening.
  const reset = () => {
    setTrussId(trussOptions[0]?.id ?? "");
    setFixtureRef("");
    setQty(1);
    setCable("");
  };

  // Fixture options for the chosen truss.
  const fixtureOptions = useMemo(() => {
    if (!trussId) return [] as FixtureRef[];
    return fixtures.filter(
      (f) => f.systemId === trussId && f.name.trim().length > 0,
    );
  }, [fixtures, trussId]);

  if (!open) {
    return (
      <div className="power-add-drop-row">
        <button
          type="button"
          className="btn btn-soft btn-sm"
          onClick={() => {
            setOpen(true);
            reset();
          }}
          disabled={trussOptions.length === 0}
          title={
            trussOptions.length === 0
              ? "Pick a truss in the distro header first"
              : undefined
          }
        >
          + Add fixtures
        </button>
        {trussOptions.length === 0 && (
          <span className="power-add-drop-hint">
            Pick a truss in the distro header to add drops.
          </span>
        )}
      </div>
    );
  }

  const canSubmit =
    trussId.length > 0 && fixtureRef.length > 0 && qty > 0;

  return (
    <div className="power-add-drop-form">
      <select
        className="led-input"
        value={trussId}
        onChange={(e) => {
          setTrussId(e.target.value);
          setFixtureRef("");
        }}
        aria-label="Truss"
      >
        {trussOptions.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </select>
      <select
        className="led-input"
        value={fixtureRef}
        onChange={(e) => setFixtureRef(e.target.value)}
        aria-label="Fixture"
      >
        <option value="">Fixture…</option>
        {fixtureOptions.length === 0 ? (
          <option value="" disabled>
            (no fixtures on this truss)
          </option>
        ) : (
          fixtureOptions.map((f, i) => (
            <option key={`${f.name}-${i}`} value={f.name}>
              {f.name} · {f.qty} pcs · {fmtInt(f.watts)} W
            </option>
          ))
        )}
      </select>
      <NumberField
        className="led-input led-input-num"
        min={1}
        step={1}
        value={qty}
        transform={(n) => Math.max(1, Math.round(n || 1))}
        emptyValue={1}
        onCommit={(n) => setQty(n)}
        aria-label="Quantity"
      />
      <select
        className="led-input"
        value={cable}
        onChange={(e) => setCable(e.target.value as DropCableKind | "")}
        aria-label="Cable"
      >
        <option value="">cable…</option>
        {DROP_CABLE_KINDS.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>
      <button
        type="button"
        className="btn btn-primary btn-sm"
        disabled={!canSubmit}
        onClick={() => {
          onAdd({
            trussId,
            fixtureRef,
            qty,
            cable: cable || undefined,
          });
          reset();
          setOpen(false);
        }}
      >
        Add
      </button>
      <button
        type="button"
        className="btn btn-soft btn-sm"
        onClick={() => setOpen(false)}
      >
        Cancel
      </button>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────
// Unpowered fixtures panel
// ──────────────────────────────────────────────────────────────────────

function UnpoweredFixturesPanel({
  unpowered,
  systems,
}: {
  unpowered: ReturnType<typeof computeUnpoweredFixtures>;
  systems: SystemLite[];
}) {
  const systemNameById = new Map(systems.map((s) => [s.id, s.name]));
  const total = unpowered.reduce((n, u) => n + u.remainingQty, 0);
  return (
    <section className="led-card power-unpowered">
      <div className="power-unpowered-head">
        <h3>Fixtures not yet powered</h3>
        <span className="badge badge-warn">{total} remaining</span>
      </div>
      <table className="led-table">
        <thead>
          <tr>
            <th>Fixture</th>
            <th>Truss</th>
            <th className="led-num">Total</th>
            <th className="led-num">Powered</th>
            <th className="led-num">Remaining</th>
            <th className="led-num">W / unit</th>
          </tr>
        </thead>
        <tbody>
          {unpowered.map((u, i) => (
            <tr key={`${u.fixtureRef}-${u.trussId}-${i}`}>
              <td>{u.fixtureRef}</td>
              <td>{systemNameById.get(u.trussId) ?? u.trussId}</td>
              <td className="led-num">{u.totalQty}</td>
              <td className="led-num">{u.assignedQty}</td>
              <td className="led-num">
                <strong>{u.remainingQty}</strong>
              </td>
              <td className="led-num">{fmtInt(u.wattsPerUnit)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

// ──────────────────────────────────────────────────────────────────────
// Legacy circuits read-only panel
// ──────────────────────────────────────────────────────────────────────

function LegacyCircuitsPanel({
  circuits,
  onRemoveCircuit,
}: {
  circuits: PowerCircuit[];
  onRemoveCircuit: (id: string) => void;
}) {
  return (
    <section className="led-card power-legacy">
      <div className="power-legacy-head">
        <h3>Legacy circuits (v1)</h3>
        <span className="badge">read-only — preserved from before the rewrite</span>
      </div>
      <p className="power-legacy-help">
        These are the old free-text circuits with phase items. They're kept
        here so nothing is lost; new work belongs in distros above. Remove a
        circuit when you've migrated its content.
      </p>
      {circuits.map((c) => {
        const load = computeCircuitLoad(c);
        return (
          <div key={c.id} className="power-legacy-circuit">
            <div className="power-legacy-circuit-head">
              <strong>{c.name}</strong>
              <span>{c.source}</span>
              <span>
                {c.voltage} V × {c.ampsPerPhase} A · {fmtInt(load.totalWatts)} W
                · worst {fmtPct(load.worstRatio)}
              </span>
              <button
                type="button"
                className="btn btn-danger btn-sm"
                onClick={() => onRemoveCircuit(c.id)}
              >
                Remove
              </button>
            </div>
            {c.items.length > 0 && (
              <table className="led-table">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Phase</th>
                    <th className="led-num">Qty</th>
                    <th className="led-num">W/unit</th>
                    <th className="led-num">Subtotal W</th>
                    <th>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {c.items.map((it) => (
                    <tr key={it.id}>
                      <td>{it.name}</td>
                      <td>{it.phase}</td>
                      <td className="led-num">{it.qty}</td>
                      <td className="led-num">{fmtInt(it.wattsPerUnit)}</td>
                      <td className="led-num">
                        {fmtInt(it.qty * it.wattsPerUnit)}
                      </td>
                      <td>{it.notes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        );
      })}
    </section>
  );
}

// Re-export so legacy callers that imported applyPresetToDistro from this
// module path still resolve (none currently, but keeps the surface stable).
export { applyPresetToDistro, POWER_PHASES };
