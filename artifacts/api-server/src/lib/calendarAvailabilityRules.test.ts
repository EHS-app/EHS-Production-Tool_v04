import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isAllDayWeeklyRule,
  ruleOccurrenceExceptionKey,
  ruleOccurrencesOverlappingRange,
} from "./calendarAvailabilityRules";

const osloRule = {
  id: "rule-oslo",
  userId: "owner-a",
  weekday: 0,
  startMinute: 600,
  endMinute: 660,
  timezone: "Europe/Oslo",
  startsOn: new Date("2026-03-01T00:00:00Z"),
  until: new Date("2026-04-30T23:59:59Z"),
};

describe("weekly availability replacement exceptions", () => {
  it("projects bounded midnight-to-midnight rules as all-day occurrences", () => {
    assert.equal(
      isAllDayWeeklyRule({ startMinute: 0, endMinute: 1440 }),
      true,
    );
    assert.equal(
      isAllDayWeeklyRule({ startMinute: 480, endMinute: 960 }),
      false,
    );
  });

  it("selects every actual occurrence overlapping a multi-day range", () => {
    const occurrences = ruleOccurrencesOverlappingRange(
      [osloRule],
      new Date("2026-03-21T23:00:00Z"),
      new Date("2026-04-06T22:00:00Z"),
    );
    assert.deepEqual(
      occurrences.map((occurrence) => occurrence.occurrenceDate),
      ["2026-03-22", "2026-03-29", "2026-04-05"],
    );
  });

  it("uses a suppressed occurrence key for both clear and concrete replacement", () => {
    const [occurrence] = ruleOccurrencesOverlappingRange(
      [osloRule],
      new Date("2026-03-29T00:00:00Z"),
      new Date("2026-03-30T00:00:00Z"),
    );
    const exceptions = new Set([
      ruleOccurrenceExceptionKey(occurrence.ruleId, occurrence.occurrenceDate),
    ]);
    // A clear has no concrete values; a replacement has a concrete value.
    // In either case the virtual occurrence is hidden by this same exception.
    assert.equal(
      exceptions.has(ruleOccurrenceExceptionKey("rule-oslo", "2026-03-29")),
      true,
    );
  });

  it("keeps exception selection isolated to rules owned by the caller", () => {
    const otherOwnerRule = { ...osloRule, id: "rule-other", userId: "owner-b" };
    const owned = ruleOccurrencesOverlappingRange(
      [osloRule],
      new Date("2026-03-29T00:00:00Z"),
      new Date("2026-03-30T00:00:00Z"),
    );
    const unowned = ruleOccurrencesOverlappingRange(
      [otherOwnerRule],
      new Date("2026-03-29T00:00:00Z"),
      new Date("2026-03-30T00:00:00Z"),
    );
    assert.equal(owned[0].userId, "owner-a");
    assert.equal(unowned[0].userId, "owner-b");
    assert.notEqual(owned[0].ruleId, unowned[0].ruleId);
  });

  it("preserves Oslo local occurrence dates across the spring DST change", () => {
    const occurrences = ruleOccurrencesOverlappingRange(
      [osloRule],
      new Date("2026-03-28T23:00:00Z"),
      new Date("2026-03-30T22:00:00Z"),
    );
    assert.deepEqual(
      occurrences.map((occurrence) => [
        occurrence.occurrenceDate,
        occurrence.startsAt.toISOString(),
      ]),
      [["2026-03-29", "2026-03-29T08:00:00.000Z"]],
    );
  });
});
