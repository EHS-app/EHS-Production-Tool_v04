/** Object storage routes for the EHS Production Tool.
 *
 *  We use Replit App Storage (GCS-backed) to host file attachments that
 *  the producer hands to crew members through the freelance portal.
 *  The flow is:
 *
 *    1. Producer (signed-in)  → POST /api/storage/uploads/request-url
 *                              ← { uploadURL, objectPath }
 *    2. Producer (browser)    → PUT  <uploadURL> with the file bytes
 *                                    (direct to GCS, presigned)
 *    3. Producer encodes      → ProjectBrief.attachments[i].objectPath
 *                                    in the share link
 *    4. Crew (anonymous)      → GET  /api/storage/objects/<path>
 *                              ← file streamed from GCS
 *
 *  The download path is intentionally PUBLIC: the brief share link is
 *  the access token, and the long random object id keeps URLs from
 *  being guessable. This matches how shareable links work elsewhere in
 *  the product (the brief itself is also a public-by-token URL). */

import { Router, type IRouter, type Request, type Response, type RequestHandler, json } from "express";
import { Readable } from "stream";
import { ObjectStorageService, ObjectNotFoundError } from "../lib/objectStorage";

const router: IRouter = Router();
const objectStorageService = new ObjectStorageService();

/** Reuse the same Clerk-required guard as the analyser route. We only
 *  hand out presigned upload URLs to signed-in producers — otherwise
 *  this endpoint would be a free GCS upload relay. */
const requireSignedIn: RequestHandler = (req, res, next) => {
  const auth =
    typeof (req as unknown as { auth?: unknown }).auth === "function"
      ? ((req as unknown as { auth: () => { userId?: string | null } }).auth())
      : ((req as unknown as { auth?: { userId?: string | null } }).auth ?? {});
  if (!auth || !auth.userId) {
    res.status(401).json({ ok: false, error: "Sign in required." });
    return;
  }
  next();
};

type UploadRequestBody = {
  name?: unknown;
  size?: unknown;
  contentType?: unknown;
};

const ALLOWED_CONTENT_TYPES = new Set<string>([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "image/gif",
]);
/** Max size we'll mint a presigned URL for. Mirrors the analyser caps
 *  so a producer can hand the same file to both the analyser and the
 *  brief without surprises. */
const MAX_UPLOAD_BYTES = 12_000_000;

/** Minimal hand-rolled validator — we don't pull in zod here so the
 *  api-server can keep its dependency surface small. The shape is
 *  fixed: { name: string, size: number, contentType: string }. */
function validateUploadBody(
  body: unknown,
):
  | { ok: true; name: string; size: number; contentType: string }
  | { ok: false; error: string } {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "Body must be a JSON object." };
  }
  const b = body as UploadRequestBody;
  const name = typeof b.name === "string" ? b.name.trim() : "";
  const size = typeof b.size === "number" && Number.isFinite(b.size) ? b.size : NaN;
  const contentType = typeof b.contentType === "string" ? b.contentType.trim().toLowerCase() : "";
  if (!name) return { ok: false, error: "name is required" };
  if (name.length > 200) return { ok: false, error: "name is too long" };
  if (!Number.isFinite(size) || size <= 0) {
    return { ok: false, error: "size must be a positive number" };
  }
  if (size > MAX_UPLOAD_BYTES) {
    return {
      ok: false,
      error: `File too large; max is ${(MAX_UPLOAD_BYTES / 1_000_000).toFixed(0)} MB.`,
    };
  }
  if (!ALLOWED_CONTENT_TYPES.has(contentType)) {
    return {
      ok: false,
      error: `Unsupported content type: ${contentType || "(empty)"}.`,
    };
  }
  return { ok: true, name, size, contentType };
}

/**
 * POST /api/storage/uploads/request-url
 *
 * Mint a presigned URL the producer's browser uses to upload the file
 * directly to GCS. The endpoint is Clerk-protected; the body is parsed
 * with a 1 MB limit (only metadata travels through this route, not the
 * file itself).
 */
