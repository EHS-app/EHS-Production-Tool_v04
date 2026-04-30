/** Unit tests for the pure pairing engine. Run with:
 *
 *    node --experimental-strip-types --test \
 *      artifacts/api-server/src/lib/roomPairing.test.ts
 *
 *  No vitest dependency on purpose — the algo is dependency-free
 *  TypeScript, so Node 22+'s built-in stripper + test runner is the
 *  lightest possible harness. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { assignRooms, type PairingPerson } from "./roomPairing.ts";

function p(
  id: string,
  name: string,
  ci: string | null,
  co: string | null,
  share: PairingPerson["roomShare"] = "either",
  gender: PairingPerson["gender"] = "",
): PairingPerson {
  return {
    freelancerUserId: id,
    name,
    checkInDate: ci,
    checkOutDate: co,
    roomShare: share,
    gender,
  };
}

test("singletons get their own room", () => {
  const out = assignRooms(
    [p("a", "Alice", "2025-01-01", "2025-01-03", "single")],
    [],
  );
  assert.equal(out.length, 1);
  assert.equal(out[0].roomKey, "room-1");
  assert.equal(out[0].locked, false);
});

test("two compatible twins pair into one room", () => {
  const out = assignRooms(
    [
      p("a", "Alice", "2025-01-01", "2025-01-03", "twin", "female"),
      p("b", "Beth", "2025-01-01", "2025-01-03", "twin", "female"),
    ],
    [],
  );
  assert.equal(out.length, 2);
  assert.equal(out[0].roomKey, out[1].roomKey);
  assert.equal(out.every((x) => !x.locked), true);
});

test("non-overlapping stays do NOT pair", () => {
  const out = assignRooms(
    [
      p("a", "Alice", "2025-01-01", "2025-01-02", "twin"),
      p("b", "Beth", "2025-01-05", "2025-01-06", "twin"),
    ],
    [],
  );
  // Each gets their own room since their stays don't overlap.
  assert.notEqual(out[0].roomKey, out[1].roomKey);
});

test("missing dates → singleton room (not paired)", () => {
  const out = assignRooms(
    [
      p("a", "Alice", null, null, "twin"),
      p("b", "Beth", "2025-01-01", "2025-01-03", "twin"),
    ],
    [],
  );
  assert.notEqual(out[0].roomKey, out[1].roomKey);
});

test("gender preference: same-gender wins over mixed when overlapping", () => {
  // Three overlapping twin candidates: a (male), b (female), c (male).
  // Expectation: a ↔ c (same gender), b solo. Names matter for stable
  // sort: with our ordering "Alex" "Bob" "Cal" → a=Alex, b=Bob, c=Cal.
  const out = assignRooms(
    [
      p("a", "Alex", "2025-01-01", "2025-01-03", "twin", "male"),
      p("b", "Bob", "2025-01-01", "2025-01-03", "twin", "female"),
      p("c", "Cal", "2025-01-01", "2025-01-03", "twin", "male"),
    ],
    [],
  );
  const byUser = Object.fromEntries(out.map((x) => [x.freelancerUserId, x]));
  assert.equal(byUser.a.roomKey, byUser.c.roomKey, "Alex+Cal should pair");
  assert.notEqual(byUser.b.roomKey, byUser.a.roomKey, "Bob should be solo");
});

test("locked rooms honoured exactly + partner stays in same room", () => {
  // Lock a+b together explicitly. Even if c (same gender as a) is a
  // better engine pick, lock wins.
  const out = assignRooms(
    [
      p("a", "Alex", "2025-01-01", "2025-01-03", "twin", "male"),
      p("b", "Bob", "2025-01-01", "2025-01-03", "twin", "female"),
      p("c", "Cal", "2025-01-01", "2025-01-03", "twin", "male"),
    ],
    [
      { freelancerUserId: "a", roomKey: "room-7" },
      { freelancerUserId: "b", roomKey: "room-7" },
    ],
  );
  const byUser = Object.fromEntries(out.map((x) => [x.freelancerUserId, x]));
  assert.equal(byUser.a.roomKey, "room-7");
  assert.equal(byUser.b.roomKey, "room-7");
  assert.equal(byUser.a.locked, true);
  assert.equal(byUser.b.locked, true);
  assert.notEqual(byUser.c.roomKey, "room-7");
  assert.equal(byUser.c.locked, false);
});

test("fresh keys skip past locked room numbers", () => {
  // Lock pair into room-1 explicitly. Fresh suggestions should start
  // at room-2, not collide.
  const out = assignRooms(
    [
      p("a", "Alex", "2025-01-01", "2025-01-03", "twin", "male"),
      p("b", "Bob", "2025-01-01", "2025-01-03", "twin", "male"),
      p("c", "Cal", "2025-01-01", "2025-01-03", "single"),
    ],
    [
      { freelancerUserId: "a", roomKey: "room-1" },
      { freelancerUserId: "b", roomKey: "room-1" },
    ],
  );
  const byUser = Object.fromEntries(out.map((x) => [x.freelancerUserId, x]));
  assert.equal(byUser.a.roomKey, "room-1");
  assert.equal(byUser.c.roomKey, "room-2", "Cal should land in room-2");
});

test("output is deterministic regardless of input order", () => {
  const people = [
    p("c", "Cal", "2025-01-01", "2025-01-03", "twin", "male"),
    p("a", "Alex", "2025-01-01", "2025-01-03", "twin", "male"),
    p("b", "Bob", "2025-01-01", "2025-01-03", "twin", "female"),
  ];
  const reversed = [...people].reverse();
  const o1 = assignRooms(people, []);
  const o2 = assignRooms(reversed, []);
  // Sort both for comparison since insertion order differs but the
  // assignment per user must match.
  const byUser1 = Object.fromEntries(
    o1.map((x) => [x.freelancerUserId, x.roomKey]),
  );
  const byUser2 = Object.fromEntries(
    o2.map((x) => [x.freelancerUserId, x.roomKey]),
  );
  assert.deepEqual(byUser1, byUser2);
});

test("partial overlap counts as overlap", () => {
  // Alice 1–4, Beth 3–6 — overlap on 3–4. Should pair.
  const out = assignRooms(
    [
      p("a", "Alice", "2025-01-01", "2025-01-04", "twin"),
      p("b", "Beth", "2025-01-03", "2025-01-06", "twin"),
    ],
    [],
  );
  assert.equal(out[0].roomKey, out[1].roomKey);
});

test("touching ranges (a checks out same day b checks in) do NOT overlap", () => {
  // Alice checks out morning of 1-03; Beth arrives evening 1-03.
  // That's a same-day handoff — physically can't share, so engine
  // must NOT pair them.
  const out = assignRooms(
    [
      p("a", "Alice", "2025-01-01", "2025-01-03", "twin"),
      p("b", "Beth", "2025-01-03", "2025-01-05", "twin"),
    ],
    [],
  );
  assert.notEqual(out[0].roomKey, out[1].roomKey);
});

test("'either' pref pairs with 'twin' pref", () => {
  // 'single' is the only forbidder; 'either' should be willing.
  const out = assignRooms(
    [
      p("a", "Alice", "2025-01-01", "2025-01-03", "either"),
      p("b", "Beth", "2025-01-01", "2025-01-03", "twin"),
    ],
    [],
  );
  assert.equal(out[0].roomKey, out[1].roomKey);
});

test("'single' pref never paired even when overlapping", () => {
  const out = assignRooms(
    [
      p("a", "Alice", "2025-01-01", "2025-01-03", "single"),
      p("b", "Beth", "2025-01-01", "2025-01-03", "single"),
    ],
    [],
  );
  assert.notEqual(out[0].roomKey, out[1].roomKey);
});

test("odd number of twin candidates → one solo room", () => {
  const out = assignRooms(
    [
      p("a", "Alice", "2025-01-01", "2025-01-03", "twin", "female"),
      p("b", "Beth", "2025-01-01", "2025-01-03", "twin", "female"),
      p("c", "Cara", "2025-01-01", "2025-01-03", "twin", "female"),
    ],
    [],
  );
  const keys = new Set(out.map((x) => x.roomKey));
  // 2 distinct rooms: one shared, one solo.
  assert.equal(keys.size, 2);
});

test("locked solo room left alone — engine doesn't add a partner", () => {
  // Lock Alice alone in room-3. Beth (same prefs) should NOT be
  // pulled into room-3 by the engine.
  const out = assignRooms(
    [
      p("a", "Alice", "2025-01-01", "2025-01-03", "twin", "female"),
      p("b", "Beth", "2025-01-01", "2025-01-03", "twin", "female"),
    ],
    [{ freelancerUserId: "a", roomKey: "room-3" }],
  );
  const byUser = Object.fromEntries(out.map((x) => [x.freelancerUserId, x]));
  assert.equal(byUser.a.roomKey, "room-3");
  assert.equal(byUser.a.locked, true);
  assert.notEqual(byUser.b.roomKey, "room-3");
  assert.equal(byUser.b.locked, false);
});
