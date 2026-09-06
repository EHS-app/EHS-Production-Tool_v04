import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { CalendarEntry } from "./types";
import { replaceAvailabilityEntriesInRange } from "./utils";

describe("availability state range replacement", () => {
  it("preserves the rest of an available month when one day becomes busy", () => {
    const month: CalendarEntry = {
      id: "month-available",
      status: "available",
      startAt: "2026-09-01T00:00:00.000Z",
      endAt: "2026-10-01T00:00:00.000Z",
      allDay: true,
    };
    const busyDay: CalendarEntry = {
      id: "day-busy",
      status: "unavailable",
      startAt: "2026-09-15T00:00:00.000Z",
      endAt: "2026-09-16T00:00:00.000Z",
      allDay: true,
    };

    const result = replaceAvailabilityEntriesInRange(
      [month],
      busyDay.startAt,
      busyDay.endAt,
      [busyDay],
    );

    assert.deepEqual(
      result.map(({ status, startAt, endAt }) => ({
        status,
        startAt,
        endAt,
      })),
      [
        {
          status: "available",
          startAt: "2026-09-01T00:00:00.000Z",
          endAt: "2026-09-15T00:00:00.000Z",
        },
        {
          status: "unavailable",
          startAt: "2026-09-15T00:00:00.000Z",
          endAt: "2026-09-16T00:00:00.000Z",
        },
        {
          status: "available",
          startAt: "2026-09-16T00:00:00.000Z",
          endAt: "2026-10-01T00:00:00.000Z",
        },
      ],
    );
    assert.equal(month.endAt, "2026-10-01T00:00:00.000Z");
  });

  it("clears only the selected day without emptying surrounding availability", () => {
    const result = replaceAvailabilityEntriesInRange(
      [
        {
          id: "month-available",
          status: "available",
          startAt: "2026-09-01T00:00:00.000Z",
          endAt: "2026-10-01T00:00:00.000Z",
          allDay: true,
        },
      ],
      "2026-09-15T00:00:00.000Z",
      "2026-09-16T00:00:00.000Z",
      [],
    );

    assert.equal(result.length, 2);
    assert.ok(result.every((entry) => entry.status === "available"));
  });
});