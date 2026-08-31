import assert from "node:assert/strict";
import test from "node:test";
import { isPublicAddress, parseIcsBusy } from "./calendarSync";
import { calendarFeed } from "./calendarIcs";
import {
  expandWeeklyRuleOccurrences,
  localDateRangeToInstants,
  overlapsHalfOpen,
  parseCalendarInstant,
  weeklyRuleMatchesDateRange,
} from "./calendarTime";

const windowStart = new Date("2025-03-20T00:00:00Z");
const windowEnd = new Date("2025-04-10T00:00:00Z");
const calendar = (events: string) =>
  `BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//test//EN\r\n${events}\r\nEND:VCALENDAR`;

test("Europe/Oslo weekly recurrence retains wall time across DST", () => {
  const ranges = parseIcsBusy(
    calendar(
      `BEGIN:VEVENT\r\nUID:dst\r\nDTSTAMP:20250101T000000Z\r\nDTSTART;TZID=Europe/Oslo:20250323T100000\r\nDTEND;TZID=Europe/Oslo:20250323T110000\r\nRRULE:FREQ=WEEKLY;COUNT=3\r\nEND:VEVENT`,
    ),
    windowStart,
    windowEnd,
  );
  assert.deepEqual(
    ranges.map((r) => r.startsAt.toISOString()),
    [
      "2025-03-23T09:00:00.000Z",
      "2025-03-30T08:00:00.000Z",
      "2025-04-06T08:00:00.000Z",
    ],
  );
});

test("EXDATE removes a recurrence", () => {
  const ranges = parseIcsBusy(
    calendar(
      `BEGIN:VEVENT\r\nUID:ex\r\nDTSTAMP:20250101T000000Z\r\nDTSTART:20250323T100000Z\r\nDTEND:20250323T110000Z\r\nRRULE:FREQ=WEEKLY;COUNT=3\r\nEXDATE:20250330T100000Z\r\nEND:VEVENT`,
    ),
    windowStart,
    windowEnd,
  );
  assert.equal(ranges.length, 2);
});

test("cancelled recurrence override is omitted", () => {
  const ranges = parseIcsBusy(
    calendar(
      `BEGIN:VEVENT\r\nUID:cancel\r\nDTSTAMP:20250101T000000Z\r\nDTSTART:20250323T100000Z\r\nDTEND:20250323T110000Z\r\nRRULE:FREQ=WEEKLY;COUNT=3\r\nEND:VEVENT\r\nBEGIN:VEVENT\r\nUID:cancel\r\nDTSTAMP:20250101T000000Z\r\nRECURRENCE-ID:20250330T100000Z\r\nDTSTART:20250330T100000Z\r\nDTEND:20250330T110000Z\r\nSTATUS:CANCELLED\r\nEND:VEVENT`,
    ),
    windowStart,
    windowEnd,
  );
  assert.equal(ranges.length, 2);
});

test("all-day DTEND remains exclusive", () => {
  const [range] = parseIcsBusy(
    calendar(
      `BEGIN:VEVENT\r\nUID:day\r\nDTSTAMP:20250101T000000Z\r\nDTSTART;VALUE=DATE:20250325\r\nDTEND;VALUE=DATE:20250327\r\nEND:VEVENT`,
    ),
    windowStart,
    windowEnd,
  );
  assert.equal(range.startsAt.toISOString(), "2025-03-25T00:00:00.000Z");
  assert.equal(range.endsAt.toISOString(), "2025-03-27T00:00:00.000Z");
});

test("address classifier rejects private, metadata and mapped private ranges", () => {
  for (const address of [
    "127.0.0.1",
    "10.0.0.1",
    "169.254.169.254",
    "192.168.1.2",
    "::1",
    "fe80::1",
    "::ffff:127.0.0.1",
    "::ffff:a9fe:a9fe",
    "0:0:0:0:0:ffff:7f00:1",
    "0:0:0:0:0:ffff:a9fe:a9fe",
    "::127.0.0.1",
    "fc00::1",
    "fd12:3456::1",
    "fec0::1",
    "2002:7f00:1::1",
  ])
    assert.equal(isPublicAddress(address), false, address);
  for (const address of ["8.8.8.8", "1.1.1.1", "2606:4700:4700::1111"])
    assert.equal(isPublicAddress(address), true, address);
});

test("calendar writes require an explicit RFC3339 offset", () => {
  assert.equal(parseCalendarInstant("2026-09-15T08:00:00"), null);
  assert.equal(parseCalendarInstant("2026-09-15"), null);
  assert.equal(
    parseCalendarInstant("2026-09-15T08:00:00+02:00")?.toISOString(),
    "2026-09-15T06:00:00.000Z",
  );
  assert.equal(
    parseCalendarInstant("2026-09-15T06:00:00Z")?.toISOString(),
    "2026-09-15T06:00:00.000Z",
  );
});

test("half-open adjacent intervals do not overlap", () => {
  const firstStart = new Date("2026-09-15T08:00:00Z");
  const boundary = new Date("2026-09-15T12:00:00Z");
  const secondEnd = new Date("2026-09-15T16:00:00Z");
  assert.equal(
    overlapsHalfOpen(firstStart, boundary, boundary, secondEnd),
    false,
  );
  assert.equal(
    overlapsHalfOpen(
      firstStart,
      new Date("2026-09-15T12:00:00.001Z"),
      boundary,
      secondEnd,
    ),
    true,
  );
});

