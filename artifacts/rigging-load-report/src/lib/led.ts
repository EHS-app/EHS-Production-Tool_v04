export type LedPanelKey = string;

export type LedPanel = {
  key: LedPanelKey;
  name: string;
  pixelWidth: number;
  pixelHeight: number;
  physicalWidth: number;
  physicalHeight: number;
  weight: number;
  power: number;
};

export type LedCustomPanel = {
  pixelWidth: number;
  pixelHeight: number;
  physicalWidth: number;
  physicalHeight: number;
  weight: number;
  power: number;
};

export type LedScreen = {
  id: string;
  name: string;
  panelKey: LedPanelKey;
  panelsWide: number;
  panelsTall: number;
  color: string;
  outputIndex: number | null;
  notes: string;
  customPanel?: LedCustomPanel;
  linked?: boolean;
  sourceRowId?: string;
};

export type LedLinkedMeta = {
  panelKey: LedPanelKey;
  panelsWide: number;
  panelsTall: number;
  color: string;
  outputIndex: number | null;
  notes: string;
  customPanel?: LedCustomPanel;
};

export type LedSettings = {
  portLimit: number;
  showLabels: boolean;
};

export const DEFAULT_LED_SETTINGS: LedSettings = {
  portLimit: 650000,
  showLabels: true,
};

export const LED_SCREEN_COLORS = [
  "#3b82f6",
  "#ef4444",
  "#10b981",
  "#f59e0b",
  "#8b5cf6",
  "#ec4899",
  "#14b8a6",
  "#f97316",
];

/** Synthetic "Custom panel…" entry — not from rigging inventory. The user
 *  enters pixel/physical/weight/power per-screen via the customPanel field. */
export const CUSTOM_PANEL_KEY = "custom";
export const CUSTOM_LED_PANEL: LedPanel = {
  key: CUSTOM_PANEL_KEY,
  name: "Custom panel…",
  pixelWidth: 128,
  pixelHeight: 128,
  physicalWidth: 0.5,
  physicalHeight: 0.5,
  weight: 7.0,
  power: 175,
};

/** Anything carrying enough info to be exposed as a panel option. The rigging
 *  report's InventoryItem shape conforms to this naturally. */
export type LedPanelSource = {
  name: string;
  weight: number;
  wattage: number;
  pixelWidth?: number;
  pixelHeight?: number;
  physicalWidth?: number;
  physicalHeight?: number;
};

/** Build the LED panel library directly from the rigging inventory. Items
 *  that don't carry pixel/physical info (e.g. Molton fabric) are skipped.
 *  The "Custom panel…" entry is always appended last. */
export function buildLedPanels(items: LedPanelSource[]): LedPanel[] {
  const panels: LedPanel[] = [];
  for (const it of items) {
    if (
      typeof it.pixelWidth === "number" &&
      typeof it.pixelHeight === "number" &&
      typeof it.physicalWidth === "number" &&
      typeof it.physicalHeight === "number" &&
      it.pixelWidth > 0 &&
      it.pixelHeight > 0 &&
      it.physicalWidth > 0 &&
      it.physicalHeight > 0
    ) {
      panels.push({
        key: it.name,
        name: it.name,
        pixelWidth: it.pixelWidth,
        pixelHeight: it.pixelHeight,
        physicalWidth: it.physicalWidth,
        physicalHeight: it.physicalHeight,
        weight: it.weight,
        power: it.wattage,
      });
    }
  }
  panels.push(CUSTOM_LED_PANEL);
  return panels;
}

/** Default panel key for a freshly-added screen — first inventory panel,
 *  falling back to Custom if inventory has no LED-capable items. */
export function defaultPanelKeyOf(panels: LedPanel[]): LedPanelKey {
  return panels[0]?.key ?? CUSTOM_PANEL_KEY;
}

/** Look up a panel by key. If not found (e.g. an inventory item was renamed
 *  or removed since the screen was saved), fall back to the synthetic Custom
 *  panel rather than the first inventory entry — silently substituting a
 *  similarly-named-but-different panel would corrupt totals. The UI surfaces
 *  the stale key as "(missing)" so the user can re-pick. */
export function getLedPanel(key: LedPanelKey, panels: LedPanel[]): LedPanel {
  return panels.find((p) => p.key === key) ?? CUSTOM_LED_PANEL;
}

/** True if this rigging inventory item is mapped to a panel in the library. */
export function findPanelKeyForInventoryName(
  name: string,
  panels: LedPanel[],
): LedPanelKey | null {
  const found = panels.find((p) => p.key === name);
  return found ? found.key : null;
}

/** Migrate panel keys from older builds (which used pitch-suffixed slugs)
 *  to the new inventory-name-based keys. Unknown keys are returned as-is so
 *  getLedPanel's fallback can take over. */
