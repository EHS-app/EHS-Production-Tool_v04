/** Run with:
 *
 *  node --experimental-strip-types --test \
 *    artifacts/rigging-load-report/src/lib/crewShiftAssignments.test.ts
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  assignedDatesFromShiftPhases,
  crewShiftAssignmentKey,
  filterShiftSelectionsToSchedule,
  scheduledShiftKeys,
  setCrewShiftPhaseSelection,
  shiftTimesForSelections,
  summarizeShiftTimes,
} from "./crewShiftAssignments.ts";

test("deselecting Load-out does not clear Show on the same day", () => {
  const date = "2026-09-12";
  const selected = new Set([
    crewShiftAssignmentKey(date, "show"),
    crewShiftAssignmentKey(date, "downrig"),
  ]);

  const next = setCrewShiftPhaseSelection(
    selected,
    date,
    "downrig",
    false,
  );

  assert.equal(next.has(crewShiftAssignmentKey(date, "downrig")), false);
  assert.equal(next.has(crewShiftAssignmentKey(date, "show")), true);
  assert.deepEqual(assignedDatesFromShiftPhases(next), [date]);
});

test("phase updates remain isolated to their exact day", () => {
  const dayOne = "2026-09-12";
  const dayTwo = "2026-09-13";
  const selected = new Set([
    crewShiftAssignmentKey(dayOne, "show"),
    crewShiftAssignmentKey(dayTwo, "downrig"),
  ]);

  const next = setCrewShiftPhaseSelection(
    selected,
    dayTwo,
    "downrig",
    false,
  );

  assert.equal(next.has(crewShiftAssignmentKey(dayOne, "show")), true);
  assert.equal(next.has(crewShiftAssignmentKey(dayTwo, "downrig")), false);
  assert.deepEqual(assignedDatesFromShiftPhases(next), [dayOne]);
});

test("schedule keys contain only phases explicitly available per date", () => {
  assert.deepEqual(
    scheduledShiftKeys({
      setup: ["2026-09-11"],
      show: ["2026-09-12"],
      downrig: ["2026-09-12"],
    }),
    [
      "2026-09-11::setup",
      "2026-09-12::downrig",
      "2026-09-12::show",
    ],
  );

  const allowed = new Set([
    "2026-09-11::setup",
    "2026-09-12::show",
  ]);
  assert.deepEqual(
    [...filterShiftSelectionsToSchedule(
      [
        "2026-09-11::setup",
        "2026-09-11::show",
        "2026-09-12::show",
      ],
      allowed,
    )].sort(),
    ["2026-09-11::setup", "2026-09-12::show"],
  );
});

test("selected shifts inherit their exact schedule windows", () => {
  const setup = crewShiftAssignmentKey("2026-09-11", "setup");
  const show = crewShiftAssignmentKey("2026-09-12", "show");
  const scheduledTimes = {
    [setup]: { startTime: "07:30", endTime: "16:15" },
    [show]: { startTime: "18:00", endTime: "23:30" },
  };

  assert.deepEqual(
    shiftTimesForSelections([show], scheduledTimes),
    { [show]: scheduledTimes[show] },
  );
  assert.deepEqual(
    summarizeShiftTimes([show], scheduledTimes, {
      startTime: "08:00",
      endTime: "18:00",
    }),
    { startTime: "18:00", endTime: "23:30" },
  );
});

test("overnight windows remain intact in the legacy call/off summary", () => {
  const show = crewShiftAssignmentKey("2026-09-12", "show");
  const loadOut = crewShiftAssignmentKey(
    "2026-09-12",
    "downrig",
  );
  const times = {
    [show]: { startTime: "18:00", endTime: "23:00" },
    [loadOut]: { startTime: "21:00", endTime: "03:00" },
  };

  assert.deepEqual(
    summarizeShiftTimes([show, loadOut], times, {
      startTime: "08:00",
      endTime: "18:00",
    }),
    { startTime: "18:00", endTime: "03:00" },
  );
});