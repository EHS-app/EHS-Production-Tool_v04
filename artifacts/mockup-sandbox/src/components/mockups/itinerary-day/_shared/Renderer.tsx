import React from "react";

type ThemeMode = "light" | "dark";

const EHS_ORANGE = "#f88000";

const PALETTE = {
  light: {
    pageBg: "#f1f5f9",
    cardBg: "#ffffff",
    border: "#e2e8f0",
    text: "#0f172a",
    muted: "#64748b",
    accent: EHS_ORANGE,
  },
  dark: {
    pageBg: "#0b1220",
    cardBg: "#111c2e",
    border: "#1f2d44",
    text: "#f1f5f9",
    muted: "#94a3b8",
    accent: EHS_ORANGE,
  },
} as const;

const PORTAL_FONT =
  "'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";

type ItineraryDay = {
  date: string;
  dayOfWeek: string;
  working: boolean;
  callTime?: string;
  offTime?: string;
  phases: Array<{
    phaseKey: "setup" | "rehearsal" | "show" | "downrig";
    phaseLabel: string;
    fromTime?: string;
    toTime?: string;
  }>;
  hotel?: {
    stayingTonight: boolean;
    isCheckIn: boolean;
    isCheckOut: boolean;
    roomKey?: string;
    roommateName?: string | null;
  };
  venue: string;
};

function formatHumanDate(iso: string, locale?: string): string {
  try {
    const d = new Date(`${iso}T00:00:00Z`);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleDateString(locale, {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    });
  } catch {
    return iso;
  }
}

function formatPhaseTime(
  fromTime?: string,
  toTime?: string,
): string | null {
  const from = fromTime?.trim();
  const to = toTime?.trim();
  if (from && to) return `${from}\u2013${to}`;
  if (from) return `${from}\u2009\u2192`;
  if (to) return `\u2192\u2009${to}`;
  return null;
}

function hotelLineForDay(hotel: NonNullable<ItineraryDay["hotel"]>): string {
  if (hotel.isCheckOut && !hotel.stayingTonight) {
    if (hotel.roomKey) return `Check-out this morning \u00b7 Room ${hotel.roomKey}`;
    return "Check-out this morning";
  }
  if (!hotel.stayingTonight) return "Not staying tonight";
  const parts: string[] = [];
  parts.push(hotel.roomKey ? `Room ${hotel.roomKey}` : "Room TBD");
  if (hotel.roommateName) parts.push(`with ${hotel.roommateName}`);
  return parts.join(" ");
}

const MOCK_DAYS: ItineraryDay[] = [
  {
    date: "2026-05-04",
    dayOfWeek: "Mon",
    working: true,
    callTime: "18:00",
    phases: [],
    hotel: {
      stayingTonight: true,
      isCheckIn: true,
      isCheckOut: false,
      roomKey: "312",
      roommateName: "Anna Larsen",
    },
    venue: "Oslo Spektrum",
  },
  {
    date: "2026-05-05",
    dayOfWeek: "Tue",
    working: true,
    callTime: "09:00",
    offTime: "18:00",
    phases: [
      { phaseKey: "setup", phaseLabel: "Setup", fromTime: "09:00", toTime: "13:00" },
      { phaseKey: "rehearsal", phaseLabel: "Rehearsal", fromTime: "14:00", toTime: "18:00" },
    ],
    hotel: {
      stayingTonight: true,
      isCheckIn: false,
      isCheckOut: false,
      roomKey: "312",
      roommateName: "Anna Larsen",
    },
    venue: "Oslo Spektrum",
  },
  {
    date: "2026-05-06",
    dayOfWeek: "Wed",
    working: true,
    callTime: "11:00",
    offTime: "23:30",
    phases: [
      { phaseKey: "setup", phaseLabel: "Setup", fromTime: "11:00", toTime: "14:00" },
      { phaseKey: "show", phaseLabel: "Show", fromTime: "19:00", toTime: "22:30" },
      { phaseKey: "downrig", phaseLabel: "Downrig", fromTime: "22:30", toTime: "23:30" },
    ],
    hotel: {
      stayingTonight: true,
      isCheckIn: false,
      isCheckOut: false,
      roomKey: "312",
      roommateName: "Anna Larsen",
    },
    venue: "Oslo Spektrum",
  },
  {
    date: "2026-05-07",
    dayOfWeek: "Thu",
    working: true,
    callTime: "09:00",
    offTime: "15:00",
    phases: [
      { phaseKey: "setup", phaseLabel: "Setup", fromTime: "09:00" },
      { phaseKey: "downrig", phaseLabel: "Tear-down", toTime: "15:00" },
      { phaseKey: "show", phaseLabel: "Cleanup" },
    ],
    hotel: {
      stayingTonight: true,
      isCheckIn: false,
      isCheckOut: false,
      roomKey: "312",
      roommateName: null,
    },
    venue: "Oslo Spektrum",
  },
  {
    date: "2026-05-08",
    dayOfWeek: "Fri",
    working: false,
    phases: [],
    hotel: {
      stayingTonight: false,
      isCheckIn: false,
      isCheckOut: true,
      roomKey: "312",
      roommateName: null,
    },
    venue: "",
  },
];

