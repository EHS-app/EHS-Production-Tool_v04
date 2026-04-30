import { Router, type IRouter, type RequestHandler, json } from "express";
import Anthropic from "@anthropic-ai/sdk";
import { and, eq } from "drizzle-orm";
import { db, venueMemoryTable } from "@workspace/db";
import { logger } from "../lib/logger";
import { buildVenueMemoryHint } from "../lib/venueMemoryHint";
import { venueKeyFor } from "../lib/venueKey";
import { extractJsonBlock } from "../lib/extractJsonBlock";
import { normalizeExtracted } from "../lib/normalizeExtracted";
// `mergeLightingRows` and `parseMetresFromNotes` used to live in this
// route file directly; both moved into `../lib/normalizeExtracted`
// during Phase B and are no longer imported here. Their breadcrumbs
// further down still document where to find them.

const router: IRouter = Router();

// `venueKeyFor` lives in `../lib/venueKey` so both this analyser
// route and `routes/venueMemory.ts` can share it without coupling
// the two route modules to each other's transitive imports.
// Re-exported here for any consumer still reaching in through this
// module.
export { venueKeyFor };

/** Require an authenticated Clerk session. We only ever call the upstream
 *  Anthropic API on behalf of a signed-in user — otherwise this endpoint
 *  would be a free relay anyone on the internet could abuse. */
const requireSignedIn: RequestHandler = (req, res, next) => {
  const auth =
    typeof (req as unknown as { auth?: unknown }).auth === "function"
      ? ((req as unknown as { auth: () => { userId?: string | null } }).auth())
      : ((req as unknown as { auth?: { userId?: string | null } }).auth ?? {});
  if (!auth || !auth.userId) {
    res.status(401).json({ ok: false, error: "Sign in required." });
    return;
  }
  (req as unknown as { _userId: string })._userId = auth.userId;
  next();
};

/** Tiny in-memory token bucket per Clerk user id. The analyser is expensive
 *  and slow, so a low rate is fine. Resets on server restart, which is
 *  acceptable for our scale. */
const RATE_WINDOW_MS = 60_000;
const RATE_MAX = 6; // max 6 analyses per user per minute
const recentByUser: Map<string, number[]> = new Map();
let rateLimitCallCount = 0;

/** Opportunistic sweep — every N requests we drop empty / stale entries so
 *  the map can't grow unbounded across many unique users over a long uptime. */
function maybeSweepRateLimitMap(now: number): void {
  rateLimitCallCount += 1;
  if (rateLimitCallCount % 200 !== 0) return;
  for (const [k, v] of recentByUser) {
    const fresh = v.filter((t) => now - t < RATE_WINDOW_MS);
    if (fresh.length === 0) recentByUser.delete(k);
    else if (fresh.length !== v.length) recentByUser.set(k, fresh);
  }
}

const rateLimit: RequestHandler = (req, res, next) => {
  const userId = (req as unknown as { _userId?: string })._userId;
  if (!userId) {
    next();
    return;
  }
  const now = Date.now();
  maybeSweepRateLimitMap(now);
  const arr = (recentByUser.get(userId) ?? []).filter(
    (t) => now - t < RATE_WINDOW_MS,
  );
  if (arr.length >= RATE_MAX) {
    const retryInSec = Math.ceil(
      (RATE_WINDOW_MS - (now - arr[0])) / 1000,
    );
    res.setHeader("Retry-After", String(retryInSec));
    res.status(429).json({
      ok: false,
      error: `Too many drawing analyses. Try again in ${retryInSec}s.`,
    });
    return;
  }
  arr.push(now);
  recentByUser.set(userId, arr);
  next();
};

const ANTHROPIC_BASE_URL = process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL;
const ANTHROPIC_API_KEY = process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY;

const anthropic =
  ANTHROPIC_BASE_URL && ANTHROPIC_API_KEY
    ? new Anthropic({ baseURL: ANTHROPIC_BASE_URL, apiKey: ANTHROPIC_API_KEY })
    : null;

type SupportedImageMediaType =
  | "image/jpeg"
  | "image/png"
  | "image/gif"
  | "image/webp";

type SupportedDocumentMediaType = "application/pdf";

type SupportedMediaType = SupportedImageMediaType | SupportedDocumentMediaType;

const SUPPORTED_IMAGE_MEDIA_TYPES: readonly SupportedImageMediaType[] = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
] as const;

