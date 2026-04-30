import { test } from "node:test";
import assert from "node:assert/strict";
import { rollupItinerary, type RollupInput } from "./itineraryRollup.ts";

/** Compact sample brief — three-day show on May 1-3 with a setup
 *  segment on Apr 30 and a downrig on May 4. */
function sampleBrief(): RollupInput["brief"] {
  return {
    project: {
      venue: "Oslo Spektrum",
      date: "2026-04-30",
      endDate: "2026-05-04",
      schedule: {
        setup: [{ from: "2026-04-30", to: "2026-04-30", fromTime: "09:00" }],
        show: [
          {
            from: "2026-05-01",
            to: "2026-05-03",
            fromTime: "18:00",
            toTime: "23:30",
          },
        ],
        downrig: [{ from: "2026-05-04", to: "2026-05-04" }],
      },
    },
  };
}

test("empty input → empty array", () => {
  const out = rollupItinerary({
    brief: { project: { venue: "", date: "", endDate: null } },
    callerAssignment: null,
    callerWorkingDates: [],
    callerHotel: null,
  });
  assert.deepEqual(out, []);
});

test("day range spans brief.project.date..endDate when caller has no other dates", () => {
  const out = rollupItinerary({
    brief: sampleBrief(),
    callerAssignment: null,
    callerWorkingDates: [],
    callerHotel: null,
  });
  // Apr 30 → May 4 = 5 days
  assert.equal(out.length, 5);
  assert.equal(out[0]!.date, "2026-04-30");
  assert.equal(out[out.length - 1]!.date, "2026-05-04");
});

test("working flag is true only on caller's assigned dates", () => {
  const out = rollupItinerary({
    brief: sampleBrief(),
    callerAssignment: { callTime: "16:00", offTime: "00:30" },
    callerWorkingDates: ["2026-05-02", "2026-05-03"],
    callerHotel: null,
  });
  const byDate = new Map(out.map((d) => [d.date, d]));
  assert.equal(byDate.get("2026-04-30")!.working, false);
  assert.equal(byDate.get("2026-05-01")!.working, false);
  assert.equal(byDate.get("2026-05-02")!.working, true);
  assert.equal(byDate.get("2026-05-03")!.working, true);
  assert.equal(byDate.get("2026-05-04")!.working, false);
});

test("call/off times only show on working days", () => {
  const out = rollupItinerary({
    brief: sampleBrief(),
    callerAssignment: { callTime: "16:00", offTime: "00:30" },
    callerWorkingDates: ["2026-05-02"],
    callerHotel: null,
  });
  const byDate = new Map(out.map((d) => [d.date, d]));
  assert.equal(byDate.get("2026-05-01")!.callTime, undefined);
  assert.equal(byDate.get("2026-05-02")!.callTime, "16:00");
  assert.equal(byDate.get("2026-05-02")!.offTime, "00:30");
  assert.equal(byDate.get("2026-05-03")!.callTime, undefined);
});

test("phases include all segments active on the date", () => {
  const out = rollupItinerary({
    brief: sampleBrief(),
    callerAssignment: null,
    callerWorkingDates: [],
    callerHotel: null,
  });
  const byDate = new Map(out.map((d) => [d.date, d]));
  // Apr 30: setup only
  assert.deepEqual(
    byDate.get("2026-04-30")!.phases.map((p) => p.phaseKey),
    ["setup"],
  );
  // May 2 (mid-show): show only
  assert.deepEqual(
    byDate.get("2026-05-02")!.phases.map((p) => p.phaseKey),
    ["show"],
  );
  // Show segment carries times
  const showPhase = byDate.get("2026-05-02")!.phases[0]!;
  assert.equal(showPhase.fromTime, "18:00");
  assert.equal(showPhase.toTime, "23:30");
  // May 4: downrig only
  assert.deepEqual(
    byDate.get("2026-05-04")!.phases.map((p) => p.phaseKey),
    ["downrig"],
  );
  // May 1 is the FIRST day of the show segment (from: "2026-05-01")
  // so it should report show, not be empty.
  assert.deepEqual(
    byDate.get("2026-05-01")!.phases.map((p) => p.phaseKey),
    ["show"],
  );
});

