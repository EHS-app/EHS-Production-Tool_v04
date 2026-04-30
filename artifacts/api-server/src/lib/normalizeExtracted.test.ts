import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeExtracted } from "./normalizeExtracted.ts";

// Reference shape returned for empty / bad input — built once and
// reused so the empty-case tests stay short and obvious.
const EMPTY_RESULT = {
  venue: { widthM: null, depthM: null, ceilingM: null },
  stages: [],
  trusses: [],
  lighting: [],
  ledScreens: [],
  sound: [],
  summary: "",
};

// =====================================================================
// Top-level coercion: anything non-object / wrong-shaped becomes the
// empty result. The route depends on this so a 200 with a malformed
// body never throws downstream.
// =====================================================================

test("returns empty result for null", () => {
  assert.deepEqual(normalizeExtracted(null), EMPTY_RESULT);
});

test("returns empty result for undefined", () => {
  assert.deepEqual(normalizeExtracted(undefined), EMPTY_RESULT);
});

test("returns empty result for a bare string", () => {
  assert.deepEqual(normalizeExtracted("not json"), EMPTY_RESULT);
});

test("returns empty result for a number", () => {
  assert.deepEqual(normalizeExtracted(42), EMPTY_RESULT);
});

test("returns empty result for an array (the top level should be an object)", () => {
  // Arrays ARE typeof 'object' in JS so this is a real edge case.
  // Each per-section `arr(...)` call still receives a non-array (the
  // whole top-level array isn't a `stages` etc.), so all arrays end
  // up empty.
  assert.deepEqual(normalizeExtracted([]), EMPTY_RESULT);
});

test("ignores unknown top-level keys", () => {
  assert.deepEqual(
    normalizeExtracted({ unknown: 1, banana: "yes" }),
    EMPTY_RESULT,
  );
});

// =====================================================================
// venue
// =====================================================================

test("venue: numeric fields are passed through", () => {
  const out = normalizeExtracted({
    venue: { widthM: 30, depthM: 20, ceilingM: 8 },
  });
  assert.deepEqual(out.venue, { widthM: 30, depthM: 20, ceilingM: 8 });
});

test("venue: missing venue object → all-null venue", () => {
  const out = normalizeExtracted({});
  assert.deepEqual(out.venue, { widthM: null, depthM: null, ceilingM: null });
});

test("venue: only widthM provided → others null", () => {
  const out = normalizeExtracted({ venue: { widthM: 25 } });
  assert.deepEqual(out.venue, { widthM: 25, depthM: null, ceilingM: null });
});

test("venue: numeric strings are coerced (the route's own helper allows this)", () => {
  const out = normalizeExtracted({
    venue: { widthM: "30", depthM: "20.5", ceilingM: "8" },
  });
  assert.deepEqual(out.venue, { widthM: 30, depthM: 20.5, ceilingM: 8 });
});

test("venue: non-numeric strings → null", () => {
  const out = normalizeExtracted({
    venue: { widthM: "wide", depthM: 20 },
  });
  assert.equal(out.venue.widthM, null);
  assert.equal(out.venue.depthM, 20);
});

test("venue: NaN/Infinity → null", () => {
  const out = normalizeExtracted({
    venue: { widthM: NaN, depthM: Infinity, ceilingM: 8 },
  });
  assert.deepEqual(out.venue, { widthM: null, depthM: null, ceilingM: 8 });
});

// =====================================================================
// stages
// =====================================================================

test("stages: empty array → empty array", () => {
  const out = normalizeExtracted({ stages: [] });
  assert.deepEqual(out.stages, []);
});

test("stages: single stage with all fields is preserved", () => {
  const out = normalizeExtracted({
    stages: [
      {
        name: "Main",
        widthM: 12,
        depthM: 8,
        notes: "Downstage",
        confidence: 0.9,
        bbox: { x: 0.1, y: 0.1, width: 0.5, height: 0.3 },
      },
    ],
  });
  assert.equal(out.stages.length, 1);
  assert.deepEqual(out.stages[0], {
    name: "Main",
    widthM: 12,
    depthM: 8,
    notes: "Downstage",
    confidence: 0.9,
    bbox: { x: 0.1, y: 0.1, width: 0.5, height: 0.3 },
  });
});