const SUPPORTED_MEDIA_TYPES: readonly SupportedMediaType[] = [
  ...SUPPORTED_IMAGE_MEDIA_TYPES,
  "application/pdf",
] as const;

function isSupportedMediaType(s: string): s is SupportedMediaType {
  return (SUPPORTED_MEDIA_TYPES as readonly string[]).includes(s);
}

function isImageMediaType(s: SupportedMediaType): s is SupportedImageMediaType {
  return (SUPPORTED_IMAGE_MEDIA_TYPES as readonly string[]).includes(s);
}

/** Extract media-type + base64 payload from a `data:<mime>;base64,...` URL.
 *  Accepts the documented image types plus `application/pdf`. */
function parseDataUrl(
  url: string,
):
  | { ok: true; mediaType: SupportedMediaType; data: string }
  | { ok: false; error: string } {
  const m = url.match(/^data:([^;,]+);base64,(.+)$/i);
  if (!m) return { ok: false, error: "fileDataUrl must be a base64 data URL" };
  const mediaType = m[1].toLowerCase();
  if (!isSupportedMediaType(mediaType)) {
    return {
      ok: false,
      error: `Unsupported file type: ${mediaType}. Use a PDF or a PNG/JPG/WebP/GIF image.`,
    };
  }
  return { ok: true, mediaType, data: m[2] };
}

/** Schema we ask the model to emit. Matches `ExtractedItems` on the
 *  client. Numbers are kept as `number | null` so the model can omit a
 *  value when the drawing doesn't show it. */
