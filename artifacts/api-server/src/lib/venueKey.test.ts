import { test } from "node:test";
import assert from "node:assert/strict";
import { venueKeyFor } from "./venueKey.ts";

test("trims leading and trailing whitespace", () => {
  assert.equal(venueKeyFor("  Sentrum Scene  "), "sentrum scene");
});

test("lowercases mixed-case input", () => {
  assert.equal(venueKeyFor("SENTRUM SCENE"), "sentrum scene");
  assert.equal(venueKeyFor("Sentrum Scene"), "sentrum scene");
});

test("collapses multiple internal spaces into one", () => {
  assert.equal(venueKeyFor("Sentrum   Scene"), "sentrum scene");
  assert.equal(venueKeyFor("a  b   c"), "a b c");
});

test("treats tabs and newlines as collapsible whitespace", () => {
  assert.equal(venueKeyFor("Sentrum\tScene"), "sentrum scene");
  assert.equal(venueKeyFor("Sentrum\nScene"), "sentrum scene");
  assert.equal(venueKeyFor("Sentrum \t \n Scene"), "sentrum scene");
});

test("returns empty string for empty input", () => {
  assert.equal(venueKeyFor(""), "");
});

test("returns empty string for whitespace-only input", () => {
  assert.equal(venueKeyFor("   "), "");
  assert.equal(venueKeyFor("\t\n "), "");
});

test("preserves a single internal space verbatim", () => {
  assert.equal(venueKeyFor("Sentrum Scene"), "sentrum scene");
});

test("preserves Norwegian characters (æ, ø, å) without altering casing rules", () => {
  assert.equal(venueKeyFor("Den Norske Opera & Ballett"), "den norske opera & ballett");
  assert.equal(venueKeyFor("Bærum Kulturhus"), "bærum kulturhus");
  assert.equal(venueKeyFor("ØYA-Festivalen"), "øya-festivalen");
});

test("is idempotent — applying the key function twice yields the same result", () => {
  const inputs = [
    "  Sentrum  Scene ",
    "OSLO SPEKTRUM",
    "\tBærum\nKulturhus  ",
    "x",
    "",
  ];
  for (const input of inputs) {
    const once = venueKeyFor(input);
    const twice = venueKeyFor(once);
    assert.equal(twice, once);
  }
});
