import { useMemo, useState } from "react";
import {
  CUSTOM_PANEL_KEY,
  LED_PANEL_COLOR_PRESETS,
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
  onExportScreen: (id: string) => void | Promise<void>;
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
    onExportScreen,
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

      <ExportOptions
        settings={settings}
        onUpdateSettings={onUpdateSettings}
      />

      <section className="led-card">
        <div className="led-card-head">
          <h3>Screens</h3>
          <div className="led-controls">
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
                    onExport={() => onExportScreen(s.id)}
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
  onExport,
}: {
  screen: LedScreen;
  panels: LedPanel[];
  onUpdate: (patch: Partial<LedScreen>) => void;
  onUpdateCustomPanel: (patch: Partial<LedCustomPanel>) => void;
  onRemove: () => void;
  onDuplicate: () => void;
  onExport: () => void | Promise<void>;
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
            className="led-input led-input-name"
            type="text"
            value={screen.name}
            onChange={(e) => onUpdate({ name: e.target.value })}
            placeholder="e.g. Main, IMAG, Side L…"
            title="This name appears as the centered pill on the pixel map and on the exported PNG."
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
            className="btn btn-primary btn-sm"
            onClick={() => onExport()}
            title="Export PNG pixel map"
          >
            PNG
          </button>
          <button
            className="btn btn-soft btn-sm"
            onClick={onDuplicate}
            title="Duplicate this screen"
          >
            Copy
          </button>
          {!screen.linked && (
            <button
              className="btn btn-danger btn-sm"
              onClick={() => {
                if (
                  window.confirm(
                    `Delete screen "${screen.name || "(unnamed)"}"? This can't be undone.`,
                  )
                ) {
                  onRemove();
                }
              }}
              title="Delete this screen"
            >
              Delete
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
            settings={settings}
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
  settings,
}: {
  item: SvgItem;
  panels: LedPanel[];
  settings: LedSettings;
}) {
  const { screen, x, y, width, height, cellW, cellH } = item;
  const cells: React.ReactNode[] = [];
  const minDim = Math.min(cellW, cellH);
  const labelFont = Math.max(7, Math.min(14, minDim * 0.32));
  const showLabelsHere = settings.showLabels && minDim >= 14;

  for (let row = 0; row < screen.panelsTall; row++) {
    for (let col = 0; col < screen.panelsWide; col++) {
      const cx = x + col * cellW;
      const cy = y + row * cellH;
      const cellFill =
        col % 2 === 0 ? settings.panelColorDark : settings.panelColorLight;
      cells.push(
        <g key={`${col}-${row}`}>
          <rect
            x={cx}
            y={cy}
            width={cellW}
            height={cellH}
            fill={cellFill}
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
      {/* Centered "Main"/"IMAG" name pill — matches the PNG export so the
          user can preview what they'll get. Hidden if the user disabled
          the pill in Export options, or if there is no name. */}
      {settings.showScreenName && screen.name.trim().length > 0 && (() => {
        const name = screen.name;
        const pillFont = Math.max(
          14,
          Math.min(36, Math.min(width, height) * 0.08),
        );
        // Approximate text width — we don't have measureText in SVG so we
        // budget ~0.62em per char which is a safe upper bound for most
        // sans-serif fonts.
        const padX = pillFont * 0.9;
        const padY = pillFont * 0.45;
        const textW = name.length * pillFont * 0.62;
        const pillW = textW + padX * 2;
        const pillH = pillFont + padY * 2;
        const cx = x + width / 2;
        const cy = y + height / 2;
        return (
          <g pointerEvents="none">
            <rect
              x={cx - pillW / 2}
              y={cy - pillH / 2}
              width={pillW}
              height={pillH}
              rx={pillH / 2}
              ry={pillH / 2}
              fill="#ffffff"
              stroke="#0f172a"
              strokeWidth={2}
              opacity={0.95}
            />
            <text
              x={cx}
              y={cy}
              fontSize={pillFont}
              fontWeight={700}
              fill="#0f172a"
              textAnchor="middle"
              dominantBaseline="central"
              fontFamily="system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
            >
              {name}
            </text>
          </g>
        );
      })()}
    </g>
  );
}

function ExportOptions({
  settings,
  onUpdateSettings,
}: {
  settings: LedSettings;
  onUpdateSettings: (patch: Partial<LedSettings>) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <section className="led-card led-export-card">
      <div className="led-card-head">
        <h3>
          <button
            type="button"
            className="led-disclosure"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
          >
            <span className="led-disclosure-arrow">{open ? "▼" : "▶"}</span>
            Export options (PNG)
          </button>
        </h3>
        <span className="led-hint">
          Affects what the per-screen <strong>PNG</strong> button renders.
          The on-screen pixel map below uses these too where applicable.
        </span>
      </div>

      {open && (
        <div className="led-export-grid">
          <label className="led-inline-field">
            <span>Output mode</span>
            <select
              className="led-input"
              value={settings.outputMode}
              onChange={(e) =>
                onUpdateSettings({
                  outputMode: e.target.value as LedSettings["outputMode"],
                })
              }
            >
              <option value="per-screen">One per screen</option>
              <option value="per-row">One per panel row</option>
            </select>
          </label>

          <label className="led-inline-field">
            <span>Wire path</span>
            <select
              className="led-input"
              value={settings.wirePath}
              onChange={(e) =>
                onUpdateSettings({
                  wirePath: e.target.value as LedSettings["wirePath"],
                })
              }
            >
              <option value="linear">Linear (rows L→R)</option>
              <option value="serpentine">Serpentine (alternates)</option>
            </select>
          </label>

          <label className="led-inline-field">
            <span>Pixels per output</span>
            <input
              type="number"
              className="led-input"
              min={1000}
              step={1000}
              disabled={settings.outputMode !== "per-screen"}
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
            <span>Show panel labels (A1, B1…)</span>
          </label>

          <label className="led-inline-field led-inline-checkbox">
            <input
              type="checkbox"
              checked={settings.showArrows}
              onChange={(e) =>
                onUpdateSettings({ showArrows: e.target.checked })
              }
            />
            <span>Show data-flow arrows</span>
          </label>

          <label className="led-inline-field led-inline-checkbox">
            <input
              type="checkbox"
              checked={settings.showTestPattern}
              onChange={(e) =>
                onUpdateSettings({ showTestPattern: e.target.checked })
              }
            />
            <span>Show alignment circle + corner X</span>
          </label>

          <label className="led-inline-field led-inline-checkbox">
            <input
              type="checkbox"
              checked={settings.showScreenName}
              onChange={(e) =>
                onUpdateSettings({ showScreenName: e.target.checked })
              }
            />
            <span>Show screen name pill</span>
          </label>

          <label className="led-inline-field led-inline-checkbox">
            <input
              type="checkbox"
              checked={settings.showInfoBar}
              onChange={(e) =>
                onUpdateSettings({ showInfoBar: e.target.checked })
              }
            />
            <span>Show bottom info bar</span>
          </label>

          <label className="led-inline-field led-inline-checkbox">
            <input
              type="checkbox"
              checked={settings.showLogo}
              onChange={(e) =>
                onUpdateSettings({ showLogo: e.target.checked })
              }
            />
            <span>Show EHS logo</span>
          </label>

          <div className="led-inline-field led-color-pair-field">
            <span>Panel colors (alternating)</span>
            <div className="led-color-pair-row">
              <label className="led-color-input">
                <input
                  type="color"
                  value={settings.panelColorDark}
                  onChange={(e) =>
                    onUpdateSettings({ panelColorDark: e.target.value })
                  }
                  aria-label="Dark panel color"
                />
                <span>Dark</span>
              </label>
              <label className="led-color-input">
                <input
                  type="color"
                  value={settings.panelColorLight}
                  onChange={(e) =>
                    onUpdateSettings({ panelColorLight: e.target.value })
                  }
                  aria-label="Light panel color"
                />
                <span>Light</span>
              </label>
            </div>
            <div className="led-color-presets">
              {LED_PANEL_COLOR_PRESETS.map((p) => {
                const isActive =
                  settings.panelColorDark.toLowerCase() ===
                    p.dark.toLowerCase() &&
                  settings.panelColorLight.toLowerCase() ===
                    p.light.toLowerCase();
                return (
                  <button
                    key={p.label}
                    type="button"
                    className={`led-color-preset ${isActive ? "is-active" : ""}`}
                    title={`Use ${p.label} preset`}
                    onClick={() =>
                      onUpdateSettings({
                        panelColorDark: p.dark,
                        panelColorLight: p.light,
                      })
                    }
                  >
                    <span
                      className="led-color-preset-half"
                      style={{ background: p.dark }}
                    />
                    <span
                      className="led-color-preset-half"
                      style={{ background: p.light }}
                    />
                    <span className="led-color-preset-label">{p.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