const SCHEMA_PROMPT = `You are an assistant for a touring production rigging tool. Inspect the
attached venue / show drawing (top-down rigging plan, lighting plot, stage
diagram, ground plan or section) and extract a structured list of every
physical item that is shown. Read every page of a multi-page PDF, and read
every legend, key, label and dimension annotation, not just the symbols.

Return ONLY a single JSON code block (\`\`\`json ... \`\`\`) matching this
TypeScript-style schema. Omit no required keys; use empty arrays when
nothing of that kind is shown.

{
  "venue":      { "widthM": number|null, "depthM": number|null, "ceilingM": number|null },
  "stages":     [ { "name": string, "widthM": number, "depthM": number, "notes": string, "confidence": number, "bbox": {"x":number,"y":number,"width":number,"height":number}|null } ],
  "trusses":    [ { "name": string, "lengthM": number, "pointCount": number, "hoistKg": number|null, "trimM": number|null, "notes": string, "confidence": number, "bbox": {"x":number,"y":number,"width":number,"height":number}|null } ],
  "lighting":   [ { "name": string, "qty": number, "weightKg": number|null, "watts": number|null, "trussName": string, "notes": string, "confidence": number, "bbox": {"x":number,"y":number,"width":number,"height":number}|null } ],
  "ledScreens": [ { "name": string, "panelsWide": number|null, "panelsTall": number|null, "widthM": number|null, "heightM": number|null, "notes": string, "confidence": number, "bbox": {"x":number,"y":number,"width":number,"height":number}|null } ],
  "sound":      [ { "name": string, "qty": number, "weightKg": number|null, "watts": number|null, "notes": string, "confidence": number, "bbox": {"x":number,"y":number,"width":number,"height":number}|null } ],
  "summary":    string
}

Conventions:
- All distances are in metres. Convert feet / inches / mm to metres
  (1 ft = 0.3048 m, 1 in = 0.0254 m, 1 mm = 0.001 m). Round to one decimal.

- "trusses" / rigging systems:
  * One truss = one named overhead rigging bar / hang / ladder / pre-rig
    truss / boom. The motors / chain hoists / pickup points DRAWN ON
    that bar do NOT each become their own truss — they contribute to
    that bar's \`pointCount\`. Only emit a separate truss entry when the
    drawing labels it as an independent system.
  * Read the label EXACTLY as shown on the drawing — typical labels
    include "LX1", "LX 2", "LX-3", "FOH", "Mid", "Mid LX", "Front
    Truss", "Back Truss", "Side LX SL", "Side LX SR". Keep the same
    casing and number. If a bar has no visible label, name it "LX1",
    "LX2"… in left-to-right / front-to-back order.
  * Do not emit two trusses with the same name. If you see the same
    label twice on the drawing it is the same physical system.
  * \`lengthM\` MUST come from the drawing if a length is annotated
    (e.g. "12 m", "8.0 m", "30'-0\\""). Otherwise estimate from the venue
    scale and the bar's drawn extent. Never leave it 0 if a length is
    visible.
  * \`pointCount\` is the number of motors / chain hoists / pickup points
    drawn on that bar (look for triangles, circles or "M" markers).
    Clamp 1-8. If unsure, use 3.
  * \`hoistKg\` is the working-load capacity of each motor on that bar in
    kilograms, when the drawing labels the motor model or capacity.
    Common labels: "1t", "1 ton", "1000 kg", "1000kg", "D8+ 1t",
    "Lodestar 1t", "BGV-D8+ 1000 kg" → \`hoistKg = 1000\`. "500 kg",
    "500kg", "0.5t", "1/2 t", "D8 500", "Lodestar 500" → \`hoistKg = 500\`.
    Use null when no motor type / capacity is shown. Pick the dominant
    capacity for the truss when several are visible.
  * \`trimM\` is the trim height (height above stage / deck) if labelled
    (e.g. "trim 7.5 m", "TH 7.0 m"). null if not given.
  * Put any extra useful info (colour, position, notes from the drawing)
    in \`notes\`, e.g. "stage left", "pre-rigged", "downstage of LX2".

- "lighting":
  * Tally fixtures by type. Read the legend / fixture key first, then
    count symbols on each truss. The result is one row per fixture type
    PER truss — e.g. "Robe MegaPointe x6 on LX1" and "Robe MegaPointe
    x4 on LX2" are TWO rows, not one combined row of 10.
  * EXACTLY one row per (fixture-name, trussName) pair. If the same
    make+model appears in several clusters along the SAME truss (e.g.
    a row of MAC Aura at upstage and another at midstage of LX6), sum
    them into ONE row of qty = total. Do not split.
  * \`name\` is the fixture make + model exactly as printed in the legend
    (e.g. "Robe MegaPointe", "Martin MAC Aura PXL", "ETC Source 4 26°").
  * \`qty\` is the visible count of that fixture on that one truss /
    position. Quantities are almost always between 1 and ~80. If you
    catch yourself returning more than 200 of one fixture you are
    almost certainly mis-reading a part number or pixel count — drop
    that row.
  * \`trussName\` is the truss / system label the fixture is hanging on,
    using the SAME string as the corresponding "trusses[].name" (e.g.
    "LX1", "FOH", "Mid"). If the fixture is on the floor, a boom or a
    side ladder, use that label instead (e.g. "Floor", "SL Boom",
    "SR Ladder"). Use empty string only when there is genuinely no
    truss / position info.
  * \`weightKg\` and \`watts\` are PER-FIXTURE values. Use known catalogue
    values for common fixtures (e.g. MegaPointe ~22.5 kg / 470 W,
    MAC Aura PXL ~10.5 kg / 260 W). Use null only if you have no
    reasonable estimate.
  * Pixel-mapped video tubes / video pixel arrays / LED video panels
    (e.g. "VDO Fatron", "VDO Sceptron", "Pixel Tube", "Astera Titan
    Tube" used as video) are pieces of an LED screen, NOT lighting.
    Put their grid in "ledScreens" instead.

- "ledScreens" is LED walls and pixel-mapped LED video surfaces. For
  each screen ALWAYS try to record the dimensions in one of the two
  field pairs — almost every drawing will give you at least one:
    * If the drawing labels a panel grid (e.g. "16 W x 9 H panels",
      "8 cabinets wide"), set \`panelsWide\` and \`panelsTall\`.
    * If the drawing labels the screen size in metres (e.g.
      "STØTE LED 5 x 3 m" → widthM=5, heightM=3; "IMAG- LED 7.5 m x
      4.5 m" → widthM=7.5, heightM=4.5), set \`widthM\` and \`heightM\`.
      Do NOT leave these null and only mention the size in \`notes\` —
      put the numbers in the fields.
  It is fine to fill both pairs when both are visible. Pixel totals
  (e.g. "8960 x 1584 pixel") can additionally go in \`notes\`.
- "sound" is PA / monitor / sub items.
- "stages" is built decking / risers / drum risers / DJ booths (not the
  whole venue floor). Read each stage / deck / riser block separately.
  Use the labelled dimensions (e.g. "Main Stage 12 x 8 m", "Drum riser
  2 x 2 m"). \`name\` should match the label on the drawing.
- "summary" is one short sentence describing what the drawing depicts.

- "confidence" is your self-assessed certainty for that item, in the
  range [0, 1]. Use 0.9-1.0 only when the drawing explicitly labels
  the value (e.g. a truss tagged "LX3 — 12 m, 4 motors"); 0.6-0.8
  when you inferred it from a symbol, extent, or fixture-key entry;
  0.3-0.5 when you genuinely guessed; do NOT emit items below 0.3.
  Lower confidence does NOT mean omit the item — it means flag it
  so the user can verify or correct it in the overlay editor.

- "bbox" is the bounding box of the item on the drawing, in
  NORMALISED image coordinates with origin at the TOP-LEFT corner
  of the file (or the first page of a multi-page PDF): x, y are the
  box's top-left corner, width and height are its size, all in
  [0, 1] (so x + width <= 1 and y + height <= 1). A truss bar gets
  a long thin bbox along the bar; a lighting cluster covers the
  symbols on its truss; an LED screen covers the screen rectangle;
  a stage covers the deck; a sound array covers the speaker cluster.
  Use null only when you genuinely cannot point at one place on the
  drawing (e.g. info read only from a legend, fixture key or
  spec-sheet annotation with no on-plan symbol).

Be precise — if the drawing labels something "LX3" with a length of
12 m and 4 motors, the output truss MUST be name="LX3", lengthM=12,
pointCount=4. Do NOT invent items that are not in the drawing.

If the file is NOT a production drawing or you cannot extract anything,
still return the schema with empty arrays and a summary explaining why.
Do not include any text outside the JSON code block.`;

