import { test } from "node:test";
import assert from "node:assert/strict";
import { parseMetresFromNotes } from "./parseMetresFromNotes.ts";

const NULLS = { widthM: null, heightM: null };

// --- empty / no-match ----------------------------------------------------

test("returns nulls for empty input", () => {
  assert.deepEqual(parseMetresFromNotes(""), NULLS);
});

test("returns nulls when no dimensions are mentioned", () => {
  assert.deepEqual(parseMetresFromNotes("no dimensions here"), NULLS);
});

test("returns nulls for a single bare number with m", () => {
  assert.deepEqual(parseMetresFromNotes("5m"), NULLS);
});

test("returns nulls for two numbers with no separator (no x)", () => {
  assert.deepEqual(parseMetresFromNotes("7.5m 4.5m"), NULLS);
});

test("returns nulls when 'by' is used instead of x or ×", () => {
  // We deliberately don't try to parse natural-language "by" — the model
  // is prompted to use the × notation, and "by" would let us misread
  // sentences like "the truss has 6 hangs by the gallery".
  assert.deepEqual(parseMetresFromNotes("7.5m by 4.5m"), NULLS);
});

// --- pixel / panel exclusion (the whole point of requiring "m") ----------

test("excludes pixel dimensions ('768 x 1152 pixel')", () => {
  assert.deepEqual(parseMetresFromNotes("768 x 1152 pixel"), NULLS);
});

test("excludes panel counts ('16 x 9 panels')", () => {
  assert.deepEqual(parseMetresFromNotes("16 x 9 panels"), NULLS);
});

test("excludes resolution-style mentions ('1920 x 1080')", () => {
  assert.deepEqual(parseMetresFromNotes("1920 x 1080"), NULLS);
});

// --- both-labelled form (preferred) --------------------------------------

test("parses '7.5m x 4.5m' (decimal dot, both labelled)", () => {
  assert.deepEqual(parseMetresFromNotes("7.5m x 4.5m"), {
    widthM: 7.5,
    heightM: 4.5,
  });
});

test("parses '10m x 6m' (integers, both labelled)", () => {
  assert.deepEqual(parseMetresFromNotes("10m x 6m"), {
    widthM: 10,
    heightM: 6,
  });
});

test("parses '7.5 m x 4.5 m' (whitespace between number and m)", () => {
  assert.deepEqual(parseMetresFromNotes("7.5 m x 4.5 m"), {
    widthM: 7.5,
    heightM: 4.5,
  });
});

test("parses '7.5m × 4.5m' with the unicode multiplication sign", () => {
  assert.deepEqual(parseMetresFromNotes("7.5m × 4.5m"), {
    widthM: 7.5,
    heightM: 4.5,
  });
});

test("is case-insensitive on the m / x letters", () => {
  assert.deepEqual(parseMetresFromNotes("7.5M X 4.5M"), {
    widthM: 7.5,
    heightM: 4.5,
  });
});

test("tolerates extra whitespace around operators", () => {
  assert.deepEqual(parseMetresFromNotes("7.5  m  x  4.5  m"), {
    widthM: 7.5,
    heightM: 4.5,
  });
});

// --- Norwegian comma-decimal handling ------------------------------------

test("parses '7,5m x 4,5m' (Norwegian comma decimals)", () => {
  assert.deepEqual(parseMetresFromNotes("7,5m x 4,5m"), {
    widthM: 7.5,
    heightM: 4.5,
  });
});

test("parses '7,5m × 4,5m' (Norwegian comma + unicode ×)", () => {
  assert.deepEqual(parseMetresFromNotes("7,5m × 4,5m"), {
    widthM: 7.5,
    heightM: 4.5,
  });
});

test("parses mixed dot- and comma-decimals in the same string", () => {
  assert.deepEqual(parseMetresFromNotes("7.5m x 4,5m"), {
    widthM: 7.5,
    heightM: 4.5,
  });
});

// --- trailing-label fallback ---------------------------------------------

test("parses '5 x 3 m' (single trailing label, with spaces)", () => {
  assert.deepEqual(parseMetresFromNotes("5 x 3 m"), {
    widthM: 5,
    heightM: 3,
  });
});

test("parses '5x3m' (single trailing label, no spaces)", () => {
  assert.deepEqual(parseMetresFromNotes("5x3m"), {
    widthM: 5,
    heightM: 3,
  });
});

test("parses '5 × 3 m' (trailing label with unicode ×)", () => {
  assert.deepEqual(parseMetresFromNotes("5 × 3 m"), {
    widthM: 5,
    heightM: 3,
  });
});

test("parses '12,5 x 7,5 m' (trailing label, Norwegian decimals)", () => {
  assert.deepEqual(parseMetresFromNotes("12,5 x 7,5 m"), {
    widthM: 12.5,
    heightM: 7.5,
  });
});

// --- embedded in larger text --------------------------------------------

test("extracts dimensions embedded in a longer note", () => {
  assert.deepEqual(
    parseMetresFromNotes("Stage area: 7,5m x 4,5m, plus 1m margin"),
    { widthM: 7.5, heightM: 4.5 },
  );
});

