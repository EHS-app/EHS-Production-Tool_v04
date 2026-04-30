import { useEffect, useMemo, useState } from "react";

/** Server response shape for `GET /api/portal/briefs/:id/hotel`.
 *  Mirrors what `portalBriefs.ts` returns. Kept inline (not in `lib/`)
 *  so this view is self-contained — it's the only consumer. Slice A
 *  ships the per-crew list and producer toggles; pairing engine and
 *  rooming-list export ship in Slices B & C. */
type HotelResponse = {
  ok?: boolean;
  brief?: { id: string; projectName: string; venue: string };
  crew?: HotelCrewRow[];
  error?: string;
};

type RoomShare = "twin" | "single" | "either";
type Gender = "" | "female" | "male" | "other";

type HotelCrewRow = {
  gigId: string;
  freelancerUserId: string;
  name: string;
  role: string;
  hotelRequired: boolean;
  /** Server-resolved value: explicit override if the producer set one,
   *  else min(assignedDates) for check-in / max(assignedDates)+1 for
   *  check-out. May be null when the gig has no assigned dates yet. */
  checkInDate: string | null;
  checkOutDate: string | null;
  /** Whether the resolved value above is an explicit producer override
   *  (vs the default derived from assigned days). UI uses this to show
   *  a quiet "auto" hint when the value is derived. */
  checkInExplicit: boolean;
  checkOutExplicit: boolean;
  roomShare: RoomShare;
  gender: Gender;
  phone: string;
  profileless: boolean;
};

const ROOM_SHARE_LABEL: Record<RoomShare, string> = {
  twin: "Twin",
  single: "Single",
  either: "Either",
};

/** Same UTC-stable date formatter as CateringView — render YYYY-MM-DD
 *  strings without timezone day-shift. */
function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    timeZone: "UTC",
  });
}

/** Producer's per-brief hotel logistics view. Slice A scope: per-crew
 *  list with hotel-needed toggle, derived/overridable check-in/out
 *  dates, and the room-share preference + (optional) gender that the
 *  pairing engine will consume in Slice B. Polls every 60 s like the
 *  catering view so freelancer profile edits surface without a
 *  refresh. Owner-only on the server side; we surface a friendly
 *  banner if a non-owner somehow lands here. */
