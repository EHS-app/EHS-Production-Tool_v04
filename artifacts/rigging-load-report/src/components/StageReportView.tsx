import { useMemo } from "react";
import {
  STAGE_DECKS,
  STAGE_LEG_HEIGHTS_CM,
  STAGE_LEGS,
  computeStage,
  computeStageTotals,
  nivtecBracingNote,
  snapHalfMetre,
  type Stage,
  type StageDeckKey,
  type StageLegMode,
} from "../lib/stage";

type Props = {
  stages: Stage[];
  onAdd: () => void;
  onUpdate: (id: string, patch: Partial<Stage>) => void;
  onRemove: (id: string) => void;
  onDuplicate: (id: string) => void;
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
  const { stages, onAdd, onUpdate, onRemove, onDuplicate } = props;

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
            decks, legs and (optional) handrails.
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
};

function StageCard({
  stage,
  calc,
  onUpdate,
  onRemove,
  onDuplicate,
}: StageCardProps) {
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

        <div className="stage-summary-row">
          <StageSvg stage={stage} calc={calc} />
          <StageBreakdown stage={stage} calc={calc} />
        </div>
      </div>
    </div>
  );
}

/** Top-down preview of the stage with each deck drawn as a coloured rectangle. */
function StageSvg({
  stage,
  calc,
}: {
  stage: Stage;
  calc: ReturnType<typeof computeStage>;
}) {
  const PAD = 12;
  const MAX = 480;
  const scale = Math.min(MAX / Math.max(stage.width, 0.5), MAX / Math.max(stage.depth, 0.5));
  const W = stage.width * scale + PAD * 2;
  const H = stage.depth * scale + PAD * 2;

  return (
    <div className="stage-preview">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        style={{ maxWidth: W, height: "auto", display: "block" }}
      >
        {/* Background */}
        <rect
          x={PAD}
          y={PAD}
          width={stage.width * scale}
          height={stage.depth * scale}
          fill="#0f172a"
          fillOpacity={0.05}
          stroke="#0f172a"
          strokeOpacity={0.4}
          strokeWidth={1}
        />
        {/* Decks */}
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
        {/* Rail strokes — front bottom, back top, left/right sides */}
        {stage.rails.front && (
          <line
            x1={PAD}
            y1={PAD + stage.depth * scale}
            x2={PAD + stage.width * scale}
            y2={PAD + stage.depth * scale}
            stroke="#dc2626"
            strokeWidth={4}
          />
        )}
        {stage.rails.back && (
          <line
            x1={PAD}
            y1={PAD}
            x2={PAD + stage.width * scale}
            y2={PAD}
            stroke="#dc2626"
            strokeWidth={4}
          />
        )}
        {stage.rails.left && (
          <line
            x1={PAD}
            y1={PAD}
            x2={PAD}
            y2={PAD + stage.depth * scale}
            stroke="#dc2626"
            strokeWidth={4}
          />
        )}
        {stage.rails.right && (
          <line
            x1={PAD + stage.width * scale}
            y1={PAD}
            x2={PAD + stage.width * scale}
            y2={PAD + stage.depth * scale}
            stroke="#dc2626"
            strokeWidth={4}
          />
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
