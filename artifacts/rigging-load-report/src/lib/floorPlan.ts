/** Floor-plan backdrop helpers.
 *
 *  The user can mark a previously-uploaded drawing as the floor plan,
 *  in which case we render it underneath the truss layout in the Rigg
 *  Plan tab (replacing the synthetic grid). Two pieces of data live in
 *  state:
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
 *  We keep this in its own localStorage key (NOT the main report blob)
 *  because data URLs can be ~5 MB and we want them isolated from the
 *  main quota — if the floor-plan key fails to write we just drop it
 *  silently and the rest of the report still saves. */

import { GlobalWorkerOptions, getDocument } from "pdfjs-dist";
// pdfjs-dist v5 ships its worker as an ESM module. Vite's `?url` query
// emits a file URL pointing at the bundled worker so we can hand it to
// the global worker options. Without this the worker is loaded from a
// CDN by default, which won't work in the proxied preview.
import pdfWorkerSrc from "pdfjs-dist/build/pdf.worker.min.mjs?url";

GlobalWorkerOptions.workerSrc = pdfWorkerSrc;

export type FloorPlan = {
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

const STORAGE_KEY = "ehs-rigging-floor-plan-v1";

/** ~5 MB worth of base64 — anything larger we keep in memory only and
 *  warn the producer that it won't survive a reload. localStorage's
 *  hard cap is implementation-defined but ~5 MB on most browsers. */
const PERSIST_MAX_CHARS = 5_000_000;

export function loadFloorPlan(): FloorPlan | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<FloorPlan>;
    if (
      typeof parsed.fileName !== "string" ||
      typeof parsed.contentType !== "string" ||
      typeof parsed.sizeBytes !== "number" ||
      typeof parsed.originalDataUrl !== "string" ||
      typeof parsed.imageDataUrl !== "string"
    ) {
      return null;
    }
    return parsed as FloorPlan;
  } catch {
    return null;
  }
}

/** Persist if it fits, otherwise clear the slot. Returns true when the
 *  full plan made it into storage. */
export function saveFloorPlan(plan: FloorPlan | null): boolean {
  try {
    if (plan == null) {
      localStorage.removeItem(STORAGE_KEY);
      return true;
    }
    const json = JSON.stringify(plan);
    if (json.length > PERSIST_MAX_CHARS) {
      // Don't even try — JSON.stringify of a 6 MB string isn't the
      // expensive part, but the localStorage.setItem will throw a
      // QuotaExceededError on most browsers and we'd rather fail
      // predictably than half-write the value.
      localStorage.removeItem(STORAGE_KEY);
      return false;
    }
    localStorage.setItem(STORAGE_KEY, json);
    return true;
  } catch {
    // QuotaExceededError, private mode, etc. — silently drop the
    // persisted copy; the in-memory state still works for this session.
    return false;
  }
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

/** Build a FloorPlan record from a user-picked File. */
export async function fileToFloorPlan(file: File): Promise<FloorPlan> {
  const isPdf =
    file.type === "application/pdf" || /\.pdf$/i.test(file.name);
  const originalDataUrl = await readFileAsDataUrl(file);
  const imageDataUrl = isPdf
    ? await pdfFirstPageToPng(file)
    : originalDataUrl;
  return {
    fileName: file.name,
    contentType: file.type || (isPdf ? "application/pdf" : "image/png"),
    sizeBytes: file.size,
    originalDataUrl,
    imageDataUrl,
  };
}
