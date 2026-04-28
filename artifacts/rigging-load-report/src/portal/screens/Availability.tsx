import { useMemo, useState } from "react";
import { PALETTE, type ThemeMode } from "../lib/portalTheme";
import {
  type AvailabilityState,
  type PortalData,
} from "../lib/portalStorage";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function isoFor(year: number, month: number, day: number): string {
  const d = new Date(year, month, day);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function buildMonthCells(year: number, month: number) {
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const startWeekday = (first.getDay() + 6) % 7; // Mon=0
  const cells: { iso: string | null; day: number | null }[] = [];
  for (let i = 0; i < startWeekday; i++) cells.push({ iso: null, day: null });
  for (let d = 1; d <= last.getDate(); d++) {
    cells.push({ iso: isoFor(year, month, d), day: d });
  }
  while (cells.length % 7 !== 0) cells.push({ iso: null, day: null });
  return cells;
}

function gigCoversDate(
  gigs: PortalData["gigs"],
  iso: string,
): boolean {
  return gigs.some(
    (g) =>
      g.startDate &&
      g.endDate &&
      iso >= g.startDate &&
      iso <= g.endDate &&
      (g.status === "confirmed" ||
        g.status === "done" ||
        g.status === "invoiced" ||
        g.status === "paid"),
  );
}

export function Availability({
  theme,
  data,
  setData,
}: {
  theme: ThemeMode;
  data: PortalData;
  setData: React.Dispatch<React.SetStateAction<PortalData>>;
}) {
  const c = PALETTE[theme];
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [paintMode, setPaintMode] = useState<AvailabilityState>("available");

  const cells = useMemo(
    () => buildMonthCells(viewYear, viewMonth),
    [viewYear, viewMonth],
  );

  function shiftMonth(delta: number) {
    const d = new Date(viewYear, viewMonth + delta, 1);
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
  }

  function setCell(iso: string, state: AvailabilityState | null) {
    setData((prev) => {
      const next = { ...prev.availability };
      if (state === null) {
        delete next[iso];
      } else {
        next[iso] = state;
      }
      return { ...prev, availability: next };
    });
  }

  function toggleCell(iso: string) {
    const current = data.availability[iso];
    if (current === paintMode) {
      setCell(iso, null);
    } else {
      setCell(iso, paintMode);
    }
  }

  function fillMonth(state: AvailabilityState | null) {
    setData((prev) => {
      const next = { ...prev.availability };
      for (const cell of cells) {
        if (!cell.iso) continue;
        if (state === null) {
          delete next[cell.iso];
        } else {
          next[cell.iso] = state;
        }
      }
      return { ...prev, availability: next };
    });
  }

  function fillRemaining(state: AvailabilityState) {
    const t = todayIso();
    setData((prev) => {
      const next = { ...prev.availability };
      for (const cell of cells) {
        if (!cell.iso) continue;
        if (cell.iso < t) continue;
        next[cell.iso] = state;
      }
      return { ...prev, availability: next };
    });
  }

  const monthName = new Date(viewYear, viewMonth, 1).toLocaleString("en-US", {
    month: "long",
    year: "numeric",
  });

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <header
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          flexWrap: "wrap",
        }}
      >
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, flex: 1 }}>
          Availability
        </h1>
      </header>

      <div
        style={{
          background: c.cardBg,
          border: `1px solid ${c.border}`,
          borderRadius: 14,
          padding: 14,
          display: "flex",
          gap: 8,
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <span style={{ fontSize: 13, fontWeight: 700, color: c.muted }}>
          Painting:
        </span>
        {(["available", "busy"] as AvailabilityState[]).map((m) => {
          const active = paintMode === m;
          const accent = m === "available" ? c.success : c.danger;
          return (
            <button
              key={m}
              type="button"
              onClick={() => setPaintMode(m)}
              style={{
                padding: "6px 14px",
                fontSize: 13,
                fontWeight: 700,
                borderRadius: 999,
                cursor: "pointer",
                background: active ? accent : "transparent",
                color: active ? "#0b0b0b" : c.text,
                border: `1px solid ${active ? accent : c.border}`,
                textTransform: "capitalize",
              }}
            >
              {m}
            </button>
          );
        })}
        <span style={{ flex: 1 }} />
        <span style={{ fontSize: 12, color: c.muted }}>
          Tap a day to mark · tap again to clear
        </span>
      </div>

      <div
        style={{
          background: c.cardBg,
          border: `1px solid ${c.border}`,
          borderRadius: 14,
          padding: 14,
          boxShadow: c.shadowSoft,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            marginBottom: 12,
            gap: 8,
          }}
        >
          <button
            type="button"
            onClick={() => shiftMonth(-1)}
            aria-label="Previous month"
            style={navBtnStyle(theme)}
          >
            ‹
          </button>
          <div style={{ flex: 1, textAlign: "center", fontSize: 16, fontWeight: 800 }}>
            {monthName}
          </div>
          <button
            type="button"
            onClick={() => shiftMonth(+1)}
            aria-label="Next month"
            style={navBtnStyle(theme)}
          >
            ›
          </button>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(7, 1fr)",
            gap: 4,
            marginBottom: 4,
          }}
        >
          {WEEKDAYS.map((w) => (
            <div
              key={w}
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: c.muted,
                textAlign: "center",
                padding: "4px 0",
                textTransform: "uppercase",
              }}
            >
              {w}
            </div>
          ))}
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(7, 1fr)",
            gap: 4,
          }}
        >
          {cells.map((cell, i) => {
            if (!cell.iso || cell.day === null) {
              return <div key={i} style={{ aspectRatio: "1" }} />;
            }
            const state = data.availability[cell.iso];
            const conflictWithBusy =
              state === "available" && gigCoversDate(data.gigs, cell.iso);
            const isToday = cell.iso === todayIso();
            const bg =
              state === "available"
                ? c.success
                : state === "busy"
                  ? c.danger
                  : c.cardBgSubtle;
            const fg =
              state === "available" || state === "busy" ? "#0b0b0b" : c.text;
            return (
              <button
                key={i}
                type="button"
                onClick={() => toggleCell(cell.iso!)}
                title={
                  conflictWithBusy
                    ? "Available marked but a gig is logged on this date"
                    : undefined
                }
                style={{
                  aspectRatio: "1",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 13,
                  fontWeight: 700,
                  borderRadius: 8,
                  cursor: "pointer",
                  background: bg,
                  color: fg,
                  border: isToday
                    ? `2px solid ${c.accent}`
                    : `1px solid ${c.border}`,
                  position: "relative",
                  padding: 0,
                }}
              >
                {cell.day}
                {conflictWithBusy ? (
                  <span
                    aria-hidden
                    style={{
                      position: "absolute",
                      top: 2,
                      right: 3,
                      fontSize: 10,
                      color: "#dc2626",
                    }}
                    title="Conflict"
                  >
                    ⚠
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>

        <div
          style={{
            marginTop: 14,
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
            justifyContent: "center",
          }}
        >
          <button
            type="button"
            onClick={() => fillMonth("available")}
            style={pillBtn(theme, c.success)}
          >
            All available
          </button>
          <button
            type="button"
            onClick={() => fillMonth("busy")}
            style={pillBtn(theme, c.danger)}
          >
            All busy
          </button>
          <button
            type="button"
            onClick={() => fillRemaining(paintMode)}
            style={pillBtn(theme, c.accent)}
          >
            From today → {paintMode}
          </button>
          <button
            type="button"
            onClick={() => fillMonth(null)}
            style={pillBtn(theme, c.muted)}
          >
            Clear month
          </button>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          gap: 14,
          flexWrap: "wrap",
          justifyContent: "center",
          fontSize: 12,
          color: c.muted,
        }}
      >
        <LegendDot color={c.success} label="Available" />
        <LegendDot color={c.danger} label="Busy" />
        <LegendDot color={c.cardBgSubtle} label="Not set" border={c.border} />
        <LegendDot color="#dc2626" label="⚠ Gig conflict" plain />
      </div>
    </div>
  );
}

function LegendDot({
  color,
  label,
  border,
  plain,
}: {
  color: string;
  label: string;
  border?: string;
  plain?: boolean;
}) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
      {plain ? null : (
        <span
          style={{
            width: 12,
            height: 12,
            borderRadius: 4,
            background: color,
            border: border ? `1px solid ${border}` : "none",
          }}
        />
      )}
      <span>{label}</span>
    </span>
  );
}

function navBtnStyle(theme: ThemeMode): React.CSSProperties {
  const c = PALETTE[theme];
  return {
    padding: "6px 14px",
    fontSize: 18,
    fontWeight: 700,
    background: c.cardBgSubtle,
    color: c.text,
    border: `1px solid ${c.border}`,
    borderRadius: 8,
    cursor: "pointer",
  };
}

function pillBtn(theme: ThemeMode, color: string): React.CSSProperties {
  const c = PALETTE[theme];
  return {
    padding: "7px 14px",
    fontSize: 12,
    fontWeight: 700,
    background: "transparent",
    color: color,
    border: `1px solid ${color}`,
    borderRadius: 999,
    cursor: "pointer",
    fontFamily: "inherit",
    textTransform: "none",
    boxShadow: "none",
    opacity: c.text === c.text ? 1 : 1,
  };
}
