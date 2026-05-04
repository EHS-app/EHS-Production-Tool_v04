import { Router, type IRouter, type RequestHandler, json } from "express";
import Anthropic from "@anthropic-ai/sdk";
import { logger } from "../lib/logger";

const router: IRouter = Router();

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

const recentByUser = new Map<string, number[]>();
const RATE_WINDOW_MS = 60_000;
const RATE_LIMIT = 10;
const SWEEP_INTERVAL_MS = 5 * 60_000;

setInterval(() => {
  const now = Date.now();
  for (const [userId, arr] of recentByUser) {
    const live = arr.filter((t) => now - t < RATE_WINDOW_MS);
    if (live.length === 0) recentByUser.delete(userId);
    else recentByUser.set(userId, live);
  }
}, SWEEP_INTERVAL_MS);

const rateLimit: RequestHandler = (req, res, next) => {
  const userId = (req as unknown as { _userId: string })._userId;
  const now = Date.now();
  const arr = (recentByUser.get(userId) ?? []).filter(
    (t) => now - t < RATE_WINDOW_MS,
  );
  if (arr.length >= RATE_LIMIT) {
    const oldest = arr[0];
    const retryAfter = Math.ceil((RATE_WINDOW_MS - (now - oldest)) / 1000);
    res.setHeader("Retry-After", String(retryAfter));
    res.status(429).json({ ok: false, error: "Rate limit exceeded. Please wait a moment." });
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

const SYSTEM_PROMPT = `You are an expert assistant for a Norwegian event production company. Your job is to extract structured data from free-form site inspection (befaring) notes.

The user will paste their notes from a client visit. These notes may be in Norwegian or English, and may use informal shorthand. You must:

1. Parse the notes carefully and extract structured items into these categories:
   - **equipment**: Stage dimensions, heights, screens, speakers, furniture, barriers, etc.
   - **schedule**: Setup dates/times, show dates, teardown dates, deadlines
   - **technical**: Power specs (amps, voltage, phases), cable runs, rigging points, load limits, venue constraints
   - **general**: Client requests, access info, parking, backstage needs, catering notes, contact info, anything that doesn't fit above

2. For each extracted item, provide:
   - "field": A short descriptive label (in the same language as the input)
   - "value": The extracted value as a string
   - "confidence": "high" | "medium" | "low" — how certain you are about the extraction

3. Be flexible with input formats:
   - "6x4m", "6 x 4 meters", "6m x 4m" all mean width=6m, height=4m
   - "12-06-2026", "12. juni 2026", "June 12 2026" are the same date
   - "1x 400V 63A", "400v/63a", "63 amp 400 volt" are the same power spec
   - "kl 09:00", "09:00", "9am" are the same time

4. Keep the original phrasing/language when labeling fields. If the user writes in Norwegian, label in Norwegian. If English, use English.

5. If a note is ambiguous, still extract it with "low" confidence rather than skipping it.

Return ONLY a JSON object with this exact structure (no markdown fences, no explanation):
{
  "equipment": [{ "field": "...", "value": "...", "confidence": "high|medium|low" }],
  "schedule": [{ "field": "...", "value": "...", "confidence": "high|medium|low" }],
  "technical": [{ "field": "...", "value": "...", "confidence": "high|medium|low" }],
  "general": [{ "field": "...", "value": "...", "confidence": "high|medium|low" }]
}`;

function extractJson(text: string): unknown | null {
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) {
    try {
      return JSON.parse(fenceMatch[1].trim());
    } catch { /* fall through */ }
  }
  const braceStart = text.indexOf("{");
  const braceEnd = text.lastIndexOf("}");
  if (braceStart !== -1 && braceEnd > braceStart) {
    try {
      return JSON.parse(text.slice(braceStart, braceEnd + 1));
    } catch { /* fall through */ }
  }
  return null;
}

type ExtractedItem = {
  field: string;
  value: string;
  confidence: "high" | "medium" | "low";
};

type ExtractionResult = {
  equipment: ExtractedItem[];
  schedule: ExtractedItem[];
  technical: ExtractedItem[];
  general: ExtractedItem[];
};

function normalizeConfidence(c: unknown): "high" | "medium" | "low" {
  if (typeof c === "string") {
    const lower = c.toLowerCase();
    if (lower === "high" || lower === "medium" || lower === "low") return lower;
  }
  return "medium";
}

function normalizeItems(raw: unknown): ExtractedItem[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((item): item is Record<string, unknown> =>
      typeof item === "object" && item !== null && "field" in item && "value" in item,
    )
    .map((item) => ({
      field: String(item.field ?? ""),
      value: String(item.value ?? ""),
      confidence: normalizeConfidence(item.confidence),
    }))
    .filter((item) => item.field.length > 0 || item.value.length > 0);
}

function normalizeResult(raw: unknown): ExtractionResult {
  const obj = (typeof raw === "object" && raw !== null ? raw : {}) as Record<string, unknown>;
  return {
    equipment: normalizeItems(obj.equipment),
    schedule: normalizeItems(obj.schedule),
    technical: normalizeItems(obj.technical),
    general: normalizeItems(obj.general),
  };
}

router.post(
  "/inspection/extract",
  json({ limit: "100kb" }),
  requireSignedIn,
  rateLimit,
  async (req, res) => {
    if (!anthropic) {
      res.status(503).json({ ok: false, error: "AI service not configured." });
      return;
    }

    const { notes } = req.body as { notes?: string };
    if (!notes || typeof notes !== "string" || notes.trim().length === 0) {
      res.status(400).json({ ok: false, error: "Notes text is required." });
      return;
    }

    if (notes.length > 10_000) {
      res.status(400).json({ ok: false, error: "Notes too long (max 10 000 characters)." });
      return;
    }

    try {
      const response = await anthropic.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 4096,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content: notes.trim(),
          },
        ],
      });

      const textBlock = response.content.find((b) => b.type === "text");
      if (!textBlock || textBlock.type !== "text") {
        res.status(500).json({ ok: false, error: "No text in AI response." });
        return;
      }

      const parsed = extractJson(textBlock.text);
      if (!parsed) {
        logger.warn({ responseLength: textBlock.text.length }, "inspection-extract: failed to parse JSON from AI response");
        res.status(500).json({ ok: false, error: "Could not parse AI response." });
        return;
      }

      const result = normalizeResult(parsed);
      res.json({ ok: true, data: result });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error({ err: message }, "inspection-extract: AI call failed");
      res.status(500).json({ ok: false, error: "AI extraction failed. Please try again." });
    }
  },
);

export default router;
