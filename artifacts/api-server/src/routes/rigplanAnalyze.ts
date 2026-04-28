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
diagram or similar) and extract a structured list of physical items.

Return ONLY a single JSON code block (\`\`\`json ... \`\`\`) matching this
TypeScript-style schema. Omit no required keys; use empty arrays when
nothing of that kind is shown.

{
  "venue":      { "widthM": number|null, "depthM": number|null, "ceilingM": number|null },
  "stages":     [ { "name": string, "widthM": number, "depthM": number, "notes": string } ],
  "trusses":    [ { "name": string, "lengthM": number, "pointCount": number, "trimM": number|null, "notes": string } ],
  "lighting":   [ { "name": string, "qty": number, "weightKg": number|null, "watts": number|null, "notes": string } ],
  "ledScreens": [ { "name": string, "panelsWide": number|null, "panelsTall": number|null, "notes": string } ],
  "sound":      [ { "name": string, "qty": number, "weightKg": number|null, "watts": number|null, "notes": string } ],
  "summary":    string
}

Conventions:
- All distances are in metres. Convert feet/inches if you see them.
- "trusses" should describe overhead rigging bars / motors / hangs you can
  see in the drawing. \`pointCount\` is the number of motors / pickup
  points on that truss; clamp to between 1 and 8. If unsure, use 3.
- "lighting" is the count of fixtures by type (e.g. "Robe MegaPointe x12").
  Read fixture labels and tally by type. Set qty to the visible count.
- "ledScreens" is full LED walls — try to identify panel grid (W x H) from
  the drawing if visible, otherwise set both to null.
- "sound" is PA / monitor / sub items.
- "stages" is built decking / risers (not the whole venue).
- "summary" is one short sentence describing what the drawing depicts.

If the image is NOT a production drawing or you cannot extract anything,
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
    notes: string;
  }>;
  ledScreens: Array<{
    name: string;
    panelsWide: number | null;
    panelsTall: number | null;
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
    lighting: arr(r.lighting).map((s) => {
      const o = (s && typeof s === "object" ? s : {}) as Record<string, unknown>;
      const qRaw = num(o.qty);
      const qty = qRaw == null ? 1 : Math.max(1, Math.round(qRaw));
      return {
        name: str(o.name) || "Fixture",
        qty,
        weightKg: num(o.weightKg),
        watts: num(o.watts),
        notes: str(o.notes),
      };
    }),
    ledScreens: arr(r.ledScreens).map((s) => {
      const o = (s && typeof s === "object" ? s : {}) as Record<string, unknown>;
      return {
        name: str(o.name) || "Screen",
        panelsWide: num(o.panelsWide),
        panelsTall: num(o.panelsTall),
        notes: str(o.notes),
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
