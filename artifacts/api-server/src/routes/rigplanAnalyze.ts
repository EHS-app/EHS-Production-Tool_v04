import { Router, type IRouter, type RequestHandler, json } from "express";
import Anthropic from "@anthropic-ai/sdk";
import { and, eq } from "drizzle-orm";
import { db, venueMemoryTable } from "@workspace/db";
import { logger } from "../lib/logger";

const router: IRouter = Router();

/** Normalise a venue name to a stable lookup key. The same producer
 *  uploading "Sentrum  Scene", "Sentrum Scene" and "sentrum scene"
 *  should hit the same memory entry — otherwise the learning loop
 *  starts from scratch every time they retype the venue field. */
export function venueKeyFor(venueName: string): string {
  return venueName.trim().toLowerCase().replace(/\s+/g, " ");
}

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

/** Prompt selector. The geometry prompt simply prefixes the rules
 *  in front of the canonical schema spec, so the parser, normaliser,
 *  overlay editor and venue-memory loop all keep working unchanged. */
function buildAnalyzePrompt(mode: AnalyzeMode): string {
  return mode === "geometry"
    ? `${GEOMETRY_RULES_PROMPT}\n\n${SCHEMA_PROMPT}`
    : SCHEMA_PROMPT;
}

/** Two analyser interpretation modes the client can pick between.
 *  - "classic"  → schema-only prompt, the original behaviour.
 *  - "geometry" → schema + Rigging Geometry Expert rules. */
type AnalyzeMode = "classic" | "geometry";

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

/** Build the venue-memory hint string from the saved JSON blob. We
 *  format it as a few terse bullet lines so the model can scan it
 *  quickly. The blob is intentionally typed loosely — extra fields
 *  the client adds in future versions are tolerated. */
type SavedMemoryShape = {
  lastCorrected?: {
    trusses?: Array<{ name?: unknown; lengthM?: unknown; pointCount?: unknown }>;
    lighting?: Array<{ name?: unknown; qty?: unknown; trussName?: unknown }>;
    ledScreens?: Array<{
      name?: unknown;
      widthM?: unknown;
      heightM?: unknown;
      panelsWide?: unknown;
      panelsTall?: unknown;
    }>;
    stages?: Array<{ name?: unknown; widthM?: unknown; depthM?: unknown }>;
    sound?: Array<{ name?: unknown; qty?: unknown }>;
  };
};

function buildVenueMemoryHint(raw: unknown): string {
  if (!raw || typeof raw !== "object") return "";
  const memory = raw as SavedMemoryShape;
  const last = memory.lastCorrected;
  if (!last) return "";
  const lines: string[] = [];
  const trusses = (last.trusses ?? []).filter(Boolean).slice(0, 8);
  if (trusses.length) {
    const items = trusses
      .map((t) => {
        const name = typeof t.name === "string" ? t.name : "Truss";
        const len = typeof t.lengthM === "number" ? `${t.lengthM} m` : null;
        const pts =
          typeof t.pointCount === "number" ? `${t.pointCount} pts` : null;
        const tail = [len, pts].filter(Boolean).join(", ");
        return tail ? `${name} (${tail})` : name;
      })
      .join("; ");
    lines.push(`- Trusses usually present: ${items}.`);
  }
  const lighting = (last.lighting ?? []).filter(Boolean).slice(0, 10);
  if (lighting.length) {
    const items = lighting
      .map((f) => {
        const name = typeof f.name === "string" ? f.name : "Fixture";
        const qty = typeof f.qty === "number" ? `${f.qty}× ` : "";
        const truss =
          typeof f.trussName === "string" && f.trussName
            ? ` on ${f.trussName}`
            : "";
        return `${qty}${name}${truss}`;
      })
      .join("; ");
    lines.push(`- Lighting often used: ${items}.`);
  }
  const led = (last.ledScreens ?? []).filter(Boolean).slice(0, 4);
  if (led.length) {
    const items = led
      .map((s) => {
        const name = typeof s.name === "string" ? s.name : "LED";
        if (typeof s.widthM === "number" && typeof s.heightM === "number") {
          return `${name} (${s.widthM} × ${s.heightM} m)`;
        }
        if (
          typeof s.panelsWide === "number" &&
          typeof s.panelsTall === "number"
        ) {
          return `${name} (${s.panelsWide} × ${s.panelsTall} panels)`;
        }
        return name;
      })
      .join("; ");
    lines.push(`- LED screens typically: ${items}.`);
  }
  const stages = (last.stages ?? []).filter(Boolean).slice(0, 4);
  if (stages.length) {
    const items = stages
      .map((s) => {
        const name = typeof s.name === "string" ? s.name : "Stage";
        if (typeof s.widthM === "number" && typeof s.depthM === "number") {
          return `${name} (${s.widthM} × ${s.depthM} m)`;
        }
        return name;
      })
      .join("; ");
    lines.push(`- Stages / decks typically: ${items}.`);
  }
  const sound = (last.sound ?? []).filter(Boolean).slice(0, 6);
  if (sound.length) {
    const items = sound
      .map((s) => {
        const name = typeof s.name === "string" ? s.name : "Sound";
        const qty = typeof s.qty === "number" ? `${s.qty}× ` : "";
        return `${qty}${name}`;
      })
      .join("; ");
    lines.push(`- Sound often: ${items}.`);
  }
  return lines.join("\n");
}