test("hotel: stayingTonight is true on nights between checkIn and checkOut, false on checkOut morning", () => {
  const out = rollupItinerary({
    brief: sampleBrief(),
    callerAssignment: null,
    callerWorkingDates: ["2026-05-02"],
    callerHotel: {
      checkInDate: "2026-05-01",
      checkOutDate: "2026-05-04",
      roomKey: "A2",
      roomLocked: false,
      roommateName: null,
    },
  });
  const byDate = new Map(out.map((d) => [d.date, d]));
  // Apr 30: before check-in → no hotel block
  assert.equal(byDate.get("2026-04-30")!.hotel, undefined);
  // May 1: check-in day, sleeping there tonight
  assert.equal(byDate.get("2026-05-01")!.hotel?.isCheckIn, true);
  assert.equal(byDate.get("2026-05-01")!.hotel?.stayingTonight, true);
  assert.equal(byDate.get("2026-05-01")!.hotel?.isCheckOut, false);
  // May 2 + May 3: pure stay nights
  assert.equal(byDate.get("2026-05-02")!.hotel?.stayingTonight, true);
  assert.equal(byDate.get("2026-05-02")!.hotel?.isCheckIn, false);
  assert.equal(byDate.get("2026-05-03")!.hotel?.stayingTonight, true);
  // May 4: check-out morning, NOT staying that night
  assert.equal(byDate.get("2026-05-04")!.hotel?.isCheckOut, true);
  assert.equal(byDate.get("2026-05-04")!.hotel?.stayingTonight, false);
  // After check-out: nothing
  assert.equal(byDate.get("2026-05-04")!.hotel?.isCheckIn, false);
});

test("hotel: roomKey + roommateName threaded through verbatim", () => {
  const out = rollupItinerary({
    brief: sampleBrief(),
    callerAssignment: null,
    callerWorkingDates: [],
    callerHotel: {
      checkInDate: "2026-05-01",
      checkOutDate: "2026-05-02",
      roomKey: "B7",
      roomLocked: true,
      roommateName: "Maria",
    },
  });
  const day = out.find((d) => d.date === "2026-05-01")!;
  assert.equal(day.hotel?.roomKey, "B7");
  assert.equal(day.hotel?.roommateName, "Maria");
  assert.equal(day.hotel?.locked, true);
});

test("hotel block omitted entirely when caller has no hotel for the trip", () => {
  const out = rollupItinerary({
    brief: sampleBrief(),
    callerAssignment: null,
    callerWorkingDates: ["2026-05-02"],
    callerHotel: null,
  });
  for (const d of out) assert.equal(d.hotel, undefined);
});

test("day range expands to cover hotel checkIn..checkOut even if the brief is shorter", () => {
  const tinyBrief: RollupInput["brief"] = {
    project: { venue: "X", date: "2026-05-02", endDate: "2026-05-02" },
  };
  const out = rollupItinerary({
    brief: tinyBrief,
    callerAssignment: null,
    callerWorkingDates: [],
    callerHotel: {
      // Freelancer arrives a day early and leaves a day late
      checkInDate: "2026-05-01",
      checkOutDate: "2026-05-03",
      roomKey: null,
      roomLocked: false,
      roommateName: null,
    },
  });
  assert.equal(out.length, 3);
  assert.equal(out[0]!.date, "2026-05-01");
  assert.equal(out[2]!.date, "2026-05-03");
});

test("malformed brief dates do not widen the range", () => {
  const out = rollupItinerary({
    brief: {
      project: {
        venue: "X",
        date: "garbage",
        endDate: "also-garbage",
      },
    },
    callerAssignment: null,
    callerWorkingDates: ["2026-05-02"],
    callerHotel: null,
  });
  assert.equal(out.length, 1);
  assert.equal(out[0]!.date, "2026-05-02");
});

test("dayOfWeek matches calendar (May 1 2026 is a Friday)", () => {
  const out = rollupItinerary({
    brief: {
      project: { venue: "X", date: "2026-05-01", endDate: "2026-05-01" },
    },
    callerAssignment: null,
    callerWorkingDates: [],
    callerHotel: null,
  });
  assert.equal(out[0]!.dayOfWeek, "Fri");
});

test("year-long range guard caps iteration", () => {
  const out = rollupItinerary({
    brief: {
      project: { venue: "X", date: "2026-01-01", endDate: "2030-01-01" },
    },
    callerAssignment: null,
    callerWorkingDates: [],
    callerHotel: null,
  });
  // Hard ceiling at 365.
  assert.ok(out.length <= 365);
});
