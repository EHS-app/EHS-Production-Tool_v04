import { test } from "node:test";
import assert from "node:assert/strict";
import { buildVenueMemoryHint } from "./venueMemoryHint.ts";

test("returns empty string for nullish or non-object input", () => {
  assert.equal(buildVenueMemoryHint(null), "");
  assert.equal(buildVenueMemoryHint(undefined), "");
  assert.equal(buildVenueMemoryHint("not an object"), "");
  assert.equal(buildVenueMemoryHint(42), "");
});

test("returns empty string when lastCorrected is missing", () => {
  assert.equal(buildVenueMemoryHint({}), "");
  assert.equal(buildVenueMemoryHint({ savedAt: "2026-04-30T00:00:00Z" }), "");
});

test("returns empty string when lastCorrected has only empty arrays", () => {
  assert.equal(
    buildVenueMemoryHint({
      lastCorrected: {
        trusses: [],
        lighting: [],
        ledScreens: [],
        stages: [],
        sound: [],
      },
    }),
    "",
  );
});

test("renders trusses with length and point count in parens", () => {
  const out = buildVenueMemoryHint({
    lastCorrected: {
      trusses: [
        { name: "LX1", lengthM: 12, pointCount: 4 },
        { name: "FOH", lengthM: 8, pointCount: 2 },
      ],
    },
  });
  assert.equal(
    out,
    "- Trusses usually present: LX1 (12 m, 4 pts); FOH (8 m, 2 pts).",
  );
});

test("renders truss without parens when length and points are missing", () => {
  const out = buildVenueMemoryHint({
    lastCorrected: {
      trusses: [{ name: "Mid LX" }],
    },
  });
  assert.equal(out, "- Trusses usually present: Mid LX.");
});

test("falls back to generic name when truss name is not a string", () => {
  const out = buildVenueMemoryHint({
    lastCorrected: {
      trusses: [{ name: 42, lengthM: 10, pointCount: 3 }],
    },
  });
  assert.equal(out, "- Trusses usually present: Truss (10 m, 3 pts).");
});

test("renders lighting with qty prefix and truss suffix when present", () => {
  const out = buildVenueMemoryHint({
    lastCorrected: {
      lighting: [
        { name: "Robe MegaPointe", qty: 6, trussName: "LX1" },
        { name: "MAC Aura PXL", qty: 8, trussName: "" },
        { name: "Source 4", trussName: "FOH" },
      ],
    },
  });
  assert.equal(
    out,
    "- Lighting often used: 6× Robe MegaPointe on LX1; 8× MAC Aura PXL; Source 4 on FOH.",
  );
});

test("renders LED screens by metres when widthM/heightM are present", () => {
  const out = buildVenueMemoryHint({
    lastCorrected: {
      ledScreens: [{ name: "Main LED", widthM: 5, heightM: 3 }],
    },
  });
  assert.equal(out, "- LED screens typically: Main LED (5 × 3 m).");
});

test("renders LED screens by panel count when only panels are present", () => {
  const out = buildVenueMemoryHint({
    lastCorrected: {
      ledScreens: [{ name: "Side L", panelsWide: 16, panelsTall: 9 }],
    },
  });
  assert.equal(out, "- LED screens typically: Side L (16 × 9 panels).");
});

test("renders LED screen with bare name when neither metres nor panels given", () => {
  const out = buildVenueMemoryHint({
    lastCorrected: {
      ledScreens: [{ name: "Triangle" }],
    },
  });
  assert.equal(out, "- LED screens typically: Triangle.");
});

test("renders stages and sound rows", () => {
  const out = buildVenueMemoryHint({
    lastCorrected: {
      stages: [{ name: "Main Stage", widthM: 12, depthM: 8 }],
      sound: [{ name: "L'Acoustics K2", qty: 12 }],
    },
  });
  assert.equal(
    out,
    "- Stages / decks typically: Main Stage (12 × 8 m).\n- Sound often: 12× L'Acoustics K2.",
  );
});

