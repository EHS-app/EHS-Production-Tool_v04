import { useMemo } from "react";
import { Link } from "wouter";
import { PALETTE, type ThemeMode } from "../lib/portalTheme";
import {
  gigEarnings,
  statusColor,
  statusLabel,
  type Gig,
  type PortalData,
} from "../lib/portalStorage";

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function startOfWeekIso(): string {
  const d = new Date();
  const day = (d.getDay() + 6) % 7; // Monday = 0
  d.setDate(d.getDate() - day);
  return d.toISOString().slice(0, 10);
}

function endOfWeekIso(): string {
  const d = new Date();
  const day = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - day + 6);
  return d.toISOString().slice(0, 10);
}

function startOfMonthIso(): string {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}

function endOfMonthIso(): string {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth() + 1, 0)
    .toISOString()
    .slice(0, 10);
}

function gigOverlaps(g: Gig, fromIso: string, toIso: string): boolean {
  if (!g.startDate || !g.endDate) return false;
  return !(g.endDate < fromIso || g.startDate > toIso);
}

function formatNok(n: number): string {
  return new Intl.NumberFormat("nb-NO", {
    style: "currency",
    currency: "NOK",
    maximumFractionDigits: 0,
  }).format(Math.round(n));
}

function formatDayShort(iso: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "2-digit",
    month: "short",
  });
}

export function Hub({ theme, data }: { theme: ThemeMode; data: PortalData }) {
  const c = PALETTE[theme];

  const today = todayIso();
  const weekStart = startOfWeekIso();
  const weekEnd = endOfWeekIso();
  const monthStart = startOfMonthIso();
  const monthEnd = endOfMonthIso();

  const sortedByDate = useMemo(
    () =>
      [...data.gigs].sort((a, b) =>
        a.startDate.localeCompare(b.startDate),
      ),
    [data.gigs],
  );

  const todaysGigs = sortedByDate.filter((g) =>
    gigOverlaps(g, today, today),
  );
  const weekGigs = sortedByDate.filter(
    (g) => gigOverlaps(g, weekStart, weekEnd) && !todaysGigs.includes(g),
  );
  const upcoming = sortedByDate.filter(
    (g) => g.startDate > today && g.startDate > weekEnd,
  );

  const monthEarnings = useMemo(() => {
    return data.gigs
      .filter((g) => gigOverlaps(g, monthStart, monthEnd))
      .reduce((sum, g) => sum + gigEarnings(g), 0);
  }, [data.gigs, monthStart, monthEnd]);

  const readyToInvoice = useMemo(
    () =>
      data.gigs
        .filter((g) => g.status === "done")
        .reduce((sum, g) => sum + gigEarnings(g), 0),
    [data.gigs],
  );

  const availabilityCount = Object.keys(data.availability).length;

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <section>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 4,
            marginBottom: 12,
          }}
        >
          <span style={{ fontSize: 13, color: c.muted, fontWeight: 600 }}>
            {new Date().toLocaleDateString("en-GB", {
              weekday: "long",
              day: "numeric",
              month: "long",
            })}
          </span>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800 }}>
            Hi{data.profile.fullName ? `, ${data.profile.fullName.split(" ")[0]}` : ""}
          </h1>
        </div>
      </section>

      <section
        style={{
          display: "grid",
          gap: 12,
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
        }}
      >
        <StatCard
          theme={theme}
          label="Month-to-date"
          value={formatNok(monthEarnings)}
          accent
        />
        <StatCard
          theme={theme}
          label="Ready to invoice"
          value={formatNok(readyToInvoice)}
        />
        <StatCard
          theme={theme}
          label="Days marked"
          value={`${availabilityCount}`}
          sublabel={availabilityCount === 1 ? "day" : "days"}
        />
        <StatCard
          theme={theme}
          label="Logged gigs"
          value={`${data.gigs.length}`}
        />
      </section>

      <Card theme={theme} title="Today">
        {todaysGigs.length === 0 ? (
          <EmptyRow
            theme={theme}
            text="Nothing on the schedule today."
            ctaText="Log a gig"
            ctaHref="/portal/gigs"
          />
        ) : (
          <Stack>
            {todaysGigs.map((g) => (
              <GigRow key={g.id} g={g} theme={theme} />
            ))}
          </Stack>
        )}
      </Card>

      <Card theme={theme} title="This week">
        {weekGigs.length === 0 ? (
          <EmptyRow theme={theme} text="No more gigs this week." />
        ) : (
          <Stack>
            {weekGigs.map((g) => (
              <GigRow key={g.id} g={g} theme={theme} />
            ))}
          </Stack>
        )}
      </Card>

      <Card theme={theme} title="Upcoming">
        {upcoming.length === 0 ? (
          <EmptyRow
            theme={theme}
            text="No future gigs logged yet."
            ctaText="Log a gig"
            ctaHref="/portal/gigs"
          />
        ) : (
          <Stack>
            {upcoming.slice(0, 5).map((g) => (
              <GigRow key={g.id} g={g} theme={theme} />
            ))}
            {upcoming.length > 5 ? (
              <Link
                href="/portal/gigs"
                style={{
                  textAlign: "center",
                  padding: 8,
                  fontSize: 13,
                  color: c.accent,
                  fontWeight: 600,
                  textDecoration: "none",
                }}
              >
                View all {upcoming.length} upcoming →
              </Link>
            ) : null}
          </Stack>
        )}
      </Card>

      {!data.profile.fullName ||
      !data.profile.phone ||
      data.profile.skills.length === 0 ? (
        <Card theme={theme} title="Finish your profile">
          <div style={{ color: c.muted, fontSize: 14, lineHeight: 1.55 }}>
            A complete profile helps EHS leads find you for the right gigs.
            Add your contact details, skills and certifications.
          </div>
          <div style={{ marginTop: 12 }}>
            <Link
              href="/portal/profile"
              style={{
                display: "inline-block",
                padding: "9px 16px",
                fontSize: 14,
                fontWeight: 700,
                background: c.accent,
                color: "#0b0b0b",
                borderRadius: 8,
                textDecoration: "none",
              }}
            >
              Edit profile
            </Link>
          </div>
        </Card>
      ) : null}
    </div>
  );
}

