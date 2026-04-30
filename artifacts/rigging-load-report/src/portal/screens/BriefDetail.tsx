import { useMemo, useState } from "react";
import { useAuth } from "@clerk/react";
import { Link, useLocation } from "wouter";
import { PALETTE, type ThemeMode } from "../lib/portalTheme";
import {
  buildAcceptedSnapshot,
  findBrief,
  gigFromBrief,
  updateBrief,
  type PortalData,
} from "../lib/portalStorage";
import type {
  BriefAssignment,
  BriefAttachment,
  BriefRiggPlan,
  BriefSchedule,
  BriefSchedulePhaseKey,
  ProjectBrief,
} from "../../lib/projectBrief";
import { attachmentDownloadUrl } from "../../lib/briefAttachmentUpload";
import {
  diffBriefAgainstSnapshot,
  type DiffEntry,
} from "../../lib/briefDiff";
import { downloadBriefIcs } from "../../lib/icalExport";
import { openCallSheet } from "../../lib/callSheetExport";
import {
  findScheduleConflicts,
  type ScheduleConflict,
} from "../../lib/scheduleConflicts";

const PHASE_LABELS: Record<BriefSchedulePhaseKey, string> = {
  setup: "Setup",
  rehearsal: "Rehearsal",
  show: "Show",
  // Internal key stays "downrig" (legacy from older briefs); user-facing
  // label is "Load Out" everywhere in the UI.
  downrig: "Load Out",
};
const PHASE_ORDER: BriefSchedulePhaseKey[] = [
  "setup",
  "rehearsal",
  "show",
  "downrig",
];

function formatRange(from: string, to: string): string {
  if (from && to && from !== to) {
    return `${formatDate(from)} → ${formatDate(to)}`;
  }
  return formatDate(from || to);
}

function formatTimeRange(fromTime?: string, toTime?: string): string {
  if (!fromTime && !toTime) return "";
  if (fromTime && toTime) return `${fromTime} → ${toTime}`;
  return fromTime || toTime || "";
}

