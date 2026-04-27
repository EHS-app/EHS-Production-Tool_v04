import { useMemo } from "react";
import {
  CUSTOM_PANEL_KEY,
  LED_SCREEN_COLORS,
  type LedPanel,
  type LedPanelKey,
  type LedScreen,
  type LedSettings,
  type LedTotals,
  type LedCustomPanel,
  colLabel,
  computeScreenMetrics,
  resolveScreenPanel,
} from "../lib/led";

type Props = {
  screens: LedScreen[];
  panels: LedPanel[];
  settings: LedSettings;
  totals: LedTotals;
  linkedCount: number;
  standaloneCount: number;
  onAddScreen: () => void;
  onUpdateScreen: (id: string, patch: Partial<LedScreen>) => void;
  onUpdateCustomPanel: (id: string, patch: Partial<LedCustomPanel>) => void;
  onRemoveScreen: (id: string) => void;
  onDuplicateScreen: (id: string) => void;
  onUpdateSettings: (patch: Partial<LedSettings>) => void;
  onJumpToRigging: () => void;
};

const PIXEL_FMT = new Intl.NumberFormat("en-US");
const fmt = (n: number, d = 1) =>
  n.toLocaleString("en-US", { maximumFractionDigits: d });

export function LedScreenReportView(props: Props) {
  const {
    screens,
    panels,
    settings,
    totals,
    linkedCount,
    standaloneCount,
    onAddScreen,
    onUpdateScreen,
    onUpdateCustomPanel,
    onRemoveScreen,
    onDuplicateScreen,
    onUpdateSettings,
    onJumpToRigging,
  } = props;

  return (
    <div className="led-report">
      <header className="led-report-header">
        <div>
          <h2>LED Screen Report</h2>
          <p className="led-report-sub">
            Pixel map generator for LED video systems. Define your screens,
            assign processor outputs, and review the visual layout.
          </p>
        </div>
        <div className="led-report-meta">
          <span className="badge">
            {linkedCount} linked · {standaloneCount} manual
          </span>
          <button className="btn btn-soft" onClick={onJumpToRigging}>
            ↗ Rigging Report
          </button>
        </div>
      </header>

      <LedDashboard totals={totals} settings={settings} />

      <section className="led-card">
        <div className="led-card-head">
          <h3>Screens</h3>
          <div className="led-controls">
            <label className="led-inline-field">
              <span>Pixels per output</span>
              <input
                type="number"
                min={1000}
                step={1000}
                value={settings.portLimit}
                onChange={(e) =>
                  onUpdateSettings({
                    portLimit: Math.max(1000, Number(e.target.value) || 1000),
                  })
                }
              />
            </label>
            <label className="led-inline-field led-inline-checkbox">
              <input
                type="checkbox"
                checked={settings.showLabels}
                onChange={(e) =>
                  onUpdateSettings({ showLabels: e.target.checked })
                }
              />
              <span>Show panel labels</span>
            </label>
            <button className="btn btn-primary" onClick={onAddScreen}>
              + Add Screen
            </button>
          </div>
        </div>

        {screens.length === 0 ? (
          <div className="led-empty">
            No screens yet. Add one with the button above, or add an LED row
            on the Rigging Report and it will appear here automatically.
          </div>
        ) : (
          <div className="led-table-wrap">
            <table className="led-table">
              <thead>
                <tr>
                  <th>Source</th>
                  <th>Name</th>
                  <th>Panel</th>
                  <th>Wide</th>
                  <th>Tall</th>
                  <th>Resolution</th>
                  <th>Size (m)</th>
                  <th>Output</th>
                  <th>Color</th>
                  <th>Notes</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {screens.map((s) => (
                  <ScreenRow
                    key={s.id}
                    screen={s}
                    panels={panels}
                    onUpdate={(patch) => onUpdateScreen(s.id, patch)}
                    onUpdateCustomPanel={(patch) =>
                      onUpdateCustomPanel(s.id, patch)
                    }
                    onRemove={() => onRemoveScreen(s.id)}
                    onDuplicate={() => onDuplicateScreen(s.id)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {screens.length > 0 && (
        <section className="led-card">
          <div className="led-card-head">
            <h3>Pixel Map</h3>
            <span className="led-hint">
              Each cell is one panel. Columns are letters (A, B, C…), rows are
              numbers (1, 2, 3…). Output assignments shown as numbered
              circles.
            </span>
          </div>
          <PixelMapCanvas
            screens={screens}
            panels={panels}
            settings={settings}
          />
        </section>
      )}
    </div>
  );
}

function LedDashboard({
  totals,
  settings,
}: {
  totals: LedTotals;
  settings: LedSettings;
}) {
  return (
    <div className="led-dashboard">
      <Stat label="Screens" value={fmt(totals.screens, 0)} />
      <Stat label="Panels" value={fmt(totals.panels, 0)} />
      <Stat label="Total pixels" value={PIXEL_FMT.format(totals.pixels)} />
      <Stat label="Area" value={`${fmt(totals.areaM2, 1)} m²`} />
      <Stat label="Weight" value={`${fmt(totals.weightKg, 1)} kg`} />
      <Stat label="Power" value={`${fmt(totals.powerW / 1000, 2)} kW`} />
      <Stat
        label="Outputs needed"
        value={fmt(totals.portsNeeded, 0)}
        sub={`@ ${PIXEL_FMT.format(settings.portLimit)} px/output`}
      />
    </div>
  );
}

function Stat({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="led-stat">
      <div className="led-stat-label">{label}</div>
      <div className="led-stat-value">{value}</div>
      {sub && <div className="led-stat-sub">{sub}</div>}
    </div>
  );
}

function ScreenRow({
  screen,
  panels,
  onUpdate,
  onUpdateCustomPanel,
  onRemove,
  onDuplicate,
}: {
  screen: LedScreen;
  panels: LedPanel[];
  onUpdate: (patch: Partial<LedScreen>) => void;
  onUpdateCustomPanel: (patch: Partial<LedCustomPanel>) => void;
  onRemove: () => void;
  onDuplicate: () => void;
}) {
  const panel = resolveScreenPanel(screen, panels);
  const m = computeScreenMetrics(screen, panels);
  const isCustom = screen.panelKey === CUSTOM_PANEL_KEY;

  return (
    <>
      <tr className={screen.linked ? "led-row-linked" : ""}>
        <td>
          {screen.linked ? (
            <span className="badge badge-linked" title="From rigging report">
              Linked
            </span>
          ) : (
            <span className="badge badge-manual">Manual</span>
          )}
        </td>
        <td>
          <input
            className="led-input"
            type="text"
            value={screen.name}
            onChange={(e) => onUpdate({ name: e.target.value })}
          />
        </td>
        <td>
          <select
            className="led-input"
            value={screen.panelKey}
            onChange={(e) => onUpdate({ panelKey: e.target.value as LedPanelKey })}
          >
            {/* If the stored key isn't in the current library (e.g. an
                inventory item was renamed), surface it as a placeholder so
                the user can see it before re-picking. */}
            {!panels.some((p) => p.key === screen.panelKey) && (
              <option value={screen.panelKey}>{screen.panelKey} (missing)</option>
            )}
            {panels.map((p) => (
              <option key={p.key} value={p.key}>
                {p.name}
              </option>
            ))}
          </select>
        </td>
        <td>
          <input
            className="led-input led-input-num"
            type="number"
            min={1}
            value={screen.panelsWide}
            onChange={(e) =>
              onUpdate({
                panelsWide: Math.max(1, Number(e.target.value) || 1),
              })
            }
          />
        </td>
        <td>
          <input
            className="led-input led-input-num"
            type="number"
            min={1}
            value={screen.panelsTall}
            onChange={(e) =>
              onUpdate({
                panelsTall: Math.max(1, Number(e.target.value) || 1),
              })
            }
          />
        </td>
        <td className="led-num">
          {PIXEL_FMT.format(m.pixelsX)} × {PIXEL_FMT.format(m.pixelsY)}
          <div className="led-sub">
            {PIXEL_FMT.format(m.pixels)} px · {m.panels} panels
          </div>
        </td>
        <td className="led-num">
          {fmt(m.widthM, 2)} × {fmt(m.heightM, 2)}
          <div className="led-sub">{fmt(m.areaM2, 2)} m²</div>
        </td>
        <td>
          <input
            className="led-input led-input-num"
            type="number"
            min={1}
            placeholder="—"
            value={screen.outputIndex ?? ""}
            onChange={(e) => {
              const v = e.target.value;
              onUpdate({
                outputIndex:
                  v === "" ? null : Math.max(1, Number(v) || 1),
              });
            }}
          />
        </td>
        <td>
          <div className="led-color-picker">
            {LED_SCREEN_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                className={`led-color-swatch ${screen.color === c ? "is-active" : ""}`}
                style={{ background: c }}
                onClick={() => onUpdate({ color: c })}
                aria-label={`Color ${c}`}
              />
            ))}
          </div>
        </td>
        <td>
          <input
            className="led-input"
            type="text"
            value={screen.notes}
            onChange={(e) => onUpdate({ notes: e.target.value })}
            placeholder="Position, notes…"
          />
        </td>
        <td className="led-actions">
          <button
            className="btn btn-soft btn-sm"
            onClick={onDuplicate}
            title="Duplicate"
          >
            ⎘
          </button>
          {!screen.linked && (
            <button
              className="btn btn-danger btn-sm"
              onClick={onRemove}
              title="Remove"
            >
              ✕
            </button>
          )}
        </td>
      </tr>
      {isCustom && (
        <tr className="led-row-custom">
          <td colSpan={11}>
            <div className="led-custom-panel">
              <strong>Custom panel:</strong>
              <label>
                Pixels W
                <input
                  type="number"
                  min={1}
                  value={panel.pixelWidth}
                  onChange={(e) =>
                    onUpdateCustomPanel({
                      pixelWidth: Math.max(1, Number(e.target.value) || 1),
                    })
                  }
                />
              </label>
              <label>
                Pixels H
                <input
                  type="number"
                  min={1}
                  value={panel.pixelHeight}
                  onChange={(e) =>
                    onUpdateCustomPanel({
                      pixelHeight: Math.max(1, Number(e.target.value) || 1),
                    })
                  }
                />
              </label>
              <label>
                Width (m)
                <input
                  type="number"
                  min={0.01}
                  step={0.01}
                  value={panel.physicalWidth}
                  onChange={(e) =>
                    onUpdateCustomPanel({
                      physicalWidth: Math.max(
                        0.01,
                        Number(e.target.value) || 0.5,
                      ),
                    })
                  }
                />
              </label>
              <label>
                Height (m)
                <input
                  type="number"
                  min={0.01}
                  step={0.01}
                  value={panel.physicalHeight}
                  onChange={(e) =>
                    onUpdateCustomPanel({
                      physicalHeight: Math.max(
                        0.01,
                        Number(e.target.value) || 0.5,
                      ),
                    })
                  }
                />
              </label>
              <label>
                Weight (kg)
                <input
                  type="number"
                  min={0}
                  step={0.1}
                  value={panel.weight}
                  onChange={(e) =>
                    onUpdateCustomPanel({
                      weight: Math.max(0, Number(e.target.value) || 0),
                    })
                  }
                />
              </label>
              <label>
                Power (W)
                <input
                  type="number"
                  min={0}
                  step={1}
                  value={panel.power}
                  onChange={(e) =>
                    onUpdateCustomPanel({
                      power: Math.max(0, Number(e.target.value) || 0),
                    })
                  }
                />
              </label>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

function PixelMapCanvas({
  screens,
  panels,
  settings,
}: {
  screens: LedScreen[];
  panels: LedPanel[];
  settings: LedSettings;
}) {
  const layout = useMemo(() => {
    const SCALE = 70; // px per meter
    const GAP = 30; // px gap between screens
    const TOP = 60; // px reserved for output badge above each screen
    const PAD = 20;

    let cursorX = PAD;
    let maxBottom = 0;
    const items = screens.map((s) => {
      const panel = resolveScreenPanel(s, panels);
      const screenWidthPx = s.panelsWide * panel.physicalWidth * SCALE;
      const screenHeightPx = s.panelsTall * panel.physicalHeight * SCALE;
      const cellW = panel.physicalWidth * SCALE;
      const cellH = panel.physicalHeight * SCALE;
      const item = {
        screen: s,
        panel,
        x: cursorX,
        y: TOP + PAD,
        width: screenWidthPx,
        height: screenHeightPx,
        cellW,
        cellH,
      };
      cursorX += screenWidthPx + GAP;
      maxBottom = Math.max(maxBottom, TOP + PAD + screenHeightPx);
      return item;
    });

    const totalWidth = Math.max(cursorX - GAP + PAD, 400);
    const totalHeight = Math.max(maxBottom + PAD, 200);

    return { items, totalWidth, totalHeight };
  }, [screens, panels]);

  return (
    <div className="led-canvas-wrap">
      <svg
        className="led-canvas"
        viewBox={`0 0 ${layout.totalWidth} ${layout.totalHeight}`}
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label="Pixel map of LED screens"
      >
        {layout.items.map((item) => (
          <ScreenSvg
            key={item.screen.id}
            item={item}
            panels={panels}
            showLabels={settings.showLabels}
          />
        ))}
      </svg>
    </div>
  );
}

type SvgItem = {
  screen: LedScreen;
  panel: LedPanel;
  x: number;
  y: number;
  width: number;
  height: number;
  cellW: number;
  cellH: number;
};

function ScreenSvg({
  item,
  panels,
  showLabels,
}: {
  item: SvgItem;
  panels: LedPanel[];
  showLabels: boolean;
}) {
  const { screen, x, y, width, height, cellW, cellH } = item;
  const cells: React.ReactNode[] = [];
  const minDim = Math.min(cellW, cellH);
  const labelFont = Math.max(7, Math.min(14, minDim * 0.32));
  const showLabelsHere = showLabels && minDim >= 14;

  for (let row = 0; row < screen.panelsTall; row++) {
    for (let col = 0; col < screen.panelsWide; col++) {
      const cx = x + col * cellW;
      const cy = y + row * cellH;
      cells.push(
        <g key={`${col}-${row}`}>
          <rect
            x={cx}
            y={cy}
            width={cellW}
            height={cellH}
            fill={screen.color}
            fillOpacity={0.55}
            stroke="#0f172a"
            strokeOpacity={0.5}
            strokeWidth={1}
          />
          {showLabelsHere && (
            <text
              x={cx + cellW / 2}
              y={cy + cellH / 2}
              fontSize={labelFont}
              fill="#0f172a"
              textAnchor="middle"
              dominantBaseline="central"
              fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
            >
              {colLabel(col)}
              {row + 1}
            </text>
          )}
        </g>,
      );
    }
  }

  const m = computeScreenMetrics(screen, panels);
  const titleY = y - 36;
  const subY = y - 18;

  return (
    <g>
      {/* Output badge */}
      {screen.outputIndex != null && (
        <g>
          <circle
            cx={x + width / 2}
            cy={y - 26}
            r={18}
            fill={screen.color}
            stroke="#0f172a"
            strokeWidth={2}
          />
          <text
            x={x + width / 2}
            y={y - 26}
            fontSize={16}
            fontWeight={700}
            fill="#fff"
            textAnchor="middle"
            dominantBaseline="central"
          >
            {screen.outputIndex}
          </text>
        </g>
      )}
      {/* Screen title */}
      <text
        x={x}
        y={screen.outputIndex != null ? titleY : y - 18}
        fontSize={13}
        fontWeight={600}
        fill="currentColor"
      >
        {screen.name}
      </text>
      {screen.outputIndex != null && (
        <text
          x={x}
          y={subY}
          fontSize={11}
          fill="currentColor"
          opacity={0.7}
        >
          {screen.panelsWide}×{screen.panelsTall} · {m.pixelsX}×{m.pixelsY}px
        </text>
      )}
      {screen.outputIndex == null && (
        <text x={x} y={y - 4} fontSize={11} fill="currentColor" opacity={0.7}>
          {screen.panelsWide}×{screen.panelsTall} · {m.pixelsX}×{m.pixelsY}px
        </text>
      )}
      {/* Panel cells */}
      {cells}
      {/* Outline */}
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill="none"
        stroke="#0f172a"
        strokeWidth={2}
      />
    </g>
  );
}
