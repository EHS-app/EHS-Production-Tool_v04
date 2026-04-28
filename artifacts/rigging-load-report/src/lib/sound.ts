/** Sound Report — data model, defaults and totals.
 *
 *  A "sound item" is a single line on the audio inventory: a row that
 *  represents one piece (or a quantity of identical pieces) of audio
 *  equipment for the show. Categories cover the typical PA, monitor,
 *  console, mic and accessory groupings used on a small/mid-size show.
 *
 *  Totals are derived (rows, total qty, total weight, total power) and
 *  rolled up per category for the dashboard. */

export const SOUND_CATEGORIES = [
  "PA Mains",
  "Subs",
  "Monitors",
  "IEMs",
  "Console",
  "Mic Wired",
  "Mic Wireless",
  "DI",
  "Stand",
  "Cable",
  "Other",
] as const;

export type SoundCategory = (typeof SOUND_CATEGORIES)[number];

export type SoundItem = {
  id: string;
  /** Display name, e.g. "L'Acoustics K2", "Shure SM58", "DiGiCo SD12". */
  name: string;
  /** Functional grouping. Drives the per-category dashboard breakdown. */
  category: SoundCategory;
  /** Number of identical pieces. Always >= 1. */
  qty: number;
  /** Weight per unit in kg. 0 for cables / miscellaneous items. */
  weightPerUnit: number;
  /** Continuous draw per unit in W. 0 for passive items. */
  powerPerUnit: number;
  /** Free-form notes (e.g. "Front fill", "Drum sub-mix", "Spare"). */
  notes: string;
};

function newId(prefix: string): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
}

/** Build a fresh sound item with sensible defaults. */
export function makeSoundItem(name = ""): SoundItem {
  return {
    id: newId("snd"),
    name,
    category: "PA Mains",
    qty: 1,
    weightPerUnit: 0,
    powerPerUnit: 0,
    notes: "",
  };
}

/** Coerce an unknown value (from localStorage / hand-edited JSON) into a
 *  valid SoundItem. Bad fields fall back to the makeSoundItem default
 *  rather than throwing. */
export function normalizeSoundItem(raw: unknown): SoundItem {
  const base = makeSoundItem();
  if (!raw || typeof raw !== "object") return base;
  const r = raw as Record<string, unknown>;
  const category =
    typeof r.category === "string" &&
    (SOUND_CATEGORIES as readonly string[]).includes(r.category)
      ? (r.category as SoundCategory)
      : base.category;
  const qty =
    typeof r.qty === "number" && Number.isFinite(r.qty) && r.qty > 0
      ? Math.max(1, Math.round(r.qty))
      : base.qty;
  const weightPerUnit =
    typeof r.weightPerUnit === "number" &&
    Number.isFinite(r.weightPerUnit) &&
    r.weightPerUnit >= 0
      ? r.weightPerUnit
      : base.weightPerUnit;
  const powerPerUnit =
    typeof r.powerPerUnit === "number" &&
    Number.isFinite(r.powerPerUnit) &&
    r.powerPerUnit >= 0
      ? r.powerPerUnit
      : base.powerPerUnit;
  return {
    id: typeof r.id === "string" && r.id ? r.id : base.id,
    name: typeof r.name === "string" ? r.name : base.name,
    category,
    qty,
    weightPerUnit,
    powerPerUnit,
    notes: typeof r.notes === "string" ? r.notes : base.notes,
  };
}

/** Subtotal weight for a single row (qty × per-unit), in kg. */
export function itemWeight(item: SoundItem): number {
  return item.qty * item.weightPerUnit;
}

/** Subtotal continuous power for a single row (qty × per-unit), in W. */
export function itemPower(item: SoundItem): number {
  return item.qty * item.powerPerUnit;
}

export type SoundTotals = {
  /** Number of rows on the inventory. */
  rowCount: number;
  /** Sum of every row's qty (total physical pieces). */
  totalQty: number;
  /** Sum of every row's weight subtotal, in kg. */
  totalWeight: number;
  /** Sum of every row's continuous power subtotal, in W. */
  totalPower: number;
  /** Row count per category. Always contains every SoundCategory key. */
  countsByCategory: Record<SoundCategory, number>;
  /** Weight per category, in kg. Always contains every SoundCategory key. */
  weightsByCategory: Record<SoundCategory, number>;
  /** Power per category, in W. Always contains every SoundCategory key. */
  powersByCategory: Record<SoundCategory, number>;
};

function emptyTotals(): SoundTotals {
  const countsByCategory = {} as Record<SoundCategory, number>;
  const weightsByCategory = {} as Record<SoundCategory, number>;
  const powersByCategory = {} as Record<SoundCategory, number>;
  for (const c of SOUND_CATEGORIES) {
    countsByCategory[c] = 0;
    weightsByCategory[c] = 0;
    powersByCategory[c] = 0;
  }
  return {
    rowCount: 0,
    totalQty: 0,
    totalWeight: 0,
    totalPower: 0,
    countsByCategory,
    weightsByCategory,
    powersByCategory,
  };
}

export function computeSoundTotals(items: SoundItem[]): SoundTotals {
  const t = emptyTotals();
  for (const it of items) {
    const w = itemWeight(it);
    const p = itemPower(it);
    t.rowCount += 1;
    t.totalQty += it.qty;
    t.totalWeight += w;
    t.totalPower += p;
    t.countsByCategory[it.category] += 1;
    t.weightsByCategory[it.category] += w;
    t.powersByCategory[it.category] += p;
  }
  return t;
}
