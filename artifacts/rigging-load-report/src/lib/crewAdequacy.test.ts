/** Unit tests for the crew adequacy meter. Run with:
 *
 *    node --experimental-strip-types --test \
 *      artifacts/rigging-load-report/src/lib/crewAdequacy.test.ts
 *
 *  Excluded from tsconfig via the **\/*.test.ts pattern. */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  computeCrewAdequacy,
  countRosterByAdequacyRole,
  mapRoleToAdequacyKey,
  type AdequacyMetrics,
  type AdequacyRoleKey,
} from "./crewAdequacy.ts";

const ZERO_HEADCOUNT: Record<AdequacyRoleKey, number> = {
  toprigger: 0,
  stagehand: 0,
  ld: 0,
  videoOp: 0,
  fohSound: 0,
  monitorSound: 0,
};

const EMPTY_METRICS: AdequacyMetrics = {
  hoistPoints: 0,
  ledArea: 0,
  stageArea: 0,
  fixtureCount: 0,
  setupDays: 3,
  ledWallCount: 0,
  ticketed: false,
};

function bySingleRole(role: AdequacyRoleKey, count: number) {
  return { ...ZERO_HEADCOUNT, [role]: count };
}

test("computeCrewAdequacy returns zero ranges for an empty project", () => {
  const result = computeCrewAdequacy(EMPTY_METRICS, ZERO_HEADCOUNT);
  for (const s of result.suggestions) {
    assert.equal(s.min, 0, `${s.role} min`);
    assert.equal(s.max, 0, `${s.role} max`);
    assert.equal(s.shortBy, 0);
    assert.equal(s.over, 0);
  }
});

test("computeCrewAdequacy: 60 hoist points → 3 topriggers (60/20)", () => {
  const m = { ...EMPTY_METRICS, hoistPoints: 60 };
  const r = computeCrewAdequacy(m, ZERO_HEADCOUNT);
  const top = r.suggestions.find((s) => s.role === "toprigger")!;
  assert.equal(top.min, 3);
  assert.equal(top.max, 3);
  assert.equal(top.shortBy, 3, "shortBy reports the gap");
});

test("computeCrewAdequacy: 50 hoist points → 2-3 topriggers (floor/ceil window)", () => {
  const m = { ...EMPTY_METRICS, hoistPoints: 50 };
  const r = computeCrewAdequacy(m, ZERO_HEADCOUNT);
  const top = r.suggestions.find((s) => s.role === "toprigger")!;
  assert.equal(top.min, 2);
  assert.equal(top.max, 3);
});

test("computeCrewAdequacy: tight setup adds +1 toprigger and +2 stagehands", () => {
  const m = { ...EMPTY_METRICS, hoistPoints: 60, setupDays: 1 };
  const r = computeCrewAdequacy(m, ZERO_HEADCOUNT);
  const top = r.suggestions.find((s) => s.role === "toprigger")!;
  const sh = r.suggestions.find((s) => s.role === "stagehand")!;
  assert.equal(top.min, 4, "60/20 = 3, plus 1 for tight setup");
  assert.ok(top.modifiers.some((m) => m.includes("Tight setup")));
  // 60 / 7 = 8.57 → [8, 9], plus 2 → [10, 11]
  assert.equal(sh.min, 10);
  assert.equal(sh.max, 11);
});

test("computeCrewAdequacy: tight setup does NOT bump rigging when there are no points", () => {
  const m = { ...EMPTY_METRICS, hoistPoints: 0, setupDays: 1 };
  const r = computeCrewAdequacy(m, ZERO_HEADCOUNT);
  const top = r.suggestions.find((s) => s.role === "toprigger")!;
  assert.equal(top.min, 0);
  assert.equal(top.max, 0);
  assert.equal(top.modifiers.length, 0);
});

test("computeCrewAdequacy: LED > 30 m² adds +1 stagehand", () => {
  const m = { ...EMPTY_METRICS, hoistPoints: 14, ledArea: 35 };
  const r = computeCrewAdequacy(m, ZERO_HEADCOUNT);
  const sh = r.suggestions.find((s) => s.role === "stagehand")!;
  // 14 / 7 = 2 → [2, 2], +1 LED = [3, 3]
  assert.equal(sh.min, 3);
  assert.equal(sh.max, 3);
  assert.ok(sh.modifiers.some((m) => m.includes("LED")));
});

test("computeCrewAdequacy: stage > 80 m² adds +1–2 stagehands (range)", () => {
  const m = { ...EMPTY_METRICS, hoistPoints: 14, stageArea: 100 };
  const r = computeCrewAdequacy(m, ZERO_HEADCOUNT);
  const sh = r.suggestions.find((s) => s.role === "stagehand")!;
  // [2, 2] + [1, 2] = [3, 4]
  assert.equal(sh.min, 3);
  assert.equal(sh.max, 4);
});

