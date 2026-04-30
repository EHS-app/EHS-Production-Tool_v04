import type {
  BriefSchedule,
  BriefSchedulePhaseKey,
  BriefScheduleSegment,
  ProjectBrief,
} from "./projectBrief";

const PHASE_LABELS: Record<BriefSchedulePhaseKey, string> = {
  setup: "Setup",
  rehearsal: "Rehearsal",
  show: "Show",
  downrig: "Load Out",
};

const PHASE_KEYS: BriefSchedulePhaseKey[] = [
  "setup",
  "rehearsal",
  "show",
  "downrig",
];

/** RFC 5545 §3.1 line folding — content lines longer than 75 *octets*
 *  must be broken with CRLF + a single leading space on continuation
 *  lines. Non-ASCII characters in venue names ("Operaen", "Sentralen")
 *  are common, so we fold by UTF-8 byte length, not JS char length, and
 *  we never split inside a multi-byte character. Applied to every
 *  content line, not just the obvious long ones (UID + DESCRIPTION can
 *  both exceed the limit). */
function fold(line: string): string {
  const enc = new TextEncoder();
  const bytes = enc.encode(line);
  if (bytes.length <= 75) return line;
  const dec = new TextDecoder();
  const parts: string[] = [];
  let offset = 0;
  let firstChunk = true;
  while (offset < bytes.length) {
    const limit = firstChunk ? 75 : 74; // continuation lines reserve 1 byte for leading space
    let end = Math.min(offset + limit, bytes.length);
    // Don't slice inside a multi-byte UTF-8 sequence — back up until we
    // hit a leading byte (continuation bytes match 10xxxxxx = 0x80..0xBF).
    while (end < bytes.length && (bytes[end] & 0xc0) === 0x80) {
      end -= 1;
    }
    const chunk = dec.decode(bytes.slice(offset, end));
    parts.push(firstChunk ? chunk : " " + chunk);
    offset = end;
    firstChunk = false;
  }
  return parts.join("\r\n");
}

