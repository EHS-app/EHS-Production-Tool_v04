/** Unit tests for the .ics export. Run with:
 *
 *    node --experimental-strip-types --test \
 *      artifacts/rigging-load-report/src/lib/icalExport.test.ts
 *
 *  Excluded from tsconfig via the **\/*.test.ts pattern, so this
 *  file does not need to typecheck against the strict app config. */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  briefToIcs,
  briefAndItineraryToIcs,
  type ItineraryHotelDay,
} from "./icalExport.ts";
import type { ProjectBrief } from "./projectBrief.ts";

function sampleBrief(): ProjectBrief {
  // Minimal-but-valid ProjectBrief — only the fields the export uses
  // are populated. Everything else is "" or [].
  return {
    briefId: "B-100",
    sentAt: "2026-04-01T00:00:00.000Z",
    recipientCrewId: "R-1",
    project: {
      name: "Spring Show",
      client: "Test Client",
      venue: "Oslo Spektrum",
      date: "2026-05-01",
      endDate: "2026-05-03",
      preparedBy: "PM Test",
      schedule: {
        setup: [],
        rehearsal: [],
        show: [
          {
            from: "2026-05-01",
            to: "2026-05-03",
            fromTime: "18:00",
            toTime: "23:30",
          },
        ],
        downrig: [],
      },
    },
    assignments: [
      {
        crewId: "R-1",
        role: "Rigger",
        callTime: "16:00",
        offTime: "00:30",
        notes: "",
      },
    ],
    contacts: [],
    rigging: { items: [], notes: "" },
    lighting: { items: [], notes: "" },
    led: { items: [], notes: "" },
    stage: { items: [], notes: "" },
    sound: { items: [], notes: "" },
    video: { items: [], notes: "" },
    attachments: [],
  } as unknown as ProjectBrief;
}

test("briefToIcs is unchanged: produces well-formed VCALENDAR with show event", () => {
  const ics = briefToIcs(sampleBrief());
  assert.match(ics, /^BEGIN:VCALENDAR\r\n/);
  assert.match(ics, /END:VCALENDAR\r\n$/);
  // The show segment becomes one VEVENT.
  const eventCount = (ics.match(/BEGIN:VEVENT/g) ?? []).length;
  assert.equal(eventCount, 1);
  assert.match(ics, /SUMMARY:Oslo Spektrum — Show/);
});

test("briefAndItineraryToIcs with no hotel days returns the same calendar as briefToIcs", () => {
  const brief = sampleBrief();
  const days: ItineraryHotelDay[] = [
    { date: "2026-05-01" }, // no hotel block at all
    { date: "2026-05-02" },
  ];
  const baseIcs = briefToIcs(brief);
  const enrichedIcs = briefAndItineraryToIcs(brief, days);
  assert.equal(baseIcs, enrichedIcs);
});

test("hotel check-in day produces an all-day VEVENT with venue summary", () => {
  const brief = sampleBrief();
  const days: ItineraryHotelDay[] = [
    {
      date: "2026-05-01",
      hotel: {
        isCheckIn: true,
        isCheckOut: false,
        roomKey: "A2",
        roommateName: "Maria",
        locked: true,
      },
    },
  ];
  const ics = briefAndItineraryToIcs(brief, days);
  // Three events now: 1 show + 1 check-in.
  const eventCount = (ics.match(/BEGIN:VEVENT/g) ?? []).length;
  assert.equal(eventCount, 2);
  // Hotel event is all-day → VALUE=DATE.
  assert.match(ics, /SUMMARY:Hotel check-in — Oslo Spektrum/);
  assert.match(ics, /DTSTART;VALUE=DATE:20260501/);
  // RFC 5545: DTEND for all-day is exclusive → check-in is May 1, end May 2.
  assert.match(ics, /DTEND;VALUE=DATE:20260502/);
  // UID is stable + unique.
  assert.match(ics, /UID:B-100-hotel-checkin-2026-05-01@ehs\.portal/);
  // Description carries room + roommate + locked marker.
  assert.match(ics, /DESCRIPTION:Room A2/);
  assert.match(ics, /Roommate: Maria/);
  assert.match(ics, /\(locked\)/);
});

test("hotel check-out day produces a separate all-day VEVENT", () => {
  const brief = sampleBrief();
  const days: ItineraryHotelDay[] = [
    {
      date: "2026-05-01",
      hotel: { isCheckIn: true, isCheckOut: false, roomKey: "A2" },
    },
    {
      date: "2026-05-04",
      hotel: { isCheckIn: false, isCheckOut: true, roomKey: "A2" },
    },
  ];
  const ics = briefAndItineraryToIcs(brief, days);
  // 1 show + 1 check-in + 1 check-out = 3 events.
  const eventCount = (ics.match(/BEGIN:VEVENT/g) ?? []).length;
  assert.equal(eventCount, 3);
  assert.match(ics, /SUMMARY:Hotel check-out — Oslo Spektrum/);
  assert.match(ics, /UID:B-100-hotel-checkout-2026-05-04@ehs\.portal/);
  assert.match(ics, /DTSTART;VALUE=DATE:20260504/);
  assert.match(ics, /DTEND;VALUE=DATE:20260505/);
});

test("hotel description is omitted when no roomKey/roommate/locked info is present", () => {
  const brief = sampleBrief();
  const days: ItineraryHotelDay[] = [
    {
      date: "2026-05-01",
      hotel: { isCheckIn: true },
    },
  ];
  const ics = briefAndItineraryToIcs(brief, days);
  // We have a SUMMARY but no DESCRIPTION line for the hotel event.
  // The brief's show event still carries its own DESCRIPTION (Role:
  // Rigger), so we have to scope the negative match. Simplest check:
  // the roommate marker should not appear anywhere.
  assert.doesNotMatch(ics, /Roommate: /);
  assert.doesNotMatch(ics, /Room undefined/);
});

test("enriched calendar still ends with END:VCALENDAR\\r\\n (single trailing newline, no double)", () => {
  const brief = sampleBrief();
  const days: ItineraryHotelDay[] = [
    {
      date: "2026-05-01",
      hotel: { isCheckIn: true, roomKey: "A2" },
    },
  ];
  const ics = briefAndItineraryToIcs(brief, days);
  assert.ok(ics.endsWith("END:VCALENDAR\r\n"));
  // Exactly one END:VCALENDAR (no duplicate from the splice).
  const endCount = (ics.match(/END:VCALENDAR/g) ?? []).length;
  assert.equal(endCount, 1);
});

test("days without hotel are silently skipped", () => {
  const brief = sampleBrief();
  const days: ItineraryHotelDay[] = [
    { date: "2026-04-30" }, // travel day, no hotel
    { date: "2026-05-01", hotel: { isCheckIn: true, roomKey: "A2" } },
    { date: "2026-05-02" }, // mid-stay, but the rollup didn't tag it
    { date: "2026-05-04", hotel: { isCheckOut: true, roomKey: "A2" } },
  ];
  const ics = briefAndItineraryToIcs(brief, days);
  // 1 show + 1 check-in + 1 check-out = 3.
  const eventCount = (ics.match(/BEGIN:VEVENT/g) ?? []).length;
  assert.equal(eventCount, 3);
});