export function migrateLedPanelKey(key: string): LedPanelKey {
  switch (key) {
    case "uniview-ur-pro-05-3.9":
    case "uniview-ur-pro-05-2.9":
      return "Uniview UR Pro 0.5x0.5m (7.2kg)";
    case "uniview-ur-pro-10-3.9":
    case "uniview-ur-pro-10-2.9":
      return "Uniview UR Pro 1x0.5m (10.8kg)";
    default:
      return key;
  }
}

/** Normalize a possibly-malformed persisted LedSettings into a safe value. */
export function normalizeLedSettings(s: unknown): LedSettings {
  const obj = (s ?? {}) as Partial<LedSettings>;
  const rawLimit = Number(obj.portLimit);
  const portLimit =
    Number.isFinite(rawLimit) && rawLimit >= 1000
      ? rawLimit
      : DEFAULT_LED_SETTINGS.portLimit;
  return {
    portLimit,
    showLabels: obj.showLabels !== false,
  };
}

/** Resolve a screen's effective panel (using customPanel if panelKey === custom). */
export function resolveScreenPanel(
  screen: { panelKey: LedPanelKey; customPanel?: LedCustomPanel },
  panels: LedPanel[],
): LedPanel {
  const base = getLedPanel(screen.panelKey, panels);
  if (screen.panelKey === CUSTOM_PANEL_KEY && screen.customPanel) {
    return {
      ...base,
      pixelWidth: screen.customPanel.pixelWidth,
      pixelHeight: screen.customPanel.pixelHeight,
      physicalWidth: screen.customPanel.physicalWidth,
      physicalHeight: screen.customPanel.physicalHeight,
      weight: screen.customPanel.weight,
      power: screen.customPanel.power,
    };
  }
  return base;
}

export type LedScreenMetrics = {
  panels: number;
  pixelsX: number;
  pixelsY: number;
  pixels: number;
  widthM: number;
  heightM: number;
  areaM2: number;
  weightKg: number;
  powerW: number;
};

export function computeScreenMetrics(
  screen: LedScreen,
  panels: LedPanel[],
): LedScreenMetrics {
  const panel = resolveScreenPanel(screen, panels);
  const panelCount = screen.panelsWide * screen.panelsTall;
  const pixelsX = screen.panelsWide * panel.pixelWidth;
  const pixelsY = screen.panelsTall * panel.pixelHeight;
  return {
    panels: panelCount,
    pixelsX,
    pixelsY,
    pixels: pixelsX * pixelsY,
    widthM: screen.panelsWide * panel.physicalWidth,
    heightM: screen.panelsTall * panel.physicalHeight,
    areaM2: panelCount * (panel.physicalWidth * panel.physicalHeight),
    weightKg: panelCount * panel.weight,
    powerW: panelCount * panel.power,
  };
}

export type LedTotals = {
  screens: number;
  panels: number;
  pixels: number;
  areaM2: number;
  weightKg: number;
  powerW: number;
  portsNeeded: number;
};

export function computeLedTotals(
  screens: LedScreen[],
  settings: LedSettings,
  panels: LedPanel[],
): LedTotals {
  const t: LedTotals = {
    screens: screens.length,
    panels: 0,
    pixels: 0,
    areaM2: 0,
    weightKg: 0,
    powerW: 0,
    portsNeeded: 0,
  };
  const limit = Math.max(1, settings.portLimit);
  for (const s of screens) {
    const m = computeScreenMetrics(s, panels);
    t.panels += m.panels;
    t.pixels += m.pixels;
    t.areaM2 += m.areaM2;
    t.weightKg += m.weightKg;
    t.powerW += m.powerW;
    t.portsNeeded += Math.max(1, Math.ceil(m.pixels / limit));
  }
  return t;
}

const COL_BASE = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
export function colLabel(i: number): string {
  let n = i;
  let out = "";
  do {
    out = COL_BASE[n % 26] + out;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return out;
}

export function newLedScreen(
  defaultPanelKey: LedPanelKey,
  seed?: Partial<LedScreen>,
): LedScreen {
  const id = `led-${Math.random().toString(36).slice(2, 9)}`;
  return {
    id,
    name: seed?.name ?? "Screen",
    panelKey: seed?.panelKey ?? defaultPanelKey,
    panelsWide: seed?.panelsWide ?? 8,
    panelsTall: seed?.panelsTall ?? 4,
    color: seed?.color ?? LED_SCREEN_COLORS[0],
    outputIndex: seed?.outputIndex ?? null,
    notes: seed?.notes ?? "",
    customPanel: seed?.customPanel,
    linked: seed?.linked,
    sourceRowId: seed?.sourceRowId,
  };
}

export function defaultLinkedLedMeta(
  qty: number,
  defaultPanelKey: LedPanelKey,
): LedLinkedMeta {
  const w = Math.max(1, Math.ceil(Math.sqrt(qty)));
  const h = Math.max(1, Math.ceil(qty / w));
  return {
    panelKey: defaultPanelKey,
    panelsWide: w,
    panelsTall: h,
    color: LED_SCREEN_COLORS[0],
    outputIndex: null,
    notes: "",
  };
}
