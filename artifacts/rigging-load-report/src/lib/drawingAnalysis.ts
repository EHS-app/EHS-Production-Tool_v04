/** Drawing analysis — types + client helper.
 *
 *  The Rigg Plan tab lets the user upload a drawing they made in a
 *  WYSIWYG tool. We send it to the api-server, which forwards the image
 *  to Claude Vision and returns a structured list of items the user can
 *  apply to the existing report tabs.
 *
 *  Keep these types in sync with `artifacts/api-server/src/routes/rigplanAnalyze.ts`. */

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
};

export type ExtractedTruss = {
  name: string;
  lengthM: number;
  pointCount: number;
  trimM: number | null;
  notes: string;
};

export type ExtractedLighting = {
  name: string;
  qty: number;
  weightKg: number | null;
  watts: number | null;
  notes: string;
};

export type ExtractedLedScreen = {
  name: string;
  panelsWide: number | null;
  panelsTall: number | null;
  notes: string;
};

export type ExtractedSound = {
  name: string;
  qty: number;
  weightKg: number | null;
  watts: number | null;
  notes: string;
};

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
};

/** Endpoint URL — uses the artifact's base path so it survives the
 *  workspace path-rewrite proxy. */
function endpointUrl(): string {
  // BASE_URL has a trailing slash, e.g. "/" or "/rigging-load-report/".
  const base = (import.meta as { env?: { BASE_URL?: string } }).env?.BASE_URL ?? "/";
  return `${base}api/rigplan/analyze`;
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

/** POST the image or PDF to the analyzer and return the parsed extracted
 *  items. Throws an Error with a user-friendly message on failure. */
export async function analyzeDrawing(
  file: File,
  context?: AnalyzeContext,
  signal?: AbortSignal,
): Promise<ExtractedItems> {
  const fileDataUrl = withCorrectedMediaType(await fileToDataUrl(file), file);
  const res = await fetch(endpointUrl(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fileDataUrl, context }),
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
