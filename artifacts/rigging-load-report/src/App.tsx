import { useEffect, useMemo, useRef, useState } from "react";
import { useClerk, useUser } from "@clerk/react";
import { Link } from "wouter";
import "./index.css";
import ehsLogo from "./assets/ehs-logo.png";
import {
  CUSTOM_LED_PANEL,
  CUSTOM_PANEL_KEY,
  DEFAULT_LED_SETTINGS,
  LED_SCREEN_COLORS,
  buildLedPanels,
  computeLedTotals,
  defaultLinkedLedMeta,
  defaultPanelKeyOf,
  findPanelKeyForInventoryName,
  resolveScreenPanel,
  migrateLedPanelKey,
  newLedScreen,
  normalizeLedSettings,
  type LedCustomPanel,
  type LedLinkedMeta,
  type LedScreen,
  type LedSettings,
} from "./lib/led";
import { findProcessor } from "./lib/ledProcessors";
import { ShareBriefModal } from "./components/ShareBriefModal";
import type { BuildBriefInput } from "./lib/projectBrief";
import { exportScreenAsPng, getLogoDataUrl } from "./lib/ledExport";
import { LedScreenReportView } from "./components/LedScreenReportView";
import {
  computeStage,
  type Stage,
  makeDefaultStage,
  normalizeStage,
} from "./lib/stage";
import { exportStageReport } from "./lib/stageExport";
import { StageReportView } from "./components/StageReportView";
import {
  makeCrewMember,
  normalizeCrewMember,
  type CrewMember,
} from "./lib/crew";
import { CrewReportView } from "./components/CrewReportView";
import {
  makeSoundItem,
  normalizeSoundItem,
  type SoundItem,
} from "./lib/sound";
import { SoundReportView } from "./components/SoundReportView";
import { EquipmentPicker } from "./components/EquipmentPicker";
import type { LibraryItem } from "./lib/equipmentLibrary";
import {
  defaultPowerPlan,
  makePowerCircuit,
  makePowerItem,
  normalizePowerPlan,
  type PowerCircuit,
  type PowerItem,
  type PowerPhase,
  type PowerPlan,
} from "./lib/power";
import { PowerPlanView } from "./components/PowerPlanView";
import {
  clampTrussToVenue,
  DEFAULT_RIGG_PLAN,
  normalizeRiggPlan,
  type RiggPlan,
  type RiggPlanTruss,
  type RiggPlanVenue,
} from "./lib/riggPlan";
import {
  RiggPlanView,
  type RiggPlanSystemInfo,
} from "./components/RiggPlanView";

type DmxMode = {
  name: string;
  channels: number;
};

type InventoryItem = {
  name: string;
  weight: number;
  wattage: number;
  area: number;
  /** Optional list of factory DMX modes for this fixture. Sourced from
   *  manufacturer documentation. The first entry is treated as the default
   *  when the fixture is first linked into the Lighting Plan. */
  dmxModes?: DmxMode[];
  /** LED panel pixel/physical dimensions. When all four are set, this
   *  inventory item appears as a panel option on the LED Screen Report. */
  pixelWidth?: number;
  pixelHeight?: number;
  physicalWidth?: number;
  physicalHeight?: number;
};

type Category = "Truss" | "Fixtures" | "LED Screen";

const inventory: Record<Category, InventoryItem[]> = {
  Truss: [
    { name: "Eurotruss FD34 - 3.0m (18.1kg)", weight: 18.1, wattage: 0, area: 0 },
    { name: "Eurotruss FD34 - 2.0m (12.5kg)", weight: 12.5, wattage: 0, area: 0 },
    { name: "Eurotruss FD34 - 1.0m (6.9kg)", weight: 6.9, wattage: 0, area: 0 },
    { name: "Eurotruss FD34 - 0.5m (4.5kg)", weight: 4.5, wattage: 0, area: 0 },
    { name: "Eurotruss FD34 - 0.25m (3.2kg)", weight: 3.2, wattage: 0, area: 0 },
    { name: "Eurotruss HD34 - 3.0m (21.4kg)", weight: 21.4, wattage: 0, area: 0 },
    { name: "Eurotruss HD34 - 2.0m (14.7kg)", weight: 14.7, wattage: 0, area: 0 },
    { name: "Eurotruss HD34 - 1.0m (8.1kg)", weight: 8.1, wattage: 0, area: 0 },
    { name: "Eurotruss HD34 - 0.5m (5.1kg)", weight: 5.1, wattage: 0, area: 0 },
    { name: "Eurotruss HD34 - 0.25m (3.8kg)", weight: 3.8, wattage: 0, area: 0 },
    { name: "Eurotruss FD32 - 4.0m (15.5kg)", weight: 15.5, wattage: 0, area: 0 },
    { name: "Eurotruss FD32 - 3.0m (11.8kg)", weight: 11.8, wattage: 0, area: 0 },
    { name: "Eurotruss FD32 - 2.0m (8.3kg)", weight: 8.3, wattage: 0, area: 0 },
    { name: "Eurotruss FD32 - 1.0m (4.7kg)", weight: 4.7, wattage: 0, area: 0 },
    { name: "Eurotruss FD32 - 0.5m (3.1kg)", weight: 3.1, wattage: 0, area: 0 },
  ],
  Fixtures: [
    {
      name: "Clay Paky Mythos 2 (32.0kg)",
      weight: 32.0,
      wattage: 800,
      area: 0,
      dmxModes: [
        { name: "Standard", channels: 30 },
        { name: "Vector / Extended", channels: 34 },
      ],
    },
    {
      name: "Elation DTW Blinder 350 IP (11.0kg)",
      weight: 11.0,
      wattage: 310,
      area: 0,
      dmxModes: [
        { name: "1 Channel", channels: 1 },
        { name: "2 Channel", channels: 2 },
        { name: "4 Channel", channels: 4 },
        { name: "Full / 9 Channel", channels: 9 },
      ],
    },
    { name: "Martin PowerPort 1500", weight: 0, wattage: 1100, area: 0 },
    {
      name: "MDG ATMe Haze",
      weight: 0,
      wattage: 715,
      area: 0,
      dmxModes: [{ name: "Standard", channels: 3 }],
    },
    {
      name: "Stage Fan / AF-1",
      weight: 0,
      wattage: 120,
      area: 0,
      dmxModes: [{ name: "Speed", channels: 1 }],
    },
    {
      name: "Astera Titan Tube (1.35kg)",
      weight: 1.35,
      wattage: 72,
      area: 0,
      dmxModes: [
        { name: "Single 5ch", channels: 5 },
        { name: "Single 8ch", channels: 8 },
        { name: "Single 11ch", channels: 11 },
        { name: "Pixel 16 (28ch)", channels: 28 },
      ],
    },
    {
      name: "Astera AX2 1m PixelBar (7.4kg)",
      weight: 7.4,
      wattage: 80,
      area: 0,
      dmxModes: [
        { name: "Single 5ch", channels: 5 },
        { name: "Single 8ch", channels: 8 },
        { name: "Single 11ch", channels: 11 },
        { name: "Pixel 16 (28ch)", channels: 28 },
      ],
    },
    {
      name: "Astera AX5 TriplePAR (3.4kg)",
      weight: 3.4,
      wattage: 45,
      area: 0,
      dmxModes: [
        { name: "Single 5ch", channels: 5 },
        { name: "Single 8ch", channels: 8 },
        { name: "Single 11ch", channels: 11 },
        { name: "Pixel 3 (15ch)", channels: 15 },
      ],
    },
    {
      name: "Astera AX9 PowerPar (5.66kg)",
      weight: 5.66,
      wattage: 110,
      area: 0,
      dmxModes: [
        { name: "Single 5ch", channels: 5 },
        { name: "Single 8ch", channels: 8 },
        { name: "Single 11ch", channels: 11 },
      ],
    },
    {
      name: "Astera Pixel Brick (1.12kg)",
      weight: 1.12,
      wattage: 20,
      area: 0,
      dmxModes: [
        { name: "Single 5ch", channels: 5 },
        { name: "Single 8ch", channels: 8 },
        { name: "Single 11ch", channels: 11 },
      ],
    },
    {
      name: "Martin MAC Aura (6.6kg)",
      weight: 6.6,
      wattage: 260,
      area: 0,
      dmxModes: [
        { name: "Standard", channels: 14 },
        { name: "Extended", channels: 25 },
      ],
    },
    {
      name: "Martin MAC Aura XB (7.5kg)",
      weight: 7.5,
      wattage: 260,
      area: 0,
      dmxModes: [
        { name: "Standard", channels: 14 },
        { name: "Extended", channels: 25 },
      ],
    },
    {
      name: "Martin MAC Aura XIP (10.0kg)",
      weight: 10.0,
      wattage: 340,
      area: 0,
      dmxModes: [
        { name: "Compact", channels: 20 },
        { name: "Basic", channels: 36 },
        { name: "Extended", channels: 57 },
        { name: "Ludicrous", channels: 93 },
        { name: "XB Standard", channels: 14 },
        { name: "XB Extended", channels: 25 },
      ],
    },
    {
      name: "Martin MAC Aura PXL (15.6kg)",
      weight: 15.6,
      wattage: 560,
      area: 0,
      dmxModes: [
        { name: "Compact", channels: 17 },
        { name: "Basic", channels: 32 },
        { name: "Extended", channels: 89 },
        { name: "Ludicrous", channels: 512 },
      ],
    },
    {
      name: "Martin MAC One (5.4kg)",
      weight: 5.4,
      wattage: 160,
      area: 0,
      dmxModes: [
        { name: "Compact", channels: 20 },
        { name: "Basic", channels: 36 },
        { name: "Ludicrous", channels: 108 },
        { name: "Compact Direct", channels: 20 },
      ],
    },
    {
      name: "Martin MAC Viper XIP (37.8kg)",
      weight: 37.8,
      wattage: 1040,
      area: 0,
      dmxModes: [
        { name: "Basic", channels: 54 },
        { name: "Extended", channels: 64 },
        { name: "Ludicrous", channels: 70 },
      ],
    },
    {
      name: "Martin MAC Viper AirFX (36.7kg)",
      weight: 36.7,
      wattage: 1225,
      area: 0,
      dmxModes: [
        { name: "Basic", channels: 20 },
        { name: "Extended", channels: 28 },
      ],
    },
    {
      name: "SnowARC Pro Quad 40 mkII (10.5kg)",
      weight: 10.5,
      wattage: 390,
      area: 0,
      dmxModes: [
        { name: "Snow only (1ch)", channels: 1 },
        { name: "Snow + RGBW (6ch)", channels: 6 },
      ],
    },
    {
      name: "DTS NICK NRG 1201 (12.9kg)",
      weight: 12.9,
      wattage: 340,
      area: 0,
      dmxModes: [{ name: "Standard", channels: 20 }],
    },
    {
      name: "Elation Pulse Panel FX (14.4kg)",
      weight: 14.4,
      wattage: 900,
      area: 0,
      dmxModes: [
        { name: "8 Channel", channels: 8 },
        { name: "16 Channel", channels: 16 },
        { name: "29 Channel", channels: 29 },
        { name: "52 Channel", channels: 52 },
        { name: "62 Channel", channels: 62 },
        { name: "65 Channel", channels: 65 },
      ],
    },
    {
      name: "Chauvet Color STRIKE M (13.1kg)",
      weight: 13.1,
      wattage: 740,
      area: 0,
      dmxModes: [
        { name: "8 Channel", channels: 8 },
        { name: "11 Channel", channels: 11 },
        { name: "13 Channel", channels: 13 },
        { name: "24 Channel", channels: 24 },
        { name: "30 Channel", channels: 30 },
        { name: "47 Channel", channels: 47 },
        { name: "74 Channel", channels: 74 },
        { name: "97 Channel", channels: 97 },
      ],
    },
    {
      name: "Martin RUSH MH 7 Hybrid (25.0kg)",
      weight: 25.0,
      wattage: 450,
      area: 0,
      dmxModes: [{ name: "Standard", channels: 21 }],
    },
  ],
  "LED Screen": [
    {
      // Uniview UR Pro 3.9 — 500 × 1000 mm cabinet, mounted in PORTRAIT
      // (0.5 m wide × 1.0 m tall). Manufacturer cabinet weight 10.8 kg,
      // max draw 350 W per cabinet.
      name: "Uniview UR Pro 0.5x1m (10.8kg)",
      weight: 10.8,
      wattage: 350,
      area: 0.5,
      pixelWidth: 128,
      pixelHeight: 256,
      physicalWidth: 0.5,
      physicalHeight: 1.0,
    },
    {
      // Uniview UR Pro 3.9 — square 500 × 500 mm cabinet, 7.2 kg, 175 W max.
      name: "Uniview UR Pro 0.5x0.5m (7.2kg)",
      weight: 7.2,
      wattage: 175,
      area: 0.25,
      pixelWidth: 128,
      pixelHeight: 128,
      physicalWidth: 0.5,
      physicalHeight: 0.5,
    },
    { name: "Molton 6x4m (7.2kg)", weight: 7.2, wattage: 0, area: 0 },
    { name: "Molton 9x6m (16.2kg)", weight: 16.2, wattage: 0, area: 0 },
    { name: "Molton 9x9m (24.3kg)", weight: 24.3, wattage: 0, area: 0 },
  ],
};

