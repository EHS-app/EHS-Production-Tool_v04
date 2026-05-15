/** Port-mapping panel.
 *
 *  Producer assigns each enabled cabinet to a processor output port.
 *  v1 features:
 *  - Auto-balance (calls the routing solver)
 *  - Manual click-to-toggle which port a cabinet belongs to
 *  - Per-port chain length + chain-cap warning
 *  - Backup-port assignment when `screen.backupSignalEnabled`
 *
 *  Renders inline below the screen row; only mounted in Advanced
 *  mode. All edits go through `onUpdate`.
 */

import { useMemo, useState } from "react";
import type {
  LedChainPattern,
  LedPanel,
  LedPortAssignment,
  LedScreen,
} from "../../lib/led";
import { cellIndex } from "../../lib/led";
import {
  autoBalancePorts,
  findDoubleAssigned,
  findOrphanCells,
} from "../../lib/led/engine/routing";
import {
  DEFAULT_MAX_CABINETS_PER_DATA_CHAIN,
  checkAllChains,
} from "../../lib/led/engine/signal";

const PORT_COLORS = [
  "#f88000",
  "#3b82f6",
  "#22c55e",
  "#a855f7",
  "#ef4444",
  "#14b8a6",
  "#eab308",
  "#ec4899",
];

export function PortMappingPanel({
  screen,
  panel,
  onUpdate,
}: {
  screen: LedScreen;
  panel: LedPanel;
  onUpdate: (patch: Partial<LedScreen>) => void;
}) {
  void panel;
  const assignments = screen.processorPortAssignments ?? [];
  const [pattern, setPattern] = useState<LedChainPattern>("serpentine-row");
  const [portCount, setPortCount] = useState<number>(() =>
    Math.max(1, assignments.length || 4),
  );

  const orphans = useMemo(
    () => findOrphanCells(screen, assignments),
    [screen, assignments],
  );
  const dupes = useMemo(
    () => findDoubleAssigned(assignments),
    [assignments],
  );
  const chainCheck = useMemo(
    () =>
      checkAllChains(
        assignments,
        screen,
        DEFAULT_MAX_CABINETS_PER_DATA_CHAIN,
      ),
    [assignments, screen],
  );

  function autoBalance() {
    const next = autoBalancePorts({
      screen,
      processorId: screen.processors?.[0]?.id ?? `local-${screen.id}`,
      portCount,
      pattern,
      maxCabinetsPerChain:
        screen.maxCabinetsPerDataChain ?? DEFAULT_MAX_CABINETS_PER_DATA_CHAIN,
    });
    onUpdate({ processorPortAssignments: next });
  }

  function clearAll() {
    onUpdate({ processorPortAssignments: [] });
  }

  function setCellPort(cell: number, port: number) {
    // Remove cell from any other port, then add to target.
    const next: LedPortAssignment[] = assignments.map((a) => ({
      ...a,
      cells: a.cells.filter((c) => c !== cell),
    }));
    let target = next.find((a) => a.portIndex === port);
    if (!target) {
      target = {
        processorId: screen.processors?.[0]?.id ?? `local-${screen.id}`,
        portIndex: port,
        cells: [],
        chainStart: cell,
        chainPattern: pattern,
      };
      next.push(target);
    }
    target.cells = [...target.cells, cell];
    if (target.cells.length === 1) target.chainStart = cell;
    // Drop empty ports to keep the list tidy.
    onUpdate({
      processorPortAssignments: next.filter((a) => a.cells.length > 0),
    });
  }

  function setBackup(portIndex: number, backupIdx: number | undefined) {
    onUpdate({
      processorPortAssignments: assignments.map((a) =>
        a.portIndex === portIndex
          ? { ...a, backupPortIndex: backupIdx }
          : a,
      ),
    });
  }

  // Build a port-by-cell index for fast rendering.
  const portByCell = useMemo(() => {
    const m = new Map<number, number>();
    for (const a of assignments) for (const c of a.cells) m.set(c, a.portIndex);
    return m;
  }, [assignments]);

  const [activePort, setActivePort] = useState<number>(1);

  return (
    <div className="led-port-mapping">
      <div className="led-port-mapping-head">
        <strong>Port mapping</strong>
        <span className="led-port-mapping-stats">
          {assignments.length} port{assignments.length === 1 ? "" : "s"} ·{" "}
          {chainCheck.overCap > 0 && (
            <span className="led-port-mapping-warn">
              {chainCheck.overCap} chain(s) over cap
            </span>
          )}
          {chainCheck.overCap === 0 && orphans.length === 0 && dupes.length === 0 && (
            <span className="led-port-mapping-ok">OK</span>
          )}
          {orphans.length > 0 && (
            <span className="led-port-mapping-warn">
              · {orphans.length} unassigned
            </span>
          )}
          {dupes.length > 0 && (
            <span className="led-port-mapping-warn">
              · {dupes.length} double-assigned
            </span>
          )}
        </span>
      </div>

      <div className="led-port-mapping-toolbar">
        <label className="led-field">
          <span className="led-field-label">Ports</span>
          <input
            className="led-input"
            type="number"
            min={1}
            max={32}
            value={portCount}
            onChange={(e) =>
              setPortCount(
                Math.max(1, Math.min(32, Math.round(Number(e.target.value) || 1))),
              )
            }
            style={{ width: 70 }}
          />
        </label>
        <label className="led-field">
          <span className="led-field-label">Chain pattern</span>
          <select
            className="led-input"
            value={pattern}
            onChange={(e) => setPattern(e.target.value as LedChainPattern)}
          >
            <option value="row">Row L→R</option>
            <option value="column">Column T→B</option>
            <option value="serpentine-row">Serpentine row</option>
            <option value="serpentine-col">Serpentine column</option>
            <option value="custom">Custom</option>
          </select>
        </label>
        <button
          type="button"
          className="btn btn-primary btn-sm"
          onClick={autoBalance}
          title="Auto-balance enabled cabinets across the chosen number of ports"
        >
          Auto-balance
        </button>
        <button
          type="button"
          className="btn btn-soft btn-sm"
          onClick={clearAll}
          disabled={assignments.length === 0}
        >
          Clear
        </button>
      </div>

      {/* Port palette — click to set the active "paint" port. */}
      <div className="led-port-palette" role="group" aria-label="Active port">
        {Array.from({ length: Math.max(portCount, assignments.length) }, (_, i) => i + 1).map(
          (p) => {
            const a = assignments.find((x) => x.portIndex === p);
            const color = PORT_COLORS[(p - 1) % PORT_COLORS.length];
            return (
              <button
                key={p}
                type="button"
                className={`led-port-chip ${activePort === p ? "is-active" : ""}`}
                style={{ borderColor: color, color }}
                onClick={() => setActivePort(p)}
                title={`Port ${p} · ${a?.cells.length ?? 0} cab`}
              >
                P{p}
                <span className="led-port-chip-count">
                  {a?.cells.length ?? 0}
                </span>
              </button>
            );
          },
        )}
      </div>

      {/* Cabinet grid — click a cabinet to assign to the active port. */}
      <div
        className="led-port-grid"
        style={{
          gridTemplateColumns: `repeat(${screen.panelsWide}, 1fr)`,
        }}
      >
        {Array.from({ length: screen.panelsTall }, (_, r) =>
          Array.from({ length: screen.panelsWide }, (_, c) => {
            const idx = cellIndex(c, r, screen.panelsWide);
            const port = portByCell.get(idx);
            const disabled = (screen.disabledCells ?? []).includes(idx);
            const color =
              typeof port === "number"
                ? PORT_COLORS[(port - 1) % PORT_COLORS.length]
                : "transparent";
            return (
              <button
                key={`${r}-${c}`}
                type="button"
                className={`led-port-cell ${disabled ? "is-disabled" : ""}`}
                style={{
                  background: disabled
                    ? "transparent"
                    : color !== "transparent"
                      ? color
                      : "var(--surface-soft)",
                  opacity: disabled ? 0.2 : 1,
                }}
                disabled={disabled}
                onClick={() => setCellPort(idx, activePort)}
                title={
                  disabled
                    ? "Disabled cabinet"
                    : `${String.fromCharCode(65 + c)}${r + 1} → P${activePort}`
                }
              >
                {typeof port === "number" ? `P${port}` : ""}
              </button>
            );
          }),
        ).flat()}
      </div>

      {/* Per-port summary + backup selector. */}
      {assignments.length > 0 && (
        <div className="led-port-summary">
          <table className="led-port-summary-table">
            <thead>
              <tr>
                <th>Port</th>
                <th>Cabs</th>
                <th>Pattern</th>
                <th>Status</th>
                {screen.backupSignalEnabled && <th>Backup</th>}
              </tr>
            </thead>
            <tbody>
              {assignments.map((a) => {
                const cap =
                  screen.maxCabinetsPerDataChain ??
                  DEFAULT_MAX_CABINETS_PER_DATA_CHAIN;
                const over = a.cells.length > cap;
                return (
                  <tr key={a.portIndex}>
                    <td style={{ color: PORT_COLORS[(a.portIndex - 1) % PORT_COLORS.length] }}>
                      <strong>P{a.portIndex}</strong>
                    </td>
                    <td>
                      {a.cells.length} / {cap}
                    </td>
                    <td>{a.chainPattern}</td>
                    <td>
                      {over ? (
                        <span className="acs-status-bad">Over cap</span>
                      ) : (
                        <span className="acs-status-ok">OK</span>
                      )}
                    </td>
                    {screen.backupSignalEnabled && (
                      <td>
                        <select
                          className="led-input"
                          value={a.backupPortIndex ?? ""}
                          onChange={(e) => {
                            const v = e.target.value;
                            setBackup(a.portIndex, v ? Number(v) : undefined);
                          }}
                        >
                          <option value="">—</option>
                          {assignments
                            .filter((x) => x.portIndex !== a.portIndex)
                            .map((x) => (
                              <option key={x.portIndex} value={x.portIndex}>
                                P{x.portIndex}
                              </option>
                            ))}
                        </select>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
