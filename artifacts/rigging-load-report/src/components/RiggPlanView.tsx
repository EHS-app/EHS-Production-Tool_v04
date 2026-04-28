import { useEffect, useMemo, useRef, useState } from "react";
import { NumberField } from "./NumberField";
import {
  clampTrussToVenue,
  makeDefaultTruss,
  snapHalfMetre,
  trussEndpoints,
  type RiggPlan,
  type RiggPlanTruss,
  type RiggPlanVenue,
  type TrussRotation,
} from "../lib/riggPlan";
import { DrawingImporter } from "./DrawingImporter";
import type {
  ApplySelection,
  ExtractedItems,
} from "../lib/drawingAnalysis";
import type { FloorPlan } from "../lib/floorPlan";

/** Round numeric truss fields to one decimal so JSON storage stays
 *  small and the editor table never displays floating-point fuzz. */
function roundTruss(t: RiggPlanTruss): RiggPlanTruss {
  const r1 = (n: number) => Math.round(n * 10) / 10;
  return { ...t, x: r1(t.x), y: r1(t.y), z: r1(t.z), lengthM: r1(t.lengthM) };
}

/** Round, then clamp — rounding first so the result is canonical
 *  on-disk, clamping last so we can never persist an out-of-bounds
 *  truss even if rounding nudged us past the venue edge. */
function settleTruss(t: RiggPlanTruss, venue: RiggPlanVenue): RiggPlanTruss {
  return clampTrussToVenue(roundTruss(t), venue);
}

/** Per-system summary the Rigg Plan needs from the rest of the app. */
export type RiggPlanSystemInfo = {
  id: string;
  name: string;
  /** Number of hoist points on this system (for the truss label). */
  pointCount: number;
  /** Static load in kg (sum of payload + hoists). */
  staticKg: number;
  /** Max dynamic point load in kg (peak), used for the colour status. */
  peakKg: number;
  /** Hoist SWL in kg, used for the colour status. */
  swlKg: number;
};

type Props = {
  plan: RiggPlan;
  systems: RiggPlanSystemInfo[];
  onUpdateVenue: (patch: Partial<RiggPlanVenue>) => void;
  onUpdateTruss: (systemId: string, patch: Partial<RiggPlanTruss>) => void;
  /** Jump to the Rigging Report so the user can rename / add systems. */
  onJumpToRigging: () => void;
  /** Apply items extracted from an uploaded drawing to the report tabs. */
  onApplyExtractedItems: (
    extracted: ExtractedItems,
    selection: ApplySelection,
  ) => void;
  /** Project / venue name used as extra context for the analyser. */
  projectName?: string;
  /** When set, the SVG canvas renders this image behind the trusses
   *  instead of the synthetic grid. */
  floorPlan: FloorPlan | null;
  /** Set / replace the floor-plan backdrop with a new drawing. */
  onSetFloorPlan: (plan: FloorPlan) => void;
  /** Drop the backdrop and fall back to the synthetic grid. */
  onClearFloorPlan: () => void;
};

const fmt = (n: number, d = 1) =>
  n.toLocaleString("en-US", { maximumFractionDigits: d });

/** Pixels per metre at the default zoom. The SVG scales to fit the
 *  available width but we keep this constant to compute reasonable
 *  font / stroke sizes. */
const PX_PER_M = 30;
const GRID_M = 1;