const distributionFactors: Record<number, number[]> = {
  2: [0.5, 0.5],
  3: [0.19, 0.62, 0.19],
  4: [0.13, 0.37, 0.37, 0.13],
  5: [0.1, 0.28, 0.24, 0.28, 0.1],
  6: [0.08, 0.23, 0.19, 0.19, 0.23, 0.08],
  7: [0.07, 0.19, 0.15, 0.18, 0.15, 0.19, 0.07],
  8: [0.06, 0.16, 0.14, 0.14, 0.14, 0.14, 0.16, 0.06],
};

type Hoist = {
  label: string;
  weight: number;
  watt: number;
  swl: number;
};

const hoistModels: Hoist[] = [
  { label: "EXE Rise D8+ 500kg (38.5kg | 0.8kW)", weight: 38.5, watt: 800, swl: 500 },
  { label: "EXE Rise D8+ 1000kg (69.6kg | 1.1kW)", weight: 69.6, watt: 1100, swl: 1000 },
];

type Row = {
  id: string;
  category: Category | "Custom";
  selectedIndex: number;
  qty: number;
  custom?: InventoryItem;
};

type System = {
  id: string;
  name: string;
  pointCount: number;
  dynamicFactor: number;
  hoistIndex: number;
  riggingRows: Row[];
  fixtureRows: Row[];
  ledRows: Row[];
};

let idCounter = 0;
const newId = (prefix = "id") =>
  `${prefix}-${++idCounter}-${Math.random().toString(36).slice(2, 8)}`;

function makeRow(category: Category, qty = 1): Row {
  return { id: newId("row"), category, selectedIndex: 0, qty };
}

function makeCustomRow(targetCategory: Category, item: InventoryItem): Row {
  return {
    id: newId("row"),
    category: targetCategory,
    selectedIndex: -1,
    qty: 1,
    custom: item,
  };
}

function makeSystem(name: string): System {
  return {
    id: newId("sys"),
    name,
    pointCount: 3,
    dynamicFactor: 1.25,
    hoistIndex: 0,
    riggingRows: [makeRow("Truss", 4)],
    fixtureRows: [],
    ledRows: [],
  };
}

function getRowItem(row: Row): InventoryItem | undefined {
  if (row.custom) return row.custom;
  if (row.category === "Custom") return undefined;
  return inventory[row.category as Category][row.selectedIndex];
}

const STORAGE_KEY_V2 = "ehs-rigging-report-v2";
const STORAGE_KEY_V1 = "ehs-rigging-report-v1";

type MainView =
  | "rigging"
  | "lighting"
  | "led"
  | "stage"
  | "crew"
  | "sound"
  | "riggPlan";

type ShowFixture = {
  id: string;
  name: string;
  qty: number;
  weight: number;
  watts: number;
  dmxChannels: number;
  beamAngle: number;
  systemId: string;
  position: number;
  circuit: string;
  universe: number;
  startAddress: number;
  notes: string;
  /** When true, base info (name/qty/weight/watts/systemId) comes from a
   *  rigging fixtureRow and is read-only on the lighting plan. */
  linked?: boolean;
  /** For linked rows, the source rigging Row id used for meta lookup. */
  sourceRowId?: string;
  /** Selected DMX mode index from the inventory item's dmxModes list, or
   *  null when the user has chosen "Custom..." and is entering channels
   *  manually. Only set on linked rows whose inventory item provides modes. */
  dmxModeIndex?: number | null;
  /** Available DMX modes for the underlying inventory item (linked rows). */
  availableDmxModes?: DmxMode[];
};

/** Lighting-plan-only fields layered on top of a rigging fixture row. */
type LinkedMeta = {
  dmxChannels: number;
  /** Selected mode index, or null if user picked "Custom..." (use stored
   *  dmxChannels). Index 0 is the default for items that have dmxModes. */
  dmxModeIndex?: number | null;
  beamAngle: number;
  position: number;
  circuit: string;
  universe: number;
  startAddress: number;
  notes: string;
};

function defaultLinkedMeta(): LinkedMeta {
  return {
    dmxChannels: 0,
    dmxModeIndex: 0,
    beamAngle: 0,
    position: 0,
    circuit: "",
    universe: 1,
    startAddress: 1,
    notes: "",
  };
}

function makeShowFixture(): ShowFixture {
  return {
    id: newId("fx"),
    name: "",
    qty: 1,
    weight: 0,
    watts: 0,
    dmxChannels: 0,
    beamAngle: 0,
    systemId: "",
    position: 0,
    circuit: "",
    universe: 1,
    startAddress: 1,
    notes: "",
  };
}

type PersistedV2 = {
  theme: "light" | "dark";
  venue: string;
  reportDate: string;
  engineer: string;
  systems: System[];
  activeSystemId: string;
  showFixtures?: ShowFixture[];
  mainView?: MainView;
  /** DMX/position overlays for fixtures linked from the rigging report,
   *  keyed by the source rigging Row id. */
  linkedMeta?: Record<string, LinkedMeta>;
  /** Manual (non-linked) LED screens added on the LED Screen Report tab. */
  ledScreens?: LedScreen[];
  /** Per-screen overlay (panel type, layout, output, color, notes) for LED
   *  screens linked from a rigging ledRow, keyed by source Row id. */
  ledLinkedMeta?: Record<string, LedLinkedMeta>;
  /** LED Screen Report settings (port limit, label visibility). */
  ledSettings?: LedSettings;
  /** Stage Report — list of stages (Nivtec deck calculator). */
  stages?: Stage[];
  /** Crew Report — call-sheet of crew members. */
  crew?: CrewMember[];
  /** Sound Report — audio inventory items. */
  soundItems?: SoundItem[];
  /** Lighting Report → Power Plan — circuits and per-phase items. */
  power?: PowerPlan;
  /** Rigg Plan — venue + per-system truss positions. */
  riggPlan?: RiggPlan;
};

function loadPersisted(): Partial<PersistedV2> | null {
  try {
    const rawV2 = localStorage.getItem(STORAGE_KEY_V2);
    if (rawV2) return JSON.parse(rawV2) as Partial<PersistedV2>;

    const rawV1 = localStorage.getItem(STORAGE_KEY_V1);
    if (rawV1) {
      const v1 = JSON.parse(rawV1);
      const sys: System = {
        id: newId("sys"),
        name: v1.systemName || "LX1",
        pointCount: v1.pointCount ?? 3,
        dynamicFactor: v1.dynamicFactor ?? 1.25,
        hoistIndex: v1.hoistIndex ?? 0,
        riggingRows: Array.isArray(v1.riggingRows)
          ? v1.riggingRows
          : [makeRow("Truss", 4)],
        fixtureRows: Array.isArray(v1.fixtureRows) ? v1.fixtureRows : [],
        ledRows: Array.isArray(v1.ledRows) ? v1.ledRows : [],
      };
      return {
        theme: v1.theme ?? "light",
        venue: v1.venue ?? "",
        reportDate: v1.reportDate ?? new Date().toISOString().slice(0, 10),
        engineer: v1.engineer ?? "",
        systems: [sys],
        activeSystemId: sys.id,
      };
    }
    return null;
  } catch {
    return null;
  }
}

type SystemMetrics = {
  payload: number;
  power: number;
  area: number;
  static: number;
  dynamic: number;
  motorPower: number;
  peak: number;
  swl: number;
  headroom: number;
  factors: number[];
  staticPointLoads: number[];
  dynamicPointLoads: number[];
  hoist: Hoist;
};

function computeMetrics(sys: System): SystemMetrics {
  let payload = 0,
    power = 0,
    area = 0;
  for (const row of [...sys.riggingRows, ...sys.fixtureRows, ...sys.ledRows]) {
    const item = getRowItem(row);
    if (!item) continue;
    payload += item.weight * row.qty;
    power += item.wattage * row.qty;
    area += item.area * row.qty;
  }
  const hoist = hoistModels[sys.hoistIndex] ?? hoistModels[0];
  const motorPower = hoist.watt * sys.pointCount;
  const staticTotal = payload + sys.pointCount * hoist.weight;
  const dynamicTotal = staticTotal * sys.dynamicFactor;
  const factors = distributionFactors[sys.pointCount] ?? [];
  const staticPointLoads = factors.map((f) => staticTotal * f);
  const dynamicPointLoads = factors.map((f) => dynamicTotal * f);
  const peak = dynamicPointLoads.length ? Math.max(...dynamicPointLoads) : 0;
  return {
    payload,
    power,
    area,
    static: staticTotal,
    dynamic: dynamicTotal,
    motorPower,
    peak,
    swl: hoist.swl,
    headroom: hoist.swl - peak,
    factors,
    staticPointLoads,
    dynamicPointLoads,
    hoist,
  };
}

function SignOutButton() {
  const { signOut } = useClerk();
  const { user } = useUser();
  const label =
    user?.primaryEmailAddress?.emailAddress ??
    user?.username ??
    user?.firstName ??
    "Account";
  return (
    <button
      className="btn btn-reset"
      onClick={() => {
        try {
          sessionStorage.setItem("ehs-skip-dev-auto-signin", "1");
        } catch {
          /* sessionStorage may be unavailable */
        }
        void signOut();
      }}
      title={`Signed in as ${label}. Click to sign out.`}
      style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
    >
      <span style={{ opacity: 0.85 }}>{label}</span>
      <span aria-hidden>·</span>
      <span>Sign out</span>
    </button>
  );
}

