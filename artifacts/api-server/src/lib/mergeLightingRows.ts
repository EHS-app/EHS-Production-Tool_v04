/** Bbox shape used by the analyser's lighting merge step. Defined
 *  locally so this leaf module has no upward dependency on the
 *  analyser route file; structurally identical to the route file's
 *  `Bbox` type, so values flow freely between them via TypeScript's
 *  structural typing. */
export type Bbox = { x: number; y: number; width: number; height: number };

/** Single lighting row as it leaves the model-normalisation step,
 *  before duplicate (name, truss) pairs get collapsed by
 *  `mergeLightingRows`. Mirrors the row shape produced inside
 *  `routes/rigplanAnalyze.ts`. */
export type LightingRow = {
  name: string;
  qty: number;
  weightKg: number | null;
  watts: number | null;
  trussName: string;
  notes: string;
  confidence: number | null;
  bbox: Bbox | null;
};

/** Build a stable lookup key for a (fixture-name, truss) pair. We
 *  normalise whitespace, casing and a few trivial separators so that
 *  "MAC Aura XB" / "Mac Aura  XB" / "MAC AURA XB" collapse to one row.
 *  Truss names are normalised the same way as on the client (see
 *  applyExtractedItems' trussKey helper) so server-side dedup matches
 *  the client-side fixture-to-system wiring. */
export function lightingMergeKey(name: string, trussName: string): string {
  const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");
  const trussKey = trussName.trim().toLowerCase().replace(/[\s_-]+/g, "");
  return `${norm(name)}\u0000${trussKey}`;
}

/** Collapse duplicate (fixture-name, truss) rows produced by the model.
 *  Quantities sum; the first non-null weight / watts wins (Claude is
 *  consistent within a single response, so we don't need to average);
 *  notes from later rows are concatenated when they add new info.
 *
 *  Note dedup is case-sensitive on purpose: "Stage Left" and
 *  "stage left" are intentionally kept as separate notes so producers
 *  can spot model casing inconsistencies during review.
 *
 *  Output rows are top-level shallow copies of the input rows
 *  (`{ ...row }`), so nested objects like `bbox` are aliased by
 *  reference. Callers that need deep isolation should clone after.
 *
 *  Lives in its own leaf module so the merge logic is independently
 *  unit-testable without dragging in the rest of the analyser route's
 *  Anthropic / Express / Drizzle imports. */
export function mergeLightingRows(rows: LightingRow[]): LightingRow[] {
  const byKey = new Map<string, LightingRow>();
  for (const row of rows) {
    const key = lightingMergeKey(row.name, row.trussName);
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, { ...row });
      continue;
    }
    existing.qty += row.qty;
    if (existing.weightKg == null && row.weightKg != null) {
      existing.weightKg = row.weightKg;
    }
    if (existing.watts == null && row.watts != null) {
      existing.watts = row.watts;
    }
    if (row.notes && !existing.notes.includes(row.notes)) {
      existing.notes = existing.notes
        ? `${existing.notes}; ${row.notes}`
        : row.notes;
    }
    // Keep the lowest confidence — merging means we believe the
    // combined claim only as strongly as its weakest contributor.
    if (row.confidence != null) {
      existing.confidence =
        existing.confidence == null
          ? row.confidence
          : Math.min(existing.confidence, row.confidence);
    }
    // Keep the first non-null bbox; the merged row points at the
    // first cluster we saw and the user can re-position it in the
    // overlay editor if needed.
    if (existing.bbox == null && row.bbox != null) {
      existing.bbox = row.bbox;
    }
  }
  return Array.from(byKey.values());
}
