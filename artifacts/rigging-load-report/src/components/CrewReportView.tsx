import { useCallback, useMemo, useState, type ReactNode } from "react";
import { MasterCrewSheet } from "./MasterCrewSheet";
import { AdequacyPanel } from "./AdequacyPanel";
import {
  type CrewMember,
} from "../lib/crew";

type Props = {
  crew: CrewMember[];
  onAdd: () => void;
  onUpdate: (id: string, patch: Partial<CrewMember>) => void;
  onRemove: (id: string) => void;
  onDuplicate: (id: string) => void;
  /** Optional roster sidebar (e.g. <AvailableCrewSidebar/>). Rendered
   *  to the right of the master sheet on wide screens and stacked
   *  below on narrow ones. Kept as a slot so this view stays unaware
   *  of the freelancer-portal data layer. */
  directorySidebar?: ReactNode;
  /** Producer's active brief id from App.tsx. Threaded through to
   *  MasterCrewSheet so it can pull portal roster data. When null
   *  the sheet still renders the local CrewMember[] as a pure call
   *  sheet — useful day-1 before any brief is pushed. */
  activeBriefId?: string | null;
  /** Async token resolver from Clerk's `useAuth`. Only required when
   *  `activeBriefId` is set (then MasterCrewSheet uses it for the
   *  owner-only roster endpoint). */
  getToken?: () => Promise<string | null>;
  /** Project-scope numbers for the adequacy meter, derived in App.tsx
   *  from the rigging / LED / lighting / stage tabs. Optional — when
   *  missing the panel is hidden. */
  adequacyMetrics?: {
    hoistPoints: number;
    ledArea: number;
    stageArea: number;
    fixtureCount: number;
  };
  /** Returns the earliest call → latest off times across the project
   *  schedule segments that cover the given assigned days. Threaded
   *  through to MasterCrewSheet so day-chip toggles can keep each
   *  row's call/off in sync with the schedule of the days actually
   *  ticked on. */
  getTimesForDates?: (
    dates: ReadonlyArray<string>,
    defaults: { callTime: string; offTime: string },
  ) => { callTime: string; offTime: string };
  /** Days covered by each schedule phase (Setup / Rehearsal / Show /
   *  Load Out). Threaded through to MasterCrewSheet so each local
   *  crew row can offer one-click "fill from Setup days", "from Show
   *  days", etc. quick-pick buttons. */
  phaseDays?: Partial<Record<string, ReadonlyArray<string>>>;
};

/** Crew & Logistics view — one master sheet, one optional adequacy
 *  panel, one optional crew directory sidebar. The previous version
 *  stacked four sections (per-dept dashboard, RosterTable, AdequacyPanel,
 *  inline call sheet) which producers reported as confusing — they
 *  couldn't tell which one was the source of truth and felt they had
 *  to re-enter the same name in three places. This view replaces all
 *  four with a single MasterCrewSheet that shows everyone × everything,
 *  keeping the AdequacyPanel as a sidekick at the bottom (still
 *  useful, but no longer competing for the producer's attention). */
