import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PALETTE, type ThemeMode } from "../lib/portalTheme";
import { type PortalData } from "../lib/portalStorage";
import { useAuth } from "@clerk/react";
import { toast } from "sonner";

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
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800 }}>Availability & Calendar</h1>
        <div style={{ display: "flex", gap: 8, background: c.cardBgSubtle, padding: 4, borderRadius: 8, border: `1px solid ${c.border}` }}>
          <button onClick={() => setTab("calendar")} style={tabBtn(tab === "calendar", theme)}>Calendar</button>
          <button onClick={() => setTab("integrations")} style={tabBtn(tab === "integrations", theme)}>Sync & Integrations</button>
        </div>
      </header>

      {tab === "calendar" && (
        <div style={{ background: c.cardBg, border: `1px solid ${c.border}`, borderRadius: 14, padding: 16 }}>
          <div style={{ display: "flex", alignItems: "center", marginBottom: 12, gap: 8 }}>
            <button onClick={() => shiftDate(-1)} style={navBtnStyle(theme)} aria-label="Previous">‹</button>
            <div style={{ flex: 1, textAlign: "center", fontSize: 18, fontWeight: 800 }}>
              {viewMode === "month" ? monthName : `Week of ${viewWeekStart.toLocaleDateString("en-GB", { month: "short", day: "numeric" })}`}
            </div>
            <button onClick={() => shiftDate(+1)} style={navBtnStyle(theme)} aria-label="Next">›</button>
            <div style={{ display: "flex", gap: 4, background: c.cardBgSubtle, padding: 4, borderRadius: 8, border: `1px solid ${c.border}` }}>
              <button onClick={() => setViewMode("month")} style={tabBtn(viewMode === "month", theme)}>Month</button>
              <button onClick={() => setViewMode("week")} style={tabBtn(viewMode === "week", theme)}>Week</button>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4, marginBottom: 4 }}>
            {["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map(wk => (
              <div key={wk} style={{ fontSize: 11, fontWeight: 700, color: c.muted, textAlign: "center", padding: "4px 0", textTransform: "uppercase" }}>{wk}</div>
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

              // partial day times in week view
              let timeLabel = "";
              if (viewMode === "week") {
                 const firstPartial = dayEntries.find(e => !e.allDay);
                 if (firstPartial) {
                     timeLabel = `${new Date(firstPartial.startAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} - ${new Date(firstPartial.endAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
                 }
              }

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
                <button
                  key={i}
                  onClick={() => setEditorDate(cell.iso!)}
                  aria-label={`Update availability for ${cell.iso}`}
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
                  {cell.day}
                  {viewMode === "week" && timeLabel && <div style={{ fontSize: 10, marginTop: 4, fontWeight: "normal" }}>{timeLabel}</div>}
                  <div style={{ display: "flex", gap: 2, marginTop: 4 }}>
                    {isAvailable && <div style={{width:6,height:6,borderRadius:3,background:"#16a34a"}}/>}
                    {isTentative && <div style={{width:6,height:6,borderRadius:3,background:"#eab308"}}/>}
                    {isUnavailable && <div style={{width:6,height:6,borderRadius:3,background:"#dc2626"}}/>}
                    {hasGig && <div style={{width:6,height:6,borderRadius:3,background:"#6366f1"}}/>}
                  </div>
                </button>
              );
            })}
          </div>


          <div style={{ marginTop: 14, display: "flex", gap: 14, flexWrap: "wrap", justifyContent: "center", fontSize: 12, color: c.muted }}>
            <LegendDot color="#16a34a" label="Available" />
            <LegendDot color="#dc2626" label="Unavailable / Busy" />
            <LegendDot color="#6366f1" label="EHS Gig" />
          </div>

          <div style={{ marginTop: 14, display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
            <button onClick={() => handleBulk("available", "month")} style={btnPill(theme)}>Mark Month Available</button>
            <button onClick={() => handleBulk("unavailable", "month")} style={btnPill(theme)}>Mark Month Unavailable</button>
            <button onClick={() => handleBulk("available", "today")} style={btnPill(theme)}>Mark Free From Today</button>
          </div>

        </div>
      )}

      {tab === "integrations" && (
        <div style={{ display: "grid", gap: 16 }}>
          <div style={{ background: c.cardBg, border: `1px solid ${c.border}`, borderRadius: 14, padding: 20 }}>
            <h3 style={{ margin: "0 0 16px", fontSize: 18 }}>Connected Accounts</h3>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <ConnectionRow
                provider="google"
                name="Google Calendar"
                connection={connections.find(c => c.provider === "google")}
                onStart={() => handleStartConnection("google")}
                onSync={handleSync}
                onDelete={handleDeleteConnection}
                theme={theme}
              />
              <ConnectionRow
                provider="microsoft"
                name="Microsoft Outlook"
                connection={connections.find(c => c.provider === "microsoft")}
                onStart={() => handleStartConnection("microsoft")}
                onSync={handleSync}
                onDelete={handleDeleteConnection}
                theme={theme}
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
                />
              ))}
            </div>


            <h3 style={{ margin: "32px 0 16px", fontSize: 18 }}>Private ICS Import</h3>
            <p style={{ fontSize: 13, color: c.muted, marginBottom: 12 }}>
              Paste a private ICS URL to sync external busy intervals. Treat this URL like a password.
            </p>
            <div style={{ display: "flex", gap: 8 }}>
              <input type="url" value={icsUrl} onChange={e => setIcsUrl(e.target.value)} placeholder="https://..." style={{ flex: 1, padding: "8px 12px", borderRadius: 8, border: `1px solid ${c.border}`, background: c.inputBg, color: c.text }} />
              <button onClick={handleAddIcs} style={{ padding: "8px 16px", background: c.accent, color: "#fff", border: "none", borderRadius: 8, fontWeight: "bold", cursor: "pointer" }}>Add URL</button>
            </div>
          </div>

          <div style={{ background: c.cardBg, border: `1px solid ${c.border}`, borderRadius: 14, padding: 20 }}>
            <h3 style={{ margin: "0 0 16px", fontSize: 18 }}>Export Calendar</h3>
            <p style={{ fontSize: 13, color: c.muted, marginBottom: 16 }}>
              Subscribe to your EHS shifts and holds from your personal calendar.
            </p>
            {feed?.enabled && (
              <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
                <input readOnly value={feed.url} style={{ flex: 1, padding: "8px 12px", borderRadius: 8, border: `1px solid ${c.border}`, background: c.inputBg, color: c.text }} />
                <button onClick={handleCopy} style={{ padding: "8px 16px", background: c.cardBgSubtle, color: c.text, border: `1px solid ${c.border}`, borderRadius: 8, cursor: "pointer" }}>{copied ? "Copied" : "Copy"}</button>
                <button onClick={handleRotateFeed} style={{ padding: "8px 16px", background: "transparent", color: c.danger, border: `1px solid ${c.danger}`, borderRadius: 8, cursor: "pointer" }}>Rotate</button>
              </div>
            )}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {feed?.url && (
                <>
                  <a href={`https://calendar.google.com/calendar/r?cid=${encodeURIComponent(getWebcalUrl())}`} target="_blank" rel="noopener noreferrer" style={{...btnPill(theme), textDecoration: "none"}}>Add to Google Calendar</a>
                  <a href={getWebcalUrl()} style={{...btnPill(theme), textDecoration: "none"}}>Add to Apple Calendar</a>
                  <a href={`https://outlook.office.com/calendar/0/addcalendar?url=${encodeURIComponent(getWebcalUrl())}&name=EHS+Portal`} target="_blank" rel="noopener noreferrer" style={{...btnPill(theme), textDecoration: "none"}}>Add to Outlook</a>
                </>
              )}
              <button onClick={handleDownload} style={btnPill(theme)}>Download .ics</button>
            </div>
            <p style={{ fontSize: 12, color: c.danger, marginTop: 16 }}>
              Warning: Rotating your subscription URL will immediately revoke access to the old link.
            </p>
          </div>
        </div>
      )}

      {rotateConfirm && (
        <div role="dialog" aria-modal="true" style={{ position: "fixed", inset: 0, zIndex: 1000, display: "grid", placeItems: "center", background: "rgba(0,0,0,0.5)", padding: 20 }}>
          <div style={{ background: c.cardBg, color: c.text, padding: 24, borderRadius: 12, width: "100%", maxWidth: 400, boxShadow: "0 24px 80px rgba(0,0,0,0.2)" }}>
            <h2 style={{ margin: "0 0 12px" }}>Rotate Subscription</h2>
            <p style={{ margin: "0 0 24px", color: c.muted, fontSize: 14 }}>Are you sure? Your old calendar link will stop working immediately.</p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
              <button onClick={() => setRotateConfirm(false)} style={{ padding: "8px 16px", background: "transparent", border: "none", color: c.muted, cursor: "pointer" }}>Cancel</button>
              <button onClick={confirmRotate} style={{ padding: "8px 16px", background: c.danger, color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: "bold" }}>Rotate Link</button>
            </div>
          </div>
        </div>
      )}
      {editorDate && (
        <EditorDialog
          date={editorDate}
          onClose={() => setEditorDate(null)}
          onSave={loadCalendar}
          theme={theme}
          getToken={getToken}
          baseUrl={baseUrl}
          existingEntry={entries.find(e =>
            overlapsLocalDay(e.startAt, e.endAt, editorDate),
          )}
        />
      )}
    </div>
  );
}

