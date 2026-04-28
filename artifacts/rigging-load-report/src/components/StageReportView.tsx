import { useMemo, useState } from "react";
import {
  STAGE_DECKS,
  STAGE_LEG_HEIGHTS_CM,
  STAGE_LEGS,
  computeStage,
  computeStageTotals,
  nivtecBracingNote,
  placementCollides,
  placementsBounds,
  snapHalfMetre,
  type DeckPlacement,
  type Stage,
  type StageDeckKey,
  type StageEditMode,
  type StageLegMode,
} from "../lib/stage";

/** Half-metre cell helper. */
const HALF_M = 0.5;

/** Catalog dimensions per deck key (in metres). Used by the palette and
 *  the manual placer to know each deck's size. Non-square decks can be
 *  rotated 90° for placement. */
const DECK_DIMS: Record<StageDeckKey, { w: number; d: number }> = {
  "2x1": { w: 2, d: 1 },
  "1x1": { w: 1, d: 1 },
  "0.5x2": { w: 0.5, d: 2 },
  "0.5x1": { w: 0.5, d: 1 },
};

/** Resolve the placed dimensions of a deck, applying the current rotate
 *  flag. 1×1 ignores rotation. */
function placedDims(
  key: StageDeckKey,
  rotated: boolean,
): { w: number; d: number } {
  const base = DECK_DIMS[key];
  if (key === "1x1" || !rotated) return base;
  return { w: base.d, d: base.w };
}

type Props = {
  stages: Stage[];
  onAdd: () => void;
  onUpdate: (id: string, patch: Partial<Stage>) => void;
  onRemove: (id: string) => void;
  onDuplicate: (id: string) => void;
  /** Open a printable build sheet for a single stage in a new window. */
  onExport: (id: string) => void | Promise<void>;
};

const fmt = (n: number, d = 1) =>
  n.toLocaleString("en-US", { maximumFractionDigits: d });

const DECK_FILL: Record<StageDeckKey, string> = {
  "2x1": "#1f3b8a",
  "1x1": "#5a8edc",
  "0.5x2": "#10b981",
  "0.5x1": "#f59e0b",
};

