/** Drawing analysis — types + client helper.
 *
 *  The Rigg Plan tab lets the user upload a drawing they made in a
 *  WYSIWYG tool. We send it to the api-server, which forwards the image
 *  to Claude Vision and returns a structured list of items the user can
 *  apply to the existing report tabs.
 *
 *  Keep these types in sync with `artifacts/api-server/src/routes/rigplanAnalyze.ts`. */

/** Bounding box of an item on the (first page of the) uploaded drawing,
 *  in normalised image coordinates with the origin at the TOP-LEFT
 *  corner of the file. All four numbers are in [0, 1]; the analyser
 *  guarantees `x + width <= 1` and `y + height <= 1`. The overlay
 *  editor uses these to render a draggable / resizable rectangle on
 *  top of the rendered image. */
export type Bbox = {
  x: number;
  y: number;
  width: number;
  height: number;
};

/** Fields every extracted item carries, regardless of category. The
 *  analyser fills both for AI-extracted items; user-added items in the
 *  overlay editor get `confidence: null` and a freshly-drawn bbox. */
export type ItemMeta = {
  /** Self-assessed certainty in [0, 1]. null when the model omitted
   *  the field (older payloads) or when the user added the item by
   *  hand in the overlay editor. */
  confidence: number | null;
  /** Position of the item on the drawing for the overlay editor.
   *  null when the model could not pin it to one place (e.g. info
   *  read only from a legend) or when the item was created without
   *  positional data. */
  bbox: Bbox | null;
};

export type ExtractedVenue = {
  widthM: number | null;
  depthM: number | null;
  ceilingM: number | null;
};

export type ExtractedStage = {
  name: string;
  widthM: number;
  depthM: number;
  notes: string;
} & ItemMeta;

export type ExtractedTruss = {
  name: string;
  lengthM: number;
  pointCount: number;
  /** Per-motor working-load capacity in kg if labelled on the drawing
   *  ("1t" / "500 kg" / "Lodestar 1t"). The applier maps this onto one
   *  of the two configured hoist models so a system imported from a
   *  drawing comes pre-set with the right motor type. null when the
   *  drawing didn't show it — the applier then falls back to the
   *  default 500 kg motor. */
  hoistKg: number | null;
  trimM: number | null;
  notes: string;
} & ItemMeta;

export type ExtractedLighting = {
  name: string;
  qty: number;
  weightKg: number | null;
  watts: number | null;
  /** Truss / system label this fixture is hung on, mirroring one of
   *  trusses[].name. Empty string when the drawing didn't show a hang.
   *  Used to group fixtures onto the same Rigging system on apply. */
  trussName: string;
  notes: string;
} & ItemMeta;

export type ExtractedLedScreen = {
  name: string;
  panelsWide: number | null;
  panelsTall: number | null;
  /** Physical screen size in metres, when the drawing labels metres
   *  rather than panel counts (e.g. "STØTE LED 5 x 3 m"). The applier
   *  derives panelsWide / panelsTall from these using the active
   *  panel's physical size. */
  widthM: number | null;
  heightM: number | null;
  notes: string;
} & ItemMeta;

export type ExtractedSound = {
  name: string;
  qty: number;
  weightKg: number | null;
  watts: number | null;
  notes: string;
} & ItemMeta;

export type ExtractedItems = {
  venue: ExtractedVenue;
  stages: ExtractedStage[];
  trusses: ExtractedTruss[];
  lighting: ExtractedLighting[];
  ledScreens: ExtractedLedScreen[];
  sound: ExtractedSound[];
  summary: string;
};

export function emptyExtractedItems(): ExtractedItems {
  return {
    venue: { widthM: null, depthM: null, ceilingM: null },
    stages: [],
    trusses: [],
    lighting: [],
    ledScreens: [],
    sound: [],
    summary: "",
  };
}

/** Read a File as a base64 data URL. */
export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error ?? new Error("read failed"));
    reader.onload = () => {
      const v = reader.result;
      if (typeof v === "string") resolve(v);
      else reject(new Error("Could not read file as data URL"));
    };
    reader.readAsDataURL(file);
  });
}

export type AnalyzeContext = {
  venue?: { widthM?: number; depthM?: number; ceilingM?: number };
  projectName?: string;
  /** Venue name used to look up saved corrections from past analyses
   *  of the same place. Sent to the server, which injects a short
   *  hint into the prompt before calling Claude. Optional — leave
   *  unset for one-off analyses. */
  venueName?: string;
};

