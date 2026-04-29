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
  const ics = briefToIcs(brief);
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
