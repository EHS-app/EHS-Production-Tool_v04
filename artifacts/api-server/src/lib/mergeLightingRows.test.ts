import { test } from "node:test";
import assert from "node:assert/strict";
import {
  lightingMergeKey,
  mergeLightingRows,
  type LightingRow,
} from "./mergeLightingRows.ts";

function row(overrides: Partial<LightingRow> = {}): LightingRow {
  return {
    name: "MAC Aura XB",
    qty: 1,
    weightKg: null,
    watts: null,
    trussName: "LX1",
    notes: "",
    confidence: null,
    bbox: null,
    ...overrides,
  };
}

// --- lightingMergeKey ---------------------------------------------------

test("lightingMergeKey is case-insensitive on fixture name", () => {
  assert.equal(
    lightingMergeKey("MAC Aura XB", "LX1"),
    lightingMergeKey("mac aura xb", "LX1"),
  );
});

test("lightingMergeKey collapses internal whitespace in fixture name", () => {
  assert.equal(
    lightingMergeKey("MAC  Aura   XB", "LX1"),
    lightingMergeKey("MAC Aura XB", "LX1"),
  );
});

test("lightingMergeKey trims surrounding whitespace", () => {
  assert.equal(
    lightingMergeKey("  MAC Aura XB  ", "  LX1  "),
    lightingMergeKey("MAC Aura XB", "LX1"),
  );
});

test("lightingMergeKey treats truss separators (_, -, space) as equivalent", () => {
  const a = lightingMergeKey("MAC Aura XB", "LX 1");
  const b = lightingMergeKey("MAC Aura XB", "LX_1");
  const c = lightingMergeKey("MAC Aura XB", "LX-1");
  const d = lightingMergeKey("MAC Aura XB", "LX1");
  assert.equal(a, b);
  assert.equal(b, c);
  assert.equal(c, d);
});

test("lightingMergeKey distinguishes different fixtures", () => {
  assert.notEqual(
    lightingMergeKey("MAC Aura XB", "LX1"),
    lightingMergeKey("MAC Quantum", "LX1"),
  );
});

test("lightingMergeKey distinguishes different trusses", () => {
  assert.notEqual(
    lightingMergeKey("MAC Aura XB", "LX1"),
    lightingMergeKey("MAC Aura XB", "LX2"),
  );
});

// --- mergeLightingRows ---------------------------------------------------

test("mergeLightingRows returns empty array for empty input", () => {
  assert.deepEqual(mergeLightingRows([]), []);
});

test("mergeLightingRows returns a single row through unchanged (by value)", () => {
  const r = row({ qty: 4, weightKg: 3.5, watts: 280, notes: "stage left" });
  const out = mergeLightingRows([r]);
  assert.equal(out.length, 1);
  assert.deepEqual(out[0], r);
});

test("mergeLightingRows returns a fresh top-level row object (not the input reference)", () => {
  const r = row({ qty: 4 });
  const out = mergeLightingRows([r]);
  assert.notEqual(out[0], r);
});

test("mergeLightingRows aliases nested bbox by reference (shallow copy is intentional)", () => {
  const bbox = { x: 0.1, y: 0.1, width: 0.2, height: 0.2 };
  const r = row({ qty: 1, bbox });
  const out = mergeLightingRows([r]);
  assert.equal(out[0].bbox, bbox);
});

test("mergeLightingRows sums qty for duplicate (name, truss) rows", () => {
  const out = mergeLightingRows([
    row({ qty: 6 }),
    row({ qty: 4 }),
    row({ qty: 2 }),
  ]);
  assert.equal(out.length, 1);
  assert.equal(out[0].qty, 12);
});

test("mergeLightingRows merges case- and whitespace-variant duplicates", () => {
  const out = mergeLightingRows([
    row({ name: "MAC Aura XB", trussName: "LX1", qty: 4 }),
    row({ name: "mac aura  xb", trussName: "lx_1", qty: 6 }),
  ]);
  assert.equal(out.length, 1);
  assert.equal(out[0].qty, 10);
});

test("mergeLightingRows keeps separate entries for distinct (name, truss) pairs", () => {
  const out = mergeLightingRows([
    row({ name: "MAC Aura XB", trussName: "LX1", qty: 4 }),
    row({ name: "MAC Aura XB", trussName: "LX2", qty: 2 }),
    row({ name: "MAC Quantum", trussName: "LX1", qty: 1 }),
  ]);
  assert.equal(out.length, 3);
});

test("mergeLightingRows uses first non-null weightKg", () => {
  const out = mergeLightingRows([
    row({ qty: 1, weightKg: null }),
    row({ qty: 1, weightKg: 3.2 }),
    row({ qty: 1, weightKg: 9.9 }),
  ]);
  assert.equal(out.length, 1);
  assert.equal(out[0].weightKg, 3.2);
});

test("mergeLightingRows uses first non-null watts", () => {
  const out = mergeLightingRows([
    row({ qty: 1, watts: null }),
    row({ qty: 1, watts: 280 }),
    row({ qty: 1, watts: 999 }),
  ]);
  assert.equal(out[0].watts, 280);
});