test("computeCrewAdequacy: fixtures > 80 adds +1 stagehand", () => {
  const m = { ...EMPTY_METRICS, hoistPoints: 14, fixtureCount: 90 };
  const r = computeCrewAdequacy(m, ZERO_HEADCOUNT);
  const sh = r.suggestions.find((s) => s.role === "stagehand")!;
  // [2, 2] + [1, 1] = [3, 3]
  assert.equal(sh.min, 3);
  assert.equal(sh.max, 3);
  assert.ok(sh.modifiers.some((m) => m.includes("fixtures")));
});

test("computeCrewAdequacy: 1 LD per 60 fixtures, with floor of 1 for any rig", () => {
  const m1 = { ...EMPTY_METRICS, fixtureCount: 30 };
  const r1 = computeCrewAdequacy(m1, ZERO_HEADCOUNT);
  const ld1 = r1.suggestions.find((s) => s.role === "ld")!;
  assert.equal(ld1.min, 1, "30 fixtures still needs 1 LD");
  assert.equal(ld1.max, 1);

  const m2 = { ...EMPTY_METRICS, fixtureCount: 90 };
  const r2 = computeCrewAdequacy(m2, ZERO_HEADCOUNT);
  const ld2 = r2.suggestions.find((s) => s.role === "ld")!;
  assert.equal(ld2.min, 1, "floor of 90/60");
  assert.equal(ld2.max, 2, "ceil of 90/60");
});

test("computeCrewAdequacy: 1 video op per LED wall", () => {
  const m = { ...EMPTY_METRICS, ledWallCount: 3 };
  const r = computeCrewAdequacy(m, ZERO_HEADCOUNT);
  const v = r.suggestions.find((s) => s.role === "videoOp")!;
  assert.equal(v.min, 3);
  assert.equal(v.max, 3);
});

test("computeCrewAdequacy: ticketed shows need 1 FOH + 1 monitor", () => {
  const m = { ...EMPTY_METRICS, ticketed: true };
  const r = computeCrewAdequacy(m, ZERO_HEADCOUNT);
  const foh = r.suggestions.find((s) => s.role === "fohSound")!;
  const mon = r.suggestions.find((s) => s.role === "monitorSound")!;
  assert.deepEqual([foh.min, foh.max], [1, 1]);
  assert.deepEqual([mon.min, mon.max], [1, 1]);
});

test("computeCrewAdequacy: non-ticketed shows do not require dedicated FOH/monitor", () => {
  const r = computeCrewAdequacy({ ...EMPTY_METRICS, ticketed: false }, ZERO_HEADCOUNT);
  const foh = r.suggestions.find((s) => s.role === "fohSound")!;
  assert.equal(foh.min, 0);
  assert.equal(foh.max, 0);
});

test("computeCrewAdequacy: shortBy and over reflect current headcount", () => {
  const m = { ...EMPTY_METRICS, hoistPoints: 60 };
  const r = computeCrewAdequacy(m, bySingleRole("toprigger", 2));
  const top = r.suggestions.find((s) => s.role === "toprigger")!;
  assert.equal(top.shortBy, 1, "min=3, current=2 → short 1");
  assert.equal(top.over, 0);

  const r2 = computeCrewAdequacy(m, bySingleRole("toprigger", 5));
  const top2 = r2.suggestions.find((s) => s.role === "toprigger")!;
  assert.equal(top2.shortBy, 0);
  assert.equal(top2.over, 2, "max=3, current=5 → over by 2");
});

test("computeCrewAdequacy: composite scenario combines all stagehand modifiers", () => {
  // Big-rig tight-setup ticketed show: tests that all the
  // stagehand modifiers stack the way the user described.
  const m: AdequacyMetrics = {
    hoistPoints: 70,
    ledArea: 50,
    stageArea: 120,
    fixtureCount: 100,
    setupDays: 1,
    ledWallCount: 2,
    ticketed: true,
  };
  const r = computeCrewAdequacy(m, ZERO_HEADCOUNT);
  const sh = r.suggestions.find((s) => s.role === "stagehand")!;
  // base 70/7 = 10 → [10, 10]
  // +tight setup: [+2, +2]   → [12, 12]
  // +LED > 30:    [+1, +1]   → [13, 13]
  // +stage > 80:  [+1, +2]   → [14, 15]
  // +fixtures>80: [+1, +1]   → [15, 16]
  assert.equal(sh.min, 15);
  assert.equal(sh.max, 16);
  assert.equal(sh.modifiers.length, 4);
});

