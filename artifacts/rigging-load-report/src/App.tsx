import { useEffect, useMemo, useRef, useState } from "react";
import "./index.css";

type InventoryItem = {
  name: string;
  weight: number;
  wattage: number;
  area: number;
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
    { name: "Clay Paky Mythos 2 (32.0kg)", weight: 32.0, wattage: 800, area: 0 },
    { name: "Elation DTW Blinder 350 IP (11.0kg)", weight: 11.0, wattage: 310, area: 0 },
    { name: "Martin PowerPort 1500", weight: 0, wattage: 1100, area: 0 },
    { name: "MDG ATMe Haze", weight: 0, wattage: 715, area: 0 },
    { name: "Stage Fan / AF-1", weight: 0, wattage: 120, area: 0 },
    { name: "Astera Titan Tube (1.35kg)", weight: 1.35, wattage: 72, area: 0 },
    { name: "Astera AX2 1m PixelBar (7.4kg)", weight: 7.4, wattage: 80, area: 0 },
    { name: "Astera AX5 TriplePAR (3.4kg)", weight: 3.4, wattage: 45, area: 0 },
    { name: "Astera AX9 PowerPar (5.66kg)", weight: 5.66, wattage: 110, area: 0 },
    { name: "Astera Pixel Brick (1.12kg)", weight: 1.12, wattage: 20, area: 0 },
    { name: "Martin MAC Aura (6.6kg)", weight: 6.6, wattage: 260, area: 0 },
    { name: "Martin MAC Aura XB (7.5kg)", weight: 7.5, wattage: 260, area: 0 },
    { name: "Martin MAC Aura XIP (10.0kg)", weight: 10.0, wattage: 340, area: 0 },
    { name: "Martin MAC Aura PXL (15.6kg)", weight: 15.6, wattage: 560, area: 0 },
    { name: "Martin MAC One (5.4kg)", weight: 5.4, wattage: 160, area: 0 },
    { name: "Martin MAC Viper XIP (37.8kg)", weight: 37.8, wattage: 1040, area: 0 },
    { name: "Martin MAC Viper AirFX (36.7kg)", weight: 36.7, wattage: 1225, area: 0 },
    { name: "SnowARC Pro Quad 40 mkII (10.5kg)", weight: 10.5, wattage: 390, area: 0 },
    { name: "DTS NICK NRG 1201 (12.9kg)", weight: 12.9, wattage: 340, area: 0 },
    { name: "Elation Pulse Panel FX (14.4kg)", weight: 14.4, wattage: 900, area: 0 },
    { name: "Chauvet Color STRIKE M (13.1kg)", weight: 13.1, wattage: 740, area: 0 },
    { name: "Martin RUSH MH 7 Hybrid (25.0kg)", weight: 25.0, wattage: 450, area: 0 },
  ],
  "LED Screen": [
    { name: "Uniview UR Pro 1x0.5m (10.8kg)", weight: 10.8, wattage: 350, area: 0.5 },
    { name: "Uniview UR Pro 0.5x0.5m (7.2kg)", weight: 7.2, wattage: 175, area: 0.25 },
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

let rowIdCounter = 0;
const newId = () => `row-${++rowIdCounter}-${Math.random().toString(36).slice(2, 8)}`;

function makeRow(category: Category, qty = 1): Row {
  return { id: newId(), category, selectedIndex: 0, qty };
}

function makeCustomRow(targetCategory: Category, item: InventoryItem): Row {
  return { id: newId(), category: targetCategory, selectedIndex: -1, qty: 1, custom: item };
}

function getRowItem(row: Row): InventoryItem | undefined {
  if (row.custom) return row.custom;
  if (row.category === "Custom") return undefined;
  return inventory[row.category as Category][row.selectedIndex];
}

const STORAGE_KEY = "ehs-rigging-report-v1";

type PersistedState = {
  theme: "light" | "dark";
  systemName: string;
  venue: string;
  reportDate: string;
  engineer: string;
  pointCount: number;
  dynamicFactor: number;
  hoistIndex: number;
  riggingRows: Row[];
  fixtureRows: Row[];
  ledRows: Row[];
};

function loadPersisted(): Partial<PersistedState> | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Partial<PersistedState>;
  } catch {
    return null;
  }
}