/** Optional prefix that turns the analyser into a "Production
 *  Technician" who treats data tables on the drawing as ground
 *  truth and flags visual / table mismatches. Layered IN FRONT of
 *  SCHEMA_PROMPT when the request body asks for `mode: "production"`.
 *  Like the geometry prefix, the output schema is unchanged — the
 *  rules just change interpretation, and the new pieces of
 *  information (mismatch flags, fixture mode, mounting type) are
 *  written into existing fields (notes / name / trussName) so the
 *  rest of the pipeline works without modification. */
const PRODUCTION_RULES_PROMPT = `You are an expert Production Technician. Map the provided drawing
into a structured project manifest, applying the rules below while
filling in the JSON schema described further below. Keep the schema
and field names exactly as specified — these rules change HOW you
read the drawing, not the output shape.

The producer typically uploads several PDFs in sequence (Stage,
LED, Lighting/Truss). Each call analyses ONE PDF, but the rules
below cover all four phases — apply only the phases relevant to
THIS drawing and leave the other categories empty. The Production
Tool merges results across uploads on its end.

CONFLICT PRIORITY (HIGHEST AUTHORITY):
   * Whenever the drawing's tabular data ("Truss Count by Position",
     "Instrument Count by Position", "NOTES LED", stage decking
     manifest, etc.) contradicts what visual symbols on the drawing
     appear to show, the TABLES WIN. Use the table number for every
     reported quantity. Record the visual mismatch in the "notes"
     field with the exact form: "MISMATCH: drawing shows X, table
     shows Y." so the producer can investigate in the overlay
     editor.

PHASE 1 — RIGGING & TRUSS (run when the drawing shows truss content):
   * Locate the "Truss Count by Position" / "Truss Inventory" / similar
     manifest table. EACH ROW in that table becomes one entry in the
     output's "trusses[]" array — do not collapse rows.
   * Use the Position label (e.g. "LX1", "LX2", "LED TRUSS", "FOH",
     "MID") as the truss "name". Set "trussName" on every fixture /
     LED / sound item that hangs on that truss to the same string,
     so downstream grouping works.
   * Read the manifest's part-number columns (e.g. "fd34-300",
     "fd34-100", "30x30 0.5m corner") and list them in that truss's
     "notes" field, comma-separated, so the rigging report can show
     the exact pieces. Derive "lengthM" by summing the part lengths
     (fd34-300 = 3.0 m, fd34-200 = 2.0 m, fd34-100 = 1.0 m, "0.5m
     corner" = 0.5 m, etc.).
   * "pointCount" = number of motor / pickup points on that truss
     as shown on the drawing or specified in the table. If a hoist
     model is labelled (e.g. "Lodestar 1t", "500 kg"), populate
     "hoistKg" with the per-motor working-load capacity in kg.

PHASE 2 — LIGHTING (run when the drawing shows fixture content):
   * Locate the "Instrument Count by Position" table. For every row,
     emit one entry in "lighting[]" with: name (full fixture model
     from the legend, e.g. "MAC Viper XIP", "MAC Viper AirFX",
     "MAC One", "Rush MH7", "Color STRIKE M"), qty (the table
     count), trussName (the Position column).
   * Floor-mounted fixtures (Position labelled "Floor", "Stage Floor",
     "FOH Floor", "Ground"): set trussName="Floor" exactly. The
     Production Tool groups them into a single "Floor" system in the
     Rigging Report so the producer can read off the total
     stage-floor lighting weight at a glance.
   * Pipe-mounted fixtures (house pipe, balcony rail): set
     trussName="Pipe" exactly.
   * For weightKg and watts, prefer the manufacturer's catalogue
     values for the recognised model. The Production Tool has an
     internal fixture catalogue and will validate / override on
     apply, so getting the NAME RIGHT matters more than the exact
     gram count. Reference values for common Martin / Chauvet /
     Elation fixtures: MAC Viper XIP 37.8 kg / 1040 W, MAC Viper
     AirFX 36.7 kg / 1225 W, MAC One 5.4 kg / 160 W, NICK NRG 1201
     12.9 kg / 340 W, Pulse Panel FX 14.4 kg / 900 W, Color STRIKE
     M 13.1 kg / 740 W, SnowARC Pro Quad 40 mkII 10.5 kg / 390 W.
   * If the legend or the table specifies a fixture MODE (e.g.
     "Basic", "Extended", "Compact", "16-bit"), append it to the
     name in parentheses, e.g. "MAC Viper XIP (Basic)". Do NOT
     invent a mode if the drawing doesn't show one.

PHASE 3 — LED SCREENS (run when the drawing shows video / LED content):
   * Identify each video surface zone using its label and any
     "NOTES LED" block — typical zones are "Main LED", "Triangle",
     "Side Towers L/R", "Stage Backdrop". One ledScreens[] entry
     per zone.
   * If the notes give a SURFACE AREA in m² (e.g. "128 m²"), use it
     to compute panel counts assuming a default 0.5 m × 0.5 m panel
     (4 panels per m²). Fill in widthM / heightM from labelled
     dimensions when present; otherwise leave them null and put
     the surface area + computed panel count in "notes" (e.g.
     "Surface 128 m² — ~512 panels @ 0.5×0.5 m").
   * If the notes give a PIXEL RESOLUTION (e.g. "4096 × 2048p"),
     copy it verbatim to "notes" so the LED Screen Report can show
     it alongside the panel count.

PHASE 4 — STAGE & FLOOR (run when the drawing shows stage content):
   * Identify each stage zone and emit one stages[] entry per zone:
     "Main Stage" (the primary deck), "Satelit Scene" (typically a
     4 m circular B-stage), "Bøyleland" (catwalk / runway), or
     whatever labels the drawing uses.
   * For circular zones like Satelit Scene, set widthM = depthM =
     diameter (e.g. 4 / 4 for a 4 m circle) and put "circular,
     Ø4 m" in "notes".
   * Locate the "Decking Manifest" / "Stage Build" / similar table
     and list the deck-piece counts in the relevant stage's "notes"
     field (e.g. "12× 2×1 m + 6× 1×1 m decks").

GENERAL:
   * Read each table TOP-TO-BOTTOM. Don't skip rows even if they
     look duplicate — they may differ by Position or fixture mode.
   * Set "confidence" honestly. Items with confidence < 0.7 will
     be rendered with a "Check Me" indicator in the editor so the
     user can verify them. Lower confidence does NOT mean omit —
     it means flag.
   * If a phase's content isn't present in this particular drawing
     (e.g. you got the Stage PDF, no lighting), leave that phase's
     array empty — don't invent items to fill it.

Now apply those rules while emitting the schema below.`;