/** Endpoint URL — uses the artifact's base path so it survives the
 *  workspace path-rewrite proxy. */
function endpointUrl(path: string): string {
  // BASE_URL has a trailing slash, e.g. "/" or "/rigging-load-report/".
  const base = (import.meta as { env?: { BASE_URL?: string } }).env?.BASE_URL ?? "/";
  return `${base}api/${path.replace(/^\//, "")}`;
}

/** Normalise the data URL's media-type prefix so the backend's strict
 *  `application/pdf` check succeeds even when the OS / browser left
 *  `file.type` empty (e.g. some Linux / drag-and-drop scenarios where
 *  the file is identified only by extension). */
function withCorrectedMediaType(dataUrl: string, file: File): string {
  const looksLikePdf = /\.pdf$/i.test(file.name);
  if (looksLikePdf && !/^data:application\/pdf;/i.test(dataUrl)) {
    return dataUrl.replace(/^data:[^;]*;/, "data:application/pdf;");
  }
  return dataUrl;
}

/** Two interpretation modes the analyser can run in. "classic" is
 *  the schema-only prompt that has shipped from day one; "geometry"
 *  prefixes the prompt with the Rigging Geometry Expert rule-set
 *  (truss anchoring, fixture alignment, motor heuristics, etc.).
 *  Output schema is identical in both modes. */
export type AnalyzerMode = "classic" | "geometry";

/** POST the image or PDF to the analyzer and return the parsed extracted
 *  items. Throws an Error with a user-friendly message on failure. */
export async function analyzeDrawing(
  file: File,
  context?: AnalyzeContext,
  signal?: AbortSignal,
  mode: AnalyzerMode = "classic",
): Promise<ExtractedItems> {
  const fileDataUrl = withCorrectedMediaType(await fileToDataUrl(file), file);
  const res = await fetch(endpointUrl("rigplan/analyze"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fileDataUrl, context, mode }),
    signal,
  });

  let payload: unknown;
  try {
    payload = await res.json();
  } catch {
    throw new Error(`Analyser returned ${res.status} (no JSON body).`);
  }

  if (!res.ok || !payload || typeof payload !== "object") {
    const err = (payload as { error?: unknown })?.error;
    throw new Error(typeof err === "string" ? err : `Analyser failed (${res.status}).`);
  }

  const ok = (payload as { ok?: unknown }).ok;
  if (ok !== true) {
    const err = (payload as { error?: unknown }).error;
    throw new Error(typeof err === "string" ? err : "Analyser failed.");
  }

  const data = (payload as { data?: unknown }).data;
  if (!data || typeof data !== "object") {
    throw new Error("Analyser returned no data.");
  }
  return data as ExtractedItems;
}

/** Total number of importable items across all categories. */
export function totalItemCount(e: ExtractedItems): number {
  return (
    e.stages.length +
    e.trusses.length +
    e.lighting.length +
    e.ledScreens.length +
    e.sound.length
  );
}

/** Per-category selection — which items the user chose to import. */
export type ApplySelection = {
  applyVenue: boolean;
  stageIndexes: Set<number>;
  trussIndexes: Set<number>;
  lightingIndexes: Set<number>;
  ledIndexes: Set<number>;
  soundIndexes: Set<number>;
};

export function selectAll(e: ExtractedItems): ApplySelection {
  return {
    applyVenue: !!(e.venue.widthM || e.venue.depthM || e.venue.ceilingM),
    stageIndexes: new Set(e.stages.map((_, i) => i)),
    trussIndexes: new Set(e.trusses.map((_, i) => i)),
    lightingIndexes: new Set(e.lighting.map((_, i) => i)),
    ledIndexes: new Set(e.ledScreens.map((_, i) => i)),
    soundIndexes: new Set(e.sound.map((_, i) => i)),
  };
}

export function selectNone(): ApplySelection {
  return {
    applyVenue: false,
    stageIndexes: new Set(),
    trussIndexes: new Set(),
    lightingIndexes: new Set(),
    ledIndexes: new Set(),
    soundIndexes: new Set(),
  };
}

/** Per-category counts returned by `applyExtractedItems` so the UI can
 *  show the user exactly what landed in the report and what was
 *  skipped because it was already there (e.g. a truss labelled "LX1"
 *  that appears on every PDF the producer uploads — we keep ONE
 *  rigging system for it instead of stacking duplicates). */