test("stages: missing name defaults to 'Stage'", () => {
  const out = normalizeExtracted({ stages: [{ widthM: 12, depthM: 8 }] });
  assert.equal(out.stages[0].name, "Stage");
});

test("stages: missing dimensions become 0 (not null) on stage rows", () => {
  // numOrZero is used here, unlike venue which uses num.
  const out = normalizeExtracted({ stages: [{ name: "Main" }] });
  assert.equal(out.stages[0].widthM, 0);
  assert.equal(out.stages[0].depthM, 0);
});

test("stages: bad confidence becomes null", () => {
  const out = normalizeExtracted({
    stages: [{ name: "Main", confidence: "high" }],
  });
  assert.equal(out.stages[0].confidence, null);
});

test("stages: out-of-range confidence is clamped, not nulled", () => {
  const out = normalizeExtracted({
    stages: [{ name: "Main", confidence: 1.5 }],
  });
  assert.equal(out.stages[0].confidence, 1);
});

test("stages: malformed bbox becomes null", () => {
  const out = normalizeExtracted({
    stages: [{ name: "Main", bbox: "not a bbox" }],
  });
  assert.equal(out.stages[0].bbox, null);
});

test("stages: non-object items are still mapped (with all defaults)", () => {
  const out = normalizeExtracted({ stages: ["main", null, 42] });
  assert.equal(out.stages.length, 3);
  for (const s of out.stages) {
    assert.equal(s.name, "Stage");
    assert.equal(s.widthM, 0);
    assert.equal(s.bbox, null);
    assert.equal(s.confidence, null);
  }
});

// =====================================================================
// trusses
// =====================================================================

test("trusses: pointCount > 8 is clamped to 8 (max real hoists)", () => {
  const out = normalizeExtracted({
    trusses: [{ name: "Main", lengthM: 12, pointCount: 12 }],
  });
  assert.equal(out.trusses[0].pointCount, 8);
});

test("trusses: pointCount < 1 is clamped to 1", () => {
  const out = normalizeExtracted({
    trusses: [{ name: "Main", lengthM: 12, pointCount: 0 }],
  });
  assert.equal(out.trusses[0].pointCount, 1);
});

test("trusses: missing pointCount defaults to 3 (typical mid-truss count)", () => {
  const out = normalizeExtracted({
    trusses: [{ name: "Main", lengthM: 12 }],
  });
  assert.equal(out.trusses[0].pointCount, 3);
});

test("trusses: fractional pointCount is rounded", () => {
  const out = normalizeExtracted({
    trusses: [{ name: "Main", lengthM: 12, pointCount: 2.7 }],
  });
  assert.equal(out.trusses[0].pointCount, 3);
});

test("trusses: hoistKg below 100 → null (likely a misread)", () => {
  const out = normalizeExtracted({
    trusses: [{ name: "Main", lengthM: 12, hoistKg: 50 }],
  });
  assert.equal(out.trusses[0].hoistKg, null);
});

test("trusses: hoistKg above 5000 → null (likely a misread part number)", () => {
  const out = normalizeExtracted({
    trusses: [{ name: "Main", lengthM: 12, hoistKg: 9999 }],
  });
  assert.equal(out.trusses[0].hoistKg, null);
});

test("trusses: hoistKg in range is rounded to integer kg", () => {
  const out = normalizeExtracted({
    trusses: [{ name: "Main", lengthM: 12, hoistKg: 999.7 }],
  });
  assert.equal(out.trusses[0].hoistKg, 1000);
});

test("trusses: hoistKg exactly at boundary (100) is kept", () => {
  const out = normalizeExtracted({
    trusses: [{ name: "Main", lengthM: 12, hoistKg: 100 }],
  });
  assert.equal(out.trusses[0].hoistKg, 100);
});

test("trusses: hoistKg exactly at boundary (5000) is kept", () => {
  const out = normalizeExtracted({
    trusses: [{ name: "Main", lengthM: 12, hoistKg: 5000 }],
  });
  assert.equal(out.trusses[0].hoistKg, 5000);
});

