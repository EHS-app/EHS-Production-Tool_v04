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
  setCrewShiftPhaseSelection,
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