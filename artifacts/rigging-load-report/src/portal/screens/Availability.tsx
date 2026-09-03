import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PALETTE, type ThemeMode } from "../lib/portalTheme";
import { type PortalData } from "../lib/portalStorage";
import { useAuth } from "@clerk/react";
import { toast } from "sonner";
import { useT } from "../../lib/i18n/I18nContext";

type CalendarEntry = {
  id: string;
  ruleId?: string;
  status: "available" | "unavailable" | "tentative";
  startAt: string;
  endAt: string;
  allDay: boolean;
  note?: string;
};

type ExternalBusy = {
  id: string;
  startAt: string;
  endAt: string;
  provider: string;
};

type CalendarConnection = {
  id: string;
  provider: "google" | "microsoft" | "ics";
  configured: boolean;
  connected: boolean;
  accountLabel?: string;
  lastSyncedAt?: string;
  lastError?: string;
};

type CalendarFeed = {
  enabled: boolean;
  url: string;
  updatedAt?: string;
};

function isoDateOnly(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function localDateTime(day: string, time: string): Date | null {
  const dateMatch = day.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const timeMatch = time.match(/^(\d{2}):(\d{2})$/);
  if (!dateMatch || !timeMatch) return null;
  const value = new Date(
    Number(dateMatch[1]),
    Number(dateMatch[2]) - 1,
    Number(dateMatch[3]),
    Number(timeMatch[1]),
    Number(timeMatch[2]),
  );
  return Number.isNaN(value.getTime()) ? null : value;
}

function overlapsLocalDay(
  startsAt: string,
  endsAt: string,
  day: string,
): boolean {
  const dayStart = localDateTime(day, "00:00");
  if (!dayStart) return false;
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);
  const starts = new Date(startsAt);
  const ends = new Date(endsAt);
  return starts < dayEnd && ends > dayStart;
}

function localTimeOnly(value: string): string {
  const instant = new Date(value);
  return `${String(instant.getHours()).padStart(2, "0")}:${String(
    instant.getMinutes(),
  ).padStart(2, "0")}`;
}

async function responseError(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as { error?: string };
    return body.error || "Could not save availability.";
  } catch {
    return "Could not save availability.";
  }
}

function entryTimeLabel(entry: CalendarEntry): string {
  return entry.allDay
    ? "All day"
    : `${localTimeOnly(entry.startAt)} - ${localTimeOnly(entry.endAt)}`;
}

function daysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function buildMonthCells(year: number, month: number) {
  const first = new Date(year, month, 1);
  const startWeekday = (first.getDay() + 6) % 7; // Mon=0
  const cells: { iso: string | null; day: number | null; date?: Date }[] = [];
  for (let i = 0; i < startWeekday; i++) cells.push({ iso: null, day: null });
  const days = daysInMonth(year, month);
  for (let d = 1; d <= days; d++) {
    const dt = new Date(year, month, d);
    cells.push({ iso: isoDateOnly(dt), day: d, date: dt });
  }
  while (cells.length % 7 !== 0) cells.push({ iso: null, day: null });
  return cells;
}