export function CrewReportView({
  crew,
  onAdd,
  onUpdate,
  onRemove,
  onDuplicate,
  directorySidebar,
  activeBriefId,
  getToken,
  adequacyMetrics,
  getTimesForDates,
  phaseDays,
}: Props) {
  // Headcount source for the adequacy meter: the merged roster the
  // master sheet is actually displaying (gig + local), bubbled up
  // from MasterCrewSheet via onMergedRolesChange. Falls back to the
  // local crew[] until the first roster fetch lands so the meter
  // still works on day-1 planning before any portal brief is
  // pushed.
  const localRoles = useMemo(() => crew.map((m) => m.role), [crew]);
  const [mergedRoles, setMergedRoles] = useState<ReadonlyArray<string> | null>(
    null,
  );
  const handleMergedRolesChange = useCallback(
    (roles: ReadonlyArray<string>) => setMergedRoles(roles),
    [],
  );
  const rosterRoles = mergedRoles ?? localRoles;

  // Stat-card counts bubbled up from MasterCrewSheet so the redesigned
  // header row (CREW / ACCEPTED / PENDING / HOTEL ROOMS) reflects the
  // merged gig+local roster. Initialised from the local crew so the
  // cards are populated before the first portal fetch lands.
  const [counts, setCounts] = useState<{
    total: number;
    accepted: number;
    pending: number;
    hotelRooms: number;
    hotelNights: number;
  }>(() => ({
    total: crew.length,
    accepted: 0,
    pending: 0,
    hotelRooms: 0,
    hotelNights: 0,
  }));
  const handleCountsChange = useCallback(
    (next: {
      total: number;
      accepted: number;
      pending: number;
      hotelRooms: number;
      hotelNights: number;
    }) => setCounts(next),
    [],
  );

  // Default getToken so MasterCrewSheet's signature stays simple
  // (always defined). When the parent didn't pass one we fall back
  // to a no-op resolver — the sheet's fetch loop is already gated
  // on activeBriefId so the unauthenticated path is never reached.
  const tokenResolver =
    getToken ?? (async () => null);

  return (
    <div
      className={
        directorySidebar
          ? "led-report led-report-with-sidebar"
          : "led-report"
      }
    >
      <header className="crew-page-header">
        <p className="crew-eyebrow">Roster, hotel, catering and call sheets.</p>
        <div className="crew-page-title">
          <h2>Crew &amp; Logistics</h2>
        </div>
      </header>

      {/* 4 stat cards in a row, matching the producer reference. The
          counts come from MasterCrewSheet via onCountsChange so they
          always reflect the merged gig+local roster. */}
      <div className="crew-stats-row">
        <div className="crew-stat-card">
          <div className="crew-stat-label">Crew</div>
          <div className="crew-stat-value">{counts.total}</div>
        </div>
        <div className="crew-stat-card">
          <div className="crew-stat-label">Accepted</div>
          <div className="crew-stat-value crew-stat-value-ok">
            {counts.accepted}
          </div>
        </div>
        <div className="crew-stat-card">
          <div className="crew-stat-label">Pending</div>
          <div className="crew-stat-value crew-stat-value-warn">
            {counts.pending}
          </div>
        </div>
        <div className="crew-stat-card">
          <div className="crew-stat-label">Hotel rooms</div>
          <div className="crew-stat-value">{counts.hotelRooms}</div>
        </div>
        <div className="crew-stat-card">
          <div className="crew-stat-label">Hotel nights</div>
          <div className="crew-stat-value">{counts.hotelNights}</div>
        </div>
      </div>

      {/* Two-column layout: master sheet on the left, freelancer
          directory on the right. The grid collapses to a single column
          below the breakpoint defined in index.css so the sidebar
          stacks gracefully on iPad / phone. */}
      <div className="crew-layout">
        <div className="crew-layout-main">
          <MasterCrewSheet
            briefId={activeBriefId ?? null}
            getToken={tokenResolver}
            localCrew={crew}
            onAdd={onAdd}
            onUpdate={onUpdate}
            onRemove={onRemove}
            onDuplicate={onDuplicate}
            onMergedRolesChange={handleMergedRolesChange}
            onCountsChange={handleCountsChange}
            getTimesForDates={getTimesForDates}
            phaseDays={phaseDays}
            compactHeader
          />
          {/* Adequacy panel — kept as a sidekick BELOW the master
              sheet so it doesn't compete for attention. Still surfaces
              "you have 5 riggers, suggested 6–8" warnings, just no
              longer the first thing the producer sees. Hidden when
              the parent didn't pass derived metrics (e.g. on a fresh
              brief with no rigging/LED/stage data yet). */}
          {adequacyMetrics ? (
            <AdequacyPanel
              derived={adequacyMetrics}
              rosterRoles={rosterRoles}
            />
          ) : null}
        </div>
        {directorySidebar ? (
          <div className="crew-layout-aside">{directorySidebar}</div>
        ) : null}
      </div>
    </div>
  );
}
