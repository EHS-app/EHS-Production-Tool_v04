import { useCallback, useEffect, useId, useMemo, useState } from "react";
import { createPortal } from "react-dom";
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
import {
  assignedDatesFromShiftPhases,
  crewShiftAssignmentKey,
  filterShiftSelectionsToSchedule,
  scheduledShiftKeys,
  setCrewShiftPhaseSelection,
  shiftTimesForSelections,
  summarizeShiftTimes,
  type CrewShiftPhaseKey,
  type CrewShiftTimeMap,
} from "../lib/crewShiftAssignments";

type FreelancerCandidate = {
  userId: string;
  fullName: string;
  primaryRole: string | null;
  city: string | null;
  phone?: string;
  dietaryTags?: string[];
  allergens?: string[];
};

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
  onSendLinkedRequests,
  sendingLinkedRequests = false,
  onMergedRolesChange,
  onCountsChange,
  getTimesForDates,
  phaseDays,
  phaseShiftTimes,
  compactHeader = false,
  onOpenProfile,
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
  onSendLinkedRequests?: (members: CrewMember[]) => void | Promise<void>;
  sendingLinkedRequests?: boolean;
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
    /** Number of people who need at least one hotel night. We surface
     *  this as "rooms" on the stat card because the producer thinks
     *  in heads-needing-a-bed first; the rooming sheet still pairs
     *  twins separately. */
    hotelRooms: number;
    /** Sum of `hotelDates.length` across the roster — total bookable
     *  room-nights for the run. */
    hotelNights: number;
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
  phaseDays?: Partial<
    Record<CrewShiftPhaseKey, ReadonlyArray<string>>
  >;
  /** Exact project schedule times keyed by date+phase. */
  phaseShiftTimes?: CrewShiftTimeMap;
  /** When true, hide the duplicated `<h3>Crew & Logistics</h3>` +
   *  subtitle inside the master sheet's own header — the parent
   *  (CrewReportView) is rendering its own redesigned title row and
   *  doesn't need the duplicate. The right-side controls (toggle,
   *  Print, Add) are still rendered. */
  compactHeader?: boolean;
  onOpenProfile?: (userId: string) => void;
}) {
  const [data, setData] = useState<RosterResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingByKey, setSavingByKey] = useState<Record<string, boolean>>({});
  const [showProductionDetails, setShowProductionDetails] = useState(false);
  const [portalCandidates, setPortalCandidates] = useState<
    ReadonlyArray<FreelancerCandidate>
  >([]);

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

  // Fetch the structured directory once so selecting a suggestion can
  // link the row to an exact Clerk user id. Free text remains available
  // when the directory is unavailable or no candidate is selected.
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
          freelancers?: ReadonlyArray<FreelancerCandidate>;
        };
        if (cancelled || !body.ok || !Array.isArray(body.freelancers)) return;
        const candidates = body.freelancers
          .filter(
            (candidate) =>
              typeof candidate.userId === "string" &&
              candidate.userId.length > 0 &&
              typeof candidate.fullName === "string" &&
              candidate.fullName.trim().length > 0,
          )
          .map((candidate) => ({
            ...candidate,
            fullName: candidate.fullName.trim(),
          }))
          .sort((a, b) => a.fullName.localeCompare(b.fullName));
        setPortalCandidates(candidates);
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
    let hotelRooms = 0;
    let hotelNights = 0;
    for (const r of rows) {
      total += 1;
      const tone = statusTone(r.status);
      if (tone === "ok") accepted += 1;
      else if (tone === "warn") pending += 1;
      // "Rooms" = people with at least one hotel night picked. The
      // producer wants heads, not paired-room counts — the rooming
      // sheet handles pairing separately. "Nights" = sum across all
      // people, which is what the hotel actually invoices.
      const nights = r.hotelDates.length;
      if (nights > 0) hotelRooms += 1;
      hotelNights += nights;
    }
    return `${total}|${accepted}|${pending}|${hotelRooms}|${hotelNights}`;
  }, [rows]);
  useEffect(() => {
    if (!onCountsChange) return;
    const [t, a, p, h, n] = countsKey.split("|").map((x) => Number(x));
    onCountsChange({
      total: t ?? 0,
      accepted: a ?? 0,
      pending: p ?? 0,
      hotelRooms: h ?? 0,
      hotelNights: n ?? 0,
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
    optimistic: Partial<{
      hotelRequired: boolean;
      hotelDates: string[];
      assignedDates: string[];
    }>,
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

  /** Replace a gig row's `hotelDates` wholesale (used by the per-phase
   *  hotel quick-pick on the Crew tab). Server keeps `hotelRequired`
   *  in lockstep with `hotelDates.length > 0`, but we mirror that
   *  here too so the optimistic state matches what the refetch will
   *  return. */
  const handleHotelDatesSet = useCallback(
    (gigId: string, nextDates: ReadonlyArray<string>) => {
      const sorted = [...nextDates].sort();
      const hotelRequired = sorted.length > 0;
      void patchGig(
        gigId,
        "hotel",
        { hotelDates: sorted, hotelRequired },
        `api/portal/briefs/${briefId}/hotel/${gigId}`,
        { hotelDates: sorted },
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
    // details" toggled on. Accepted-gig timing is used when there is
    // no matching local row.
    const printRows: MasterSheetRow[] = rows.map((row) => {
      const localId = resolveLocalIdFor(row);
      const local =
        localId !== null ? localCrew.find((m) => m.id === localId) : null;
      return {
        ...row,
        callTime: local?.callTime ?? row.callTime,
        offTime: local?.offTime ?? row.offTime,
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
  const linkedOwnerByUserId = useMemo(() => {
    const owners = new Map<string, string>();
    for (const member of localCrew) {
      if (
        member.freelancerUserId &&
        !owners.has(member.freelancerUserId)
      ) {
        owners.set(member.freelancerUserId, member.id);
      }
    }
    return owners;
  }, [localCrew]);
  const linkedUnsentMembers = useMemo(() => {
    const requestedUserIds = new Set(
      localCrew
        .filter(
          (member) => !!member.freelancerUserId && !!member.requestStatus,
        )
        .map((member) => member.freelancerUserId!),
    );
    const seen = new Set<string>();
    return localCrew.filter((member) => {
      const userId = member.freelancerUserId;
      if (
        !userId ||
        member.requestStatus ||
        requestedUserIds.has(userId) ||
        seen.has(userId)
      ) {
        return false;
      }
      seen.add(userId);
      return true;
    });
  },
    [localCrew],
  );

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
              background: "var(--card-bg, #ffffff)",
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
            onClick={() => void onSendLinkedRequests?.(linkedUnsentMembers)}
            disabled={
              linkedUnsentMembers.length === 0 ||
              sendingLinkedRequests ||
              !onSendLinkedRequests
            }
            className="crew-send-linked-button"
          >
            {sendingLinkedRequests
              ? "Sending…"
              : `Send request${linkedUnsentMembers.length === 1 ? "" : "s"}${
                  linkedUnsentMembers.length > 0
                    ? ` (${linkedUnsentMembers.length})`
                    : ""
                }`}
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
              className="btn btn-soft"
              onClick={() => void onSendLinkedRequests?.(linkedUnsentMembers)}
              disabled={
                linkedUnsentMembers.length === 0 ||
                sendingLinkedRequests ||
                !onSendLinkedRequests
              }
              title="Send the project brief to linked freelancers who have not been requested yet"
            >
              {sendingLinkedRequests
                ? "Sending…"
                : `Send request${linkedUnsentMembers.length === 1 ? "" : "s"}${
                    linkedUnsentMembers.length > 0
                      ? ` (${linkedUnsentMembers.length})`
                      : ""
                  }`}
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
                    onHotelDatesSet={
                      row.gigId
                        ? (dates) => handleHotelDatesSet(row.gigId!, dates)
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
                    portalCandidates={portalCandidates.filter((candidate) => {
                      const ownerId = linkedOwnerByUserId.get(candidate.userId);
                      return !ownerId || ownerId === local?.id;
                    })}
                    onLocalUpdate={
                      local
                        ? (patch) => onUpdate(local.id, patch)
                        : undefined
                    }
                    onLocalDayToggle={
                      local
                        ? (date) => {
                            const available = new Set(
                              scheduledShiftKeys(phaseDays ?? {}),
                            );
                            const legacyKeys = scheduledShiftKeys(
                              phaseDays ?? {},
                            ).filter((key) =>
                              (local.assignedDates ?? []).some((assignedDate) =>
                                key.startsWith(`${assignedDate}::`),
                              ),
                            );
                            const shiftKeys =
                              filterShiftSelectionsToSchedule(
                                local.assignedShiftPhases ?? legacyKeys,
                                available,
                              );
                            const datePhases = SHIFT_PHASES.filter((phase) =>
                              phaseDays?.[phase.key]?.includes(date),
                            );
                            const wasAssigned = datePhases.some((phase) =>
                              shiftKeys.has(
                                crewShiftAssignmentKey(date, phase.key),
                              ),
                            );
                            for (const phase of datePhases) {
                              const key = crewShiftAssignmentKey(date, phase.key);
                              if (wasAssigned) shiftKeys.delete(key);
                              else shiftKeys.add(key);
                            }
                            const nextDates =
                              assignedDatesFromShiftPhases(shiftKeys);
                            const assignedShiftTimes =
                              shiftTimesForSelections(
                                shiftKeys,
                                phaseShiftTimes ?? {},
                              );
                            const summary = summarizeShiftTimes(
                              shiftKeys,
                              assignedShiftTimes,
                              {
                                startTime: local.callTime,
                                endTime: local.offTime,
                              },
                            );
                            const patch: Partial<CrewMember> = {
                              assignedDates: nextDates,
                              assignedShiftPhases: [...shiftKeys].sort(),
                              assignedShiftTimes,
                              callTime: summary.startTime,
                              offTime: summary.endTime,
                            };
                            onUpdate(local.id, patch);
                          }
                        : undefined
                    }
                    onLocalRemove={
                      local &&
                      row.source === "local" &&
                      !(
                        local.freelancerUserId &&
                        (local.requestStatus || local.briefAssignmentId)
                      )
                        ? () => onRemove(local.id)
                        : undefined
                    }
                    onLocalDuplicate={
                      local && row.source === "local"
                        ? () => onDuplicate(local.id)
                        : undefined
                    }
                    phaseDays={phaseDays}
                    phaseShiftTimes={phaseShiftTimes}
                    onOpenProfile={onOpenProfile}
                    onLocalSetDays={
                      local
                        ? (_nextDates, nextShiftPhases) => {
                            const available = new Set(
                              scheduledShiftKeys(phaseDays ?? {}),
                            );
                            const shiftKeys =
                              filterShiftSelectionsToSchedule(
                                nextShiftPhases ?? [],
                                available,
                              );
                            const sorted =
                              assignedDatesFromShiftPhases(shiftKeys);
                            const assignedShiftTimes =
                              shiftTimesForSelections(
                                shiftKeys,
                                phaseShiftTimes ?? {},
                              );
                            const summary = summarizeShiftTimes(
                              shiftKeys,
                              assignedShiftTimes,
                              {
                                startTime: local.callTime,
                                endTime: local.offTime,
                              },
                            );
                            const patch: Partial<CrewMember> = {
                              assignedDates: sorted,
                              assignedShiftPhases: [...shiftKeys].sort(),
                              assignedShiftTimes,
                              callTime: summary.startTime,
                              offTime: summary.endTime,
                            };
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

function CrewNameCombobox({
  member,
  candidates,
  onUpdate,
}: {
  member: CrewMember;
  candidates: ReadonlyArray<FreelancerCandidate>;
  onUpdate: (patch: Partial<CrewMember>) => void;
}) {
  const listboxId = useId();
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const query = member.name.trim().toLocaleLowerCase("nb-NO");
  const matches = useMemo(() => {
    if (!query) return candidates.slice(0, 8);
    return candidates
      .filter((candidate) =>
        [candidate.fullName, candidate.primaryRole ?? "", candidate.city ?? ""]
          .join(" ")
          .toLocaleLowerCase("nb-NO")
          .includes(query),
      )
      .slice(0, 8);
  }, [candidates, query]);
  const linkedCandidate = member.freelancerUserId
    ? candidates.find(
        (candidate) => candidate.userId === member.freelancerUserId,
      ) ?? null
    : null;

  const selectCandidate = (candidate: FreelancerCandidate) => {
    onUpdate({
      name: candidate.fullName,
      freelancerUserId: candidate.userId,
      phone: candidate.phone ?? "",
      dietaryTags: [...(candidate.dietaryTags ?? [])],
      allergens: [...(candidate.allergens ?? [])],
    });
    setOpen(false);
    setActiveIndex(0);
  };

  return (
    <div
      className="crew-name-combobox"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setOpen(false);
        }
      }}
    >
      <input
        className="led-input"
        type="text"
        value={member.name}
        onFocus={() => {
          if (member.requestStatus) return;
          setOpen(true);
          setActiveIndex(0);
        }}
        onChange={(event) => {
          const nextName = event.target.value;
          const patch: Partial<CrewMember> = { name: nextName };
          if (member.freelancerUserId) {
            patch.freelancerUserId = undefined;
            patch.requestStatus = undefined;
            patch.briefAssignmentId = undefined;
            patch.phone = undefined;
            patch.dietaryTags = undefined;
            patch.allergens = undefined;
          }
          onUpdate(patch);
          setOpen(true);
          setActiveIndex(0);
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            setOpen(false);
            return;
          }
          if (matches.length === 0) return;
          if (event.key === "ArrowDown") {
            event.preventDefault();
            setOpen(true);
            setActiveIndex((current) => (current + 1) % matches.length);
          } else if (event.key === "ArrowUp") {
            event.preventDefault();
            setOpen(true);
            setActiveIndex(
              (current) => (current - 1 + matches.length) % matches.length,
            );
          } else if (event.key === "Enter" && open) {
            event.preventDefault();
            selectCandidate(matches[activeIndex] ?? matches[0]!);
          }
        }}
        placeholder="Full name"
        autoComplete="off"
        readOnly={!!member.freelancerUserId && !!member.requestStatus}
        title={
          member.requestStatus
            ? "The name is locked after a portal request is sent."
            : undefined
        }
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={open && matches.length > 0}
        aria-controls={listboxId}
        aria-activedescendant={
          open && matches[activeIndex]
            ? `${listboxId}-${matches[activeIndex]!.userId}`
            : undefined
        }
      />
      {member.freelancerUserId ? (
        <span
          className="crew-name-linked"
          title={
            linkedCandidate
              ? `Linked to ${linkedCandidate.fullName}'s portal account`
              : "Linked to a freelancer portal account"
          }
        >
          Portal linked
        </span>
      ) : null}
      {open && matches.length > 0 ? (
        <div
          className="crew-name-options"
          id={listboxId}
          role="listbox"
          aria-label="Registered freelancers"
        >
          {matches.map((candidate, index) => (
            <button
              key={candidate.userId}
              id={`${listboxId}-${candidate.userId}`}
              type="button"
              role="option"
              aria-selected={index === activeIndex}
              className={
                index === activeIndex
                  ? "crew-name-option is-active"
                  : "crew-name-option"
              }
              onMouseEnter={() => setActiveIndex(index)}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => selectCandidate(candidate)}
            >
              <span className="crew-name-option-name">
                {candidate.fullName}
              </span>
              <span className="crew-name-option-meta">
                {[candidate.primaryRole, candidate.city]
                  .filter(Boolean)
                  .join(" · ") || "Registered freelancer"}
              </span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
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
  onHotelDatesSet,
  onDayToggle,
  local,
  showProductionDetails,
  portalCandidates,
  onLocalUpdate,
  onLocalDayToggle,
  onLocalRemove,
  onLocalDuplicate,
  phaseDays,
  phaseShiftTimes,
  onLocalSetDays,
  onOpenProfile,
}: {
  row: RosterRow;
  projectDays: ReadonlyArray<string> | null;
  hotelSaving: boolean;
  datesSaving: boolean;
  onHotelToggle?: (next: boolean) => void;
  /** Replace this gig row's hotelDates wholesale. Used by the
   *  per-phase hotel quick-pick. Only wired for gig-backed rows;
   *  local rows mutate `CrewMember.hotelDates` via onLocalUpdate. */
  onHotelDatesSet?: (dates: ReadonlyArray<string>) => void;
  onDayToggle?: (date: string) => void;
  local: CrewMember | null;
  showProductionDetails: boolean;
  portalCandidates: ReadonlyArray<FreelancerCandidate>;
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
  phaseDays?: Partial<
    Record<CrewShiftPhaseKey, ReadonlyArray<string>>
  >;
  phaseShiftTimes?: CrewShiftTimeMap;
  /** Replace the local row's working days wholesale (used by the
   *  quick-pick buttons). Recomputes call/off from the schedule. */
  onLocalSetDays?: (
    dates: ReadonlyArray<string>,
    shiftPhases?: ReadonlyArray<string>,
  ) => void;
  onOpenProfile?: (userId: string) => void;
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
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <CrewNameCombobox
                member={local!}
                candidates={portalCandidates}
                onUpdate={(patch) => onLocalUpdate?.(patch)}
              />
            </div>
            {row.freelancerUserId && onOpenProfile ? (
              <button
                type="button"
                className="ehs-ghost-btn"
                onClick={() => onOpenProfile(row.freelancerUserId!)}
                title={`Open ${row.name || "freelancer"} profile and booking history`}
                aria-label={`Open ${row.name || "freelancer"} profile and booking history`}
                style={{ flexShrink: 0, padding: "4px 7px", height: "auto" }}
              >
                Profile
              </button>
            ) : null}
          </div>
        ) : (
          <div className="roster-name">
            {row.freelancerUserId && onOpenProfile ? (
              <button 
                type="button"
                className="ehs-ghost-btn"
                style={{ padding: 0, fontWeight: 800, color: "inherit", height: "auto" }}
                onClick={() => onOpenProfile(row.freelancerUserId!)}
              >
                {row.name || "—"}
              </button>
            ) : (
              <strong>{row.name || "—"}</strong>
            )}
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
                if (local?.freelancerUserId && local.requestStatus) return;
                onLocalUpdate?.({ requestStatus: undefined });
              } else {
                onLocalUpdate?.({
                  requestStatus: v as CrewRequestStatus,
                });
              }
            }}
            title="Set this person's confirmation status (e.g. mark Accepted after a phone call)"
          >
            <option
              value="manual"
              disabled={!!local?.freelancerUserId && !!local.requestStatus}
            >
              Manual
            </option>
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
        {/* Date × phase state is intentionally stored independently from
            assignedDates. Several phases may share one date, so deriving
            phase state from the flat date array makes removing Load-out
            also clear Show. The matrix keeps the exact selections while
            still deriving the legacy assignedDates API payload. */}
        {editableLocal && onLocalSetDays && phaseDays
          ? (
              <ShiftAssignmentMatrix
                crewName={row.name}
                assignedDates={row.assignedDates}
                assignedShiftPhases={local?.assignedShiftPhases}
                phaseDays={phaseDays}
                phaseShiftTimes={phaseShiftTimes}
                onSave={onLocalSetDays}
              />
            )
          : null}
      </td>
      <td>
        <HotelQuickPick
          row={row}
          phaseDays={phaseDays}
          saving={hotelSaving}
          onSet={
            row.source === "gig" && onHotelDatesSet
              ? onHotelDatesSet
              : editableLocal && onLocalUpdate
                ? (dates) => {
                    const sorted = [...dates].sort();
                    onLocalUpdate({
                      hotelDates: sorted,
                      needsHotel: sorted.length > 0,
                    });
                  }
                : undefined
          }
          onLegacyToggle={
            row.source === "gig" && onHotelToggle && row.hotelDates.length === 0
              ? onHotelToggle
              : undefined
          }
        />
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
            ) : row.callTime ? (
              <span>{row.callTime}</span>
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
            ) : row.offTime ? (
              <span>{row.offTime}</span>
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

const SHIFT_PHASES = [
  { key: "setup", label: "Load-in" },
  { key: "rehearsal", label: "Soundcheck" },
  { key: "show", label: "Show" },
  { key: "downrig", label: "Load-out" },
] as const;

function ShiftAssignmentMatrix({
  crewName,
  assignedDates,
  assignedShiftPhases,
  phaseDays,
  phaseShiftTimes,
  onSave,
}: {
  crewName: string;
  assignedDates: ReadonlyArray<string>;
  assignedShiftPhases?: ReadonlyArray<string>;
  phaseDays: Partial<
    Record<CrewShiftPhaseKey, ReadonlyArray<string>>
  >;
  phaseShiftTimes?: CrewShiftTimeMap;
  onSave: (
    dates: ReadonlyArray<string>,
    shiftPhases?: ReadonlyArray<string>,
  ) => void;
}) {
  const reactId = useId();
  const idPrefix = reactId.replace(/[^a-zA-Z0-9_-]/g, "");
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Set<string>>(new Set());
  const availableShiftKeys = useMemo(
    () => new Set(scheduledShiftKeys(phaseDays)),
    [phaseDays],
  );
  const allDays = useMemo(() => {
    return assignedDatesFromShiftPhases(availableShiftKeys);
  }, [availableShiftKeys]);

  const initialSelections = useCallback(() => {
    if (assignedShiftPhases) {
      return filterShiftSelectionsToSchedule(
        assignedShiftPhases,
        availableShiftKeys,
      );
    }
    return filterShiftSelectionsToSchedule(
      assignedDates.flatMap((date) =>
        SHIFT_PHASES.filter((phase) =>
          phaseDays[phase.key]?.includes(date),
        ).map((phase) => crewShiftAssignmentKey(date, phase.key)),
      ),
      availableShiftKeys,
    );
  }, [
    assignedDates,
    assignedShiftPhases,
    availableShiftKeys,
    phaseDays,
  ]);

  const phasesForDay = useCallback(
    (dateKey: string) =>
      SHIFT_PHASES.filter((phase) =>
        phaseDays[phase.key]?.includes(dateKey),
      ),
    [phaseDays],
  );

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  const openMatrix = () => {
    setDraft(initialSelections());
    setOpen(true);
  };

  const updatePhase = (
    dateKey: string,
    phaseName: CrewShiftPhaseKey,
    checked: boolean,
  ) => {
    setDraft((current) => {
      return setCrewShiftPhaseSelection(
        current,
        dateKey,
        phaseName,
        checked,
      );
    });
  };

  const toggleFullDay = (dateKey: string) => {
    setDraft((current) => {
      const next = new Set(current);
      const keys = phasesForDay(dateKey).map((phase) =>
        crewShiftAssignmentKey(dateKey, phase.key),
      );
      const fullDay = keys.every((key) => next.has(key));
      for (const key of keys) {
        if (fullDay) next.delete(key);
        else next.add(key);
      }
      return next;
    });
  };

  const applyDayToSelectedDays = (sourceDate: string) => {
    setDraft((current) => {
      const next = new Set(current);
      const sourcePhases = phasesForDay(sourceDate).filter((phase) =>
        next.has(crewShiftAssignmentKey(sourceDate, phase.key)),
      );
      const selectedDays = allDays.filter((date) =>
        phasesForDay(date).some((phase) =>
          next.has(crewShiftAssignmentKey(date, phase.key)),
        ),
      );
      for (const date of selectedDays) {
        for (const phase of phasesForDay(date)) {
          const key = crewShiftAssignmentKey(date, phase.key);
          if (sourcePhases.some((source) => source.key === phase.key)) {
            next.add(key);
          } else {
            next.delete(key);
          }
        }
      }
      return next;
    });
  };

  const save = () => {
    const dates = assignedDatesFromShiftPhases(draft);
    onSave(dates, [...draft].sort());
    setOpen(false);
  };

  const selectedDayCount = allDays.filter((date) =>
    phasesForDay(date).some((phase) =>
      initialSelections().has(
        crewShiftAssignmentKey(date, phase.key),
      ),
    ),
  ).length;

  return (
    <>
      <button
        type="button"
        className="roster-day-quickpick-btn"
        onClick={openMatrix}
        disabled={allDays.length === 0}
      >
        Edit shifts{selectedDayCount > 0 ? ` (${selectedDayCount}d)` : ""}
      </button>
      {open && typeof document !== "undefined"
        ? createPortal(
            <>
              <button
                type="button"
                className="crew-shift-matrix-backdrop"
                aria-label="Close shift assignment matrix"
                onClick={() => setOpen(false)}
              />
              <section
                className="crew-shift-matrix"
                role="dialog"
                aria-modal="true"
                aria-labelledby={`${idPrefix}-shift-matrix-title`}
              >
                <header className="crew-shift-matrix-header">
                  <div>
                    <p className="crew-shift-matrix-eyebrow">Crew booking</p>
                    <h3 id={`${idPrefix}-shift-matrix-title`}>
                      Assign shifts{crewName ? ` — ${crewName}` : ""}
                    </h3>
                  </div>
                  <button
                    type="button"
                    className="crew-shift-matrix-close"
                    onClick={() => setOpen(false)}
                    aria-label="Close"
                  >
                    ×
                  </button>
                </header>
                <div className="crew-shift-matrix-scroll">
                  {allDays.map((dateKey) => {
                    const availablePhases = phasesForDay(dateKey);
                    const fullDay = availablePhases.every((phase) =>
                      draft.has(crewShiftAssignmentKey(dateKey, phase.key)),
                    );
                    return (
                      <fieldset className="crew-shift-day" key={dateKey}>
                        <legend>{dateKey}</legend>
                        <div className="crew-shift-day-actions">
                          <button
                            type="button"
                            className={fullDay ? "is-active" : ""}
                            aria-pressed={fullDay}
                            onClick={() => toggleFullDay(dateKey)}
                          >
                            {fullDay ? "Clear full day" : "Full Day"}
                          </button>
                          {allDays.length > 1 ? (
                            <button
                              type="button"
                              onClick={() => applyDayToSelectedDays(dateKey)}
                            >
                              Apply to All Selected Days
                            </button>
                          ) : null}
                        </div>
                        <div className="crew-shift-phase-grid">
                          {availablePhases.map((phase) => {
                            const checkboxId = `${idPrefix}-shift-check-${dateKey}-${phase.key}`;
                            const assignmentKey = crewShiftAssignmentKey(
                              dateKey,
                              phase.key,
                            );
                            const timing = phaseShiftTimes?.[assignmentKey];
                            return (
                              <div
                                className="crew-shift-phase"
                                key={`${dateKey}-${phase.key}`}
                              >
                                <input
                                  id={checkboxId}
                                  type="checkbox"
                                  checked={draft.has(assignmentKey)}
                                  onChange={(event) =>
                                    updatePhase(
                                      dateKey,
                                      phase.key,
                                      event.target.checked,
                                    )
                                  }
                                />
                                <label htmlFor={checkboxId}>
                                  <span>{phase.label}</span>
                                  {timing ? (
                                    <small>
                                      {timing.startTime}–{timing.endTime}
                                    </small>
                                  ) : null}
                                </label>
                              </div>
                            );
                          })}
                        </div>
                      </fieldset>
                    );
                  })}
                </div>
                <footer className="crew-shift-matrix-footer">
                  <button type="button" onClick={() => setOpen(false)}>
                    Cancel
                  </button>
                  <button type="button" className="is-primary" onClick={save}>
                    Save shifts
                  </button>
                </footer>
              </section>
            </>,
            document.body,
          )
        : null}
    </>
  );
}

/** Per-day hotel quick-pick. Mirrors the working-days quick-pick on
 *  the days cell, but constrained to `row.assignedDates` — the
 *  producer can never book a hotel night for a day the person isn't
 *  on call. Each phase button toggles its overlap with assignedDates
 *  in/out of `hotelDates`; "All" fills every assigned day, "None"
 *  clears. Active state = every overlap day is currently in
 *  hotelDates. Hides phases with zero overlap so the row only shows
 *  what's actually pickable. */
function HotelQuickPick({
  row,
  phaseDays,
  saving,
  onSet,
  onLegacyToggle,
}: {
  row: RosterRow;
  phaseDays?: Partial<Record<string, ReadonlyArray<string>>>;
  saving: boolean;
  onSet?: (dates: ReadonlyArray<string>) => void;
  /** Legacy boolean toggle — only used for gig rows that have no
   *  hotelDates yet AND no assignedDates (e.g. a freshly-confirmed
   *  gig before the producer picked working days). Lets the producer
   *  flag the person for a hotel before the day picker becomes
   *  meaningful. */
  onLegacyToggle?: (next: boolean) => void;
}) {
  const assigned = row.assignedDates;
  const hotel = row.hotelDates;
  const hotelSet = useMemo(() => new Set(hotel), [hotel]);
  // Collapsed by default so the table stays visually quiet — the
  // producer only sees a compact summary chip per row, and the phase
  // picker expands inline when they tap it. Keeping the state local
  // (one boolean per row) means we don't need to persist anything;
  // the picker auto-collapses on remount, which is what you want
  // after a poll-driven refetch.
  const [expanded, setExpanded] = useState(false);
  if (!onSet) {
    // Read-only fallback (e.g. a gig row whose handler the parent
    // didn't wire). Show the count if any nights are picked, else
    // a quiet em-dash.
    return hotel.length > 0 ? (
      <span className="roster-hotel-label" title={hotel.join(", ")}>
        {hotel.length} night{hotel.length === 1 ? "" : "s"}
      </span>
    ) : (
      <span className="crew-pill-empty">—</span>
    );
  }
  if (assigned.length === 0) {
    // No working days yet — fall back to the legacy boolean toggle so
    // the producer can still flag "this person needs a hotel" before
    // picking dates. Once dates exist the picker takes over and the
    // boolean is derived from hotelDates.length > 0.
    if (!onLegacyToggle) {
      return (
        <span className="crew-pill-empty" title="Pick working days first.">
          —
        </span>
      );
    }
    return (
      <label className="roster-hotel" title="Tick when this person needs a hotel">
        <input
          type="checkbox"
          checked={row.hotelRequired}
          disabled={saving}
          onChange={(e) => onLegacyToggle(e.target.checked)}
        />
        <span className="roster-hotel-label">
          {row.hotelRequired ? "hotel" : "no"}
        </span>
      </label>
    );
  }
  // Collapsed state: a single compact summary button. Tapping it
  // expands the phase picker. Two visual variants:
  //   • No nights yet → "+ Hotel" (neutral chip, invites a click)
  //   • Some nights   → "🏨 N nights" using the active-orange style
  //                     so it's instantly readable in the table.
  if (!expanded) {
    const hasNights = hotel.length > 0;
    return (
      <button
        type="button"
        className={
          "roster-day-quickpick-btn" +
          (hasNights ? " roster-day-quickpick-btn-active" : "")
        }
        disabled={saving}
        title={
          hasNights
            ? `Hotel: ${hotel.length} night${hotel.length === 1 ? "" : "s"} — click to edit`
            : "Add hotel nights"
        }
        onClick={() => setExpanded(true)}
      >
        {hasNights
          ? `🏨 ${hotel.length} night${hotel.length === 1 ? "" : "s"}`
          : "+ Hotel"}
      </button>
    );
  }
  const phaseEntries = (
    ["setup", "rehearsal", "show", "downrig"] as const
  )
    .map((k) => ({
      key: k,
      // Constrain each phase to the row's working days so the producer
      // can't accidentally pick a Show-day hotel night for someone
      // who's only on call during Setup.
      days: (phaseDays?.[k] ?? []).filter((d) => assigned.includes(d)),
    }))
    .filter((p) => p.days.length > 0);
  const phaseLabel: Record<string, string> = {
    setup: "Setup",
    rehearsal: "Rehearsal",
    show: "Show",
    downrig: "Load Out",
  };
  const isPhaseActive = (days: ReadonlyArray<string>) =>
    days.length > 0 && days.every((d) => hotelSet.has(d));
  return (
    <div
      className={`roster-day-quickpick${saving ? " is-saving" : ""}`}
      role="group"
      aria-label="Quick-fill hotel nights"
      aria-busy={saving || undefined}
    >
      <span className="roster-day-quickpick-label">
        Hotel{hotel.length > 0 ? ` (${hotel.length})` : ""}:
      </span>
      {phaseEntries.map((p) => {
        const active = isPhaseActive(p.days);
        return (
          <button
            key={p.key}
            type="button"
            className={
              "roster-day-quickpick-btn" +
              (active ? " roster-day-quickpick-btn-active" : "")
            }
            aria-pressed={active}
            disabled={saving}
            title={
              active
                ? `Remove ${phaseLabel[p.key]} hotel nights (${p.days.length})`
                : `Add ${phaseLabel[p.key]} hotel nights (${p.days.length})`
            }
            onClick={() => {
              const next = new Set(hotel);
              if (active) {
                for (const d of p.days) next.delete(d);
              } else {
                for (const d of p.days) next.add(d);
              }
              onSet([...next]);
            }}
          >
            {phaseLabel[p.key]}
          </button>
        );
      })}
      <button
        type="button"
        className={
          "roster-day-quickpick-btn" +
          (assigned.every((d) => hotelSet.has(d)) && hotel.length > 0
            ? " roster-day-quickpick-btn-active"
            : "")
        }
        disabled={saving}
        title="Hotel for every working day"
        onClick={() => onSet([...assigned])}
      >
        All
      </button>
      <button
        type="button"
        className="roster-day-quickpick-btn roster-day-quickpick-btn-clear"
        disabled={saving || hotel.length === 0}
        title="Clear all hotel nights"
        onClick={() => onSet([])}
      >
        None
      </button>
      {/* Tiny ✕ collapses the picker back to the summary chip. We
       *  leave this manual rather than auto-collapsing on save so the
       *  producer can pick e.g. Setup then Show in two taps without
       *  the picker disappearing between clicks. */}
      <button
        type="button"
        className="roster-day-quickpick-btn roster-day-quickpick-btn-clear"
        title="Hide hotel options"
        aria-label="Hide hotel options"
        onClick={() => setExpanded(false)}
      >
        ✕
      </button>
    </div>
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
      // Producer-facing: a declined crew member should read as "this
      // slot lost a candidate" — light red, not muted grey, so it
      // doesn't visually blend with hand-typed in-house crew.
      return "bad";
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
