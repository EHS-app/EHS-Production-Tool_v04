import { test } from "node:test";
import assert from "node:assert/strict";

import {
  formatHumanDate,
  formatPhaseTime,
  hotelLineForDay,
} from "./itineraryFormat.ts";

// ---------- formatHumanDate ----------

test("formatHumanDate renders a localised date including the weekday", () => {
  // Pin the locale so the assertion is deterministic across CI machines
  // (the production code uses the browser locale by default).
  const out = formatHumanDate("2026-05-04", "en-US");
  // "Mon, May 4, 2026" — but Intl output varies by ICU version, so
  // we just assert the salient pieces are present rather than the
  // exact punctuation/spacing.
  assert.match(out, /Mon/);
  assert.match(out, /May/);
  assert.match(out, /4/);
  assert.match(out, /2026/);
});

test("formatHumanDate uses UTC so the date doesn't drift across time zones", () => {
  // Without `timeZone: "UTC"`, the input "2026-01-01" can be rendered
  // as 31 Dec 2025 in negative-offset zones. Assert the year survives.
  const out = formatHumanDate("2026-01-01", "en-US");
  assert.match(out, /2026/);
  assert.match(out, /Jan/);
});

test("formatHumanDate falls back to the raw ISO string for malformed input", () => {
  assert.equal(formatHumanDate("not-a-date", "en-US"), "not-a-date");
  assert.equal(formatHumanDate("2026-13-99", "en-US"), "2026-13-99");
});

// ---------- formatPhaseTime ----------

test("formatPhaseTime renders both sides as a from–to en-dash range", () => {
  assert.equal(formatPhaseTime("09:00", "18:00"), "09:00\u201318:00");
});

test("formatPhaseTime renders the from-time with a trailing arrow when to is missing", () => {
  // Symmetric counterpart to the to-only case below — using an arrow
  // glyph (rather than an English word) keeps the row locale-neutral
  // so it doesn't reintroduce mixed-language strings on a Norwegian
  // browser that's already showing a localised date.
  assert.equal(formatPhaseTime("09:00", undefined), "09:00\u2009\u2192");
  assert.equal(formatPhaseTime("09:00"), "09:00\u2009\u2192");
});

test("formatPhaseTime renders a leading arrow when only to is set", () => {
  // Regression: original inline formatter rendered "(–18:00)" which
  // looked like a malformed range. Intermediate fix used English
  // "until 18:00" but that mixed languages on a Norwegian browser.
  // Final form is a locale-neutral arrow glyph.
  assert.equal(formatPhaseTime(undefined, "18:00"), "\u2192\u200918:00");
});

test("formatPhaseTime never embeds a locale-specific qualifier word", () => {
  // Guard against a future regression where someone reintroduces
  // an English (or any other natural-language) qualifier and
  // re-creates the mixed-language UI we just removed.
  for (const out of [
    formatPhaseTime("09:00", "18:00"),
    formatPhaseTime("09:00", undefined),
    formatPhaseTime(undefined, "18:00"),
  ]) {
    assert.ok(out !== null);
    assert.doesNotMatch(out!, /[A-Za-z]/);
  }
});

test("formatPhaseTime returns null when both sides are missing or blank", () => {
  assert.equal(formatPhaseTime(undefined, undefined), null);
  assert.equal(formatPhaseTime("", ""), null);
  assert.equal(formatPhaseTime("   ", "   "), null);
});

test("formatPhaseTime trims whitespace before deciding which side is set", () => {
  assert.equal(formatPhaseTime("  09:00  ", " 18:00 "), "09:00\u201318:00");
  assert.equal(formatPhaseTime("  ", "18:00"), "\u2192\u200918:00");
});

// ---------- hotelLineForDay ----------

test("hotelLineForDay on check-out morning includes the room number for expense reports", () => {
  const out = hotelLineForDay({
    stayingTonight: false,
    isCheckIn: false,
    isCheckOut: true,
    roomKey: "203",
    roommateName: "Olav Berg",
    locked: true,
  });
  assert.equal(out, "Check-out this morning \u00b7 Room 203");
});

test("hotelLineForDay on check-out morning falls back gracefully without a room number", () => {
  const out = hotelLineForDay({
    stayingTonight: false,
    isCheckIn: false,
    isCheckOut: true,
  });
  assert.equal(out, "Check-out this morning");
});

test("hotelLineForDay on a normal night shows room and roommate", () => {
  const out = hotelLineForDay({
    stayingTonight: true,
    isCheckIn: false,
    isCheckOut: false,
    roomKey: "203",
    roommateName: "Olav Berg",
  });
  assert.equal(out, "Room 203 with Olav Berg");
});

test("hotelLineForDay drops the roommate clause when nobody else is paired in", () => {
  const out = hotelLineForDay({
    stayingTonight: true,
    isCheckIn: false,
    isCheckOut: false,
    roomKey: "203",
    roommateName: null,
  });
  assert.equal(out, "Room 203");
});

test("hotelLineForDay falls back to 'Room TBD' before the producer assigns a room", () => {
  const out = hotelLineForDay({
    stayingTonight: true,
    isCheckIn: true,
    isCheckOut: false,
    roommateName: null,
  });
  assert.equal(out, "Room TBD");
});

test("hotelLineForDay never leaks the '(locked)' producer-side jargon", () => {
  // Regression: the previous renderer appended "(locked)" to the
  // freelancer-facing line, which is meaningless to a freelancer
  // reading their own itinerary. The room-pairing lock is a
  // producer-side concept only.
  const out = hotelLineForDay({
    stayingTonight: true,
    isCheckIn: false,
    isCheckOut: false,
    roomKey: "203",
    roommateName: "Olav Berg",
    locked: true,
  });
  assert.doesNotMatch(out, /lock/i);
});

test("hotelLineForDay never duplicates the check-in chip text inline", () => {
  // Regression: the previous renderer appended "· check-in today" on
  // check-in days, which duplicated the chip already rendered above.
  const out = hotelLineForDay({
    stayingTonight: true,
    isCheckIn: true,
    isCheckOut: false,
    roomKey: "203",
    roommateName: "Olav Berg",
  });
  assert.doesNotMatch(out, /check-in/i);
});

test("hotelLineForDay defensively renders something for a not-staying-tonight day that's not check-out", () => {
  const out = hotelLineForDay({
    stayingTonight: false,
    isCheckIn: false,
    isCheckOut: false,
  });
  assert.equal(out, "Not staying tonight");
});