function ConnectionRow({ provider, name, connection, onStart, onSync, onDelete, theme }: { provider: string, name: string, connection: any, onStart: () => void, onSync: (id: string) => void, onDelete: (id: string) => void, theme: import("../lib/portalTheme").ThemeMode }) {
  const c = PALETTE[theme];
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: 16, border: `1px solid ${c.border}`, borderRadius: 8, background: c.cardBgSubtle }}>
      <div>
        <div style={{ fontWeight: "bold", fontSize: 15 }}>{name}</div>
        <div style={{ fontSize: 12, color: c.muted }}>
  {connection?.connected ? (
    <>
      Connected as {connection.accountLabel || "Unknown"}
      {connection.lastSyncedAt && ` · Synced ${new Date(connection.lastSyncedAt).toLocaleString()}`}
      {connection.lastError && <span style={{color: c.danger}}> · Error: {connection.lastError}</span>}
    </>
  ) : "Not connected"}
</div>
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        {connection?.connected ? (
          <>
            <button onClick={() => onSync(connection.id)} style={{ padding: "6px 12px", fontSize: 13, background: "transparent", border: `1px solid ${c.border}`, color: c.text, borderRadius: 6, cursor: "pointer" }}>Sync</button>
            <button onClick={() => onDelete(connection.id)} style={{ padding: "6px 12px", fontSize: 13, background: "transparent", border: `1px solid ${c.danger}`, color: c.danger, borderRadius: 6, cursor: "pointer" }}>Disconnect</button>
          </>
        ) : (
          <button onClick={onStart} style={{ padding: "6px 12px", fontSize: 13, background: c.accent, border: "none", color: "#fff", borderRadius: 6, cursor: "pointer", fontWeight: "bold" }}>Connect</button>
        )}
      </div>
    </div>
  );
}