export type ApplySummary = {
  systems: { added: number; skipped: number };
  fixtures: { added: number; skipped: number };
  ledScreens: { added: number; skipped: number };
  stages: { added: number; skipped: number };
  sound: { added: number; skipped: number };
  venueApplied: boolean;
};

export function emptyApplySummary(): ApplySummary {
  return {
    systems: { added: 0, skipped: 0 },
    fixtures: { added: 0, skipped: 0 },
    ledScreens: { added: 0, skipped: 0 },
    stages: { added: 0, skipped: 0 },
    sound: { added: 0, skipped: 0 },
    venueApplied: false,
  };
}

/** Total skips across every category — used by the importer to decide
 *  whether to surface the "skipped duplicates" line at all. */
export function totalSkipped(s: ApplySummary): number {
  return (
    s.systems.skipped +
    s.fixtures.skipped +
    s.ledScreens.skipped +
    s.stages.skipped +
    s.sound.skipped
  );
}

/** Total adds — used the same way for the "added items" line. */
export function totalAdded(s: ApplySummary): number {
  return (
    s.systems.added +
    s.fixtures.added +
    s.ledScreens.added +
    s.stages.added +
    s.sound.added
  );
}

// ---------------------------------------------------------------------
// Venue memory (per-venue learning)
// ---------------------------------------------------------------------
//
// We persist the last set of corrected items per (Clerk user, venue)
// pair on the server. On the next analysis of the same venue, the
// server reads the saved blob and injects a short hint into the
// prompt ("this venue usually has trusses LX1, LX2, FOH..."). The
// shape below is intentionally loose — older saves with missing
// fields still load, and the server's hint builder copes with
// unknown fields by skipping them.

export type VenueMemoryData = {
  /** The last `ExtractedItems` blob the user applied for this venue.
   *  Stored verbatim so we can both show it back ("you previously
   *  saved …") and feed it to the prompt builder. */
  lastCorrected?: ExtractedItems;
  /** Bumped every time we save. Useful for cache-busting if we ever
   *  add an in-memory cache of memory blobs. */
  savedAt?: string;
};

export type LoadedVenueMemory = {
  venueName: string;
  data: VenueMemoryData;
  updatedAt: string | null;
};

/** GET the saved memory blob for a venue, or null if none exists. */
export async function loadVenueMemory(
  venueName: string,
  signal?: AbortSignal,
): Promise<LoadedVenueMemory | null> {
  const trimmed = venueName.trim();
  if (!trimmed) return null;
  const url =
    endpointUrl("rigplan/memory") + `?venue=${encodeURIComponent(trimmed)}`;
  let res: Response;
  try {
    res = await fetch(url, { method: "GET", signal });
  } catch {
    return null;
  }
  if (!res.ok) return null;
  let payload: unknown;
  try {
    payload = await res.json();
  } catch {
    return null;
  }
  if (!payload || typeof payload !== "object") return null;
  const ok = (payload as { ok?: unknown }).ok;
  if (ok !== true) return null;
  const data = (payload as { data?: unknown }).data;
  if (!data || typeof data !== "object") return null;
  return {
    venueName:
      typeof (payload as { venueName?: unknown }).venueName === "string"
        ? (payload as { venueName: string }).venueName
        : trimmed,
    data: data as VenueMemoryData,
    updatedAt:
      typeof (payload as { updatedAt?: unknown }).updatedAt === "string"
        ? (payload as { updatedAt: string }).updatedAt
        : null,
  };
}

/** PUT the corrected items as the new memory blob for the venue.
 *  Best-effort — failures resolve to false rather than throw, because
 *  the user's primary action ("Apply to reports") must never depend
 *  on the memory write succeeding. */
export async function saveVenueMemory(
  venueName: string,
  corrected: ExtractedItems,
  signal?: AbortSignal,
): Promise<boolean> {
  const trimmed = venueName.trim();
  if (!trimmed) return false;
  const data: VenueMemoryData = {
    lastCorrected: corrected,
    savedAt: new Date().toISOString(),
  };
  let res: Response;
  try {
    res = await fetch(endpointUrl("rigplan/memory"), {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ venueName: trimmed, data }),
      signal,
    });
  } catch {
    return false;
  }
  if (!res.ok) return false;
  let payload: unknown;
  try {
    payload = await res.json();
  } catch {
    return false;
  }
  if (!payload || typeof payload !== "object") return false;
  return (payload as { ok?: unknown }).ok === true;
}