test("trusses: hoistKg as a numeric string is parsed and clamped like a number", () => {
  // The model occasionally returns numeric values as strings; the
  // internal `num()` helper accepts both. Lock that in so a future
  // tightening doesn't silently drop these.
  const out = normalizeExtracted({
    trusses: [{ name: "Main", lengthM: 12, hoistKg: "1000" }],
  });
  assert.equal(out.trusses[0].hoistKg, 1000);
});

test("trusses: missing name defaults to 'Truss'", () => {
  const out = normalizeExtracted({ trusses: [{ lengthM: 8 }] });
  assert.equal(out.trusses[0].name, "Truss");
});

// =====================================================================
// lighting
// =====================================================================

test("lighting: row with raw qty 300 is dropped pre-merge", () => {
  // qRaw=300 fails the pre-merge filter (>200) so it never reaches
  // the merge step at all.
  const out = normalizeExtracted({
    lighting: [
      { name: "Spot 575", qty: 300, weightKg: 5 },
      { name: "Wash", qty: 6 },
    ],
  });
  assert.equal(out.lighting.length, 1);
  assert.equal(out.lighting[0].name, "Wash");
});

test("lighting: row with raw qty exactly 200 is kept", () => {
  const out = normalizeExtracted({
    lighting: [{ name: "Wash", qty: 200 }],
  });
  assert.equal(out.lighting.length, 1);
  assert.equal(out.lighting[0].qty, 200);
});

test("lighting: missing qty defaults to 1", () => {
  const out = normalizeExtracted({ lighting: [{ name: "Wash" }] });
  assert.equal(out.lighting[0].qty, 1);
});

test("lighting: qty 0 is floored at 1", () => {
  const out = normalizeExtracted({
    lighting: [{ name: "Wash", qty: 0 }],
  });
  assert.equal(out.lighting[0].qty, 1);
});

test("lighting: fractional qty is rounded", () => {
  const out = normalizeExtracted({
    lighting: [{ name: "Wash", qty: 2.6 }],
  });
  assert.equal(out.lighting[0].qty, 3);
});

test("lighting: missing name defaults to 'Fixture'", () => {
  const out = normalizeExtracted({ lighting: [{ qty: 4 }] });
  assert.equal(out.lighting[0].name, "Fixture");
});

test("lighting: identical rows on the same truss are merged together", () => {
  const out = normalizeExtracted({
    lighting: [
      {
        name: "Spot 575",
        qty: 6,
        weightKg: 5,
        watts: 575,
        trussName: "Front",
      },
      {
        name: "Spot 575",
        qty: 4,
        weightKg: 5,
        watts: 575,
        trussName: "Front",
      },
    ],
  });
  assert.equal(out.lighting.length, 1);
  assert.equal(out.lighting[0].qty, 10);
});

test("lighting: trussName whitespace is trimmed before merging", () => {
  const out = normalizeExtracted({
    lighting: [
      { name: "Spot", qty: 6, weightKg: 5, trussName: " Front " },
      { name: "Spot", qty: 4, weightKg: 5, trussName: "Front" },
    ],
  });
  assert.equal(out.lighting.length, 1);
  assert.equal(out.lighting[0].qty, 10);
});

test("lighting: rows that merge into qty > 200 are dropped post-merge", () => {
  // Both rows pass the pre-merge filter (qRaw <= 200), but their
  // merged total exceeds 200, so the post-merge filter drops the
  // combined row entirely. This is the second of the two qty
  // ceilings in normalizeExtracted; the pre-merge one is covered
  // separately above.
  const out = normalizeExtracted({
    lighting: [
      {
        name: "Spot",
        qty: 120,
        weightKg: 5,
        watts: 575,
        trussName: "Front",
      },
      {
        name: "Spot",
        qty: 110,
        weightKg: 5,
        watts: 575,
        trussName: "Front",
      },
    ],
  });
  assert.equal(out.lighting.length, 0);
});

// =====================================================================
// ledScreens
// =====================================================================

test("ledScreens: dedicated widthM/heightM are preferred over notes", () => {
  const out = normalizeExtracted({
    ledScreens: [
      {
        name: "Main",
        widthM: 7.5,
        heightM: 4.5,
        notes: "should be ignored 1m x 1m",
      },
    ],
  });
  assert.equal(out.ledScreens[0].widthM, 7.5);
  assert.equal(out.ledScreens[0].heightM, 4.5);
});