/** Optional prefix that turns the analyser into a "Rigging Geometry
 *  Expert". Layered IN FRONT of SCHEMA_PROMPT when the request body
 *  asks for `mode: "geometry"`. The downstream JSON shape is
 *  unchanged — these are interpretation rules, not a new schema —
 *  so the apply-to-reports / overlay-editor / venue-memory pipeline
 *  works identically in both modes. */
const GEOMETRY_RULES_PROMPT = `You are a Rigging Geometry Expert for live events. Apply the
following "Rigging Logic" while reading the drawing, then fill in
the JSON schema described further below. Keep the schema and field
names exactly as specified — these geometry rules change HOW you
interpret the drawing, not the output shape.

CRITICAL LOGIC RULES:
1. TRUSS ANCHORING: Every fixture (lighting / sound / led) MUST be
   associated with a truss. Set "trussName" to the truss it hangs
   on. If a fixture is genuinely on the floor and not flown, use
   trussName = "Floor" (treat that as the equivalent of a
   "floor_package").
2. ALIGNMENT & SNAPPING: Fixtures and items on the same straight
   truss MUST share a common axis. Do NOT return crooked
   coordinates. If lights look aligned along the truss, snap their
   bbox centres so they line up perfectly along the truss's axis
   (same y for a horizontal truss, same x for a vertical truss).
3. MOTOR PLACEMENT: Motors / pickup points are typically at the
   ends of trusses or at 1/4 points. If you find a truss with
   fewer than 2 motors, look closer at the intersections and ends
   of the bar for symbols you may have missed before settling on a
   final pointCount.
4. BOX DIMENSIONS: Use a consistent scale. Trusses of the same
   declared type (e.g. all "30x30" general-purpose trusses) MUST be
   represented with a CONSISTENT bbox thickness — normalise the
   short dimension across same-type trusses. The long dimension
   still reflects the actual labelled or measured length.
5. CONFIDENCE FLAGGING: Set "confidence" honestly. Items with
   confidence < 0.7 will be rendered with a "Check Me" indicator in
   the editor so the user can verify them. Lower confidence does
   NOT mean omit — it means flag.
6. TRUSS GROUPING: Fixtures that hang on the same truss should
   share that truss's "trussName" exactly so they can be moved as a
   group in the editor.

Now apply those rules while emitting the schema below.`;