/** Pull the first ```json ... ``` block from the model's text output. */
function extractJsonBlock(text: string): string | null {
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) return fence[1].trim();
  // Fallback: find the first {...} balanced span.
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start >= 0 && end > start) return text.slice(start, end + 1);
  return null;
}

/** Bounding box of an item on the (first page of the) drawing, in
 *  normalised image coordinates with origin at top-left. All four
 *  numbers are clamped to [0, 1] by `normaliseBbox` before being
 *  returned to the client, so the overlay editor can blindly trust
 *  them. */
type Bbox = { x: number; y: number; width: number; height: number };

/** Fields every item carries: a self-assessed confidence in [0, 1]
 *  (null when the model omitted it) and an optional bbox for the
 *  overlay editor. Adding these as a shared base keeps the per-type
 *  rows below readable. */
type ItemMeta = { confidence: number | null; bbox: Bbox | null };

type ExtractedItems = {
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

/** Coerce a model-returned `bbox` blob into our strict shape. We
 *  silently clamp out-of-range numbers and return null whenever the
 *  result wouldn't represent a usable rectangle, so the overlay
 *  editor never has to defensively re-validate. */
function normaliseBbox(v: unknown): Bbox | null {
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

/** Coerce a model-returned `confidence` number into [0, 1] or null. */
function normaliseConfidence(v: unknown): number | null {
  if (typeof v !== "number" || !Number.isFinite(v)) return null;
  if (v < 0) return 0;
  if (v > 1) return 1;
  return v;
}

/** Build a stable lookup key for a (fixture-name, truss) pair. We
 *  normalise whitespace, casing and a few trivial separators so that
 *  "MAC Aura XB" / "Mac Aura  XB" / "MAC AURA XB" collapse to one row.
 *  Truss names are normalised the same way as on the client (see
 *  applyExtractedItems' trussKey helper) so server-side dedup matches
 *  the client-side fixture-to-system wiring. */
function lightingMergeKey(name: string, trussName: string): string {
  const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");
  const trussKey = trussName.trim().toLowerCase().replace(/[\s_-]+/g, "");
  return `${norm(name)}\u0000${trussKey}`;
}

type LightingRow = {
  name: string;
  qty: number;
  weightKg: number | null;
  watts: number | null;
  trussName: string;
  notes: string;
  confidence: number | null;
  bbox: Bbox | null;
};

/** Collapse duplicate (fixture-name, truss) rows produced by the model.
 *  Quantities sum; the first non-null weight / watts wins (Claude is
 *  consistent within a single response, so we don't need to average);
 *  notes from later rows are concatenated when they add new info. */
function mergeLightingRows(rows: LightingRow[]): LightingRow[] {
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

/** Pull a "<w>m × <h>m" pair out of a notes string. We only match
 *  numbers that are explicitly suffixed with "m" (so pixel counts
 *  like "768 x 1152 pixel" and panel counts like "16 x 9 panels" are
 *  excluded). Returns nulls when no usable pair is found, leaving
 *  the caller free to fall back to whatever the model already gave. */
function parseMetresFromNotes(
  notes: string,
): { widthM: number | null; heightM: number | null } {
  if (!notes) return { widthM: null, heightM: null };
  // European / Norwegian drawings often use comma as the decimal mark
  // (e.g. "7,5m x 4,5m"). Normalise commas-between-digits to dots
  // before matching so we accept either form.
  const text = notes.replace(/(\d),(\d)/g, "$1.$2");
  const parsePair = (match: RegExpMatchArray | null) => {
    if (!match) return null;
    const w = Number(match[1]);
    const h = Number(match[2]);
    if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) {
      return null;
    }
    return { widthM: w, heightM: h };
  };
  // Both numbers labelled (e.g. "7.5m x 4.5m"): preferred form.
  const both = parsePair(
    text.match(/(\d+(?:\.\d+)?)\s*m\s*[x×]\s*(\d+(?:\.\d+)?)\s*m/i),
  );
  if (both) return both;
  // Single trailing label (e.g. "5 x 3 m" or "5x3m"). Less common, still valid.
  const trailing = parsePair(
    text.match(/(\d+(?:\.\d+)?)\s*[x×]\s*(\d+(?:\.\d+)?)\s*m\b/i),
  );
  if (trailing) return trailing;
  return { widthM: null, heightM: null };
}

/** Coerce raw JSON from the model into our strict schema. The model
 *  occasionally omits a field or returns the wrong type — we fix up
 *  rather than throw, so the user always sees something. */
function normalizeExtracted(raw: unknown): ExtractedItems {
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
  const mode: AnalyzeMode = body.mode === "geometry" ? "geometry" : "classic";
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