test("caps trusses at 8 entries to bound prompt budget", () => {
  const trusses = Array.from({ length: 12 }, (_, i) => ({
    name: `LX${i + 1}`,
    lengthM: 10,
    pointCount: 3,
  }));
  const out = buildVenueMemoryHint({ lastCorrected: { trusses } });
  // 8 entries means 7 separators ("; ") in the rendered string.
  const separatorCount = (out.match(/; /g) ?? []).length;
  assert.equal(separatorCount, 7);
  assert.ok(out.includes("LX1 "));
  assert.ok(out.includes("LX8 "));
  assert.ok(!out.includes("LX9"));
});

test("caps lighting at 10 entries", () => {
  const lighting = Array.from({ length: 15 }, (_, i) => ({
    name: `Fixture${i + 1}`,
    qty: 1,
  }));
  const out = buildVenueMemoryHint({ lastCorrected: { lighting } });
  const separatorCount = (out.match(/; /g) ?? []).length;
  assert.equal(separatorCount, 9);
  assert.ok(out.includes("Fixture10"));
  assert.ok(!out.includes("Fixture11"));
});

test("filters out nullish entries before rendering", () => {
  const out = buildVenueMemoryHint({
    lastCorrected: {
      trusses: [
        null,
        { name: "LX1", lengthM: 10, pointCount: 3 },
        undefined,
        { name: "LX2", lengthM: 8, pointCount: 2 },
      ] as unknown as { name?: unknown; lengthM?: unknown; pointCount?: unknown }[],
    },
  });
  assert.equal(
    out,
    "- Trusses usually present: LX1 (10 m, 3 pts); LX2 (8 m, 2 pts).",
  );
});

test("tolerates non-array category values without throwing", () => {
  // Corrupted save: each category is something other than an array.
  // Function should treat them as empty and return "".
  const out = buildVenueMemoryHint({
    lastCorrected: {
      trusses: "oops" as unknown as never,
      lighting: 42 as unknown as never,
      ledScreens: { not: "an array" } as unknown as never,
      stages: null as unknown as never,
      sound: undefined,
    },
  });
  assert.equal(out, "");
});

test("falls back to generic label for empty / whitespace-only names", () => {
  const out = buildVenueMemoryHint({
    lastCorrected: {
      trusses: [
        { name: "", lengthM: 10, pointCount: 3 },
        { name: "   ", lengthM: 8, pointCount: 2 },
      ],
    },
  });
  assert.equal(
    out,
    "- Trusses usually present: Truss (10 m, 3 pts); Truss (8 m, 2 pts).",
  );
});

test("skips NaN and Infinity numeric fields instead of rendering them", () => {
  const out = buildVenueMemoryHint({
    lastCorrected: {
      trusses: [
        { name: "LX1", lengthM: Number.NaN, pointCount: 3 },
        { name: "LX2", lengthM: 10, pointCount: Number.POSITIVE_INFINITY },
      ],
      lighting: [{ name: "MegaPointe", qty: Number.NaN, trussName: "LX1" }],
    },
  });
  assert.equal(
    out,
    "- Trusses usually present: LX1 (3 pts); LX2 (10 m).\n- Lighting often used: MegaPointe on LX1.",
  );
});

test("renders a multi-section blob with one line per category", () => {
  const out = buildVenueMemoryHint({
    lastCorrected: {
      trusses: [{ name: "LX1", lengthM: 12, pointCount: 4 }],
      lighting: [{ name: "MegaPointe", qty: 6, trussName: "LX1" }],
      ledScreens: [{ name: "Main LED", widthM: 5, heightM: 3 }],
      stages: [{ name: "Main Stage", widthM: 12, depthM: 8 }],
      sound: [{ name: "K2", qty: 8 }],
    },
  });
  const lines = out.split("\n");
  assert.equal(lines.length, 5);
  assert.ok(lines[0].startsWith("- Trusses"));
  assert.ok(lines[1].startsWith("- Lighting"));
  assert.ok(lines[2].startsWith("- LED screens"));
  assert.ok(lines[3].startsWith("- Stages"));
  assert.ok(lines[4].startsWith("- Sound"));
});