export function HotelView({
  briefId,
  getToken,
}: {
  briefId: string;
  /** Async token resolver from Clerk's `useAuth`. Threaded in from
   *  App.tsx so this component stays decoupled from the auth lib. */
  getToken: () => Promise<string | null>;
}) {
  const [data, setData] = useState<HotelResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  // Per-row in-flight markers so toggling one crew member doesn't
  // disable every other row. Keyed by gigId.
  const [savingByGigId, setSavingByGigId] = useState<Record<string, boolean>>(
    {},
  );

  const baseUrl =
    (typeof import.meta !== "undefined" &&
      (import.meta as { env?: { BASE_URL?: string } }).env?.BASE_URL) ||
    "/";

  useEffect(() => {
    if (!briefId) return;
    let cancelled = false;
    const fetchOnce = async () => {
      try {
        const token = await getToken();
        if (cancelled) return;
        const res = await fetch(
          `${baseUrl}api/portal/briefs/${briefId}/hotel`,
          { headers: token ? { Authorization: `Bearer ${token}` } : {} },
        );
        if (cancelled) return;
        if (!res.ok) {
          const msg =
            res.status === 403
              ? "You don't own this brief."
              : res.status === 404
                ? "Brief not found."
                : "Could not load hotel data.";
          setError(msg);
          setLoading(false);
          return;
        }
        const json = (await res.json()) as HotelResponse;
        if (cancelled) return;
        if (!json.ok) {
          setError(json.error ?? "Could not load hotel data.");
          setLoading(false);
          return;
        }
        setData(json);
        setError(null);
        setLoading(false);
      } catch {
        if (cancelled) return;
        setError("Connection lost — showing last known data.");
        setLoading(false);
      }
    };
    void fetchOnce();
    const t = window.setInterval(fetchOnce, 60_000);
    return () => {
      cancelled = true;
      window.clearInterval(t);
    };
  }, [briefId, getToken, baseUrl]);

  /** Optimistically apply a partial update to a row, then PATCH the
   *  server. On failure we surface the error and revert by re-fetching
   *  on the next poll cycle (or immediately via setError). Concurrent
   *  edits to the same row are gated by `savingByGigId` so the UI
   *  can't race against itself. */
  async function patchRow(
    gigId: string,
    body: {
      hotelRequired?: boolean;
      checkInDate?: string | null;
      checkOutDate?: string | null;
    },
  ) {
    if (!data?.crew) return;
    setSavingByGigId((m) => ({ ...m, [gigId]: true }));
    // Optimistic local update — keep the user's edit visible while
    // the round-trip is in flight. We DO NOT mutate `checkInExplicit`
    // / `checkOutExplicit` locally; the server is the source of truth
    // for whether a value is explicit (it'll come back on the next
    // poll). This avoids a flicker where the "auto" hint disappears
    // for a moment then re-appears.
    setData((prev) => {
      if (!prev?.crew) return prev;
      return {
        ...prev,
        crew: prev.crew.map((row) => {
          if (row.gigId !== gigId) return row;
          return {
            ...row,
            ...(body.hotelRequired !== undefined
              ? { hotelRequired: body.hotelRequired }
              : {}),
            ...(body.checkInDate !== undefined
              ? { checkInDate: body.checkInDate }
              : {}),
            ...(body.checkOutDate !== undefined
              ? { checkOutDate: body.checkOutDate }
              : {}),
          };
        }),
      };
    });
    try {
      const token = await getToken();
      const res = await fetch(
        `${baseUrl}api/portal/briefs/${briefId}/hotel/${gigId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify(body),
        },
      );
      if (!res.ok) {
        // Force a re-fetch on the next tick so the user sees the
        // canonical server state instead of their failed optimistic
        // edit. The poll loop will overwrite within 60s but that's
        // too slow for a wrong checkbox state.
        setError("Could not save change — refreshing…");
        // Trigger an immediate re-fetch by clearing the data; the
        // useEffect will not re-fire (briefId hasn't changed), so
        // do an inline refetch here.
        const token2 = await getToken();
        const r2 = await fetch(
          `${baseUrl}api/portal/briefs/${briefId}/hotel`,
          { headers: token2 ? { Authorization: `Bearer ${token2}` } : {} },
        );
        if (r2.ok) {
          const j = (await r2.json()) as HotelResponse;
          if (j.ok) setData(j);
        }
      } else {
        setError(null);
        // On success, immediately refetch so derived↔explicit flag
        // transitions (and derived-default values when an override
        // was cleared to null) update without waiting up to 60s for
        // the poll loop. Cheap query — same shape as the initial
        // load, runs in the background and the user perceives the
        // override badge / "auto" hint flipping in real time.
        const token2 = await getToken();
        const r2 = await fetch(
          `${baseUrl}api/portal/briefs/${briefId}/hotel`,
          { headers: token2 ? { Authorization: `Bearer ${token2}` } : {} },
        );
        if (r2.ok) {
          const j = (await r2.json()) as HotelResponse;
          if (j.ok) setData(j);
        }
      }
    } catch {
      setError("Connection lost — change may not have saved.");
    } finally {
      setSavingByGigId((m) => {
        const { [gigId]: _drop, ...rest } = m;
        return rest;
      });
    }
  }

  // Split crew into "needs hotel" (the bulk of the view) and "local"
  // (collapsed, easy to flip back on). Memoised so the split doesn't
  // recompute on every keystroke in the date inputs.
  const split = useMemo(() => {
    const all = data?.crew ?? [];
    return {
      needsHotel: all.filter((c) => c.hotelRequired),
      local: all.filter((c) => !c.hotelRequired),
    };
  }, [data?.crew]);

  // Run-wide stats — total room-nights across crew with hotelRequired,
  // plus a single-vs-twin breakdown of preferences (NOT actual rooms;
  // pairing engine hasn't shipped yet). Useful for a quick gut-check
  // before sending the brief to the hotel.
  const stats = useMemo(() => {
    if (!data?.crew) return null;
    let nights = 0;
    let single = 0;
    let twin = 0;
    let either = 0;
    for (const c of split.needsHotel) {
      if (c.checkInDate && c.checkOutDate) {
        const ci = new Date(`${c.checkInDate}T00:00:00Z`).getTime();
        const co = new Date(`${c.checkOutDate}T00:00:00Z`).getTime();
        if (Number.isFinite(ci) && Number.isFinite(co) && co > ci) {
          nights += Math.round((co - ci) / 86_400_000);
        }
      }
      if (c.roomShare === "single") single++;
      else if (c.roomShare === "twin") twin++;
      else either++;
    }
    return {
      heads: split.needsHotel.length,
      nights,
      single,
      twin,
      either,
    };
  }, [data?.crew, split.needsHotel]);

  if (loading && !data) {
    return (
      <div className="led-report">
        <header className="led-report-header">
          <h2>Hotel</h2>
        </header>
        <div className="led-empty">Loading…</div>
      </div>
    );
  }

  return (
    <div className="led-report">
      <header className="led-report-header">
        <div>
          <h2>Hotel</h2>
          <p className="led-report-sub">
            Toggle hotel-needed per crew member. Check-in and check-out
            default to the first and morning-after-the-last assigned
            working day; click into a date to override. Room-share
            preference and gender come from each freelancer's portal
            profile and feed the pairing suggester.
          </p>
        </div>
        {stats && (
          <div className="led-report-meta">
            <span className="badge">
              <strong>{stats.heads}</strong> need
              {stats.heads === 1 ? "s" : ""} hotel
            </span>
            <span className="badge">
              <strong>{stats.nights}</strong> room-night
              {stats.nights === 1 ? "" : "s"}
            </span>
          </div>
        )}
      </header>

      {error && (
        <div
          style={{
            margin: "0 0 12px 0",
            padding: "8px 12px",
            border: "1px solid #d97706",
            background: "#78350f22",
            color: "#fbbf24",
            borderRadius: 6,
            fontSize: 13,
          }}
        >
          {error}
        </div>
      )}

      {stats && stats.heads > 0 && (
        <div className="led-dashboard">
          <Stat label="Twin (will share)" value={stats.twin} />
          <Stat label="Single (private)" value={stats.single} />
          <Stat label="Either" value={stats.either} />
        </div>
      )}

      {split.needsHotel.length === 0 ? (
        <div className="led-empty">
          No crew currently flagged as needing a hotel. Toggle people
          on in the section below as you decide who's travelling.
        </div>
      ) : (
        <section className="led-card" style={{ marginBottom: 12 }}>
          <div className="led-card-head">
            <h3>Needs hotel</h3>
            <span className="badge">
              <strong>{split.needsHotel.length}</strong>
            </span>
          </div>
          <CrewTable
            rows={split.needsHotel}
            savingByGigId={savingByGigId}
            patchRow={patchRow}
          />
        </section>
      )}

      {split.local.length > 0 && (
        <section className="led-card">
          <div className="led-card-head">
            <h3>Local crew (no hotel)</h3>
            <span className="badge">
              <strong>{split.local.length}</strong>
            </span>
          </div>
          <p
            style={{
              fontSize: 12,
              color: "var(--muted, #94a3b8)",
              margin: "0 0 8px 0",
            }}
          >
            These crew members aren't currently flagged for a hotel.
            Flip the switch to add them.
          </p>
          <CrewTable
            rows={split.local}
            savingByGigId={savingByGigId}
            patchRow={patchRow}
          />
        </section>
      )}

      {(!data?.crew || data.crew.length === 0) && (
        <div className="led-empty">
          No confirmed crew on this brief yet — rows will appear here
          as freelancers accept.
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="led-stat">
      <div className="led-stat-label">{label}</div>
      <div className="led-stat-value">{value}</div>
      <div className="led-stat-sub">crew</div>
    </div>
  );
}

function CrewTable({
  rows,
  savingByGigId,
  patchRow,
}: {
  rows: HotelCrewRow[];
  savingByGigId: Record<string, boolean>;
  patchRow: (
    gigId: string,
    body: {
      hotelRequired?: boolean;
      checkInDate?: string | null;
      checkOutDate?: string | null;
    },
  ) => Promise<void>;
}) {
  return (
    <div style={{ overflowX: "auto" }}>
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          fontSize: 13,
        }}
      >
        <thead>
          <tr>
            <Th>Hotel?</Th>
            <Th>Name</Th>
            <Th>Role</Th>
            <Th>Check-in</Th>
            <Th>Check-out</Th>
            <Th>Room share</Th>
            <Th>Gender</Th>
            <Th>Phone</Th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.gigId} style={{ borderTop: "1px solid #1f293744" }}>
              <Td>
                <input
                  type="checkbox"
                  checked={row.hotelRequired}
                  disabled={!!savingByGigId[row.gigId]}
                  onChange={(e) =>
                    patchRow(row.gigId, { hotelRequired: e.target.checked })
                  }
                />
              </Td>
              <Td>
                <div style={{ fontWeight: 600 }}>{row.name}</div>
                {row.profileless && (
                  <div
                    style={{
                      fontSize: 11,
                      color: "#fbbf24",
                      marginTop: 2,
                    }}
                  >
                    No portal profile yet
                  </div>
                )}
              </Td>
              <Td>{row.role || "—"}</Td>
              <Td>
                <DateCell
                  iso={row.checkInDate}
                  explicit={row.checkInExplicit}
                  disabled={!!savingByGigId[row.gigId] || !row.hotelRequired}
                  onChange={(next) =>
                    patchRow(row.gigId, { checkInDate: next })
                  }
                />
              </Td>
              <Td>
                <DateCell
                  iso={row.checkOutDate}
                  explicit={row.checkOutExplicit}
                  disabled={!!savingByGigId[row.gigId] || !row.hotelRequired}
                  onChange={(next) =>
                    patchRow(row.gigId, { checkOutDate: next })
                  }
                />
              </Td>
              <Td>
                <span
                  style={{
                    fontSize: 12,
                    padding: "2px 8px",
                    borderRadius: 999,
                    border: "1px solid var(--border, #334155)",
                    color: "var(--text, inherit)",
                  }}
                >
                  {ROOM_SHARE_LABEL[row.roomShare]}
                </span>
              </Td>
              <Td>
                <span
                  style={{
                    fontSize: 12,
                    color: row.gender
                      ? "var(--text, inherit)"
                      : "var(--muted, #94a3b8)",
                  }}
                >
                  {row.gender
                    ? row.gender.charAt(0).toUpperCase() + row.gender.slice(1)
                    : "—"}
                </span>
              </Td>
              <Td>
                {row.phone ? (
                  <a
                    href={`tel:${row.phone}`}
                    style={{ color: "inherit", textDecoration: "underline" }}
                  >
                    {row.phone}
                  </a>
                ) : (
                  <span style={{ color: "var(--muted, #94a3b8)" }}>—</span>
                )}
              </Td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th
      style={{
        textAlign: "left",
        fontSize: 11,
        fontWeight: 700,
        textTransform: "uppercase",
        letterSpacing: 0.4,
        color: "var(--muted, #94a3b8)",
        padding: "6px 8px",
      }}
    >
      {children}
    </th>
  );
}

function Td({ children }: { children: React.ReactNode }) {
  return (
    <td style={{ padding: "8px", verticalAlign: "middle" }}>{children}</td>
  );
}

function DateCell({
  iso,
  explicit,
  disabled,
  onChange,
}: {
  iso: string | null;
  explicit: boolean;
  disabled: boolean;
  onChange: (next: string | null) => void;
}) {
  // The native date input takes "YYYY-MM-DD" exactly — same shape we
  // store + emit, no formatting needed. An empty string means the
  // user cleared the field, which we send as null to revert to the
  // server-derived default.
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <input
        type="date"
        value={iso ?? ""}
        disabled={disabled}
        onChange={(e) => {
          const v = e.target.value;
          onChange(v === "" ? null : v);
        }}
        style={{
          padding: "4px 6px",
          fontSize: 13,
          background: "transparent",
          color: "inherit",
          border: "1px solid var(--border, #334155)",
          borderRadius: 4,
        }}
      />
      {iso && !explicit && (
        <span
          style={{
            fontSize: 10,
            color: "var(--muted, #94a3b8)",
            fontStyle: "italic",
          }}
        >
          auto from working days
        </span>
      )}
      {iso && explicit && (
        <span style={{ fontSize: 10, color: "var(--accent, #fbbf24)" }}>
          override
        </span>
      )}
    </div>
  );
}