test("mergeLightingRows preserves a non-null weightKg from the first row", () => {
  const out = mergeLightingRows([
    row({ qty: 1, weightKg: 3.2 }),
    row({ qty: 1, weightKg: null }),
    row({ qty: 1, weightKg: 7.7 }),
  ]);
  assert.equal(out[0].weightKg, 3.2);
});

test("mergeLightingRows concatenates distinct notes with semicolon", () => {
  const out = mergeLightingRows([
    row({ qty: 1, notes: "stage left" }),
    row({ qty: 1, notes: "stage right" }),
  ]);
  assert.equal(out[0].notes, "stage left; stage right");
});

test("mergeLightingRows ignores empty notes from later rows", () => {
  const out = mergeLightingRows([
    row({ qty: 1, notes: "stage left" }),
    row({ qty: 1, notes: "" }),
  ]);
  assert.equal(out[0].notes, "stage left");
});

test("mergeLightingRows uses the later note when the first row had none", () => {
  const out = mergeLightingRows([
    row({ qty: 1, notes: "" }),
    row({ qty: 1, notes: "stage left" }),
  ]);
  assert.equal(out[0].notes, "stage left");
});

test("mergeLightingRows deduplicates a note that already appears in existing notes", () => {
  const out = mergeLightingRows([
    row({ qty: 1, notes: "stage left" }),
    row({ qty: 1, notes: "stage left" }),
  ]);
  assert.equal(out[0].notes, "stage left");
});

test("mergeLightingRows skips a substring note already contained in existing", () => {
  const out = mergeLightingRows([
    row({ qty: 1, notes: "stage left and back" }),
    row({ qty: 1, notes: "stage left" }),
  ]);
  assert.equal(out[0].notes, "stage left and back");
});

test("mergeLightingRows note dedup is case-sensitive (locks current behaviour)", () => {
  // The model occasionally emits casing-variant duplicates ("Stage Left"
  // vs "stage left"). We intentionally keep BOTH as separate notes so a
  // human reviewer can spot the inconsistency, rather than silently
  // collapsing them and hiding model noise.
  const out = mergeLightingRows([
    row({ qty: 1, notes: "Stage Left" }),
    row({ qty: 1, notes: "stage left" }),
  ]);
  assert.equal(out[0].notes, "Stage Left; stage left");
});

test("mergeLightingRows takes minimum confidence across merged rows", () => {
  const out = mergeLightingRows([
    row({ qty: 1, confidence: 0.9 }),
    row({ qty: 1, confidence: 0.4 }),
    row({ qty: 1, confidence: 0.7 }),
  ]);
  assert.equal(out[0].confidence, 0.4);
});

test("mergeLightingRows ignores null confidence when computing minimum", () => {
  const out = mergeLightingRows([
    row({ qty: 1, confidence: 0.9 }),
    row({ qty: 1, confidence: null }),
  ]);
  assert.equal(out[0].confidence, 0.9);
});

test("mergeLightingRows fills in confidence from later row when first was null", () => {
  const out = mergeLightingRows([
    row({ qty: 1, confidence: null }),
    row({ qty: 1, confidence: 0.5 }),
  ]);
  assert.equal(out[0].confidence, 0.5);
});

test("mergeLightingRows uses first non-null bbox", () => {
  const bboxA = { x: 0.1, y: 0.1, width: 0.2, height: 0.2 };
  const bboxB = { x: 0.5, y: 0.5, width: 0.1, height: 0.1 };
  const out = mergeLightingRows([
    row({ qty: 1, bbox: null }),
    row({ qty: 1, bbox: bboxA }),
    row({ qty: 1, bbox: bboxB }),
  ]);
  assert.deepEqual(out[0].bbox, bboxA);
});

test("mergeLightingRows preserves the first row's bbox even when later rows have one", () => {
  const bboxA = { x: 0.1, y: 0.1, width: 0.2, height: 0.2 };
  const bboxB = { x: 0.5, y: 0.5, width: 0.1, height: 0.1 };
  const out = mergeLightingRows([
    row({ qty: 1, bbox: bboxA }),
    row({ qty: 1, bbox: bboxB }),
  ]);
  assert.deepEqual(out[0].bbox, bboxA);
});

test("mergeLightingRows does not mutate input rows", () => {
  const a = row({ qty: 4, weightKg: null, notes: "first" });
  const b = row({ qty: 6, weightKg: 3.2, notes: "second" });
  const snapshotA = { ...a };
  const snapshotB = { ...b };
  mergeLightingRows([a, b]);
  assert.deepEqual(a, snapshotA);
  assert.deepEqual(b, snapshotB);
});

test("mergeLightingRows preserves insertion order across distinct keys", () => {
  const out = mergeLightingRows([
    row({ name: "Beta", trussName: "LX2", qty: 1 }),
    row({ name: "Alpha", trussName: "LX1", qty: 1 }),
    row({ name: "Gamma", trussName: "LX3", qty: 1 }),
  ]);
  assert.deepEqual(
    out.map((r) => r.name),
    ["Beta", "Alpha", "Gamma"],
  );
});