export function StageReportView(props: Props) {
  const { stages, onAdd, onUpdate, onRemove, onDuplicate, onExport } = props;

  const calcs = useMemo(() => stages.map((s) => computeStage(s)), [stages]);
  const totals = useMemo(
    () => computeStageTotals(stages, calcs),
    [stages, calcs],
  );

  return (
    <div className="led-report">
      <header className="led-report-header">
        <div>
          <h2>Stage Report</h2>
          <p className="led-report-sub">
            Nivtec deck calculator — pick stage size and the app figures out
            decks, legs and (optional) handrails. Switch each stage to
            <em> Manual</em> to place decks one by one on the grid.
          </p>
        </div>
        <div className="led-report-meta">
          <span>
            <strong>{totals.stageCount}</strong> stages
          </span>
          <span>
            <strong>{fmt(totals.totalArea, 1)}</strong> m² total
          </span>
          <span>
            <strong>{fmt(totals.totalWeight, 0)}</strong> kg total
          </span>
        </div>
      </header>

      {/* Project totals dashboard */}
      <div className="dashboard">
        <div className="dash-item">
          <span>Decks 2 × 1</span>
          <strong>{totals.deckCountsByKey["2x1"]}</strong>
          <small>pcs</small>
        </div>
        <div className="dash-item">
          <span>Decks 1 × 1</span>
          <strong>{totals.deckCountsByKey["1x1"]}</strong>
          <small>pcs</small>
        </div>
        <div className="dash-item">
          <span>Decks 0.5 × 2</span>
          <strong>{totals.deckCountsByKey["0.5x2"]}</strong>
          <small>pcs</small>
        </div>
        <div className="dash-item">
          <span>Decks 0.5 × 1</span>
          <strong>{totals.deckCountsByKey["0.5x1"]}</strong>
          <small>pcs</small>
        </div>
        <div className="dash-item">
          <span>Legs (total)</span>
          <strong>{totals.totalLegCount}</strong>
          <small>pcs</small>
        </div>
        <div className="dash-item">
          <span>Rails 2 m</span>
          <strong>{totals.rails2mTotal}</strong>
          <small>pcs</small>
        </div>
        <div className="dash-item">
          <span>Rails 1 m</span>
          <strong>{totals.rails1mTotal}</strong>
          <small>pcs</small>
        </div>
        <div className="dash-item">
          <span>Total weight</span>
          <strong>{fmt(totals.totalWeight, 0)}</strong>
          <small>kg</small>
        </div>
        <div className="dash-item">
          <span>Max load</span>
          <strong>{fmt(totals.totalLoadCapacityKg, 0)}</strong>
          <small>kg total</small>
        </div>
      </div>

      <div className="led-actions" style={{ marginTop: "1rem" }}>
        <button className="btn btn-add" onClick={onAdd}>
          + Add Stage
        </button>
      </div>

      {stages.length === 0 ? (
        <div
          className="led-empty"
          style={{
            padding: "2rem",
            textAlign: "center",
            color: "var(--muted, #64748b)",
          }}
        >
          No stages yet — click <strong>+ Add Stage</strong> to start.
        </div>
      ) : (
        <div className="stage-list">
          {stages.map((stage, i) => (
            <StageCard
              key={stage.id}
              stage={stage}
              calc={calcs[i]}
              onUpdate={(patch) => onUpdate(stage.id, patch)}
              onRemove={() => {
                if (
                  window.confirm(
                    `Delete stage "${stage.name || "Untitled"}"? This cannot be undone.`,
                  )
                ) {
                  onRemove(stage.id);
                }
              }}
              onDuplicate={() => onDuplicate(stage.id)}
              onExport={() => onExport(stage.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

type StageCardProps = {
  stage: Stage;
  calc: ReturnType<typeof computeStage>;
  onUpdate: (patch: Partial<Stage>) => void;
  onRemove: () => void;
  onDuplicate: () => void;
  onExport: () => void | Promise<void>;
};

function StageCard({
  stage,
  calc,
  onUpdate,
  onRemove,
  onDuplicate,
  onExport,
}: StageCardProps) {
  const isManual = stage.editMode === "manual";
  // Local UI state for the manual deck editor.
  const [selectedDeckKey, setSelectedDeckKey] = useState<StageDeckKey>("1x1");
  const [rotated, setRotated] = useState(false);

  // Add a deck at the given half-metre cell (cellX, cellY). Silently
  // refuses if the placement collides with an existing deck. Adjacent
  // edges that just touch are allowed (no collision).
  const addDeckAtCell = (cellX: number, cellY: number) => {
    const dims = placedDims(selectedDeckKey, rotated);
    const candidate: DeckPlacement = {
      key: selectedDeckKey,
      x: cellX * HALF_M,
      y: cellY * HALF_M,
      w: dims.w,
      d: dims.d,
    };
    if (placementCollides(candidate, stage.manualPlacements)) return;
    onUpdate({
      manualPlacements: [...stage.manualPlacements, candidate],
    });
  };

  // Remove whichever deck (if any) covers the given half-metre cell.
  const removeDeckAtCell = (cellX: number, cellY: number) => {
    const px = cellX * HALF_M;
    const py = cellY * HALF_M;
    const next = stage.manualPlacements.filter(
      (p) => !(px >= p.x && px < p.x + p.w && py >= p.y && py < p.y + p.d),
    );
    if (next.length !== stage.manualPlacements.length) {
      onUpdate({ manualPlacements: next });
    }
  };

  /** Rotate the placed (non-square) deck under the given cell in place.
   *  The deck's top-left corner stays where it is; w/d swap. Square
   *  decks (1×1) are ignored. If the rotated rectangle would collide
   *  with another placed deck, the rotation is silently refused — so
   *  the user just sees nothing happen, same UX as a colliding click. */
  const rotateDeckAtCell = (cellX: number, cellY: number) => {
    const px = cellX * HALF_M;
    const py = cellY * HALF_M;
    const idx = stage.manualPlacements.findIndex(
      (p) => px >= p.x && px < p.x + p.w && py >= p.y && py < p.y + p.d,
    );
    if (idx === -1) return;
    const target = stage.manualPlacements[idx];
    if (target.key === "1x1") return; // square — rotation is a no-op
    const rotatedTarget: DeckPlacement = {
      ...target,
      w: target.d,
      d: target.w,
    };
    const others = stage.manualPlacements.filter((_, i) => i !== idx);
    if (placementCollides(rotatedTarget, others)) return;
    const next = stage.manualPlacements.slice();
    next[idx] = rotatedTarget;
    onUpdate({ manualPlacements: next });
  };

  return (
    <div className="stage-card">
      <div className="stage-card-header">
        <input
          type="text"
          className="stage-name-input"
          value={stage.name}
          placeholder="e.g. Main Stage, Stage Left, DJ Riser…"
          onChange={(e) => onUpdate({ name: e.target.value })}
        />
        <div className="stage-card-actions">
          <button
            className="btn btn-tab-action"
            onClick={() => {
              void onExport();
            }}
            title="Open a printable build sheet for this stage (PDF or print)"
          >
            Export
          </button>
          <button className="btn btn-tab-action" onClick={onDuplicate}>
            Copy
          </button>
          <button className="btn btn-del" onClick={onRemove}>
            Delete
          </button>
        </div>
      </div>

      <div className="stage-card-body">
        <div className="stage-controls">
          <label className="stage-field">
            <span>Layout</span>
            <select
              value={stage.editMode}
              onChange={(e) =>
                onUpdate({ editMode: e.target.value as StageEditMode })
              }
            >
              <option value="auto">Auto (enter size)</option>
              <option value="manual">Manual (place decks)</option>
            </select>
          </label>

          {!isManual && (
            <label className="stage-field">
              <span>Width (m)</span>
              <input
                type="number"
                min={0.5}
                step={0.5}
                value={stage.width}
                onChange={(e) =>
                  onUpdate({ width: snapHalfMetre(Number(e.target.value)) })
                }
              />
            </label>
          )}

          {!isManual && (
            <label className="stage-field">
              <span>Depth (m)</span>
              <input
                type="number"
                min={0.5}
                step={0.5}
                value={stage.depth}
                onChange={(e) =>
                  onUpdate({ depth: snapHalfMetre(Number(e.target.value)) })
                }
              />
            </label>
          )}

          <label className="stage-field">
            <span>Leg height</span>
            <select
              value={stage.legHeightCm}
              onChange={(e) =>
                onUpdate({ legHeightCm: Number(e.target.value) })
              }
            >
              {STAGE_LEG_HEIGHTS_CM.map((h) => (
                <option key={h} value={h}>
                  {h} cm
                </option>
              ))}
            </select>
            {nivtecBracingNote(stage.legHeightCm).map((n, i) => (
              <small
                key={i}
                style={{
                  color: "#b45309",
                  fontSize: 11,
                  marginTop: 4,
                  lineHeight: 1.3,
                  display: "block",
                }}
              >
                Note: {n}
              </small>
            ))}
          </label>

          <label className="stage-field">
            <span>Leg config</span>
            <select
              value={stage.legMode}
              onChange={(e) =>
                onUpdate({ legMode: e.target.value as StageLegMode })
              }
            >
              <option value="shared">
                Nivtec 4-2-2-1 (shared corner legs)
              </option>
              <option value="perDeck">4 legs per deck</option>
            </select>
          </label>

          <fieldset className="stage-rails">
            <legend>Handrails</legend>
            <label>
              <input
                type="checkbox"
                checked={stage.rails.front}
                onChange={(e) =>
                  onUpdate({
                    rails: { ...stage.rails, front: e.target.checked },
                  })
                }
              />
              Front
            </label>
            <label>
              <input
                type="checkbox"
                checked={stage.rails.back}
                onChange={(e) =>
                  onUpdate({
                    rails: { ...stage.rails, back: e.target.checked },
                  })
                }
              />
              Back
            </label>
            <label>
              <input
                type="checkbox"
                checked={stage.rails.left}
                onChange={(e) =>
                  onUpdate({
                    rails: { ...stage.rails, left: e.target.checked },
                  })
                }
              />
              Left
            </label>
            <label>
              <input
                type="checkbox"
                checked={stage.rails.right}
                onChange={(e) =>
                  onUpdate({
                    rails: { ...stage.rails, right: e.target.checked },
                  })
                }
              />
              Right
            </label>
          </fieldset>

          <label className="stage-field stage-notes-field">
            <span>Notes</span>
            <input
              type="text"
              value={stage.notes}
              placeholder="optional…"
              onChange={(e) => onUpdate({ notes: e.target.value })}
            />
          </label>
        </div>

        {isManual && (
          <DeckPalette
            selectedKey={selectedDeckKey}
            rotated={rotated}
            placedCount={stage.manualPlacements.length}
            onSelect={setSelectedDeckKey}
            onRotate={() => setRotated((r) => !r)}
            onClear={() => {
              if (stage.manualPlacements.length === 0) return;
              if (
                window.confirm(
                  "Remove all placed decks from this stage?",
                )
              ) {
                onUpdate({ manualPlacements: [] });
              }
            }}
          />
        )}

        <div className="stage-summary-row">
          <StageSvg
            stage={stage}
            calc={calc}
            interactive={isManual}
            selectedDeckKey={selectedDeckKey}
            rotated={rotated}
            onAddAtCell={addDeckAtCell}
            onRemoveAtCell={removeDeckAtCell}
            onRotateAtCell={rotateDeckAtCell}
          />
          <StageBreakdown stage={stage} calc={calc} />
        </div>
      </div>
    </div>
  );
}

/** Palette of deck types for manual placement. The selected deck +
 *  rotation get placed when the user clicks an empty cell on the stage
 *  visual. 1×1 ignores rotation (it's square). */
function DeckPalette({
  selectedKey,
  rotated,
  placedCount,
  onSelect,
  onRotate,
  onClear,
}: {
  selectedKey: StageDeckKey;
  rotated: boolean;
  placedCount: number;
  onSelect: (k: StageDeckKey) => void;
  onRotate: () => void;
  onClear: () => void;
}) {
  const items: { key: StageDeckKey; label: string }[] = [
    { key: "2x1", label: "2 × 1" },
    { key: "1x1", label: "1 × 1" },
    { key: "0.5x2", label: "0.5 × 2" },
    { key: "0.5x1", label: "0.5 × 1" },
  ];
  return (
    <div className="deck-palette">
      <div className="deck-palette-row">
        <span className="deck-palette-label">Place a deck</span>
        {items.map((it) => {
          const isActive = selectedKey === it.key;
          const dims = placedDims(it.key, rotated);
          // Mini preview rectangle proportional to dims (max 28px on longest side).
          const previewMax = 28;
          const longest = Math.max(dims.w, dims.d);
          const sw = (dims.w / longest) * previewMax;
          const sd = (dims.d / longest) * previewMax;
          return (
            <button
              key={it.key}
              type="button"
              className={`deck-palette-btn${isActive ? " is-active" : ""}`}
              onClick={() => onSelect(it.key)}
              title={`Place ${it.label} m decks`}
            >
              <span
                className="deck-palette-swatch"
                style={{
                  width: sw,
                  height: sd,
                  background: DECK_FILL[it.key],
                }}
              />
              <span>{it.label}</span>
            </button>
          );
        })}
        <button
          type="button"
          className="deck-palette-btn deck-palette-rotate"
          onClick={onRotate}
          disabled={selectedKey === "1x1"}
          title="Rotate selected deck 90°"
        >
          {rotated ? "Rotated 90°" : "Rotate 90°"}
        </button>
        <button
          type="button"
          className="deck-palette-btn deck-palette-clear"
          onClick={onClear}
          disabled={placedCount === 0}
          title="Remove all placed decks"
        >
          Clear all
        </button>
      </div>
      <div className="deck-palette-help">
        Click an empty cell on the visual to place the selected deck. Click a
        placed deck to remove it. <strong>Right-click</strong> (or
        <strong> Shift + click</strong>) a placed deck to rotate it 90° in
        place — handy for fixing one deck without re-placing the whole row.
      </div>
    </div>
  );
}

/** Top-down preview of the stage with each deck drawn as a coloured rectangle. */
function StageSvg({
  stage,
  calc,
  interactive = false,
  selectedDeckKey = "1x1",
  rotated = false,
  onAddAtCell,
  onRemoveAtCell,
  onRotateAtCell,
}: {
  stage: Stage;
  calc: ReturnType<typeof computeStage>;
  /** Manual editor mode: render half-metre grid + click handlers. */
  interactive?: boolean;
  /** Currently-selected deck type from the palette (manual mode). */
  selectedDeckKey?: StageDeckKey;
  /** 90° rotation flag from the palette (manual mode). */
  rotated?: boolean;
  /** Click on an empty cell when interactive: add the selected deck. */
  onAddAtCell?: (cellX: number, cellY: number) => void;
  /** Click on a deck when interactive: remove that deck. */
  onRemoveAtCell?: (cellX: number, cellY: number) => void;
  /** Right-click (or Shift+click) on a placed deck: rotate it 90° in
   *  place (top-left corner stays anchored). No-op on 1×1 decks. */
  onRotateAtCell?: (cellX: number, cellY: number) => void;
}) {
  const PAD = 12;
  const MAX = 480;

  // Canvas size (clickable area):
  //  - auto mode: stage.width × stage.depth (the entered size)
  //  - manual mode: bounding box of placements + 1m padding on each
  //    side, with a minimum of 6×4 m so an empty stage still shows a
  //    workable grid. The canvas grows as decks are placed near the edge.
  const bbox = placementsBounds(stage.manualPlacements);
  const canvasW = interactive
    ? Math.max(bbox.width + 1, 6)
    : Math.max(stage.width, 0.5);
  const canvasD = interactive
    ? Math.max(bbox.depth + 1, 4)
    : Math.max(stage.depth, 0.5);

  // Effective stage rectangle used for rails & background border.
  // In manual mode this is the placements bounding box; in auto mode
  // it is the canvas (the entire stage).
  const stageW =
    stage.editMode === "manual" ? bbox.width : Math.max(stage.width, 0.5);
  const stageD =
    stage.editMode === "manual" ? bbox.depth : Math.max(stage.depth, 0.5);

  const scale = Math.min(MAX / canvasW, MAX / canvasD);
  const W = canvasW * scale + PAD * 2;
  const H = canvasD * scale + PAD * 2;

  // Hover preview state (manual mode only): which half-metre cell the
  // pointer is currently over.
  const [hover, setHover] = useState<{ cx: number; cy: number } | null>(null);

  // Compute hover preview rectangle and whether placement would be valid.
  const hoverPreview = (() => {
    if (!interactive || !hover) return null;
    const dims = placedDims(selectedDeckKey, rotated);
    const hx = hover.cx * HALF_M;
    const hy = hover.cy * HALF_M;
    // Is the hovered cell already covered by a placed deck? Then the
    // click would REMOVE that deck — show its outline as the preview.
    const covering = stage.manualPlacements.find(
      (p) =>
        hx >= p.x && hx < p.x + p.w && hy >= p.y && hy < p.y + p.d,
    );
    if (covering) {
      return { mode: "remove" as const, p: covering };
    }
    // Otherwise we're going to ADD — preview the candidate. The only
    // real constraint in manual mode is that decks must not overlap an
    // existing placement; the working canvas auto-grows to fit, so
    // there is no fixed boundary to overflow.
    const candidate: DeckPlacement = {
      key: selectedDeckKey,
      x: hx,
      y: hy,
      w: dims.w,
      d: dims.d,
    };
    const collides = placementCollides(candidate, stage.manualPlacements);
    return {
      mode: "add" as const,
      p: candidate,
      valid: !collides,
    };
  })();

  // Cell counts (half-metre cells) for the grid + click overlay.
  const cellsW = Math.round(canvasW / HALF_M);
  const cellsD = Math.round(canvasD / HALF_M);

  return (
    <div className="stage-preview">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        style={{
          maxWidth: W,
          height: "auto",
          display: "block",
          touchAction: "manipulation",
        }}
        onMouseLeave={() => setHover(null)}
      >
        {/* Canvas background (clickable area). In manual mode this is the
            larger working area; the actual stage outline is drawn below. */}
        <rect
          x={PAD}
          y={PAD}
          width={canvasW * scale}
          height={canvasD * scale}
          fill="#0f172a"
          fillOpacity={interactive ? 0.03 : 0.05}
          stroke="#0f172a"
          strokeOpacity={interactive ? 0.15 : 0.4}
          strokeWidth={1}
        />

        {/* Half-metre grid (manual mode only) */}
        {interactive && (
          <g pointerEvents="none">
            {Array.from({ length: cellsW + 1 }).map((_, i) => (
              <line
                key={`vx-${i}`}
                x1={PAD + i * HALF_M * scale}
                y1={PAD}
                x2={PAD + i * HALF_M * scale}
                y2={PAD + canvasD * scale}
                stroke="#94a3b8"
                strokeOpacity={i % 2 === 0 ? 0.35 : 0.18}
                strokeWidth={1}
              />
            ))}
            {Array.from({ length: cellsD + 1 }).map((_, i) => (
              <line
                key={`hz-${i}`}
                x1={PAD}
                y1={PAD + i * HALF_M * scale}
                x2={PAD + canvasW * scale}
                y2={PAD + i * HALF_M * scale}
                stroke="#94a3b8"
                strokeOpacity={i % 2 === 0 ? 0.35 : 0.18}
                strokeWidth={1}
              />
            ))}
          </g>
        )}

        {/* Stage outline (manual mode only — auto mode's outline is the
            canvas itself, drawn above). Dashed rectangle at the bounding
            box of placed decks so the user can see the actual stage shape
            inside the larger working canvas. */}
        {interactive && stageW > 0 && stageD > 0 && (
          <rect
            x={PAD}
            y={PAD}
            width={stageW * scale}
            height={stageD * scale}
            fill="none"
            stroke="#0f172a"
            strokeOpacity={0.55}
            strokeWidth={1.5}
            strokeDasharray="4 3"
            pointerEvents="none"
          />
        )}
        {/* Decks. In interactive mode the click-catcher cells (drawn
            last, on top) intercept clicks and either add or remove a
            deck depending on whether the clicked cell is occupied — so
            the deck rects themselves don't need their own click
            handlers. */}
        {calc.decks.map((p, i) => (
          <g key={i}>
            <rect
              x={PAD + p.x * scale}
              y={PAD + p.y * scale}
              width={p.w * scale}
              height={p.d * scale}
              fill={DECK_FILL[p.key]}
              fillOpacity={0.7}
              stroke="#0f172a"
              strokeWidth={1}
              strokeOpacity={0.7}
            />
            {p.w * scale >= 32 && p.d * scale >= 22 && (
              <text
                x={PAD + (p.x + p.w / 2) * scale}
                y={PAD + (p.y + p.d / 2) * scale + 4}
                textAnchor="middle"
                fontSize={Math.min(p.w * scale, p.d * scale) * 0.22}
                fontFamily="system-ui, sans-serif"
                fill="#fff"
                fontWeight={600}
              >
                {p.key === "2x1"
                  ? "2×1"
                  : p.key === "1x1"
                    ? "1×1"
                    : p.key === "0.5x2"
                      ? "0.5×2"
                      : "0.5×1"}
              </text>
            )}
          </g>
        ))}
        {/* Leg dots. In both modes the dots are drawn slightly INSIDE
            the deck (inset from the corner) so they're visually
            separated from the deck outline.
            - "perDeck": every deck draws its own 4 inset dots, so
              shared corners show one dot per deck (overlapping
              clusters).
            - "shared" (Nivtec 4-2-2-1): we draw exactly one inset dot
              per unique shared corner — the dot is inset toward the
              centre of one of the decks that actually owns this
              corner. */}
        {stage.legMode === "perDeck"
          ? calc.decks.flatMap((p, i) => {
              const inset = Math.min(p.w, p.d) * 0.12 * scale;
              const x1 = PAD + p.x * scale + inset;
              const y1 = PAD + p.y * scale + inset;
              const x2 = PAD + (p.x + p.w) * scale - inset;
              const y2 = PAD + (p.y + p.d) * scale - inset;
              return [
                <circle key={`${i}-tl`} cx={x1} cy={y1} r={3} fill="#0f172a" />,
                <circle key={`${i}-tr`} cx={x2} cy={y1} r={3} fill="#0f172a" />,
                <circle key={`${i}-bl`} cx={x1} cy={y2} r={3} fill="#0f172a" />,
                <circle key={`${i}-br`} cx={x2} cy={y2} r={3} fill="#0f172a" />,
              ];
            })
          : calc.legPositions.map((pos, i) => {
              const owner = calc.decks.find(
                (d) =>
                  (d.x === pos.x || d.x + d.w === pos.x) &&
                  (d.y === pos.y || d.y + d.d === pos.y),
              );
              if (!owner) {
                return (
                  <circle
                    key={i}
                    cx={PAD + pos.x * scale}
                    cy={PAD + pos.y * scale}
                    r={3}
                    fill="#0f172a"
                  />
                );
              }
              const insetM = Math.min(owner.w, owner.d) * 0.12;
              const dx = owner.x + owner.w / 2 > pos.x ? insetM : -insetM;
              const dy = owner.y + owner.d / 2 > pos.y ? insetM : -insetM;
              return (
                <circle
                  key={i}
                  cx={PAD + (pos.x + dx) * scale}
                  cy={PAD + (pos.y + dy) * scale}
                  r={3}
                  fill="#0f172a"
                />
              );
            })}
        {/* Rail strokes — front bottom, back top, left/right sides.
            In manual mode rails follow the actual stage (bounding box of
            placements); in auto mode they follow the entered W × D. */}
        {stage.rails.front && stageW > 0 && (
          <line
            x1={PAD}
            y1={PAD + stageD * scale}
            x2={PAD + stageW * scale}
            y2={PAD + stageD * scale}
            stroke="#dc2626"
            strokeWidth={4}
          />
        )}
        {stage.rails.back && stageW > 0 && (
          <line
            x1={PAD}
            y1={PAD}
            x2={PAD + stageW * scale}
            y2={PAD}
            stroke="#dc2626"
            strokeWidth={4}
          />
        )}
        {stage.rails.left && stageD > 0 && (
          <line
            x1={PAD}
            y1={PAD}
            x2={PAD}
            y2={PAD + stageD * scale}
            stroke="#dc2626"
            strokeWidth={4}
          />
        )}
        {stage.rails.right && stageD > 0 && (
          <line
            x1={PAD + stageW * scale}
            y1={PAD}
            x2={PAD + stageW * scale}
            y2={PAD + stageD * scale}
            stroke="#dc2626"
            strokeWidth={4}
          />
        )}

        {/* Hover preview rectangle (manual mode). Drawn before the
            click-catcher cells so it doesn't intercept pointer events. */}
        {hoverPreview && hoverPreview.mode === "add" && (
          <rect
            x={PAD + hoverPreview.p.x * scale}
            y={PAD + hoverPreview.p.y * scale}
            width={hoverPreview.p.w * scale}
            height={hoverPreview.p.d * scale}
            fill={
              hoverPreview.valid
                ? DECK_FILL[hoverPreview.p.key]
                : "#dc2626"
            }
            fillOpacity={hoverPreview.valid ? 0.35 : 0.25}
            stroke={hoverPreview.valid ? DECK_FILL[hoverPreview.p.key] : "#dc2626"}
            strokeWidth={1.5}
            strokeDasharray="4 2"
            pointerEvents="none"
          />
        )}
        {hoverPreview && hoverPreview.mode === "remove" && (
          <rect
            x={PAD + hoverPreview.p.x * scale}
            y={PAD + hoverPreview.p.y * scale}
            width={hoverPreview.p.w * scale}
            height={hoverPreview.p.d * scale}
            fill="#dc2626"
            fillOpacity={0.15}
            stroke="#dc2626"
            strokeWidth={1.5}
            strokeDasharray="3 3"
            pointerEvents="none"
          />
        )}

        {/* Click-catcher grid (manual mode only). One transparent rect
            per half-metre cell — clicking adds the selected deck (the
            click handler walks down to the cell coords) and hovering
            updates the preview. Decks above this layer take precedence
            because they intercept clicks first via their own onClick. */}
        {interactive &&
          Array.from({ length: cellsD }).map((_, cy) =>
            Array.from({ length: cellsW }).map((_, cx) => (
              <rect
                key={`cell-${cx}-${cy}`}
                x={PAD + cx * HALF_M * scale}
                y={PAD + cy * HALF_M * scale}
                width={HALF_M * scale}
                height={HALF_M * scale}
                fill="transparent"
                style={{ cursor: "pointer" }}
                onMouseEnter={() => setHover({ cx, cy })}
                onContextMenu={(e) => {
                  // Right-click on a placed deck = rotate it in place.
                  // Always preventDefault so the browser menu stays
                  // out of the way during stage editing.
                  e.preventDefault();
                  const px = cx * HALF_M;
                  const py = cy * HALF_M;
                  const covering = stage.manualPlacements.some(
                    (p) =>
                      px >= p.x &&
                      px < p.x + p.w &&
                      py >= p.y &&
                      py < p.y + p.d,
                  );
                  if (covering) onRotateAtCell?.(cx, cy);
                }}
                onClick={(e) => {
                  const px = cx * HALF_M;
                  const py = cy * HALF_M;
                  const covering = stage.manualPlacements.some(
                    (p) =>
                      px >= p.x &&
                      px < p.x + p.w &&
                      py >= p.y &&
                      py < p.y + p.d,
                  );
                  // Shift+click on a placed deck = rotate it in place
                  // (alternative to right-click, friendlier on touchpads).
                  if (covering && e.shiftKey) {
                    onRotateAtCell?.(cx, cy);
                    return;
                  }
                  // Otherwise: covered = remove, empty = add.
                  if (covering) {
                    onRemoveAtCell?.(cx, cy);
                  } else {
                    onAddAtCell?.(cx, cy);
                  }
                }}
              />
            )),
          )}
      </svg>
      <div className="stage-preview-legend">
        <span>
          <i style={{ background: DECK_FILL["2x1"] }} /> 2×1
        </span>
        <span>
          <i style={{ background: DECK_FILL["1x1"] }} /> 1×1
        </span>
        <span>
          <i style={{ background: DECK_FILL["0.5x2"] }} /> 0.5×2
        </span>
        <span>
          <i style={{ background: DECK_FILL["0.5x1"] }} /> 0.5×1
        </span>
        <span>
          <i style={{ background: "#dc2626" }} /> Rail
        </span>
        <span>
          <i style={{ background: "#0f172a", borderRadius: "50%" }} /> Leg
        </span>
      </div>
    </div>
  );
}

function StageBreakdown({
  stage,
  calc,
}: {
  stage: Stage;
  calc: ReturnType<typeof computeStage>;
}) {
  const usedDecks = STAGE_DECKS.filter((d) => calc.deckCounts[d.key] > 0);
  const legSpec = STAGE_LEGS.find((l) => l.heightCm === stage.legHeightCm);

  return (
    <div className="stage-breakdown">
      {!calc.fits && (
        <div className="stage-warning" data-testid="stage-warning">
          ⚠ Some cells of this stage cannot be tiled with the available Nivtec
          deck sizes (only multiples of 0.5 m are supported, and 0.5 m × 0.5 m
          gaps cannot be filled).
        </div>
      )}

      <h4>Decks</h4>
      <table className="stage-table">
        <thead>
          <tr>
            <th>Size</th>
            <th>Qty</th>
            <th>Unit weight</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          {usedDecks.length === 0 ? (
            <tr>
              <td colSpan={4} style={{ color: "var(--muted, #64748b)" }}>
                — none —
              </td>
            </tr>
          ) : (
            usedDecks.map((d) => (
              <tr key={d.key}>
                <td>{d.label}</td>
                <td>{calc.deckCounts[d.key]}</td>
                <td>{fmt(d.weight, 1)} kg</td>
                <td>{fmt(d.weight * calc.deckCounts[d.key], 1)} kg</td>
              </tr>
            ))
          )}
          <tr className="stage-row-total">
            <td>Subtotal</td>
            <td />
            <td />
            <td>{fmt(calc.deckWeight, 1)} kg</td>
          </tr>
        </tbody>
      </table>

      <h4>
        Legs ({stage.legHeightCm} cm
        {stage.legMode === "perDeck"
          ? " · 4 per deck"
          : " · shared corners"}
        )
      </h4>
      <table className="stage-table">
        <tbody>
          <tr>
            <td>Quantity</td>
            <td>{calc.legCount} pcs</td>
          </tr>
          <tr>
            <td>Unit weight</td>
            <td>{fmt(legSpec?.weight ?? 0, 2)} kg</td>
          </tr>
          <tr className="stage-row-total">
            <td>Subtotal</td>
            <td>{fmt(calc.legWeight, 1)} kg</td>
          </tr>
        </tbody>
      </table>

      <h4>Load capacity</h4>
      <table className="stage-table">
        <tbody>
          <tr>
            <td>Distributed load</td>
            <td>
              <strong>{fmt(calc.loadCapacityKg, 0)} kg</strong>
              {!calc.fits && " (placed area only)"}
            </td>
          </tr>
          <tr>
            <td>Rated SWL</td>
            <td>
              {fmt(calc.effectiveSwlPerM2, 0)} kg/m² @ {stage.legHeightCm} cm
            </td>
          </tr>
        </tbody>
      </table>
      <div className="stage-capacity-note">
        Capacity is derated for leg height (Nivtec aluminium typical:
        ≤60 cm full rating; 80 cm ~85%; 100 cm ~70%; 120 cm ~55%; 140 cm
        ~45%). Always confirm against the manufacturer datasheet for your
        exact configuration.
      </div>

      {calc.railBreakdown.length > 0 && (
        <>
          <h4>Handrails</h4>
          <table className="stage-table">
            <thead>
              <tr>
                <th>Side</th>
                <th>Length</th>
                <th>2 m</th>
                <th>1 m</th>
              </tr>
            </thead>
            <tbody>
              {calc.railBreakdown.map((r) => (
                <tr key={r.side}>
                  <td style={{ textTransform: "capitalize" }}>{r.side}</td>
                  <td>{fmt(r.lengthM, 1)} m</td>
                  <td>{r.count2m}</td>
                  <td>{r.count1m}</td>
                </tr>
              ))}
              <tr className="stage-row-total">
                <td>Subtotal</td>
                <td>{fmt(calc.railLengthTotal, 1)} m</td>
                <td>{calc.rails2mTotal}</td>
                <td>{calc.rails1mTotal}</td>
              </tr>
              <tr>
                <td colSpan={3}>Weight</td>
                <td>{fmt(calc.railWeight, 1)} kg</td>
              </tr>
            </tbody>
          </table>
        </>
      )}

      <div className="stage-grand-total">
        <strong>Total weight: {fmt(calc.totalWeight, 1)} kg</strong>
        <span> · area {fmt(calc.areaM2, 2)} m²</span>
      </div>
    </div>
  );
}
