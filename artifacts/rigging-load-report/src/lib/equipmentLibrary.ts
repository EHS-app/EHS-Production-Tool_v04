/**
 * EHS Equipment Library
 * ---------------------
 * Loads the slim equipment dump (deduped from the full Easyjob export) shipped
 * as a static asset under `/equipment-library.json`. Provides a helper to map
 * each library item to one (or more) of the app's tab keys so the picker can
 * be filtered per-tab.
 *
 * The on-disk shape is intentionally narrow — only the fields the planner
 * tabs actually consume — so the JSON stays small (~340 KB) and the runtime
 * cost of a search is trivial.
 */

export type LibraryItem = {
  /** Easyjob item number — globally unique. */
  id: string;
  /** Human display name, e.g. "Martin MAC Aura PXL". */
  name: string;
  /** Top-level Easyjob category, upper-case (e.g. "SOUND", "LIGHTS"). */
  category: string;
  /** Easyjob sub-category, e.g. "MOVINGLIGHTS", "PA", "TRUSS". */
  subCategory: string;
  /** Mass per unit in kilograms (0 if unknown). */
  weight: number;
  /** Real (continuous) power per unit in watts. */
  watts: number;
  /** Apparent power per unit in VA (0 if unknown). */
  va: number;
  /** Width in metres (0 if unknown). */
  width: number;
  /** Height in metres (0 if unknown). */
  height: number;
  /** Depth in metres (0 if unknown). */
  depth: number;
  /** Total number of units owned across the company. */
  stock: number;
  /** Optional Norwegian/English description used as a hint. */
  notes?: string;
};

/** App tabs that the library can target. */
export type LibraryTab =
  | "rigging"
  | "lighting"
  | "led"
  | "stage"
  | "sound"
  | "power"
  | "other";

/**
 * Map an item to the tab(s) where it makes sense. An item can appear in
 * multiple tabs (e.g. a moving light is in both "lighting" and "power"
 * because it's also valid as a Power Plan load).
 */
export function tabsFor(item: LibraryItem): LibraryTab[] {
  const c = item.category.toUpperCase();
  const s = item.subCategory.toUpperCase();
  const tabs = new Set<LibraryTab>();

  if (c === "SOUND") tabs.add("sound");
  if (c === "DJ" || c.startsWith("DJ ")) tabs.add("sound");

  if (c === "LIGHTS") {
    tabs.add("lighting");
    if (item.watts > 0) tabs.add("power");
  }

  if (c === "AV") {
    if (s.includes("MONITOR") || s.includes("LED") || s.includes("PROJECT")) {
      tabs.add("led");
    }
    if (s.includes("MEDIA")) tabs.add("led");
  }

  if (c === "STAGE AND RIGGING") {
    if (s.includes("DECK") || s.includes("STAIR") || s.includes("RAMP")) {
      tabs.add("stage");
    } else {
      tabs.add("rigging");
    }
  }

  if (c === "POWER DISTRIBUTION") {
    tabs.add("power");
  }

  if (item.watts > 0 && !tabs.has("power")) tabs.add("power");

  if (tabs.size === 0) tabs.add("other");
  return [...tabs];
}

const TAB_LABELS: Record<LibraryTab, string> = {
  rigging: "Rigging",
  lighting: "Lighting",
  led: "LED Screen",
  stage: "Stage",
  sound: "Sound",
  power: "Power Plan",
  other: "Other",
};

export function tabLabel(t: LibraryTab): string {
  return TAB_LABELS[t];
}

/**
 * Lightweight in-memory cache so repeated picker opens don't refetch.
 */
let cache: Promise<LibraryItem[]> | null = null;

/**
 * Load the equipment library from the static asset. Resolves to an empty
 * array (and logs to the console) if the request fails — picker callers
 * should treat the library as a best-effort enhancement, not a hard
 * dependency.
 */
export function loadEquipmentLibrary(): Promise<LibraryItem[]> {
  if (cache) return cache;
  const base =
    typeof import.meta !== "undefined" && import.meta.env?.BASE_URL
      ? import.meta.env.BASE_URL
      : "/";
  const url = `${base}equipment-library.json`.replace(/\/{2,}/g, "/");
  cache = fetch(url)
    .then((r) => {
      if (!r.ok) throw new Error(`Library HTTP ${r.status}`);
      return r.json();
    })
    .then((j) => (Array.isArray(j?.items) ? (j.items as LibraryItem[]) : []))
    .catch((err) => {
      console.warn("[equipment-library] failed to load", err);
      cache = null;
      return [] as LibraryItem[];
    });
  return cache;
}

/**
 * Case-insensitive substring search across the item name, category and
 * sub-category. Empty query returns the original list.
 */
export function searchLibrary(
  items: LibraryItem[],
  query: string,
): LibraryItem[] {
  const q = query.trim().toLowerCase();
  if (!q) return items;
  const tokens = q.split(/\s+/).filter(Boolean);
  return items.filter((it) => {
    const hay = `${it.name} ${it.category} ${it.subCategory} ${it.notes ?? ""}`
      .toLowerCase();
    return tokens.every((t) => hay.includes(t));
  });
}
