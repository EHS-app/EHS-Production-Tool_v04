/** Coerce raw JSON from the model into our strict ExtractedItems
 *  shape. The model occasionally omits a field, returns the wrong
 *  type, or produces a value far outside the realistic range — we
 *  fix up rather than throw, so the user always sees something
 *  useful in the editor.
 *
 *  Per-item-type quirks worth knowing (and worth testing):
 *    - Trusses: pointCount is rounded and clamped to [1, 8] so a
 *      drawing of a 12-rung ladder doesn't render with 12 hoists.
 *      A missing pointCount defaults to 3.
 *    - Trusses: hoistKg is null'd when outside [100, 5000] kg —
 *      anything outside that range is almost certainly the model
 *      misreading a part number as a hoist rating.
 *    - Lighting: rows with quantity > 200 are dropped both BEFORE
 *      and AFTER the merge step — pre-merge to stop a garbage row
 *      poisoning a real row's total during merging, post-merge to
 *      catch genuinely-merged totals that legitimately exceed our
 *      realistic ceiling.
 *    - Lighting: missing qty defaults to 1 (one fixture is the
 *      safest assumption); fractional qty is rounded.
 *    - LED screens: when widthM/heightM are missing OR zero/negative,
 *      we fall back to parsing them out of `name + notes` via
 *      parseMetresFromNotes. A stray "0" from the model must not
 *      suppress the metres fallback.
 *    - LED screens: 0/negative panel counts are also treated as null.
 *    - Sound: qty is rounded and floored at 1.
 *
 *  Lives in its own leaf module so all of those edge cases can be
 *  locked down with table-driven unit tests, independent of the
 *  Anthropic / Express / Drizzle imports the route file pulls in.
 *  Re-exports `Bbox` from `./normaliseAnalyserItems` so the route
 *  file can keep a single source of truth for the type. */
// `.ts` extensions are required here because this lib file is loaded
// directly by Node (via the test file) and Node's ESM resolver does
// not auto-resolve extensions. Other lib files in this directory get
// away without `.ts` because they have no internal imports — this is
// the only cross-lib chain so far. Permitted by the local tsconfig's
// `allowImportingTsExtensions` flag.
import { mergeLightingRows } from "./mergeLightingRows.ts";
import { parseMetresFromNotes } from "./parseMetresFromNotes.ts";
import {
  type Bbox,
  normaliseBbox,
  normaliseConfidence,
} from "./normaliseAnalyserItems.ts";

export type { Bbox };

/** Fields every item carries: a self-assessed confidence in [0, 1]
 *  (null when the model omitted it) and an optional bbox for the
 *  overlay editor. Adding these as a shared base keeps the per-type
 *  rows below readable. */
export type ItemMeta = { confidence: number | null; bbox: Bbox | null };

export type ExtractedItems = {
  venue: { widthM: number | null; depthM: number | null; ceilingM: number | null };
  stages: Array<
    { name: string; widthM: number; depthM: number; notes: string } & ItemMeta
  >;
  trusses: Array<
    {
      name: string;
      lengthM: number;
      pointCount: number;
      /** Per-motor working-load capacity in kg, when labelled on the
       *  drawing. Currently mapped on the client to one of the two
       *  configured hoist models (500 kg / 1000 kg). null when unknown. */
      hoistKg: number | null;
      trimM: number | null;
      notes: string;
    } & ItemMeta
  >;
  lighting: Array<
    {
      name: string;
      qty: number;
      weightKg: number | null;
      watts: number | null;
      /** Truss / system label this fixture is hung on, copied from one of
       *  trusses[].name when the model recognised a hang. Empty when the
       *  drawing didn't show one. */
      trussName: string;
      notes: string;
    } & ItemMeta
  >;
  ledScreens: Array<
    {
      name: string;
      panelsWide: number | null;
      panelsTall: number | null;
      /** Physical screen size in metres, when the drawing labels metres
       *  rather than panel counts (e.g. "5 x 3 m"). Falls back to null
       *  when only panel counts are visible. */
      widthM: number | null;
      heightM: number | null;
      notes: string;
    } & ItemMeta
  >;
  sound: Array<
    {
      name: string;
      qty: number;
      weightKg: number | null;
      watts: number | null;
      notes: string;
    } & ItemMeta
  >;
  summary: string;
};

