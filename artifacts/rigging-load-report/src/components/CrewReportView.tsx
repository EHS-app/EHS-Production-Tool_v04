import { useCallback, useState, type ReactNode } from "react";
import { MasterCrewSheet } from "./MasterCrewSheet";
import { ProducerHoursPanel } from "./ProducerHoursPanel";
import { FreelancerProfileModal } from "./global/FreelancerProfileModal";
import {
  type CrewMember,
} from "../lib/crew";
import type {
  CrewShiftPhaseKey,
  CrewShiftTimeMap,
} from "../lib/crewShiftAssignments";

type Props = {
  crew: CrewMember[];
  onAdd: () => void;
  onUpdate: (id: string, patch: Partial<CrewMember>) => void;
  onSaveShifts?: (id: string, patch: Partial<CrewMember>) => Promise<void>;
  onRemove: (id: string) => void;
  onDuplicate: (id: string) => void;
  onSendLinkedRequests?: (members: CrewMember[]) => void | Promise<void>;
  sendingLinkedRequests?: boolean;
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
  phaseDays?: Partial<
    Record<CrewShiftPhaseKey, ReadonlyArray<string>>
  >;
  /** Exact project schedule times keyed by date+phase. */
  phaseShiftTimes?: CrewShiftTimeMap;
  /** Optional context used by the downloadable daily call sheet. */
  brief?: {
    projectName: string;
    venue: string;
    clientContact?: { name?: string; phone?: string };
    productionContact?: { name?: string; phone?: string };
    venueContact?: { name?: string; phone?: string };
  };
  readOnly?: boolean;
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
  onSaveShifts,
  onRemove,
  onDuplicate,
  onSendLinkedRequests,
  sendingLinkedRequests,
  directorySidebar,
  activeBriefId,
  getToken,
  getTimesForDates,
  phaseDays,
  phaseShiftTimes,
  brief,
  readOnly = false,
}: Props) {
  // Headcount source for the adequacy meter: the merged roster the
  // master sheet is actually displaying (gig + local), bubbled up
  // from MasterCrewSheet via onMergedRolesChange. Falls back to the
  // local crew[] until the first roster fetch lands so the meter
  // still works on day-1 planning before any portal brief is
  // pushed.
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
  const [profileUserId, setProfileUserId] = useState<string | null>(null);
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
            brief={brief}
            onAdd={onAdd}
            onUpdate={onUpdate}
            onSaveShifts={onSaveShifts}
            onRemove={onRemove}
            onDuplicate={onDuplicate}
            onSendLinkedRequests={onSendLinkedRequests}
            sendingLinkedRequests={sendingLinkedRequests}
            onCountsChange={handleCountsChange}
            getTimesForDates={getTimesForDates}
            phaseDays={phaseDays}
            phaseShiftTimes={phaseShiftTimes}
            compactHeader
            onOpenProfile={(id) => setProfileUserId(id)}
            readOnly={readOnly}
          />
          {/* Producer-side hours review: submitted/approved/locked
              entries across every gig tied to this brief. Hidden when
              no brief has been pushed yet (no time entries can exist
              without an owning gig+brief). */}
          <ProducerHoursPanel
            briefId={activeBriefId ?? null}
            getToken={tokenResolver}
          />
        </div>
        {directorySidebar ? (
          <div className="crew-layout-aside">{directorySidebar}</div>
        ) : null}
      </div>
      {profileUserId && (
        <FreelancerProfileModal
          userId={profileUserId}
          getToken={tokenResolver}
          onClose={() => setProfileUserId(null)}
        />
      )}
    </div>
  );
}