/** Prompt selector. Each non-classic mode prefixes its rule-set in
 *  front of the canonical schema spec, so the parser, normaliser,
 *  overlay editor and venue-memory loop all keep working unchanged
 *  regardless of which mode produced the response. */
function buildAnalyzePrompt(mode: AnalyzeMode): string {
  if (mode === "geometry") {
    return `${GEOMETRY_RULES_PROMPT}\n\n${SCHEMA_PROMPT}`;
  }
  if (mode === "production") {
    return `${PRODUCTION_RULES_PROMPT}\n\n${SCHEMA_PROMPT}`;
  }
  return SCHEMA_PROMPT;
}

/** Three analyser interpretation modes the client can pick between.
 *  - "classic"    → schema-only prompt, the original behaviour.
 *  - "geometry"   → schema + Rigging Geometry Expert rules
 *                   (truss anchoring, alignment/snapping, etc.).
 *  - "production" → schema + Production Technician rules
 *                   (table-as-ground-truth, mismatch flagging,
 *                   Position Groups, Floor/Pipe mounting). */
type AnalyzeMode = "classic" | "geometry" | "production";

type AnalyzeContext = {
  venue?: { widthM?: number; depthM?: number; ceilingM?: number };
  projectName?: string;
  /** Free-form text built from saved venue memory. Injected verbatim
   *  into the prompt as a "previously-known about this venue" hint
   *  so Claude can prefer past truss / fixture names over reinvention.
   *  Keep this short — a few hundred characters at most. */
  venueMemoryHint?: string;
};

function contextLine(ctx: AnalyzeContext | undefined): string {
  if (!ctx) return "";
  const parts: string[] = [];
  if (ctx.projectName) parts.push(`Project: ${ctx.projectName}`);
  if (ctx.venue) {
    const v = ctx.venue;
    if (v.widthM || v.depthM || v.ceilingM) {
      parts.push(
        `Known venue: ${v.widthM ?? "?"} x ${v.depthM ?? "?"} m, ceiling ${v.ceilingM ?? "?"} m`,
      );
    }
  }
  const ctxLine = parts.length
    ? `Additional context: ${parts.join(" — ")}.`
    : "";
  const hint = ctx.venueMemoryHint?.trim();
  if (hint) {
    return `${ctxLine}\n\nWhat we have learned about this venue from past\nanalyses (use as a HINT — always prefer what is actually visible\nin THIS drawing; correct any past mistake the user changed):\n${hint}`.trim();
  }
  return ctxLine;
}

// Venue-memory hint builder lives in its own pure-logic file
// (`../lib/venueMemoryHint`) so it can be unit-tested with `node:test`
// without dragging in the DB / SDK module graph this route file
// imports. Re-exported here for any consumer still reaching in
// through this module.
export { buildVenueMemoryHint };

