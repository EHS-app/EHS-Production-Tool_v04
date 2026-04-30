import { test } from "node:test";
import assert from "node:assert/strict";
import {
  normaliseBbox,
  normaliseConfidence,
} from "./normaliseAnalyserItems.ts";

// =====================================================================
// normaliseBbox
// =====================================================================

// --- non-object inputs all become null ---------------------------------

test("normaliseBbox: null → null", () => {
  assert.equal(normaliseBbox(null), null);
});

test("normaliseBbox: undefined → null", () => {
  assert.equal(normaliseBbox(undefined), null);
});

test("normaliseBbox: string → null", () => {
  assert.equal(normaliseBbox("0.1, 0.2, 0.3, 0.4"), null);
});

test("normaliseBbox: number → null", () => {
  assert.equal(normaliseBbox(0.5), null);
});

test("normaliseBbox: boolean → null", () => {
  assert.equal(normaliseBbox(true), null);
});

// --- missing or wrong-typed fields -------------------------------------

test("normaliseBbox: empty object → null (all fields missing)", () => {
  assert.equal(normaliseBbox({}), null);
});

test("normaliseBbox: missing width → null", () => {
  assert.equal(normaliseBbox({ x: 0.1, y: 0.1, height: 0.5 }), null);
});

test("normaliseBbox: missing height → null", () => {
  assert.equal(normaliseBbox({ x: 0.1, y: 0.1, width: 0.5 }), null);
});

test("normaliseBbox: string field rejected → null overall", () => {
  assert.equal(
    normaliseBbox({ x: "0.1", y: 0.2, width: 0.3, height: 0.4 }),
    null,
  );
});

test("normaliseBbox: NaN field rejected → null overall", () => {
  assert.equal(
    normaliseBbox({ x: NaN, y: 0.2, width: 0.3, height: 0.4 }),
    null,
  );
});

test("normaliseBbox: Infinity field rejected → null overall", () => {
  assert.equal(
    normaliseBbox({ x: Infinity, y: 0.2, width: 0.3, height: 0.4 }),
    null,
  );
});

test("normaliseBbox: -Infinity field rejected → null overall", () => {
  assert.equal(
    normaliseBbox({ x: 0.1, y: 0.2, width: -Infinity, height: 0.4 }),
    null,
  );
});

// --- happy path -------------------------------------------------------

test("normaliseBbox: simple in-bounds bbox is preserved unchanged", () => {
  assert.deepEqual(
    normaliseBbox({ x: 0.1, y: 0.2, width: 0.3, height: 0.4 }),
    { x: 0.1, y: 0.2, width: 0.3, height: 0.4 },
  );
});

test("normaliseBbox: full-image bbox (0,0,1,1) is preserved", () => {
  assert.deepEqual(
    normaliseBbox({ x: 0, y: 0, width: 1, height: 1 }),
    { x: 0, y: 0, width: 1, height: 1 },
  );
});

test("normaliseBbox: ignores extra fields", () => {
  assert.deepEqual(
    normaliseBbox({
      x: 0.1,
      y: 0.2,
      width: 0.3,
      height: 0.4,
      label: "stage",
      score: 0.9,
    }),
    { x: 0.1, y: 0.2, width: 0.3, height: 0.4 },
  );
});

// --- coordinate clamping ----------------------------------------------

test("normaliseBbox: negative x is clamped to 0", () => {
  assert.deepEqual(
    normaliseBbox({ x: -0.2, y: 0.2, width: 0.3, height: 0.4 }),
    { x: 0, y: 0.2, width: 0.3, height: 0.4 },
  );
});

test("normaliseBbox: negative y is clamped to 0", () => {
  assert.deepEqual(
    normaliseBbox({ x: 0.1, y: -0.5, width: 0.3, height: 0.4 }),
    { x: 0.1, y: 0, width: 0.3, height: 0.4 },
  );
});

test("normaliseBbox: x > 1 is clamped to 1, then width-cap rejects the box", () => {
  // After clamping x to 1, the right-edge cap forces width to 0,
  // and a 0-area box is unrenderable → null.
  assert.equal(
    normaliseBbox({ x: 1.5, y: 0.2, width: 0.3, height: 0.4 }),
    null,
  );
});

test("normaliseBbox: width > 1 is clamped to 1 then capped at edge", () => {
  // width is first clamped to 1 (within 0..1), then capped at 1 - x.
  assert.deepEqual(
    normaliseBbox({ x: 0.2, y: 0.2, width: 5, height: 0.3 }),
    { x: 0.2, y: 0.2, width: 0.8, height: 0.3 },
  );
});

// --- zero / negative dimensions reject the box ------------------------

