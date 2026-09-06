import assert from "node:assert/strict";
import { test } from "node:test";
import {
  crewWorkAlerts,
  crewWorkAlertsForSources,
  normalizeAssignmentWindows,
  type AssignmentWindowSource,
} from "./crewRestAlerts.ts";

const base = (patch: Partial<AssignmentWindowSource> = {}): AssignmentWindowSource => ({
  assignedDates: [],
  callTime: "",
  offTime: "",
  assignedShiftTimes: {},
  assignedShiftWindows: {},
  shiftResponses: {},
  ...patch,
});

test("rest alerts span dates and exclude declined windows", () => {
  const row = base({
    assignedShiftWindows: {
      "2026-06-01::show": [{ startTime: "20:00", endTime: "02:00" }],
      "2026-06-02::setup": [{ startTime: "11:00", endTime: "16:00" }],
      "2026-06-02::downrig": [{ startTime: "17:00", endTime: "23:00" }],
    },
    shiftResponses: { "2026-06-02::downrig::0": "declined" },
  });
  assert.deepEqual(normalizeAssignmentWindows(row).map((window) => window.endTime), ["02:00", "16:00"]);
  const alerts = crewWorkAlerts(row);
  assert.equal(alerts.length, 1);
  assert.deepEqual(alerts[0], {
    kind: "turnaround",
    date: "2026-06-02",
    restMinutes: 9 * 60,
    previousEnd: normalizeAssignmentWindows(row)[0],
    nextStart: normalizeAssignmentWindows(row)[1],
  });
});

test("daily alert sums window durations and splits overnight time", () => {
  const alerts = crewWorkAlerts(base({
    assignedShiftWindows: {
      "2026-06-01::setup": [{ startTime: "08:00", endTime: "15:00" }],
      "2026-06-01::show": [{ startTime: "17:00", endTime: "23:30" }],
      "2026-06-02::show": [{ startTime: "20:00", endTime: "02:00" }],
    },
  }));
  assert.ok(alerts.some((alert) =>
    alert.kind === "daily-hours" &&
    alert.date === "2026-06-01" &&
    alert.workedMinutes === 13.5 * 60,
  ));
  assert.equal(alerts.some((alert) => alert.kind === "daily-hours" && alert.date === "2026-06-02"), false);
});

test("same-day split calls do not create turnaround warnings", () => {
  const alerts = crewWorkAlerts(base({
    assignedShiftWindows: {
      "2026-06-01::setup": [
        { startTime: "08:00", endTime: "12:00" },
        { startTime: "17:00", endTime: "21:00" },
      ],
    },
  }));
  assert.equal(alerts.some((alert) => alert.kind === "turnaround"), false);
});

test("multiple role rows aggregate by person without double-counting overlaps", () => {
  const alerts = crewWorkAlertsForSources([
    base({
      assignedShiftWindows: {
        "2026-06-01::setup": [{ startTime: "08:00", endTime: "16:00" }],
      },
    }),
    base({
      assignedShiftWindows: {
        "2026-06-01::show": [{ startTime: "12:00", endTime: "21:00" }],
      },
    }),
  ]);
  const daily = alerts.find(
    (alert) => alert.kind === "daily-hours" && alert.date === "2026-06-01",
  );
  assert.equal(daily?.kind, "daily-hours");
  if (daily?.kind === "daily-hours") assert.equal(daily.workedMinutes, 13 * 60);
});

test("fully declined structured days never fall back to legacy call/off", () => {
  const row = base({
    assignedDates: ["2026-06-01", "2026-06-02"],
    callTime: "08:00",
    offTime: "18:00",
    assignedShiftWindows: {
      "2026-06-01::show": [{ startTime: "18:00", endTime: "23:00" }],
      "2026-06-02::setup": [{ startTime: "09:00", endTime: "17:00" }],
    },
    shiftResponses: {
      "2026-06-01::show::0": "declined",
      "2026-06-02::setup::0": "accepted",
    },
  });
  assert.deepEqual(
    normalizeAssignmentWindows(row).map((window) => [
      window.date,
      window.startTime,
      window.endTime,
    ]),
    [["2026-06-02", "09:00", "17:00"]],
  );
});