function escapeText(s: string): string {
  return s
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/** Format an ISO date (YYYY-MM-DD) as a VALUE=DATE iCal string. */
function fmtDateOnly(iso: string): string {
  return iso.replace(/-/g, "");
}

/** Format an ISO date + HH:MM as a *floating* (no TZ) datetime string.
 *  Floating means "interpret in the viewer's local timezone" — the
 *  right semantics for show call times where the venue's local clock
 *  is the source of truth. */
function fmtDateTime(date: string, time: string): string {
  return `${date.replace(/-/g, "")}T${time.replace(":", "")}00`;
}

/** Add one calendar day to an ISO date. Used for VALUE=DATE end dates,
 *  which are exclusive in iCal (a "Mon" all-day event has DTSTART=Mon
 *  and DTEND=Tue). */
function addDay(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return iso;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  d.setUTCDate(d.getUTCDate() + 1);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

function fmtUtcStamp(ms: number): string {
  const d = new Date(ms);
  return (
    `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}` +
    `T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`
  );
}

type EventInput = {
  uid: string;
  summary: string;
  description: string;
  location: string;
  segment: BriefScheduleSegment;
  stamp: number;
};

function eventLines(ev: EventInput): string[] {
  const seg = ev.segment;
  const from = seg.from || seg.to;
  const to = seg.to || seg.from;
  if (!from) {
    // No date → cannot emit a valid VEVENT. Return empty so we never
    // produce a malformed calendar (caller should have filtered, but
    // belt + braces).
    return [];
  }
  const lines: string[] = [];
  lines.push("BEGIN:VEVENT");
  lines.push(fold(`UID:${ev.uid}`));
  lines.push(`DTSTAMP:${fmtUtcStamp(ev.stamp)}`);
  if (seg.fromTime || seg.toTime) {
    const startDate = from;
    const endDate = to || from;
    const startTime = seg.fromTime || seg.toTime || "00:00";
    const endTime = seg.toTime || seg.fromTime || startTime;
    lines.push(`DTSTART:${fmtDateTime(startDate, startTime)}`);
    lines.push(`DTEND:${fmtDateTime(endDate, endTime)}`);
  } else {
    // All-day event(s) — DTEND is exclusive in iCal.
    lines.push(`DTSTART;VALUE=DATE:${fmtDateOnly(from)}`);
    lines.push(`DTEND;VALUE=DATE:${fmtDateOnly(addDay(to || from))}`);
  }
  lines.push(fold(`SUMMARY:${escapeText(ev.summary)}`));
  if (ev.description) {
    lines.push(fold(`DESCRIPTION:${escapeText(ev.description)}`));
  }
  if (ev.location) {
    lines.push(fold(`LOCATION:${escapeText(ev.location)}`));
  }
  lines.push("END:VEVENT");
  return lines;
}

function scheduleEvents(
  brief: ProjectBrief,
  schedule: BriefSchedule,
  baseUid: string,
  stamp: number,
): string[] {
  const out: string[] = [];
  const venue = brief.project.venue || "Show";
  const myAssignment = brief.assignments.find(
    (a) => a.crewId === brief.recipientCrewId,
  );
  const role = myAssignment?.role ?? "";
  const description = [
    role ? `Role: ${role}` : "",
    brief.project.preparedBy
      ? `Project manager: ${brief.project.preparedBy}`
      : "",
    myAssignment?.notes ? `Notes: ${myAssignment.notes}` : "",
  ]
    .filter(Boolean)
    .join("\n");
  for (const phase of PHASE_KEYS) {
    const segs = schedule[phase];
    if (!segs || segs.length === 0) continue;
    segs.forEach((seg, idx) => {
      // Need at least one date — a segment with only times and no
      // date can't be expressed as a valid VEVENT, so skip it.
      if (!seg.from && !seg.to) return;
      const dayLabel = segs.length > 1 ? ` (Day ${idx + 1})` : "";
      out.push(
        ...eventLines({
          uid: `${baseUid}-${phase}-${idx}@ehs.portal`,
          summary: `${venue} — ${PHASE_LABELS[phase]}${dayLabel}`,
          description,
          location: venue,
          segment: seg,
          stamp,
        }),
      );
    });
  }
  return out;
}

/** Build an iCal (.ics) string for a brief. One VEVENT per phase
 *  segment; falls back to a single VEVENT covering the show date(s)
 *  when no schedule is present. */
export function briefToIcs(brief: ProjectBrief): string {
  const stamp = Date.now();
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//EHS Production Tool//Freelancer Portal//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
  ];
  const schedule = brief.project.schedule;
  if (schedule && PHASE_KEYS.some((k) => (schedule[k] ?? []).length > 0)) {
    lines.push(...scheduleEvents(brief, schedule, brief.briefId, stamp));
  } else if (brief.project.date) {
    // No schedule — synthesize a single event from the show date range.
    const seg: BriefScheduleSegment = {
      from: brief.project.date,
      to: brief.project.endDate || brief.project.date,
    };
    const venue = brief.project.venue || "Show";
    lines.push(
      ...eventLines({
        uid: `${brief.briefId}-show@ehs.portal`,
        summary: venue,
        description: brief.project.preparedBy
          ? `Project manager: ${brief.project.preparedBy}`
          : "",
        location: venue,
        segment: seg,
        stamp,
      }),
    );
  }
  lines.push("END:VCALENDAR");
  return lines.join("\r\n") + "\r\n";
}

/** Trigger a browser download of a .ics file. */
export function downloadBriefIcs(brief: ProjectBrief): void {
  triggerIcsDownload(briefToIcs(brief), brief);
}

/** Minimal shape of one itinerary day used by the export. Intentionally
 *  narrower than the server's ItineraryDay so the export logic doesn't
 *  break when the API response evolves with extra fields — we only
 *  consume what we put on the calendar. */
export type ItineraryHotelDay = {
  date: string;
  hotel?: {
    isCheckIn?: boolean;
    isCheckOut?: boolean;
    roomKey?: string | null;
    roommateName?: string | null;
    locked?: boolean;
  };
};

/** Build a single line of "Room A2 with Maria — locked" — the parts
 *  that are useful to a freelancer's calendar viewer. Empty string if
 *  none of the optional bits are present, so the caller can decide
 *  whether to emit a DESCRIPTION at all. */
function hotelDescription(
  hotel: NonNullable<ItineraryHotelDay["hotel"]>,
): string {
  const parts: string[] = [];
  if (hotel.roomKey) parts.push(`Room ${hotel.roomKey}`);
  if (hotel.roommateName) parts.push(`Roommate: ${hotel.roommateName}`);
  if (hotel.locked) parts.push("(locked)");
  return parts.join("\n");
}

/** Emit hotel VEVENTs from the itinerary days. Two all-day events:
 *  one for check-in day, one for check-out day. We use the boolean
 *  flags from the rollup rather than recomputing date math here so
 *  the server stays the source of truth on which day is which.
 *
 *  We intentionally do NOT emit a single multi-day "Hotel stay" event
 *  — calendar UIs render a 5-day all-day event as a giant banner that
 *  hides the actual show events underneath. Two single-day markers
 *  for arrival + departure are visually less noisy and match how
 *  travel itineraries are usually communicated. */
function hotelEvents(
  brief: ProjectBrief,
  itineraryDays: ItineraryHotelDay[],
  stamp: number,
): string[] {
  const venue = brief.project.venue || "Show";
  const out: string[] = [];
  for (const d of itineraryDays) {
    if (!d.hotel) continue;
    const desc = hotelDescription(d.hotel);
    if (d.hotel.isCheckIn) {
      out.push(
        ...eventLines({
          uid: `${brief.briefId}-hotel-checkin-${d.date}@ehs.portal`,
          summary: `Hotel check-in — ${venue}`,
          description: desc,
          location: venue,
          // All-day segment: from = to = the check-in date.
          segment: { from: d.date, to: d.date },
          stamp,
        }),
      );
    }
    if (d.hotel.isCheckOut) {
      out.push(
        ...eventLines({
          uid: `${brief.briefId}-hotel-checkout-${d.date}@ehs.portal`,
          summary: `Hotel check-out — ${venue}`,
          description: desc,
          location: venue,
          segment: { from: d.date, to: d.date },
          stamp,
        }),
      );
    }
  }
  return out;
}

/** Build an iCal (.ics) string for a brief PLUS the freelancer's
 *  itinerary. Identical to `briefToIcs` for the production schedule
 *  events, then appends hotel check-in / check-out VEVENTs derived
 *  from the per-day itinerary returned by
 *  `GET /api/portal/briefs/:id/itinerary`. */
export function briefAndItineraryToIcs(
  brief: ProjectBrief,
  itineraryDays: ItineraryHotelDay[],
): string {
  const base = briefToIcs(brief);
  // briefToIcs ends with "END:VCALENDAR\r\n" — splice the hotel lines
  // in just before that closing tag so the calendar stays valid.
  const closing = "END:VCALENDAR";
  const idx = base.lastIndexOf(closing);
  if (idx < 0) return base; // defensive — shouldn't happen
  const stamp = Date.now();
  const extraLines = hotelEvents(brief, itineraryDays, stamp);
  if (extraLines.length === 0) return base;
  const head = base.slice(0, idx);
  const tail = base.slice(idx);
  return head + extraLines.join("\r\n") + "\r\n" + tail;
}

/** Trigger a browser download of a .ics file enriched with itinerary
 *  hotel events. Falls back to the brief-only export when the
 *  itinerary is empty or has no hotel days, so the caller can
 *  unconditionally route through this path. */
export function downloadBriefAndItineraryIcs(
  brief: ProjectBrief,
  itineraryDays: ItineraryHotelDay[],
): void {
  triggerIcsDownload(briefAndItineraryToIcs(brief, itineraryDays), brief);
}

/** Internal: turn an ics string into a click-triggered download. */
function triggerIcsDownload(ics: string, brief: ProjectBrief): void {
  const venue = (brief.project.venue || "show").replace(/[^a-z0-9-_]+/gi, "-");
  const filename = `${venue}-${brief.briefId}.ics`;
  const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Defer revoke so Safari has a chance to start the download.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
