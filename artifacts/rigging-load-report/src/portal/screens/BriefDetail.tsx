import { useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import { PALETTE, type ThemeMode } from "../lib/portalTheme";
import {
  findBrief,
  gigFromBrief,
  updateBrief,
  type PortalData,
} from "../lib/portalStorage";
import type {
  BriefAssignment,
  BriefRiggPlan,
  ProjectBrief,
} from "../../lib/projectBrief";

function formatDate(iso: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function formatEur(n: number): string {
  if (!isFinite(n)) return "€0";
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
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
  const [, setLocation] = useLocation();
  const entry = findBrief(data, briefId);
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

  function accept() {
    setData((prev) => {
      // Don't double-create a Gig if the brief is re-accepted.
      const existing = prev.briefs.find((b) => b.briefId === briefId);
      if (existing?.acceptedGigId) {
        return updateBrief(prev, briefId, { decision: "accepted" });
      }
      const gig = gigFromBrief(brief);
      const next = updateBrief(prev, briefId, {
        decision: "accepted",
        acceptedGigId: gig.id,
      });
      return { ...next, gigs: [gig, ...next.gigs] };
    });
  }

  function decline() {
    setData((prev) => updateBrief(prev, briefId, { decision: "declined" }));
  }

  function resetDecision() {
    setData((prev) => updateBrief(prev, briefId, { decision: "pending" }));
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
        <div style={{ color: c.muted, fontSize: 14 }}>
          {formatDate(brief.project.date)}
          {brief.project.preparedBy ? (
            <>
              {" · prepared by "}
              <span style={{ color: c.text, fontWeight: 600 }}>
                {brief.project.preparedBy}
              </span>
            </>
          ) : null}
        </div>
      </section>

      {/* Your assignment */}
      {myAssignment ? (
        <AssignmentCard
          theme={theme}
          assignment={myAssignment}
          decision={entry.decision}
          acceptedGigId={entry.acceptedGigId}
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
          onAccept={accept}
          onDecline={decline}
          onReset={resetDecision}
          onOpenGig={() => setLocation("/portal/gigs")}
        />
      )}

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
            { k: "Power circuits", v: `${brief.lighting.circuitCount}` },
            {
              k: "Worst phase load",
              v: brief.lighting.worstCircuitPct > 0
                ? `${Math.round(brief.lighting.worstCircuitPct * 100)}%`
                : "—",
            },
          ]}
        />
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
                    </div>
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
    </div>
  );
}

/* ---------------------------------------------------------------- pieces */

function AssignmentCard({
  theme,
  assignment,
  decision,
  acceptedGigId,
  onAccept,
  onDecline,
  onReset,
  onOpenGig,
}: {
  theme: ThemeMode;
  assignment: BriefAssignment;
  decision: "pending" | "accepted" | "declined";
  acceptedGigId?: string;
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
          value={fee > 0 ? formatEur(fee) : "—"}
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
              Accept gig
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
  onAccept,
  onDecline,
  onReset,
  onOpenGig,
}: {
  theme: ThemeMode;
  decision: "pending" | "accepted" | "declined";
  acceptedGigId?: string;
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
              Add to logbook
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
