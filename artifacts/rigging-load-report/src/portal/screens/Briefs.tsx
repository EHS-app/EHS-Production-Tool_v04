import { useMemo } from "react";
import { Link } from "wouter";
import { PALETTE, type ThemeMode } from "../lib/portalTheme";
import type { PortalData, SharedBrief, BriefDecision } from "../lib/portalStorage";
import { formatCrewDayRate } from "../../lib/crew";

function formatDate(iso: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "2-digit",
  });
}

function formatRelative(ts: number): string {
  const diff = Date.now() - ts;
  const min = Math.round(diff / 60_000);
  if (min < 1) return "just now";
  if (min < 60) return `${min} min ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr} h ago`;
  const day = Math.round(hr / 24);
  if (day < 7) return `${day} d ago`;
  return new Date(ts).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
  });
}

function decisionPill(d: BriefDecision): { label: string; bg: string; fg: string } {
  switch (d) {
    case "pending":
      return { label: "New", bg: "rgba(248,128,0,0.18)", fg: "#f88000" };
    case "accepted":
      return { label: "Accepted", bg: "rgba(22,163,74,0.18)", fg: "#16a34a" };
    case "declined":
      return { label: "Declined", bg: "rgba(100,116,139,0.18)", fg: "#475569" };
    case "too_late":
      // Slot was filled by a sibling candidate before this freelancer
      // could accept. Same red palette as a hard error so the briefs
      // list immediately reads "this one's gone".
      return { label: "Filled", bg: "rgba(220,38,38,0.14)", fg: "#b91c1c" };
  }
}

export function Briefs({
  theme,
  data,
}: {
  theme: ThemeMode;
  data: PortalData;
}) {
  const c = PALETTE[theme];

  const sorted = useMemo(
    () => [...data.briefs].sort((a, b) => b.receivedAt - a.receivedAt),
    [data.briefs],
  );
  const pending = sorted.filter((b) => b.decision === "pending");
  const others = sorted.filter((b) => b.decision !== "pending");

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>Briefs</h1>
          <div style={{ fontSize: 13, color: c.muted, marginTop: 2 }}>
            Project briefings shared with you by EHS production
          </div>
        </div>
        {pending.length > 0 ? (
          <span
            style={{
              fontSize: 12,
              fontWeight: 700,
              padding: "6px 10px",
              borderRadius: 999,
              background: "rgba(248,128,0,0.15)",
              color: c.accent,
            }}
          >
            {pending.length} new
          </span>
        ) : null}
      </header>

      {sorted.length === 0 ? (
        <EmptyState theme={theme} />
      ) : (
        <>
          {pending.length > 0 ? (
            <Section theme={theme} title="Awaiting your decision">
              {pending.map((b) => (
                <BriefRow key={b.briefId} theme={theme} brief={b} />
              ))}
            </Section>
          ) : null}
          {others.length > 0 ? (
            <Section theme={theme} title="History">
              {others.map((b) => (
                <BriefRow key={b.briefId} theme={theme} brief={b} />
              ))}
            </Section>
          ) : null}
        </>
      )}
    </div>
  );
}

function EmptyState({ theme }: { theme: ThemeMode }) {
  const c = PALETTE[theme];
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
      <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 6 }}>
        No briefs yet
      </div>
      <div style={{ fontSize: 14, color: c.muted, lineHeight: 1.5 }}>
        When an EHS lead sends you a project briefing link, it shows up here
        with the full venue, rigging, lighting, LED, stage and sound details
        — plus your call time and rate. Tap Accept and it lands in your
        logbook as a confirmed gig.
      </div>
    </section>
  );
}

function Section({
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
    <section>
      <h2
        style={{
          margin: "0 0 8px",
          fontSize: 12,
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: 0.6,
          color: c.muted,
        }}
      >
        {title}
      </h2>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {children}
      </div>
    </section>
  );
}

function BriefRow({
  theme,
  brief,
}: {
  theme: ThemeMode;
  brief: SharedBrief;
}) {
  const c = PALETTE[theme];
  const pill = decisionPill(brief.decision);
  const myAssignment = brief.brief.assignments.find(
    (a) => a.crewId === brief.brief.recipientCrewId,
  );
  return (
    <Link
      href={`/portal/briefs/${brief.briefId}`}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        padding: "12px 14px",
        background: c.cardBg,
        border: `1px solid ${c.border}`,
        borderRadius: 12,
        textDecoration: "none",
        color: c.text,
        boxShadow: c.shadowSoft,
      }}
    >
      <div style={{ minWidth: 0 }}>
        <div
          style={{
            fontSize: 15,
            fontWeight: 800,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {brief.brief.project.venue || "Untitled show"}
        </div>
        <div
          style={{
            fontSize: 12,
            color: c.muted,
            marginTop: 2,
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
          }}
        >
          {brief.brief.project.client ? (
            <>
              <span style={{ color: c.text, fontWeight: 700 }}>
                {brief.brief.project.client}
              </span>
              <span aria-hidden>·</span>
            </>
          ) : null}
          <span>
            {brief.brief.project.endDate &&
            brief.brief.project.endDate !== brief.brief.project.date
              ? `${formatDate(brief.brief.project.date)} → ${formatDate(brief.brief.project.endDate)}`
              : formatDate(brief.brief.project.date)}
          </span>
          {myAssignment ? (
            <>
              <span aria-hidden>·</span>
              <span style={{ color: c.text, fontWeight: 600 }}>
                {myAssignment.role}
              </span>
              {myAssignment.callTime ? (
                <>
                  <span aria-hidden>·</span>
                  <span>call {myAssignment.callTime}</span>
                </>
              ) : null}
              {myAssignment.dayRate > 0 ? (
                <>
                  <span aria-hidden>·</span>
                  <span style={{ color: c.text, fontWeight: 600 }}>
                    {formatCrewDayRate(myAssignment.dayRate)}
                  </span>
                </>
              ) : null}
            </>
          ) : (
            <>
              <span aria-hidden>·</span>
              <span>Generic briefing</span>
            </>
          )}
          <span aria-hidden>·</span>
          <span>{formatRelative(brief.receivedAt)}</span>
        </div>
      </div>
      <span
        style={{
          fontSize: 11,
          fontWeight: 700,
          padding: "4px 10px",
          borderRadius: 999,
          background: pill.bg,
          color: pill.fg,
          flexShrink: 0,
        }}
      >
        {pill.label}
      </span>
    </Link>
  );
}