test("weekly rules match local date labels west of UTC", () => {
  const result = weeklyRuleMatchesDateRange(
    {
      weekday: 1,
      startMinute: 0,
      endMinute: 1440,
      timezone: "America/New_York",
      startsOn: new Date("2026-11-02T05:00:00.000Z"),
      until: new Date("2026-11-03T04:59:59.000Z"),
    },
    "2026-11-02",
    "2026-11-02",
  );
  assert.deepEqual(result, { matches: true, fullDay: true });
});

test("weekly rules match local date labels east of UTC across DST", () => {
  const result = weeklyRuleMatchesDateRange(
    {
      weekday: 1,
      startMinute: 480,
      endMinute: 720,
      timezone: "Europe/Oslo",
      startsOn: new Date("2026-03-29T22:00:00.000Z"),
      until: new Date("2026-04-27T21:59:59.000Z"),
    },
    "2026-03-30",
    "2026-03-30",
  );
  assert.deepEqual(result, { matches: true, fullDay: false });
});

test("calendar export preserves all-day gigs and timed holds", () => {
  const feed = calendarFeed([
    {
      uid: "gig-1@ehs",
      start: new Date("2026-09-15T00:00:00.000Z"),
      end: new Date("2026-09-16T00:00:00.000Z"),
      summary: "All-day gig",
      allDay: true,
    },
    {
      uid: "hold-1@ehs",
      start: new Date("2026-09-15T11:00:00.000Z"),
      end: new Date("2026-09-15T15:00:00.000Z"),
      summary: "Timed hold",
      allDay: false,
    },
  ]);
  assert.match(feed, /DTSTART;VALUE=DATE:20260915\r\nDTEND;VALUE=DATE:20260916/);
  assert.match(feed, /DTSTART:20260915T110000Z\r\nDTEND:20260915T150000Z/);
});

test("timed export keeps UTC instants across a local-date boundary", () => {
  const feed = calendarFeed([
    {
      uid: "hold-boundary@ehs",
      start: new Date("2026-10-24T22:30:00.000Z"),
      end: new Date("2026-10-25T02:30:00.000Z"),
      summary: "Cross-boundary hold",
      allDay: false,
    },
  ]);
  assert.match(feed, /DTSTART:20261024T223000Z/);
  assert.match(feed, /DTEND:20261025T023000Z/);
  assert.doesNotMatch(feed, /UID:hold-boundary@ehs[\s\S]*?VALUE=DATE/);
});

test("local date ranges include late-day New York intervals", () => {
  const bounds = localDateRangeToInstants(
    "2026-11-02",
    "2026-11-02",
    "America/New_York",
  );
  assert.equal(bounds.from.toISOString(), "2026-11-02T05:00:00.000Z");
  assert.equal(bounds.to.toISOString(), "2026-11-03T05:00:00.000Z");
  assert.equal(
    overlapsHalfOpen(
      new Date("2026-11-03T01:00:00.000Z"),
      new Date("2026-11-03T03:00:00.000Z"),
      bounds.from,
      bounds.to,
    ),
    true,
  );
});

test("local Oslo date range respects the spring DST boundary", () => {
  const bounds = localDateRangeToInstants(
    "2026-03-29",
    "2026-03-29",
    "Europe/Oslo",
  );
  assert.equal(bounds.from.toISOString(), "2026-03-28T23:00:00.000Z");
  assert.equal(bounds.to.toISOString(), "2026-03-29T22:00:00.000Z");
});

test("weekly endpoint expansion retains Oslo Mondays across DST", () => {
  const occurrences = expandWeeklyRuleOccurrences(
    {
      weekday: 1,
      startMinute: 480,
      endMinute: 720,
      timezone: "Europe/Oslo",
      startsOn: new Date("2026-03-22T23:00:00.000Z"),
      until: new Date("2026-04-13T21:59:59.000Z"),
    },
    "2026-03-23",
    "2026-04-13",
  );
  assert.deepEqual(
    occurrences.map((item) => [
      item.date,
      item.startsAt.toISOString(),
    ]),
    [
      ["2026-03-23", "2026-03-23T07:00:00.000Z"],
      ["2026-03-30", "2026-03-30T06:00:00.000Z"],
      ["2026-04-06", "2026-04-06T06:00:00.000Z"],
      ["2026-04-13", "2026-04-13T06:00:00.000Z"],
    ],
  );
});

test("weekly endpoint expansion retains New York Mondays", () => {
  const [occurrence] = expandWeeklyRuleOccurrences(
    {
      weekday: 1,
      startMinute: 1200,
      endMinute: 1380,
      timezone: "America/New_York",
      startsOn: new Date("2026-11-02T05:00:00.000Z"),
      until: new Date("2026-11-03T04:59:59.000Z"),
    },
    "2026-11-02",
    "2026-11-02",
  );
  assert.equal(occurrence.date, "2026-11-02");
  assert.equal(occurrence.startsAt.toISOString(), "2026-11-03T01:00:00.000Z");
});