function App() {
  const persisted = useRef<Partial<PersistedState> | null>(loadPersisted()).current;

  const [theme, setTheme] = useState<"light" | "dark">(persisted?.theme ?? "light");
  const [systemName, setSystemName] = useState(persisted?.systemName ?? "");
  const [venue, setVenue] = useState(persisted?.venue ?? "");
  const [reportDate, setReportDate] = useState(
    persisted?.reportDate ?? new Date().toISOString().slice(0, 10),
  );
  const [engineer, setEngineer] = useState(persisted?.engineer ?? "");
  const [pointCount, setPointCount] = useState<number>(persisted?.pointCount ?? 3);
  const [dynamicFactor, setDynamicFactor] = useState<number>(
    persisted?.dynamicFactor ?? 1.25,
  );
  const [hoistIndex, setHoistIndex] = useState<number>(persisted?.hoistIndex ?? 0);

  const [riggingRows, setRiggingRows] = useState<Row[]>(
    persisted?.riggingRows ?? [makeRow("Truss", 4)],
  );
  const [fixtureRows, setFixtureRows] = useState<Row[]>(
    persisted?.fixtureRows ?? [],
  );
  const [ledRows, setLedRows] = useState<Row[]>(persisted?.ledRows ?? []);

  const [modalTarget, setModalTarget] = useState<Category | null>(null);
  const [custName, setCustName] = useState("");
  const [custWeight, setCustWeight] = useState("");
  const [custWatt, setCustWatt] = useState("");
  const [custArea, setCustArea] = useState("");

  const [savedAt, setSavedAt] = useState<string>("");

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  // Auto-save to localStorage
  useEffect(() => {
    const data: PersistedState = {
      theme,
      systemName,
      venue,
      reportDate,
      engineer,
      pointCount,
      dynamicFactor,
      hoistIndex,
      riggingRows,
      fixtureRows,
      ledRows,
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      const now = new Date();
      setSavedAt(
        now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      );
    } catch {
      /* ignore quota errors */
    }
  }, [
    theme,
    systemName,
    venue,
    reportDate,
    engineer,
    pointCount,
    dynamicFactor,
    hoistIndex,
    riggingRows,
    fixtureRows,
    ledRows,
  ]);

  const hoist = hoistModels[hoistIndex];

  const { totalPayload, totalPower, totalArea, allRows } = useMemo(() => {
    let payload = 0,
      power = 0,
      area = 0;
    const all = [
      ...riggingRows.map((r) => ({ row: r, section: "Motors & Support" as const })),
      ...fixtureRows.map((r) => ({ row: r, section: "Lighting Fixtures" as const })),
      ...ledRows.map((r) => ({ row: r, section: "LED & Other" as const })),
    ];
    for (const { row } of all) {
      const item = getRowItem(row);
      if (!item) continue;
      payload += item.weight * row.qty;
      power += item.wattage * row.qty;
      area += item.area * row.qty;
    }
    return { totalPayload: payload, totalPower: power, totalArea: area, allRows: all };
  }, [riggingRows, fixtureRows, ledRows]);

  const totalMotorPower = hoist.watt * pointCount;
  const totalStaticWeight = totalPayload + pointCount * hoist.weight;
  const totalDynamicWeight = totalStaticWeight * dynamicFactor;

  const factors = distributionFactors[pointCount];
  const dynamicPointLoads = factors.map((f) => totalDynamicWeight * f);
  const staticPointLoads = factors.map((f) => totalStaticWeight * f);
  const maxVal = Math.max(...dynamicPointLoads);
  const swl = hoist.swl;
  const peakUtil = swl > 0 ? maxVal / swl : 0;
  const headroom = swl - maxVal;

  const updateRow = (
    setter: React.Dispatch<React.SetStateAction<Row[]>>,
    id: string,
    updates: Partial<Row>,
  ) => {
    setter((rows) => rows.map((r) => (r.id === id ? { ...r, ...updates } : r)));
  };

  const removeRow = (
    setter: React.Dispatch<React.SetStateAction<Row[]>>,
    id: string,
  ) => {
    setter((rows) => rows.filter((r) => r.id !== id));
  };

  const addRowTo = (
    setter: React.Dispatch<React.SetStateAction<Row[]>>,
    category: Category,
  ) => {
    setter((rows) => [...rows, makeRow(category)]);
  };

  const openModal = (category: Category) => {
    setModalTarget(category);
    setCustName("");
    setCustWeight("");
    setCustWatt("");
    setCustArea("");
  };

  const closeModal = () => setModalTarget(null);

  const submitCustom = () => {
    if (!modalTarget) return;
    const item: InventoryItem = {
      name: `${custName || "Custom"} (${parseFloat(custWeight) || 0}kg)`,
      weight: parseFloat(custWeight) || 0,
      wattage: parseFloat(custWatt) || 0,
      area: parseFloat(custArea) || 0,
    };
    const setter =
      modalTarget === "Fixtures"
        ? setFixtureRows
        : modalTarget === "LED Screen"
          ? setLedRows
          : setRiggingRows;
    setter((rows) => [...rows, makeCustomRow(modalTarget, item)]);
    closeModal();
  };

  const resetAll = () => {
    if (!confirm("Reset the entire report? This will clear all gear and project info.")) return;
    setSystemName("");
    setVenue("");
    setReportDate(new Date().toISOString().slice(0, 10));
    setEngineer("");
    setPointCount(3);
    setDynamicFactor(1.25);
    setHoistIndex(0);
    setRiggingRows([makeRow("Truss", 4)]);
    setFixtureRows([]);
    setLedRows([]);
  };

  const renderItemRow = (
    row: Row,
    setter: React.Dispatch<React.SetStateAction<Row[]>>,
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
            updateRow(setter, row.id, { selectedIndex: Number(e.target.value) })
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
            updateRow(setter, row.id, { qty: Number(e.target.value) || 0 })
          }
        />
        <div className="row-subtotal" title="Row total weight">
          {subtotal.toFixed(1)}
          <span>kg</span>
        </div>
        <button
          className="btn btn-del"
          onClick={() => removeRow(setter, row.id)}
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

  const peakColor = maxVal > swl ? "var(--danger)" : "var(--secondary)";
  const utilPct = Math.min(100, peakUtil * 100);
  const utilBarColor =
    peakUtil > 1 ? "var(--danger)" : peakUtil > 0.85 ? "var(--warning)" : "var(--primary)";

  return (
    <div className="container">
      <div className="header">
        <div className="header-left">
          <div className="header-logo">EHS</div>
          <h1>Rigging Load Report</h1>
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
          <button className="btn btn-export" onClick={() => window.print()}>
            Export Report
          </button>
        </div>
      </div>

      <div className="system-identity">
        <div className="sys-id-main">
          <label>Rigging Reference ID:</label>
          <input
            type="text"
            value={systemName}
            onChange={(e) => setSystemName(e.target.value)}
            placeholder="e.g. LX1, LX2, VX1"
          />
        </div>
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
            <label>Engineer</label>
            <input
              type="text"
              value={engineer}
              onChange={(e) => setEngineer(e.target.value)}
              placeholder="Name"
            />
          </div>
        </div>
      </div>

      <div className="dashboard">
        <div className="dash-item">
          <span>Static Load</span>
          <strong>{totalStaticWeight.toFixed(1)}</strong>
          <small>kg</small>
        </div>
        <div className="dash-item">
          <span>Peak Load</span>
          <strong style={{ color: peakColor }}>{maxVal.toFixed(1)}</strong>
          <small>kg</small>
        </div>
        <div className="dash-item">
          <span>SWL Headroom</span>
          <strong style={{ color: headroom < 0 ? "var(--danger)" : "var(--text-main)" }}>
            {headroom >= 0 ? headroom.toFixed(0) : `−${Math.abs(headroom).toFixed(0)}`}
          </strong>
          <small>kg</small>
        </div>
        <div className="dash-item">
          <span>Total Area</span>
          <strong>{totalArea.toFixed(1)}</strong>
          <small>m²</small>
        </div>
        <div className="dash-item">
          <span>Eq. Power</span>
          <strong>{totalPower.toLocaleString()}</strong>
          <small>W</small>
        </div>
        <div className="dash-item">
          <span>Motor Power</span>
          <strong>{totalMotorPower.toLocaleString()}</strong>
          <small>W</small>
        </div>
      </div>

      <div className="util-bar-wrap">
        <div className="util-bar-label">
          <span>Peak SWL Utilization</span>
          <strong style={{ color: utilBarColor }}>{(peakUtil * 100).toFixed(1)}%</strong>
        </div>
        <div className="util-bar-track">
          <div
            className="util-bar-fill"
            style={{ width: `${utilPct}%`, background: utilBarColor }}
          />
          <div className="util-bar-marker" style={{ left: "85%" }} title="85% caution" />
          <div className="util-bar-marker util-marker-danger" style={{ left: "100%" }} title="100% SWL" />
        </div>
        <div className="util-bar-legend">
          <span>0 kg</span>
          <span>Caution 85%</span>
          <span>SWL {swl} kg</span>
        </div>
      </div>

      <div className="main-grid">
        <div className="card">
          <h2>
            1. Motors &amp; Support
            <span className="card-total">{sectionTotal(riggingRows).toFixed(1)} kg</span>
          </h2>
          <div className="motor-config">
            <div className="motor-config-grid">
              <div>
                <label className="field-label">Points</label>
                <select
                  value={pointCount}
                  onChange={(e) => setPointCount(Number(e.target.value))}
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
                  value={dynamicFactor}
                  onChange={(e) => setDynamicFactor(Number(e.target.value))}
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
              value={hoistIndex}
              onChange={(e) => setHoistIndex(Number(e.target.value))}
            >
              {hoistModels.map((h, i) => (
                <option key={i} value={i}>
                  {h.label}
                </option>
              ))}
            </select>
          </div>
          <div>{riggingRows.map((r) => renderItemRow(r, setRiggingRows))}</div>
          {riggingRows.length === 0 && (
            <div className="empty-row">No truss added yet</div>
          )}
          <button
            className="btn btn-add"
            onClick={() => addRowTo(setRiggingRows, "Truss")}
          >
            + Add Truss
          </button>
        </div>

        <div className="card">
          <h2>
            2. Lighting Fixtures
            <span className="card-total">{sectionTotal(fixtureRows).toFixed(1)} kg</span>
          </h2>
          <div>{fixtureRows.map((r) => renderItemRow(r, setFixtureRows))}</div>
          {fixtureRows.length === 0 && (
            <div className="empty-row">No fixtures added yet</div>
          )}
          <button
            className="btn btn-add"
            onClick={() => addRowTo(setFixtureRows, "Fixtures")}
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
            <span className="card-total">{sectionTotal(ledRows).toFixed(1)} kg</span>
          </h2>
          <div>{ledRows.map((r) => renderItemRow(r, setLedRows))}</div>
          {ledRows.length === 0 && (
            <div className="empty-row">No LED or other equipment added yet</div>
          )}
          <button
            className="btn btn-add"
            onClick={() => addRowTo(setLedRows, "LED Screen")}
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
          <h2>4. Rigging Point Calculations</h2>
          <div className="analysis-container">
            <div className="points-summary">
              {factors.map((f, i) => {
                const sLoad = staticPointLoads[i];
                const dLoad = dynamicPointLoads[i];
                const pct = Math.round(f * 100);
                const util = swl > 0 ? dLoad / swl : 0;
                const isDanger = dLoad > swl;
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
                  <i style={{ background: "var(--secondary)" }} /> Dynamic ({dynamicFactor}x)
                </span>
                <span>
                  <i style={{ background: "var(--danger)" }} /> Over SWL
                </span>
              </div>
              <div className="bar-chart">
                {factors.map((_, i) => {
                  const sLoad = staticPointLoads[i];
                  const dLoad = dynamicPointLoads[i];
                  const denom = Math.max(maxVal, swl) || 1;
                  const sH = (sLoad / denom) * 240;
                  const dH = (dLoad / denom) * 240;
                  const barColor =
                    dLoad > swl ? "var(--danger)" : "var(--secondary)";
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
                    bottom: `${(swl / (Math.max(maxVal, swl) || 1)) * 240}px`,
                  }}
                  title={`SWL ${swl}kg`}
                >
                  <span>SWL {swl}kg</span>
                </div>
              </div>
              <div className="vis-container">
                {factors.map((f, i) => (
                  <div className="vis-point" key={i}>
                    <div className="vis-arrow" />
                    <span className="vis-pct">{Math.round(f * 100)}%</span>
                    <span className="vis-label">P{i + 1}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="print-only print-table-wrap">
            <h3>Equipment Manifest</h3>
            <table className="print-table">
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
                {allRows.map(({ row, section }) => {
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
                  <td>{totalPayload.toFixed(2)} kg</td>
                  <td>{totalPower.toLocaleString()} W</td>
                </tr>
                <tr className="print-table-total">
                  <td colSpan={4}>
                    + {pointCount} × hoist ({hoist.weight} kg)
                  </td>
                  <td>{(pointCount * hoist.weight).toFixed(2)} kg</td>
                  <td>{totalMotorPower.toLocaleString()} W</td>
                </tr>
                <tr className="print-table-grand">
                  <td colSpan={4}>Static load</td>
                  <td>{totalStaticWeight.toFixed(2)} kg</td>
                  <td>—</td>
                </tr>
                <tr className="print-table-grand">
                  <td colSpan={4}>Dynamic load ({dynamicFactor}x)</td>
                  <td>{totalDynamicWeight.toFixed(2)} kg</td>
                  <td>—</td>
                </tr>
              </tbody>
            </table>
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

export default App;