export function normalizeExtracted(raw: unknown): ExtractedItems {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;

  const num = (v: unknown): number | null => {
    if (typeof v === "number" && Number.isFinite(v)) return v;
    if (typeof v === "string") {
      const n = parseFloat(v);
      if (Number.isFinite(n)) return n;
    }
    return null;
  };
  const numOrZero = (v: unknown): number => num(v) ?? 0;
  const str = (v: unknown): string => (typeof v === "string" ? v : "");
  const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);

  const v = (r.venue && typeof r.venue === "object" ? r.venue : {}) as Record<
    string,
    unknown
  >;

  return {
    venue: {
      widthM: num(v.widthM),
      depthM: num(v.depthM),
      ceilingM: num(v.ceilingM),
    },
    stages: arr(r.stages).map((s) => {
      const o = (s && typeof s === "object" ? s : {}) as Record<string, unknown>;
      return {
        name: str(o.name) || "Stage",
        widthM: numOrZero(o.widthM),
        depthM: numOrZero(o.depthM),
        notes: str(o.notes),
        confidence: normaliseConfidence(o.confidence),
        bbox: normaliseBbox(o.bbox),
      };
    }),
    trusses: arr(r.trusses).map((s) => {
      const o = (s && typeof s === "object" ? s : {}) as Record<string, unknown>;
      const ptRaw = num(o.pointCount);
      const pt = ptRaw == null ? 3 : Math.min(8, Math.max(1, Math.round(ptRaw)));
      // Clamp implausible motor sizes from the model. Real touring
      // gear is 250 / 500 / 1000 / 2000 kg; anything outside 100-5000
      // kg is almost certainly a misread of a part number.
      const hoistRaw = num(o.hoistKg);
      const hoistKg =
        hoistRaw != null && hoistRaw >= 100 && hoistRaw <= 5000
          ? Math.round(hoistRaw)
          : null;
      return {
        name: str(o.name) || "Truss",
        lengthM: numOrZero(o.lengthM),
        pointCount: pt,
        hoistKg,
        trimM: num(o.trimM),
        notes: str(o.notes),
        confidence: normaliseConfidence(o.confidence),
        bbox: normaliseBbox(o.bbox),
      };
    }),
    // Lighting rows are merged downstream — see `mergeLightingRows`.
    // Rows with garbage quantities (e.g. the model misreading a part
    // number or pixel count as 1000+ fixtures) are dropped both
    // before AND after the merge: pre-merge to stop garbage poisoning
    // a real row's total, post-merge to catch genuinely-merged rows
    // that legitimately exceed our realistic ceiling.
    lighting: mergeLightingRows(
      arr(r.lighting)
        .map((s) => {
          const o = (s && typeof s === "object" ? s : {}) as Record<
            string,
            unknown
          >;
          const qRaw = num(o.qty);
          return {
            name: str(o.name) || "Fixture",
            qty: qRaw == null ? 1 : Math.max(1, Math.round(qRaw)),
            qRaw,
            weightKg: num(o.weightKg),
            watts: num(o.watts),
            trussName: str(o.trussName).trim(),
            notes: str(o.notes),
            confidence: normaliseConfidence(o.confidence),
            bbox: normaliseBbox(o.bbox),
          };
        })
        .filter((row) => row.qRaw == null || row.qRaw <= 200)
        .map(({ qRaw: _qRaw, ...rest }) => rest),
    ).filter((row) => row.qty <= 200),
    ledScreens: arr(r.ledScreens).map((s) => {
      const o = (s && typeof s === "object" ? s : {}) as Record<string, unknown>;
      const name = str(o.name) || "Screen";
      const notes = str(o.notes);
      // Fallback parser: the model sometimes leaves widthM/heightM null
      // and puts the metric size only in the name or notes (e.g.
      // "Center - LED 7m x 1m", "STØTE LED 5x3m Right", "IMAG- LED
      // 7.5m x 4.5m, 1013kg"). When the dedicated fields are empty,
      // lift the first such pattern out of name+notes so the client
      // can still render the screen at the correct size. Pixel counts
      // ("768 x 1152 pixel") and panel counts ("16 x 9 panels") are
      // intentionally ignored.
      const lifted = parseMetresFromNotes(`${name} ${notes}`);
      // Treat zero / negative dimensions from the model as null so that
      // a stray "0" doesn't suppress our metres fallback or render a
      // 0-panel-wide screen on the client.
      const positive = (v: number | null) =>
        v != null && v > 0 ? v : null;
      return {
        name,
        panelsWide: positive(num(o.panelsWide)),
        panelsTall: positive(num(o.panelsTall)),
        widthM: positive(num(o.widthM)) ?? lifted.widthM,
        heightM: positive(num(o.heightM)) ?? lifted.heightM,
        notes,
        confidence: normaliseConfidence(o.confidence),
        bbox: normaliseBbox(o.bbox),
      };
    }),
    sound: arr(r.sound).map((s) => {
      const o = (s && typeof s === "object" ? s : {}) as Record<string, unknown>;
      const qRaw = num(o.qty);
      const qty = qRaw == null ? 1 : Math.max(1, Math.round(qRaw));
      return {
        name: str(o.name) || "Sound",
        qty,
        weightKg: num(o.weightKg),
        watts: num(o.watts),
        notes: str(o.notes),
        confidence: normaliseConfidence(o.confidence),
        bbox: normaliseBbox(o.bbox),
      };
    }),
    summary: str(r.summary),
  };
}
