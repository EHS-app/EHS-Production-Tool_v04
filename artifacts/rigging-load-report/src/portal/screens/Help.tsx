import { type ReactNode } from "react";
import { Link } from "wouter";
import { PALETTE, type ThemeMode } from "../lib/portalTheme";

type HelpSection = {
  id: string;
  icon: string;
  title: string;
  intro: string;
  steps: string[];
  tip?: string;
};

const SECTIONS: HelpSection[] = [
  {
    id: "hub",
    icon: "◉",
    title: "Hub — your dashboard",
    intro:
      "The Hub is the first thing you see. It shows what you're working on this week, this month and what's coming next.",
    steps: [
      "Scan the top cards for week-to-date and month-to-date earnings.",
      "Check the upcoming gig list to see your next call times at a glance.",
      "Tap any gig card to jump into its details on the Gigs page.",
    ],
    tip: "If a card looks empty, you probably have no accepted gigs yet — head to Briefs to accept one, or to Gigs to add one manually.",
  },
  {
    id: "briefs",
    icon: "✉",
    title: "Briefs — incoming work offers",
    intro:
      "When a producer shares a project briefing with you, it lands here. The number badge on the Briefs tab tells you how many are waiting for a decision.",
    steps: [
      "Open a brief to see the venue, schedule, your role, call/off times and day rate.",
      "Tap Accept to add it to your gigs as Confirmed, or Decline if you can't take it.",
      "If the producer changes a brief after you accepted, you'll see a yellow \"The producer updated this brief\" banner the next time you open it — tap Acknowledge changes once you've read what changed.",
    ],
    tip: "If a brief overlaps with a gig you already accepted (or a day you marked Busy), a red Schedule conflict warning appears before you commit, and the Accept button changes to \"Accept anyway\".",
  },
  {
    id: "gigs",
    icon: "▤",
    title: "Gigs — your logbook",
    intro:
      "Every confirmed job lives here. You can also add gigs by hand if a producer didn't go through the portal.",
    steps: [
      "Tap + Add gig to log a job manually with venue, dates, role and rate.",
      "On the day of a Confirmed gig, tap On the way when you leave, then Arrived when you reach the venue. The pills turn indigo and green and remember the timestamp.",
      "Tap Add to calendar on a gig to download a calendar file (.ics) you can open in Apple Calendar, Google Calendar or Outlook.",
      "Mark gigs Done once they're complete so they roll into your Earnings totals.",
    ],
    tip: "Tap a green ✓ Arrived pill again to clear it if you tapped it by mistake.",
  },
  {
    id: "availability",
    icon: "◐",
    title: "Availability — block out days you can't work",
    intro:
      "Mark days as Busy to keep your own schedule honest. The portal uses these dates to warn you about conflicts when accepting new briefs.",
    steps: [
      "Tap a day on the calendar to toggle it between Available and Busy.",
      "Busy days appear in conflict warnings on briefs that fall on those dates.",
    ],
  },
  {
    id: "earnings",
    icon: "kr",
    title: "Earnings — see what you're billing",
    intro:
      "A monthly breakdown of what you've earned across all your gigs. Useful when you're doing your books or invoicing.",
    steps: [
      "Pick a month to see the gigs that contributed and the total NOK.",
      "Status filters let you separate Confirmed (still upcoming), Done (worked, awaiting payment) and Paid.",
    ],
  },
  {
    id: "profile",
    icon: "◆",
    title: "Profile — who you are to producers",
    intro:
      "The name, phone and contact details producers see when you accept their brief.",
    steps: [
      "Fill in your full name, phone and any role tags so producers can find you.",
      "Switch theme (light/dark) using the moon/sun button in the top bar.",
    ],
  },
];

const QUICK_ACTIONS = [
  {
    icon: "📅",
    title: "Add to calendar",
    body: "On any brief or accepted gig, this button downloads a standard .ics file. Open it once and the event lands in your phone or laptop calendar with the right dates and times.",
  },
  {
    icon: "📄",
    title: "Personal call sheet PDF",
    body: "Inside a brief, this opens a printable one-page call sheet with your role, call/off times and the full schedule. From the print dialog you can save it as a PDF.",
  },
  {
    icon: "⚠",
    title: "Schedule conflict warning",
    body: "Before you accept a brief, the portal cross-checks it against your existing gigs and your Busy days. If anything overlaps, you'll see a red alert listing the clashes.",
  },
  {
    icon: "✓",
    title: "On the way / Arrived check-in",
    body: "On Confirmed gigs in the Gigs page, two pill buttons let you stamp the time you set off and arrived. They persist across reloads so you have a record afterwards.",
  },
  {
    icon: "🔔",
    title: "Brief update banner",
    body: "If a producer re-shares a brief you already accepted, the BriefDetail page shows a banner listing what changed (venue, date, your call time, notes…) so you don't miss silent edits.",
  },
];

