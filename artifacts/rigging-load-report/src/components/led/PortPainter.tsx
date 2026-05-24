/** Producer-painted Power / Signal map for one LED screen.
 *
 *  Renders the panel grid as an SVG; the producer picks a port from
 *  the chip bar at the top and click-paints cells in the order they
 *  should be daisy-chained. The component draws:
 *    - a coloured fill on every painted cell
 *    - an arrow from cells[i] → cells[i+1] for each port
 *    - a numbered circle on cells[0] (the chain start)
 *    - a header strip with the panel count + resolution + aspect
 *  ...and surfaces a cable-count summary + PNG/PDF export.
 *
 *  Cell click behaviour with the active port selected:
 *    - cell not in any port  →  appended to active port's chain
 *    - cell already in active port  →  removed from chain
 *    - cell in a different port  →  moved to active port (appended)
 *
 *  Mobile-friendly: cells are tap-targets, port chips wrap, the
 *  SVG scales to its container width.
 */

import {
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { jsPDF } from "jspdf";
import type {
  LedPanel,
  LedPortChain,
  LedPortMap,
  LedScreen,
} from "../../lib/led";
import { disabledCellSet, resolveScreenPanel } from "../../lib/led";

type PaintKind = "power" | "signal";

const POWER_PALETTE = [
  "#F88000", "#E0641A", "#C0392B", "#D35400", "#E67E22",
  "#B7410E", "#A04000", "#FF7043",
];
const SIGNAL_PALETTE = [
  "#2A6FB0", "#1F6F8B", "#2980B9", "#3F51B5", "#1565C0",
  "#0288D1", "#5C6BC0", "#3949AB",
];

const ALT_CELL_DARK = "#3a3a44";
const ALT_CELL_LIGHT = "#d4d6db";

function newPortId(): string {
  return `p_${Math.random().toString(36).slice(2, 9)}`;
}

function nextLabel(existing: LedPortChain[]): string {
  const nums = existing
    .map((p) => Number(p.label))
    .filter((n) => Number.isFinite(n) && n > 0);
  const next = nums.length === 0 ? 1 : Math.max(...nums) + 1;
  return String(next);
}

function nextColor(kind: PaintKind, existing: LedPortChain[]): string {
  const palette = kind === "power" ? POWER_PALETTE : SIGNAL_PALETTE;
  return palette[existing.length % palette.length];
}

/** Find the port that owns a given cell, returning {portIdx, cellIdx}
 *  or null. O(n × m) but n × m is the painted-cell count and stays
 *  tiny in practice. */
function findCell(
  ports: LedPortChain[],
  cell: number,
): { portIdx: number; cellIdx: number } | null {
  for (let p = 0; p < ports.length; p++) {
    const i = ports[p].cells.indexOf(cell);
    if (i !== -1) return { portIdx: p, cellIdx: i };
  }
  return null;
}

export function PortPainter({
  screen,
  panels,
  kind,
  map,
  onChange,
}: {
  screen: LedScreen;
  panels: LedPanel[];
  kind: PaintKind;
  map: LedPortMap | undefined;
  onChange: (next: LedPortMap | undefined) => void;
}) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);

  const ports: LedPortChain[] = map?.ports ?? [];
  const disabled = useMemo(() => disabledCellSet(screen), [screen]);
  const panel = useMemo(
    () => resolveScreenPanel(screen, panels),
    [screen, panels],
  );

  const W = screen.panelsWide;
  const H = screen.panelsTall;

  // ── Mutations ──────────────────────────────────────────────────────
  function commit(nextPorts: LedPortChain[]) {
    if (nextPorts.length === 0) onChange(undefined);
    else onChange({ ports: nextPorts });
  }

  function addPort() {
    const port: LedPortChain = {
      id: newPortId(),
      label: nextLabel(ports),
      color: nextColor(kind, ports),
      cells: [],
    };
    commit([...ports, port]);
    setActiveId(port.id);
  }

  function deletePort(id: string) {
    const next = ports.filter((p) => p.id !== id);
    if (activeId === id) setActiveId(next[0]?.id ?? null);
    commit(next);
  }

  function renamePort(id: string, label: string) {
    commit(ports.map((p) => (p.id === id ? { ...p, label } : p)));
  }

  function recolorPort(id: string, color: string) {
    commit(ports.map((p) => (p.id === id ? { ...p, color } : p)));
  }

  function clearPort(id: string) {
    commit(ports.map((p) => (p.id === id ? { ...p, cells: [] } : p)));
  }

  function reverseChain(id: string) {
    commit(
      ports.map((p) =>
        p.id === id ? { ...p, cells: [...p.cells].reverse() } : p,
      ),
    );
  }

  function clickCell(cellIdx: number) {
    if (!activeId) return;
    const activePort = ports.find((p) => p.id === activeId);
    if (!activePort) return;
    const found = findCell(ports, cellIdx);
    let next = ports;
    if (found && ports[found.portIdx].id === activeId) {
      // toggle off
      next = ports.map((p) =>
        p.id === activeId
          ? { ...p, cells: p.cells.filter((c) => c !== cellIdx) }
          : p,
      );
    } else {
      // remove from any other port, append to active
      next = ports.map((p) => {
        if (p.id === activeId) return { ...p, cells: [...p.cells, cellIdx] };
        if (p.cells.includes(cellIdx))
          return { ...p, cells: p.cells.filter((c) => c !== cellIdx) };
        return p;
      });
    }
    commit(next);
  }

  // ── Layout maths ───────────────────────────────────────────────────
  const CELL = 44;
  const GAP = 2;
  const PAD = 12;
  const LABEL_GUTTER = 28;
  const innerW = W * CELL + (W - 1) * GAP;
  const innerH = H * CELL + (H - 1) * GAP;
  const svgW = innerW + LABEL_GUTTER + PAD * 2;
  const svgH = innerH + LABEL_GUTTER + PAD * 2;
  const gridX = PAD + LABEL_GUTTER;
  const gridY = PAD + LABEL_GUTTER;

  function cellRect(col: number, row: number) {
    return {
      x: gridX + col * (CELL + GAP),
      y: gridY + row * (CELL + GAP),
      cx: gridX + col * (CELL + GAP) + CELL / 2,
      cy: gridY + row * (CELL + GAP) + CELL / 2,
    };
  }

  function cellOf(idx: number) {
    return { col: idx % W, row: Math.floor(idx / W) };
  }

  // owner lookup per cell index for fill
  const ownerByCell = useMemo(() => {
    const m = new Map<number, LedPortChain>();
    for (const p of ports) for (const c of p.cells) m.set(c, p);
    return m;
  }, [ports]);

  const totalEnabled = W * H - disabled.size;
  const pixelsW = W * panel.pixelWidth;
  const pixelsH = H * panel.pixelHeight;
  const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
  const ar = gcd(pixelsW, pixelsH) || 1;

  // cable counts (1 per arrow + 1 trunk per port with ≥1 cell)
  const hops = ports.reduce((n, p) => n + Math.max(0, p.cells.length - 1), 0);
  const trunks = ports.filter((p) => p.cells.length > 0).length;

  // ── SVG rendering ──────────────────────────────────────────────────
  const isDark =
    typeof document !== "undefined" &&
    document.documentElement.getAttribute("data-theme") === "dark";
  const cells: React.ReactNode[] = [];
  for (let row = 0; row < H; row++) {
    for (let col = 0; col < W; col++) {
      const idx = row * W + col;
      const isDisabled = disabled.has(idx);
      if (isDisabled) continue;
      const owner = ownerByCell.get(idx);
      const altDark = (col + row) % 2 === 0 ? ALT_CELL_DARK : "#23232d";
      const altLight = (col + row) % 2 === 0 ? ALT_CELL_LIGHT : "#e8eaee";
      const fill = owner?.color ?? (isDark ? altDark : altLight);
      const labelFill = owner
        ? "rgba(255,255,255,0.9)"
        : isDark
          ? "rgba(255,255,255,0.6)"
          : "rgba(0,0,0,0.55)";
      const r = cellRect(col, row);
      cells.push(
        <g key={`c${idx}`} onClick={() => clickCell(idx)} style={{ cursor: activeId ? "pointer" : "default" }}>
          <rect
            x={r.x}
            y={r.y}
            width={CELL}
            height={CELL}
            fill={fill}
            stroke={owner ? "rgba(0,0,0,0.35)" : "rgba(255,255,255,0.08)"}
            strokeWidth={1}
            rx={2}
          />
          <text
            x={r.x + 3}
            y={r.y + 10}
            fontSize={8}
            fill={labelFill}
            fontFamily="system-ui, sans-serif"
            pointerEvents="none"
          >
            {col + 1},{String.fromCharCode(65 + row)}
          </text>
        </g>,
      );
    }
  }

  // arrows + numbered circles per port
  const arrows: React.ReactNode[] = [];
  const circles: React.ReactNode[] = [];
  ports.forEach((p) => {
    for (let i = 0; i < p.cells.length - 1; i++) {
      const a = cellOf(p.cells[i]);
      const b = cellOf(p.cells[i + 1]);
      const A = cellRect(a.col, a.row);
      const B = cellRect(b.col, b.row);
      arrows.push(
        <line
          key={`${p.id}-arr-${i}`}
          x1={A.cx}
          y1={A.cy}
          x2={B.cx}
          y2={B.cy}
          stroke="#111"
          strokeWidth={2.2}
          markerEnd="url(#arrowhead)"
          pointerEvents="none"
        />,
      );
    }
    if (p.cells.length > 0) {
      const s = cellOf(p.cells[0]);
      const R = cellRect(s.col, s.row);
      circles.push(
        <g key={`${p.id}-circle`} pointerEvents="none">
          <circle cx={R.cx} cy={R.cy} r={13} fill="#fff" stroke="#111" strokeWidth={1.5} />
          <text
            x={R.cx}
            y={R.cy + 4}
            fontSize={12}
            fontWeight={700}
            textAnchor="middle"
            fill="#111"
            fontFamily="system-ui, sans-serif"
          >
            {p.label}
          </text>
        </g>,
      );
    }
  });

  // row / col headers
  const headers: React.ReactNode[] = [];
  for (let col = 0; col < W; col++) {
    const r = cellRect(col, 0);
    headers.push(
      <text
        key={`hc${col}`}
        x={r.x + CELL / 2}
        y={gridY - 8}
        fontSize={10}
        textAnchor="middle"
        fill="var(--ink-soft, #999)"
        fontFamily="system-ui, sans-serif"
      >
        {col + 1}
      </text>,
    );
  }
  for (let row = 0; row < H; row++) {
    const r = cellRect(0, row);
    headers.push(
      <text
        key={`hr${row}`}
        x={gridX - 8}
        y={r.y + CELL / 2 + 4}
        fontSize={10}
        textAnchor="end"
        fill="var(--ink-soft, #999)"
        fontFamily="system-ui, sans-serif"
      >
        {String.fromCharCode(65 + row)}
      </text>,
    );
  }

  // ── Export helpers ─────────────────────────────────────────────────
  async function renderToCanvas(): Promise<HTMLCanvasElement | null> {
    const svg = svgRef.current;
    if (!svg) return null;
    const xml = new XMLSerializer().serializeToString(svg);
    const blob = new Blob([xml], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    try {
      const img = new Image();
      img.crossOrigin = "anonymous";
      const loaded = new Promise<HTMLImageElement>((resolve, reject) => {
        img.onload = () => resolve(img);
        img.onerror = (e) => reject(e);
      });
      img.src = url;
      const loadedImg = await loaded;
      const scale = 2;
      const canvas = document.createElement("canvas");
      canvas.width = svgW * scale;
      canvas.height = svgH * scale;
      const ctx = canvas.getContext("2d");
      if (!ctx) return null;
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(loadedImg, 0, 0, canvas.width, canvas.height);
      return canvas;
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  async function exportPng() {
    const canvas = await renderToCanvas();
    if (!canvas) return;
    canvas.toBlob((b) => {
      if (!b) return;
      const a = document.createElement("a");
      a.href = URL.createObjectURL(b);
      a.download = `${screen.name || "screen"}-${kind}-map.png`;
      a.click();
      URL.revokeObjectURL(a.href);
    }, "image/png");
  }

  async function exportPdf() {
    const canvas = await renderToCanvas();
    if (!canvas) return;
    const dataUrl = canvas.toDataURL("image/png");
    const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    pdf.setFontSize(14);
    pdf.text(
      `${screen.name || "Screen"} — ${kind === "power" ? "Power" : "Signal"} plan`,
      14,
      14,
    );
    pdf.setFontSize(10);
    pdf.text(
      `${W} × ${H} panels · ${totalEnabled} cabinets · ${pixelsW} × ${pixelsH} px · ${pixelsW / ar}:${pixelsH / ar}`,
      14,
      20,
    );
    const ratio = canvas.height / canvas.width;
    const drawW = pageW - 28;
    const drawH = Math.min(drawW * ratio, pageH - 50);
    const actualW = drawH < drawW * ratio ? drawH / ratio : drawW;
    pdf.addImage(dataUrl, "PNG", (pageW - actualW) / 2, 26, actualW, actualW * ratio);
    const footY = pageH - 14;
    pdf.setFontSize(10);
    pdf.text(
      `Ports: ${ports.length}    Trunk cables: ${trunks}    Link cables (hops): ${hops}    Total cables: ${trunks + hops}`,
      14,
      footY,
    );
    pdf.save(`${screen.name || "screen"}-${kind}-plan.pdf`);
  }

  // ── Render ─────────────────────────────────────────────────────────
  return (
    <div className="port-painter">
      <div className="pp-header">
        <div className="pp-headline">
          <strong>{W} wide × {H} high</strong>
          <span className="pp-sep">·</span>
          <span>{totalEnabled} panels</span>
          <span className="pp-sep">·</span>
          <span>{pixelsW} × {pixelsH} px</span>
          <span className="pp-sep">·</span>
          <span>{pixelsW / ar}:{pixelsH / ar}</span>
        </div>
        <div className="pp-export">
          <button className="pp-btn" onClick={exportPng}>Export PNG</button>
          <button className="pp-btn" onClick={exportPdf}>Export PDF</button>
        </div>
      </div>

      <div className="pp-ports">
        {ports.map((p) => {
          const active = p.id === activeId;
          return (
            <div
              key={p.id}
              className={`pp-port ${active ? "pp-port-active" : ""}`}
              onClick={() => setActiveId(p.id)}
            >
              <input
                type="color"
                value={p.color}
                onChange={(e) => recolorPort(p.id, e.target.value)}
                onClick={(e) => e.stopPropagation()}
                className="pp-color"
                title="Port color"
              />
              <input
                type="text"
                value={p.label}
                onChange={(e) => renamePort(p.id, e.target.value)}
                onClick={(e) => e.stopPropagation()}
                className="pp-label-input"
                style={{ width: Math.max(40, p.label.length * 9 + 12) }}
                title="Port label"
              />
              <span className="pp-port-count">{p.cells.length}</span>
              <button
                className="pp-icon-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  reverseChain(p.id);
                }}
                title="Reverse chain order"
              >
                ⇄
              </button>
              <button
                className="pp-icon-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  clearPort(p.id);
                }}
                title="Clear painted cells"
              >
                ⌫
              </button>
              <button
                className="pp-icon-btn pp-icon-btn-danger"
                onClick={(e) => {
                  e.stopPropagation();
                  deletePort(p.id);
                }}
                title="Delete port"
              >
                ×
              </button>
            </div>
          );
        })}
        <button className="pp-btn pp-btn-primary" onClick={addPort}>
          + Add {kind === "power" ? "power feed" : "signal port"}
        </button>
      </div>

      <p className="pp-hint">
        {activeId
          ? `Click panels to chain them in order. Click a painted panel again to remove it.`
          : ports.length === 0
            ? `No ${kind} ports yet — click "+ Add" above.`
            : `Pick a port above, then click panels to paint the chain.`}
      </p>

      <div className="pp-svg-wrap">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${svgW} ${svgH}`}
          style={{ width: "100%", height: "auto", maxWidth: svgW, display: "block" } as CSSProperties}
        >
          <defs>
            <marker
              id="arrowhead"
              viewBox="0 0 10 10"
              refX="9"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M0,0 L10,5 L0,10 z" fill="#111" />
            </marker>
          </defs>
          <rect
            x={0}
            y={0}
            width={svgW}
            height={svgH}
            fill={isDark ? "#1c1c24" : "#ffffff"}
          />
          {headers}
          {cells}
          {arrows}
          {circles}
        </svg>
      </div>

      <div className="pp-summary">
        <div>
          <strong>Ports:</strong> {ports.length}
        </div>
        <div>
          <strong>Trunk cables:</strong> {trunks}
        </div>
        <div>
          <strong>Link cables (panel-to-panel):</strong> {hops}
        </div>
        <div>
          <strong>Total cables:</strong> {trunks + hops}
        </div>
      </div>
    </div>
  );
}