export function Availability({ theme, data, setData }: { theme: ThemeMode; data: PortalData; setData: React.Dispatch<React.SetStateAction<PortalData>> }) {
  const c = PALETTE[theme];
  const t = useT();
  const { getToken } = useAuth();
  const [tab, setTab] = useState<"calendar" | "integrations">("calendar");

  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [viewMode, setViewMode] = useState<"month" | "week">("month");
  // For week view, we track the start of the currently viewed week
  const [viewWeekStart, setViewWeekStart] = useState(() => {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
  });

  const [entries, setEntries] = useState<CalendarEntry[]>([]);
  const [externalBusy, setExternalBusy] = useState<ExternalBusy[]>([]);

  const [connections, setConnections] = useState<CalendarConnection[]>([]);
  const [feed, setFeed] = useState<CalendarFeed | null>(null);
  const [copied, setCopied] = useState(false);
  const [icsUrl, setIcsUrl] = useState("");

  const [loading, setLoading] = useState(false);

  const baseUrl = (typeof import.meta !== "undefined" && (import.meta as any).env?.BASE_URL) || "/";

  const loadCalendar = useCallback(async () => {
    try {
      const token = await getToken();
      let first, last;
      if (viewMode === "month") {
        first = new Date(viewYear, viewMonth, 1);
        last = new Date(viewYear, viewMonth + 1, 0);
      } else {
        first = new Date(viewWeekStart);
        last = new Date(viewWeekStart);
        last.setDate(last.getDate() + 6);
      }
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const res = await fetch(`${baseUrl}api/portal/calendar?from=${isoDateOnly(first)}&to=${isoDateOnly(last)}&timezone=${encodeURIComponent(timezone)}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (res.ok) {
        const json = await res.json();
        setEntries((json.availability || []).map((e: any) => ({
          id: e.id,
          ruleId: e.ruleId,
          status: e.status,
          startAt: e.startsAt || e.startAt,
          endAt: e.endsAt || e.endAt,
          allDay: e.allDay,
          note: e.privateNote || e.note,
        })));
        setExternalBusy((json.externalBusy || []).map((entry: any) => ({
          id: entry.id,
          startAt: entry.startsAt || entry.startAt,
          endAt: entry.endsAt || entry.endAt,
          provider: entry.provider,
        })));
      }
    } catch (e) {
      console.error(e);
    }
  }, [getToken, viewYear, viewMonth, viewWeekStart, viewMode, baseUrl]);

  const loadIntegrations = useCallback(async () => {
    try {
      const token = await getToken();
      const [connRes, subRes] = await Promise.all([
        fetch(`${baseUrl}api/portal/calendar/connections`, { headers: token ? { Authorization: `Bearer ${token}` } : {} }),
        fetch(`${baseUrl}api/portal/calendar/subscription`, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      ]);
      if (connRes.ok) {
        const json = await connRes.json();
        setConnections(json.connections || []);
      }
      if (subRes.ok) {
        const json = await subRes.json();
        let feedUrl = typeof json.url === 'string' ? json.url : json.feed?.url;
        if (feedUrl && feedUrl.startsWith('/')) {
           feedUrl = window.location.origin + feedUrl;
        }
        setFeed({ enabled: !!feedUrl, url: feedUrl || '' });
      }
    } catch (e) {
      console.error(e);
    }
  }, [getToken, baseUrl]);

  useEffect(() => {
    if (tab === "calendar") loadCalendar();
    else loadIntegrations();
  }, [tab, loadCalendar, loadIntegrations]);

  const [editorDate, setEditorDate] = useState<string | null>(null);
  const [editorEntryId, setEditorEntryId] = useState<string | null>(null);

  const openNewEntry = (date: string) => {
    setEditorEntryId(null);
    setEditorDate(date);
  };

  const openExistingEntry = (date: string, entry: CalendarEntry) => {
    setEditorEntryId(entry.id);
    setEditorDate(date);
  };

  // Handlers for Connections

  const handleAddIcs = async () => {
    if (!icsUrl) return;
    const token = await getToken();
    const res = await fetch(`${baseUrl}api/portal/calendar/connections/ics`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ url: icsUrl })
    });
    if (!res.ok) {
      toast.error(await res.text());
      return;
    }
    toast.success("ICS connection added");
    setIcsUrl("");
    loadIntegrations();
  };

  const handleStartConnection = async (provider: string) => {
    try {
      const token = await getToken();
      const res = await fetch(`${baseUrl}api/portal/calendar/connections/${provider}/start`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (!res.ok) {
        toast.error("Failed to start connection");
        return;
      }
      const data = await res.json();
      if (data.configured === false) {
        toast.error("Admin configuration required: The " + provider + " integration has not been configured by your admin yet.");
      } else if (data.url) {
        window.location.href = data.url;
      }
    } catch(e) {
      toast.error("Failed to start connection");
    }
  };

  const handleSync = async (id: string) => {
    const token = await getToken();
    const res = await fetch(`${baseUrl}api/portal/calendar/connections/${id}/sync`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    });
    if (res.ok) {
      toast.success("Sync queued");
      setTimeout(() => loadIntegrations(), 2000);
    } else {
      toast.error("Sync failed");
    }
  };



  const handleCopy = async () => {
    if (!feed?.url) return;
    try {
      await navigator.clipboard.writeText(feed.url);
      setCopied(true);
      toast.success("Copied to clipboard");
      window.setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      toast.error("Failed to copy");
    }
  };

  const getWebcalUrl = () => {
    if (!feed?.url) return "";
    return feed.url.replace(/^https?:\/\//, "webcal://");
  };

  const handleDownload = async () => {
    try {
      const token = await getToken();
      const res = await fetch(`${baseUrl}api/portal/calendar/download.ics`, {
         headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (!res.ok) throw new Error("Failed to download");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "calendar.ics";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleRotateFeed = async () => {
    // using window.confirm is requested to be replaced but keeping it simple or replacing it
    // Requirements: "no raw confirm/alert if a UI toast/dialog can do it."
    // Since we don't have a prebuilt Confirm dialog, let's just make a small inline state if possible, but wait, replacing it completely:
    setRotateConfirm(true);
  };

  const [rotateConfirm, setRotateConfirm] = useState(false);
  const confirmRotate = async () => {
    const token = await getToken();
    const res = await fetch(`${baseUrl}api/portal/calendar/subscription/rotate`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    });
    if (!res.ok) {
      toast.error(await res.text());
      return;
    }
    toast.success("Subscription rotated");
    setRotateConfirm(false);
    loadIntegrations();
  };

  const handleDeleteConnection = async (id: string) => {
    const token = await getToken();
    const res = await fetch(`${baseUrl}api/portal/calendar/connections/${id}`, {
      method: "DELETE",
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    });
    if (!res.ok) {
      toast.error(await res.text());
      return;
    }
    toast.success("Connection removed");
    loadIntegrations();
  };

  const shiftDate = (delta: number) => {
    if (viewMode === "month") {
      const d = new Date(viewYear, viewMonth + delta, 1);
      setViewYear(d.getFullYear());
      setViewMonth(d.getMonth());
    } else {
      const d = new Date(viewWeekStart);
      d.setDate(d.getDate() + delta * 7);
      setViewWeekStart(d);
      setViewYear(d.getFullYear());
      setViewMonth(d.getMonth());
    }
  };

  const cells = useMemo(() => {
    if (viewMode === "month") {
      return buildMonthCells(viewYear, viewMonth);
    } else {
      const arr = [];
      for (let i = 0; i < 7; i++) {
        const d = new Date(viewWeekStart);
        d.setDate(d.getDate() + i);
        arr.push({ iso: isoDateOnly(d), day: d.getDate(), date: d });
      }
      return arr;
    }
  }, [viewYear, viewMonth, viewMode, viewWeekStart]);
  const monthName = new Date(viewYear, viewMonth, 1).toLocaleString("en-GB", { month: "long", year: "numeric" });

  const gigsOverlap = useCallback((iso: string) => {
    return data.gigs.some((g) => g.assignedDates?.includes(iso) || (g.startDate <= iso && g.endDate >= iso && (g.status === "confirmed" || g.status === "done" || g.status === "invoiced" || g.status === "paid")));
  }, [data.gigs]);


  const handleBulk = async (status: string, scope: "month" | "today") => {
    const token = await getToken();
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    let startLocal, endLocal;
    if (scope === "month") {
      startLocal = `${isoDateOnly(new Date(viewYear, viewMonth, 1))}T00:00:00`;
      endLocal = `${isoDateOnly(new Date(viewYear, viewMonth + 1, 1))}T00:00:00`;
    } else {
      startLocal = `${isoDateOnly(today)}T00:00:00`;
      endLocal = `${isoDateOnly(new Date(today.getFullYear() + 1, today.getMonth(), today.getDate()))}T00:00:00`;
    }
    const startsAt = new Date(startLocal).toISOString();
    const endsAt = new Date(endLocal).toISOString();

    const res = await fetch(`${baseUrl}api/portal/calendar/bulk`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ entries: [{ status, startsAt, endsAt, allDay: true }] })
    });
    if (!res.ok) {
       toast.error(await res.text());
       return;
    }
    toast.success("Bulk update applied successfully");
    loadCalendar();
  };

  return (

    <div style={{ display: "grid", gap: 16 }}>
      <header style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", justifyContent: "space-between" }}>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800 }}>{t("portal.availability.title")}</h1>
        <div style={{ display: "flex", gap: 8, background: c.cardBgSubtle, padding: 4, borderRadius: 8, border: `1px solid ${c.border}` }}>
          <button onClick={() => setTab("calendar")} style={tabBtn(tab === "calendar", theme)}>{t("portal.availability.tab.calendar")}</button>
          <button onClick={() => setTab("integrations")} style={tabBtn(tab === "integrations", theme)}>{t("portal.availability.tab.integrations")}</button>
        </div>
      </header>

      {tab === "calendar" && (
        <div style={{ background: c.cardBg, border: `1px solid ${c.border}`, borderRadius: 14, padding: 16 }}>
          <div style={{ display: "flex", alignItems: "center", marginBottom: 12, gap: 8 }}>
            <button onClick={() => shiftDate(-1)} style={navBtnStyle(theme)} aria-label={t("portal.availability.prev")}>‹</button>
            <div style={{ flex: 1, textAlign: "center", fontSize: 18, fontWeight: 800 }}>
              {viewMode === "month" ? monthName : `Week of ${viewWeekStart.toLocaleDateString("en-GB", { month: "short", day: "numeric" })}`}
            </div>
            <button onClick={() => shiftDate(+1)} style={navBtnStyle(theme)} aria-label={t("portal.availability.next")}>›</button>
            <div style={{ display: "flex", gap: 4, background: c.cardBgSubtle, padding: 4, borderRadius: 8, border: `1px solid ${c.border}` }}>
              <button onClick={() => setViewMode("month")} style={tabBtn(viewMode === "month", theme)}>{t("portal.availability.view.month")}</button>
              <button onClick={() => setViewMode("week")} style={tabBtn(viewMode === "week", theme)}>{t("portal.availability.view.week")}</button>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4, marginBottom: 4 }}>
            {["mon", "tue", "wed", "thu", "fri", "sat", "sun"].map((wk) => (
              <div key={wk} style={{ fontSize: 11, fontWeight: 700, color: c.muted, textAlign: "center", padding: "4px 0", textTransform: "uppercase" }}>{t(`portal.availability.weekday.${wk}` as any)}</div>
            ))}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
            {cells.map((cell, i) => {
              if (!cell.iso) return <div key={i} style={{ aspectRatio: "1" }} />;

              // Resolve states
              const isToday = cell.iso === isoDateOnly(today);
              const dayEntries = entries.filter(e =>
                overlapsLocalDay(e.startAt, e.endAt, cell.iso!),
              );
              const dayBusy = externalBusy.filter(e =>
                overlapsLocalDay(e.startAt, e.endAt, cell.iso!),
              );

              let isAvailable = dayEntries.some(e => e.status === "available");
              let isUnavailable = dayEntries.some(e => e.status === "unavailable") || dayBusy.length > 0;
              let isTentative = dayEntries.some(e => e.status === "tentative");

              // Local migration fallback if server provides nothing for this day
              if (dayEntries.length === 0 && dayBusy.length === 0) {
                const localState = data.availability[cell.iso!];
                if (localState === "available") isAvailable = true;
                if (localState === "busy") isUnavailable = true;
              }

              const hasGig = gigsOverlap(cell.iso);

              let bg: string = c.cardBgSubtle;
              if (isAvailable) bg = "rgba(22, 163, 74, 0.15)";
              if (isUnavailable) bg = "rgba(220, 38, 38, 0.15)";
              if (hasGig) bg = "rgba(99, 102, 241, 0.15)";

              return (
                <div
                  key={i}
                  style={{
                    aspectRatio: "1",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "flex-start",
                    paddingTop: 8,
                    fontSize: 13,
                    fontWeight: 700,
                    borderRadius: 8,
                    cursor: "pointer",
                    background: bg,
                    color: c.text,
                    border: isToday ? `2px solid ${c.accent}` : `1px solid ${c.border}`,
                    position: "relative"
                  }}
                >
                  <button
                    type="button"
                    onClick={() => openNewEntry(cell.iso!)}
                    aria-label={`Add availability for ${cell.iso}`}
                    style={{
                      position: "absolute",
                      inset: 0,
                      border: 0,
                      background: "transparent",
                      color: "inherit",
                      cursor: "pointer",
                      borderRadius: "inherit",
                    }}
                  >
                    <span style={{ position: "absolute", top: 7, left: 0, right: 0 }}>
                      {cell.day}
                    </span>
                  </button>
                  <div className="availability-cell-badges">
                    {dayEntries.map((entry) =>
                      entry.ruleId ? (
                      <span
                        key={`${entry.ruleId || entry.id}-${entry.startAt}`}
                        className={`availability-time-badge availability-time-badge--${entry.status}`}
                        title={`${entryTimeLabel(entry)}${entry.note ? ` · ${entry.note}` : ""}`}
                      >
                        <span className="availability-time-badge__dot" />
                        <span className="availability-time-badge__label">
                          {entryTimeLabel(entry)}
                        </span>
                      </span>
                      ) : (
                        <button
                          type="button"
                          key={entry.id}
                          className={`availability-time-badge availability-time-badge--${entry.status}`}
                          onClick={() => openExistingEntry(cell.iso!, entry)}
                          title={`${entryTimeLabel(entry)}${entry.note ? ` · ${entry.note}` : ""}`}
                        >
                          <span className="availability-time-badge__dot" />
                          <span className="availability-time-badge__label">
                            {entryTimeLabel(entry)}
                          </span>
                        </button>
                      ),
                    )}
                    {dayBusy.map((busy) => (
                      <span
                        key={busy.id}
                        className="availability-time-badge availability-time-badge--unavailable"
                        title={`${localTimeOnly(busy.startAt)} - ${localTimeOnly(busy.endAt)}`}
                      >
                        <span className="availability-time-badge__dot" />
                        <span className="availability-time-badge__label">
                          {localTimeOnly(busy.startAt)} - {localTimeOnly(busy.endAt)}
                        </span>
                      </span>
                    ))}
                    {hasGig ? (
                      <span className="availability-time-badge availability-time-badge--gig">
                        <span className="availability-time-badge__dot" />
                        <span className="availability-time-badge__label">
                          {t("portal.availability.legend.gig")}
                        </span>
                      </span>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>


          <div style={{ marginTop: 14, display: "flex", gap: 14, flexWrap: "wrap", justifyContent: "center", fontSize: 12, color: c.muted }}>
            <LegendDot color="#16a34a" label={t("portal.availability.legend.available")} />
            <LegendDot color="#dc2626" label={t("portal.availability.legend.unavailable")} />
            <LegendDot color="#6366f1" label={t("portal.availability.legend.gig")} />
          </div>

          <div style={{ marginTop: 14, display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
            <button onClick={() => handleBulk("available", "month")} style={btnPill(theme)}>{t("portal.availability.bulk.monthAvailable")}</button>
            <button onClick={() => handleBulk("unavailable", "month")} style={btnPill(theme)}>{t("portal.availability.bulk.monthUnavailable")}</button>
            <button onClick={() => handleBulk("available", "today")} style={btnPill(theme)}>{t("portal.availability.bulk.freeFromToday")}</button>
          </div>

        </div>
      )}

      {tab === "integrations" && (
        <div style={{ display: "grid", gap: 16 }}>
          <div style={{ background: c.cardBg, border: `1px solid ${c.border}`, borderRadius: 14, padding: 20 }}>
            <h3 style={{ margin: "0 0 16px", fontSize: 18 }}>{t("portal.availability.connectedAccounts")}</h3>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <ConnectionRow
                provider="google"
                name="Google Calendar"
                connection={connections.find(c => c.provider === "google")}
                onStart={() => handleStartConnection("google")}
                onSync={handleSync}
                onDelete={handleDeleteConnection}
                theme={theme}
                t={t}
              />
              <ConnectionRow
                provider="microsoft"
                name="Microsoft Outlook"
                connection={connections.find(c => c.provider === "microsoft")}
                onStart={() => handleStartConnection("microsoft")}
                onSync={handleSync}
                onDelete={handleDeleteConnection}
                theme={theme}
                t={t}
              />
              {connections.filter(c => c.provider === "ics").map(c => (
                <ConnectionRow
                  key={c.id}
                  provider="ics"
                  name="ICS Subscription"
                  connection={c}
                  onStart={() => {}}
                  onSync={handleSync}
                  onDelete={handleDeleteConnection}
                  theme={theme}
                  t={t}
                />
              ))}
            </div>


            <h3 style={{ margin: "32px 0 16px", fontSize: 18 }}>{t("portal.availability.privateIcs")}</h3>
            <p style={{ fontSize: 13, color: c.muted, marginBottom: 12 }}>
              {t("portal.availability.icsHint")}
            </p>
            <div style={{ display: "flex", gap: 8 }}>
              <input type="url" value={icsUrl} onChange={e => setIcsUrl(e.target.value)} placeholder="https://..." style={{ flex: 1, padding: "8px 12px", borderRadius: 8, border: `1px solid ${c.border}`, background: c.inputBg, color: c.text }} />
              <button onClick={handleAddIcs} style={{ padding: "8px 16px", background: c.accent, color: "#fff", border: "none", borderRadius: 8, fontWeight: "bold", cursor: "pointer" }}>{t("portal.availability.addUrl")}</button>
            </div>
          </div>

          <div style={{ background: c.cardBg, border: `1px solid ${c.border}`, borderRadius: 14, padding: 20 }}>
            <h3 style={{ margin: "0 0 16px", fontSize: 18 }}>{t("portal.availability.export")}</h3>
            <p style={{ fontSize: 13, color: c.muted, marginBottom: 16 }}>
              {t("portal.availability.exportHint")}
            </p>
            {feed?.enabled && (
              <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
                <input readOnly value={feed.url} style={{ flex: 1, padding: "8px 12px", borderRadius: 8, border: `1px solid ${c.border}`, background: c.inputBg, color: c.text }} />
                <button onClick={handleCopy} style={{ padding: "8px 16px", background: c.cardBgSubtle, color: c.text, border: `1px solid ${c.border}`, borderRadius: 8, cursor: "pointer" }}>{copied ? t("portal.availability.copied") : t("portal.availability.copy")}</button>
                <button onClick={handleRotateFeed} style={{ padding: "8px 16px", background: "transparent", color: c.danger, border: `1px solid ${c.danger}`, borderRadius: 8, cursor: "pointer" }}>{t("portal.availability.rotate")}</button>
              </div>
            )}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {feed?.url && (
                <>
                  <a href={`https://calendar.google.com/calendar/r?cid=${encodeURIComponent(getWebcalUrl())}`} target="_blank" rel="noopener noreferrer" style={{...btnPill(theme), textDecoration: "none"}}>{t("portal.availability.addToGoogle")}</a>
                  <a href={getWebcalUrl()} style={{...btnPill(theme), textDecoration: "none"}}>{t("portal.availability.addToApple")}</a>
                  <a href={`https://outlook.office.com/calendar/0/addcalendar?url=${encodeURIComponent(getWebcalUrl())}&name=EHS+Portal`} target="_blank" rel="noopener noreferrer" style={{...btnPill(theme), textDecoration: "none"}}>{t("portal.availability.addToOutlook")}</a>
                </>
              )}
              <button onClick={handleDownload} style={btnPill(theme)}>{t("portal.availability.downloadIcs")}</button>
            </div>
            <p style={{ fontSize: 12, color: c.danger, marginTop: 16 }}>
              {t("portal.availability.rotateWarning")}
            </p>
          </div>
        </div>
      )}

      {rotateConfirm && (
        <div role="dialog" aria-modal="true" style={{ position: "fixed", inset: 0, zIndex: 1000, display: "grid", placeItems: "center", background: "rgba(0,0,0,0.5)", padding: 20 }}>
          <div style={{ background: c.cardBg, color: c.text, padding: 24, borderRadius: 12, width: "100%", maxWidth: 400, minWidth: "min(100vw - 32px, 320px)", boxShadow: "0 24px 80px rgba(0,0,0,0.2)" }}>
            <h2 style={{ margin: "0 0 12px" }}>{t("portal.availability.rotateDialog.title")}</h2>
            <p style={{ margin: "0 0 24px", color: c.muted, fontSize: 14 }}>{t("portal.availability.rotateDialog.body")}</p>
            <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "flex-end", gap: 12 }}>
              <button onClick={() => setRotateConfirm(false)} style={{ padding: "8px 16px", background: "transparent", border: "none", color: c.muted, cursor: "pointer" }}>{t("portal.availability.rotateDialog.cancel")}</button>
              <button onClick={confirmRotate} style={{ padding: "8px 16px", background: c.danger, color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: "bold" }}>{t("portal.availability.rotateDialog.confirm")}</button>
            </div>
          </div>
        </div>
      )}
      {editorDate && (
        <EditorDialog
          date={editorDate}
          onClose={() => {
            setEditorDate(null);
            setEditorEntryId(null);
          }}
          onSave={loadCalendar}
          theme={theme}
          getToken={getToken}
          baseUrl={baseUrl}
          existingEntry={
            editorEntryId
              ? entries.find((entry) => entry.id === editorEntryId)
              : undefined
          }
        />
      )}
      <style>{`
        .availability-cell-badges {
          position: absolute;
          top: 27px;
          left: 3px;
          right: 3px;
          z-index: 1;
          display: grid;
          gap: 3px;
          max-height: calc(100% - 31px);
          overflow-y: auto;
        }
        .availability-time-badge {
          display: flex;
          align-items: center;
          gap: 4px;
          min-width: 0;
          padding: 2px 5px;
          border-radius: 999px;
          font-size: 9px;
          line-height: 1.25;
          font-weight: 700;
          white-space: nowrap;
          overflow: hidden;
        }
        button.availability-time-badge { cursor: pointer; }
        .availability-time-badge--available {
          color: #047857;
          background: rgba(16,185,129,.2);
          border: 1px solid rgba(16,185,129,.4);
        }
        .availability-time-badge--unavailable {
          color: #be123c;
          background: rgba(244,63,94,.2);
          border: 1px solid rgba(244,63,94,.4);
        }
        .availability-time-badge--tentative {
          color: #a16207;
          background: rgba(234,179,8,.2);
          border: 1px solid rgba(234,179,8,.4);
        }
        .availability-time-badge--gig {
          color: #7e22ce;
          background: rgba(168,85,247,.2);
          border: 1px solid rgba(168,85,247,.4);
        }
        [data-theme="dark"] .availability-time-badge--available { color: #34d399; }
        [data-theme="dark"] .availability-time-badge--unavailable { color: #fb7185; }
        [data-theme="dark"] .availability-time-badge--tentative { color: #facc15; }
        [data-theme="dark"] .availability-time-badge--gig { color: #c084fc; }
        .availability-time-badge__dot {
          width: 5px;
          height: 5px;
          flex: 0 0 5px;
          border-radius: 50%;
          background: currentColor;
        }
        .availability-time-badge__label {
          overflow: hidden;
          text-overflow: ellipsis;
        }
        @media (max-width: 520px) {
          .availability-time-badge {
            justify-content: center;
            padding: 2px;
          }
          .availability-time-badge__label { display: none; }
        }
        .availability-time-input:focus {
          outline: none;
          border-color: #f97316 !important;
          box-shadow: 0 0 0 2px rgba(249, 115, 22, 0.45);
        }
      `}</style>
    </div>
  );
}

