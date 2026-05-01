import { useMemo, type ReactNode } from "react";
import { NumberField } from "./NumberField";
import { RosterTable } from "./RosterTable";
import { AdequacyPanel } from "./AdequacyPanel";
import {
  CREW_REQUEST_STATUS_META,
  CREW_ROLES,
  computeCrewTotals,
  crewHours,
  formatCrewDayRate,
  type CrewMember,
  type CrewRole,
} from "../lib/crew";

type Props = {
  crew: CrewMember[];
  onAdd: () => void;
  onUpdate: (id: string, patch: Partial<CrewMember>) => void;
  onRemove: (id: string) => void;
  onDuplicate: (id: string) => void;
  /** Optional roster sidebar (e.g. <AvailableCrewSidebar/>). Rendered
   *  to the right of the call sheet on wide screens and stacked below
   *  on narrow ones. Kept as a slot so this view stays unaware of the
   *  freelancer-portal data layer. */
  directorySidebar?: ReactNode;
  /** Producer's active brief id from App.tsx. When set we render the
   *  Phase-C Producer Roster panel above the call sheet. When null
   *  (no brief active yet) the panel is hidden — there's nothing
   *  meaningful to show without a brief context. */
  activeBriefId?: string | null;
  /** Async token resolver from Clerk's `useAuth`. Threaded through
   *  to the roster panel so it can call the owner-only roster
   *  endpoint. Only required when `activeBriefId` is set. */
  getToken?: () => Promise<string | null>;
  /** Project-scope numbers for the Phase-C adequacy meter, derived
   *  in App.tsx from the rigging / LED / lighting / stage tabs.
   *  Optional — when missing the panel is hidden. */
  adequacyMetrics?: {
    hoistPoints: number;
    ledArea: number;
    stageArea: number;
    fixtureCount: number;
  };
};

