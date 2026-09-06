import assert from "node:assert/strict";
import { test } from "node:test";
import type { RosterRow } from "./crewRoster.ts";
import { dailyCallSheetHtml } from "./dailyCallSheetExport.ts";

const row = (patch: Partial<RosterRow> = {}): RosterRow => ({
  source: "gig",
  id: "gig-1",
  gigId: "gig-1",
  freelancerUserId: "user-1",
  name: "Alex & Co",
  role: "Lighting",
  status: "partially_accepted",
  assignedDates: ["2026-06-01"],
  callTime: "",
  offTime: "",
  assignedShiftPhases: ["2026-06-01::setup", "2026-06-01::show"],
  assignedShiftTimes: {},
  assignedShiftWindows: {
    "2026-06-01::setup": [{ startTime: "08:00", endTime: "12:00" }],
    "2026-06-01::show": [{ startTime: "18:00", endTime: "23:00" }],
  },
  assignedShiftTasks: {
    "2026-06-01::setup": ["Build & test"],
    "2026-06-01::show": ["Declined task must not print"],
  },
  shiftResponses: {
    "2026-06-01::setup::0": "accepted",
    "2026-06-01::show::0": "declined",
  },
  hotelRequired: false,
  hotelDates: [],
  dietaryTags: [],
  allergens: [],
  profileless: false,
  phone: "",
  roomKey: null,
  roommateName: null,
  dayRate: 0,
  notes: "",
  ...patch,
});

test("daily call sheet excludes declined windows and their phase tasks", () => {
  const html = dailyCallSheetHtml({
    date: "2026-06-01",
    projectName: "<Project>",
    rows: [row()],
  });
  assert.match(html, /08:00–12:00/);
  assert.doesNotMatch(html, /18:00–23:00/);
  assert.match(html, /Build &amp; test/);
  assert.doesNotMatch(html, /Declined task must not print/);
  assert.match(html, /&lt;Project&gt;/);
  assert.match(html, /Alex &amp; Co/);
});

test("daily call sheet excludes pending and declined crew rows", () => {
  const html = dailyCallSheetHtml({
    date: "2026-06-01",
    rows: [row({ status: "requested" }), row({ id: "gig-2", status: "declined" })],
  });
  assert.match(html, /No confirmed, accepted, or partially accepted crew/);
  assert.doesNotMatch(html, /Alex &amp; Co/);
});