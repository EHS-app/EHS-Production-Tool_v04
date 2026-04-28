/** Floor-plan backdrop helpers.
 *
 *  The user can upload one or more drawings and pick which one is
 *  shown as the Rigg Plan backdrop. Each drawing is a `FloorPlan`,
 *  and the collection (plus which one is currently active) is a
 *  `FloorPlanLibrary`. Two pieces of data live on every plan:
 *
 *  - `originalDataUrl`  the original file bytes as a data URL. We hang
 *                        on to this so the producer can also attach the
 *                        same drawing to the freelance portal brief
 *                        (uploading it directly to object storage from
 *                        the browser).
 *  - `imageDataUrl`     a renderable PNG/JPEG/WebP. For image uploads
 *                        this is the same string as `originalDataUrl`;
 *                        for PDFs this is page 1 rasterised to PNG so
 *                        we can use it inside an SVG `<image>` element
 *                        (browsers cannot embed PDFs in SVG).
 *
 *  We keep this library in its own localStorage key (NOT the main
 *  report blob) because data URLs can be a few MB each and we want
 *  them isolated from the main quota — if the floor-plan key fails to
 *  write we just drop what doesn't fit and the rest of the report
 *  still saves. */

import { GlobalWorkerOptions, getDocument } from "pdfjs-dist";
// pdfjs-dist v5 ships its worker as an ESM module. Vite's `?url` query
// emits a file URL pointing at the bundled worker so we can hand it to
// the global worker options. Without this the worker is loaded from a
// CDN by default, which won't work in the proxied preview.
import pdfWorkerSrc from "pdfjs-dist/build/pdf.worker.min.mjs?url";

GlobalWorkerOptions.workerSrc = pdfWorkerSrc;

export type FloorPlan = {
  /** Stable id assigned at upload-time. Used for the active-plan
   *  pointer and the "delete" UI on the Rigg Plan tab. */
  id: string;
  /** File name shown in the UI; not security-sensitive. */
  fileName: string;
  /** MIME type of the original file ("application/pdf", "image/png", …). */
  contentType: string;
  /** Original file size in bytes. */
  sizeBytes: number;
  /** Original file as data URL — used for upload to object storage when
   *  the producer shares a brief. */
  originalDataUrl: string;
  /** Renderable image data URL used as the SVG backdrop. Same as
   *  `originalDataUrl` for images; rasterised page 1 for PDFs. */
  imageDataUrl: string;
};

export type FloorPlanLibrary = {
  plans: FloorPlan[];
  /** Id of the plan currently rendered behind the Rigg Plan canvas.
   *  `null` means "no plan shown" even when `plans` is non-empty (the
   *  producer can hide the backdrop without deleting it). */
  activeId: string | null;
};

/** Empty library used for first-load and reset. */
export function emptyFloorPlanLibrary(): FloorPlanLibrary {
  return { plans: [], activeId: null };
}

const STORAGE_KEY = "ehs-rigging-floor-plan-library-v1";
/** Legacy single-plan key (pre-multi-plan). Migrated on load. */
const LEGACY_SINGLE_KEY = "ehs-rigging-floor-plan-v1";

/** Total localStorage budget for the whole library. Larger than the
 *  old single-plan cap because users now stack multiple drawings. The
 *  saver drops oldest non-active plans until the remaining set fits. */
const PERSIST_MAX_CHARS = 8_000_000;