export function RiggPlanView({
  plan,
  systems,
  onUpdateVenue,
  onUpdateTruss,
  onJumpToRigging,
  onApplyExtractedItems,
  projectName,
  floorPlan,
  onSetFloorPlan,
  onClearFloorPlan,
}: Props) {
  const { venue, trussById } = plan;

  // Auto-seed any newly-created system with a default truss layout so
  // the user never has to "place" them manually — the truss just
  // appears the first time they open the tab.
  useEffect(() => {
    const missing = systems.filter((s) => !trussById[s.id]);
    if (missing.length === 0) return;
    const total = systems.length;
    missing.forEach((sys, i) => {
      const idx = systems.findIndex((s) => s.id === sys.id);
      // Clamp the default into the current venue — without this, very
      // small venues would seed an out-of-bounds truss on first open.
      const seed = settleTruss(
        makeDefaultTruss(idx >= 0 ? idx : i, total, venue),
        venue,
      );
      onUpdateTruss(sys.id, seed);
    });
    // We deliberately depend only on the systems list / which ids are
    // present so this effect doesn't fire on every drag.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [systems.map((s) => s.id).join("|")]);

  const placedSystems = useMemo(
    () => systems.filter((s) => trussById[s.id]),
    [systems, trussById],
  );

  const [selectedId, setSelectedId] = useState<string | null>(null);

  return (
    <div className="led-report">
      <header className="led-report-header">
        <div>
          <h2>Rigg Plan</h2>
          <p className="led-report-sub">
            Top-down floor plan of the venue. Each rigging system from the
            Rigging Report appears as a truss — drag to position, edit
            trim height &amp; length below. Snaps to a 0.5 m grid.
          </p>
        </div>
        <div className="led-report-meta">
          <span className="badge">
            <strong>{venue.widthM} × {venue.depthM} m</strong> venue
          </span>
          <span className="badge">
            <strong>{venue.ceilingM} m</strong> ceiling
          </span>
          <span className="badge">
            <strong>{placedSystems.length}</strong> trusses
          </span>
        </div>
      </header>

      {/* Drawing importer — reads a user-uploaded venue plan and lets
          them apply the extracted items back to the report tabs. */}
      <DrawingImporter
        currentVenue={venue}
        projectName={projectName}
        onApply={onApplyExtractedItems}
        onUseAsFloorPlan={onSetFloorPlan}
        hasFloorPlan={floorPlan != null}
      />

      {/* Venue editor */}
      <section className="led-card">
        <div className="led-card-head">
          <h3>Venue</h3>
          <span className="led-hint">
            Width is stage-left to stage-right; depth is downstage to upstage.
          </span>
        </div>
        <div className="rigg-venue-grid">
          <label className="led-field">
            <span className="led-field-label">Width (m)</span>
            <NumberField
              className="led-input led-input-num"
              min={1}
              step={0.5}
              value={venue.widthM}
              transform={(n) => Math.max(1, snapHalfMetre(n || 0))}
              emptyValue={1}
              onCommit={(widthM) => onUpdateVenue({ widthM })}
            />
          </label>
          <label className="led-field">
            <span className="led-field-label">Depth (m)</span>
            <NumberField
              className="led-input led-input-num"
              min={1}
              step={0.5}
              value={venue.depthM}
              transform={(n) => Math.max(1, snapHalfMetre(n || 0))}
              emptyValue={1}
              onCommit={(depthM) => onUpdateVenue({ depthM })}
            />
          </label>
          <label className="led-field">
            <span className="led-field-label">Ceiling (m)</span>
            <NumberField
              className="led-input led-input-num"
              min={1}
              step={0.5}
              value={venue.ceilingM}
              transform={(n) => Math.max(1, snapHalfMetre(n || 0))}
              emptyValue={1}
              onCommit={(ceilingM) => onUpdateVenue({ ceilingM })}
            />
          </label>
        </div>
      </section>

      {/* Plan canvas */}
      <section className="led-card">
        <div className="led-card-head">
          <h3>Floor plan</h3>
          <span className="led-hint">
            Click a truss to select; drag it to move. Position rounds to 0.5 m.
          </span>
        </div>

        {systems.length === 0 ? (
          <div className="led-empty">
            No rigging systems yet — add one on the{" "}
            <button
              type="button"
              className="btn btn-soft btn-sm"
              onClick={onJumpToRigging}
            >
              Rigging Report
            </button>{" "}
            and it will appear here automatically.
          </div>
        ) : (
          <PlanCanvas
            venue={venue}
            systems={placedSystems}
            trussById={trussById}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onUpdateTruss={onUpdateTruss}
            floorPlan={floorPlan}
            onClearFloorPlan={onClearFloorPlan}
          />
        )}
      </section>

      {/* Per-truss editor */}
      {placedSystems.length > 0 && (
        <section className="led-card">
          <div className="led-card-head">
            <h3>Trusses</h3>
            <span className="led-hint">
              Numeric editor — finer than dragging.
            </span>
          </div>
          <div className="led-table-wrap">
            <table className="led-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th className="led-num">X (m)</th>
                  <th className="led-num">Y (m)</th>
                  <th className="led-num">Z trim (m)</th>
                  <th className="led-num">Length (m)</th>
                  <th>Orient</th>
                  <th className="led-num">Static load (kg)</th>
                  <th className="led-num">Peak / SWL</th>
                </tr>
              </thead>
              <tbody>
                {placedSystems.map((sys) => {
                  const t = trussById[sys.id];
                  if (!t) return null;
                  const status =
                    sys.peakKg > sys.swlKg
                      ? "is-fail"
                      : sys.peakKg > sys.swlKg * 0.9
                        ? "is-warn"
                        : "is-ok";
                  return (
                    <tr
                      key={sys.id}
                      className={selectedId === sys.id ? "led-row-linked" : ""}
                      onClick={() => setSelectedId(sys.id)}
                    >
                      <td>
                        <strong>{sys.name}</strong>
                        <div className="led-sub">{sys.pointCount} pts</div>
                      </td>
                      <td>
                        <NumberField
                          className="led-input led-input-num"
                          step={0.5}
                          value={t.x}
                          transform={(n) => snapHalfMetre(n || 0)}
                          emptyValue={0}
                          onCommit={(x) =>
                            onUpdateTruss(sys.id, {
                              ...clampTrussToVenue(
                                {
                                  ...t,
                                  x,
                                },
                                venue,
                              ),
                            })
                          }
                        />
                      </td>
                      <td>
                        <NumberField
                          className="led-input led-input-num"
                          step={0.5}
                          value={t.y}
                          transform={(n) => snapHalfMetre(n || 0)}
                          emptyValue={0}
                          onCommit={(y) =>
                            onUpdateTruss(sys.id, {
                              ...clampTrussToVenue(
                                {
                                  ...t,
                                  y,
                                },
                                venue,
                              ),
                            })
                          }
                        />
                      </td>
                      <td>
                        <NumberField
                          className="led-input led-input-num"
                          step={0.5}
                          min={0}
                          max={venue.ceilingM}
                          value={t.z}
                          transform={(n) =>
                            Math.min(
                              venue.ceilingM,
                              Math.max(0, snapHalfMetre(n || 0)),
                            )
                          }
                          emptyValue={0}
                          onCommit={(z) => onUpdateTruss(sys.id, { z })}
                        />
                      </td>
                      <td>
                        <NumberField
                          className="led-input led-input-num"
                          step={0.5}
                          min={0.5}
                          value={t.lengthM}
                          transform={(n) =>
                            Math.max(0.5, snapHalfMetre(n || 0))
                          }
                          emptyValue={0.5}
                          onCommit={(lengthM) =>
                            onUpdateTruss(sys.id, {
                              ...clampTrussToVenue(
                                { ...t, lengthM },
                                venue,
                              ),
                            })
                          }
                        />
                      </td>
                      <td>
                        <select
                          className="led-input"
                          value={t.rotation}
                          onChange={(e) =>
                            onUpdateTruss(sys.id, {
                              ...clampTrussToVenue(
                                {
                                  ...t,
                                  rotation: Number(e.target.value) as TrussRotation,
                                },
                                venue,
                              ),
                            })
                          }
                        >
                          <option value={0}>Along width</option>
                          <option value={90}>Along depth</option>
                        </select>
                      </td>
                      <td className="led-num">{fmt(sys.staticKg, 0)}</td>
                      <td className={`led-num rigg-status ${status}`}>
                        {fmt(sys.peakKg, 0)} / {fmt(sys.swlKg, 0)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}

function PlanCanvas({
  venue,
  systems,
  trussById,
  selectedId,
  onSelect,
  onUpdateTruss,
  floorPlan,
  onClearFloorPlan,
}: {
  venue: RiggPlanVenue;
  systems: RiggPlanSystemInfo[];
  trussById: Record<string, RiggPlanTruss>;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onUpdateTruss: (id: string, patch: Partial<RiggPlanTruss>) => void;
  floorPlan: FloorPlan | null;
  onClearFloorPlan: () => void;
}) {
  // SVG uses world-units (metres). We let CSS scale it to fit the card.
  const padM = 1; // padding in metres around the venue rect
  const viewW = venue.widthM + padM * 2;
  const viewH = venue.depthM + padM * 2;

  const svgRef = useRef<SVGSVGElement | null>(null);
  const dragRef = useRef<{
    id: string;
    pointerId: number;
    offsetX: number; // truss-centre offset from pointer in world units
    offsetY: number;
  } | null>(null);

  /** Map a pointer event into venue coordinates (metres from origin). */
  function pointerToWorld(e: React.PointerEvent | PointerEvent): {
    x: number;
    y: number;
  } {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const ctm = svg.getScreenCTM();
    if (!ctm) return { x: 0, y: 0 };
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const local = pt.matrixTransform(ctm.inverse());
    return { x: local.x - padM, y: local.y - padM };
  }

  function handlePointerDown(sysId: string, e: React.PointerEvent) {
    const t = trussById[sysId];
    if (!t) return;
    e.stopPropagation();
    onSelect(sysId);
    const w = pointerToWorld(e);
    dragRef.current = {
      id: sysId,
      pointerId: e.pointerId,
      offsetX: t.x - w.x,
      offsetY: t.y - w.y,
    };
    (e.target as Element).setPointerCapture?.(e.pointerId);
  }

  function handlePointerMove(e: React.PointerEvent) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    const t = trussById[drag.id];
    if (!t) return;
    const w = pointerToWorld(e);
    const next = clampTrussToVenue(
      {
        ...t,
        x: snapHalfMetre(w.x + drag.offsetX),
        y: snapHalfMetre(w.y + drag.offsetY),
      },
      venue,
    );
    if (next.x !== t.x || next.y !== t.y) {
      onUpdateTruss(drag.id, { x: next.x, y: next.y });
    }
  }

  function handlePointerUp(e: React.PointerEvent) {
    if (dragRef.current && dragRef.current.pointerId === e.pointerId) {
      dragRef.current = null;
    }
  }

  return (
    <div className="rigg-canvas-wrap" style={{ position: "relative" }}>
      {floorPlan && (
        <div
          style={{
            position: "absolute",
            top: 8,
            right: 8,
            zIndex: 2,
            display: "flex",
            alignItems: "center",
            gap: 8,
            background: "rgba(255,255,255,0.92)",
            border: "1px solid var(--border, #cbd5e1)",
            borderRadius: 6,
            padding: "4px 8px",
            fontSize: 12,
            color: "#0f172a",
            maxWidth: "60%",
          }}
        >
          <span
            style={{
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
            title={floorPlan.fileName}
          >
            Floor plan: <strong>{floorPlan.fileName}</strong>
          </span>
          <button
            type="button"
            className="btn btn-soft btn-xs"
            onClick={onClearFloorPlan}
          >
            Clear
          </button>
        </div>
      )}
      <svg
        ref={svgRef}
        className="rigg-canvas"
        viewBox={`0 0 ${viewW} ${viewH}`}
        preserveAspectRatio="xMidYMid meet"
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onClick={() => onSelect(null)}
      >
        {/* Background grid */}
        <defs>
          <pattern
            id="rigg-grid"
            x={padM}
            y={padM}
            width={GRID_M}
            height={GRID_M}
            patternUnits="userSpaceOnUse"
          >
            <path
              d={`M ${GRID_M} 0 L 0 0 0 ${GRID_M}`}
              fill="none"
              stroke="rgba(99,102,241,0.18)"
              strokeWidth={0.02}
            />
          </pattern>
        </defs>

        {/* Floor-plan backdrop (the user's uploaded drawing). The
            synthetic grid / venue rect outline / downstage marker were
            removed — the only backdrop is the user's upload, if any.
            Trusses still draw on top either way. */}
        {floorPlan && (
          <image
            href={floorPlan.imageDataUrl}
            x={padM}
            y={padM}
            width={venue.widthM}
            height={venue.depthM}
            preserveAspectRatio="xMidYMid meet"
          />
        )}

        {/* Trusses removed at user request — only the uploaded floor
            plan is rendered on this canvas now. The systems table
            below the canvas still lets the user manage truss data. */}
      </svg>
    </div>
  );
}