test("countRosterByAdequacyRole maps the typical CREW_ROLES strings", () => {
  const counts = countRosterByAdequacyRole([
    "Rigging",
    "Rigging",
    "Stage Hand",
    "Stage",
    "Lighting",
    "Lighting FOH",
    "Video / LED",
    "Sound",
    "AV FOH",
    "Driver", // out of scope
    "Project Manager", // out of scope
  ]);
  assert.equal(counts.toprigger, 2);
  assert.equal(counts.stagehand, 2);
  assert.equal(counts.ld, 2);
  assert.equal(counts.videoOp, 1);
  assert.equal(counts.fohSound, 2, "AV FOH + plain Sound both count as FOH");
});

test("mapRoleToAdequacyKey accepts Norwegian-style synonyms", () => {
  assert.equal(mapRoleToAdequacyKey("Topp rigger"), "toprigger");
  assert.equal(mapRoleToAdequacyKey("monitor sound"), "monitorSound");
  assert.equal(mapRoleToAdequacyKey("LD"), "ld");
});

test("mapRoleToAdequacyKey returns null for out-of-scope roles", () => {
  assert.equal(mapRoleToAdequacyKey("Driver"), null);
  assert.equal(mapRoleToAdequacyKey(""), null);
  assert.equal(mapRoleToAdequacyKey("Other"), null);
});

test("computeCrewAdequacy: any production scope baselines 1 Sound FOH, 1 Lights FOH, 1 AV FOH", () => {
  // Producer rule of thumb: almost every show needs 1 of each FOH.
  // A pure rigging project (no fixtures, no LED, no walls, not
  // ticketed) should still suggest one of each.
  const r = computeCrewAdequacy(
    { ...EMPTY_METRICS, hoistPoints: 20 },
    ZERO_HEADCOUNT,
  );
  const ld = r.suggestions.find((s) => s.role === "ld")!;
  const av = r.suggestions.find((s) => s.role === "videoOp")!;
  const foh = r.suggestions.find((s) => s.role === "fohSound")!;
  assert.deepEqual([ld.min, ld.max], [1, 1], "Lights FOH baseline 1");
  assert.deepEqual([av.min, av.max], [1, 1], "AV FOH baseline 1");
  assert.deepEqual([foh.min, foh.max], [1, 1], "Sound FOH baseline 1");
});

test("computeCrewAdequacy: empty project still produces zero FOH suggestions (no scope = no people)", () => {
  // Guard against the baseline shouting "you're short!" on day-1
  // empty projects.
  const r = computeCrewAdequacy(EMPTY_METRICS, ZERO_HEADCOUNT);
  for (const role of ["ld", "videoOp", "fohSound", "monitorSound"] as const) {
    const s = r.suggestions.find((x) => x.role === role)!;
    assert.deepEqual([s.min, s.max], [0, 0], `${role} should be 0–0 on empty project`);
  }
});

test("computeCrewAdequacy: 2 LED walls beats baseline → 2-2 AV FOH", () => {
  // The wall-count ratio still applies on top of the baseline; we
  // never go below the baseline, but multi-wall shows scale up.
  const r = computeCrewAdequacy(
    { ...EMPTY_METRICS, ledWallCount: 2, ledArea: 20 },
    ZERO_HEADCOUNT,
  );
  const av = r.suggestions.find((s) => s.role === "videoOp")!;
  assert.deepEqual([av.min, av.max], [2, 2]);
});

test("computeCrewAdequacy: 120 fixtures bumps Lights FOH max above the baseline", () => {
  // Big rig → 1 LD baseline + ratio gives 2 (120/60).
  const r = computeCrewAdequacy(
    { ...EMPTY_METRICS, fixtureCount: 120 },
    ZERO_HEADCOUNT,
  );
  const ld = r.suggestions.find((s) => s.role === "ld")!;
  assert.equal(ld.min, 2);
  assert.equal(ld.max, 2);
});

test("computeCrewAdequacy: ticketed only adds Monitor (FOH already baselined by scope)", () => {
  // After the FOH-baseline change, ticketed no longer adds a 2nd
  // Sound FOH — it just unlocks the dedicated Monitor engineer.
  const r = computeCrewAdequacy(
    { ...EMPTY_METRICS, hoistPoints: 10, ticketed: true },
    ZERO_HEADCOUNT,
  );
  const foh = r.suggestions.find((s) => s.role === "fohSound")!;
  const mon = r.suggestions.find((s) => s.role === "monitorSound")!;
  assert.deepEqual([foh.min, foh.max], [1, 1]);
  assert.deepEqual([mon.min, mon.max], [1, 1]);
});
