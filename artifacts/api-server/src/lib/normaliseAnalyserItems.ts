/** Coercers for the two model-returned numeric shapes that need
 *  range-clamping before we trust them: bounding boxes (each of
 *  x/y/width/height in [0, 1], with the box clamped so it never
 *  extends past the right or bottom edge), and self-assessed
 *  confidence (a single number in [0, 1]).
 *
 *  Both functions are deliberately tolerant: anything we can salvage
 *  becomes a clamped value, anything we cannot becomes `null`. This
 *  lets the overlay editor and the "Check Me" flagging logic blindly
 *  trust whatever survives — they never have to defensively
 *  re-validate.
 *
 *  Lives in its own leaf module so the clamp behaviour (the
 *  "negative-becomes-zero", "above-one-becomes-one",
 *  "non-finite-becomes-null", and "bbox-extends-past-edge" branches)
 *  is independently unit-testable. The bbox edge-clamp in particular
 *  is easy to break by accident — a `width` of 0.9 at `x=0.5` must
 *  become 0.5, not stay 0.9.
 *
 *  The lib defines its own `Bbox` type so tests don't need to drag in
 *  the route file's Anthropic / Express / Drizzle module graph; this
 *  type is structurally identical to the one in `mergeLightingRows`
 *  and (after this extraction) to the one in `normalizeExtracted`,
 *  and they all interop via TypeScript's structural typing.
 */

/** Bounding box of an item in normalised image coordinates with the
 *  origin at top-left. After `normaliseBbox`, all four numbers are
 *  guaranteed to be finite, in [0, 1], and the box is guaranteed to
 *  fit inside the unit square. */
export type Bbox = { x: number; y: number; width: number; height: number };

/** Clamp the four model-returned bbox numbers into a guaranteed-valid
 *  rectangle, or return null when the input cannot be salvaged.
 *
 *  Salvage rules:
 *    - Any non-finite or non-numeric x/y/width/height → null overall.
 *    - Negative x/y → 0; values above 1 → 1.
 *    - Negative or zero width/height → null overall (the box would
 *      have no area, which the editor cannot render).
 *    - Width / height are then capped at `1 - x` / `1 - y` so the
 *      box never extends past the right / bottom edge of the image.
 *      If that cap brings them to zero, the box is rejected. */
export function normaliseBbox(v: unknown): Bbox | null {
  if (!v || typeof v !== "object") return null;
  const o = v as Record<string, unknown>;
  const numIn01 = (n: unknown): number | null => {
    if (typeof n === "number" && Number.isFinite(n)) {
      if (n < 0) return 0;
      if (n > 1) return 1;
      return n;
    }
    return null;
  };
  const x = numIn01(o.x);
  const y = numIn01(o.y);
  const width = numIn01(o.width);
  const height = numIn01(o.height);
  if (x == null || y == null || width == null || height == null) return null;
  if (width <= 0 || height <= 0) return null;
  // Clamp the box so it never extends past the right / bottom edge.
  const w = Math.min(width, 1 - x);
  const h = Math.min(height, 1 - y);
  if (w <= 0 || h <= 0) return null;
  return { x, y, width: w, height: h };
}

/** Coerce a model-returned `confidence` number into [0, 1] or null.
 *
 *  Anything non-numeric or non-finite (NaN, ±Infinity, strings, etc.)
 *  becomes null so the editor can render the "Check Me" indicator
 *  without having to know about the failure mode; valid numbers
 *  outside [0, 1] are clamped, not rejected, because the model
 *  occasionally produces 1.05 or -0.01 from rounding. */
export function normaliseConfidence(v: unknown): number | null {
  if (typeof v !== "number" || !Number.isFinite(v)) return null;
  if (v < 0) return 0;
  if (v > 1) return 1;
  return v;
}
