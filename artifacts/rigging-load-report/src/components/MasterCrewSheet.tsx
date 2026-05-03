import { useCallback, useEffect, useMemo, useState } from "react";
import {
  buildDayChips,
  mergeRoster,
  type RosterResponse,
  type RosterRow,
  type DietaryTag,
} from "../lib/crewRoster";
import {
  CREW_ROLES,
  type CrewMember,
  type CrewRole,
  type CrewRequestStatus,
} from "../lib/crew";
import { NumberField } from "./NumberField";
import { openMasterSheet, type MasterSheetRow } from "../lib/masterSheetExport";

/** Crew & Logistics master sheet — Phase C consolidation.
 *
 *  This component is the SINGLE source of truth for the producer's
 *  Crew & Logistics tab. It replaces the previous split between
 *  `RosterTable` (portal/gig data) and the inline call-sheet table
 *  in `CrewReportView` (local CrewMember edit grid). One wide table,
 *  one row per person, every column a producer needs.
 *
 *  Why one component:
 *    - Producers kept asking "where's the hotel/food/phone — I have
 *      to click around four tabs". Folding portal data + local edit
 *      grid into one table fixes that.
 *    - The merge logic in `lib/crewRoster.ts` already deduplicates
 *      gig-vs-local rows (by `freelancerUserId`, falling back to a
 *      name match). We just had two tables rendering the same merged
 *      data with different column subsets, which was confusing.
 *
 *  Editing model:
 *    - Gig-backed rows: hotel checkbox + day chips PATCH the server
 *      (`/hotel/:gigId` and `/roster/:gigId/dates`). Optimistic +
 *      refetch on settle, mirroring the previous RosterTable.
 *    - Local-only rows: name / role / notes / dayRate / call / off
 *      are managed via the producer's local CrewMember[] (callbacks
 *      bubble up to App.tsx the same way the old inline call sheet
 *      did). No server round-trip — these rows live in localStorage.
 *    - Gig-backed rows that ALSO have a matching local CrewMember
 *      (matched by freelancerUserId or name) inherit that local
 *      row's notes/dayRate via the merge — those fields are still
 *      editable through the local-update callback because the merge
 *      surfaces the local row's id via `row.id` when source==='local'
 *      OR the gig-row's matched local id when source==='gig'.
 *      Currently we keep edit affordances on the local-source rows
 *      only; making gig rows editable would require lazily creating
 *      a paired local CrewMember on first edit, which is out of
 *      scope for this consolidation pass.
 *
 *  Visible columns (always):
 *    Name · Role · Status · Days · Hotel · Food · Phone
 *    · Notes · Actions (local rows only)
 *
 *  "Show production details" toggle adds:
 *    Call · Off · Day rate
 *
 *  These are folded behind a toggle because casual producers
 *  planning a quick gig don't need them, but a touring PM doing a
 *  full call sheet does. Default OFF keeps the table from feeling
 *  spreadsheet-heavy on first open. */