function StatCard({
  theme,
  label,
  value,
  sublabel,
  accent,
}: {
  theme: ThemeMode;
  label: string;
  value: string;
  sublabel?: string;
  accent?: boolean;
}) {
  const c = PALETTE[theme];
  return (
    <div
      style={{
        background: c.cardBg,
        border: `1px solid ${c.border}`,
        borderRadius: 14,
        padding: 16,
        boxShadow: c.shadowSoft,
      }}
    >
      <div style={{ fontSize: 12, fontWeight: 600, color: c.muted, marginBottom: 8 }}>
        {label}
      </div>
      <div
        style={{
          fontSize: 22,
          fontWeight: 800,
          color: accent ? c.accent : c.text,
          lineHeight: 1.1,
        }}
      >
        {value}
      </div>
      {sublabel ? (
        <div style={{ fontSize: 12, color: c.muted, marginTop: 2 }}>
          {sublabel}
        </div>
      ) : null}
    </div>
  );
}

function Card({
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

function Stack({ children }: { children: React.ReactNode }) {
  return <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>{children}</div>;
}

function GigRow({ g, theme }: { g: Gig; theme: ThemeMode }) {
  const c = PALETTE[theme];
  const sc = statusColor(g.status);
  return (
    <Link
      href="/portal/gigs"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        padding: "10px 12px",
        background: c.cardBgSubtle,
        border: `1px solid ${c.border}`,
        borderRadius: 10,
        textDecoration: "none",
        color: c.text,
      }}
    >
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {g.projectName}
        </div>
        <div style={{ fontSize: 12, color: c.muted, marginTop: 2 }}>
          {g.role || "—"} · {formatDayShort(g.startDate)}
          {g.endDate && g.endDate !== g.startDate
            ? ` → ${formatDayShort(g.endDate)}`
            : ""}
        </div>
      </div>
      <span
        style={{
          fontSize: 11,
          fontWeight: 700,
          padding: "4px 8px",
          borderRadius: 999,
          background: sc.bg,
          color: sc.fg,
          flexShrink: 0,
        }}
      >
        {statusLabel(g.status)}
      </span>
    </Link>
  );
}

function EmptyRow({
  theme,
  text,
  ctaText,
  ctaHref,
}: {
  theme: ThemeMode;
  text: string;
  ctaText?: string;
  ctaHref?: string;
}) {
  const c = PALETTE[theme];
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        padding: "12px 4px",
        color: c.muted,
        fontSize: 14,
      }}
    >
      <span>{text}</span>
      {ctaText && ctaHref ? (
        <Link
          href={ctaHref}
          style={{
            color: c.accent,
            fontWeight: 700,
            fontSize: 13,
            textDecoration: "none",
          }}
        >
          {ctaText} →
        </Link>
      ) : null}
    </div>
  );
}