function App() {
  const persisted = useRef<Partial<PersistedV2> | null>(loadPersisted()).current;
  const initialSystem = makeSystem("LX1");

  const [theme, setTheme] = useState<"light" | "dark">(persisted?.theme ?? "light");
  const [venue, setVenue] = useState(persisted?.venue ?? "");
  const [reportDate, setReportDate] = useState(
    persisted?.reportDate ?? new Date().toISOString().slice(0, 10),
  );
  const [engineer, setEngineer] = useState(persisted?.engineer ?? "");
  const [systems, setSystems] = useState<System[]>(
    persisted?.systems && persisted.systems.length > 0
      ? persisted.systems
      : [initialSystem],
  );
  const [activeSystemId, setActiveSystemId] = useState<string>(() => {
    const fromPersisted = persisted?.activeSystemId;
    const list = persisted?.systems && persisted.systems.length > 0
      ? persisted.systems
      : [initialSystem];
    if (fromPersisted && list.some((s) => s.id === fromPersisted)) {
      return fromPersisted;
    }
    return list[0].id;
  });

  const [mainView, setMainView] = useState<MainView>(persisted?.mainView ?? "rigging");
  /** Equipment-library picker state. `target` controls which add-handler the
   *  picked item flows into; `null` means the picker is closed. */
  const [pickerTarget, setPickerTarget] = useState<
    | null
    | { kind: "sound" }
    | { kind: "lighting" }
    | { kind: "power"; circuitId: string; phase: PowerPhase }
  >(null);
  const closePicker = () => setPickerTarget(null);
  const [showFixtures, setShowFixtures] = useState<ShowFixture[]>(
    persisted?.showFixtures ?? [],
  );
  const [linkedMeta, setLinkedMeta] = useState<Record<string, LinkedMeta>>(
    persisted?.linkedMeta ?? {},
  );
  const [ledScreens, setLedScreens] = useState<LedScreen[]>(
    () =>
      (persisted?.ledScreens ?? []).map((s) => ({
        ...s,
        panelKey: migrateLedPanelKey(s.panelKey),
      })),
  );
  const [ledLinkedMeta, setLedLinkedMeta] = useState<
    Record<string, LedLinkedMeta>
  >(() => {
    const raw = persisted?.ledLinkedMeta ?? {};
    const out: Record<string, LedLinkedMeta> = {};
    for (const [k, v] of Object.entries(raw)) {
      out[k] = { ...v, panelKey: migrateLedPanelKey(v.panelKey) };
    }
    return out;
  });
  const [ledSettings, setLedSettings] = useState<LedSettings>(
    normalizeLedSettings(persisted?.ledSettings),
  );
  const [crew, setCrew] = useState<CrewMember[]>(
    () => (persisted?.crew ?? []).map(normalizeCrewMember),
  );
  const [soundItems, setSoundItems] = useState<SoundItem[]>(
    () => (persisted?.soundItems ?? []).map(normalizeSoundItem),
  );
  const [power, setPower] = useState<PowerPlan>(
    () => normalizePowerPlan(persisted?.power),
  );
  const [stages, setStages] = useState<Stage[]>(
    () => (persisted?.stages ?? []).map(normalizeStage),
  );
  const [riggPlan, setRiggPlan] = useState<RiggPlan>(() =>
    normalizeRiggPlan(persisted?.riggPlan),
  );

  const [modalTarget, setModalTarget] = useState<Category | null>(null);
  const [custName, setCustName] = useState("");
  const [custWeight, setCustWeight] = useState("");
  const [custWatt, setCustWatt] = useState("");
  const [custArea, setCustArea] = useState("");

  const [savedAt, setSavedAt] = useState<string>("");
  const [shareOpen, setShareOpen] = useState(false);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  useEffect(() => {
    const data: PersistedV2 = {
      theme,
      venue,
      reportDate,
      engineer,
      systems,
      activeSystemId,
      showFixtures,
      mainView,
      linkedMeta,
      ledScreens,
      ledLinkedMeta,
      ledSettings,
      stages,
      crew,
      soundItems,
      power,
      riggPlan,
    };
    try {
      localStorage.setItem(STORAGE_KEY_V2, JSON.stringify(data));
      setSavedAt(
        new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      );
    } catch {
      /* ignore quota errors */
    }
  }, [
    theme,
    venue,
    reportDate,
    engineer,
    systems,
    activeSystemId,
    showFixtures,
    mainView,
    linkedMeta,
    ledScreens,
    ledLinkedMeta,
    ledSettings,
    stages,
    crew,
    soundItems,
    power,
    riggPlan,
  ]);

  const activeSystem =
    systems.find((s) => s.id === activeSystemId) ?? systems[0];

  const updateActiveSystem = (updates: Partial<System>) => {
    setSystems((all) =>
      all.map((s) => (s.id === activeSystem.id ? { ...s, ...updates } : s)),
    );
  };

  const updateRowsKey = (
    key: "riggingRows" | "fixtureRows" | "ledRows",
    fn: (rows: Row[]) => Row[],
  ) => {
    setSystems((all) =>
      all.map((s) =>
        s.id === activeSystem.id ? { ...s, [key]: fn(s[key]) } : s,
      ),
    );
  };

  const addSystem = () => {
    const nextNumber = systems.length + 1;
    let baseName = `LX${nextNumber}`;
    while (systems.some((s) => s.name === baseName)) baseName += "'";
    const sys = makeSystem(baseName);
    setSystems((all) => [...all, sys]);
    setActiveSystemId(sys.id);
  };

  const duplicateActiveSystem = () => {
    const copy: System = {
      ...activeSystem,
      id: newId("sys"),
      name: `${activeSystem.name} copy`,
      riggingRows: activeSystem.riggingRows.map((r) => ({ ...r, id: newId("row") })),
      fixtureRows: activeSystem.fixtureRows.map((r) => ({ ...r, id: newId("row") })),
      ledRows: activeSystem.ledRows.map((r) => ({ ...r, id: newId("row") })),
    };
    setSystems((all) => [...all, copy]);
    setActiveSystemId(copy.id);
  };

  const removeSystem = (id: string) => {
    if (systems.length <= 1) {
      alert("You need at least one rigging system in the report.");
      return;
    }
    const target = systems.find((s) => s.id === id);
    if (!target) return;
    if (
      !confirm(
        `Remove rigging system "${target.name}"? Its gear list will be lost.`,
      )
    )
      return;
    const remaining = systems.filter((s) => s.id !== id);
    setSystems(remaining);
    if (activeSystemId === id) setActiveSystemId(remaining[0].id);
  };

  const openModal = (category: Category) => {
    setModalTarget(category);
    setCustName("");
    setCustWeight("");
    setCustWatt("");
    setCustArea("");
  };
  const closeModal = () => setModalTarget(null);

  // ── Show Fixtures (Lighting Plan) ───────────────────────────────────────

  // Garbage-collect linkedMeta entries whose source rigging row no longer
  // exists (system or fixtureRow was deleted). Keeps localStorage tidy.
  useEffect(() => {
    const liveIds = new Set<string>();
    for (const sys of systems)
      for (const row of sys.fixtureRows) liveIds.add(row.id);
    setLinkedMeta((all) => {
      const keys = Object.keys(all);
      const orphans = keys.filter((k) => !liveIds.has(k));
      if (orphans.length === 0) return all;
      const next: Record<string, LinkedMeta> = {};
      for (const k of keys) if (liveIds.has(k)) next[k] = all[k];
      return next;
    });
  }, [systems]);

  /** Fixtures auto-derived from each rigging system's fixtureRows. Read-only
   *  base info (name/qty/weight/watts/systemId); DMX/position overlays come
   *  from `linkedMeta` keyed by the source rigging Row id. */
  const linkedFixtures = useMemo<ShowFixture[]>(() => {
    const out: ShowFixture[] = [];
    for (const sys of systems) {
      for (const row of sys.fixtureRows) {
        const item = getRowItem(row);
        if (!item) continue;
        const stored = linkedMeta[row.id];
        const meta = stored ?? defaultLinkedMeta();

        // Resolve DMX mode + channel count.
        // - Item has modes + meta.dmxModeIndex is a valid index → use mode's channels
        // - Item has modes + meta.dmxModeIndex === null → "Custom" override (use stored channels)
        // - Item has modes + no stored meta → default to first mode
        // - Item has no modes → use stored channels (free entry)
        const modes = item.dmxModes;
        let resolvedModeIndex: number | null | undefined;
        let resolvedChannels: number;
        if (modes && modes.length > 0) {
          if (!stored || meta.dmxModeIndex === undefined) {
            // No stored meta OR legacy meta from before dmxModes existed
            // (no dmxModeIndex field) → default to first mode. This avoids
            // dropping channels to 0 for users upgrading from older saves.
            resolvedModeIndex = 0;
            resolvedChannels = modes[0].channels;
          } else if (
            meta.dmxModeIndex !== null &&
            meta.dmxModeIndex >= 0 &&
            meta.dmxModeIndex < modes.length
          ) {
            resolvedModeIndex = meta.dmxModeIndex;
            resolvedChannels = modes[meta.dmxModeIndex].channels;
          } else {
            // null (explicit Custom) or out-of-range → custom entry
            resolvedModeIndex = null;
            resolvedChannels = meta.dmxChannels;
          }
        } else {
          resolvedModeIndex = undefined;
          resolvedChannels = meta.dmxChannels;
        }

        out.push({
          id: `linked-${row.id}`,
          name: item.name,
          qty: row.qty,
          weight: item.weight,
          watts: item.wattage,
          systemId: sys.id,
          linked: true,
          sourceRowId: row.id,
          dmxChannels: resolvedChannels,
          dmxModeIndex: resolvedModeIndex,
          availableDmxModes: modes,
          beamAngle: meta.beamAngle,
          position: meta.position,
          circuit: meta.circuit,
          universe: meta.universe,
          startAddress: meta.startAddress,
          notes: meta.notes,
        });
      }
    }
    return out;
  }, [systems, linkedMeta]);

  const allLightingFixtures = useMemo<ShowFixture[]>(
    () => [...linkedFixtures, ...showFixtures],
    [linkedFixtures, showFixtures],
  );

  // ── LED Screen Report ──────────────────────────────────────────────────

  /** Panel library derived directly from the rigging report's "LED Screen"
   *  inventory. Items without pixel/physical info (e.g. Molton fabric) are
   *  filtered out. A synthetic "Custom panel…" entry is appended last. */
  const ledPanels = useMemo(
    () => buildLedPanels(inventory["LED Screen"]),
    [],
  );
  const defaultLedPanelKey = useMemo(
    () => defaultPanelKeyOf(ledPanels),
    [ledPanels],
  );

  // Garbage-collect ledLinkedMeta entries whose source rigging ledRow no
  // longer exists OR is not a panel-mappable inventory item (e.g. Molton).
  useEffect(() => {
    const liveIds = new Set<string>();
    for (const sys of systems) {
      for (const row of sys.ledRows) {
        const item = getRowItem(row);
        if (item && findPanelKeyForInventoryName(item.name, ledPanels)) {
          liveIds.add(row.id);
        }
      }
    }
    setLedLinkedMeta((all) => {
      const keys = Object.keys(all);
      const orphans = keys.filter((k) => !liveIds.has(k));
      if (orphans.length === 0) return all;
      const next: Record<string, LedLinkedMeta> = {};
      for (const k of keys) if (liveIds.has(k)) next[k] = all[k];
      return next;
    });
  }, [systems, ledPanels]);

  /** Screens auto-derived from each rigging system's ledRows. Layout
   *  (panelsWide/Tall, output, color, notes) lives in `ledLinkedMeta`
   *  keyed by source Row id; qty changes nudge the default layout. */
  const linkedLedScreens = useMemo<LedScreen[]>(() => {
    const out: LedScreen[] = [];
    let colorIdx = 0;
    for (const sys of systems) {
      for (const row of sys.ledRows) {
        const item = getRowItem(row);
        if (!item) continue;
        const detected = findPanelKeyForInventoryName(item.name, ledPanels);
        if (!detected) continue;
        const stored = ledLinkedMeta[row.id];
        const fallback = defaultLinkedLedMeta(row.qty, detected);
        const meta: LedLinkedMeta = stored ?? {
          ...fallback,
          color: LED_SCREEN_COLORS[colorIdx % LED_SCREEN_COLORS.length],
        };
        colorIdx++;
        const autoName = `${sys.name} · ${item.name}`;
        const displayName =
          meta.nameOverride && meta.nameOverride.trim().length > 0
            ? meta.nameOverride
            : autoName;
        out.push({
          id: `led-linked-${row.id}`,
          name: displayName,
          panelKey: meta.panelKey,
          panelsWide: meta.panelsWide,
          panelsTall: meta.panelsTall,
          color: meta.color,
          outputIndex: meta.outputIndex,
          notes: meta.notes,
          customPanel: meta.customPanel,
          linked: true,
          sourceRowId: row.id,
        });
      }
    }
    return out;
  }, [systems, ledLinkedMeta, ledPanels]);

  const allLedScreens = useMemo<LedScreen[]>(
    () => [...linkedLedScreens, ...ledScreens],
    [linkedLedScreens, ledScreens],
  );

  const ledTotals = useMemo(
    () => computeLedTotals(allLedScreens, ledSettings, ledPanels),
    [allLedScreens, ledSettings, ledPanels],
  );

  /** Project state assembled into the shape the brief encoder needs.
   *  Resolves hoist labels (from the App-level `hoistModels` table) and
   *  LED panel definitions (from the dynamic `ledPanels` list) here so
   *  the share modal — and the projectBrief lib — never have to reach
   *  back into App-level state. Recomputed when any source field changes. */
  const briefInput = useMemo<BuildBriefInput>(() => {
    return {
      venue,
      reportDate,
      engineer,
      // The `recipientCrewId` is overridden per-link by ShareBriefModal.
      recipientCrewId: null,
      crew,
      rigging: {
        systems: systems.map((s) => {
          const hoist = hoistModels[s.hoistIndex] ?? hoistModels[0];
          return {
            id: s.id,
            name: s.name,
            pointCount: s.pointCount,
            dynamicFactor: s.dynamicFactor,
            hoistLabel: hoist.label,
            hoistWatt: hoist.watt,
            riggingRowCount: s.riggingRows.length,
            fixtureRowCount: s.fixtureRows.length,
            ledRowCount: s.ledRows.length,
          };
        }),
      },
      lighting: {
        showFixtures: allLightingFixtures.map((f) => ({
          qty: f.qty,
          watts: f.watts,
          universe: f.universe,
        })),
        power: {
          circuits: power.circuits.map((c) => ({
            voltage: c.voltage,
            ampsPerPhase: c.ampsPerPhase,
            items: c.items.map((it) => ({
              qty: it.qty,
              wattsPerUnit: it.wattsPerUnit,
              phase: it.phase,
            })),
          })),
        },
      },
      led: {
        ledScreens: allLedScreens.map((s) => {
          const panel = resolveScreenPanel(s, ledPanels);
          return {
            id: s.id,
            name: s.name,
            panelType: panel.name,
            cols: s.panelsWide,
            rows: s.panelsTall,
            panelWatts: panel.power,
          };
        }),
        processor: findProcessor(ledSettings.processorId)?.name ?? "",
      },
      stages,
      sound: soundItems,
      riggPlan,
    };
  }, [
    venue,
    reportDate,
    engineer,
    crew,
    systems,
    allLightingFixtures,
    power,
    allLedScreens,
    ledPanels,
    ledSettings.processorId,
    stages,
    soundItems,
    riggPlan,
  ]);

  const addLedScreen = () => {
    const idx = ledScreens.length + linkedLedScreens.length;
    setLedScreens((all) => [
      ...all,
      newLedScreen(defaultLedPanelKey, {
        name: `Screen ${idx + 1}`,
        color: LED_SCREEN_COLORS[idx % LED_SCREEN_COLORS.length],
      }),
    ]);
  };

  const updateLedScreen = (id: string, patch: Partial<LedScreen>) => {
    if (id.startsWith("led-linked-")) {
      const sourceRowId = id.slice("led-linked-".length);
      // Snapshot the currently-resolved linked screen as the base for the
      // first edit, so we don't drop the qty-derived default layout when
      // the user simply changes a single field like color or notes.
      const current = allLedScreens.find((s) => s.id === id);
      const seed: LedLinkedMeta = current
        ? {
            panelKey: current.panelKey,
            panelsWide: current.panelsWide,
            panelsTall: current.panelsTall,
            color: current.color,
            outputIndex: current.outputIndex,
            notes: current.notes,
            customPanel: current.customPanel,
          }
        : defaultLinkedLedMeta(1, defaultLedPanelKey);
      setLedLinkedMeta((all) => {
        const prev = all[sourceRowId] ?? seed;
        const next: LedLinkedMeta = {
          ...prev,
          ...("panelKey" in patch ? { panelKey: patch.panelKey! } : {}),
          ...("panelsWide" in patch ? { panelsWide: patch.panelsWide! } : {}),
          ...("panelsTall" in patch ? { panelsTall: patch.panelsTall! } : {}),
          ...("color" in patch ? { color: patch.color! } : {}),
          ...("outputIndex" in patch
            ? { outputIndex: patch.outputIndex ?? null }
            : {}),
          ...("notes" in patch ? { notes: patch.notes ?? "" } : {}),
          ...("customPanel" in patch
            ? { customPanel: patch.customPanel }
            : {}),
          // Persist a user-typed display name for a linked screen. Empty
          // string clears the override and restores the auto-generated name.
          ...("name" in patch
            ? { nameOverride: patch.name ?? "" }
            : {}),
        };
        return { ...all, [sourceRowId]: next };
      });
      return;
    }
    setLedScreens((all) =>
      all.map((s) => (s.id === id ? { ...s, ...patch } : s)),
    );
  };

  const updateLedCustomPanel = (
    id: string,
    patch: Partial<LedCustomPanel>,
  ) => {
    const screen = allLedScreens.find((s) => s.id === id);
    if (!screen) return;
    const base =
      screen.customPanel ??
      ({
        pixelWidth: CUSTOM_LED_PANEL.pixelWidth,
        pixelHeight: CUSTOM_LED_PANEL.pixelHeight,
        physicalWidth: CUSTOM_LED_PANEL.physicalWidth,
        physicalHeight: CUSTOM_LED_PANEL.physicalHeight,
        weight: CUSTOM_LED_PANEL.weight,
        power: CUSTOM_LED_PANEL.power,
      } as LedCustomPanel);
    updateLedScreen(id, { customPanel: { ...base, ...patch } });
  };

  const removeLedScreen = (id: string) => {
    if (id.startsWith("led-linked-")) return; // linked rows can't be deleted here
    setLedScreens((all) => all.filter((s) => s.id !== id));
  };

  const duplicateLedScreen = (id: string) => {
    const src = allLedScreens.find((s) => s.id === id);
    if (!src) return;
    setLedScreens((all) => [
      ...all,
      newLedScreen(defaultLedPanelKey, {
        name: `${src.name} (copy)`,
        panelKey: src.panelKey,
        panelsWide: src.panelsWide,
        panelsTall: src.panelsTall,
        color: src.color,
        outputIndex: null,
        notes: src.notes,
        customPanel: src.customPanel,
      }),
    ]);
  };

  const updateLedSettings = (patch: Partial<LedSettings>) => {
    setLedSettings((s) => ({ ...s, ...patch }));
  };

  const exportLedScreen = async (id: string) => {
    const screen = allLedScreens.find((s) => s.id === id);
    if (!screen) return;
    try {
      const logoDataUrl = await getLogoDataUrl(ehsLogo);
      await exportScreenAsPng({
        screen,
        panels: ledPanels,
        settings: ledSettings,
        logoDataUrl,
      });
    } catch (err) {
      console.error("PNG export failed:", err);
      alert(
        "Could not generate the PNG. Try a smaller screen or check the console for details.",
      );
    }
  };

  // ---- Rigg Plan ----
  // Garbage-collect orphan trusses whenever a system gets deleted, so
  // the persisted blob never accumulates stale entries from removed
  // systems. Keyed on the live system-id list (stable string) so this
  // doesn't fire on every drag.
  const liveSystemIds = systems.map((s) => s.id).join("|");
  useEffect(() => {
    setRiggPlan((p) => {
      const live = new Set(systems.map((s) => s.id));
      const next: Record<string, RiggPlanTruss> = {};
      let changed = false;
      for (const [id, t] of Object.entries(p.trussById)) {
        if (live.has(id)) next[id] = t;
        else changed = true;
      }
      return changed ? { ...p, trussById: next } : p;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveSystemIds]);

  const updateRiggPlanVenue = (patch: Partial<RiggPlanVenue>) => {
    setRiggPlan((p) => {
      const venue = { ...p.venue, ...patch };
      // Re-clamp every existing truss into the new venue so shrinking
      // the venue can never leave trusses dangling outside it.
      const trussById: Record<string, RiggPlanTruss> = {};
      for (const [id, t] of Object.entries(p.trussById)) {
        trussById[id] = clampTrussToVenue(t, venue);
      }
      return { venue, trussById };
    });
  };
  const updateRiggPlanTruss = (
    systemId: string,
    patch: Partial<RiggPlanTruss>,
  ) => {
    setRiggPlan((p) => {
      const prev = p.trussById[systemId];
      const next: RiggPlanTruss = prev
        ? { ...prev, ...patch }
        : ({
            x: 0,
            y: 0,
            z: 6,
            lengthM: 6,
            rotation: 0,
            ...patch,
          } as RiggPlanTruss);
      return {
        ...p,
        trussById: { ...p.trussById, [systemId]: next },
      };
    });
  };

  // ---- Crew Report ----
  const addCrew = () => {
    setCrew((all) => [...all, makeCrewMember()]);
  };
  const updateCrew = (id: string, patch: Partial<CrewMember>) => {
    setCrew((all) => all.map((m) => (m.id === id ? { ...m, ...patch } : m)));
  };
  const removeCrew = (id: string) => {
    setCrew((all) => all.filter((m) => m.id !== id));
  };
  const duplicateCrew = (id: string) => {
    setCrew((all) => {
      const i = all.findIndex((m) => m.id === id);
      if (i < 0) return all;
      const src = all[i];
      const copy: CrewMember = {
        ...src,
        id:
          typeof crypto !== "undefined" && "randomUUID" in crypto
            ? `crew-${crypto.randomUUID()}`
            : `crew-${Date.now()}`,
        name: src.name ? `${src.name} (copy)` : "",
      };
      const next = [...all];
      next.splice(i + 1, 0, copy);
      return next;
    });
  };

  // ---- Sound Report ----
  const addSoundItem = () => {
    setSoundItems((all) => [...all, makeSoundItem()]);
  };

  /** Map an EHS library sub-category onto the in-app SoundCategory bucket
   *  used by the Sound Report. Anything we can't classify falls through to
   *  "Other" so the row is still visible. */
  const mapLibrarySoundCategory = (it: LibraryItem) => {
    const s = it.subCategory.toUpperCase();
    if (s.includes("PA")) return "PA Mains" as const;
    if (s.includes("SUB")) return "Subs" as const;
    if (s.includes("MONITOR")) return "Monitors" as const;
    if (s.includes("WIRELESS")) return "Mic Wireless" as const;
    if (s.includes("INPUT")) return "Mic Wired" as const;
    if (s.includes("CONSOLE")) return "Console" as const;
    if (s.includes("DI")) return "DI" as const;
    if (s.includes("STAND")) return "Stand" as const;
    if (s.includes("CABLE")) return "Cable" as const;
    if (s.includes("AMPLIFIER") || s.includes("SPEAKER"))
      return "PA Mains" as const;
    return "Other" as const;
  };

  /** Insert a library pick into whichever tab the picker was opened from. */
  const handleLibraryPick = (it: LibraryItem) => {
    const target = pickerTarget;
    if (!target) return;
    if (target.kind === "sound") {
      const base = makeSoundItem();
      setSoundItems((all) => [
        ...all,
        {
          ...base,
          name: it.name,
          category: mapLibrarySoundCategory(it),
          weight: it.weight,
          watts: it.watts,
          notes: it.notes ?? "",
        },
      ]);
    } else if (target.kind === "lighting") {
      const base = makeShowFixture();
      setShowFixtures((all) => [
        ...all,
        {
          ...base,
          name: it.name,
          weight: it.weight,
          watts: it.watts,
          notes: it.notes ?? "",
        },
      ]);
    } else if (target.kind === "power") {
      const circuitId = target.circuitId;
      const phase = target.phase;
      setPower((p) => {
        // Defensive: if the targeted circuit was deleted before the user
        // could pick, just append the item to the first remaining circuit
        // (or no-op if the plan is empty).
        if (!p.circuits.some((c) => c.id === circuitId)) {
          if (p.circuits.length === 0) return p;
          const fallback = p.circuits[0];
          return {
            ...p,
            circuits: p.circuits.map((c) =>
              c.id === fallback.id
                ? {
                    ...c,
                    items: [
                      ...c.items,
                      {
                        ...makePowerItem(phase),
                        name: it.name,
                        wattsPerUnit: it.watts,
                        notes: it.notes ?? "",
                      },
                    ],
                  }
                : c,
            ),
          };
        }
        return {
          ...p,
          circuits: p.circuits.map((c) =>
            c.id === circuitId
              ? {
                  ...c,
                  items: [
                    ...c.items,
                    {
                      ...makePowerItem(phase),
                      name: it.name,
                      wattsPerUnit: it.watts,
                      notes: it.notes ?? "",
                    },
                  ],
                }
              : c,
          ),
        };
      });
    }
    closePicker();
  };
  const updateSoundItem = (id: string, patch: Partial<SoundItem>) => {
    setSoundItems((all) =>
      all.map((it) => (it.id === id ? { ...it, ...patch } : it)),
    );
  };
  const removeSoundItem = (id: string) => {
    setSoundItems((all) => all.filter((it) => it.id !== id));
  };
  const duplicateSoundItem = (id: string) => {
    setSoundItems((all) => {
      const i = all.findIndex((it) => it.id === id);
      if (i < 0) return all;
      const src = all[i];
      const copy: SoundItem = {
        ...src,
        id:
          typeof crypto !== "undefined" && "randomUUID" in crypto
            ? `snd-${crypto.randomUUID()}`
            : `snd-${Date.now()}`,
        name: src.name ? `${src.name} (copy)` : "",
      };
      const next = [...all];
      next.splice(i + 1, 0, copy);
      return next;
    });
  };

  // ---- Lighting → Power Plan ----
  const addPowerCircuit = () => {
    setPower((p) => ({
      ...p,
      circuits: [...p.circuits, makePowerCircuit(p.circuits.length + 1)],
    }));
  };
  const updatePowerCircuit = (
    id: string,
    patch: Partial<Omit<PowerCircuit, "items">>,
  ) => {
    setPower((p) => ({
      ...p,
      circuits: p.circuits.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    }));
  };
  const removePowerCircuit = (id: string) => {
    setPower((p) => ({
      ...p,
      circuits: p.circuits.filter((c) => c.id !== id),
    }));
  };
  const addPowerItem = (circuitId: string, phase: PowerPhase = "L1") => {
    setPower((p) => ({
      ...p,
      circuits: p.circuits.map((c) =>
        c.id === circuitId
          ? { ...c, items: [...c.items, makePowerItem(phase)] }
          : c,
      ),
    }));
  };
  const updatePowerItem = (
    circuitId: string,
    itemId: string,
    patch: Partial<PowerItem>,
  ) => {
    setPower((p) => ({
      ...p,
      circuits: p.circuits.map((c) =>
        c.id === circuitId
          ? {
              ...c,
              items: c.items.map((it) =>
                it.id === itemId ? { ...it, ...patch } : it,
              ),
            }
          : c,
      ),
    }));
  };
  const removePowerItem = (circuitId: string, itemId: string) => {
    setPower((p) => ({
      ...p,
      circuits: p.circuits.map((c) =>
        c.id === circuitId
          ? { ...c, items: c.items.filter((it) => it.id !== itemId) }
          : c,
      ),
    }));
  };
  const duplicatePowerItem = (circuitId: string, itemId: string) => {
    setPower((p) => ({
      ...p,
      circuits: p.circuits.map((c) => {
        if (c.id !== circuitId) return c;
        const i = c.items.findIndex((it) => it.id === itemId);
        if (i < 0) return c;
        const src = c.items[i];
        const copy: PowerItem = {
          ...src,
          id:
            typeof crypto !== "undefined" && "randomUUID" in crypto
              ? `pwi-${crypto.randomUUID()}`
              : `pwi-${Date.now()}`,
          name: src.name ? `${src.name} (copy)` : "",
        };
        const next = [...c.items];
        next.splice(i + 1, 0, copy);
        return { ...c, items: next };
      }),
    }));
  };

  // ---- Stage Report ----
  const addStage = () => {
    setStages((all) => [
      ...all,
      makeDefaultStage(`Stage ${all.length + 1}`),
    ]);
  };
  const updateStage = (id: string, patch: Partial<Stage>) => {
    setStages((all) =>
      all.map((s) => (s.id === id ? { ...s, ...patch } : s)),
    );
  };
  const removeStage = (id: string) => {
    setStages((all) => all.filter((s) => s.id !== id));
  };
  const duplicateStage = (id: string) => {
    setStages((all) => {
      const i = all.findIndex((s) => s.id === id);
      if (i < 0) return all;
      const src = all[i];
      const copy: Stage = {
        ...src,
        id:
          typeof crypto !== "undefined" && "randomUUID" in crypto
            ? crypto.randomUUID()
            : `stage-${Date.now()}`,
        name: `${src.name} (copy)`,
        rails: { ...src.rails },
        // Deep-copy so the duplicate's manual placements can be edited
        // without mutating the original stage.
        manualPlacements: src.manualPlacements.map((p) => ({ ...p })),
      };
      const next = [...all];
      next.splice(i + 1, 0, copy);
      return next;
    });
  };

  /** Open a printable Stage Build Sheet for a single stage. Loads the
   *  EHS logo so the printout is fully branded; falls back to a logo-
   *  less header if the asset can't be fetched. The popup window is
   *  opened SYNCHRONOUSLY (before any await) so browsers don't classify
   *  it as a programmatic pop-up and block it. */
  const exportStage = async (id: string) => {
    const stage = stages.find((s) => s.id === id);
    if (!stage) return;
    // Open the popup immediately, in the user-gesture click context.
    const targetWin = window.open("", "_blank");
    if (targetWin) {
      // Show a brief placeholder while the logo loads.
      targetWin.document.write(
        `<!doctype html><meta charset="utf-8"><title>Generating Stage Build Sheet…</title><body style="font:14px system-ui;padding:24px;color:#64748b">Generating Stage Build Sheet…</body>`,
      );
    }
    const calc = computeStage(stage);
    let logoDataUrl: string | null = null;
    try {
      logoDataUrl = await getLogoDataUrl(ehsLogo);
    } catch {
      logoDataUrl = null;
    }
    exportStageReport({
      stage,
      calc,
      project: { venue, date: reportDate, preparedBy: engineer },
      logoDataUrl,
      targetWin,
    });
  };

  const addShowFixture = () =>
    setShowFixtures((all) => [...all, makeShowFixture()]);

  const updateShowFixture = (id: string, patch: Partial<ShowFixture>) => {
    // Linked rows: route DMX/position overlay fields into linkedMeta.
    // Base fields (name/qty/weight/watts/systemId) ignored — must be
    // edited on the rigging report.
    if (id.startsWith("linked-")) {
      const sourceRowId = id.slice("linked-".length);
      setLinkedMeta((all) => {
        const prev = all[sourceRowId] ?? defaultLinkedMeta();
        const next: LinkedMeta = {
          ...prev,
          ...(patch.dmxChannels !== undefined && {
            dmxChannels: patch.dmxChannels,
          }),
          ...(patch.dmxModeIndex !== undefined && {
            dmxModeIndex: patch.dmxModeIndex,
          }),
          ...(patch.beamAngle !== undefined && { beamAngle: patch.beamAngle }),
          ...(patch.position !== undefined && { position: patch.position }),
          ...(patch.circuit !== undefined && { circuit: patch.circuit }),
          ...(patch.universe !== undefined && { universe: patch.universe }),
          ...(patch.startAddress !== undefined && {
            startAddress: patch.startAddress,
          }),
          ...(patch.notes !== undefined && { notes: patch.notes }),
        };
        return { ...all, [sourceRowId]: next };
      });
      return;
    }
    setShowFixtures((all) =>
      all.map((f) => (f.id === id ? { ...f, ...patch } : f)),
    );
  };

  const removeShowFixture = (id: string) => {
    if (id.startsWith("linked-")) return; // can't remove linked rows here
    setShowFixtures((all) => all.filter((f) => f.id !== id));
  };

  const duplicateShowFixture = (id: string) => {
    // Duplicating a linked row creates a standalone editable copy.
    // Strip mode metadata so the standalone copy gets the plain numeric
    // DMX input (modes are inventory-driven and not meaningful once
    // detached from the rigging row); preserve the resolved channel count
    // as the starting numeric value.
    const source = allLightingFixtures.find((f) => f.id === id);
    if (!source) return;
    const copy: ShowFixture = {
      ...source,
      id: newId("fx"),
      linked: false,
      sourceRowId: undefined,
      dmxModeIndex: undefined,
      availableDmxModes: undefined,
    };
    setShowFixtures((all) => [...all, copy]);
  };

  const lightingTotals = useMemo(() => {
    let qty = 0,
      weight = 0,
      watts = 0,
      channels = 0;
    for (const f of allLightingFixtures) {
      qty += f.qty;
      weight += f.weight * f.qty;
      watts += f.watts * f.qty;
      channels += f.dmxChannels * f.qty;
    }
    const universesUsed = new Set(
      allLightingFixtures
        .filter((f) => f.dmxChannels > 0)
        .map((f) => f.universe),
    ).size;
    return { qty, weight, watts, channels, universesUsed };
  }, [allLightingFixtures]);

  const submitCustom = () => {
    if (!modalTarget) return;
    const item: InventoryItem = {
      name: `${custName || "Custom"} (${parseFloat(custWeight) || 0}kg)`,
      weight: parseFloat(custWeight) || 0,
      wattage: parseFloat(custWatt) || 0,
      area: parseFloat(custArea) || 0,
    };
    const key =
      modalTarget === "Fixtures"
        ? "fixtureRows"
        : modalTarget === "LED Screen"
          ? "ledRows"
          : "riggingRows";
    updateRowsKey(key, (rows) => [
      ...rows,
      makeCustomRow(modalTarget, item),
    ]);
    closeModal();
  };

  const downloadCsv = () => {
    const esc = (v: string | number) => {
      const s = String(v ?? "");
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const rows: string[] = [];
    rows.push(
      [
        "Project Venue",
        "Project Date",
        "Engineer",
        "System",
        "Section",
        "Item",
        "Qty",
        "Unit Weight (kg)",
        "Total Weight (kg)",
        "Unit Power (W)",
        "Total Power (W)",
        "Unit Area (m^2)",
        "Total Area (m^2)",
        "System Points",
        "System Dynamic Factor",
        "Hoist",
        "Hoist SWL (kg)",
      ]
        .map(esc)
        .join(","),
    );

    for (const sys of systems) {
      const hoist = hoistModels[sys.hoistIndex] ?? hoistModels[0];
      const lines: { row: Row; section: string }[] = [
        ...sys.riggingRows.map((r) => ({ row: r, section: "Motors & Support" })),
        ...sys.fixtureRows.map((r) => ({ row: r, section: "Lighting Fixtures" })),
        ...sys.ledRows.map((r) => ({ row: r, section: "LED & Other" })),
      ];

      // Hoist row(s) — record the hoist contribution itself
      rows.push(
        [
          venue,
          reportDate,
          engineer,
          sys.name,
          "Motors & Support",
          hoist.label,
          sys.pointCount,
          hoist.weight,
          (hoist.weight * sys.pointCount).toFixed(2),
          hoist.watt,
          hoist.watt * sys.pointCount,
          0,
          0,
          sys.pointCount,
          sys.dynamicFactor,
          hoist.label,
          hoist.swl,
        ]
          .map(esc)
          .join(","),
      );

      for (const { row, section } of lines) {
        const it = getRowItem(row);
        if (!it) continue;
        rows.push(
          [
            venue,
            reportDate,
            engineer,
            sys.name,
            section,
            it.name,
            row.qty,
            it.weight.toFixed(2),
            (it.weight * row.qty).toFixed(2),
            it.wattage,
            it.wattage * row.qty,
            it.area,
            (it.area * row.qty).toFixed(2),
            sys.pointCount,
            sys.dynamicFactor,
            hoist.label,
            hoist.swl,
          ]
            .map(esc)
            .join(","),
        );
      }
    }

    // Per-system totals + per-point loads as a separate block
    rows.push("");
    rows.push(
      [
        "System",
        "Hoist",
        "Points",
        "Dynamic Factor",
        "Static Total (kg)",
        "Dynamic Total (kg)",
        "Peak Point (kg)",
        "SWL (kg)",
        "Headroom (kg)",
        "Status",
      ]
        .map(esc)
        .join(","),
    );
    for (const { system, metrics } of allMetrics) {
      const over = metrics.peak > metrics.swl;
      rows.push(
        [
          system.name,
          hoistModels[system.hoistIndex]?.label ?? "",
          system.pointCount,
          system.dynamicFactor,
          metrics.static.toFixed(2),
          metrics.dynamic.toFixed(2),
          metrics.peak.toFixed(2),
          metrics.swl,
          metrics.headroom.toFixed(2),
          over ? "OVERLOAD" : metrics.peak / metrics.swl > 0.85 ? "Caution" : "OK",
        ]
          .map(esc)
          .join(","),
      );
    }

    rows.push("");
    rows.push(
      ["System", "Point", "Distribution %", "Static (kg)", "Dynamic (kg)", "SWL Util %", "Status"]
        .map(esc)
        .join(","),
    );
    for (const { system, metrics } of allMetrics) {
      metrics.factors.forEach((f, i) => {
        const dLoad = metrics.dynamicPointLoads[i];
        const sLoad = metrics.staticPointLoads[i];
        const util = metrics.swl > 0 ? (dLoad / metrics.swl) * 100 : 0;
        const over = dLoad > metrics.swl;
        rows.push(
          [
            system.name,
            `P${i + 1}`,
            (f * 100).toFixed(1),
            sLoad.toFixed(2),
            dLoad.toFixed(2),
            util.toFixed(1),
            over ? "OVERLOAD" : util > 85 ? "Caution" : "OK",
          ]
            .map(esc)
            .join(","),
        );
      });
    }

    const csv = "\uFEFF" + rows.join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const safeVenue = (venue || "rigging-report")
      .replace(/[^a-z0-9_-]+/gi, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 40);
    a.href = url;
    a.download = `${safeVenue || "rigging-report"}-${reportDate}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const resetAll = () => {
    if (
      !confirm(
        "Reset the entire report? All systems, gear, project info, and lighting fixtures will be cleared.",
      )
    )
      return;
    const fresh = makeSystem("LX1");
    setVenue("");
    setReportDate(new Date().toISOString().slice(0, 10));
    setEngineer("");
    setSystems([fresh]);
    setActiveSystemId(fresh.id);
    setShowFixtures([]);
    setLinkedMeta({});
    setLedScreens([]);
    setLedLinkedMeta({});
    setLedSettings(DEFAULT_LED_SETTINGS);
    setStages([]);
    setCrew([]);
    setSoundItems([]);
    setPower(defaultPowerPlan());
    setRiggPlan({ ...DEFAULT_RIGG_PLAN, trussById: {} });
    setMainView("rigging");
  };

  const metricsByActive = useMemo(() => computeMetrics(activeSystem), [activeSystem]);

  const allMetrics = useMemo(
    () => systems.map((s) => ({ system: s, metrics: computeMetrics(s) })),
    [systems],
  );

  /** Per-system summary the Rigg Plan tab needs — id, name, hoist points,
   *  static/peak load and SWL — derived from the same metrics that drive
   *  the Rigging Report so the floor plan can never disagree with it. */
  const riggPlanSystems = useMemo<RiggPlanSystemInfo[]>(
    () =>
      allMetrics.map(({ system, metrics }) => ({
        id: system.id,
        name: system.name,
        pointCount: system.pointCount,
        staticKg: metrics.static,
        peakKg: metrics.peak,
        swlKg: metrics.swl,
      })),
    [allMetrics],
  );

  const projectTotals = useMemo(() => {
    let totalStatic = 0,
      totalDynamic = 0,
      totalPower = 0,
      totalMotorPower = 0,
      totalPoints = 0,
      totalArea = 0,
      overloadedPoints = 0;
    for (const { metrics } of allMetrics) {
      totalStatic += metrics.static;
      totalDynamic += metrics.dynamic;
      totalPower += metrics.power;
      totalMotorPower += metrics.motorPower;
      totalPoints += metrics.factors.length;
      totalArea += metrics.area;
      overloadedPoints += metrics.dynamicPointLoads.filter(
        (d) => d > metrics.swl,
      ).length;
    }
    return {
      totalStatic,
      totalDynamic,
      totalPower,
      totalMotorPower,
      totalPoints,
      totalArea,
      overloadedPoints,
    };
  }, [allMetrics]);

  const renderItemRow = (
    row: Row,
    listKey: "riggingRows" | "fixtureRows" | "ledRows",
  ) => {
    const items: InventoryItem[] = row.custom
      ? [row.custom]
      : inventory[row.category as Category];
    const item = getRowItem(row);
    const subtotal = item ? item.weight * row.qty : 0;

    return (
      <div className="item-row" key={row.id}>
        <select
          value={row.custom ? 0 : row.selectedIndex}
          onChange={(e) =>
            updateRowsKey(listKey, (rows) =>
              rows.map((r) =>
                r.id === row.id
                  ? { ...r, selectedIndex: Number(e.target.value) }
                  : r,
              ),
            )
          }
          disabled={!!row.custom}
        >
          {items.map((it, i) => (
            <option key={i} value={i}>
              {it.name}
            </option>
          ))}
        </select>
        <input
          type="number"
          min={0}
          value={row.qty}
          onChange={(e) =>
            updateRowsKey(listKey, (rows) =>
              rows.map((r) =>
                r.id === row.id
                  ? { ...r, qty: Number(e.target.value) || 0 }
                  : r,
              ),
            )
          }
        />
        <div className="row-subtotal" title="Row total weight">
          {subtotal.toFixed(1)}
          <span>kg</span>
        </div>
        <button
          className="btn btn-del"
          onClick={() =>
            updateRowsKey(listKey, (rows) => rows.filter((r) => r.id !== row.id))
          }
          aria-label="Remove"
        >
          ×
        </button>
      </div>
    );
  };

  const sectionTotal = (rows: Row[]) =>
    rows.reduce((sum, r) => {
      const it = getRowItem(r);
      return sum + (it ? it.weight * r.qty : 0);
    }, 0);

  const peakColor =
    metricsByActive.peak > metricsByActive.swl
      ? "var(--danger)"
      : "var(--secondary)";
  const peakUtil =
    metricsByActive.swl > 0 ? metricsByActive.peak / metricsByActive.swl : 0;
  const utilPct = Math.min(100, peakUtil * 100);
  const utilBarColor =
    peakUtil > 1
      ? "var(--danger)"
      : peakUtil > 0.85
        ? "var(--warning)"
        : "var(--primary)";

  return (
    <div className="container">
      <div className="header">
        <div className="header-left">
          <img src={ehsLogo} alt="EHS Logo" className="header-logo-img" />
          <div className="header-title">
            <h1>
              Production <span className="header-title-accent">Tool</span>
            </h1>
          </div>
        </div>
        <div className="header-actions">
          <span className="autosave-pill" title="Saved locally in your browser">
            ● Saved {savedAt}
          </span>
          <button className="btn btn-reset" onClick={resetAll} title="Clear report">
            Reset
          </button>
          <button
            className="btn btn-theme"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          >
            <span>{theme === "dark" ? "☀" : "☾"}</span>{" "}
            <span>{theme === "dark" ? "Light" : "Dark"}</span>
          </button>
          <button className="btn btn-csv" onClick={downloadCsv} title="Download CSV">
            CSV
          </button>
          <button
            className="btn btn-export"
            onClick={() => {
              if (mainView !== "rigging") {
                setMainView("rigging");
                requestAnimationFrame(() =>
                  requestAnimationFrame(() => window.print()),
                );
              } else {
                window.print();
              }
            }}
          >
            Export Report
          </button>
          <button
            className="btn btn-export"
            onClick={() => setShareOpen(true)}
            title="Generate per-crew brief links to share with freelancers"
          >
            Share with Crew
          </button>
          <Link
            href="/portal"
            title="Go to your Freelance Portal"
            className="btn btn-reset"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              textDecoration: "none",
            }}
          >
            <span aria-hidden>◉</span>
            <span>Portal</span>
          </Link>
          <SignOutButton />
        </div>
      </div>

      {/* PROJECT META */}
      <div className="system-identity project-card">
        <div className="project-meta">
          <div className="meta-field">
            <label>Venue / Project</label>
            <input
              type="text"
              value={venue}
              onChange={(e) => setVenue(e.target.value)}
              placeholder="e.g. Sentrum Scene"
            />
          </div>
          <div className="meta-field">
            <label>Date</label>
            <input
              type="date"
              value={reportDate}
              onChange={(e) => setReportDate(e.target.value)}
            />
          </div>
          <div className="meta-field">
            <label>Prepared by</label>
            <input
              type="text"
              value={engineer}
              onChange={(e) => setEngineer(e.target.value)}
              placeholder="Name"
            />
          </div>
        </div>
      </div>

      {/* TOP-LEVEL VIEW SWITCHER */}
      <div className="view-switcher no-print">
        <button
          className={`view-tab ${mainView === "rigging" ? "is-active" : ""}`}
          onClick={() => setMainView("rigging")}
        >
          Rigging Report
        </button>
        <button
          className={`view-tab ${mainView === "lighting" ? "is-active" : ""}`}
          onClick={() => setMainView("lighting")}
        >
          Lighting Report
          {allLightingFixtures.length > 0 && (
            <span className="view-tab-badge">
              {allLightingFixtures.length}
            </span>
          )}
        </button>
        <button
          className={`view-tab ${mainView === "led" ? "is-active" : ""}`}
          onClick={() => setMainView("led")}
        >
          LED Screen Report
        </button>
        <button
          className={`view-tab ${mainView === "stage" ? "is-active" : ""}`}
          onClick={() => setMainView("stage")}
        >
          Stage Report
          {stages.length > 0 && (
            <span className="view-tab-badge">{stages.length}</span>
          )}
        </button>
        <button
          className={`view-tab ${mainView === "crew" ? "is-active" : ""}`}
          onClick={() => setMainView("crew")}
        >
          Crew Report
          {crew.length > 0 && (
            <span className="view-tab-badge">{crew.length}</span>
          )}
        </button>
        <button
          className={`view-tab ${mainView === "sound" ? "is-active" : ""}`}
          onClick={() => setMainView("sound")}
        >
          Sound Report
          {soundItems.length > 0 && (
            <span className="view-tab-badge">{soundItems.length}</span>
          )}
        </button>
        <button
          className={`view-tab ${mainView === "riggPlan" ? "is-active" : ""}`}
          onClick={() => setMainView("riggPlan")}
        >
          Rigg Plan
          {systems.length > 0 && (
            <span className="view-tab-badge">{systems.length}</span>
          )}
        </button>
      </div>

      {mainView === "rigging" && <>

      {/* PROJECT-WIDE SUMMARY */}
      <div className="dashboard project-summary">
        <div className="dash-item">
          <span>Systems</span>
          <strong>{systems.length}</strong>
          <small>total</small>
        </div>
        <div className="dash-item">
          <span>Hoists</span>
          <strong>{projectTotals.totalPoints}</strong>
          <small>points</small>
        </div>
        <div className="dash-item">
          <span>Project Static</span>
          <strong>{projectTotals.totalStatic.toFixed(1)}</strong>
          <small>kg</small>
        </div>
        <div className="dash-item">
          <span>Project Dynamic</span>
          <strong>{projectTotals.totalDynamic.toFixed(1)}</strong>
          <small>kg</small>
        </div>
        <div className="dash-item">
          <span>Project Power</span>
          <strong>{projectTotals.totalPower.toLocaleString()}</strong>
          <small>W</small>
        </div>
        <div className="dash-item">
          <span>Motor Power</span>
          <strong>{projectTotals.totalMotorPower.toLocaleString()}</strong>
          <small>W</small>
        </div>
        <div className="dash-item">
          <span>Overloads</span>
          <strong
            style={{
              color:
                projectTotals.overloadedPoints > 0
                  ? "var(--danger)"
                  : "var(--success)",
            }}
          >
            {projectTotals.overloadedPoints}
          </strong>
          <small>{projectTotals.overloadedPoints === 1 ? "point" : "points"}</small>
        </div>
      </div>

      {/* SYSTEM MINI CARDS — at-a-glance per-system summary */}
      {systems.length > 1 && (
        <div className="system-mini-grid">
          {allMetrics.map(({ system, metrics }) => {
            const over = metrics.peak > metrics.swl;
            const isActive = system.id === activeSystem.id;
            return (
              <button
                key={system.id}
                className={`system-mini ${isActive ? "is-active" : ""} ${over ? "is-over" : ""}`}
                onClick={() => setActiveSystemId(system.id)}
              >
                <div className="mini-name">{system.name || "Unnamed"}</div>
                <div className="mini-stats">
                  <span>
                    <strong>{metrics.peak.toFixed(0)}</strong>
                    <small>kg peak</small>
                  </span>
                  <span>
                    <strong>{system.pointCount}</strong>
                    <small>pts</small>
                  </span>
                  <span>
                    <strong>{metrics.swl}</strong>
                    <small>SWL</small>
                  </span>
                </div>
                <div className="mini-bar">
                  <div
                    className="mini-bar-fill"
                    style={{
                      width: `${Math.min(100, (metrics.peak / metrics.swl) * 100)}%`,
                      background: over
                        ? "var(--danger)"
                        : metrics.peak / metrics.swl > 0.85
                          ? "var(--warning)"
                          : "var(--primary)",
                    }}
                  />
                </div>
                {over && <span className="mini-over-tag">OVERLOAD</span>}
              </button>
            );
          })}
        </div>
      )}

      {/* SYSTEM TABS */}
      <div className="system-tabs no-print">
        <div className="tabs-list">
          {systems.map((s) => {
            const m = computeMetrics(s);
            const over = m.peak > m.swl;
            const isActive = s.id === activeSystem.id;
            return (
              <div
                key={s.id}
                className={`system-tab ${isActive ? "is-active" : ""} ${over ? "is-over" : ""}`}
                onClick={() => setActiveSystemId(s.id)}
                role="tab"
              >
                <span className="tab-name">{s.name || "Unnamed"}</span>
                {over && <span className="tab-over">⚠</span>}
                {systems.length > 1 && (
                  <span
                    className="tab-close"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeSystem(s.id);
                    }}
                    aria-label="Remove system"
                  >
                    ×
                  </span>
                )}
              </div>
            );
          })}
        </div>
        <div className="tabs-actions">
          <button className="btn btn-tab-action" onClick={duplicateActiveSystem}>
            Duplicate
          </button>
          <button className="btn btn-tab-action btn-tab-add" onClick={addSystem}>
            + New System
          </button>
        </div>
      </div>

      {/* ACTIVE SYSTEM IDENTITY */}
      <div className="system-identity active-system-card">
        <div className="sys-id-main">
          <label>Rigging Reference ID:</label>
          <input
            type="text"
            value={activeSystem.name}
            onChange={(e) => updateActiveSystem({ name: e.target.value })}
            placeholder="e.g. LX1, LX2, VX1"
          />
        </div>
      </div>

      {/* ACTIVE SYSTEM DASHBOARD */}
      <div className="dashboard">
        <div className="dash-item">
          <span>Static Load</span>
          <strong>{metricsByActive.static.toFixed(1)}</strong>
          <small>kg</small>
        </div>
        <div className="dash-item">
          <span>Peak Load</span>
          <strong style={{ color: peakColor }}>
            {metricsByActive.peak.toFixed(1)}
          </strong>
          <small>kg</small>
        </div>
        <div className="dash-item">
          <span>SWL Headroom</span>
          <strong
            style={{
              color:
                metricsByActive.headroom < 0
                  ? "var(--danger)"
                  : "var(--text-main)",
            }}
          >
            {metricsByActive.headroom >= 0
              ? metricsByActive.headroom.toFixed(0)
              : `−${Math.abs(metricsByActive.headroom).toFixed(0)}`}
          </strong>
          <small>kg</small>
        </div>
        <div className="dash-item">
          <span>Total Area</span>
          <strong>{metricsByActive.area.toFixed(1)}</strong>
          <small>m²</small>
        </div>
        <div className="dash-item">
          <span>Eq. Power</span>
          <strong>{metricsByActive.power.toLocaleString()}</strong>
          <small>W</small>
        </div>
        <div className="dash-item">
          <span>Motor Power</span>
          <strong>{metricsByActive.motorPower.toLocaleString()}</strong>
          <small>W</small>
        </div>
      </div>

      <div className="util-bar-wrap">
        <div className="util-bar-label">
          <span>Peak SWL Utilization — {activeSystem.name}</span>
          <strong style={{ color: utilBarColor }}>
            {(peakUtil * 100).toFixed(1)}%
          </strong>
        </div>
        <div className="util-bar-track">
          <div
            className="util-bar-fill"
            style={{ width: `${utilPct}%`, background: utilBarColor }}
          />
          <div
            className="util-bar-marker"
            style={{ left: "85%" }}
            title="85% caution"
          />
          <div
            className="util-bar-marker util-marker-danger"
            style={{ left: "100%" }}
            title="100% SWL"
          />
        </div>
        <div className="util-bar-legend">
          <span>0 kg</span>
          <span>Caution 85%</span>
          <span>SWL {metricsByActive.swl} kg</span>
        </div>
      </div>

      <div className="main-grid">
        <div className="card">
          <h2>
            1. Motors &amp; Support
            <span className="card-total">
              {sectionTotal(activeSystem.riggingRows).toFixed(1)} kg
            </span>
          </h2>
          <div className="motor-config">
            <div className="motor-config-grid">
              <div>
                <label className="field-label">Points</label>
                <select
                  value={activeSystem.pointCount}
                  onChange={(e) =>
                    updateActiveSystem({ pointCount: Number(e.target.value) })
                  }
                >
                  {[2, 3, 4, 5, 6, 7, 8].map((n) => (
                    <option key={n} value={n}>
                      {n} Points
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="field-label">Dynamic Factor</label>
                <select
                  value={activeSystem.dynamicFactor}
                  onChange={(e) =>
                    updateActiveSystem({ dynamicFactor: Number(e.target.value) })
                  }
                >
                  <option value={1.0}>1.0x (Static)</option>
                  <option value={1.25}>1.25x (Standard)</option>
                  <option value={1.5}>1.5x (Heavy)</option>
                  <option value={2.0}>2.0x (Critical)</option>
                </select>
              </div>
            </div>
            <label className="field-label" style={{ marginTop: 10 }}>
              Motor Type
            </label>
            <select
              value={activeSystem.hoistIndex}
              onChange={(e) =>
                updateActiveSystem({ hoistIndex: Number(e.target.value) })
              }
            >
              {hoistModels.map((h, i) => (
                <option key={i} value={i}>
                  {h.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            {activeSystem.riggingRows.map((r) =>
              renderItemRow(r, "riggingRows"),
            )}
          </div>
          {activeSystem.riggingRows.length === 0 && (
            <div className="empty-row">No truss added yet</div>
          )}
          <button
            className="btn btn-add"
            onClick={() =>
              updateRowsKey("riggingRows", (rows) => [
                ...rows,
                makeRow("Truss"),
              ])
            }
          >
            + Add Truss
          </button>
        </div>

        <div className="card">
          <h2>
            2. Lighting Fixtures
            <span className="card-total">
              {sectionTotal(activeSystem.fixtureRows).toFixed(1)} kg
            </span>
          </h2>
          <div>
            {activeSystem.fixtureRows.map((r) =>
              renderItemRow(r, "fixtureRows"),
            )}
          </div>
          {activeSystem.fixtureRows.length === 0 && (
            <div className="empty-row">No fixtures added yet</div>
          )}
          <button
            className="btn btn-add"
            onClick={() =>
              updateRowsKey("fixtureRows", (rows) => [
                ...rows,
                makeRow("Fixtures"),
              ])
            }
          >
            + Add Fixture
          </button>
          <button
            className="btn btn-add btn-custom"
            onClick={() => openModal("Fixtures")}
          >
            + Manual Item
          </button>
        </div>

        <div className="card">
          <h2>
            3. LED &amp; Other Equipment
            <span className="card-total">
              {sectionTotal(activeSystem.ledRows).toFixed(1)} kg
            </span>
          </h2>
          <div>
            {activeSystem.ledRows.map((r) => renderItemRow(r, "ledRows"))}
          </div>
          {activeSystem.ledRows.length === 0 && (
            <div className="empty-row">No LED or other equipment added yet</div>
          )}
          <button
            className="btn btn-add"
            onClick={() =>
              updateRowsKey("ledRows", (rows) => [
                ...rows,
                makeRow("LED Screen"),
              ])
            }
          >
            + Add Item
          </button>
          <button
            className="btn btn-add btn-custom"
            onClick={() => openModal("LED Screen")}
          >
            + Manual Item
          </button>
        </div>

        <div className="card full-width">
          <h2>4. Rigging Point Calculations — {activeSystem.name}</h2>
          <div className="analysis-container">
            <div className="points-summary">
              {metricsByActive.factors.map((f, i) => {
                const sLoad = metricsByActive.staticPointLoads[i];
                const dLoad = metricsByActive.dynamicPointLoads[i];
                const pct = Math.round(f * 100);
                const util =
                  metricsByActive.swl > 0 ? dLoad / metricsByActive.swl : 0;
                const isDanger = dLoad > metricsByActive.swl;
                const isWarning = !isDanger && util > 0.85;
                return (
                  <div
                    className={`point-box ${isDanger ? "is-danger" : isWarning ? "is-warning" : ""}`}
                    key={i}
                  >
                    {isDanger && (
                      <div className="overload-badge">
                        <span>⚠</span> OVERLOAD
                      </div>
                    )}
                    {isWarning && (
                      <div className="overload-badge warning-badge">
                        <span>⚠</span> CAUTION
                      </div>
                    )}
                    <span className="point-label">
                      POINT 0{i + 1} ({pct}%)
                    </span>
                    <span className="p-val">
                      {dLoad.toFixed(1)}
                      <small>kg</small>
                    </span>
                    <span className="p-dyn">Static: {sLoad.toFixed(0)}kg</span>
                    <div className="point-util-bar">
                      <div
                        className="point-util-fill"
                        style={{
                          width: `${Math.min(100, util * 100)}%`,
                          background: isDanger
                            ? "white"
                            : isWarning
                              ? "var(--warning)"
                              : "var(--primary)",
                        }}
                      />
                    </div>
                    <span className="p-util-text">
                      {(util * 100).toFixed(0)}% of SWL
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="chart-section">
              <div className="chart-legend">
                <span>
                  <i style={{ background: "var(--static-bar)" }} /> Static
                </span>
                <span>
                  <i style={{ background: "var(--secondary)" }} /> Dynamic ({activeSystem.dynamicFactor}x)
                </span>
                <span>
                  <i style={{ background: "var(--danger)" }} /> Over SWL
                </span>
              </div>
              <div className="bar-chart">
                {metricsByActive.factors.map((_, i) => {
                  const sLoad = metricsByActive.staticPointLoads[i];
                  const dLoad = metricsByActive.dynamicPointLoads[i];
                  const denom =
                    Math.max(metricsByActive.peak, metricsByActive.swl) || 1;
                  const sH = (sLoad / denom) * 240;
                  const dH = (dLoad / denom) * 240;
                  const barColor =
                    dLoad > metricsByActive.swl
                      ? "var(--danger)"
                      : "var(--secondary)";
                  return (
                    <div className="bar-group" key={i}>
                      <div className="bars-side-by-side">
                        <div
                          className="bar"
                          style={{
                            height: `${sH}px`,
                            background: "var(--static-bar)",
                          }}
                          data-value={sLoad.toFixed(0)}
                        />
                        <div
                          className="bar"
                          style={{ height: `${dH}px`, background: barColor }}
                          data-value={dLoad.toFixed(0)}
                        />
                      </div>
                    </div>
                  );
                })}
                <div
                  className="swl-line"
                  style={{
                    bottom: `${(metricsByActive.swl / (Math.max(metricsByActive.peak, metricsByActive.swl) || 1)) * 240}px`,
                  }}
                  title={`SWL ${metricsByActive.swl}kg`}
                >
                  <span>SWL {metricsByActive.swl}kg</span>
                </div>
              </div>
              <div className="vis-container">
                {metricsByActive.factors.map((f, i) => (
                  <div className="vis-point" key={i}>
                    <div className="vis-arrow" />
                    <span className="vis-pct">{Math.round(f * 100)}%</span>
                    <span className="vis-label">P{i + 1}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* PRINT PER-SYSTEM PAGES */}
          <div className="print-only print-systems">
            {allMetrics.map(({ system, metrics }) => (
              <div className="print-system-page" key={system.id}>
                <h3 className="print-system-title">
                  {system.name} —{" "}
                  {hoistModels[system.hoistIndex]?.label ?? "Hoist"}
                </h3>
                <div className="print-system-stats">
                  <span>
                    Static: <strong>{metrics.static.toFixed(1)} kg</strong>
                  </span>
                  <span>
                    Dynamic ({system.dynamicFactor}x):{" "}
                    <strong>{metrics.dynamic.toFixed(1)} kg</strong>
                  </span>
                  <span>
                    Peak point:{" "}
                    <strong
                      style={{
                        color:
                          metrics.peak > metrics.swl
                            ? "var(--danger)"
                            : "inherit",
                      }}
                    >
                      {metrics.peak.toFixed(1)} kg
                    </strong>
                  </span>
                  <span>
                    SWL: <strong>{metrics.swl} kg</strong>
                  </span>
                  <span>
                    Headroom:{" "}
                    <strong
                      style={{
                        color:
                          metrics.headroom < 0 ? "var(--danger)" : "inherit",
                      }}
                    >
                      {metrics.headroom.toFixed(0)} kg
                    </strong>
                  </span>
                </div>
                <table className="print-table print-points-table">
                  <thead>
                    <tr>
                      <th>Point</th>
                      <th>%</th>
                      <th>Static (kg)</th>
                      <th>Dynamic (kg)</th>
                      <th>SWL Util</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {metrics.factors.map((f, i) => {
                      const dLoad = metrics.dynamicPointLoads[i];
                      const sLoad = metrics.staticPointLoads[i];
                      const util = dLoad / metrics.swl;
                      const over = dLoad > metrics.swl;
                      return (
                        <tr key={i} className={over ? "print-over-row" : ""}>
                          <td>P{i + 1}</td>
                          <td>{Math.round(f * 100)}%</td>
                          <td>{sLoad.toFixed(1)}</td>
                          <td>{dLoad.toFixed(1)}</td>
                          <td>{(util * 100).toFixed(0)}%</td>
                          <td>{over ? "OVERLOAD" : util > 0.85 ? "Caution" : "OK"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                <table className="print-table print-manifest-table">
                  <thead>
                    <tr>
                      <th>Section</th>
                      <th>Item</th>
                      <th>Qty</th>
                      <th>Unit Wt</th>
                      <th>Total Wt</th>
                      <th>Power</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      ...system.riggingRows.map((r) => ({
                        row: r,
                        section: "Motors & Support",
                      })),
                      ...system.fixtureRows.map((r) => ({
                        row: r,
                        section: "Lighting Fixtures",
                      })),
                      ...system.ledRows.map((r) => ({
                        row: r,
                        section: "LED & Other",
                      })),
                    ].map(({ row, section }) => {
                      const it = getRowItem(row);
                      if (!it) return null;
                      return (
                        <tr key={row.id}>
                          <td>{section}</td>
                          <td>{it.name}</td>
                          <td>{row.qty}</td>
                          <td>{it.weight.toFixed(2)} kg</td>
                          <td>{(it.weight * row.qty).toFixed(2)} kg</td>
                          <td>{(it.wattage * row.qty).toLocaleString()} W</td>
                        </tr>
                      );
                    })}
                    <tr className="print-table-total">
                      <td colSpan={4}>Payload total</td>
                      <td>{metrics.payload.toFixed(2)} kg</td>
                      <td>{metrics.power.toLocaleString()} W</td>
                    </tr>
                    <tr className="print-table-grand">
                      <td colSpan={4}>Static (incl. {system.pointCount} hoists)</td>
                      <td>{metrics.static.toFixed(2)} kg</td>
                      <td>{metrics.motorPower.toLocaleString()} W</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            ))}

            <div className="print-system-page">
              <h3 className="print-system-title">Project Totals</h3>
              <table className="print-table">
                <thead>
                  <tr>
                    <th>System</th>
                    <th>Hoist</th>
                    <th>Pts</th>
                    <th>Static (kg)</th>
                    <th>Dynamic (kg)</th>
                    <th>Peak (kg)</th>
                    <th>SWL</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {allMetrics.map(({ system, metrics }) => {
                    const over = metrics.peak > metrics.swl;
                    return (
                      <tr key={system.id} className={over ? "print-over-row" : ""}>
                        <td>{system.name}</td>
                        <td>{hoistModels[system.hoistIndex]?.label ?? "—"}</td>
                        <td>{system.pointCount}</td>
                        <td>{metrics.static.toFixed(1)}</td>
                        <td>{metrics.dynamic.toFixed(1)}</td>
                        <td>{metrics.peak.toFixed(1)}</td>
                        <td>{metrics.swl}</td>
                        <td>{over ? "OVERLOAD" : "OK"}</td>
                      </tr>
                    );
                  })}
                  <tr className="print-table-grand">
                    <td colSpan={2}>Project total</td>
                    <td>{projectTotals.totalPoints}</td>
                    <td>{projectTotals.totalStatic.toFixed(1)}</td>
                    <td>{projectTotals.totalDynamic.toFixed(1)}</td>
                    <td colSpan={3}>
                      {projectTotals.totalMotorPower.toLocaleString()} W motor power
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="footer">
            <div className="footer-company">EHS AS</div>
            <div className="footer-address">
              Kjeller vest 3, 2007 Kjeller, Norway | Tel: 22 38 90 20 |
              www.ehs.no
            </div>
            <div className="footer-disclaimer">
              Calculations based on EXE Rise D8+ Specifications. Motor weights
              include 24m of chain. Specifications (Safety Factor 8:1).
            </div>
          </div>
        </div>
      </div>

      </>}

      {mainView === "stage" && (
        <StageReportView
          stages={stages}
          onAdd={addStage}
          onUpdate={updateStage}
          onRemove={removeStage}
          onDuplicate={duplicateStage}
          onExport={exportStage}
        />
      )}

      {mainView === "crew" && (
        <CrewReportView
          crew={crew}
          onAdd={addCrew}
          onUpdate={updateCrew}
          onRemove={removeCrew}
          onDuplicate={duplicateCrew}
        />
      )}

      {mainView === "sound" && (
        <SoundReportView
          items={soundItems}
          onAdd={addSoundItem}
          onAddFromLibrary={() => setPickerTarget({ kind: "sound" })}
          onUpdate={updateSoundItem}
          onRemove={removeSoundItem}
          onDuplicate={duplicateSoundItem}
        />
      )}

      {mainView === "riggPlan" && (
        <RiggPlanView
          plan={riggPlan}
          systems={riggPlanSystems}
          onUpdateVenue={updateRiggPlanVenue}
          onUpdateTruss={updateRiggPlanTruss}
          onJumpToRigging={() => setMainView("rigging")}
        />
      )}

      {mainView === "led" && (
        <LedScreenReportView
          screens={allLedScreens}
          panels={ledPanels}
          settings={ledSettings}
          totals={ledTotals}
          linkedCount={linkedLedScreens.length}
          standaloneCount={ledScreens.length}
          onAddScreen={addLedScreen}
          onUpdateScreen={updateLedScreen}
          onUpdateCustomPanel={updateLedCustomPanel}
          onRemoveScreen={removeLedScreen}
          onDuplicateScreen={duplicateLedScreen}
          onUpdateSettings={updateLedSettings}
          onExportScreen={exportLedScreen}
          onJumpToRigging={() => setMainView("rigging")}
        />
      )}

      {mainView === "lighting" && (
        <LightingPlanView
          fixtures={allLightingFixtures}
          linkedCount={linkedFixtures.length}
          standaloneCount={showFixtures.length}
          systems={systems}
          totals={lightingTotals}
          onAdd={addShowFixture}
          onUpdate={updateShowFixture}
          onRemove={removeShowFixture}
          onDuplicate={duplicateShowFixture}
          onJumpToRigging={() => setMainView("rigging")}
          onAddFromLibrary={() => setPickerTarget({ kind: "lighting" })}
          onAddPowerItemFromLibrary={(circuitId, phase) =>
            setPickerTarget({ kind: "power", circuitId, phase })
          }
          power={power}
          onAddPowerCircuit={addPowerCircuit}
          onUpdatePowerCircuit={updatePowerCircuit}
          onRemovePowerCircuit={removePowerCircuit}
          onAddPowerItem={addPowerItem}
          onUpdatePowerItem={updatePowerItem}
          onRemovePowerItem={removePowerItem}
          onDuplicatePowerItem={duplicatePowerItem}
        />
      )}

      {shareOpen ? (
        <ShareBriefModal
          state={briefInput}
          onClose={() => setShareOpen(false)}
        />
      ) : null}

      <EquipmentPicker
        open={pickerTarget !== null}
        tab={
          pickerTarget?.kind === "sound"
            ? "sound"
            : pickerTarget?.kind === "lighting"
              ? "lighting"
              : pickerTarget?.kind === "power"
                ? "power"
                : undefined
        }
        onClose={closePicker}
        onPick={handleLibraryPick}
      />

      {modalTarget && (
        <div className="modal-backdrop" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Add Custom Item</h3>
            <input
              type="text"
              placeholder="Item Name"
              value={custName}
              onChange={(e) => setCustName(e.target.value)}
            />
            <input
              type="number"
              placeholder="Weight (kg)"
              value={custWeight}
              onChange={(e) => setCustWeight(e.target.value)}
            />
            <input
              type="number"
              placeholder="Power (W)"
              value={custWatt}
              onChange={(e) => setCustWatt(e.target.value)}
            />
            <input
              type="number"
              placeholder="Area per unit (m²)"
              step="0.01"
              value={custArea}
              onChange={(e) => setCustArea(e.target.value)}
            />
            <div className="modal-actions">
              <button className="btn btn-export" onClick={submitCustom}>
                Add
              </button>
              <button className="btn btn-custom" onClick={closeModal}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

type LightingPlanViewProps = {
  fixtures: ShowFixture[];
  linkedCount: number;
  standaloneCount: number;
  systems: System[];
  totals: {
    qty: number;
    weight: number;
    watts: number;
    channels: number;
    universesUsed: number;
  };
  onAdd: () => void;
  onUpdate: (id: string, patch: Partial<ShowFixture>) => void;
  onRemove: (id: string) => void;
  onDuplicate: (id: string) => void;
  onJumpToRigging: () => void;
  onAddFromLibrary: () => void;
  onAddPowerItemFromLibrary: (circuitId: string, phase: PowerPhase) => void;
  power: PowerPlan;
  onAddPowerCircuit: () => void;
  onUpdatePowerCircuit: (
    id: string,
    patch: Partial<Omit<PowerCircuit, "items">>,
  ) => void;
  onRemovePowerCircuit: (id: string) => void;
  onAddPowerItem: (circuitId: string, phase?: PowerPhase) => void;
  onUpdatePowerItem: (
    circuitId: string,
    itemId: string,
    patch: Partial<PowerItem>,
  ) => void;
  onRemovePowerItem: (circuitId: string, itemId: string) => void;
  onDuplicatePowerItem: (circuitId: string, itemId: string) => void;
};

function LightingPlanView({
  fixtures,
  linkedCount,
  standaloneCount,
  systems,
  totals,
  onAdd,
  onUpdate,
  onRemove,
  onDuplicate,
  onJumpToRigging,
  onAddFromLibrary,
  onAddPowerItemFromLibrary,
  power,
  onAddPowerCircuit,
  onUpdatePowerCircuit,
  onRemovePowerCircuit,
  onAddPowerItem,
  onUpdatePowerItem,
  onRemovePowerItem,
  onDuplicatePowerItem,
}: LightingPlanViewProps) {
  const systemNameById = new Map(systems.map((s) => [s.id, s.name]));
  return (
    <>
      <div className="dashboard project-summary">
        <div className="dash-item">
          <span>Fixtures</span>
          <strong>{totals.qty}</strong>
          <small>units</small>
        </div>
        <div className="dash-item">
          <span>Weight</span>
          <strong>{totals.weight.toFixed(1)}</strong>
          <small>kg</small>
        </div>
        <div className="dash-item">
          <span>Power</span>
          <strong>{totals.watts.toLocaleString()}</strong>
          <small>W</small>
        </div>
        <div className="dash-item">
          <span>DMX Channels</span>
          <strong>{totals.channels.toLocaleString()}</strong>
          <small>used</small>
        </div>
        <div className="dash-item">
          <span>Universes</span>
          <strong>{totals.universesUsed}</strong>
          <small>active</small>
        </div>
        <div className="dash-item">
          <span>Lines</span>
          <strong>{fixtures.length}</strong>
          <small>entries</small>
        </div>
      </div>

      <PowerPlanView
        plan={power}
        onAddCircuit={onAddPowerCircuit}
        onUpdateCircuit={onUpdatePowerCircuit}
        onRemoveCircuit={onRemovePowerCircuit}
        onAddItem={onAddPowerItem}
        onAddItemFromLibrary={onAddPowerItemFromLibrary}
        onUpdateItem={onUpdatePowerItem}
        onRemoveItem={onRemovePowerItem}
        onDuplicateItem={onDuplicatePowerItem}
      />

      <div className="card">
        <h2>
          Show Fixture List
          <span className="card-total">
            {fixtures.length} {fixtures.length === 1 ? "line" : "lines"}
            {linkedCount > 0 && (
              <span className="fx-source-tally">
                {" "}
                · {linkedCount} from rigging · {standaloneCount} extra
              </span>
            )}
          </span>
        </h2>
        <div className="lighting-help">
          Fixtures you add to the rigging report appear here automatically.
          Add DMX address, position and circuit on this view; everything else
          stays in sync with rigging.{" "}
          <button
            type="button"
            className="link-btn"
            onClick={onJumpToRigging}
          >
            Open Rigging Report
          </button>
        </div>
        {fixtures.length === 0 ? (
          <div className="lighting-empty">
            No fixtures yet. Add some on the{" "}
            <button
              type="button"
              className="link-btn"
              onClick={onJumpToRigging}
            >
              Rigging Report
            </button>{" "}
            (they will sync here automatically), or click{" "}
            <strong>+ Add Extra Fixture</strong> below for one-off entries.
          </div>
        ) : (
          <div className="fx-table-wrap">
            <table className="fx-table">
              <thead>
                <tr>
                  <th style={{ minWidth: 200 }}>Fixture</th>
                  <th>Qty</th>
                  <th>Weight (kg)</th>
                  <th>Power (W)</th>
                  <th>DMX Ch</th>
                  <th>Truss</th>
                  <th>Pos (m)</th>
                  <th>Circuit</th>
                  <th>Univ.</th>
                  <th>Address</th>
                  <th>End</th>
                  <th>Total Wt</th>
                  <th>Total W</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {fixtures.map((f) => {
                  const totalChans = f.dmxChannels * f.qty;
                  const endAddr =
                    totalChans > 0
                      ? f.startAddress + totalChans - 1
                      : 0;
                  const overflow = endAddr > 512;
                  const totalWt = f.weight * f.qty;
                  const totalW = f.watts * f.qty;
                  const linkedSysName = f.linked
                    ? systemNameById.get(f.systemId) ?? "—"
                    : "";
                  return (
                    <tr
                      key={f.id}
                      className={f.linked ? "fx-row-linked" : undefined}
                    >
                      <td>
                        {f.linked ? (
                          <div className="fx-linked-cell">
                            <span
                              className="fx-link-badge"
                              title={`From rigging system ${linkedSysName}`}
                            >
                              {linkedSysName}
                            </span>
                            <span
                              className="fx-linked-name"
                              title={f.name}
                            >
                              {f.name}
                            </span>
                          </div>
                        ) : (
                          <input
                            type="text"
                            value={f.name}
                            onChange={(e) =>
                              onUpdate(f.id, { name: e.target.value })
                            }
                            placeholder="e.g. Martin MAC Aura PXL"
                            className="fx-input fx-input-name"
                            aria-label="Fixture name"
                          />
                        )}
                      </td>
                      <td>
                        {f.linked ? (
                          <span className="fx-readonly fx-readonly-num">
                            {f.qty}
                          </span>
                        ) : (
                          <input
                            type="number"
                            min={1}
                            step={1}
                            value={f.qty}
                            onChange={(e) =>
                              onUpdate(f.id, {
                                qty: Math.max(
                                  1,
                                  Math.floor(Number(e.target.value) || 1),
                                ),
                              })
                            }
                            className="fx-input fx-input-num"
                            aria-label="Quantity"
                          />
                        )}
                      </td>
                      <td>
                        {f.linked ? (
                          <span className="fx-readonly fx-readonly-num">
                            {f.weight.toFixed(1)}
                          </span>
                        ) : (
                          <input
                            type="number"
                            step="0.1"
                            min={0}
                            value={f.weight}
                            onChange={(e) =>
                              onUpdate(f.id, {
                                weight: Math.max(
                                  0,
                                  Number(e.target.value) || 0,
                                ),
                              })
                            }
                            className="fx-input fx-input-num"
                            aria-label="Weight per fixture in kilograms"
                          />
                        )}
                      </td>
                      <td>
                        {f.linked ? (
                          <span className="fx-readonly fx-readonly-num">
                            {f.watts}
                          </span>
                        ) : (
                          <input
                            type="number"
                            min={0}
                            value={f.watts}
                            onChange={(e) =>
                              onUpdate(f.id, {
                                watts: Math.max(
                                  0,
                                  Number(e.target.value) || 0,
                                ),
                              })
                            }
                            className="fx-input fx-input-num"
                            aria-label="Power per fixture in watts"
                          />
                        )}
                      </td>
                      <td>
                        {f.availableDmxModes &&
                        f.availableDmxModes.length > 0 ? (
                          <div className="fx-mode-cell">
                            <select
                              value={
                                f.dmxModeIndex === null ||
                                f.dmxModeIndex === undefined
                                  ? -1
                                  : f.dmxModeIndex
                              }
                              onChange={(e) => {
                                const v = Number(e.target.value);
                                if (v === -1) {
                                  // Switch to Custom — keep current channel
                                  // count as the starting custom value.
                                  onUpdate(f.id, {
                                    dmxModeIndex: null,
                                    dmxChannels: f.dmxChannels,
                                  });
                                } else {
                                  onUpdate(f.id, { dmxModeIndex: v });
                                }
                              }}
                              className="fx-input fx-input-select fx-mode-select"
                              aria-label="DMX mode"
                            >
                              {f.availableDmxModes.map((m, i) => (
                                <option key={i} value={i}>
                                  {m.name} ({m.channels}ch)
                                </option>
                              ))}
                              <option value={-1}>Custom…</option>
                            </select>
                            {f.dmxModeIndex === null ? (
                              <input
                                type="number"
                                min={0}
                                step={1}
                                value={f.dmxChannels}
                                onChange={(e) =>
                                  onUpdate(f.id, {
                                    dmxChannels: Math.max(
                                      0,
                                      Math.floor(Number(e.target.value) || 0),
                                    ),
                                  })
                                }
                                className="fx-input fx-input-num fx-mode-custom"
                                aria-label="DMX channels per fixture (custom)"
                              />
                            ) : (
                              <span
                                className="fx-mode-channels"
                                aria-label="DMX channels per fixture"
                              >
                                {f.dmxChannels}
                              </span>
                            )}
                          </div>
                        ) : (
                          <input
                            type="number"
                            min={0}
                            step={1}
                            value={f.dmxChannels}
                            onChange={(e) =>
                              onUpdate(f.id, {
                                dmxChannels: Math.max(
                                  0,
                                  Math.floor(Number(e.target.value) || 0),
                                ),
                              })
                            }
                            className="fx-input fx-input-num"
                            aria-label="DMX channels per fixture"
                          />
                        )}
                      </td>
                      <td>
                        {f.linked ? (
                          <span className="fx-readonly">{linkedSysName}</span>
                        ) : (
                          <select
                            value={f.systemId}
                            onChange={(e) =>
                              onUpdate(f.id, { systemId: e.target.value })
                            }
                            className="fx-input fx-input-select"
                            aria-label="Truss assignment"
                          >
                            <option value="">—</option>
                            {systems.map((s) => (
                              <option key={s.id} value={s.id}>
                                {s.name}
                              </option>
                            ))}
                          </select>
                        )}
                      </td>
                      <td>
                        <input
                          type="number"
                          step="0.1"
                          value={f.position}
                          onChange={(e) =>
                            onUpdate(f.id, {
                              position: Number(e.target.value) || 0,
                            })
                          }
                          className="fx-input fx-input-num"
                          aria-label="Position on truss in meters"
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          value={f.circuit}
                          onChange={(e) =>
                            onUpdate(f.id, { circuit: e.target.value })
                          }
                          placeholder="—"
                          className="fx-input fx-input-circuit"
                          aria-label="Power circuit"
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          min={1}
                          step={1}
                          value={f.universe}
                          onChange={(e) =>
                            onUpdate(f.id, {
                              universe: Math.max(
                                1,
                                Math.floor(Number(e.target.value) || 1),
                              ),
                            })
                          }
                          className="fx-input fx-input-num"
                          aria-label="DMX universe"
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          min={1}
                          max={512}
                          step={1}
                          value={f.startAddress}
                          onChange={(e) =>
                            onUpdate(f.id, {
                              startAddress: Math.max(
                                1,
                                Math.min(
                                  512,
                                  Math.floor(Number(e.target.value) || 1),
                                ),
                              ),
                            })
                          }
                          className="fx-input fx-input-num"
                          aria-label="DMX start address"
                        />
                      </td>
                      <td
                        className={`fx-end ${overflow ? "fx-end-over" : ""}`}
                        title={
                          overflow
                            ? "Exceeds 512 channels — bump start address or universe"
                            : ""
                        }
                      >
                        {endAddr || "—"}
                        {overflow && " ⚠"}
                      </td>
                      <td className="fx-total">{totalWt.toFixed(1)}</td>
                      <td className="fx-total">{totalW.toLocaleString()}</td>
                      <td className="fx-actions">
                        <button
                          className="fx-row-btn"
                          onClick={() => onDuplicate(f.id)}
                          title={
                            f.linked
                              ? "Copy as a standalone editable row"
                              : "Duplicate row"
                          }
                          aria-label={
                            f.linked
                              ? "Copy as standalone row"
                              : "Duplicate row"
                          }
                        >
                          ⎘
                        </button>
                        {f.linked ? (
                          <button
                            className="fx-row-btn fx-row-btn-jump"
                            onClick={onJumpToRigging}
                            title="Edit qty/weight on the Rigging Report"
                            aria-label="Edit on Rigging Report"
                          >
                            ↗
                          </button>
                        ) : (
                          <button
                            className="fx-row-btn fx-row-btn-del"
                            onClick={() => onRemove(f.id)}
                            title="Delete row"
                            aria-label="Delete row"
                          >
                            ×
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              {fixtures.length > 0 && (
                <tfoot>
                  <tr>
                    <td colSpan={12} style={{ textAlign: "right" }}>
                      <strong>Totals</strong>
                    </td>
                    <td className="fx-total">{totals.weight.toFixed(1)}</td>
                    <td className="fx-total">
                      {totals.watts.toLocaleString()}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}
        <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <button className="btn btn-soft" onClick={onAddFromLibrary}>
            + From EHS Library
          </button>
          <button className="btn btn-export" onClick={onAdd}>
            + Add Extra Fixture
          </button>
          <span className="lighting-help" style={{ marginLeft: 4 }}>
            Use these for one-off fixtures that aren't on the rigging report.
          </span>
        </div>
      </div>
    </>
  );
}

export default App;
