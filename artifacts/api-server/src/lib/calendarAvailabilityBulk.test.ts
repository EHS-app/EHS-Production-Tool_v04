import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isSerializationFailure,
  splitAvailabilityAroundRange,
  validateBulkAvailabilityReplacement,
  type AvailabilityRow,
} from "./calendarAvailabilityBulk";

const ids = () => {
  let value = 0;
  return () => `id-${++value}`;
};
const rangeStart = "2026-09-01T00:00:00Z";
const rangeEnd = "2026-10-01T00:00:00Z";

function parse(entries: unknown[], overrides: Record<string, unknown> = {}) {
  return validateBulkAvailabilityReplacement(
    { rangeStart, rangeEnd, entries, ...overrides },
    "owner-1",
    ids(),
  );
}

function entry(
  startsAt: string,
  endsAt: string,
  extra: Record<string, unknown> = {},
) {
  return {
    status: "available",
    startsAt,
    endsAt,
    timezone: "Europe/Oslo",
    ...extra,
  };
}

describe("bulk availability range replacement", () => {
  it("accepts an empty entry list as an explicit clear-month operation", () => {
    const result = parse([]);
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.deepEqual(result.replacement.values, []);
    assert.equal(
      result.replacement.rangeStart.toISOString(),
      "2026-09-01T00:00:00.000Z",
    );
    assert.equal(
      result.replacement.rangeEnd.toISOString(),
      "2026-10-01T00:00:00.000Z",
    );
  });

  it("splits both sides of a longer interval for a partial-hour range", () => {
    const createdAt = new Date("2026-01-01T00:00:00Z");
    const existing: AvailabilityRow = {
      id: "original",
      userId: "owner-1",
      status: "tentative",
      startsAt: new Date("2026-09-15T08:00:00Z"),
      endsAt: new Date("2026-09-15T18:00:00Z"),
      timezone: "Europe/Oslo",
      allDay: false,
      privateNote: "preserve me",
      createdAt,
    };
    const fragments = splitAvailabilityAroundRange(
      [existing],
      new Date("2026-09-15T10:15:00Z"),
      new Date("2026-09-15T11:45:00Z"),
      ids(),
    );
    assert.deepEqual(
      fragments.map((fragment) => [
        fragment.startsAt.toISOString(),
        fragment.endsAt.toISOString(),
      ]),
      [
        ["2026-09-15T08:00:00.000Z", "2026-09-15T10:15:00.000Z"],
        ["2026-09-15T11:45:00.000Z", "2026-09-15T18:00:00.000Z"],
      ],
    );
    for (const fragment of fragments) {
      assert.equal(fragment.userId, "owner-1");
      assert.equal(fragment.status, "tentative");
      assert.equal(fragment.privateNote, "preserve me");
      assert.equal(fragment.createdAt, createdAt);
    }
  });

  it("accepts a contained multi-day custom range replacement", () => {
    const result = parse(
      [
        entry("2026-09-11T08:00:00+02:00", "2026-09-12T12:00:00+02:00"),
        entry("2026-09-13T08:00:00+02:00", "2026-09-14T12:00:00+02:00", {
          status: "unavailable",
        }),
      ],
      {
        rangeStart: "2026-09-10T00:00:00+02:00",
        rangeEnd: "2026-09-15T00:00:00+02:00",
      },
    );
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.deepEqual(
      result.replacement.values.map(({ userId, status }) => [userId, status]),
      [
        ["owner-1", "available"],
        ["owner-1", "unavailable"],
      ],
    );
  });

  it("rejects overlapping rows but permits half-open adjacency", () => {
    const overlapping = parse([
      entry("2026-09-15T08:00:00Z", "2026-09-15T12:00:00Z"),
      entry("2026-09-15T11:59:59Z", "2026-09-15T14:00:00Z"),
    ]);
    assert.equal(overlapping.ok, false);
    if (!overlapping.ok) assert.match(overlapping.error, /must not overlap/);

    const adjacent = parse([
      entry("2026-09-15T08:00:00Z", "2026-09-15T12:00:00Z"),
      entry("2026-09-15T12:00:00Z", "2026-09-15T14:00:00Z"),
    ]);
    assert.equal(adjacent.ok, true);
  });

  it("rejects malformed timestamps, timezones, and out-of-range rows", () => {
    for (const invalid of [
      entry("2026-09-15T08:00:00", "2026-09-15T09:00:00Z"),
      entry("2026-02-30T08:00:00Z", "2026-09-15T09:00:00Z"),
      entry("2026-09-15T08:00:00Z", "2026-09-15T09:00:00Z", {
        timezone: "Not/A_Zone",
      }),
      entry("2026-08-31T23:00:00Z", "2026-09-01T01:00:00Z"),
    ]) {
      assert.equal(parse([invalid]).ok, false);
    }
    assert.equal(parse([], { rangeStart: "2026-09-01T00:00:00" }).ok, false);
  });

  it("detects direct and wrapped PostgreSQL serialization failures", () => {
    assert.equal(isSerializationFailure({ code: "40001" }), true);
    assert.equal(
      isSerializationFailure({ cause: { cause: { code: "40001" } } }),
      true,
    );
    assert.equal(isSerializationFailure({ code: "23505" }), false);
  });
});