export function MasterCrewSheet({
  briefId,
  getToken,
  localCrew,
  brief,
  onAdd,
  onUpdate,
  onRemove,
  onDuplicate,
  onMergedRolesChange,
  onCountsChange,
  getTimesForDates,
  phaseDays,
  compactHeader = false,
}: {
  /** Active brief id from App.tsx. When null/empty the sheet renders
   *  ONLY local crew (no portal data) and shows a friendly empty
   *  state nudging the user to pick a brief. */
  briefId: string | null;
  getToken: () => Promise<string | null>;
  localCrew: CrewMember[];
  /** Optional brief context for the print export header — name +
   *  venue. We pull these from the roster response when present, and
   *  fall back to whatever the parent threads in (so the print
   *  button is useful even before the brief is fetched once). */
  brief?: { projectName: string; venue: string };
  onAdd: () => void;
  onUpdate: (id: string, patch: Partial<CrewMember>) => void;
  onRemove: (id: string) => void;
  onDuplicate: (id: string) => void;
  /** Optional callback fired whenever the merged roster changes.
   *  CrewReportView uses this to feed the AdequacyPanel with the
   *  full roster (gig + local) instead of just localCrew[], so the
   *  "you have 5 riggers, suggested 6–8" warning matches what the
   *  producer sees on screen. Without this callback the panel would
   *  count only local rows — fine before the consolidation, but
   *  confusing now that the master sheet is the visible roster. */
  onMergedRolesChange?: (roles: ReadonlyArray<string>) => void;
  /** Optional callback fired whenever the merged roster changes, with
   *  pre-computed totals the parent can render as a stat-card row.
   *  We compute these here (not in CrewReportView) because the merge
   *  + status classification already happens in this component — it
   *  would be wasteful to either re-merge upstream or expose the
   *  whole RosterRow[] just so the parent could re-derive what we
   *  already know. `hotelRooms` is `ceil(hotelCount / 2)` — the
   *  industry rule-of-thumb the producer reference UI uses, so the
   *  number on the card matches what they'd manually book. */
  onCountsChange?: (counts: {
    total: number;
    accepted: number;
    pending: number;
    hotelRooms: number;
  }) => void;
  /** Returns the earliest call → latest off times for the given
   *  assigned days, derived from the project schedule (Setup /
   *  Rehearsal / Show / Load Out). When provided, day-chip toggles
   *  on local rows refresh callTime/offTime alongside assignedDates
   *  so the row's shift always matches the days that are ticked on.
   *  Optional — when undefined day toggles only patch assignedDates,
   *  preserving the previous behaviour. */
  getTimesForDates?: (
    dates: ReadonlyArray<string>,
    defaults: { callTime: string; offTime: string },
  ) => { callTime: string; offTime: string };
  /** Days covered by each schedule phase ("setup" / "rehearsal" /
   *  "show" / "downrig" → ISO date arrays). When provided, each
   *  local crew row gets one-click quick-pick buttons that fill the
   *  row's `assignedDates` from the chosen phase. Empty / missing
   *  phases simply hide their button so the row only shows phases
   *  the producer has actually scheduled. */
  phaseDays?: Partial<Record<string, ReadonlyArray<string>>>;
  /** When true, hide the duplicated `<h3>Crew & Logistics</h3>` +
   *  subtitle inside the master sheet's own header — the parent
   *  (CrewReportView) is rendering its own redesigned title row and
   *  doesn't need the duplicate. The right-side controls (toggle,
   *  Print, Add) are still rendered. */
  compactHeader?: boolean;
}) {
  const [data, setData] = useState<RosterResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingByKey, setSavingByKey] = useState<Record<string, boolean>>({});
  const [showProductionDetails, setShowProductionDetails] = useState(false);
  // Names of freelancers registered in the portal directory. Used to
  // power the <datalist> autocomplete on the editable name cell so
  // producers can pick a registered freelancer with one click, while
  // still typing freely for non-portal walk-ups.
  const [portalNames, setPortalNames] = useState<ReadonlyArray<string>>([]);

  const baseUrl =
    (typeof import.meta !== "undefined" &&
      (import.meta as { env?: { BASE_URL?: string } }).env?.BASE_URL) ||
    "/";

  const fetchRoster = useCallback(async (): Promise<RosterResponse | null> => {
    if (!briefId) return null;
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

  // Fetch the portal freelancer directory once on mount so the editable
  // name cells can offer an autocomplete of registered names. The
  // endpoint is cheap (no date params → just a sorted name list) and
  // we only need names + roles, not the full directory metadata. We
  // fail silently — autocomplete is a nice-to-have, the input still
  // accepts free text if the fetch fails.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const token = await getToken();
        const res = await fetch(`${baseUrl}api/portal/freelancers`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!res.ok) return;
        const body = (await res.json()) as {
          ok?: boolean;
          freelancers?: ReadonlyArray<{ name?: string | null }>;
        };
        if (cancelled || !body.ok || !Array.isArray(body.freelancers)) return;
        const names = Array.from(
          new Set(
            body.freelancers
              .map((f) => (f.name ?? "").trim())
              .filter((n) => n.length > 0),
          ),
        ).sort((a, b) => a.localeCompare(b));
        setPortalNames(names);
      } catch {
        // Silent — autocomplete is optional.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [getToken, baseUrl]);

  // Polled fetch loop — same 60s cadence as Hotel/Catering. Skipped
  // entirely when no brief is active so the master sheet stays
  // useful as a pure local-crew editor before any portal brief is
  // pushed.
  useEffect(() => {
    if (!briefId) {
      setData(null);
      setLoading(false);
      return;
    }
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

  // Bubble the merged roles up to CrewReportView so the AdequacyPanel
  // counts the SAME headcount the producer sees in the table. Without
  // this the panel was counting only local crew[] rows — fine in the
  // pre-consolidation UI where the call sheet was the producer's
  // source-of-truth, but visibly inconsistent now that the master
  // sheet shows merged gig+local rows. We snapshot just the role
  // strings (not the whole RosterRow array) to keep the dep narrow.
  const rolesKey = useMemo(
    () => rows.map((r) => r.role).join("\u0000"),
    [rows],
  );
  useEffect(() => {
    if (!onMergedRolesChange) return;
    onMergedRolesChange(rows.map((r) => r.role));
    // We intentionally key the effect on the joined-string snapshot
    // rather than `rows`, so a re-render that produces an
    // identical-shaped roster array doesn't fire the callback.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rolesKey, onMergedRolesChange]);

  // Stat-card counts for the parent's redesigned header. Same key
  // strategy as roles above: snapshot to a string so we don't fire
  // the callback on identical re-renders. Status buckets mirror
  // statusTone(): "ok" tones count as accepted (confirmed/done/paid
  // also accepted-equivalent for the "we have a person" sense),
  // "warn" tones count as pending. `hotelRooms` uses the
  // industry-standard ceil(hotelCount / 2) rule so two crew sharing
  // a roommate count as one room — matches the producer reference.
  const countsKey = useMemo(() => {
    let total = 0;
    let accepted = 0;
    let pending = 0;
    let hotelCount = 0;
    for (const r of rows) {
      total += 1;
      const tone = statusTone(r.status);
      if (tone === "ok") accepted += 1;
      else if (tone === "warn") pending += 1;
      // Count any row flagged for hotel — gig-backed (server flag)
      // OR local/manual (producer-set `needsHotel`, surfaced via
      // mergeRoster as `hotelRequired`).
      if (r.hotelRequired) hotelCount += 1;
    }
    const hotelRooms = Math.ceil(hotelCount / 2);
    return `${total}|${accepted}|${pending}|${hotelRooms}`;
  }, [rows]);
  useEffect(() => {
    if (!onCountsChange) return;
    const [t, a, p, h] = countsKey.split("|").map((n) => Number(n));
    onCountsChange({
      total: t ?? 0,
      accepted: a ?? 0,
      pending: p ?? 0,
      hotelRooms: h ?? 0,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countsKey, onCountsChange]);

  // Index local crew by id so a gig-backed row can resolve its
  // matched local row's id for the editable notes/dayRate cells.
  // The merge stores the matched local's `dayRate` and `notes` on
  // the gig row, but not the local row's id — so we re-derive it
  // here. O(localCrew) once, then O(1) lookups in the render.
  const localByMatch = useMemo(() => {
    const byId = new Map<string, CrewMember>();
    const byName = new Map<string, CrewMember>();
    for (const m of localCrew) {
      if (m.freelancerUserId) byId.set(m.freelancerUserId, m);
      if (m.name) {
        const k = m.name.trim().replace(/\s+/g, " ").toLowerCase();
        if (k && !byName.has(k)) byName.set(k, m);
      }
    }
    return { byId, byName };
  }, [localCrew]);

  const resolveLocalIdFor = useCallback(
    (row: RosterRow): string | null => {
      if (row.source === "local") return row.id;
      if (row.freelancerUserId) {
        const m = localByMatch.byId.get(row.freelancerUserId);
        if (m) return m.id;
      }
      if (row.name) {
        const k = row.name.trim().replace(/\s+/g, " ").toLowerCase();
        const m = localByMatch.byName.get(k);
        if (m) return m.id;
      }
      return null;
    },
    [localByMatch],
  );

  const patchGig = useCallback(async function patchGig(
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
      // Server-side, hotel + dates PATCHes cascade to ALL gigs that
      // share the same freelancerUserId on this brief (a freelancer
      // can hold multiple role-tagged gigs on one show — e.g.
      // "Stagehand" + "Lighting tech"). The merged roster shown on
      // screen also dedupes by freelancerUserId, so if we only
      // update the targeted gigId here the union the merge takes
      // would still surface the stale sibling — making it look like
      // the toggle "didn't stick" until the refetch lands. Mirror
      // the cascade locally so the UI feels instant and correct.
      const targetGig = prev.crew.find((g) => g.gigId === gigId);
      const targetUserId = targetGig?.freelancerUserId ?? null;
      return {
        ...prev,
        crew: prev.crew.map((g) => {
          const isSibling =
            g.gigId === gigId ||
            (targetUserId !== null && g.freelancerUserId === targetUserId);
          if (!isSibling) return g;
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
        let detail = "Could not save change.";
        try {
          const j = (await res.json()) as { error?: string };
          if (j.error) detail = j.error;
        } catch {
          /* ignore JSON parse */
        }
        setError(detail);
      } else {
        setError(null);
      }
      const fresh = await fetchRoster().catch(() => null);
      if (fresh) setData(fresh);
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
  }, [getToken, baseUrl, fetchRoster]);

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
    [briefId, patchGig],
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
    [briefId, patchGig],
  );

  const briefName = data?.brief.projectName ?? brief?.projectName ?? "";
  const venue = data?.brief.venue ?? brief?.venue ?? "";

  const handlePrint = useCallback(() => {
    // Build print-time rows: enrich each row with the matched local
    // CrewMember's call/off times when present, so the printed sheet
    // matches what the producer sees on screen with "Production
    // details" toggled on. Times that don't have a local twin print
    // as a dash, same as the on-screen empty cell.
    const printRows: MasterSheetRow[] = rows.map((row) => {
      const localId = resolveLocalIdFor(row);
      const local =
        localId !== null ? localCrew.find((m) => m.id === localId) : null;
      return {
        ...row,
        callTime: local?.callTime ?? "",
        offTime: local?.offTime ?? "",
      };
    });
    openMasterSheet({
      briefName,
      venue,
      rows: printRows,
      projectDays: data?.projectDays ?? [],
      showProductionDetails,
    });
  }, [
    briefName,
    venue,
    rows,
    data,
    showProductionDetails,
    localCrew,
    resolveLocalIdFor,
  ]);

  const totalCount = rows.length;

  return (
    <section className="led-card roster-card master-sheet-card">
      {compactHeader ? (
        // Dedicated head for compact mode. We deliberately avoid
        // `.led-card-head` / `.led-controls` and `.btn` here so we are
        // not affected by older flex / wrap / hover rules that kept
        // pushing the pill and Print A4 into each other. Everything is
        // pinned with inline styles for a bulletproof layout.
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            alignItems: "center",
            flexWrap: "wrap",
            columnGap: 12,
            rowGap: 8,
            marginBottom: 12,
          }}
        >
          <label
            style={{
              display: "inline-flex",
              flex: "0 0 auto",
              alignItems: "center",
              gap: 8,
              height: 36,
              padding: "0 14px",
              borderRadius: 999,
              background: "#ffffff",
              border: "1px solid var(--border, #e5e7eb)",
              fontSize: 13,
              fontWeight: 600,
              color: "var(--text-main, #0f172a)",
              cursor: "pointer",
              userSelect: "none",
              whiteSpace: "nowrap",
            }}
          >
            <input
              type="checkbox"
              checked={showProductionDetails}
              onChange={(e) => setShowProductionDetails(e.target.checked)}
              style={{
                margin: 0,
                padding: 0,
                flex: "0 0 auto",
                width: 16,
                height: 16,
                display: "block",
                accentColor: "var(--primary, #f88000)",
                cursor: "pointer",
                verticalAlign: "middle",
              }}
            />
            <span
              style={{
                whiteSpace: "nowrap",
                fontSize: 13,
                lineHeight: "16px",
                display: "inline-block",
                verticalAlign: "middle",
              }}
            >
              Production details
            </span>
          </label>
          <button
            type="button"
            onClick={handlePrint}
            disabled={rows.length === 0}
            style={{
              display: "inline-flex",
              flex: "0 0 auto",
              alignItems: "center",
              gap: 8,
              height: 36,
              padding: "0 14px",
              borderRadius: 8,
              background: "#0f172a",
              color: "#ffffff",
              border: "1px solid #0f172a",
              fontSize: 13,
              fontWeight: 600,
              cursor: rows.length === 0 ? "not-allowed" : "pointer",
              opacity: rows.length === 0 ? 0.5 : 1,
              fontFamily: "inherit",
              whiteSpace: "nowrap",
            }}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <polyline points="6 9 6 2 18 2 18 9" />
              <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
              <rect x="6" y="14" width="12" height="8" />
            </svg>
            <span>Print A4</span>
          </button>
          <button
            type="button"
            onClick={onAdd}
            style={{
              display: "inline-flex",
              flex: "0 0 auto",
              alignItems: "center",
              gap: 6,
              height: 36,
              padding: "0 14px",
              borderRadius: 8,
              background: "var(--primary, #f88000)",
              color: "#ffffff",
              border: "1px solid var(--primary, #f88000)",
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
              fontFamily: "inherit",
              whiteSpace: "nowrap",
            }}
          >
            + Add crew
          </button>
        </div>
      ) : (
        <div className="led-card-head">
          <div>
            <h3>Crew &amp; Logistics</h3>
            <p className="led-report-sub">
              {briefId
                ? <>Everyone on <strong>{briefName || "this brief"}</strong> — days, hotel, food and phone in one sheet.</>
                : <>Local call sheet only — pick a brief above to also pull in portal crew, hotel and food.</>}
            </p>
          </div>
          <div className="led-controls">
            <span className="badge">
              <strong>{totalCount}</strong> on roster
            </span>
            {data?.projectDays.length ? (
              <span className="badge">
                <strong>{data.projectDays.length}</strong> project days
              </span>
            ) : null}
            <label
              className="roster-toggle"
              title="Show call / off / day-rate columns"
            >
              <input
                type="checkbox"
                checked={showProductionDetails}
                onChange={(e) => setShowProductionDetails(e.target.checked)}
              />
              <span>Production details</span>
            </label>
            <button
              type="button"
              className="btn btn-soft"
              onClick={handlePrint}
              disabled={rows.length === 0}
              title="Open a printable version of this sheet"
            >
              🖨 Print
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={onAdd}
              title="Add a manual crew member to the local call sheet"
            >
              + Add crew
            </button>
          </div>
        </div>
      )}

      {error ? <div className="led-error">{error}</div> : null}

      {loading && !data && briefId ? (
        <div className="led-empty">Loading roster…</div>
      ) : rows.length === 0 ? (
        <div className="led-empty">
          {briefId
            ? "Nobody on this brief yet — send a request from the sidebar or add a crew member to start."
            : "No crew yet — add the first one to start your call sheet, or pick a brief above to pull in portal crew."}
        </div>
      ) : (
        <div className="led-table-wrap">
          <table className="led-table master-sheet-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Role</th>
                <th>Status</th>
                <th>Days</th>
                <th>Hotel</th>
                <th>Food</th>
                <th>Phone</th>
                <th>Notes</th>
                {showProductionDetails ? (
                  <>
                    <th>Call</th>
                    <th>Off</th>
                    <th className="led-num">Day rate (kr)</th>
                  </>
                ) : null}
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const localId = resolveLocalIdFor(row);
                const local =
                  localId !== null
                    ? localCrew.find((m) => m.id === localId) ?? null
                    : null;
                return (
                  <MasterRow
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
                            handleDayToggle(
                              row.gigId!,
                              row.assignedDates,
                              date,
                            )
                        : undefined
                    }
                    local={local}
                    showProductionDetails={showProductionDetails}
                    portalNames={portalNames}
                    onLocalUpdate={
                      local
                        ? (patch) => onUpdate(local.id, patch)
                        : undefined
                    }
                    onLocalDayToggle={
                      local
                        ? (date) => {
                            const cur = new Set(local.assignedDates ?? []);
                            if (cur.has(date)) cur.delete(date);
                            else cur.add(date);
                            const nextDates = [...cur].sort();
                            // Re-derive call/off from the project
                            // schedule so the row's shift always
                            // matches the days that are ticked on
                            // (earliest setup → latest downrig).
                            const patch: Partial<CrewMember> = {
                              assignedDates: nextDates,
                            };
                            if (getTimesForDates) {
                              const t = getTimesForDates(nextDates, {
                                callTime: local.callTime,
                                offTime: local.offTime,
                              });
                              if (
                                t.callTime !== local.callTime ||
                                t.offTime !== local.offTime
                              ) {
                                patch.callTime = t.callTime;
                                patch.offTime = t.offTime;
                              }
                            }
                            onUpdate(local.id, patch);
                          }
                        : undefined
                    }
                    onLocalRemove={
                      local && row.source === "local"
                        ? () => onRemove(local.id)
                        : undefined
                    }
                    onLocalDuplicate={
                      local && row.source === "local"
                        ? () => onDuplicate(local.id)
                        : undefined
                    }
                    phaseDays={phaseDays}
                    onLocalSetDays={
                      local
                        ? (nextDates) => {
                            // Replace the row's working days wholesale
                            // (used by the per-phase quick-pick
                            // buttons). Re-derives call/off from the
                            // schedule so the shift matches the new
                            // day set, same as a single-day toggle.
                            const sorted = [...nextDates].sort();
                            const patch: Partial<CrewMember> = {
                              assignedDates: sorted,
                            };
                            if (getTimesForDates) {
                              const t = getTimesForDates(sorted, {
                                callTime: local.callTime,
                                offTime: local.offTime,
                              });
                              patch.callTime = t.callTime;
                              patch.offTime = t.offTime;
                            }
                            onUpdate(local.id, patch);
                          }
                        : undefined
                    }
                  />
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

/** One row in the master sheet. Editing affordances depend on row
 *  source + presence of a matched local CrewMember (see MasterCrewSheet
 *  doc). */
function MasterRow({
  row,
  projectDays,
  hotelSaving,
  datesSaving,
  onHotelToggle,
  onDayToggle,
  local,
  showProductionDetails,
  portalNames,
  onLocalUpdate,
  onLocalDayToggle,
  onLocalRemove,
  onLocalDuplicate,
  phaseDays,
  onLocalSetDays,
}: {
  row: RosterRow;
  projectDays: ReadonlyArray<string> | null;
  hotelSaving: boolean;
  datesSaving: boolean;
  onHotelToggle?: (next: boolean) => void;
  onDayToggle?: (date: string) => void;
  local: CrewMember | null;
  showProductionDetails: boolean;
  /** Names of registered portal freelancers, used to power the
   *  <datalist> autocomplete on editable name cells. */
  portalNames: ReadonlyArray<string>;
  onLocalUpdate?: (patch: Partial<CrewMember>) => void;
  /** Toggle a single date on / off the local CrewMember's
   *  `assignedDates`. Only provided when the row is backed by a
   *  local CrewMember, so the chips stay read-only for unmatched
   *  gig rows (those use `onDayToggle` against the gig endpoint). */
  onLocalDayToggle?: (date: string) => void;
  onLocalRemove?: () => void;
  onLocalDuplicate?: () => void;
  /** Days covered by each schedule phase. Drives the per-phase
   *  quick-pick buttons rendered next to the day chips on local
   *  rows. */
  phaseDays?: Partial<Record<string, ReadonlyArray<string>>>;
  /** Replace the local row's working days wholesale (used by the
   *  quick-pick buttons). Recomputes call/off from the schedule. */
  onLocalSetDays?: (dates: ReadonlyArray<string>) => void;
}) {
  const chips = useMemo(
    () => buildDayChips(row.assignedDates, projectDays),
    [row.assignedDates, projectDays],
  );
  const assignedCount = row.assignedDates.length;
  const tone = statusTone(row.status);
  const label = statusLabel(row.status);
  const editableLocal = row.source === "local" && !!onLocalUpdate;

  return (
    <tr>
      <td>
        {editableLocal ? (
          <>
            <input
              className="led-input"
              type="text"
              value={local?.name ?? ""}
              onChange={(e) => onLocalUpdate?.({ name: e.target.value })}
              placeholder="Full name"
              list="crew-portal-names"
              autoComplete="off"
            />
            {/* Single shared datalist (rendered per row but identical
             *  id is fine — the browser merges them and uses the union
             *  of options). Native <datalist> gives us free typeahead
             *  filtering against registered portal freelancers, while
             *  still allowing the producer to type a non-portal name
             *  freely (datalist is a suggestion list, not a select). */}
            <datalist id="crew-portal-names">
              {portalNames.map((n) => (
                <option key={n} value={n} />
              ))}
            </datalist>
          </>
        ) : (
          <div className="roster-name">
            <strong>{row.name || "—"}</strong>
            {row.profileless ? (
              <span
                className="roster-hint"
                title="Freelancer hasn't filled out their profile yet — dietary/allergen blanks are unknown, not 'none'."
              >
                no profile
              </span>
            ) : null}
          </div>
        )}
      </td>
      <td>
        {editableLocal ? (
          <select
            className="led-input"
            value={local?.role ?? CREW_ROLES[0]!}
            onChange={(e) =>
              onLocalUpdate?.({ role: e.target.value as CrewRole })
            }
          >
            {CREW_ROLES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        ) : (
          row.role || "—"
        )}
      </td>
      <td>
        {editableLocal ? (
          // Editable status for local rows. Covers two real scenarios:
          //   • Producer phoned a "requested" freelancer who confirmed
          //     verbally — flip them to Accepted without waiting on
          //     the portal click.
          //   • Producer wants to mark a hand-typed crew member as
          //     "manual" (no pill) vs an outgoing request flow.
          <select
            className="led-input"
            value={local?.requestStatus ?? "manual"}
            onChange={(e) => {
              const v = e.target.value;
              if (v === "manual") {
                onLocalUpdate?.({ requestStatus: undefined });
              } else {
                onLocalUpdate?.({
                  requestStatus: v as CrewRequestStatus,
                });
              }
            }}
            title="Set this person's confirmation status (e.g. mark Accepted after a phone call)"
          >
            <option value="manual">Manual</option>
            <option value="requested">Requested</option>
            <option value="accepted">Accepted</option>
            <option value="declined">Declined</option>
            <option value="no-reply">No reply</option>
            <option value="too_late">Too late</option>
          </select>
        ) : (
          <span className={`crew-pill crew-pill-${tone}`} title={label}>
            {label}
          </span>
        )}
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
              // Interactive when EITHER:
              //  • The row is a gig row with a working onDayToggle
              //    (PATCHes the gig endpoint), OR
              //  • The row is a local row with onLocalDayToggle
              //    (mutates the CrewMember.assignedDates locally).
              const handler = onDayToggle ?? onLocalDayToggle;
              const interactive = !!handler;
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
                  onClick={() => handler!(c.date)}
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
        {/* Per-phase quick-pick buttons. Only on local rows that have
            both a setter and at least one scheduled phase — clicking a
            button replaces the row's working days with that phase's
            days, so the producer can say "this person does Setup
            only" or "Show only" with one click instead of toggling
            every chip. "All" / "None" cover the simple cases. */}
        {editableLocal && onLocalSetDays && phaseDays
          ? (() => {
              const phaseEntries = (
                ["setup", "rehearsal", "show", "downrig"] as const
              )
                .map((k) => ({ key: k, days: phaseDays[k] ?? [] }))
                .filter((p) => p.days.length > 0);
              const allDays = projectDays ?? [];
              const hasAnyButtons =
                phaseEntries.length > 0 || allDays.length > 0;
              if (!hasAnyButtons) return null;
              const phaseLabel: Record<string, string> = {
                setup: "Setup",
                rehearsal: "Rehearsal",
                show: "Show",
                downrig: "Load Out",
              };
              return (
                <div
                  className="roster-day-quickpick"
                  role="group"
                  aria-label="Quick-fill working days"
                >
                  <span className="roster-day-quickpick-label">Days:</span>
                  {phaseEntries.map((p) => (
                    <button
                      key={p.key}
                      type="button"
                      className="roster-day-quickpick-btn"
                      title={`Work all ${phaseLabel[p.key]} days (${p.days.length})`}
                      onClick={() => onLocalSetDays([...p.days])}
                    >
                      {phaseLabel[p.key]}
                    </button>
                  ))}
                  {allDays.length > 0 ? (
                    <button
                      type="button"
                      className="roster-day-quickpick-btn"
                      title="Work every project day"
                      onClick={() => onLocalSetDays([...allDays])}
                    >
                      All
                    </button>
                  ) : null}
                  <button
                    type="button"
                    className="roster-day-quickpick-btn roster-day-quickpick-btn-clear"
                    title="Clear all working days"
                    onClick={() => onLocalSetDays([])}
                  >
                    None
                  </button>
                </div>
              );
            })()
          : null}
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
        ) : editableLocal ? (
          // Local / manual rows: producer can tick "needs hotel"
          // directly. Stored on the CrewMember as `needsHotel` so
          // it survives reloads and feeds the Hotel-rooms stat-card.
          <label className="roster-hotel" title="Tick when this person needs a hotel">
            <input
              type="checkbox"
              checked={row.hotelRequired}
              onChange={(e) =>
                onLocalUpdate?.({ needsHotel: e.target.checked })
              }
            />
            <span className="roster-hotel-label">
              {row.hotelRequired ? "hotel" : "no"}
            </span>
          </label>
        ) : (
          <span className="crew-pill-empty">—</span>
        )}
      </td>
      <td>
        {row.source === "gig" ? (
          <FoodCell
            tags={row.dietaryTags}
            allergens={row.allergens}
            profileless={row.profileless}
          />
        ) : (
          <span className="crew-pill-empty">—</span>
        )}
      </td>
      <td>
        {row.phone ? (
          <a
            className="roster-phone"
            href={`tel:${row.phone.replace(/\s+/g, "")}`}
            title="Call this person"
          >
            {row.phone}
          </a>
        ) : (
          <span className="crew-pill-empty">—</span>
        )}
      </td>
      <td>
        {onLocalUpdate ? (
          <input
            className="led-input"
            type="text"
            value={local?.notes ?? row.notes ?? ""}
            onChange={(e) => onLocalUpdate?.({ notes: e.target.value })}
            placeholder="e.g. IPAF, half-day"
          />
        ) : row.notes ? (
          <span className="roster-notes">{row.notes}</span>
        ) : (
          <span className="crew-pill-empty">—</span>
        )}
      </td>
      {showProductionDetails ? (
        <>
          <td>
            {onLocalUpdate ? (
              <input
                className="led-input led-input-num"
                type="time"
                value={local?.callTime ?? ""}
                onChange={(e) =>
                  onLocalUpdate?.({ callTime: e.target.value })
                }
              />
            ) : (
              <span className="crew-pill-empty">—</span>
            )}
          </td>
          <td>
            {onLocalUpdate ? (
              <input
                className="led-input led-input-num"
                type="time"
                value={local?.offTime ?? ""}
                onChange={(e) =>
                  onLocalUpdate?.({ offTime: e.target.value })
                }
              />
            ) : (
              <span className="crew-pill-empty">—</span>
            )}
          </td>
          <td className="led-num">
            {onLocalUpdate ? (
              <NumberField
                className="led-input led-input-num"
                min={0}
                step={10}
                value={local?.dayRate ?? row.dayRate ?? 0}
                transform={(n) => Math.max(0, n || 0)}
                emptyValue={0}
                onCommit={(dayRate) => onLocalUpdate?.({ dayRate })}
              />
            ) : row.dayRate ? (
              <span>{row.dayRate.toLocaleString("en-US")}</span>
            ) : (
              <span className="crew-pill-empty">—</span>
            )}
          </td>
        </>
      ) : null}
      <td className="led-actions">
        {onLocalDuplicate ? (
          <button
            type="button"
            className="btn btn-soft btn-sm"
            onClick={onLocalDuplicate}
            title="Duplicate this row"
          >
            Copy
          </button>
        ) : null}
        {onLocalRemove ? (
          <button
            type="button"
            className="btn btn-danger btn-sm"
            onClick={onLocalRemove}
            title="Remove from local call sheet"
          >
            Delete
          </button>
        ) : null}
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
      <span className="crew-pill-empty" title="No profile yet — unknown.">
        ?
      </span>
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