function ConnectionRow({ provider, name, connection, onStart, onSync, onDelete, theme, t }: { provider: string, name: string, connection: any, onStart: () => void, onSync: (id: string) => void, onDelete: (id: string) => void, theme: import("../lib/portalTheme").ThemeMode, t: ReturnType<typeof useT> }) {
  const c = PALETTE[theme];
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: 16, border: `1px solid ${c.border}`, borderRadius: 8, background: c.cardBgSubtle }}>
      <div>
        <div style={{ fontWeight: "bold", fontSize: 15 }}>{name}</div>
        <div style={{ fontSize: 12, color: c.muted }}>
  {connection?.connected ? (
    <>
      {t("portal.availability.connectedAs")} {connection.accountLabel || "Unknown"}
      {connection.lastSyncedAt && ` · ${t("portal.availability.synced")} ${new Date(connection.lastSyncedAt).toLocaleString()}`}
      {connection.lastError && <span style={{color: c.danger}}> · {t("portal.availability.error")}: {connection.lastError}</span>}
    </>
  ) : t("portal.availability.notConnected")}
</div>
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        {connection?.connected ? (
          <>
            <button onClick={() => onSync(connection.id)} style={{ padding: "6px 12px", fontSize: 13, background: "transparent", border: `1px solid ${c.border}`, color: c.text, borderRadius: 6, cursor: "pointer" }}>{t("portal.availability.sync")}</button>
            <button onClick={() => onDelete(connection.id)} style={{ padding: "6px 12px", fontSize: 13, background: "transparent", border: `1px solid ${c.danger}`, color: c.danger, borderRadius: 6, cursor: "pointer" }}>{t("portal.availability.disconnect")}</button>
          </>
        ) : (
          <button onClick={onStart} style={{ padding: "6px 12px", fontSize: 13, background: c.accent, border: "none", color: "#fff", borderRadius: 6, cursor: "pointer", fontWeight: "bold" }}>{t("portal.availability.connect")}</button>
        )}
      </div>
    </div>
  );
}

