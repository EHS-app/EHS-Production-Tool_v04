import { useCallback, useEffect, useMemo, useState } from "react";
import {
  buildDayChips,
  mergeRoster,
  type RosterResponse,
  type RosterRow,
  type DietaryTag,
} from "../lib/crewRoster";
import type { CrewMember } from "../lib/crew";

/** Producer Roster panel — Phase C, Slice 1.
 *
 *  Sits on the Crew Report tab above the existing call sheet. Shows
 *  one row per person who is requested, booked or manually penciled
 *  in for the active brief, with their working days, hotel state and
 *  dietary state at a glance. The component is intentionally
 *  read-only in Slice 1 — the goal is to give project leaders a
 *  single overview before we add inline editing in Slice 2.
 *
 *  Data sources: server `GET /api/portal/briefs/:id/roster` (booked
 *  people) merged with the producer's local `crew[]` (still-pending
 *  requests + manual rows). The merge logic lives in
 *  `lib/crewRoster.ts` so we can unit-test it. */
export function RosterTable({
  briefId,
  getToken,
  localCrew,
}: {
  briefId: string;
  /** Async token resolver from Clerk's `useAuth`, threaded in from
   *  App.tsx so this component stays decoupled from the auth lib —
   *  same pattern as HotelView / CateringView. */
  getToken: () => Promise<string | null>;
  /** Producer's local CrewMember list (the call-sheet rows). Used
   *  for pending-request and manual-row coverage. */
  localCrew: CrewMember[];
}) {
  const [data, setData] = useState<RosterResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  // Per-gig in-flight markers so toggling one row's hotel/days
  // doesn't disable every other row. Keyed by `${gigId}:${field}`
  // so the hotel checkbox and a day-chip on the same row can be
  // saving in parallel without stomping each other's flag.
  const [savingByKey, setSavingByKey] = useState<Record<string, boolean>>({});

  const baseUrl =
    (typeof import.meta !== "undefined" &&
      (import.meta as { env?: { BASE_URL?: string } }).env?.BASE_URL) ||
    "/";

  /** Single source of truth for fetching the roster. Used both by
   *  the polled effect and by the PATCH success/failure paths so the
   *  table always reflects the canonical server state after a save
   *  (rather than waiting up to 60s for the next poll tick). */
  const fetchRoster = useCallback(async (): Promise<RosterResponse | null> => {
    const token = await getToken();
    const res = await fetch(
      `${baseUrl}api/portal/briefs/${briefId}/roster`,
      { headers: token ? { Authorization: `Bearer ${token}` } : {} },
    );
    if (!res.ok) {
      const msg =
        res.status === 403
          ? "You don't own this brief."
          : res.status === 404
            ? "Brief not found."
            : "Could not load crew roster.";
      throw new Error(msg);
    }
    const json = (await res.json()) as
      | RosterResponse
      | { ok: false; error?: string };
    if (!json.ok) throw new Error(json.error ?? "Could not load crew roster.");
    return json;
  }, [briefId, getToken, baseUrl]);

  // Polled fetch loop — same 60s cadence as Hotel/Catering so a
  // freelancer's profile edit (allergens, dietary) shows up here
  // without the producer needing to refresh.
  useEffect(() => {
    if (!briefId) return;
    let cancelled = false;
    const fetchOnce = async () => {
      try {
        const json = await fetchRoster();
        if (cancelled || !json) return;
        setData(json);
        setError(null);
        setLoading(false);
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Could not load crew roster.");
        setLoading(false);
      }
    };
    void fetchOnce();
    const t = window.setInterval(fetchOnce, 60_000);
    return () => {
      cancelled = true;
      window.clearInterval(t);
    };
  }, [briefId, fetchRoster]);

  const rows = useMemo(
    () => mergeRoster(localCrew, data),
    [localCrew, data],
  );

  /** Optimistically apply a partial update to one gig row in `data`,
   *  then issue the PATCH. On failure the error banner shows and we
   *  refetch to overwrite the optimistic state with the canonical
   *  server state. We DO NOT roll back from a snapshot because the
   *  server might already have applied a different concurrent edit
   *  (e.g. another tab) and a snapshot revert would clobber that. */
  async function patchGig(
    gigId: string,
    field: "hotel" | "dates",
    optimistic: Partial<{ hotelRequired: boolean; assignedDates: string[] }>,
    requestPath: string,
    body: object,
  ) {
    const key = `${gigId}:${field}`;
    setSavingByKey((m) => ({ ...m, [key]: true }));
    setData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        crew: prev.crew.map((g) => {
          if (g.gigId !== gigId) return g;
          return { ...g, ...optimistic };
        }),
      };
    });
    try {
      const token = await getToken();
      const res = await fetch(`${baseUrl}${requestPath}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        // Try to surface the server's specific reason (the dates
        // endpoint returns a friendly "outside the brief's window"
        // string that the producer needs to see).
        let detail = "Could not save change.";
        try {
          const j = (await res.json()) as { error?: string };
          if (j.error) detail = j.error;
        } catch {
          /* ignore JSON parse errors — keep the default */
        }
        setError(detail);
        const fresh = await fetchRoster().catch(() => null);
        if (fresh) setData(fresh);
      } else {
        setError(null);
        const fresh = await fetchRoster().catch(() => null);
        if (fresh) setData(fresh);
      }
    } catch {
      setError("Could not save change — connection lost.");
      const fresh = await fetchRoster().catch(() => null);
      if (fresh) setData(fresh);
    } finally {
      setSavingByKey((m) => {
        const next = { ...m };
        delete next[key];
        return next;
      });
    }
  }

  const handleHotelToggle = useCallback(
    (gigId: string, hotelRequired: boolean) => {
      void patchGig(
        gigId,
        "hotel",
        { hotelRequired },
        `api/portal/briefs/${briefId}/hotel/${gigId}`,
        { hotelRequired },
      );
    },
    // patchGig closes over briefId/getToken/fetchRoster which are
    // stable for the panel's lifetime, so stable here too.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [briefId],
  );

  const handleDayToggle = useCallback(
    (gigId: string, currentDates: string[], date: string) => {
      const set = new Set(currentDates);
      if (set.has(date)) set.delete(date);
      else set.add(date);
      const next = [...set].sort();
      void patchGig(
        gigId,
        "dates",
        { assignedDates: next },
        `api/portal/briefs/${briefId}/roster/${gigId}/dates`,
        { assignedDates: next },
      );
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [briefId],
  );

  return (
    <section className="led-card roster-card">
      <div className="led-card-head">
        <div>
          <h3>Producer Roster</h3>
          <p className="led-report-sub">
            Everyone requested or booked for{" "}
            <strong>{data?.brief.projectName ?? "this brief"}</strong> — days
            at work, hotel and food at a glance.
          </p>
        </div>
        <div className="led-controls">
          <span className="badge">
            <strong>{rows.length}</strong> on roster
          </span>
          {data?.projectDays.length ? (
            <span className="badge">
              <strong>{data.projectDays.length}</strong> project days
            </span>
          ) : null}
        </div>
      </div>

      {error ? <div className="led-error">{error}</div> : null}

      {loading && !data ? (
        <div className="led-empty">Loading roster…</div>
      ) : rows.length === 0 ? (
        <div className="led-empty">
          Nobody on the roster yet — send a request from the sidebar or add a
          crew member below to start.
        </div>
      ) : (
        <div className="led-table-wrap">
          <table className="led-table roster-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Role</th>
                <th>Status</th>
                <th>Days at work</th>
                <th>Hotel</th>
                <th>Food</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <RosterRowView
                  key={`${row.source}:${row.id}`}
                  row={row}
                  projectDays={data?.projectDays ?? null}
                  hotelSaving={
                    !!(row.gigId && savingByKey[`${row.gigId}:hotel`])
                  }
                  datesSaving={
                    !!(row.gigId && savingByKey[`${row.gigId}:dates`])
                  }
                  onHotelToggle={
                    row.gigId
                      ? (next) => handleHotelToggle(row.gigId!, next)
                      : undefined
                  }
                  onDayToggle={
                    row.gigId
                      ? (date) =>
                          handleDayToggle(row.gigId!, row.assignedDates, date)
                      : undefined
                  }
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

/** One row in the roster table. Slice 2: gig-backed rows get a
 *  hotel checkbox and clickable day-chips. Local-only rows (manual
 *  in-house, pending invites with no accepted gig yet) stay read-
 *  only because there's nothing to PATCH server-side. */
function RosterRowView({
  row,
  projectDays,
  hotelSaving,
  datesSaving,
  onHotelToggle,
  onDayToggle,
}: {
  row: RosterRow;
  projectDays: ReadonlyArray<string> | null;
  hotelSaving: boolean;
  datesSaving: boolean;
  /** Defined only for gig-backed rows. Undefined → render the
   *  read-only "—" placeholder (matches Slice-1 behaviour for
   *  manual / pending rows). */
  onHotelToggle?: (next: boolean) => void;
  onDayToggle?: (date: string) => void;
}) {
  const chips = useMemo(
    () => buildDayChips(row.assignedDates, projectDays),
    [row.assignedDates, projectDays],
  );
  const assignedCount = row.assignedDates.length;
  const tone = statusTone(row.status);
  const label = statusLabel(row.status);

  return (
    <tr>
      <td>
        <div className="roster-name">
          <strong>{row.name || "—"}</strong>
          {row.profileless ? (
            <span className="roster-hint" title="Freelancer hasn't filled out their profile yet — dietary/allergen blanks are unknown, not 'none'.">
              no profile
            </span>
          ) : null}
        </div>
      </td>
      <td>{row.role || "—"}</td>
      <td>
        <span className={`crew-pill crew-pill-${tone}`} title={label}>
          {label}
        </span>
      </td>
      <td>
        {chips.length === 0 ? (
          <span className="crew-pill-empty">—</span>
        ) : (
          <div
            className={`roster-chips${datesSaving ? " is-saving" : ""}`}
            aria-busy={datesSaving || undefined}
          >
            {chips.map((c) => {
              const interactive = !!onDayToggle;
              const className = `roster-chip ${
                c.on ? "roster-chip-on" : "roster-chip-off"
              }${interactive ? " roster-chip-interactive" : ""}`;
              return interactive ? (
                <button
                  key={c.date}
                  type="button"
                  className={className}
                  title={`${c.date} — click to ${c.on ? "remove" : "add"}`}
                  disabled={datesSaving}
                  onClick={() => onDayToggle?.(c.date)}
                >
                  {c.label}
                </button>
              ) : (
                <span key={c.date} className={className} title={c.date}>
                  {c.label}
                </span>
              );
            })}
            <span className="roster-chip-count" title="Working days assigned">
              {assignedCount}d
            </span>
          </div>
        )}
      </td>
      <td>
        {row.source === "gig" ? (
          <label className="roster-hotel" title="Toggle hotel for this person">
            <input
              type="checkbox"
              checked={row.hotelRequired}
              disabled={hotelSaving || !onHotelToggle}
              onChange={(e) => onHotelToggle?.(e.target.checked)}
            />
            <span className="roster-hotel-label">
              {row.hotelRequired ? "hotel" : "no"}
            </span>
          </label>
        ) : (
          <span
            className="crew-pill-empty"
            title="Hotel only tracked once a freelancer has accepted"
          >
            —
          </span>
        )}
      </td>
      <td>
        {row.source === "gig" ? (
          <FoodCell tags={row.dietaryTags} allergens={row.allergens} profileless={row.profileless} />
        ) : (
          <span className="crew-pill-empty">—</span>
        )}
      </td>
    </tr>
  );
}

function FoodCell({
  tags,
  allergens,
  profileless,
}: {
  tags: DietaryTag[];
  allergens: string[];
  profileless: boolean;
}) {
  if (profileless) {
    return (
      <span className="crew-pill-empty" title="No profile yet — unknown.">?</span>
    );
  }
  if (tags.length === 0 && allergens.length === 0) {
    return <span className="crew-pill-empty">none</span>;
  }
  return (
    <div className="roster-food">
      {tags.map((t) => (
        <span key={t} className="crew-pill crew-pill-warn" title={t}>
          {DIETARY_LABELS[t]}
        </span>
      ))}
      {allergens.length > 0 ? (
        <span
          className="crew-pill crew-pill-bad"
          title={`Allergens: ${allergens.join(", ")}`}
        >
          ⚠ {allergens.length} allergen{allergens.length === 1 ? "" : "s"}
        </span>
      ) : null}
    </div>
  );
}

const DIETARY_LABELS: Record<DietaryTag, string> = {
  vegetarian: "veg",
  vegan: "vegan",
  halal: "halal",
  "gluten-free": "GF",
  "lactose-free": "LF",
};

/** Map a roster row's combined status to a pill tone class. Reuses
 *  the `crew-pill-*` palette already used by the call sheet so the
 *  whole tab feels consistent. */
function statusTone(s: RosterRow["status"]): "ok" | "warn" | "bad" | "muted" {
  switch (s) {
    case "confirmed":
    case "done":
    case "invoiced":
    case "paid":
    case "accepted":
      return "ok";
    case "invited":
    case "requested":
      return "warn";
    case "no-reply":
    case "too_late":
      return "bad";
    case "declined":
      return "muted";
    case "manual":
      return "muted";
    default:
      return "muted";
  }
}

function statusLabel(s: RosterRow["status"]): string {
  switch (s) {
    case "invited":
      return "Invited";
    case "confirmed":
      return "Confirmed";
    case "done":
      return "Done";
    case "invoiced":
      return "Invoiced";
    case "paid":
      return "Paid";
    case "requested":
      return "Requested";
    case "accepted":
      return "Accepted";
    case "declined":
      return "Declined";
    case "no-reply":
      return "No reply";
    case "too_late":
      return "Too late";
    case "manual":
      return "In-house";
    default:
      return s;
  }
}
