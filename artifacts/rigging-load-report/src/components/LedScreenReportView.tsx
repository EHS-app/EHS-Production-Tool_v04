import { useMemo, useState } from "react";
import { NumberField } from "./NumberField";
import {
  CUSTOM_PANEL_KEY,
  LED_PANEL_COLOR_PRESETS,
  LED_SCREEN_COLORS,
  type LedPanel,
  type LedPanelKey,
  type LedPanelPattern,
  type LedScreen,
  type LedSettings,
  type LedTotals,
  type LedCustomPanel,
  colLabel,
  computeScreenMetrics,
  panelCellColor,
  cellArrowDirection,
  type CellArrowDir,
  resolveScreenPanel,
  outputsForScreen,
} from "../lib/led";
import {
  LED_PROCESSORS,
  findProcessor,
  validateAgainstProcessor,
  type ProcessorCheckResult,
} from "../lib/ledProcessors";

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

      <ProcessorBanner
        totals={totals}
        settings={settings}
        screens={screens}
        panels={panels}
      />

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

function ProcessorBanner({
  totals,
  settings,
  screens,
  panels,
}: {
  totals: LedTotals;
  settings: LedSettings;
  screens: LedScreen[];
  panels: LedPanel[];
}) {
  const proc = findProcessor(settings.processorId);
  if (!proc) return null;
  if (totals.screens === 0) return null;

  // Recompute outputs at the PROCESSOR's per-port limit (e.g. 650 000
  // pixels for the Novastar MX series), so the comparison stays honest
  // even when the user's `portLimit` field is set to something else.
  const outputsAtProcLimit = screens.reduce(
    (sum, s) =>
      sum + outputsForScreen(s, settings, panels, proc.maxPixelsPerOutput),
    0,
  );

  const result: ProcessorCheckResult = validateAgainstProcessor(proc, {
    totalPixels: totals.pixels,
    outputsNeeded: outputsAtProcLimit,
    largestWidthPx: totals.largestWidthPx,
    largestHeightPx: totals.largestHeightPx,
    largestScreenPixels: totals.largestScreenPixels,
  });

  const utilizationPct = Math.min(999, Math.round(result.utilization * 100));
  const outputsPct = Math.min(999, Math.round(result.outputsUtilization * 100));

  return (
    <section
      className={`led-proc-banner is-${result.level}`}
      aria-live="polite"
    >
      <div className="led-proc-head">
        <div className="led-proc-title">
          <span className="led-proc-dot" aria-hidden />
          <span>
            <strong>{proc.name}</strong>
            <span className="led-proc-blurb"> — {proc.blurb}</span>
          </span>
        </div>
        <div className="led-proc-status">
          {result.level === "ok" && "Fits comfortably"}
          {result.level === "warn" && "Fits — near limits"}
          {result.level === "fail" && "Does NOT fit"}
        </div>
      </div>
      <div className="led-proc-meters">
        <Meter
          label="Pixels"
          used={result.totalPixels}
          cap={proc.totalPixels}
          pct={utilizationPct}
          fmt={(n) => PIXEL_FMT.format(n)}
        />
        <Meter
          label="Outputs"
          used={result.outputsNeeded}
          cap={proc.outputs}
          pct={outputsPct}
          fmt={(n) => `${n}`}
        />
        <div className="led-proc-bound">
          <div className="led-proc-bound-label">Largest screen</div>
          <div className="led-proc-bound-value">
            {totals.largestWidthPx.toLocaleString()} ×{" "}
            {totals.largestHeightPx.toLocaleString()} px
          </div>
          <div className="led-proc-bound-sub">
            Max canvas: {proc.maxWidthPx.toLocaleString()} ×{" "}
            {proc.maxHeightPx.toLocaleString()} px
          </div>
        </div>
      </div>
      {result.issues.length > 0 && (
        <ul className="led-proc-issues">
          {result.issues.map((iss, i) => (
            <li key={i} className={`led-proc-issue is-${iss.level}`}>
              {iss.message}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function Meter({
  label,
  used,
  cap,
  pct,
  fmt,
}: {
  label: string;
  used: number;
  cap: number;
  pct: number;
  fmt: (n: number) => string;
}) {
  const overcap = used > cap;
  return (
    <div className="led-proc-meter">
      <div className="led-proc-meter-row">
        <span className="led-proc-meter-label">{label}</span>
        <span className="led-proc-meter-value">
          {fmt(used)} / {fmt(cap)} ({pct}%)
        </span>
      </div>
      <div className="led-proc-meter-track">
        <div
          className={`led-proc-meter-fill ${overcap ? "is-over" : pct > 90 ? "is-warn" : "is-ok"}`}
          style={{ width: `${Math.min(100, pct)}%` }}
        />
      </div>
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
            onChange={(e) =>
              onUpdate({ panelKey: e.target.value as LedPanelKey })
            }
          >
            {/* If the stored key isn't in the current library (e.g. an
                inventory item was renamed), surface it as a placeholder
                so the user can see it before re-picking. */}
            {!panels.some((p) => p.key === screen.panelKey) && (
              <option value={screen.panelKey}>
                {screen.panelKey} (missing)
              </option>
            )}
            {panels.map((p) => (
              <option key={p.key} value={p.key}>
                {p.name}
              </option>
            ))}
          </select>
        </td>
        <td>
          <NumberField
            className="led-input led-input-num"
            min={1}
            value={screen.panelsWide}
            transform={(n) => Math.max(1, Math.round(n || 1))}
            emptyValue={1}
            onCommit={(panelsWide) => onUpdate({ panelsWide })}
          />
        </td>
        <td>
          <NumberField
            className="led-input led-input-num"
            min={1}
            value={screen.panelsTall}
            transform={(n) => Math.max(1, Math.round(n || 1))}
            emptyValue={1}
            onCommit={(panelsTall) => onUpdate({ panelsTall })}
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
                <NumberField
                  min={1}
                  value={panel.pixelWidth}
                  transform={(n) => Math.max(1, Math.round(n || 1))}
                  emptyValue={1}
                  onCommit={(pixelWidth) =>
                    onUpdateCustomPanel({ pixelWidth })
                  }
                />
              </label>
              <label>
                Pixels H
                <NumberField
                  min={1}
                  value={panel.pixelHeight}
                  transform={(n) => Math.max(1, Math.round(n || 1))}
                  emptyValue={1}
                  onCommit={(pixelHeight) =>
                    onUpdateCustomPanel({ pixelHeight })
                  }
                />
              </label>
              <label>
                Width (m)
                <NumberField
                  min={0.01}
                  step={0.01}
                  value={panel.physicalWidth}
                  transform={(n) => Math.max(0.01, n || 0.5)}
                  emptyValue={0.5}
                  onCommit={(physicalWidth) =>
                    onUpdateCustomPanel({ physicalWidth })
                  }
                />
              </label>
              <label>
                Height (m)
                <NumberField
                  min={0.01}
                  step={0.01}
                  value={panel.physicalHeight}
                  transform={(n) => Math.max(0.01, n || 0.5)}
                  emptyValue={0.5}
                  onCommit={(physicalHeight) =>
                    onUpdateCustomPanel({ physicalHeight })
                  }
                />
              </label>
              <label>
                Weight (kg)
                <NumberField
                  min={0}
                  step={0.1}
                  value={panel.weight}
                  transform={(n) => Math.max(0, n || 0)}
                  emptyValue={0}
                  onCommit={(weight) =>
                    onUpdateCustomPanel({ weight })
                  }
                />
              </label>
              <label>
                Power (W)
                <NumberField
                  min={0}
                  step={1}
                  value={panel.power}
                  transform={(n) => Math.max(0, n || 0)}
                  emptyValue={0}
                  onCommit={(power) =>
                    onUpdateCustomPanel({ power })
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
  // Arrows need a bit of room — skip on tiny cells where they'd be a
  // smudge. Labels (top-left) and arrows (bottom-right or center) sit
  // in different parts of the cell, so they don't collide visually.
  const showArrowsHere = settings.showArrows && minDim >= 12;
  const arrowSize = Math.max(6, minDim * 0.32);
  const arrowStroke = Math.max(1.2, arrowSize * 0.16);

  for (let row = 0; row < screen.panelsTall; row++) {
    for (let col = 0; col < screen.panelsWide; col++) {
      const cx = x + col * cellW;
      const cy = y + row * cellH;
      const cellFill = panelCellColor(
        col,
        row,
        settings.panelPattern,
        settings.panelColorDark,
        settings.panelColorLight,
      );
      const arrowDir = showArrowsHere
        ? cellArrowDirection(
            col,
            row,
            screen.panelsWide,
            screen.panelsTall,
            settings.wirePath,
          )
        : null;
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
            // Top-left corner so labels never overlap the centred
            // data-flow arrows. Mirrors the PNG export.
            <text
              x={cx + Math.max(2, cellW * 0.06)}
              y={cy + Math.max(2, cellH * 0.06) + labelFont * 0.85}
              fontSize={labelFont}
              fill="#0f172a"
              fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
              fontWeight={600}
            >
              {colLabel(col)}
              {row + 1}
            </text>
          )}
          {arrowDir && (
            <CellArrow
              cx={cx + cellW / 2}
              cy={cy + cellH / 2}
              size={arrowSize}
              stroke={arrowStroke}
              dir={arrowDir}
            />
          )}
        </g>,
      );
    }
  }

  // Numbered output badges centered above each pair of columns — only
  // shown in column-serpentine mode (which is the typical way large
  // processors slice a wall: one output per 2 columns).
  const colPairBadges: React.ReactNode[] = [];
  if (settings.wirePath === "column-serpentine") {
    const pairs = Math.ceil(screen.panelsWide / 2);
    const startIndex = screen.outputIndex ?? 1;
    const badgeR = Math.max(10, Math.min(20, cellW * 0.35));
    for (let p = 0; p < pairs; p++) {
      const col0 = p * 2;
      const col1 = Math.min(col0 + 1, screen.panelsWide - 1);
      const cxBadge =
        x + ((col0 + col1 + 1) * cellW) / 2;
      const cyBadge = y - badgeR - 6;
      colPairBadges.push(
        <g key={`pair-${p}`}>
          <circle
            cx={cxBadge}
            cy={cyBadge}
            r={badgeR}
            fill="#ffffff"
            stroke="#0f172a"
            strokeWidth={2}
          />
          <text
            x={cxBadge}
            y={cyBadge}
            fontSize={Math.max(11, badgeR * 0.95)}
            fontWeight={700}
            fill="#0f172a"
            textAnchor="middle"
            dominantBaseline="central"
          >
            {startIndex + p}
          </text>
        </g>,
      );
    }
  }

  const m = computeScreenMetrics(screen, panels);
  const titleY = y - 36;
  const subY = y - 18;

  return (
    <g>
      {/* Per-column-pair output badges (column-serpentine wiring only) */}
      {colPairBadges}
      {/* Single per-screen output badge — hidden when the column-pair
          badges are taking over the strip above the screen. */}
      {screen.outputIndex != null &&
        settings.wirePath !== "column-serpentine" && (
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

/** Single arrow centered at (cx, cy), drawn as a stroke + filled arrowhead.
 *  Direction-agnostic so the same component handles up / down / left /
 *  right for the per-cell data-flow indicators. */
function CellArrow({
  cx,
  cy,
  size,
  stroke,
  dir,
}: {
  cx: number;
  cy: number;
  size: number;
  stroke: number;
  dir: Exclude<CellArrowDir, null>;
}) {
  // Compute the line endpoints and the polygon for the arrowhead.
  const half = size / 2;
  const head = size * 0.55;
  let x1 = cx;
  let y1 = cy;
  let x2 = cx;
  let y2 = cy;
  let p1x = 0;
  let p1y = 0;
  let p2x = 0;
  let p2y = 0;
  if (dir === "right") {
    x1 = cx - half;
    x2 = cx + half;
    y1 = y2 = cy;
    p1x = x2 - head;
    p1y = cy - head * 0.6;
    p2x = x2 - head;
    p2y = cy + head * 0.6;
  } else if (dir === "left") {
    x1 = cx + half;
    x2 = cx - half;
    y1 = y2 = cy;
    p1x = x2 + head;
    p1y = cy - head * 0.6;
    p2x = x2 + head;
    p2y = cy + head * 0.6;
  } else if (dir === "down") {
    y1 = cy - half;
    y2 = cy + half;
    x1 = x2 = cx;
    p1x = cx - head * 0.6;
    p1y = y2 - head;
    p2x = cx + head * 0.6;
    p2y = y2 - head;
  } else {
    // up
    y1 = cy + half;
    y2 = cy - half;
    x1 = x2 = cx;
    p1x = cx - head * 0.6;
    p1y = y2 + head;
    p2x = cx + head * 0.6;
    p2y = y2 + head;
  }
  return (
    <g pointerEvents="none">
      <line
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke="#0a0a0a"
        strokeOpacity={0.9}
        strokeWidth={stroke}
        strokeLinecap="round"
      />
      <polygon
        points={`${x2},${y2} ${p1x},${p1y} ${p2x},${p2y}`}
        fill="#0a0a0a"
        fillOpacity={0.9}
      />
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
    <section className={`led-card led-export-card ${open ? "is-open" : ""}`}>
      <button
        type="button"
        className="led-export-header"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span className="led-export-header-main">
          <span className="led-export-header-icon" aria-hidden="true">
            ⚙
          </span>
          <span className="led-export-header-text">
            <span className="led-export-header-title">
              Export options (PNG)
            </span>
            <span className="led-export-header-sub">
              Controls what the per-screen <strong>PNG</strong> button renders.
              The on-screen pixel map uses these too where applicable.
            </span>
          </span>
        </span>
        <span className="led-export-header-chevron" aria-hidden="true">
          {open ? "▾" : "▸"}
        </span>
      </button>

      {open && (
        <div className="led-export-body">
          {/* ── Group 1: Output & wiring ───────────────────────────── */}
          <div className="led-export-group">
            <div className="led-export-group-head">
              <span className="led-export-group-title">Output &amp; wiring</span>
              <span className="led-export-group-hint">
                How the wall is sliced across processor outputs.
              </span>
            </div>
            <div className="led-export-fields">
              <label className="led-field">
                <span className="led-field-label">Output mode</span>
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

              <label className="led-field">
                <span className="led-field-label">Pixels per output</span>
                <NumberField
                  className="led-input"
                  min={1000}
                  step={1000}
                  disabled={settings.outputMode !== "per-screen"}
                  value={settings.portLimit}
                  transform={(n) => Math.max(1000, n || 1000)}
                  emptyValue={1000}
                  onCommit={(portLimit) =>
                    onUpdateSettings({ portLimit })
                  }
                />
              </label>

              <label className="led-field">
                <span className="led-field-label">Wire path</span>
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
                  <option value="serpentine">
                    Serpentine (alternates rows)
                  </option>
                  <option value="column-serpentine">
                    Snake by column (down/up)
                  </option>
                </select>
              </label>

              <label className="led-field">
                <span className="led-field-label">Processor</span>
                <select
                  className="led-input"
                  value={settings.processorId ?? ""}
                  onChange={(e) =>
                    onUpdateSettings({
                      processorId:
                        e.target.value === "" ? null : e.target.value,
                    })
                  }
                >
                  <option value="">— None / generic —</option>
                  {LED_PROCESSORS.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          {/* ── Group 2: Visual overlays ───────────────────────────── */}
          <div className="led-export-group">
            <div className="led-export-group-head">
              <span className="led-export-group-title">Visual overlays</span>
              <span className="led-export-group-hint">
                Toggle the helper graphics drawn on top of every cabinet.
              </span>
            </div>
            <div className="led-export-toggles">
              {(
                [
                  ["showLabels", "Panel labels (A1, B1…)"],
                  ["showArrows", "Data-flow arrows"],
                  ["showTestPattern", "Alignment circle + corner X"],
                  ["showScreenName", "Screen name pill"],
                  ["showInfoBar", "Bottom info bar"],
                  ["showLogo", "EHS logo"],
                ] as const
              ).map(([key, label]) => {
                const checked = Boolean(settings[key]);
                return (
                  <label
                    key={key}
                    className={`led-toggle-card ${checked ? "is-on" : ""}`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) =>
                        onUpdateSettings({
                          [key]: e.target.checked,
                        } as Partial<LedSettings>)
                      }
                    />
                    <span className="led-toggle-card-text">{label}</span>
                    <span
                      className="led-toggle-card-pill"
                      aria-hidden="true"
                    >
                      {checked ? "On" : "Off"}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* ── Group 3: Look &amp; feel ───────────────────────────── */}
          <div className="led-export-group">
            <div className="led-export-group-head">
              <span className="led-export-group-title">Look &amp; feel</span>
              <span className="led-export-group-hint">
                Cabinet pattern and the alternating tint used on the map.
              </span>
            </div>

            <div className="led-export-look">
              <label className="led-field">
                <span className="led-field-label">Panel pattern</span>
                <select
                  className="led-input"
                  value={settings.panelPattern}
                  onChange={(e) =>
                    onUpdateSettings({
                      panelPattern: e.target.value as LedPanelPattern,
                    })
                  }
                >
                  <option value="checker">
                    Checkerboard (every panel visible)
                  </option>
                  <option value="columns">Vertical stripes (columns)</option>
                </select>
              </label>

              <div className="led-field">
                <span className="led-field-label">Panel colors</span>
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
              </div>
            </div>

            <div className="led-export-presets">
              <span className="led-export-presets-label">Presets</span>
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
        </div>
      )}
    </section>
  );
}
