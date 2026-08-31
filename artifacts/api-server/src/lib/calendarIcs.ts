/** Conservative RFC5545 renderer. Escaping prevents line injection. */
const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/\r?\n/g, "\\n").replace(/[,;]/g, "\\$&");
const stamp = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
export function calendarFeed(events: { uid: string; start: Date; end: Date; summary: string; allDay: boolean; description?: string; sequence?: number; lastModified?: Date }[]): string {
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//EHS//Freelancer Calendar//EN", "CALSCALE:GREGORIAN", "METHOD:PUBLISH"];
  for (const e of events) {
    const start = e.allDay
      ? `DTSTART;VALUE=DATE:${stamp(e.start).slice(0, 8)}`
      : `DTSTART:${stamp(e.start)}`;
    const end = e.allDay
      ? `DTEND;VALUE=DATE:${stamp(e.end).slice(0, 8)}`
      : `DTEND:${stamp(e.end)}`;
    lines.push("BEGIN:VEVENT", `UID:${esc(e.uid)}`, `DTSTAMP:${stamp(new Date())}`, `SEQUENCE:${e.sequence ?? 0}`, `LAST-MODIFIED:${stamp(e.lastModified ?? new Date())}`, start, end, `SUMMARY:${esc(e.summary)}`, ...(e.description ? [`DESCRIPTION:${esc(e.description)}`] : []), "END:VEVENT");
  }
  return `${lines.join("\r\n")}\r\nEND:VCALENDAR\r\n`;
}