function EditorDialog({ date, onClose, onSave, theme, getToken, baseUrl, existingEntry }: { date: string, onClose: () => void, onSave: () => void, theme: import("../lib/portalTheme").ThemeMode, getToken: any, baseUrl: string, existingEntry?: CalendarEntry }) {
  const c = PALETTE[theme];
  const t = useT();
  const [status, setStatus] = useState(existingEntry?.status || "available");
  const [allDay, setAllDay] = useState(existingEntry ? existingEntry.allDay : true);
  const existingStartTime = existingEntry && !existingEntry.allDay ? localTimeOnly(existingEntry.startAt) : "08:00";
  const existingEndTime = existingEntry && !existingEntry.allDay ? localTimeOnly(existingEntry.endAt) : "17:00";
  const [startAt, setStartAt] = useState(existingStartTime);
  const [endAt, setEndAt] = useState(existingEndTime);
  const [note, setNote] = useState(existingEntry?.note || "");
  const [recurrence, setRecurrence] = useState("none");
  const [until, setUntil] = useState("");
  const locale = document.documentElement.lang === "en" ? "en-GB" : "nb-NO";
  const formattedDate = new Intl.DateTimeFormat(locale, {
    weekday: "long",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(localDateTime(date, "12:00") ?? new Date(date));


  const handleClear = async () => {
    if (!existingEntry) {
      onClose();
      return;
    }
    if (!window.confirm(t("portal.availability.editor.deleteConfirm"))) return;
    const token = await getToken();
    const res = await fetch(`${baseUrl}api/portal/calendar/availability/${existingEntry.ruleId || existingEntry.id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) {
      toast.error(await responseError(res));
      return;
    }
    toast.success("Availability cleared");
    onSave();
    onClose();
  };

  const handleSave = async () => {
    const token = await getToken();
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;

    const startLocal = localDateTime(date, allDay ? "00:00" : startAt);
    let endLocal: Date | null;
    if (allDay) {
      endLocal = localDateTime(date, "00:00");
      endLocal?.setDate(endLocal.getDate() + 1);
    } else {
      endLocal = localDateTime(date, endAt);
    }
    if (!startLocal || !endLocal || endLocal <= startLocal) {
      toast.error("Choose a valid start and end time.");
      return;
    }
    const startsAt = startLocal.toISOString();
    const endsAt = endLocal.toISOString();

    const body: any = {
      status,
      startsAt,
      endsAt,
      timezone: tz,
      allDay,
      privateNote: note
    };

    if (recurrence === "weekly" && until) {
      const [y, m, d] = date.split("-").map(Number);
      const localDate = new Date(y, m - 1, d);
      const weekday = localDate.getDay();
      const untilLocal = localDateTime(until, "23:59");
      if (!untilLocal) {
        toast.error("Choose a valid recurrence end date.");
        return;
      }
      const untilIso = untilLocal.toISOString();

      body.recurrence = { type: "weekly", days: [weekday], until: untilIso };
      body.weekday = weekday;
      body.startMinute = allDay
        ? 0
        : parseInt(startAt.split(":")[0] || "0") * 60 + parseInt(startAt.split(":")[1] || "0");
      body.endMinute = allDay
        ? 1440
        : parseInt(endAt.split(":")[0] || "0") * 60 + parseInt(endAt.split(":")[1] || "0");
      body.until = untilIso;
    }

    const canUpdate = Boolean(existingEntry && !existingEntry.ruleId);
    const endpoint = canUpdate
      ? `${baseUrl}api/portal/calendar/availability/${existingEntry!.id}`
      : `${baseUrl}api/portal/calendar/availability`;
    const res = await fetch(endpoint, {
      method: canUpdate ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(body)
    });

    if (!res.ok) {
      toast.error(await responseError(res));
      return;
    }

    toast.success("Availability updated successfully");
    onSave();
    onClose();
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div role="dialog" aria-modal="true" style={{ position: "fixed", inset: 0, zIndex: 1000, display: "grid", placeItems: "center", background: "rgba(0,0,0,0.5)", padding: 20 }}>
      <div style={{ background: c.cardBg, color: c.text, padding: 24, borderRadius: 12, width: "100%", maxWidth: 400, minWidth: "min(100vw - 32px, 320px)", boxShadow: "0 24px 80px rgba(0,0,0,0.2)" }}>
        <h2 style={{ margin: "0 0 6px" }}>{t("portal.availability.editor.title")}</h2>
        <div style={{ marginBottom: 20, color: c.muted, fontSize: 14 }}>
          {formattedDate}
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
          {(["available", "unavailable", "tentative"] as const).map(s => (
            <button key={s} onClick={() => setStatus(s)} style={{ flex: 1, padding: "8px", textTransform: "capitalize", borderRadius: 8, border: `1px solid ${status === s ? c.accent : c.border}`, background: status === s ? c.cardBgSubtle : "transparent", color: c.text, cursor: "pointer", fontWeight: status === s ? "bold" : "normal" }}>
              {s === "available" ? t("portal.availability.legend.available") : s === "unavailable" ? t("portal.availability.legend.unavailable") : s}
            </button>
          ))}
        </div>

        <div style={{ display: "grid", gap: 12, margin: "8px 0 16px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, cursor: "pointer" }}>
              <input type="checkbox" checked={allDay} onChange={(e) => setAllDay(e.target.checked)} />
              <span>{t("portal.availability.editor.allDay")}</span>
            </label>
          </div>

          {!allDay && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12 }}>
              <label style={{ minWidth: 0, fontSize: 12, color: c.muted }}>
                {t("portal.availability.editor.startTime")}
                <input className="availability-time-input" type="time" value={startAt} onChange={(e) => setStartAt(e.target.value)} style={{ ...timeInputStyle(theme), width: "100%", marginTop: 4 }} />
              </label>
              <label style={{ minWidth: 0, fontSize: 12, color: c.muted }}>
                {t("portal.availability.editor.endTime")}
                <input className="availability-time-input" type="time" value={endAt} onChange={(e) => setEndAt(e.target.value)} style={{ ...timeInputStyle(theme), width: "100%", marginTop: 4 }} />
              </label>
            </div>
          )}
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "block", fontSize: 12, marginBottom: 4, color: c.muted }}>{t("portal.availability.editor.note")}</label>
          <input type="text" value={note} onChange={(e) => setNote(e.target.value)} style={{ ...inputStyle(theme), width: "100%" }} placeholder={t("portal.availability.editor.notePlaceholder")} />
        </div>

        {!existingEntry ? <div style={{ marginBottom: 24 }}>
          <label style={{ display: "block", fontSize: 12, marginBottom: 4, color: c.muted }}>{t("portal.availability.editor.repeat")}</label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
            <select value={recurrence} onChange={(e) => setRecurrence(e.target.value)} style={inputStyle(theme)}>
              <option value="none">{t("portal.availability.editor.repeatNone")}</option>
              <option value="weekly">{t("portal.availability.editor.repeatWeekly")}</option>
            </select>
            {recurrence === "weekly" && (
              <input type="date" value={until} onChange={(e) => setUntil(e.target.value)} style={inputStyle(theme)} />
            )}
          </div>
        </div> : null}

        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
          <button onClick={handleClear} style={{ padding: "8px 16px", background: "transparent", border: `1px solid ${c.danger}`, color: c.danger, borderRadius: 8, cursor: "pointer", visibility: existingEntry ? "visible" : "hidden" }}>{t("portal.availability.editor.clear")}</button>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
            <button onClick={onClose} style={{ padding: "8px 16px", background: "transparent", border: "none", color: c.muted, cursor: "pointer" }}>{t("portal.availability.editor.close")}</button>
            <button onClick={handleSave} style={{ padding: "8px 16px", background: c.accent, color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: "bold" }}>{t("portal.availability.editor.save")}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
      <span style={{ width: 12, height: 12, borderRadius: 6, background: color }} />
      <span>{label}</span>
    </span>
  );
}

function tabBtn(active: boolean, theme: ThemeMode): React.CSSProperties {
  const c = PALETTE[theme];
  return {
    padding: "6px 14px",
    fontSize: 13,
    fontWeight: active ? 700 : 500,
    background: active ? c.cardBg : "transparent",
    color: active ? c.text : c.muted,
    border: "none",
    borderRadius: 6,
    cursor: "pointer",
    boxShadow: active ? "0 1px 3px rgba(0,0,0,0.1)" : "none"
  };
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

function inputStyle(theme: ThemeMode): React.CSSProperties {
  const c = PALETTE[theme];
  return {
    padding: "8px 12px",
    borderRadius: 8,
    border: `1px solid ${c.inputBorder}`,
    background: c.inputBg,
    color: c.text,
    fontSize: 14
  };
}

function timeInputStyle(theme: ThemeMode): React.CSSProperties {
  const dark = theme === "dark";
  return {
    padding: "8px 12px",
    borderRadius: 8,
    border: `1px solid ${dark ? "#334155" : "#cbd5e1"}`,
    background: dark ? "#1e293b" : "#ffffff",
    color: dark ? "#f1f5f9" : "#0f172a",
    colorScheme: dark ? "dark" : "light",
    opacity: 1,
    pointerEvents: "auto",
    fontSize: 14,
  };
}

function btnPill(theme: ThemeMode): React.CSSProperties {
  const c = PALETTE[theme];
  return {
    padding: "8px 16px",
    borderRadius: 999,
    border: `1px solid ${c.border}`,
    background: c.cardBgSubtle,
    color: c.text,
    fontSize: 13,
    fontWeight: "bold",
    cursor: "pointer"
  };
}