const fmtNum = (n: number, d = 1) =>
  n.toLocaleString("en-US", { maximumFractionDigits: d });

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
}: Props) {
  const totals = useMemo(() => computeCrewTotals(crew), [crew]);
  // Headcount source for the adequacy meter: the local crew[] (the
  // producer's call sheet) rather than the merged portal roster.
  // Reasons:
  //   - the call sheet is the producer's source-of-truth for "who
  //     I've planned to bring";
  //   - it's available even before any brief is pushed to the
  //     portal (so the meter still works on day-1 planning);
  //   - it sidesteps having to hoist RosterTable's internal fetch
  //     into the parent for Slice 3.
  // Once the brief is live and people are confirmed via gigs the
  // producer typically mirrors them into the call sheet anyway, so
  // the count stays meaningful.
  const rosterRoles = useMemo(() => crew.map((m) => m.role), [crew]);

  return (
    <div
      className={
        directorySidebar
          ? "led-report led-report-with-sidebar"
          : "led-report"
      }
    >
      <header className="led-report-header">
        <div>
          <h2>Crew Report</h2>
          <p className="led-report-sub">
            Call sheet for the show — name, department, call &amp; off times
            and day rate (kr). Hours and costs roll up into the dashboard.
          </p>
        </div>
        <div className="led-report-meta">
          <span className="badge">
            <strong>{totals.count}</strong> crew
          </span>
          <span className="badge">
            <strong>{fmtNum(totals.totalHours, 1)}</strong> person-hours
          </span>
          <span className="badge">
            <strong>{formatCrewDayRate(totals.totalCost)}</strong> total cost
          </span>
        </div>
      </header>

      {/* Per-department headcount + cost dashboard */}
      <div className="led-dashboard">
        {CREW_ROLES.map((role) => (
          <div className="led-stat" key={role}>
            <div className="led-stat-label">{role}</div>
            <div className="led-stat-value">{totals.countsByRole[role]}</div>
            <div className="led-stat-sub">
              {totals.costsByRole[role] > 0
                ? formatCrewDayRate(totals.costsByRole[role])
                : "—"}
            </div>
          </div>
        ))}
      </div>

      {/* Two-column layout: call sheet on the left, freelancer
          directory on the right. The grid collapses to a single column
          below the breakpoint defined in index.css so the sidebar
          stacks gracefully on iPad / phone. */}
      <div className="crew-layout">
      <div className="crew-layout-main">
      {/* Phase C — Producer Roster panel. Only rendered once a brief
          is active; before then there's no server-side roster to
          fetch and the local crew[] is already shown by the call
          sheet below. */}
      {activeBriefId && getToken ? (
        <RosterTable
          briefId={activeBriefId}
          getToken={getToken}
          localCrew={crew}
        />
      ) : null}
      {/* Phase C — Crew Adequacy panel. Always visible (not gated on
          activeBriefId) because the meter is useful during day-1
          planning, before any portal brief exists. Only rendered if
          the parent passes derived metrics — App.tsx wires this up
          from the rigging / LED / lighting / stage tabs. */}
      {adequacyMetrics ? (
        <AdequacyPanel
          derived={adequacyMetrics}
          rosterRoles={rosterRoles}
        />
      ) : null}
      {/* Crew list */}
      <section className="led-card">
        <div className="led-card-head">
          <h3>Crew</h3>
          <div className="led-controls">
            <button className="btn btn-primary" onClick={onAdd}>
              + Add crew member
            </button>
          </div>
        </div>

        {crew.length === 0 ? (
          <div className="led-empty">
            No crew yet — add the first one to start your call sheet.
          </div>
        ) : (
          <div className="led-table-wrap">
            <table className="led-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Department</th>
                  <th>Status</th>
                  <th>Call</th>
                  <th>Off</th>
                  <th className="led-num">Hours</th>
                  <th className="led-num">Day rate (kr)</th>
                  <th>Notes</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {crew.map((m) => (
                  <CrewRow
                    key={m.id}
                    member={m}
                    onUpdate={(patch) => onUpdate(m.id, patch)}
                    onRemove={() => onRemove(m.id)}
                    onDuplicate={() => onDuplicate(m.id)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      </div>
      {directorySidebar ? (
        <div className="crew-layout-aside">{directorySidebar}</div>
      ) : null}
      </div>
    </div>
  );
}

function CrewRow({
  member,
  onUpdate,
  onRemove,
  onDuplicate,
}: {
  member: CrewMember;
  onUpdate: (patch: Partial<CrewMember>) => void;
  onRemove: () => void;
  onDuplicate: () => void;
}) {
  const hours = crewHours(member);

  return (
    <tr>
      <td>
        <input
          className="led-input"
          type="text"
          value={member.name}
          onChange={(e) => onUpdate({ name: e.target.value })}
          placeholder="Full name"
        />
      </td>
      <td>
        <select
          className="led-input"
          value={member.role}
          onChange={(e) => onUpdate({ role: e.target.value as CrewRole })}
        >
          {CREW_ROLES.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </td>
      <td>
        {member.requestStatus ? (
          <span
            className={`crew-pill crew-pill-${CREW_REQUEST_STATUS_META[member.requestStatus].tone}`}
            title={CREW_REQUEST_STATUS_META[member.requestStatus].label}
          >
            {CREW_REQUEST_STATUS_META[member.requestStatus].label}
          </span>
        ) : (
          <span className="crew-pill-empty">—</span>
        )}
      </td>
      <td>
        <input
          className="led-input led-input-num"
          type="time"
          value={member.callTime}
          onChange={(e) => onUpdate({ callTime: e.target.value })}
        />
      </td>
      <td>
        <input
          className="led-input led-input-num"
          type="time"
          value={member.offTime}
          onChange={(e) => onUpdate({ offTime: e.target.value })}
        />
      </td>
      <td className="led-num">{fmtNum(hours, 1)}</td>
      <td>
        <NumberField
          className="led-input led-input-num"
          min={0}
          step={10}
          value={member.dayRate}
          transform={(n) => Math.max(0, n || 0)}
          emptyValue={0}
          onCommit={(dayRate) => onUpdate({ dayRate })}
        />
      </td>
      <td>
        <input
          className="led-input"
          type="text"
          value={member.notes}
          onChange={(e) => onUpdate({ notes: e.target.value })}
          placeholder="e.g. IPAF, half-day"
        />
      </td>
      <td className="led-actions">
        <button
          type="button"
          className="btn btn-soft btn-sm"
          onClick={onDuplicate}
          title="Duplicate"
        >
          Copy
        </button>
        <button
          type="button"
          className="btn btn-danger btn-sm"
          onClick={onRemove}
          title="Remove"
        >
          Delete
        </button>
      </td>
    </tr>
  );
}