export function Help({ theme }: { theme: ThemeMode }) {
  const c = PALETTE[theme];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <header style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 10,
            fontSize: 13,
            fontWeight: 700,
            color: c.accent,
            letterSpacing: 0.6,
            textTransform: "uppercase",
          }}
        >
          <span aria-hidden>?</span>
          <span>Help &amp; tips</span>
        </div>
        <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, color: c.text }}>
          How to use the Freelance Portal
        </h1>
        <p style={{ margin: 0, fontSize: 14, color: c.muted, lineHeight: 1.55 }}>
          A quick tour of every section, plus the shortcuts that save the most
          time. Tap any heading below to jump in.
        </p>
      </header>

      <Card theme={theme}>
        <h2
          style={{
            margin: 0,
            marginBottom: 12,
            fontSize: 16,
            fontWeight: 700,
            color: c.text,
          }}
        >
          Jump to a section
        </h2>
        <nav
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
            gap: 8,
          }}
        >
          {SECTIONS.map((s) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "10px 12px",
                borderRadius: 10,
                background: c.cardBgSubtle,
                color: c.text,
                textDecoration: "none",
                fontSize: 13,
                fontWeight: 600,
                border: `1px solid ${c.border}`,
              }}
            >
              <span style={{ fontSize: 16, color: c.accent }} aria-hidden>
                {s.icon}
              </span>
              <span style={{ flex: 1 }}>{s.title.split(" — ")[0]}</span>
            </a>
          ))}
        </nav>
      </Card>

      <Card theme={theme}>
        <h2
          style={{
            margin: 0,
            marginBottom: 4,
            fontSize: 16,
            fontWeight: 700,
            color: c.text,
          }}
        >
          Shortcuts you should know
        </h2>
        <p style={{ margin: 0, marginBottom: 14, fontSize: 13, color: c.muted }}>
          Five small features that make a big difference.
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {QUICK_ACTIONS.map((a) => (
            <div
              key={a.title}
              style={{
                display: "flex",
                gap: 12,
                padding: 12,
                borderRadius: 10,
                background: c.cardBgSubtle,
                border: `1px solid ${c.border}`,
              }}
            >
              <div
                style={{
                  fontSize: 22,
                  lineHeight: 1,
                  width: 36,
                  flexShrink: 0,
                  textAlign: "center",
                }}
                aria-hidden
              >
                {a.icon}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: c.text }}>
                  {a.title}
                </div>
                <div
                  style={{ fontSize: 13, color: c.muted, lineHeight: 1.55 }}
                >
                  {a.body}
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {SECTIONS.map((s) => (
        <Card key={s.id} theme={theme}>
          <a
            id={s.id}
            aria-hidden
            style={{
              display: "block",
              position: "relative",
              top: -76,
              visibility: "hidden",
            }}
          />
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              marginBottom: 8,
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: c.accent,
                color: "#0b0b0b",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 18,
                fontWeight: 800,
              }}
              aria-hidden
            >
              {s.icon}
            </div>
            <h2
              style={{
                margin: 0,
                fontSize: 18,
                fontWeight: 800,
                color: c.text,
              }}
            >
              {s.title}
            </h2>
          </div>
          <p
            style={{
              margin: 0,
              marginBottom: 12,
              fontSize: 14,
              color: c.muted,
              lineHeight: 1.6,
            }}
          >
            {s.intro}
          </p>
          <ol
            style={{
              margin: 0,
              paddingLeft: 22,
              display: "flex",
              flexDirection: "column",
              gap: 6,
              color: c.text,
              fontSize: 14,
              lineHeight: 1.55,
            }}
          >
            {s.steps.map((step, i) => (
              <li key={i}>{step}</li>
            ))}
          </ol>
          {s.tip ? (
            <div
              style={{
                marginTop: 12,
                padding: "10px 12px",
                borderRadius: 8,
                background: c.cardBgSubtle,
                border: `1px dashed ${c.border}`,
                fontSize: 13,
                color: c.muted,
                lineHeight: 1.55,
              }}
            >
              <strong style={{ color: c.text, fontWeight: 700 }}>Tip:</strong>{" "}
              {s.tip}
            </div>
          ) : null}
        </Card>
      ))}

      <Card theme={theme}>
        <h2
          style={{
            margin: 0,
            marginBottom: 8,
            fontSize: 16,
            fontWeight: 700,
            color: c.text,
          }}
        >
          Still stuck?
        </h2>
        <p
          style={{
            margin: 0,
            fontSize: 14,
            color: c.muted,
            lineHeight: 1.6,
          }}
        >
          Reach out to your EHS contact or the producer who shared the brief.
          You can also{" "}
          <Link
            href="/portal/profile"
            style={{ color: c.accent, fontWeight: 600 }}
          >
            update your contact details
          </Link>{" "}
          so producers know how to reach you.
        </p>
      </Card>
    </div>
  );
}

function Card({
  theme,
  children,
}: {
  theme: ThemeMode;
  children: ReactNode;
}) {
  const c = PALETTE[theme];
  return (
    <section
      style={{
        background: c.cardBg,
        border: `1px solid ${c.border}`,
        borderRadius: 14,
        padding: 18,
      }}
    >
      {children}
    </section>
  );
}
