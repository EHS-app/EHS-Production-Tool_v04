import { test } from "node:test";
import assert from "node:assert/strict";
import { extractJsonBlock } from "./extractJsonBlock.ts";

// =====================================================================
// no-match cases (return null)
// =====================================================================

test("returns null for an empty string", () => {
  assert.equal(extractJsonBlock(""), null);
});

test("returns null when there is no JSON at all", () => {
  assert.equal(extractJsonBlock("Just a sentence with no braces."), null);
});

test("returns null when there is only an opening brace", () => {
  assert.equal(extractJsonBlock("Here it goes: {"), null);
});

test("returns null when there is only a closing brace", () => {
  assert.equal(extractJsonBlock("}"), null);
});

test("returns null when the closing brace appears before the opening one", () => {
  // start index 22, end index 0 → end <= start → null.
  assert.equal(extractJsonBlock("} comes first then later {"), null);
});

// =====================================================================
// fenced ```json … ``` blocks (preferred path)
// =====================================================================

test("extracts a ```json fence and trims surrounding whitespace", () => {
  const out = extractJsonBlock('```json\n  {"a": 1}  \n```');
  assert.equal(out, '{"a": 1}');
});

test("extracts a fence with no language tag", () => {
  const out = extractJsonBlock('```\n{"a": 1}\n```');
  assert.equal(out, '{"a": 1}');
});

test("extracts a fence with the language tag in upper case", () => {
  // The regex flag `i` covers ```JSON, ```Json, etc.
  const out = extractJsonBlock('```JSON\n{"a": 1}\n```');
  assert.equal(out, '{"a": 1}');
});

test("ignores any chatter before / after the fence", () => {
  const out = extractJsonBlock(
    'Sure, here you go:\n```json\n{"ok": true}\n```\nLet me know!',
  );
  assert.equal(out, '{"ok": true}');
});

test("when there are multiple fences the first one wins (regex is non-greedy)", () => {
  const out = extractJsonBlock(
    '```json\n{"first": 1}\n```\n\n```json\n{"second": 2}\n```',
  );
  assert.equal(out, '{"first": 1}');
});

test("when both a fence AND stray braces appear, the fence wins", () => {
  // The fence branch is checked first and returns immediately, so
  // the brace fallback never runs — even though `{garbage}` and
  // `{also garbage}` would otherwise be valid balanced spans.
  const out = extractJsonBlock(
    'preamble {garbage}\n```json\n{"real": true}\n```\nepilogue {also garbage}',
  );
  assert.equal(out, '{"real": true}');
});

test("preserves the inner JSON as-is, including newlines", () => {
  const out = extractJsonBlock('```json\n{\n  "a": 1,\n  "b": 2\n}\n```');
  assert.equal(out, '{\n  "a": 1,\n  "b": 2\n}');
});

test("a fence with whitespace-only content trims to empty string (not null)", () => {
  // The fence DID match, and the inner content trims to "". The
  // caller will then fail to parse "" as JSON — that's correct
  // behaviour; we successfully identified the (empty) block.
  assert.equal(extractJsonBlock("```json\n   \n```"), "");
});

// =====================================================================
// {…} fallback when no fence is present
// =====================================================================

test("falls back to the first…last brace span when no fence is present", () => {
  const out = extractJsonBlock('Here is data: {"a": 1, "b": 2} that is all.');
  assert.equal(out, '{"a": 1, "b": 2}');
});

test("falls back: a bare object string is returned as-is", () => {
  assert.equal(extractJsonBlock("{}"), "{}");
});

test("falls back: spans from the FIRST { to the LAST } across multiple objects", () => {
  // We don't bracket-match — the outermost slice wins. This is
  // documented behaviour because the model only ever emits one
  // top-level object in practice; locking it in here so any future
  // change to bracket-matching is deliberate.
  const out = extractJsonBlock('chatter {"a":1} more {"b":2} end');
  assert.equal(out, '{"a":1} more {"b":2}');
});

test("falls back: handles nested braces inside the JSON object", () => {
  const out = extractJsonBlock(
    'before {"outer": {"inner": 1}} after',
  );
  assert.equal(out, '{"outer": {"inner": 1}}');
});

test("falls back: { with no closing } returns null", () => {
  assert.equal(extractJsonBlock("starts { but never ends"), null);
});

test("falls back: text with only matching { and } adjacent → '{ }'", () => {
  // start=0 end=2, slice(0,3) = "{ }".
  assert.equal(extractJsonBlock("{ }"), "{ }");
});
