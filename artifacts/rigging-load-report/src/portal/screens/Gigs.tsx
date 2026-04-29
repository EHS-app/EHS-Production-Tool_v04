import { useMemo, useState } from "react";
import { PALETTE, type ThemeMode } from "../lib/portalTheme";
import {
  findBrief,
  gigEarnings,
  newGigId,
  statusColor,
  statusLabel,
  type Gig,
  type GigStatus,
  type PortalData,
} from "../lib/portalStorage";
import { downloadBriefIcs } from "../../lib/icalExport";
import type { ProjectBrief } from "../../lib/projectBrief";

/** Synthesize a tiny ProjectBrief from a manually-logged Gig so the
 *  shared iCal exporter can emit a single all-day VEVENT. Used when
 *  the gig has no `briefId` link to a producer-shared brief. */
function synthesizeBriefFromGig(gig: Gig): ProjectBrief {
  return {
    version: 1,
    generatedAt: gig.createdAt,
    briefId: gig.id,
    recipientCrewId: null,
    project: {
      venue: gig.venue || gig.projectName,
      client: gig.client,
      date: gig.startDate,
      endDate: gig.endDate || gig.startDate,
      // Manual Gigs (not created from a producer brief) don't track a
      // separate project manager — leave it blank rather than copying
      // the client name into both fields.
      preparedBy: "",
    },
    assignments: [],
    rigging: { systemCount: 0, hoistCount: 0, totalMotorW: 0, systems: [] },
    lighting: {
      fixtureCount: 0,
      totalFixtureWatts: 0,
      universes: [],
      circuitCount: 0,
      totalCircuitW: 0,
      worstCircuitPct: 0,
      distros: [],
      distroCount: 0,
      totalDistroW: 0,
      worstDistroFeederPct: 0,
    },
    led: { screenCount: 0, totalPanels: 0, processor: "", screens: [] },
    stage: {
      stageCount: 0,
      totalArea: 0,
      totalLoadCapacityKg: 0,
      stages: [],
    },
    sound: {
      rowCount: 0,
      totalQty: 0,
      totalWeight: 0,
      totalPower: 0,
      byCategory: [],
    },
    riggPlan: null,
    attachments: [],
  };
}

const STATUS_ORDER: GigStatus[] = [
  "invited",
  "confirmed",
  "done",
  "invoiced",
  "paid",
];

function emptyGig(): Gig {
  const today = new Date().toISOString().slice(0, 10);
  return {
    id: newGigId(),
    projectName: "",
    client: "",
    venue: "",
    role: "",
    startDate: today,
    endDate: today,
    hours: 0,
    rate: 0,
    flatFee: 0,
    notes: "",
    status: "confirmed",
    createdAt: Date.now(),
  };
}

function formatDayShort(iso: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "2-digit",
  });
}

function formatNok(n: number): string {
  return new Intl.NumberFormat("nb-NO", {
    style: "currency",
    currency: "NOK",
    maximumFractionDigits: 0,
  }).format(Math.round(n));
}