function ItineraryDayCard({
  day,
  theme,
}: {
  day: ItineraryDay;
  theme: ThemeMode;
}) {
  const c = PALETTE[theme];
  const formatted = formatHumanDate(day.date);
  return (
    <div
      style={{
        background: theme === "dark" ? "rgba(255,255,255,0.03)" : "#fafafa",
        border: `1px solid ${c.border}`,
        borderRadius: 10,
        padding: "10px 12px",
        display: "grid",
        gap: 6,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          gap: 10,
          flexWrap: "wrap",
        }}
      >
        <strong style={{ fontSize: 14, color: c.text }}>{formatted}</strong>
        {day.working ? <Chip theme={theme} kind="working" label="Working" /> : null}
        {day.hotel?.isCheckIn ? (
          <Chip theme={theme} kind="hotel" label="Hotel check-in" />
        ) : null}
        {day.hotel?.isCheckOut ? (
          <Chip theme={theme} kind="hotel" label="Hotel check-out" />
        ) : null}
      </div>

      {day.callTime || day.offTime ? (
        <div style={{ fontSize: 13, color: c.text }}>
          {day.callTime ? (
            <>
              <strong style={{ color: c.muted, fontWeight: 600 }}>Call:</strong>{" "}
              {day.callTime}
            </>
          ) : null}
          {day.callTime && day.offTime ? (
            <span style={{ color: c.muted }}> · </span>
          ) : null}
          {day.offTime ? (
            <>
              <strong style={{ color: c.muted, fontWeight: 600 }}>Off:</strong>{" "}
              {day.offTime}
            </>
          ) : null}
        </div>
      ) : null}

      {day.phases.length > 0 ? (
        <div style={{ fontSize: 13, color: c.text }}>
          <strong style={{ color: c.muted, fontWeight: 600 }}>Production:</strong>{" "}
          {day.phases.map((p, i) => {
            const time = formatPhaseTime(p.fromTime, p.toTime);
            return (
              <span key={`${p.phaseKey}-${i}`}>
                {i > 0 ? <span style={{ color: c.muted }}> · </span> : null}
                {p.phaseLabel}
                {time ? (
                  <span style={{ color: c.muted }}> ({time})</span>
                ) : null}
              </span>
            );
          })}
        </div>
      ) : null}

      {day.hotel ? (
        <div style={{ fontSize: 13, color: c.text }}>
          <strong style={{ color: c.muted, fontWeight: 600 }}>Hotel:</strong>{" "}
          {hotelLineForDay(day.hotel)}
        </div>
      ) : null}

      {day.venue ? (
        <div style={{ fontSize: 12, color: c.muted }}>📍 {day.venue}</div>
      ) : null}
    </div>
  );
}

function Chip({
  theme,
  kind,
  label,
}: {
  theme: ThemeMode;
  kind: "working" | "hotel";
  label: string;
}) {
  const c = PALETTE[theme];
  const bg =
    kind === "working" ? "rgba(67,160,71,0.15)" : "rgba(33,150,243,0.15)";
  const fg = kind === "working" ? "#43a047" : "#2196f3";
  return (
    <span
      style={{
        display: "inline-block",
        padding: "2px 8px",
        fontSize: 11,
        fontWeight: 700,
        background: bg,
        color: fg,
        border: `1px solid ${c.border}`,
        borderRadius: 999,
      }}
    >
      {label}
    </span>
  );
}

function ItinerarySection({
  days,
  theme,
}: {
  days: ItineraryDay[];
  theme: ThemeMode;
}) {
  const c = PALETTE[theme];
  return (
    <section
      style={{
        background: c.cardBg,
        border: `1px solid ${c.border}`,
        borderRadius: 12,
        padding: "14px 16px",
        marginTop: 12,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          gap: 8,
          marginBottom: 12,
          flexWrap: "wrap",
        }}
      >
        <div>
          <strong style={{ fontSize: 15, color: c.text }}>Your itinerary</strong>
          <span
            style={{
              marginLeft: 8,
              fontSize: 12,
              color: c.muted,
            }}
          >
            Day-by-day for this trip
          </span>
        </div>
      </div>

      {days.length === 0 ? (
        <div style={{ fontSize: 13, color: c.muted }}>
          No itinerary days yet. Once the producer fills in the schedule
          you'll see your plan here.
        </div>
      ) : (
        <div style={{ display: "grid", gap: 10 }}>
          {days.map((d) => (
            <ItineraryDayCard key={d.date} day={d} theme={theme} />
          ))}
        </div>
      )}
    </section>
  );
}

export function ItineraryGallery({ theme }: { theme: ThemeMode }) {
  const c = PALETTE[theme];
  return (
    <div
      style={{
        background: c.pageBg,
        minHeight: "100vh",
        padding: "20px 16px",
        fontFamily: PORTAL_FONT,
        color: c.text,
      }}
    >
      <div style={{ maxWidth: 640, margin: "0 auto" }}>
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: 0.6,
            textTransform: "uppercase",
            color: c.muted,
            marginBottom: 4,
          }}
        >
          Mock data — visual verification of {theme} theme
        </div>
        <div style={{ fontSize: 12, color: c.muted, marginBottom: 4 }}>
          Edge cases shown: travel-only day, full schedule, missing
          phase times (arrows), solo room, check-out morning.
        </div>
        <ItinerarySection days={MOCK_DAYS} theme={theme} />
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: 0.6,
            textTransform: "uppercase",
            color: c.muted,
            marginTop: 24,
            marginBottom: 4,
          }}
        >
          Empty state
        </div>
        <ItinerarySection days={[]} theme={theme} />
      </div>
    </div>
  );
}