function EditorDialog({ date, onClose, onSave, theme, getToken, baseUrl, existingEntry }: { date: string, onClose: () => void, onSave: () => void, theme: import("../lib/portalTheme").ThemeMode, getToken: any, baseUrl: string, existingEntry?: CalendarEntry }) {
  const c = PALETTE[theme];
  const [status, setStatus] = useState(existingEntry?.status || "available");
  const [allDay, setAllDay] = useState(existingEntry ? existingEntry.allDay : true);
  const existingStartTime = existingEntry && !existingEntry.allDay ? localTimeOnly(existingEntry.startAt) : "08:00";
  const existingEndTime = existingEntry && !existingEntry.allDay ? localTimeOnly(existingEntry.endAt) : "17:00";
  const [startAt, setStartAt] = useState(existingStartTime);
  const [endAt, setEndAt] = useState(existingEndTime);
  const [note, setNote] = useState(existingEntry?.note || "");
  const [recurrence, setRecurrence] = useState("none");
  const [until, setUntil] = useState("");


  const handleClear = async () => {
    if (!existingEntry) {
      onClose();
      return;
    }
    const token = await getToken();
    const res = await fetch(`${baseUrl}api/portal/calendar/availability/${existingEntry.ruleId || existingEntry.id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) {
      toast.error(await res.text());
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

    const res = await fetch(`${baseUrl}api/portal/calendar/availability`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(body)
    });

    if (!res.ok) {
      toast.error(await res.text());
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
      <div style={{ background: c.cardBg, color: c.text, padding: 24, borderRadius: 12, width: "100%", maxWidth: 400, boxShadow: "0 24px 80px rgba(0,0,0,0.2)" }}>
        <h2 style={{ margin: "0 0 20px" }}>Update Availability for {date}</h2>

        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          {(["available", "unavailable", "tentative"] as const).map(s => (
            <button key={s} onClick={() => setStatus(s)} style={{ flex: 1, padding: "8px", textTransform: "capitalize", borderRadius: 8, border: `1px solid ${status === s ? c.accent : c.border}`, background: status === s ? c.cardBgSubtle : "transparent", color: c.text, cursor: "pointer", fontWeight: status === s ? "bold" : "normal" }}>
              {s}
            </button>
          ))}
        </div>

        <label style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16, cursor: "pointer" }}>
          <input type="checkbox" checked={allDay} onChange={(e) => setAllDay(e.target.checked)} />
          All day
        </label>

        {!allDay && (
          <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
            <input type="time" value={startAt} onChange={(e) => setStartAt(e.target.value)} style={inputStyle(theme)} />
            <span style={{ alignSelf: "center" }}>to</span>
            <input type="time" value={endAt} onChange={(e) => setEndAt(e.target.value)} style={inputStyle(theme)} />
          </div>
        )}

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "block", fontSize: 12, marginBottom: 4, color: c.muted }}>Note (optional)</label>
          <input type="text" value={note} onChange={(e) => setNote(e.target.value)} style={{ ...inputStyle(theme), width: "100%" }} placeholder="e.g. Only for Oslo gigs" />
        </div>

        <div style={{ marginBottom: 24 }}>
          <label style={{ display: "block", fontSize: 12, marginBottom: 4, color: c.muted }}>Recurrence</label>
          <div style={{ display: "flex", gap: 12 }}>
            <select value={recurrence} onChange={(e) => setRecurrence(e.target.value)} style={inputStyle(theme)}>
              <option value="none">Does not repeat</option>
              <option value="weekly">Weekly</option>
            </select>
            {recurrence === "weekly" && (
              <input type="date" value={until} onChange={(e) => setUntil(e.target.value)} style={inputStyle(theme)} />
            )}
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <button onClick={handleClear} style={{ padding: "8px 16px", background: "transparent", border: `1px solid ${c.danger}`, color: c.danger, borderRadius: 8, cursor: "pointer", visibility: existingEntry ? "visible" : "hidden" }}>Clear</button>
          <div style={{ display: "flex", gap: 12 }}>
            <button onClick={onClose} style={{ padding: "8px 16px", background: "transparent", border: "none", color: c.muted, cursor: "pointer" }}>Cancel</button>
            <button onClick={handleSave} style={{ padding: "8px 16px", background: c.accent, color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: "bold" }}>Save</button>
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