test("ledScreens: missing widthM falls back to parsing 'name + notes'", () => {
  const out = normalizeExtracted({
    ledScreens: [
      {
        name: "IMAG LED 7.5m x 4.5m",
        notes: "1013kg",
      },
    ],
  });
  assert.equal(out.ledScreens[0].widthM, 7.5);
  assert.equal(out.ledScreens[0].heightM, 4.5);
});

test("ledScreens: zero widthM falls back to notes (a stray '0' must not block)", () => {
  // This is the bug-prone branch — a model returning widthM: 0 must
  // NOT suppress the notes-based fallback.
  const out = normalizeExtracted({
    ledScreens: [
      {
        name: "Center",
        widthM: 0,
        heightM: 0,
        notes: "5m x 3m",
      },
    ],
  });
  assert.equal(out.ledScreens[0].widthM, 5);
  assert.equal(out.ledScreens[0].heightM, 3);
});

test("ledScreens: negative dimensions also trigger notes fallback", () => {
  const out = normalizeExtracted({
    ledScreens: [
      { name: "Side LED 6m x 4m", widthM: -1, heightM: -1 },
    ],
  });
  assert.equal(out.ledScreens[0].widthM, 6);
  assert.equal(out.ledScreens[0].heightM, 4);
});

test("ledScreens: zero panel counts → null (not 0)", () => {
  const out = normalizeExtracted({
    ledScreens: [{ name: "Main", panelsWide: 0, panelsTall: 0 }],
  });
  assert.equal(out.ledScreens[0].panelsWide, null);
  assert.equal(out.ledScreens[0].panelsTall, null);
});

test("ledScreens: panel counts are preserved when positive", () => {
  const out = normalizeExtracted({
    ledScreens: [{ name: "Main", panelsWide: 16, panelsTall: 9 }],
  });
  assert.equal(out.ledScreens[0].panelsWide, 16);
  assert.equal(out.ledScreens[0].panelsTall, 9);
});

test("ledScreens: no metres anywhere → both null", () => {
  const out = normalizeExtracted({
    ledScreens: [{ name: "Main", panelsWide: 16, panelsTall: 9 }],
  });
  assert.equal(out.ledScreens[0].widthM, null);
  assert.equal(out.ledScreens[0].heightM, null);
});

test("ledScreens: missing name defaults to 'Screen'", () => {
  const out = normalizeExtracted({ ledScreens: [{ widthM: 5, heightM: 3 }] });
  assert.equal(out.ledScreens[0].name, "Screen");
});

// =====================================================================
// sound
// =====================================================================

test("sound: missing qty defaults to 1", () => {
  const out = normalizeExtracted({ sound: [{ name: "PA" }] });
  assert.equal(out.sound[0].qty, 1);
});

test("sound: qty 0 is floored at 1", () => {
  const out = normalizeExtracted({ sound: [{ name: "PA", qty: 0 }] });
  assert.equal(out.sound[0].qty, 1);
});

test("sound: fractional qty is rounded", () => {
  const out = normalizeExtracted({ sound: [{ name: "PA", qty: 3.4 }] });
  assert.equal(out.sound[0].qty, 3);
});

test("sound: missing name defaults to 'Sound'", () => {
  const out = normalizeExtracted({ sound: [{ qty: 2 }] });
  assert.equal(out.sound[0].name, "Sound");
});

test("sound: weightKg / watts pass through when numeric, null otherwise", () => {
  const out = normalizeExtracted({
    sound: [{ name: "PA", weightKg: 80, watts: "bogus" }],
  });
  assert.equal(out.sound[0].weightKg, 80);
  assert.equal(out.sound[0].watts, null);
});

// =====================================================================
// summary
// =====================================================================

test("summary: string is preserved verbatim", () => {
  const out = normalizeExtracted({ summary: "Two trusses, one screen." });
  assert.equal(out.summary, "Two trusses, one screen.");
});

test("summary: non-string becomes empty string", () => {
  const out = normalizeExtracted({ summary: { text: "nope" } });
  assert.equal(out.summary, "");
});

test("summary: missing → empty string", () => {
  const out = normalizeExtracted({});
  assert.equal(out.summary, "");
});