// `extractJsonBlock` lives in `../lib/extractJsonBlock` so the
// fence-vs-brace-fallback selection logic can be locked down with
// unit tests independent of this route's Anthropic / Express /
// Drizzle imports.

// `Bbox`, `normaliseBbox` and `normaliseConfidence` live in
// `../lib/normaliseAnalyserItems` so the clamp behaviour
// (negative-becomes-zero, above-one-becomes-one,
// non-finite-becomes-null, bbox-extends-past-edge) is independently
// unit-testable. The canonical `Bbox` type lives there too — this
// file re-exports it through `../lib/normalizeExtracted` so any
// caller wanting it has a single source of truth.

// `ItemMeta`, `ExtractedItems` and `normalizeExtracted` live in
// `../lib/normalizeExtracted` so all the per-item-type quirks
// (truss pointCount [1, 8] clamp, hoistKg [100, 5000] window,
// lighting qty>200 pre/post-merge drop, LED-screen zero-suppresses-
// fallback, etc.) can be locked down with table-driven unit tests
// independent of the SDK / Express / DB imports above.

// `lightingMergeKey`, `LightingRow` and `mergeLightingRows` live in
// `../lib/mergeLightingRows` so the merge logic can be unit-tested
// without dragging in this file's Anthropic / Express / Drizzle
// imports. The lib defines its own structurally-identical `Bbox`
// type, which interops with the canonical one in
// `../lib/normaliseAnalyserItems` via TypeScript's structural typing.

// `parseMetresFromNotes` lives in `../lib/parseMetresFromNotes` so the
// regex behaviour (Norwegian comma-decimals, "m" suffix discrimination
// against pixel/panel counts, trailing-label fallback) can be locked
// down with comprehensive unit tests independent of this route's
// Anthropic / Express / Drizzle imports.