function makePlanId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `fp-${crypto.randomUUID()}`;
  }
  return `fp-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Type-guard a parsed JSON blob into a FloorPlan record. */
function isFloorPlan(p: unknown): p is FloorPlan {
  if (!p || typeof p !== "object") return false;
  const r = p as Record<string, unknown>;
  return (
    typeof r.id === "string" &&
    typeof r.fileName === "string" &&
    typeof r.contentType === "string" &&
    typeof r.sizeBytes === "number" &&
    typeof r.originalDataUrl === "string" &&
    typeof r.imageDataUrl === "string"
  );
}

/** Best-effort migration of the legacy single-plan key into the new
 *  library shape. Drops the legacy key once migrated. Used internally
 *  by `loadFloorPlanLibrary`. */
function migrateLegacySinglePlan(): FloorPlanLibrary | null {
  try {
    const raw = localStorage.getItem(LEGACY_SINGLE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<FloorPlan>;
    if (
      typeof parsed.fileName !== "string" ||
      typeof parsed.contentType !== "string" ||
      typeof parsed.sizeBytes !== "number" ||
      typeof parsed.originalDataUrl !== "string" ||
      typeof parsed.imageDataUrl !== "string"
    ) {
      // Bad shape — drop it so we don't keep paying the parse cost.
      localStorage.removeItem(LEGACY_SINGLE_KEY);
      return null;
    }
    const migrated: FloorPlan = {
      id: makePlanId(),
      fileName: parsed.fileName,
      contentType: parsed.contentType,
      sizeBytes: parsed.sizeBytes,
      originalDataUrl: parsed.originalDataUrl,
      imageDataUrl: parsed.imageDataUrl,
    };
    localStorage.removeItem(LEGACY_SINGLE_KEY);
    return { plans: [migrated], activeId: migrated.id };
  } catch {
    return null;
  }
}

export function loadFloorPlanLibrary(): FloorPlanLibrary {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return migrateLegacySinglePlan() ?? emptyFloorPlanLibrary();
    }
    const parsed = JSON.parse(raw) as Partial<FloorPlanLibrary>;
    if (!parsed || !Array.isArray(parsed.plans)) {
      return emptyFloorPlanLibrary();
    }
    const plans = parsed.plans.filter(isFloorPlan);
    const activeId =
      typeof parsed.activeId === "string" &&
      plans.some((p) => p.id === parsed.activeId)
        ? parsed.activeId
        : (plans[0]?.id ?? null);
    return { plans, activeId };
  } catch {
    return emptyFloorPlanLibrary();
  }
}

/** Persist the library, dropping the OLDEST non-active plans first if
 *  the serialised blob would exceed the storage budget. The active
 *  plan is preserved as long as it fits on its own. Returns true when
 *  every plan in the input made it to disk. */
export function saveFloorPlanLibrary(lib: FloorPlanLibrary): boolean {
  try {
    if (lib.plans.length === 0) {
      localStorage.removeItem(STORAGE_KEY);
      return true;
    }
    let plans = lib.plans;
    let json = JSON.stringify({ plans, activeId: lib.activeId });
    let droppedAny = false;
    while (json.length > PERSIST_MAX_CHARS && plans.length > 0) {
      // Drop the oldest non-active plan first; if everything left is
      // the active plan, drop the next one in front of it.
      const dropIdx = plans.findIndex((p) => p.id !== lib.activeId);
      const idx = dropIdx >= 0 ? dropIdx : 0;
      plans = [...plans.slice(0, idx), ...plans.slice(idx + 1)];
      droppedAny = true;
      json = JSON.stringify({ plans, activeId: lib.activeId });
    }
    if (json.length > PERSIST_MAX_CHARS) {
      // Even one plan is too big for storage. Wipe so we don't keep a
      // stale half-state on disk; the in-memory copy still works.
      localStorage.removeItem(STORAGE_KEY);
      return false;
    }
    localStorage.setItem(STORAGE_KEY, json);
    return !droppedAny;
  } catch {
    // QuotaExceededError, private mode, etc. — silently drop the
    // persisted copy; the in-memory state still works for this session.
    return false;
  }
}

/** Convenience for non-React callers (e.g. ShareBriefModal) that just
 *  want the currently-shown floor plan, if any. */
export function loadActiveFloorPlan(): FloorPlan | null {
  const lib = loadFloorPlanLibrary();
  if (!lib.activeId) return null;
  return lib.plans.find((p) => p.id === lib.activeId) ?? null;
}

/** Read a File as a data URL. */
export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== "string") {
        reject(new Error("Failed to read file as data URL"));
        return;
      }
      resolve(result);
    };
    reader.onerror = () => reject(reader.error ?? new Error("Read failed"));
    reader.readAsDataURL(file);
  });
}

/** Rasterise the first page of a PDF to a PNG data URL.
 *
 *  We aim for a width of ~1600 px (capped) so the image is crisp enough
 *  to use as a CAD backdrop without being unreasonably large. */
export async function pdfFirstPageToPng(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  const doc = await getDocument({ data: new Uint8Array(buf) }).promise;
  try {
    const page = await doc.getPage(1);
    // PDF default viewport is in PostScript points (72/inch). We want a
    // scale that maps the longer side of the page to ~1600 px while
    // never going below 1.5x (so tiny drawings still get crisp).
    const baseViewport = page.getViewport({ scale: 1 });
    const targetMaxPx = 1600;
    const longest = Math.max(baseViewport.width, baseViewport.height);
    const scale = Math.max(1.5, Math.min(3, targetMaxPx / Math.max(1, longest)));
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement("canvas");
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Could not create 2D canvas context");
    // White background — many CAD PDFs have transparent pages and look
    // dark/illegible against the SVG backdrop without this.
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvas, canvasContext: ctx, viewport }).promise;
    return canvas.toDataURL("image/png");
  } finally {
    await doc.destroy();
  }
}

/** Build a FloorPlan record from a user-picked File. Each call mints a
 *  fresh `id` so the library can hold multiple uploads of the same
 *  file name without collision. */
export async function fileToFloorPlan(file: File): Promise<FloorPlan> {
  const isPdf =
    file.type === "application/pdf" || /\.pdf$/i.test(file.name);
  const originalDataUrl = await readFileAsDataUrl(file);
  const imageDataUrl = isPdf
    ? await pdfFirstPageToPng(file)
    : originalDataUrl;
  return {
    id: makePlanId(),
    fileName: file.name,
    contentType: file.type || (isPdf ? "application/pdf" : "image/png"),
    sizeBytes: file.size,
    originalDataUrl,
    imageDataUrl,
  };
}