function formatDate(iso: string): string {
  if (!iso) return "—";
  // Parse YYYY-MM-DD as a *local* calendar date, not UTC, so we never
  // shift by a day in negative-offset timezones. Falls back to the
  // native parser only if the string isn't a plain calendar date.
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  const d = m
    ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
    : new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function formatNok(n: number): string {
  if (!isFinite(n)) return "kr 0";
  return new Intl.NumberFormat("nb-NO", {
    style: "currency",
    currency: "NOK",
    maximumFractionDigits: 0,
  }).format(Math.round(n));
}

function formatNumber(n: number, digits = 0): string {
  return new Intl.NumberFormat("en-GB", {
    maximumFractionDigits: digits,
    minimumFractionDigits: 0,
  }).format(n);
}

function watts(w: number): string {
  if (w >= 1000) return `${(w / 1000).toFixed(w >= 10000 ? 0 : 1)} kW`;
  return `${Math.round(w)} W`;
}

export function BriefDetail({
  theme,
  briefId,
  data,
  setData,
}: {
  theme: ThemeMode;
  briefId: string;
  data: PortalData;
  setData: React.Dispatch<React.SetStateAction<PortalData>>;
}) {
  const c = PALETTE[theme];
  const { getToken } = useAuth();
  const [, setLocation] = useLocation();
  const entry = findBrief(data, briefId);

  /** Best-effort POST to `/api/portal/briefs/:id/respond` so the
   *  producer's Crew Report can show the freelancer's decision live
   *  via its polling loop. Fire-and-forget: legacy share-link briefs
   *  that don't exist on the server return 404 and are silently
   *  ignored. The local state is the source of truth for the user's
   *  view; this call only syncs the producer side. */
  const syncDecisionToServer = (
    decision: "accepted" | "declined" | "pending",
    extras?: { acceptedSnapshot?: unknown; acceptedGigId?: string | null },
  ) => {
    void (async () => {
      try {
        const token = await getToken();
        const baseUrl =
          (typeof import.meta !== "undefined" &&
            (import.meta as { env?: { BASE_URL?: string } }).env?.BASE_URL) ||
          "/";
        await fetch(`${baseUrl}api/portal/briefs/${briefId}/respond`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            decision,
            acceptedSnapshot: extras?.acceptedSnapshot ?? null,
            acceptedGigId: extras?.acceptedGigId ?? null,
          }),
        });
      } catch {
        /* ignore — producer-side polling will retry on the next fetch */
      }
    })();
  };

  // Hooks must be called unconditionally — compute the assignment from a
  // possibly-null entry and short-circuit in the JSX below.
  const myAssignment = useMemo(() => {
    if (!entry) return null;
    return (
      entry.brief.assignments.find(
        (a) => a.crewId === entry.brief.recipientCrewId,
      ) ?? null
    );
  }, [entry]);

  if (!entry) {
    return (
      <section
        style={{
          background: c.cardBg,
          border: `1px solid ${c.border}`,
          borderRadius: 14,
          padding: 24,
          boxShadow: c.shadowSoft,
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>
          Brief not found
        </div>
        <div style={{ fontSize: 14, color: c.muted, marginBottom: 16 }}>
          This briefing isn't in your portal. The share link may have expired
          or been imported in a different account.
        </div>
        <Link
          href="/portal/briefs"
          style={{
            display: "inline-block",
            padding: "10px 16px",
            fontSize: 14,
            fontWeight: 700,
            background: c.accent,
            color: "#0b0b0b",
            borderRadius: 8,
            textDecoration: "none",
          }}
        >
          Back to briefs
        </Link>
      </section>
    );
  }

  const brief = entry.brief;

  // Conflict + diff state — recomputed whenever the brief or surrounding
  // portal data changes. Both are cheap pure functions.
  const conflicts = useMemo<ScheduleConflict[]>(
    () => findScheduleConflicts(brief, data, entry.acceptedGigId),
    [brief, data, entry.acceptedGigId],
  );
  const diffs = useMemo<DiffEntry[]>(() => {
    if (!entry.acceptedSnapshot) return [];
    if (entry.acceptedSnapshot.generatedAt >= brief.generatedAt) return [];
    return diffBriefAgainstSnapshot(entry.acceptedSnapshot, brief);
  }, [entry.acceptedSnapshot, brief]);

  function accept() {
    const snapshot = buildAcceptedSnapshot(brief);
    let gigIdForServer: string | null = null;
    setData((prev) => {
      // Don't double-create a Gig if the brief is re-accepted.
      const existing = prev.briefs.find((b) => b.briefId === briefId);
      if (existing?.acceptedGigId) {
        gigIdForServer = existing.acceptedGigId;
        return updateBrief(prev, briefId, {
          decision: "accepted",
          acceptedSnapshot: snapshot,
        });
      }
      const gig = gigFromBrief(brief);
      gigIdForServer = gig.id;
      const next = updateBrief(prev, briefId, {
        decision: "accepted",
        acceptedGigId: gig.id,
        acceptedSnapshot: snapshot,
      });
      return { ...next, gigs: [gig, ...next.gigs] };
    });
    syncDecisionToServer("accepted", {
      acceptedSnapshot: snapshot,
      acceptedGigId: gigIdForServer,
    });
  }

  function acknowledgeChanges() {
    const snapshot = buildAcceptedSnapshot(brief);
    setData((prev) =>
      updateBrief(prev, briefId, { acceptedSnapshot: snapshot }),
    );
    // Acknowledging a change is still an "accepted" decision on the
    // server — the snapshot diff is producer-irrelevant; what they
    // care about is "they're still in".
    syncDecisionToServer("accepted", { acceptedSnapshot: snapshot });
  }

  function decline() {
    setData((prev) => updateBrief(prev, briefId, { decision: "declined" }));
    syncDecisionToServer("declined");
  }

  function resetDecision() {
    setData((prev) => updateBrief(prev, briefId, { decision: "pending" }));
    syncDecisionToServer("pending");
  }

  function downloadCalendar() {
    downloadBriefIcs(brief);
  }

  function openCallSheetWindow() {
    const result = openCallSheet(brief);
    if (!result.ok) {
      alert(
        "Call Sheet couldn't open — please allow pop-ups for this site and try again.",
      );
    }
  }

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div style={{ fontSize: 13 }}>
        <Link
          href="/portal/briefs"
          style={{ color: c.muted, textDecoration: "none", fontWeight: 600 }}
        >
          ← All briefs
        </Link>
      </div>

      {/* Project hero */}
      <section
        style={{
          background: c.cardBg,
          border: `1px solid ${c.border}`,
          borderRadius: 14,
          padding: "20px 20px 16px",
          boxShadow: c.shadowSoft,
        }}
      >
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: c.accent,
            letterSpacing: 1,
            textTransform: "uppercase",
          }}
        >
          Project briefing
        </div>
        <h1
          style={{
            margin: "4px 0 6px",
            fontSize: 26,
            fontWeight: 800,
            lineHeight: 1.15,
          }}
        >
          {brief.project.venue || "Untitled show"}
        </h1>
        {brief.project.client ? (
          <div
            style={{
              color: c.text,
              fontSize: 14,
              fontWeight: 700,
              marginTop: 2,
            }}
          >
            for{" "}
            <span style={{ color: c.text, fontWeight: 800 }}>
              {brief.project.client}
            </span>
          </div>
        ) : null}
        <div style={{ color: c.muted, fontSize: 14 }}>
          {brief.project.endDate &&
          brief.project.endDate !== brief.project.date
            ? `${formatDate(brief.project.date)} → ${formatDate(brief.project.endDate)}`
            : formatDate(brief.project.date)}
          {brief.project.preparedBy ? (
            <>
              {" · project manager "}
              <span style={{ color: c.text, fontWeight: 600 }}>
                {brief.project.preparedBy}
              </span>
            </>
          ) : null}
        </div>
      </section>

      {/* "What changed since you accepted" banner — only when there is a
          newer producer revision than the snapshot we kept locally. */}
      {diffs.length > 0 ? (
        <UpdateBanner
          theme={theme}
          diffs={diffs}
          onAcknowledge={acknowledgeChanges}
        />
      ) : null}

      {/* One-tap calendar + call-sheet exports. Always available — even
          before the freelancer accepts — because reviewing dates and
          printing the call sheet is part of the decision process. */}
      <BriefActionRow
        theme={theme}
        onAddToCalendar={downloadCalendar}
        onOpenCallSheet={openCallSheetWindow}
      />

      {/* Your assignment */}
      {myAssignment ? (
        <AssignmentCard
          theme={theme}
          assignment={myAssignment}
          decision={entry.decision}
          acceptedGigId={entry.acceptedGigId}
          conflicts={conflicts}
          onAccept={accept}
          onDecline={decline}
          onReset={resetDecision}
          onOpenGig={() => setLocation("/portal/gigs")}
        />
      ) : (
        <GenericNoticeCard
          theme={theme}
          decision={entry.decision}
          acceptedGigId={entry.acceptedGigId}
          conflicts={conflicts}
          onAccept={accept}
          onDecline={decline}
          onReset={resetDecision}
          onOpenGig={() => setLocation("/portal/gigs")}
        />
      )}

      {/* Production schedule (only shown when at least one phase is set) */}
      {brief.project.schedule ? (
        <SectionCard theme={theme} title="Production schedule">
          <ScheduleList theme={theme} schedule={brief.project.schedule} />
        </SectionCard>
      ) : null}

      {/* Project context */}
      <SectionCard theme={theme} title="Crew on the call sheet">
        <CrewTable
          theme={theme}
          assignments={brief.assignments}
          myCrewId={brief.recipientCrewId}
        />
      </SectionCard>

      <SectionCard theme={theme} title="Rigging">
        <KvGrid
          theme={theme}
          items={[
            { k: "Systems", v: `${brief.rigging.systemCount}` },
            { k: "Hoist points", v: `${brief.rigging.hoistCount}` },
            {
              k: "Total motor power",
              v:
                brief.rigging.totalMotorW > 0
                  ? watts(brief.rigging.totalMotorW)
                  : "—",
            },
          ]}
        />
        {brief.rigging.systems.length > 0 ? (
          <ul
            style={{
              margin: "12px 0 0",
              padding: 0,
              listStyle: "none",
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            {brief.rigging.systems.map((s) => (
              <li
                key={s.id}
                style={{
                  padding: "10px 12px",
                  background: c.cardBgSubtle,
                  borderRadius: 10,
                  border: `1px solid ${c.border}`,
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 12,
                  fontSize: 13,
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 700 }}>{s.name}</div>
                  <div style={{ color: c.muted, fontSize: 12, marginTop: 2 }}>
                    {s.hoist} · DF {s.dynamicFactor}
                  </div>
                </div>
                <div style={{ color: c.muted, fontSize: 12, textAlign: "right" }}>
                  <div>{s.pointCount} pts · {s.riggingRowCount} rig</div>
                  <div>
                    {s.fixtureRowCount} fx · {s.ledRowCount} LED
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : null}
      </SectionCard>

      <SectionCard theme={theme} title="Lighting">
        <KvGrid
          theme={theme}
          items={[
            { k: "Fixtures", v: `${brief.lighting.fixtureCount}` },
            {
              k: "Total fixture power",
              v: brief.lighting.totalFixtureWatts > 0
                ? watts(brief.lighting.totalFixtureWatts)
                : "—",
            },
            {
              k: "DMX universes",
              v: brief.lighting.universes.length
                ? brief.lighting.universes.join(", ")
                : "—",
            },
            { k: "Power distros", v: `${brief.lighting.distroCount}` },
            {
              k: "Total distro load",
              v: brief.lighting.totalDistroW > 0
                ? watts(brief.lighting.totalDistroW)
                : "—",
            },
            {
              k: "Worst feeder",
              v: brief.lighting.worstDistroFeederPct > 0
                ? `${Math.round(brief.lighting.worstDistroFeederPct * 100)}%`
                : "—",
            },
            ...(brief.lighting.circuitCount > 0
              ? [
                  {
                    k: "Legacy circuits",
                    v: `${brief.lighting.circuitCount}`,
                  },
                  {
                    k: "Worst legacy phase",
                    v: brief.lighting.worstCircuitPct > 0
                      ? `${Math.round(brief.lighting.worstCircuitPct * 100)}%`
                      : "—",
                  },
                ]
              : []),
          ]}
        />
        {brief.lighting.distros.length > 0 ? (
          <ul
            style={{
              margin: "12px 0 0",
              padding: 0,
              listStyle: "none",
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            {brief.lighting.distros.map((d) => {
              const flagged = d.feederOverload || d.channelOverload;
              const warn = !flagged && (d.imbalanceWarn || d.feederUtilization > 0.8);
              const accent = flagged
                ? "#dc2626"
                : warn
                  ? "#f59e0b"
                  : c.border;
              return (
                <li
                  key={d.id}
                  style={{
                    padding: "10px 12px",
                    background: c.cardBgSubtle,
                    borderRadius: 10,
                    border: `1px solid ${accent}`,
                    fontSize: 13,
                    display: "flex",
                    flexWrap: "wrap",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    gap: 12,
                  }}
                >
                  <div style={{ minWidth: 0, flex: "1 1 200px" }}>
                    <div style={{ fontWeight: 600 }}>
                      {d.name}
                      {d.source ? (
                        <span style={{ color: c.muted, fontWeight: 400 }}>
                          {" — "}
                          {d.source}
                        </span>
                      ) : null}
                    </div>
                    <div style={{ color: c.muted, fontSize: 12 }}>
                      {d.presetLabel}
                    </div>
                    {d.feedsTrusses.length > 0 ? (
                      <div style={{ color: c.muted, fontSize: 12, marginTop: 2 }}>
                        Feeds: {d.feedsTrusses.join(", ")}
                      </div>
                    ) : null}
                  </div>
                  <div
                    style={{
                      textAlign: "right",
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    <div>
                      {watts(d.totalWatts)} ·{" "}
                      {d.worstLegAmps.toLocaleString("en-US", {
                        maximumFractionDigits: 1,
                      })}{" "}
                      A / {d.feedAmps} A
                    </div>
                    <div style={{ color: c.muted, fontSize: 12 }}>
                      Feeder {Math.round(d.feederUtilization * 100)}%
                      {d.feedPhases === 3
                        ? ` · imbalance ${Math.round(d.imbalance * 100)}%`
                        : ""}
                    </div>
                    {flagged ? (
                      <div style={{ color: "#dc2626", fontSize: 12, fontWeight: 600 }}>
                        {d.feederOverload ? "Feeder over capacity" : "Channel over capacity"}
                      </div>
                    ) : warn ? (
                      <div style={{ color: "#b45309", fontSize: 12, fontWeight: 600 }}>
                        {d.imbalanceWarn && d.feederUtilization <= 0.8
                          ? "Phase imbalance > 20%"
                          : "Above 80% derate"}
                      </div>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        ) : null}
      </SectionCard>

      <SectionCard theme={theme} title="LED screens">
        {brief.led.screens.length === 0 ? (
          <Empty theme={theme} text="No LED screens on this project." />
        ) : (
          <>
            <KvGrid
              theme={theme}
              items={[
                { k: "Screens", v: `${brief.led.screenCount}` },
                { k: "Total panels", v: `${brief.led.totalPanels}` },
                {
                  k: "Processor",
                  v: brief.led.processor || "—",
                },
              ]}
            />
            <ul
              style={{
                margin: "12px 0 0",
                padding: 0,
                listStyle: "none",
                display: "flex",
                flexDirection: "column",
                gap: 8,
              }}
            >
              {brief.led.screens.map((s) => (
                <li
                  key={s.id}
                  style={{
                    padding: "10px 12px",
                    background: c.cardBgSubtle,
                    borderRadius: 10,
                    border: `1px solid ${c.border}`,
                    fontSize: 13,
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 12,
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 700 }}>{s.name}</div>
                    <div style={{ color: c.muted, fontSize: 12, marginTop: 2 }}>
                      {s.panelType || "Panel"} · {s.cols} × {s.rows} ({s.totalPanels} panels)
                      {s.shape ? ` · ${s.shape}` : ""}
                      {s.disabledPanels && s.disabledPanels > 0
                        ? ` · −${s.disabledPanels} off`
                        : ""}
                    </div>
                    {(s.signalCables ?? 0) > 0 ||
                    (s.powerCables ?? 0) > 0 ? (
                      <div style={{ color: c.muted, fontSize: 12, marginTop: 2 }}>
                        Cables:{" "}
                        {(s.signalCables ?? 0)}× signal (
                        {formatNumber(s.signalLengthM ?? 0, 2)} m){" · "}
                        {(s.powerCables ?? 0)}× TrueOne (
                        {formatNumber(s.powerLengthM ?? 0, 2)} m)
                      </div>
                    ) : null}
                    {s.brackets && s.brackets.length > 0 ? (
                      <div style={{ color: c.muted, fontSize: 12, marginTop: 2 }}>
                        Brackets:{" "}
                        {s.brackets
                          .map((b) => `${b.name} × ${b.count}`)
                          .join(", ")}
                      </div>
                    ) : null}
                    {s.processors && s.processors.length > 0 ? (
                      <div style={{ color: c.muted, fontSize: 12, marginTop: 2 }}>
                        Processors: {s.processors.join(" + ")}
                        {s.processorOutputs ? (
                          <>
                            {" — "}
                            {s.processorOutputs} outputs ·{" "}
                            {formatNumber(s.processorMaxPixels ?? 0)} px cap
                            {s.processorPixels ? (
                              <> vs {formatNumber(s.processorPixels)} px needed</>
                            ) : null}
                            {/* Producer-precomputed flag — combines the
                                pixel-cap test AND the per-output cap
                                test (see App.tsx). Falls back to the
                                pixels-only test for older briefs that
                                don't carry the flag yet. */}
                            {(s.processorUnderCapacity ??
                              (!!s.processorPixels &&
                                !!s.processorMaxPixels &&
                                s.processorPixels > s.processorMaxPixels)) ? (
                              <span
                                style={{
                                  marginLeft: 6,
                                  color: "#dc2626",
                                  fontWeight: 700,
                                }}
                              >
                                Under capacity
                              </span>
                            ) : null}
                          </>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                  {s.estimatedWatts > 0 ? (
                    <div
                      style={{
                        color: c.muted,
                        fontSize: 12,
                        textAlign: "right",
                      }}
                    >
                      ~{watts(s.estimatedWatts)}
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          </>
        )}
      </SectionCard>

      <SectionCard theme={theme} title="Stage">
        {brief.stage.stages.length === 0 ? (
          <Empty theme={theme} text="No stage on this project." />
        ) : (
          <>
            <KvGrid
              theme={theme}
              items={[
                { k: "Stages", v: `${brief.stage.stageCount}` },
                { k: "Total area", v: `${formatNumber(brief.stage.totalArea, 1)} m²` },
                {
                  k: "Total load capacity",
                  v: `${formatNumber(brief.stage.totalLoadCapacityKg)} kg`,
                },
              ]}
            />
            <ul
              style={{
                margin: "12px 0 0",
                padding: 0,
                listStyle: "none",
                display: "flex",
                flexDirection: "column",
                gap: 8,
              }}
            >
              {brief.stage.stages.map((s) => (
                <li
                  key={s.id}
                  style={{
                    padding: "10px 12px",
                    background: c.cardBgSubtle,
                    borderRadius: 10,
                    border: `1px solid ${c.border}`,
                    fontSize: 13,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 12,
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 700 }}>{s.name}</div>
                      <div style={{ color: c.muted, fontSize: 12, marginTop: 2 }}>
                        {s.width} × {s.depth} m at {s.legHeightCm} cm legs
                      </div>
                    </div>
                    <div style={{ color: c.muted, fontSize: 12, textAlign: "right" }}>
                      {formatNumber(s.area, 1)} m² · {formatNumber(s.loadCapacityKg)} kg
                    </div>
                  </div>
                  {s.bracingNotes.length > 0 ? (
                    <ul
                      style={{
                        margin: "8px 0 0 18px",
                        padding: 0,
                        color: c.danger,
                        fontSize: 12,
                      }}
                    >
                      {s.bracingNotes.map((n, i) => (
                        <li key={i}>{n}</li>
                      ))}
                    </ul>
                  ) : null}
                </li>
              ))}
            </ul>
          </>
        )}
      </SectionCard>

      <SectionCard theme={theme} title="Sound">
        {brief.sound.rowCount === 0 ? (
          <Empty theme={theme} text="No sound inventory on this project." />
        ) : (
          <>
            <KvGrid
              theme={theme}
              items={[
                { k: "Inventory rows", v: `${brief.sound.rowCount}` },
                { k: "Total pieces", v: `${brief.sound.totalQty}` },
                {
                  k: "Total weight",
                  v: `${formatNumber(brief.sound.totalWeight, 1)} kg`,
                },
                {
                  k: "Total power",
                  v: brief.sound.totalPower > 0 ? watts(brief.sound.totalPower) : "—",
                },
              ]}
            />
            {brief.sound.byCategory.length > 0 ? (
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  marginTop: 12,
                  fontSize: 13,
                }}
              >
                <thead>
                  <tr style={{ color: c.muted, textAlign: "left" }}>
                    <th style={{ padding: "6px 4px", fontWeight: 600 }}>Category</th>
                    <th style={{ padding: "6px 4px", fontWeight: 600, textAlign: "right" }}>Rows</th>
                    <th style={{ padding: "6px 4px", fontWeight: 600, textAlign: "right" }}>Weight</th>
                    <th style={{ padding: "6px 4px", fontWeight: 600, textAlign: "right" }}>Power</th>
                  </tr>
                </thead>
                <tbody>
                  {brief.sound.byCategory.map((cat) => (
                    <tr key={cat.category} style={{ borderTop: `1px solid ${c.border}` }}>
                      <td style={{ padding: "8px 4px" }}>{cat.category}</td>
                      <td style={{ padding: "8px 4px", textAlign: "right" }}>{cat.count}</td>
                      <td style={{ padding: "8px 4px", textAlign: "right" }}>
                        {formatNumber(cat.totalWeight, 1)} kg
                      </td>
                      <td style={{ padding: "8px 4px", textAlign: "right" }}>
                        {cat.totalPower > 0 ? watts(cat.totalPower) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : null}
          </>
        )}
      </SectionCard>

      {brief.riggPlan ? (
        <SectionCard theme={theme} title="Rigg plan (top-down)">
          <RiggPlanMap theme={theme} plan={brief.riggPlan} />
        </SectionCard>
      ) : null}

      {brief.attachments.length > 0 ? (
        <SectionCard theme={theme} title="Drawings & attachments">
          <AttachmentsList theme={theme} attachments={brief.attachments} />
        </SectionCard>
      ) : null}
    </div>
  );
}

/** Render the per-brief attachment list. Each row is a download anchor
 *  pointing at the api-server's `/api/storage/objects/...` route, which
 *  streams the bytes back from object storage. The anchor uses the
 *  `download` attribute so the browser saves the file with the original
 *  filename instead of opening it inline. */
function AttachmentsList({
  theme,
  attachments,
}: {
  theme: ThemeMode;
  attachments: BriefAttachment[];
}) {
  const c = PALETTE[theme];
  return (
    <ul
      style={{
        listStyle: "none",
        margin: 0,
        padding: 0,
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
    >
      {attachments.map((a) => (
        <li
          key={a.id}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            padding: "10px 12px",
            background: c.cardBg,
            border: `1px solid ${c.border}`,
            borderRadius: 10,
          }}
        >
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                fontSize: 14,
                fontWeight: 700,
                color: c.text,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {a.name}
            </div>
            <div style={{ fontSize: 12, color: c.muted, marginTop: 2 }}>
              {describeAttachment(a)}
            </div>
          </div>
          <a
            href={attachmentDownloadUrl(a)}
            target="_blank"
            rel="noreferrer"
            download={a.name}
            style={{
              fontSize: 12,
              fontWeight: 700,
              padding: "8px 14px",
              border: "1px solid #f88000",
              borderRadius: 8,
              background: "#f88000",
              color: "#0b0b0b",
              textDecoration: "none",
              flexShrink: 0,
            }}
          >
            Download
          </a>
        </li>
      ))}
    </ul>
  );
}

/** Build the secondary line for an attachment row, e.g. "PDF · 1.4 MB". */
function describeAttachment(a: BriefAttachment): string {
  const parts: string[] = [];
  const subtype = a.contentType.split("/")[1] || a.contentType;
  parts.push(subtype.toUpperCase());
  if (a.sizeBytes > 0) parts.push(formatBytes(a.sizeBytes));
  return parts.join(" · ");
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

/* ---------------------------------------------------------------- pieces */

function AssignmentCard({
  theme,
  assignment,
  decision,
  acceptedGigId,
  conflicts,
  onAccept,
  onDecline,
  onReset,
  onOpenGig,
}: {
  theme: ThemeMode;
  assignment: BriefAssignment;
  decision: "pending" | "accepted" | "declined";
  acceptedGigId?: string;
  conflicts: ScheduleConflict[];
  onAccept: () => void;
  onDecline: () => void;
  onReset: () => void;
  onOpenGig: () => void;
}) {
  const c = PALETTE[theme];
  const fee = assignment.dayRate;
  return (
    <section
      style={{
        background: c.cardBg,
        border: `2px solid ${c.accent}`,
        borderRadius: 14,
        padding: 18,
        boxShadow: c.shadowSoft,
      }}
    >
      <div
        style={{
          fontSize: 11,
          fontWeight: 700,
          color: c.accent,
          letterSpacing: 1,
          textTransform: "uppercase",
        }}
      >
        Your assignment
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
          gap: 16,
          marginTop: 12,
        }}
      >
        <Field theme={theme} label="Role" value={assignment.role} strong />
        <Field
          theme={theme}
          label="Call time"
          value={assignment.callTime || "—"}
        />
        <Field
          theme={theme}
          label="Off time"
          value={assignment.offTime || "—"}
        />
        <Field
          theme={theme}
          label="Hours"
          value={assignment.hours > 0 ? `${formatNumber(assignment.hours, 1)} h` : "—"}
        />
        <Field
          theme={theme}
          label="Day rate"
          value={fee > 0 ? formatNok(fee) : "—"}
          strong
        />
      </div>
      {assignment.notes ? (
        <div
          style={{
            marginTop: 12,
            padding: "10px 12px",
            background: c.cardBgSubtle,
            borderRadius: 10,
            fontSize: 13,
            color: c.text,
            lineHeight: 1.5,
          }}
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: c.muted,
              textTransform: "uppercase",
              letterSpacing: 0.6,
              marginBottom: 4,
            }}
          >
            Notes from production
          </div>
          {assignment.notes}
        </div>
      ) : null}

      {decision === "pending" && conflicts.length > 0 ? (
        <ConflictWarning theme={theme} conflicts={conflicts} />
      ) : null}

      <div
        style={{
          marginTop: 16,
          display: "flex",
          gap: 8,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        {decision === "pending" ? (
          <>
            <button
              type="button"
              onClick={onAccept}
              style={{
                padding: "10px 18px",
                fontSize: 14,
                fontWeight: 800,
                background: c.accent,
                color: "#0b0b0b",
                border: "none",
                borderRadius: 8,
                cursor: "pointer",
              }}
            >
              {conflicts.length > 0 ? "Accept anyway" : "Accept gig"}
            </button>
            <button
              type="button"
              onClick={onDecline}
              style={{
                padding: "10px 16px",
                fontSize: 14,
                fontWeight: 600,
                background: "transparent",
                color: c.text,
                border: `1px solid ${c.border}`,
                borderRadius: 8,
                cursor: "pointer",
              }}
            >
              Decline
            </button>
          </>
        ) : decision === "accepted" ? (
          <>
            <span
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: c.success,
              }}
            >
              ✓ Accepted — added to your logbook as a confirmed gig
            </span>
            {acceptedGigId ? (
              <button
                type="button"
                onClick={onOpenGig}
                style={{
                  padding: "8px 14px",
                  fontSize: 13,
                  fontWeight: 700,
                  background: c.accent,
                  color: "#0b0b0b",
                  border: "none",
                  borderRadius: 8,
                  cursor: "pointer",
                }}
              >
                Open in logbook
              </button>
            ) : null}
            <button
              type="button"
              onClick={onReset}
              style={{
                padding: "8px 12px",
                fontSize: 12,
                fontWeight: 600,
                background: "transparent",
                color: c.muted,
                border: `1px solid ${c.border}`,
                borderRadius: 8,
                cursor: "pointer",
              }}
            >
              Undo
            </button>
          </>
        ) : (
          <>
            <span style={{ fontSize: 13, fontWeight: 700, color: c.muted }}>
              Declined — let your producer know.
            </span>
            <button
              type="button"
              onClick={onReset}
              style={{
                padding: "8px 12px",
                fontSize: 12,
                fontWeight: 600,
                background: "transparent",
                color: c.muted,
                border: `1px solid ${c.border}`,
                borderRadius: 8,
                cursor: "pointer",
              }}
            >
              Undo
            </button>
          </>
        )}
      </div>
    </section>
  );
}

function GenericNoticeCard({
  theme,
  decision,
  acceptedGigId,
  conflicts,
  onAccept,
  onDecline,
  onReset,
  onOpenGig,
}: {
  theme: ThemeMode;
  decision: "pending" | "accepted" | "declined";
  acceptedGigId?: string;
  conflicts: ScheduleConflict[];
  onAccept: () => void;
  onDecline: () => void;
  onReset: () => void;
  onOpenGig: () => void;
}) {
  const c = PALETTE[theme];
  return (
    <section
      style={{
        background: c.cardBgSubtle,
        border: `1px dashed ${c.border}`,
        borderRadius: 14,
        padding: 16,
      }}
    >
      <div style={{ fontSize: 14, color: c.muted, lineHeight: 1.5 }}>
        This is a generic briefing — your producer didn't pre-fill an
        assignment for you. You can still accept it as a gig (it'll use the
        first crew row as a placeholder), or scroll down for the full project
        context.
      </div>
      {decision === "pending" && conflicts.length > 0 ? (
        <ConflictWarning theme={theme} conflicts={conflicts} />
      ) : null}
      <div
        style={{
          marginTop: 12,
          display: "flex",
          gap: 8,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        {decision === "pending" ? (
          <>
            <button
              type="button"
              onClick={onAccept}
              style={{
                padding: "9px 16px",
                fontSize: 13,
                fontWeight: 700,
                background: c.accent,
                color: "#0b0b0b",
                border: "none",
                borderRadius: 8,
                cursor: "pointer",
              }}
            >
              {conflicts.length > 0 ? "Add anyway" : "Add to logbook"}
            </button>
            <button
              type="button"
              onClick={onDecline}
              style={{
                padding: "9px 16px",
                fontSize: 13,
                fontWeight: 600,
                background: "transparent",
                color: c.text,
                border: `1px solid ${c.border}`,
                borderRadius: 8,
                cursor: "pointer",
              }}
            >
              Dismiss
            </button>
          </>
        ) : decision === "accepted" ? (
          <>
            <span style={{ fontSize: 13, fontWeight: 700, color: c.success }}>
              ✓ Added to logbook
            </span>
            {acceptedGigId ? (
              <button
                type="button"
                onClick={onOpenGig}
                style={{
                  padding: "8px 14px",
                  fontSize: 13,
                  fontWeight: 700,
                  background: c.accent,
                  color: "#0b0b0b",
                  border: "none",
                  borderRadius: 8,
                  cursor: "pointer",
                }}
              >
                Open in logbook
              </button>
            ) : null}
            <button
              type="button"
              onClick={onReset}
              style={{
                padding: "8px 12px",
                fontSize: 12,
                fontWeight: 600,
                background: "transparent",
                color: c.muted,
                border: `1px solid ${c.border}`,
                borderRadius: 8,
                cursor: "pointer",
              }}
            >
              Undo
            </button>
          </>
        ) : (
          <>
            <span style={{ fontSize: 13, fontWeight: 700, color: c.muted }}>
              Dismissed
            </span>
            <button
              type="button"
              onClick={onReset}
              style={{
                padding: "8px 12px",
                fontSize: 12,
                fontWeight: 600,
                background: "transparent",
                color: c.muted,
                border: `1px solid ${c.border}`,
                borderRadius: 8,
                cursor: "pointer",
              }}
            >
              Undo
            </button>
          </>
        )}
      </div>
    </section>
  );
}

function CrewTable({
  theme,
  assignments,
  myCrewId,
}: {
  theme: ThemeMode;
  assignments: BriefAssignment[];
  myCrewId: string | null;
}) {
  const c = PALETTE[theme];
  if (assignments.length === 0) {
    return <Empty theme={theme} text="No crew on this call sheet." />;
  }
  return (
    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
      <thead>
        <tr style={{ color: c.muted, textAlign: "left" }}>
          <th style={{ padding: "6px 4px", fontWeight: 600 }}>Name</th>
          <th style={{ padding: "6px 4px", fontWeight: 600 }}>Role</th>
          <th
            style={{
              padding: "6px 4px",
              fontWeight: 600,
              textAlign: "right",
            }}
          >
            Call → Off
          </th>
        </tr>
      </thead>
      <tbody>
        {assignments.map((a) => {
          const me = a.crewId === myCrewId;
          return (
            <tr
              key={a.crewId}
              style={{
                borderTop: `1px solid ${c.border}`,
                background: me ? "rgba(248,128,0,0.08)" : "transparent",
              }}
            >
              <td style={{ padding: "8px 4px", fontWeight: me ? 800 : 600 }}>
                {a.name || "(unnamed)"}
                {me ? (
                  <span
                    style={{
                      marginLeft: 6,
                      fontSize: 10,
                      fontWeight: 800,
                      color: c.accent,
                    }}
                  >
                    YOU
                  </span>
                ) : null}
              </td>
              <td style={{ padding: "8px 4px" }}>{a.role}</td>
              <td style={{ padding: "8px 4px", textAlign: "right", color: c.muted }}>
                {a.callTime || "—"} → {a.offTime || "—"}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function RiggPlanMap({
  theme,
  plan,
}: {
  theme: ThemeMode;
  plan: BriefRiggPlan;
}) {
  const c = PALETTE[theme];
  // SVG viewport sized to keep ~1m = up to 24px, capped at 720px wide.
  const padding = 0.5;
  const venueW = plan.venue.widthM;
  const venueD = plan.venue.depthM;
  const maxPx = 720;
  const scale = Math.min(maxPx / Math.max(venueW + padding * 2, 0.5), 24);
  const svgW = (venueW + padding * 2) * scale;
  const svgH = (venueD + padding * 2) * scale;
  return (
    <div>
      <KvGrid
        theme={theme}
        items={[
          { k: "Venue", v: `${venueW} × ${venueD} m` },
          { k: "Ceiling", v: `${plan.venue.ceilingM} m` },
          { k: "Trusses", v: `${plan.trusses.length}` },
        ]}
      />
      <div
        style={{
          marginTop: 12,
          padding: 8,
          background: c.cardBgSubtle,
          borderRadius: 10,
          border: `1px solid ${c.border}`,
          overflowX: "auto",
        }}
      >
        <svg
          width={svgW}
          height={svgH}
          viewBox={`0 0 ${svgW} ${svgH}`}
          role="img"
          aria-label="Top-down rigg plan"
          style={{ display: "block", maxWidth: "100%", height: "auto" }}
        >
          {/* venue rectangle */}
          <rect
            x={padding * scale}
            y={padding * scale}
            width={venueW * scale}
            height={venueD * scale}
            fill={theme === "dark" ? "#0b1424" : "#ffffff"}
            stroke={c.border}
            strokeWidth={1}
          />
          {/* downstage label */}
          <text
            x={(padding + venueW / 2) * scale}
            y={padding * scale - 4}
            textAnchor="middle"
            fontSize={10}
            fill={c.muted}
          >
            audience ↓
          </text>
          {/* trusses */}
          {plan.trusses.map((t) => {
            const x1 = (padding + t.x1) * scale;
            const y1 = (padding + t.y1) * scale;
            const x2 = (padding + t.x2) * scale;
            const y2 = (padding + t.y2) * scale;
            const cx = (padding + t.x) * scale;
            const cy = (padding + t.y) * scale;
            return (
              <g key={t.systemId}>
                <line
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke={c.accent}
                  strokeWidth={4}
                  strokeLinecap="round"
                />
                <circle cx={cx} cy={cy} r={3} fill={c.accent} />
                <text
                  x={cx + 6}
                  y={cy - 6}
                  fontSize={10}
                  fill={c.text}
                  fontWeight={700}
                >
                  {t.systemName}
                </text>
                <text x={cx + 6} y={cy + 6} fontSize={9} fill={c.muted}>
                  z {t.z} m · {t.lengthM} m
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

function ScheduleList({
  theme,
  schedule,
}: {
  theme: ThemeMode;
  schedule: BriefSchedule;
}) {
  const c = PALETTE[theme];
  const blocks = PHASE_ORDER.flatMap((key) => {
    const segs = schedule[key];
    if (!segs || segs.length === 0) return [];
    return [{ key, label: PHASE_LABELS[key], segments: segs }];
  });
  if (blocks.length === 0) return null;
  return (
    <div style={{ display: "grid", gap: 8 }}>
      {blocks.map((block) => {
        const multi = block.segments.length > 1;
        return (
          <div
            key={block.key}
            style={{
              display: "grid",
              gridTemplateColumns: "100px 1fr",
              alignItems: "start",
              gap: 12,
              padding: "8px 10px",
              border: `1px solid ${c.border}`,
              borderRadius: 8,
            }}
          >
            <span
              style={{
                fontSize: 11,
                fontWeight: 800,
                textTransform: "uppercase",
                letterSpacing: 0.5,
                color: c.muted,
                paddingTop: 2,
              }}
            >
              {block.label}
            </span>
            <div style={{ display: "grid", gap: 4 }}>
              {block.segments.map((seg, idx) => {
                const timeRange = formatTimeRange(seg.fromTime, seg.toTime);
                const dateRange =
                  seg.from || seg.to ? formatRange(seg.from, seg.to) : "";
                return (
                  <div
                    key={idx}
                    style={{
                      display: "flex",
                      alignItems: "baseline",
                      gap: 8,
                      flexWrap: "wrap",
                    }}
                  >
                    {multi ? (
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 800,
                          textTransform: "uppercase",
                          letterSpacing: 0.4,
                          color: c.muted,
                          opacity: 0.85,
                          minWidth: 44,
                        }}
                      >
                        Day {idx + 1}
                      </span>
                    ) : null}
                    <span
                      style={{ color: c.text, fontSize: 14, fontWeight: 600 }}
                    >
                      {dateRange || "—"}
                      {timeRange ? (
                        <span
                          style={{
                            marginLeft: 10,
                            fontSize: 13,
                            fontWeight: 600,
                            color: c.muted,
                          }}
                        >
                          {timeRange}
                        </span>
                      ) : null}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function UpdateBanner({
  theme,
  diffs,
  onAcknowledge,
}: {
  theme: ThemeMode;
  diffs: DiffEntry[];
  onAcknowledge: () => void;
}) {
  const c = PALETTE[theme];
  const visible = diffs.slice(0, 6);
  const extra = diffs.length - visible.length;
  return (
    <section
      role="alert"
      style={{
        background: "rgba(248,128,0,0.08)",
        border: `1px solid ${c.accent}`,
        borderLeft: `4px solid ${c.accent}`,
        borderRadius: 12,
        padding: "14px 16px",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          gap: 8,
          flexWrap: "wrap",
        }}
      >
        <strong style={{ fontSize: 14, color: c.text }}>
          The producer updated this brief
        </strong>
        <span style={{ fontSize: 12, color: c.muted }}>
          since you last reviewed it
        </span>
      </div>
      <ul
        style={{
          margin: "10px 0 0",
          padding: 0,
          listStyle: "none",
          display: "grid",
          gap: 6,
        }}
      >
        {visible.map((d) => (
          <li
            key={d.key}
            style={{
              fontSize: 13,
              lineHeight: 1.45,
              color: c.text,
            }}
          >
            <strong style={{ color: c.text }}>{d.label}:</strong>{" "}
            <span style={{ color: c.muted, textDecoration: "line-through" }}>
              {d.before}
            </span>{" "}
            <span style={{ color: c.text, fontWeight: 700 }}>→ {d.after}</span>
          </li>
        ))}
        {extra > 0 ? (
          <li style={{ fontSize: 12, color: c.muted, marginTop: 2 }}>
            …and {extra} more change{extra === 1 ? "" : "s"}.
          </li>
        ) : null}
      </ul>
      <div style={{ marginTop: 12 }}>
        <button
          type="button"
          onClick={onAcknowledge}
          style={{
            padding: "8px 14px",
            fontSize: 13,
            fontWeight: 700,
            background: c.accent,
            color: "#0b0b0b",
            border: "none",
            borderRadius: 8,
            cursor: "pointer",
          }}
        >
          Acknowledge changes
        </button>
      </div>
    </section>
  );
}

function BriefActionRow({
  theme,
  onAddToCalendar,
  onOpenCallSheet,
}: {
  theme: ThemeMode;
  onAddToCalendar: () => void;
  onOpenCallSheet: () => void;
}) {
  const c = PALETTE[theme];
  const btnStyle: React.CSSProperties = {
    flex: 1,
    minWidth: 160,
    padding: "10px 14px",
    fontSize: 13,
    fontWeight: 700,
    background: c.cardBg,
    color: c.text,
    border: `1px solid ${c.border}`,
    borderRadius: 10,
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  };
  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      <button type="button" onClick={onAddToCalendar} style={btnStyle}>
        <span aria-hidden>📅</span> Add to calendar
      </button>
      <button type="button" onClick={onOpenCallSheet} style={btnStyle}>
        <span aria-hidden>📄</span> Call sheet PDF
      </button>
    </div>
  );
}

function ConflictWarning({
  theme,
  conflicts,
}: {
  theme: ThemeMode;
  conflicts: ScheduleConflict[];
}) {
  const c = PALETTE[theme];
  // Group by date so the freelancer sees one row per conflicting day,
  // even if multiple sources clash on the same date.
  const grouped = new Map<string, ScheduleConflict[]>();
  for (const conflict of conflicts) {
    const list = grouped.get(conflict.date) ?? [];
    list.push(conflict);
    grouped.set(conflict.date, list);
  }
  const rows = Array.from(grouped.entries()).sort(([a], [b]) =>
    a.localeCompare(b),
  );
  return (
    <div
      role="alert"
      style={{
        marginTop: 14,
        background: "rgba(220,38,38,0.08)",
        border: `1px solid ${c.danger}`,
        borderLeft: `4px solid ${c.danger}`,
        borderRadius: 10,
        padding: "12px 14px",
      }}
    >
      <div
        style={{
          fontSize: 13,
          fontWeight: 800,
          color: c.danger,
          marginBottom: 6,
        }}
      >
        ⚠ Schedule conflict on {rows.length} day{rows.length === 1 ? "" : "s"}
      </div>
      <ul
        style={{
          margin: 0,
          padding: 0,
          listStyle: "none",
          display: "grid",
          gap: 5,
        }}
      >
        {rows.map(([date, items]) => (
          <li
            key={date}
            style={{ fontSize: 12.5, color: c.text, lineHeight: 1.45 }}
          >
            <strong>{formatDate(date)}</strong>
            {" — "}
            <span style={{ color: c.muted }}>
              {items[0].phaseLabel}
              {": "}
            </span>
            {items.map((it) => it.detail).join("; ")}
          </li>
        ))}
      </ul>
      <div
        style={{
          marginTop: 8,
          fontSize: 11.5,
          color: c.muted,
          fontStyle: "italic",
        }}
      >
        You can still accept — but double-check before you commit.
      </div>
    </div>
  );
}

function SectionCard({
  theme,
  title,
  children,
}: {
  theme: ThemeMode;
  title: string;
  children: React.ReactNode;
}) {
  const c = PALETTE[theme];
  return (
    <section
      style={{
        background: c.cardBg,
        border: `1px solid ${c.border}`,
        borderRadius: 14,
        padding: 16,
        boxShadow: c.shadowSoft,
      }}
    >
      <h2
        style={{
          margin: 0,
          marginBottom: 12,
          fontSize: 14,
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: 0.6,
          color: c.muted,
        }}
      >
        {title}
      </h2>
      {children}
    </section>
  );
}

function KvGrid({
  theme,
  items,
}: {
  theme: ThemeMode;
  items: { k: string; v: string }[];
}) {
  const c = PALETTE[theme];
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
        gap: 12,
      }}
    >
      {items.map((it) => (
        <div key={it.k}>
          <div style={{ fontSize: 11, color: c.muted, fontWeight: 600 }}>
            {it.k}
          </div>
          <div style={{ fontSize: 16, fontWeight: 700, lineHeight: 1.2 }}>
            {it.v}
          </div>
        </div>
      ))}
    </div>
  );
}

function Field({
  theme,
  label,
  value,
  strong,
}: {
  theme: ThemeMode;
  label: string;
  value: string;
  strong?: boolean;
}) {
  const c = PALETTE[theme];
  return (
    <div>
      <div style={{ fontSize: 11, color: c.muted, fontWeight: 600 }}>
        {label}
      </div>
      <div
        style={{
          fontSize: strong ? 18 : 15,
          fontWeight: strong ? 800 : 600,
          lineHeight: 1.2,
          color: strong ? c.accent : c.text,
        }}
      >
        {value}
      </div>
    </div>
  );
}

function Empty({ theme, text }: { theme: ThemeMode; text: string }) {
  const c = PALETTE[theme];
  return (
    <div style={{ fontSize: 13, color: c.muted, padding: "4px 0" }}>{text}</div>
  );
}