export function Gigs({
  theme,
  data,
  setData,
}: {
  theme: ThemeMode;
  data: PortalData;
  setData: React.Dispatch<React.SetStateAction<PortalData>>;
}) {
  const c = PALETTE[theme];
  const [editing, setEditing] = useState<Gig | null>(null);
  const [filter, setFilter] = useState<GigStatus | "all">("all");

  const visible = useMemo(() => {
    const items =
      filter === "all"
        ? data.gigs
        : data.gigs.filter((g) => g.status === filter);
    return [...items].sort((a, b) =>
      b.startDate.localeCompare(a.startDate),
    );
  }, [data.gigs, filter]);

  function saveGig(g: Gig) {
    setData((prev) => {
      const exists = prev.gigs.some((x) => x.id === g.id);
      const gigs = exists
        ? prev.gigs.map((x) => (x.id === g.id ? g : x))
        : [...prev.gigs, g];
      return { ...prev, gigs };
    });
    setEditing(null);
  }

  function deleteGig(id: string) {
    setData((prev) => ({
      ...prev,
      gigs: prev.gigs.filter((g) => g.id !== id),
    }));
    setEditing(null);
  }

  function advanceStatus(g: Gig) {
    const i = STATUS_ORDER.indexOf(g.status);
    const next = STATUS_ORDER[(i + 1) % STATUS_ORDER.length];
    setData((prev) => ({
      ...prev,
      gigs: prev.gigs.map((x) =>
        x.id === g.id ? { ...x, status: next } : x,
      ),
    }));
  }

  function setCheckIn(
    g: Gig,
    field: "onTheWayAt" | "arrivedAt",
    value: number | undefined,
  ) {
    setData((prev) => ({
      ...prev,
      gigs: prev.gigs.map((x) => {
        if (x.id !== g.id) return x;
        const nextCheckIn = { ...(x.checkIn ?? {}), [field]: value };
        // Drop empty objects so localStorage stays tidy.
        const checkIn =
          nextCheckIn.onTheWayAt === undefined &&
          nextCheckIn.arrivedAt === undefined
            ? undefined
            : nextCheckIn;
        return { ...x, checkIn };
      }),
    }));
  }

  function exportGigToCalendar(g: Gig) {
    // Prefer the rich, schedule-aware brief if the gig was created from
    // one — that gives per-phase events. Otherwise fall back to a small
    // synthesized brief that emits a single all-day event.
    const linkedBrief = g.briefId
      ? findBrief(data, g.briefId)?.brief
      : undefined;
    downloadBriefIcs(linkedBrief ?? synthesizeBriefFromGig(g));
  }

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
          Gigs
        </h1>
        <button
          type="button"
          onClick={() => setEditing(emptyGig())}
          style={{
            padding: "10px 16px",
            fontSize: 14,
            fontWeight: 700,
            background: c.accent,
            color: "#0b0b0b",
            border: "none",
            borderRadius: 10,
            cursor: "pointer",
          }}
        >
          + Log a gig
        </button>
      </header>

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {(["all", ...STATUS_ORDER] as const).map((s) => {
          const active = filter === s;
          const count =
            s === "all"
              ? data.gigs.length
              : data.gigs.filter((g) => g.status === s).length;
          return (
            <button
              key={s}
              type="button"
              onClick={() => setFilter(s)}
              style={{
                padding: "6px 12px",
                fontSize: 12,
                fontWeight: 700,
                borderRadius: 999,
                cursor: "pointer",
                background: active ? c.accent : c.cardBg,
                color: active ? "#0b0b0b" : c.text,
                border: `1px solid ${active ? c.accent : c.border}`,
              }}
            >
              {s === "all" ? "All" : statusLabel(s)} · {count}
            </button>
          );
        })}
      </div>

      {visible.length === 0 ? (
        <div
          style={{
            background: c.cardBg,
            border: `1px dashed ${c.border}`,
            borderRadius: 14,
            padding: "32px 16px",
            textAlign: "center",
            color: c.muted,
            fontSize: 14,
          }}
        >
          {data.gigs.length === 0 ? (
            <>
              <div style={{ fontSize: 16, fontWeight: 700, color: c.text, marginBottom: 6 }}>
                No gigs logged yet
              </div>
              Tap <strong>Log a gig</strong> to add your first one.
              <br />
              Each gig flows through Invited → Confirmed → Done → Invoiced → Paid.
            </>
          ) : (
            "No gigs match this filter."
          )}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {visible.map((g) => {
            const sc = statusColor(g.status);
            const showCheckIn = g.status === "confirmed" || g.status === "done";
            return (
              <div
                key={g.id}
                style={{
                  background: c.cardBg,
                  border: `1px solid ${c.border}`,
                  borderRadius: 12,
                  padding: 14,
                  display: "grid",
                  gap: 10,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    gap: 12,
                    alignItems: "flex-start",
                    flexWrap: "wrap",
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        marginBottom: 4,
                        flexWrap: "wrap",
                      }}
                    >
                      <strong style={{ fontSize: 15 }}>{g.projectName}</strong>
                      {g.client ? (
                        <span style={{ fontSize: 12, color: c.muted }}>
                          · {g.client}
                        </span>
                      ) : null}
                    </div>
                    <div
                      style={{ fontSize: 13, color: c.muted, marginBottom: 6 }}
                    >
                      {g.role || "—"} · {formatDayShort(g.startDate)}
                      {g.endDate && g.endDate !== g.startDate
                        ? ` → ${formatDayShort(g.endDate)}`
                        : ""}
                      {g.venue ? ` · ${g.venue}` : ""}
                    </div>
                    <div style={{ fontSize: 13, color: c.text }}>
                      <strong>{formatNok(gigEarnings(g))}</strong>
                      <span style={{ color: c.muted }}>
                        {g.flatFee > 0
                          ? " · flat fee"
                          : ` · ${g.hours}h × ${formatNok(g.rate)}`}
                      </span>
                    </div>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 6,
                      alignItems: "flex-end",
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => advanceStatus(g)}
                      title="Tap to advance status"
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        padding: "5px 10px",
                        borderRadius: 999,
                        background: sc.bg,
                        color: sc.fg,
                        border: "none",
                        cursor: "pointer",
                      }}
                    >
                      {statusLabel(g.status)} →
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditing(g)}
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        padding: "5px 10px",
                        background: "transparent",
                        color: c.muted,
                        border: `1px solid ${c.border}`,
                        borderRadius: 6,
                        cursor: "pointer",
                      }}
                    >
                      Edit
                    </button>
                  </div>
                </div>

                {/* Footer: check-in (confirmed/done only) + calendar export */}
                <div
                  style={{
                    display: "flex",
                    gap: 6,
                    flexWrap: "wrap",
                    alignItems: "center",
                    paddingTop: 8,
                    borderTop: `1px dashed ${c.border}`,
                  }}
                >
                  {showCheckIn ? (
                    <CheckInControls
                      theme={theme}
                      gig={g}
                      onSet={(field, value) => setCheckIn(g, field, value)}
                    />
                  ) : null}
                  <div style={{ flex: 1 }} />
                  <button
                    type="button"
                    onClick={() => exportGigToCalendar(g)}
                    title="Download an .ics file you can open in your calendar app"
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      padding: "6px 12px",
                      background: "transparent",
                      color: c.text,
                      border: `1px solid ${c.border}`,
                      borderRadius: 999,
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <span aria-hidden>📅</span> Add to calendar
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {editing ? (
        <GigEditor
          theme={theme}
          gig={editing}
          onSave={saveGig}
          onCancel={() => setEditing(null)}
          onDelete={() => deleteGig(editing.id)}
          isNew={!data.gigs.some((g) => g.id === editing.id)}
        />
      ) : null}
    </div>
  );
}