test("normaliseBbox: zero width → null", () => {
  assert.equal(
    normaliseBbox({ x: 0.1, y: 0.2, width: 0, height: 0.4 }),
    null,
  );
});

test("normaliseBbox: zero height → null", () => {
  assert.equal(
    normaliseBbox({ x: 0.1, y: 0.2, width: 0.3, height: 0 }),
    null,
  );
});

test("normaliseBbox: negative width → null (clamped to 0, then rejected)", () => {
  assert.equal(
    normaliseBbox({ x: 0.1, y: 0.2, width: -0.3, height: 0.4 }),
    null,
  );
});

test("normaliseBbox: negative height → null", () => {
  assert.equal(
    normaliseBbox({ x: 0.1, y: 0.2, width: 0.3, height: -0.4 }),
    null,
  );
});

// --- right- / bottom-edge capping -------------------------------------

test("normaliseBbox: bbox extending past right edge is capped to 1 - x", () => {
  // width 0.9 at x=0.5 would extend to 1.4. Cap to 0.5.
  assert.deepEqual(
    normaliseBbox({ x: 0.5, y: 0.1, width: 0.9, height: 0.3 }),
    { x: 0.5, y: 0.1, width: 0.5, height: 0.3 },
  );
});

test("normaliseBbox: bbox extending past bottom edge is capped to 1 - y", () => {
  // Use y=0.5 / height=0.8 so the cap (1 - 0.5 = 0.5) is exact in
  // IEEE 754 — y=0.7 / height=0.5 capped at 0.30000000000000004.
  assert.deepEqual(
    normaliseBbox({ x: 0.1, y: 0.5, width: 0.3, height: 0.8 }),
    { x: 0.1, y: 0.5, width: 0.3, height: 0.5 },
  );
});

test("normaliseBbox: bbox flush with right edge is preserved exactly", () => {
  assert.deepEqual(
    normaliseBbox({ x: 0.5, y: 0.1, width: 0.5, height: 0.3 }),
    { x: 0.5, y: 0.1, width: 0.5, height: 0.3 },
  );
});

test("normaliseBbox: bbox at x=1 with positive width → null after edge cap", () => {
  // 1 - 1 = 0, so the cap rejects the box.
  assert.equal(
    normaliseBbox({ x: 1, y: 0.2, width: 0.3, height: 0.4 }),
    null,
  );
});

// =====================================================================
// normaliseConfidence
// =====================================================================

// --- non-numeric / non-finite all become null --------------------------

test("normaliseConfidence: null → null", () => {
  assert.equal(normaliseConfidence(null), null);
});

test("normaliseConfidence: undefined → null", () => {
  assert.equal(normaliseConfidence(undefined), null);
});

test("normaliseConfidence: string '0.5' → null (we don't coerce strings)", () => {
  // We deliberately don't coerce string-numbers here — confidence
  // either comes through as a real number or is unknown. Coercing
  // would mask a model that's emitting the wrong type.
  assert.equal(normaliseConfidence("0.5"), null);
});

test("normaliseConfidence: NaN → null", () => {
  assert.equal(normaliseConfidence(NaN), null);
});

test("normaliseConfidence: Infinity → null", () => {
  assert.equal(normaliseConfidence(Infinity), null);
});

test("normaliseConfidence: -Infinity → null", () => {
  assert.equal(normaliseConfidence(-Infinity), null);
});

test("normaliseConfidence: object → null", () => {
  assert.equal(normaliseConfidence({ value: 0.5 }), null);
});

// --- happy path -------------------------------------------------------

test("normaliseConfidence: 0 → 0", () => {
  assert.equal(normaliseConfidence(0), 0);
});

test("normaliseConfidence: 1 → 1", () => {
  assert.equal(normaliseConfidence(1), 1);
});

test("normaliseConfidence: 0.5 → 0.5", () => {
  assert.equal(normaliseConfidence(0.5), 0.5);
});

test("normaliseConfidence: very small positive number is preserved", () => {
  assert.equal(normaliseConfidence(0.001), 0.001);
});

// --- clamping ---------------------------------------------------------

test("normaliseConfidence: negative number is clamped to 0", () => {
  assert.equal(normaliseConfidence(-0.5), 0);
});

test("normaliseConfidence: number above 1 is clamped to 1 (rounding artefact)", () => {
  // The model occasionally emits 1.05 from internal rounding.
  // We accept it as 1 rather than null'ing the otherwise-valid signal.
  assert.equal(normaliseConfidence(1.05), 1);
});

test("normaliseConfidence: large positive is clamped to 1", () => {
  assert.equal(normaliseConfidence(42), 1);
});

test("normaliseConfidence: large negative is clamped to 0", () => {
  assert.equal(normaliseConfidence(-42), 0);
});