router.post(
  "/storage/uploads/request-url",
  requireSignedIn,
  json({ limit: "256kb" }),
  async (req: Request, res: Response) => {
    const v = validateUploadBody(req.body);
    if (!v.ok) {
      res.status(400).json({ ok: false, error: v.error });
      return;
    }
    try {
      const uploadURL = await objectStorageService.getObjectEntityUploadURL();
      const objectPath = objectStorageService.normalizeObjectEntityPath(uploadURL);
      res.json({
        ok: true,
        uploadURL,
        objectPath,
        metadata: { name: v.name, size: v.size, contentType: v.contentType },
      });
    } catch (error) {
      req.log.error({ err: error }, "Error generating upload URL");
      res.status(500).json({ ok: false, error: "Failed to generate upload URL" });
    }
  },
);

/**
 * GET /api/storage/objects/*
 *
 * Stream a private object back to the caller. Public-by-token: the
 * caller must already know the long random object id (e.g. from a
 * shared brief). No auth check is performed here — the object id is
 * the access token, the same way the brief share link is.
 */
/** Canonical object path the upload-URL endpoint hands back, of the
 *  shape `uploads/<uuid>` (no leading slash; that's added by the GET
 *  handler). Anything else — `..`, multi-segment traversal, paths
 *  outside `/uploads/` — is rejected as 404 so this route can't be
 *  used to probe the bucket. */
const CANONICAL_ENTITY_PATH = /^uploads\/[A-Za-z0-9_-]{8,128}$/;

router.get("/storage/objects/*path", async (req: Request, res: Response) => {
  try {
    const raw = (req.params as Record<string, unknown>).path;
    const wildcardPath = Array.isArray(raw)
      ? raw.join("/")
      : typeof raw === "string"
        ? raw
        : "";
    if (!CANONICAL_ENTITY_PATH.test(wildcardPath)) {
      res.status(404).json({ ok: false, error: "Object not found" });
      return;
    }
    const objectPath = `/objects/${wildcardPath}`;
    const objectFile = await objectStorageService.getObjectEntityFile(objectPath);

    const response = await objectStorageService.downloadObject(objectFile, 3600);

    res.status(response.status);
    // Forward upstream headers, but apply our own hardening (below) so
    // a producer can't sneak `Content-Type: text/html` past us and turn
    // this route into an XSS vector against the brief origin.
    response.headers.forEach((value, key) => {
      // Drop headers we'll set ourselves, plus framing-y ones we don't
      // want leaking from upstream.
      const k = key.toLowerCase();
      if (
        k === "content-type" ||
        k === "content-disposition" ||
        k === "x-content-type-options"
      ) {
        return;
      }
      res.setHeader(key, value);
    });

    // Lock the download Content-Type to our allow-list: anything else
    // is forced to `application/octet-stream` so the browser saves it
    // as a generic download instead of executing it inline.
    const upstreamType = (response.headers.get("content-type") || "")
      .split(";")[0]
      .trim()
      .toLowerCase();
    const safeType = ALLOWED_CONTENT_TYPES.has(upstreamType)
      ? upstreamType
      : "application/octet-stream";
    res.setHeader("Content-Type", safeType);
    // `attachment` (without filename) makes the browser save the file
    // rather than rendering it inline — mitigates XSS / phishing via
    // attacker-controlled HTML/SVG. `nosniff` blocks MIME-sniffing so
    // a "PDF" can't be re-typed as HTML by the browser heuristics.
    res.setHeader("Content-Disposition", "attachment");
    res.setHeader("X-Content-Type-Options", "nosniff");

    if (response.body) {
      const nodeStream = Readable.fromWeb(
        response.body as unknown as import("stream/web").ReadableStream<Uint8Array>,
      );
      nodeStream.pipe(res);
    } else {
      res.end();
    }
  } catch (error) {
    if (error instanceof ObjectNotFoundError) {
      req.log.warn({ err: error }, "Object not found");
      res.status(404).json({ ok: false, error: "Object not found" });
      return;
    }
    req.log.error({ err: error }, "Error serving object");
    res.status(500).json({ ok: false, error: "Failed to serve object" });
  }
});

export default router;