// 12 MB body limit only on this route — base64-encoded images are large.
// Middleware order is deliberate: auth → rate-limit → body parsing. Both
// 401 (unauthenticated) and 429 (over rate limit) responses are returned
// BEFORE the request body is buffered, so neither anonymous traffic nor
// users in cooldown can force the server to allocate large payloads.
router.post("/rigplan/analyze", requireSignedIn, rateLimit, json({ limit: "12mb" }), async (req, res) => {
  if (!anthropic) {
    res.status(503).json({
      ok: false,
      error:
        "Drawing analysis is not configured on this server (Anthropic env vars missing).",
    });
    return;
  }

  const body = (req.body ?? {}) as {
    /** Preferred name for image OR PDF data URLs. */
    fileDataUrl?: unknown;
    /** Legacy field — kept for backward compatibility with older clients. */
    imageDataUrl?: unknown;
    context?: unknown;
    /** Interpretation mode. Defaults to "classic" when missing or
     *  when the value is anything other than the two known strings,
     *  so older clients keep their existing behaviour. */
    mode?: unknown;
  };
  const mode: AnalyzeMode =
    body.mode === "geometry"
      ? "geometry"
      : body.mode === "production"
        ? "production"
        : "classic";
  const dataUrlField =
    typeof body.fileDataUrl === "string" && body.fileDataUrl
      ? body.fileDataUrl
      : typeof body.imageDataUrl === "string"
        ? body.imageDataUrl
        : "";
  if (!dataUrlField) {
    res.status(400).json({ ok: false, error: "fileDataUrl is required" });
    return;
  }
  const parsed = parseDataUrl(dataUrlField);
  if (!parsed.ok) {
    res.status(400).json({ ok: false, error: parsed.error });
    return;
  }
  // Anthropic's vision endpoint accepts up to ~5 MB per image and ~32 MB per
  // PDF, but our route-scoped body parser caps the JSON envelope at 12 MB
  // (see the `json({ limit: "12mb" })` middleware below). Base64 is ~33 %
  // larger than the binary, so:
  //   - Images:   binary cap 4.5 MB → ~6 MB of base64 (well under both).
  //   - PDFs:     binary cap 8.0 MB → ~10.7 MB of base64 (under our 12 MB).
  const approxBinaryBytes = Math.floor(parsed.data.length * 0.75);
  const isImage = isImageMediaType(parsed.mediaType);
  const binaryCap = isImage ? 4_500_000 : 8_000_000;
  if (approxBinaryBytes > binaryCap) {
    const capMb = isImage ? "4.5 MB" : "8 MB";
    res.status(413).json({
      ok: false,
      error: `${isImage ? "Image" : "PDF"} is too large; please use one under ~${capMb}.`,
    });
    return;
  }

  const incomingCtx =
    body.context && typeof body.context === "object"
      ? (body.context as AnalyzeContext & { venueName?: unknown })
      : undefined;

  // Per-user, per-venue learning memory: if the producer has saved
  // corrections for this venue before, we look them up and add a short
  // hint to the prompt. Failures here are silent on purpose — a missing
  // memory entry just means "no hint", and a DB hiccup must never
  // block the analyser.
  let venueMemoryHint: string | undefined;
  if (incomingCtx && typeof incomingCtx.venueName === "string") {
    const venueName = incomingCtx.venueName.trim();
    const userId = (req as unknown as { _userId?: string })._userId ?? "";
    if (venueName && userId) {
      try {
        const rows = await db
          .select({ data: venueMemoryTable.data })
          .from(venueMemoryTable)
          .where(
            and(
              eq(venueMemoryTable.userId, userId),
              eq(venueMemoryTable.venueKey, venueKeyFor(venueName)),
            ),
          )
          .limit(1);
        if (rows.length > 0) {
          const hint = buildVenueMemoryHint(rows[0].data);
          if (hint) venueMemoryHint = hint;
        }
      } catch (err) {
        logger.warn(
          { err: err instanceof Error ? err.message : String(err) },
          "venue memory lookup failed; continuing without hint",
        );
      }
    }
  }

  const ctx: AnalyzeContext | undefined = incomingCtx
    ? {
        venue: incomingCtx.venue,
        projectName: incomingCtx.projectName,
        venueMemoryHint,
      }
    : venueMemoryHint
      ? { venueMemoryHint }
      : undefined;

  // Anthropic's content-block shape differs for images vs PDFs. Images go
  // into a `type: "image"` block, PDFs into a `type: "document"` block. The
  // SDK types are separate so we build the right one per file kind.
  const fileBlock = isImage
    ? ({
        type: "image" as const,
        source: {
          type: "base64" as const,
          media_type: parsed.mediaType as SupportedImageMediaType,
          data: parsed.data,
        },
      })
    : ({
        type: "document" as const,
        source: {
          type: "base64" as const,
          media_type: "application/pdf" as const,
          data: parsed.data,
        },
      });

  try {
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 8192,
      messages: [
        {
          role: "user",
          content: [
            fileBlock,
            {
              type: "text",
              text: `${buildAnalyzePrompt(mode)}\n\n${contextLine(ctx)}`.trim(),
            },
          ],
        },
      ],
    });

    const textBlock = message.content.find((b) => b.type === "text");
    const text = textBlock && textBlock.type === "text" ? textBlock.text : "";
    const jsonStr = extractJsonBlock(text);
    if (!jsonStr) {
      logger.warn({ text }, "No JSON block in analyze response");
      res.status(502).json({
        ok: false,
        error: "The analyser did not return valid JSON. Try a clearer image.",
      });
      return;
    }

    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(jsonStr);
    } catch (err) {
      logger.warn({ err, jsonStr }, "Bad JSON in analyze response");
      res.status(502).json({
        ok: false,
        error: "The analyser returned malformed JSON. Try again.",
      });
      return;
    }

    const data = normalizeExtracted(parsedJson);
    res.json({ ok: true, data });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    // Anthropic SDK errors expose `.status`. A 4xx from upstream usually
    // means the file itself was rejected (encrypted/corrupt PDF, image
    // outside supported dimensions, …). Surface that as a user-facing
    // 400 with a clear hint instead of a generic 500.
    const status =
      err && typeof err === "object" && "status" in err
        ? (err as { status?: unknown }).status
        : undefined;
    if (typeof status === "number" && status >= 400 && status < 500) {
      logger.warn(
        { err: msg, upstreamStatus: status },
        "rigplan analyze upstream rejected the file",
      );
      res.status(400).json({
        ok: false,
        error:
          isImage
            ? "The image could not be read. Try a clearer drawing or a different file."
            : "The PDF could not be read. Make sure it isn't password-protected, scanned at very low resolution, or unusually long, then try again.",
      });
      return;
    }
    logger.error({ err: msg }, "rigplan analyze failed");
    res.status(500).json({ ok: false, error: `Analysis failed: ${msg}` });
  }
});

export default router;