test("extracts dimensions when followed by a weight string", () => {
  assert.deepEqual(
    parseMetresFromNotes("size 7.5m x 4.5m and weight 1013kg"),
    { widthM: 7.5, heightM: 4.5 },
  );
});

test("returns the first match when multiple metre-pairs are present", () => {
  assert.deepEqual(parseMetresFromNotes("first 5m x 3m, then 8m x 4m"), {
    widthM: 5,
    heightM: 3,
  });
});

test("picks the metres pair over a co-occurring pixel pair", () => {
  assert.deepEqual(
    parseMetresFromNotes("screen 7,5m x 4,5m at 1920 x 1080 pixel"),
    { widthM: 7.5, heightM: 4.5 },
  );
});

test("falls back to trailing-label form when both-labelled regex misses", () => {
  // No 'm' between the two numbers, only at the end → both-labelled
  // regex doesn't match, but the trailing-label fallback does.
  assert.deepEqual(parseMetresFromNotes("7,5 x 4,5 m"), {
    widthM: 7.5,
    heightM: 4.5,
  });
});

// --- zero / negative rejection -------------------------------------------

test("rejects '0m x 5m' (zero width)", () => {
  assert.deepEqual(parseMetresFromNotes("0m x 5m"), NULLS);
});

test("rejects '5m x 0m' (zero height)", () => {
  assert.deepEqual(parseMetresFromNotes("5m x 0m"), NULLS);
});

test("rejects '0 x 0 m' (both zero, trailing-label form)", () => {
  assert.deepEqual(parseMetresFromNotes("0 x 0 m"), NULLS);
});

// --- small / large dimensions still parse correctly ----------------------

test("parses small fractional metres ('0.5m x 1.5m')", () => {
  assert.deepEqual(parseMetresFromNotes("0.5m x 1.5m"), {
    widthM: 0.5,
    heightM: 1.5,
  });
});

test("parses large dimensions ('40m x 25m')", () => {
  assert.deepEqual(parseMetresFromNotes("40m x 25m"), {
    widthM: 40,
    heightM: 25,
  });
});

test("parses no-whitespace 'm × m' form ('7.5mx4.5m')", () => {
  // Some drawings tables emit "7.5mx4.5m" with no surrounding spaces.
  // The first `m` deliberately has no `\b` so this still parses;
  // adding `\b` there would break this real input.
  assert.deepEqual(parseMetresFromNotes("7.5mx4.5m"), {
    widthM: 7.5,
    heightM: 4.5,
  });
});

// --- adjacent-suffix rejection (the trailing `\b` guard) ----------------

test("rejects 'mm' (millimetres) suffix on the second number", () => {
  // Without `\b`, "4.5mm" would be silently misread as 4.5 metres
  // and render an LED screen 1000× too small.
  assert.deepEqual(parseMetresFromNotes("7.5m x 4.5mm"), NULLS);
});

test("rejects 'miles' suffix on the second number", () => {
  assert.deepEqual(parseMetresFromNotes("7.5m x 4.5miles"), NULLS);
});

test("rejects 'm2' (square-metres area notation) on the second number", () => {
  assert.deepEqual(parseMetresFromNotes("7.5m x 4.5m2"), NULLS);
});

test("rejects 'mm' suffix in trailing-label form too", () => {
  assert.deepEqual(parseMetresFromNotes("5x3mm"), NULLS);
});

test("rejects 'km' altogether (we don't auto-convert kilometres)", () => {
  // The first-number side has no trailing `\b`, but the regex still
  // requires a literal `m` so "7.5km" doesn't match — the next char
  // after "7.5" is "k", not "m" or whitespace+m.
  assert.deepEqual(parseMetresFromNotes("7.5km x 4.5km"), NULLS);
});

// --- whitespace varieties (newline / tab) -------------------------------

test("treats newlines as separators between number, unit and operator", () => {
  assert.deepEqual(parseMetresFromNotes("7.5m\nx\n4.5m"), {
    widthM: 7.5,
    heightM: 4.5,
  });
});

test("treats tabs as separators between number, unit and operator", () => {
  assert.deepEqual(parseMetresFromNotes("7.5m\tx\t4.5m"), {
    widthM: 7.5,
    heightM: 4.5,
  });
});

// --- documented limitations (locked-in current behaviour) ---------------

test("misinterprets US-style thousand separators (documented limitation)", () => {
  // "1,200m" gets normalised to "1.200m" → parsed as 1.2. We accept
  // this because the analyser targets Norwegian drawings where comma
  // is the decimal mark, not a thousand separator. Locked in so any
  // future fix is explicit.
  assert.deepEqual(parseMetresFromNotes("1,200m x 800m"), {
    widthM: 1.2,
    heightM: 800,
  });
});

test("rejects leading-decimal form '.5m x .3m' (documented limitation)", () => {
  // The digit pattern requires `\d+` before the optional decimal, so
  // a leading '.' isn't matched. Locked in.
  assert.deepEqual(parseMetresFromNotes(".5m x .3m"), NULLS);
});
