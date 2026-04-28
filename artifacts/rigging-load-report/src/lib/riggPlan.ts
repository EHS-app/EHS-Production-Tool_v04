/** Rigg Plan — top-down venue layout for the rigging systems.
 *
 *  Each `System` from the Rigging Report becomes one labeled truss on
 *  the venue floor plan. Position is in metres relative to the venue's
 *  downstage-left corner: X grows stage-right, Y grows upstage (away
 *  from the audience). Z is the trim height (height above the floor).
 *
 *  Stored on the V2 persistence blob under `riggPlan`. Trusses are
 *  keyed by `System.id` so renaming a system never orphans its
 *  position; deleting a system gets its truss garbage-collected the
 *  next time the view renders. */

export type RiggPlanVenue = {
  /** Venue width in metres (X axis, stage-left to stage-right). */
  widthM: number;
  /** Venue depth in metres (Y axis, downstage to upstage). */
  depthM: number;
  /** Ceiling height in metres — used as the cap for the per-truss Z (trim). */
  ceilingM: number;
};

/** Truss orientation. `0` lays the truss along the X (width) axis,
 *  `90` lays it along the Y (depth) axis. We only support 90° steps. */
export type TrussRotation = 0 | 90;

export type RiggPlanTruss = {
  /** X position of the truss centre, in metres from the venue origin. */
  x: number;
  /** Y position of the truss centre, in metres from the venue origin. */
  y: number;
  /** Trim height in metres (clamped to venue.ceilingM by the editor). */
  z: number;
  /** Truss length in metres. */
  lengthM: number;
  /** 0 = along X, 90 = along Y. */
  rotation: TrussRotation;
};

export type RiggPlan = {
  venue: RiggPlanVenue;
  /** Per-System truss layout, keyed by System.id. */
  trussById: Record<string, RiggPlanTruss>;
};

export const DEFAULT_VENUE: RiggPlanVenue = {
  widthM: 20,
  depthM: 12,
  ceilingM: 8,
};

export const DEFAULT_RIGG_PLAN: RiggPlan = {
  venue: { ...DEFAULT_VENUE },
  trussById: {},
};

/** Round to the nearest 0.5 m — venues, trusses and trims all snap to
 *  the half-metre grid, same convention as the Stage Report. */
export function snapHalfMetre(v: number): number {
  return Math.round(v * 2) / 2;
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

/** Build a sensible default truss layout for a system that's never been
 *  placed. Trusses are stacked evenly along the depth axis, centred on
 *  the width, with a 2 m margin top & bottom. */
export function makeDefaultTruss(
  indexInVenue: number,
  total: number,
  venue: RiggPlanVenue,
): RiggPlanTruss {
  const margin = Math.min(2, venue.depthM / 4);
  const usable = Math.max(0.5, venue.depthM - 2 * margin);
  const y =
    total <= 1
      ? venue.depthM / 2
      : margin + (usable * indexInVenue) / Math.max(1, total - 1);
  return {
    x: snapHalfMetre(venue.widthM / 2),
    y: snapHalfMetre(y),
    z: snapHalfMetre(Math.min(8, Math.max(2, venue.ceilingM - 0.5))),
    lengthM: 6,
    rotation: 0,
  };
}

function normalizeVenue(raw: unknown): RiggPlanVenue {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_VENUE };
  const r = raw as Record<string, unknown>;
  const num = (v: unknown, fb: number) =>
    typeof v === "number" && Number.isFinite(v) && v > 0 ? v : fb;
  return {
    widthM: clamp(num(r.widthM, DEFAULT_VENUE.widthM), 1, 200),
    depthM: clamp(num(r.depthM, DEFAULT_VENUE.depthM), 1, 200),
    ceilingM: clamp(num(r.ceilingM, DEFAULT_VENUE.ceilingM), 1, 50),
  };
}

function normalizeTruss(raw: unknown): RiggPlanTruss | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const num = (v: unknown, fb: number) =>
    typeof v === "number" && Number.isFinite(v) ? v : fb;
  const rotation: TrussRotation = r.rotation === 90 ? 90 : 0;
  return {
    x: num(r.x, 0),
    y: num(r.y, 0),
    z: Math.max(0, num(r.z, 6)),
    lengthM: clamp(num(r.lengthM, 6), 0.5, 100),
    rotation,
  };
}

export function normalizeRiggPlan(raw: unknown): RiggPlan {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_RIGG_PLAN };
  const r = raw as Record<string, unknown>;
  const venue = normalizeVenue(r.venue);
  const trussById: Record<string, RiggPlanTruss> = {};
  if (r.trussById && typeof r.trussById === "object") {
    for (const [id, t] of Object.entries(r.trussById as Record<string, unknown>)) {
      const norm = normalizeTruss(t);
      // Always clamp loaded trusses into the venue — guards against
      // hand-edited storage and against venue shrinks done in older
      // app versions that didn't re-clamp on venue change.
      if (norm) trussById[id] = clampTrussToVenue(norm, venue);
    }
  }
  return { venue, trussById };
}

/** Resolve the truss endpoints (start, end) given its centre, length
 *  and rotation. Used by the SVG renderer and the bounds clamp. */
export function trussEndpoints(
  t: RiggPlanTruss,
): { x1: number; y1: number; x2: number; y2: number } {
  const half = t.lengthM / 2;
  if (t.rotation === 90) {
    return { x1: t.x, y1: t.y - half, x2: t.x, y2: t.y + half };
  }
  return { x1: t.x - half, y1: t.y, x2: t.x + half, y2: t.y };
}

/** Clamp a truss centre so the truss stays inside the venue rect. If
 *  the truss is longer than the venue along its rotation axis, the
 *  length is also shrunk to fit — otherwise the position bounds would
 *  invert and the truss would render outside the venue. */
export function clampTrussToVenue(
  t: RiggPlanTruss,
  venue: RiggPlanVenue,
): RiggPlanTruss {
  const axisLen = t.rotation === 90 ? venue.depthM : venue.widthM;
  const lengthM = Math.max(0.5, Math.min(t.lengthM, axisLen));
  const half = lengthM / 2;
  if (t.rotation === 90) {
    return {
      ...t,
      lengthM,
      x: clamp(t.x, 0, venue.widthM),
      y: clamp(t.y, half, venue.depthM - half),
    };
  }
  return {
    ...t,
    lengthM,
    x: clamp(t.x, half, venue.widthM - half),
    y: clamp(t.y, 0, venue.depthM),
  };
}
