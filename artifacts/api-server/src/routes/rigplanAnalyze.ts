import { Router, type IRouter, type RequestHandler, json } from "express";
import Anthropic from "@anthropic-ai/sdk";
import { logger } from "../lib/logger";

const router: IRouter = Router();

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
  "stages":     [ { "name": string, "widthM": number, "depthM": number, "notes": string } ],
  "trusses":    [ { "name": string, "lengthM": number, "pointCount": number, "trimM": number|null, "notes": string } ],
  "lighting":   [ { "name": string, "qty": number, "weightKg": number|null, "watts": number|null, "trussName": string, "notes": string } ],
  "ledScreens": [ { "name": string, "panelsWide": number|null, "panelsTall": number|null, "widthM": number|null, "heightM": number|null, "notes": string } ],
  "sound":      [ { "name": string, "qty": number, "weightKg": number|null, "watts": number|null, "notes": string } ],
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

Be precise — if the drawing labels something "LX3" with a length of
12 m and 4 motors, the output truss MUST be name="LX3", lengthM=12,
pointCount=4. Do NOT invent items that are not in the drawing.

If the file is NOT a production drawing or you cannot extract anything,
still return the schema with empty arrays and a summary explaining why.
Do not include any text outside the JSON code block.`;

type AnalyzeContext = {
  venue?: { widthM?: number; depthM?: number; ceilingM?: number };
  projectName?: string;
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
  return parts.length ? `Additional context: ${parts.join(" — ")}.` : "";
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

type ExtractedItems = {
  venue: { widthM: number | null; depthM: number | null; ceilingM: number | null };
  stages: Array<{ name: string; widthM: number; depthM: number; notes: string }>;
  trusses: Array<{
    name: string;
    lengthM: number;
    pointCount: number;
    trimM: number | null;
    notes: string;
  }>;
  lighting: Array<{
    name: string;
    qty: number;
    weightKg: number | null;
    watts: number | null;
    /** Truss / system label this fixture is hung on, copied from one of
     *  trusses[].name when the model recognised a hang. Empty when the
     *  drawing didn't show one. */
    trussName: string;
    notes: string;
  }>;
  ledScreens: Array<{
    name: string;
    panelsWide: number | null;
    panelsTall: number | null;
    /** Physical screen size in metres, when the drawing labels metres
     *  rather than panel counts (e.g. "5 x 3 m"). Falls back to null
     *  when only panel counts are visible. */
    widthM: number | null;
    heightM: number | null;
    notes: string;
  }>;
  sound: Array<{
    name: string;
    qty: number;
    weightKg: number | null;
    watts: number | null;
    notes: string;
  }>;
  summary: string;
};

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
      };
    }),
    trusses: arr(r.trusses).map((s) => {
      const o = (s && typeof s === "object" ? s : {}) as Record<string, unknown>;
      const ptRaw = num(o.pointCount);
      const pt = ptRaw == null ? 3 : Math.min(8, Math.max(1, Math.round(ptRaw)));
      return {
        name: str(o.name) || "Truss",
        lengthM: numOrZero(o.lengthM),
        pointCount: pt,
        trimM: num(o.trimM),
        notes: str(o.notes),
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
  };
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

  const ctx =
    body.context && typeof body.context === "object"
      ? (body.context as AnalyzeContext)
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
              text: `${SCHEMA_PROMPT}\n\n${contextLine(ctx)}`.trim(),
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
