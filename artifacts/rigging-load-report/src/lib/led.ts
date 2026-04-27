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

export const BUILT_IN_LED_PANELS: LedPanel[] = [
  {
    key: "uniview-ur-pro-05-3.9",
    name: "Uniview UR Pro 0.5×0.5m (3.9mm)",
    pixelWidth: 128,
    pixelHeight: 128,
    physicalWidth: 0.5,
    physicalHeight: 0.5,
    weight: 7.2,
    power: 175,
  },
  {
    key: "uniview-ur-pro-05-2.9",
    name: "Uniview UR Pro 0.5×0.5m (2.9mm)",
    pixelWidth: 168,
    pixelHeight: 168,
    physicalWidth: 0.5,
    physicalHeight: 0.5,
    weight: 7.2,
    power: 175,
  },
  {
    key: "uniview-ur-pro-10-3.9",
    name: "Uniview UR Pro 1×0.5m (3.9mm)",
    pixelWidth: 256,
    pixelHeight: 128,
    physicalWidth: 1.0,
    physicalHeight: 0.5,
    weight: 10.8,
    power: 350,
  },
  {
    key: "uniview-ur-pro-10-2.9",
    name: "Uniview UR Pro 1×0.5m (2.9mm)",
    pixelWidth: 336,
    pixelHeight: 168,
    physicalWidth: 1.0,
    physicalHeight: 0.5,
    weight: 10.8,
    power: 350,
  },
  {
    key: "custom",
    name: "Custom panel…",
    pixelWidth: 128,
    pixelHeight: 128,
    physicalWidth: 0.5,
    physicalHeight: 0.5,
    weight: 7.0,
    power: 175,
  },
];

export const DEFAULT_LED_PANEL_KEY = BUILT_IN_LED_PANELS[0].key;

/** Inventory item name → built-in panel key for auto-link from rigging.
 *  Returns null for items that should NOT auto-link to the LED tab
 *  (Molton fabric, custom rows, unrecognized items). The user can always
 *  add an LED screen manually on the LED tab. */
export function detectPanelKeyFromInventory(name: string): LedPanelKey | null {
  const n = name.toLowerCase();
  if (n.startsWith("molton")) return null;
  if (n.includes("uniview") && n.includes("0.5x0.5")) {
    return "uniview-ur-pro-05-3.9";
  }
  if (n.includes("uniview") && n.includes("1x0.5")) {
    return "uniview-ur-pro-10-3.9";
  }
  return null;
}

/** True if the inventory item should appear as a screen on the LED tab. */
export function isLedPanelInventoryItem(name: string): boolean {
  return detectPanelKeyFromInventory(name) !== null;
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
    showLabels: obj.showLabels !== false, // default true
  };
}

export function getLedPanel(key: LedPanelKey): LedPanel {
  return (
    BUILT_IN_LED_PANELS.find((p) => p.key === key) ?? BUILT_IN_LED_PANELS[0]
  );
}

/** Resolve a screen's effective panel (using customPanel if panelKey === "custom"). */
export function resolveScreenPanel(screen: {
  panelKey: LedPanelKey;
  customPanel?: LedCustomPanel;
}): LedPanel {
  const base = getLedPanel(screen.panelKey);
  if (screen.panelKey === "custom" && screen.customPanel) {
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

export function computeScreenMetrics(screen: LedScreen): LedScreenMetrics {
  const panel = resolveScreenPanel(screen);
  const panels = screen.panelsWide * screen.panelsTall;
  const pixelsX = screen.panelsWide * panel.pixelWidth;
  const pixelsY = screen.panelsTall * panel.pixelHeight;
  return {
    panels,
    pixelsX,
    pixelsY,
    pixels: pixelsX * pixelsY,
    widthM: screen.panelsWide * panel.physicalWidth,
    heightM: screen.panelsTall * panel.physicalHeight,
    areaM2: panels * (panel.physicalWidth * panel.physicalHeight),
    weightKg: panels * panel.weight,
    powerW: panels * panel.power,
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
    const m = computeScreenMetrics(s);
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

export function newLedScreen(seed?: Partial<LedScreen>): LedScreen {
  const id = `led-${Math.random().toString(36).slice(2, 9)}`;
  return {
    id,
    name: seed?.name ?? "Screen",
    panelKey: seed?.panelKey ?? DEFAULT_LED_PANEL_KEY,
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

export function defaultLinkedLedMeta(qty: number): LedLinkedMeta {
  const w = Math.max(1, Math.ceil(Math.sqrt(qty)));
  const h = Math.max(1, Math.ceil(qty / w));
  return {
    panelKey: DEFAULT_LED_PANEL_KEY,
    panelsWide: w,
    panelsTall: h,
    color: LED_SCREEN_COLORS[0],
    outputIndex: null,
    notes: "",
  };
}