function GigEditor({
  theme,
  gig,
  onSave,
  onCancel,
  onDelete,
  isNew,
}: {
  theme: ThemeMode;
  gig: Gig;
  onSave: (g: Gig) => void;
  onCancel: () => void;
  onDelete: () => void;
  isNew: boolean;
}) {
  const c = PALETTE[theme];
  const [draft, setDraft] = useState<Gig>(gig);

  function patch<K extends keyof Gig>(key: K, value: Gig[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
  }

  function num(v: string): number {
    const n = parseFloat(v.replace(",", "."));
    return isFinite(n) ? n : 0;
  }

  const valid = draft.projectName.trim().length > 0 && draft.startDate;

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.55)",
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
        zIndex: 100,
        padding: 0,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div
        style={{
          background: c.cardBg,
          color: c.text,
          width: "100%",
          maxWidth: 560,
          maxHeight: "92dvh",
          overflowY: "auto",
          borderRadius: "16px 16px 0 0",
          padding: 20,
          boxShadow: c.shadow,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            marginBottom: 16,
          }}
        >
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, flex: 1 }}>
            {isNew ? "Log a gig" : "Edit gig"}
          </h2>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Close"
            style={{
              background: "transparent",
              border: `1px solid ${c.border}`,
              color: c.text,
              borderRadius: 8,
              padding: "5px 10px",
              fontSize: 14,
              cursor: "pointer",
            }}
          >
            ×
          </button>
        </div>

        <div style={{ display: "grid", gap: 12 }}>
          <Field theme={theme} label="Project name *">
            <input
              type="text"
              value={draft.projectName}
              onChange={(e) => patch("projectName", e.target.value)}
              placeholder="e.g. NRK MGP 2026"
              style={inputStyle(theme)}
              autoFocus
            />
          </Field>

          <div style={{ display: "grid", gap: 12, gridTemplateColumns: "1fr 1fr" }}>
            <Field theme={theme} label="Client">
              <input
                type="text"
                value={draft.client}
                onChange={(e) => patch("client", e.target.value)}
                placeholder="NRK"
                style={inputStyle(theme)}
              />
            </Field>
            <Field theme={theme} label="Role">
              <input
                type="text"
                value={draft.role}
                onChange={(e) => patch("role", e.target.value)}
                placeholder="Lystekniker"
                style={inputStyle(theme)}
              />
            </Field>
          </div>

          <Field theme={theme} label="Venue">
            <input
              type="text"
              value={draft.venue}
              onChange={(e) => patch("venue", e.target.value)}
              placeholder="Håkons Hall, Lillehammer"
              style={inputStyle(theme)}
            />
          </Field>

          <div style={{ display: "grid", gap: 12, gridTemplateColumns: "1fr 1fr" }}>
            <Field theme={theme} label="Start date *">
              <input
                type="date"
                value={draft.startDate}
                onChange={(e) => patch("startDate", e.target.value)}
                style={inputStyle(theme)}
              />
            </Field>
            <Field theme={theme} label="End date">
              <input
                type="date"
                value={draft.endDate}
                min={draft.startDate}
                onChange={(e) => patch("endDate", e.target.value)}
                style={inputStyle(theme)}
              />
            </Field>
          </div>

          <div style={{ display: "grid", gap: 12, gridTemplateColumns: "1fr 1fr 1fr" }}>
            <Field theme={theme} label="Hours">
              <input
                type="number"
                inputMode="decimal"
                step="0.25"
                min="0"
                value={draft.hours || ""}
                onChange={(e) => patch("hours", num(e.target.value))}
                style={inputStyle(theme)}
              />
            </Field>
            <Field theme={theme} label="Rate (kr/h)">
              <input
                type="number"
                inputMode="decimal"
                step="50"
                min="0"
                value={draft.rate || ""}
                onChange={(e) => patch("rate", num(e.target.value))}
                style={inputStyle(theme)}
              />
            </Field>
            <Field theme={theme} label="Flat fee (kr)">
              <input
                type="number"
                inputMode="decimal"
                step="100"
                min="0"
                value={draft.flatFee || ""}
                onChange={(e) => patch("flatFee", num(e.target.value))}
                placeholder="overrides h×rate"
                style={inputStyle(theme)}
              />
            </Field>
          </div>

          <Field theme={theme} label="Status">
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {STATUS_ORDER.map((s) => {
                const sc = statusColor(s);
                const active = draft.status === s;
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => patch("status", s)}
                    style={{
                      padding: "6px 12px",
                      fontSize: 12,
                      fontWeight: 700,
                      borderRadius: 999,
                      cursor: "pointer",
                      background: active ? sc.bg : "transparent",
                      color: active ? sc.fg : c.muted,
                      border: `1px solid ${active ? sc.fg : c.border}`,
                    }}
                  >
                    {statusLabel(s)}
                  </button>
                );
              })}
            </div>
          </Field>

          <Field theme={theme} label="Notes">
            <textarea
              value={draft.notes}
              onChange={(e) => patch("notes", e.target.value)}
              rows={3}
              placeholder="Anything to remember about this gig…"
              style={{
                ...inputStyle(theme),
                resize: "vertical",
                fontFamily: "inherit",
              }}
            />
          </Field>

          <div
            style={{
              display: "flex",
              gap: 10,
              marginTop: 4,
              flexWrap: "wrap",
            }}
          >
            <button
              type="button"
              onClick={() => onSave(draft)}
              disabled={!valid}
              style={{
                flex: 1,
                minWidth: 140,
                padding: "12px 18px",
                fontSize: 14,
                fontWeight: 700,
                background: valid ? c.accent : c.border,
                color: "#0b0b0b",
                border: "none",
                borderRadius: 10,
                cursor: valid ? "pointer" : "not-allowed",
                opacity: valid ? 1 : 0.7,
              }}
            >
              Save gig
            </button>
            {!isNew ? (
              <button
                type="button"
                onClick={onDelete}
                style={{
                  padding: "12px 16px",
                  fontSize: 13,
                  fontWeight: 700,
                  background: "transparent",
                  color: c.danger,
                  border: `1px solid ${c.danger}`,
                  borderRadius: 10,
                  cursor: "pointer",
                }}
              >
                Delete
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

function formatCheckInTime(ms: number): string {
  const d = new Date(ms);
  return d.toLocaleString("en-GB", {
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function CheckInControls({
  theme,
  gig,
  onSet,
}: {
  theme: ThemeMode;
  gig: Gig;
  onSet: (
    field: "onTheWayAt" | "arrivedAt",
    value: number | undefined,
  ) => void;
}) {
  const c = PALETTE[theme];
  const onTheWay = gig.checkIn?.onTheWayAt;
  const arrived = gig.checkIn?.arrivedAt;
  const baseBtn: React.CSSProperties = {
    fontSize: 12,
    fontWeight: 700,
    padding: "5px 10px",
    borderRadius: 999,
    cursor: "pointer",
  };
  return (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
      {onTheWay ? (
        <button
          type="button"
          onClick={() => onSet("onTheWayAt", undefined)}
          title={`Tap to clear · ${new Date(onTheWay).toLocaleString()}`}
          style={{
            ...baseBtn,
            background: "rgba(99,102,241,0.18)",
            color: "#6366f1",
            border: "1px solid #6366f1",
          }}
        >
          ✓ On the way · {formatCheckInTime(onTheWay)}
        </button>
      ) : (
        <button
          type="button"
          onClick={() => onSet("onTheWayAt", Date.now())}
          style={{
            ...baseBtn,
            background: "transparent",
            color: c.text,
            border: `1px solid ${c.border}`,
          }}
        >
          On the way
        </button>
      )}
      {arrived ? (
        <button
          type="button"
          onClick={() => onSet("arrivedAt", undefined)}
          title={`Tap to clear · ${new Date(arrived).toLocaleString()}`}
          style={{
            ...baseBtn,
            background: "rgba(22,163,74,0.18)",
            color: c.success,
            border: `1px solid ${c.success}`,
          }}
        >
          ✓ Arrived · {formatCheckInTime(arrived)}
        </button>
      ) : (
        <button
          type="button"
          onClick={() => onSet("arrivedAt", Date.now())}
          style={{
            ...baseBtn,
            background: "transparent",
            color: c.text,
            border: `1px solid ${c.border}`,
          }}
        >
          Arrived
        </button>
      )}
    </div>
  );
}

function Field({
  theme,
  label,
  children,
}: {
  theme: ThemeMode;
  label: string;
  children: React.ReactNode;
}) {
  const c = PALETTE[theme];
  return (
    <label style={{ display: "block" }}>
      <span
        style={{
          display: "block",
          fontSize: 12,
          fontWeight: 700,
          color: c.muted,
          marginBottom: 5,
          textTransform: "uppercase",
          letterSpacing: 0.4,
        }}
      >
        {label}
      </span>
      {children}
    </label>
  );
}

function inputStyle(theme: ThemeMode): React.CSSProperties {
  const c = PALETTE[theme];
  return {
    width: "100%",
    padding: "10px 12px",
    fontSize: 14,
    background: c.inputBg,
    color: c.text,
    border: `1px solid ${c.inputBorder}`,
    borderRadius: 8,
    boxSizing: "border-box",
    fontFamily: "inherit",
  };
}
