import { useMemo } from "react";
import {
  POWER_PHASES,
  computeCircuitLoad,
  computePlanTotals,
  severityForRatio,
  type PowerCircuit,
  type PowerItem,
  type PowerPhase,
  type PowerPlan,
} from "../lib/power";

type Props = {
  plan: PowerPlan;
  onAddCircuit: () => void;
  onUpdateCircuit: (id: string, patch: Partial<Omit<PowerCircuit, "items">>) => void;
  onRemoveCircuit: (id: string) => void;
  onAddItem: (circuitId: string, phase?: PowerPhase) => void;
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

export function PowerPlanView({
  plan,
  onAddCircuit,
  onUpdateCircuit,
  onRemoveCircuit,
  onAddItem,
  onUpdateItem,
  onRemoveItem,
  onDuplicateItem,
}: Props) {
  const totals = useMemo(() => computePlanTotals(plan), [plan]);

  return (
    <section className="power-plan">
      <div className="power-plan-head">
        <div>
          <h2>Power Plan</h2>
          <p className="power-plan-sub">
            Plan how the show is plugged in. Add a circuit (HOT) for each
            230&nbsp;V / 32&nbsp;A 3-phase feed, then drop fixtures onto
            phases L1&thinsp;/&thinsp;L2&thinsp;/&thinsp;L3. Per-phase load
            (W&nbsp;and&nbsp;A) and breaker headroom update live.
          </p>
        </div>
        <div className="power-plan-meta">
          <span className="badge">
            <strong>{totals.circuitCount}</strong> circuits
          </span>
          <span className="badge">
            <strong>{totals.itemCount}</strong> items
          </span>
          <span className="badge">
            <strong>{fmtInt(totals.totalWatts)}</strong> W planned
          </span>
          <span className="badge">
            <strong>{fmtInt(totals.totalCapacityWatts)}</strong> W capacity
          </span>
          {totals.overloadedCircuits > 0 && (
            <span className="badge badge-danger">
              <strong>{totals.overloadedCircuits}</strong> over capacity
            </span>
          )}
          {totals.warningCircuits > 0 && (
            <span className="badge badge-warn">
              <strong>{totals.warningCircuits}</strong> near limit
            </span>
          )}
        </div>
      </div>

      {plan.circuits.length === 0 ? (
        <div className="led-empty">
          No circuits yet — add your first power feed (e.g. "HOT 1 — 230 V
          32 A").
          <div style={{ marginTop: 12 }}>
            <button className="btn btn-primary" onClick={onAddCircuit}>
              + Add circuit
            </button>
          </div>
        </div>
      ) : (
        <>
          {plan.circuits.map((c) => (
            <CircuitCard
              key={c.id}
              circuit={c}
              onUpdate={(patch) => onUpdateCircuit(c.id, patch)}
              onRemove={() => onRemoveCircuit(c.id)}
              onAddItem={(phase) => onAddItem(c.id, phase)}
              onUpdateItem={(itemId, patch) =>
                onUpdateItem(c.id, itemId, patch)
              }
              onRemoveItem={(itemId) => onRemoveItem(c.id, itemId)}
              onDuplicateItem={(itemId) => onDuplicateItem(c.id, itemId)}
            />
          ))}

          <div style={{ marginTop: 12 }}>
            <button className="btn btn-primary" onClick={onAddCircuit}>
              + Add circuit
            </button>
          </div>
        </>
      )}
    </section>
  );
}

function CircuitCard({
  circuit,
  onUpdate,
  onRemove,
  onAddItem,
  onUpdateItem,
  onRemoveItem,
  onDuplicateItem,
}: {
  circuit: PowerCircuit;
  onUpdate: (patch: Partial<Omit<PowerCircuit, "items">>) => void;
  onRemove: () => void;
  onAddItem: (phase?: PowerPhase) => void;
  onUpdateItem: (itemId: string, patch: Partial<PowerItem>) => void;
  onRemoveItem: (itemId: string) => void;
  onDuplicateItem: (itemId: string) => void;
}) {
  const load = useMemo(() => computeCircuitLoad(circuit), [circuit]);
  const sev = severityForRatio(load.worstRatio);
  const cardClass =
    sev === "over"
      ? "led-card power-circuit power-circuit--over"
      : sev === "warn"
        ? "led-card power-circuit power-circuit--warn"
        : "led-card power-circuit";

  return (
    <section className={cardClass}>
      <div className="power-circuit-head">
        <div className="power-circuit-id">
          <input
            className="led-input power-circuit-name"
            type="text"
            value={circuit.name}
            onChange={(e) => onUpdate({ name: e.target.value })}
            placeholder="HOT 1"
            aria-label="Circuit name"
          />
          <input
            className="led-input"
            type="text"
            value={circuit.source}
            onChange={(e) => onUpdate({ source: e.target.value })}
            placeholder="Source / label (e.g. PD11 - 230V 32A)"
            aria-label={`Source label for ${circuit.name || "circuit"}`}
          />
        </div>
        <div className="power-circuit-rating">
          <label>
            <span>V</span>
            <input
              className="led-input led-input-num"
              type="number"
              min={1}
              step={10}
              value={circuit.voltage}
              onChange={(e) =>
                onUpdate({
                  voltage: Math.max(1, Number(e.target.value) || 230),
                })
              }
            />
          </label>
          <label>
            <span>A / phase</span>
            <input
              className="led-input led-input-num"
              type="number"
              min={1}
              step={1}
              value={circuit.ampsPerPhase}
              onChange={(e) =>
                onUpdate({
                  ampsPerPhase: Math.max(1, Number(e.target.value) || 32),
                })
              }
            />
          </label>
          <span className="power-circuit-cap">
            Capacity {fmtInt(circuit.voltage * circuit.ampsPerPhase)} W ×&nbsp;3
          </span>
          <button
            type="button"
            className="btn btn-danger btn-sm"
            onClick={onRemove}
            title="Remove circuit"
          >
            Remove circuit
          </button>
        </div>
      </div>

      <div className="power-phase-grid">
        {load.phases.map((p) => {
          const s = severityForRatio(p.ratio);
          const cls =
            s === "over"
              ? "power-phase power-phase--over"
              : s === "warn"
                ? "power-phase power-phase--warn"
                : "power-phase";
          return (
            <div key={p.phase} className={cls}>
              <div className="power-phase-head">
                <strong>{p.phase}</strong>
                <span>{fmtPct(p.ratio)}</span>
              </div>
              <div className="power-phase-bar">
                <div
                  className="power-phase-bar-fill"
                  style={{ width: `${Math.min(100, p.ratio * 100)}%` }}
                />
              </div>
              <div className="power-phase-stats">
                <span>{fmtInt(p.watts)} W</span>
                <span>{fmtNum(p.amps, 2)} A</span>
                <span className="power-phase-cap">
                  / {fmtInt(p.capacityWatts)} W
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="led-table-wrap">
        <table className="led-table">
          <thead>
            <tr>
              <th>Item</th>
              <th>Phase</th>
              <th className="led-num">Qty</th>
              <th className="led-num">Watts/unit</th>
              <th className="led-num">Subtotal W</th>
              <th className="led-num">Subtotal A</th>
              <th>Notes</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {circuit.items.length === 0 ? (
              <tr>
                <td colSpan={8} className="power-empty-row">
                  No items on this circuit yet — add one below.
                </td>
              </tr>
            ) : (
              circuit.items.map((it) => {
                const wTot = it.qty * it.wattsPerUnit;
                const aTot =
                  circuit.voltage > 0 ? wTot / circuit.voltage : 0;
                return (
                  <tr key={it.id}>
                    <td>
                      <input
                        className="led-input"
                        type="text"
                        value={it.name}
                        onChange={(e) =>
                          onUpdateItem(it.id, { name: e.target.value })
                        }
                        placeholder="e.g. Wash – R1 BeamWash"
                        aria-label="Item name"
                      />
                    </td>
                    <td>
                      <select
                        className="led-input"
                        value={it.phase}
                        onChange={(e) =>
                          onUpdateItem(it.id, {
                            phase: e.target.value as PowerPhase,
                          })
                        }
                        aria-label="Phase"
                      >
                        {POWER_PHASES.map((p) => (
                          <option key={p} value={p}>
                            {p}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <input
                        className="led-input led-input-num"
                        type="number"
                        min={1}
                        step={1}
                        value={it.qty}
                        onChange={(e) =>
                          onUpdateItem(it.id, {
                            qty: Math.max(
                              1,
                              Math.round(Number(e.target.value) || 1),
                            ),
                          })
                        }
                        aria-label="Quantity"
                      />
                    </td>
                    <td>
                      <input
                        className="led-input led-input-num"
                        type="number"
                        min={0}
                        step={10}
                        value={it.wattsPerUnit}
                        onChange={(e) =>
                          onUpdateItem(it.id, {
                            wattsPerUnit: Math.max(
                              0,
                              Number(e.target.value) || 0,
                            ),
                          })
                        }
                        aria-label="Watts per unit"
                      />
                    </td>
                    <td className="led-num">{fmtInt(wTot)}</td>
                    <td className="led-num">{fmtNum(aTot, 2)}</td>
                    <td>
                      <input
                        className="led-input"
                        type="text"
                        value={it.notes}
                        onChange={(e) =>
                          onUpdateItem(it.id, { notes: e.target.value })
                        }
                        placeholder="optional"
                        aria-label="Notes"
                      />
                    </td>
                    <td className="led-actions">
                      <button
                        type="button"
                        className="btn btn-soft btn-sm"
                        onClick={() => onDuplicateItem(it.id)}
                        title="Duplicate"
                      >
                        Copy
                      </button>
                      <button
                        type="button"
                        className="btn btn-danger btn-sm"
                        onClick={() => onRemoveItem(it.id)}
                        title="Remove"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="power-circuit-foot">
        <button
          type="button"
          className="btn btn-soft"
          onClick={() => onAddItem("L1")}
        >
          + Add to L1
        </button>
        <button
          type="button"
          className="btn btn-soft"
          onClick={() => onAddItem("L2")}
        >
          + Add to L2
        </button>
        <button
          type="button"
          className="btn btn-soft"
          onClick={() => onAddItem("L3")}
        >
          + Add to L3
        </button>
        <span className="power-circuit-total">
          Total {fmtInt(load.totalWatts)} W of {fmtInt(load.totalCapacityWatts)}{" "}
          W ({fmtPct(load.worstRatio)} worst phase)
        </span>
      </div>
    </section>
  );
}
