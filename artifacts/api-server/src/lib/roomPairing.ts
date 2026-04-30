/** Pure twin-share room pairing engine for the Hotel Logistics
 *  feature. Deterministic, side-effect free, no DB access — exists as
 *  a library so it can be unit-tested in isolation and reused by both
 *  the GET endpoint (suggestion view) and any future "auto-rooming"
 *  bulk action.
 *
 *  Inputs are simplified to just what pairing needs (id, dates,
 *  prefs, gender). The endpoint maps from gigs/profile rows; the
 *  algo never touches Drizzle.
 *
 *  Algorithm overview:
 *    1. Locked assignments are honoured exactly — every locked person
 *       keeps their stored roomKey. We process them first so any
 *       unlocked candidate that lands in the same suggestion later
 *       respects the existing room boundary.
 *    2. Among unlocked people:
 *       - room_share === 'single' → own singleton room.
 *       - Otherwise greedy match: for each still-unmatched person,
 *         scan the remaining candidates for the best compatible
 *         partner (overlapping stay AND room_share != 'single')
 *         scored by gender preference, tie-broken deterministically.
 *    3. Anyone left without a partner gets their own room (twin with
 *       an empty bed). The producer can later swap them into a real
 *       pair via the /swap endpoint.
 *
 *  Determinism notes:
 *  - Input order does not matter — we sort by `(name, freelancerUserId)`
 *    inside, so two callers with shuffled inputs produce identical
 *    output. This matters for the UI: if we re-fetch after a no-op
 *    edit the rooms must not visually shuffle.
 *  - Room key generation uses a counter starting at 1, NEVER reusing
 *    a key from the locked set. This way `room-1` always means the
 *    same physical-room slot across renders even as locks change. */

export type RoomShare = "twin" | "single" | "either";
export type PairingGender = "" | "female" | "male" | "other";

export type PairingPerson = {
  freelancerUserId: string;
  /** Display name — used only for stable sort. The algo never reads
   *  it for matching. */
  name: string;
  /** ISO YYYY-MM-DD or null. Person is skipped from pairing if either
   *  date is missing — they need a hotel but the dates aren't pinned
   *  yet, so the algo gives them a singleton room and lets the
   *  producer revisit. */
  checkInDate: string | null;
  checkOutDate: string | null;
  roomShare: RoomShare;
  gender: PairingGender;
};

export type LockedRoom = {
  freelancerUserId: string;
  roomKey: string;
};

export type RoomAssignment = {
  freelancerUserId: string;
  roomKey: string;
  /** Whether this row was honoured from the locked input vs computed
   *  by the engine. The endpoint surfaces this so the UI can render a
   *  lock icon next to locked rows. */
  locked: boolean;
};

/** Return true iff [aIn, aOut) and [bIn, bOut) intersect. We treat
 *  the check-out date as exclusive (the morning the room is vacated),
 *  matching the date-derivation rule in the GET endpoint. Same-day
 *  check-in/check-out is a zero-night stay — never pairable. */
function rangesOverlap(
  aIn: string,
  aOut: string,
  bIn: string,
  bOut: string,
): boolean {
  return aIn < bOut && bIn < aOut;
}

/** Gender compatibility score, higher = better.
 *    2 = both explicit AND matching
 *    1 = at least one undeclared (treated as wildcard)
 *    0 = both explicit AND different (worst — only used as a last
 *        resort, and only when the producer hasn't said otherwise via
 *        a lock)
 *  We never *forbid* a mixed pairing because some crew explicitly
 *  prefer it (couples, friends) — the producer can always override
 *  via swap. The score only nudges the default. */
function genderScore(a: PairingGender, b: PairingGender): number {
  if (a !== "" && b !== "" && a === b) return 2;
  if (a === "" || b === "") return 1;
  return 0;
}

export function assignRooms(
  people: ReadonlyArray<PairingPerson>,
  locks: ReadonlyArray<LockedRoom>,
): RoomAssignment[] {
  const lockedByUser = new Map<string, string>();
  for (const l of locks) {
    if (l.roomKey && l.freelancerUserId) {
      lockedByUser.set(l.freelancerUserId, l.roomKey);
    }
  }

  // Stable sort — see "Determinism notes" in the file header.
  const sorted = [...people].sort((a, b) => {
    const cmp = a.name.localeCompare(b.name);
    if (cmp !== 0) return cmp;
    return a.freelancerUserId.localeCompare(b.freelancerUserId);
  });

  // Counter for fresh room keys. We start above the highest "room-N"
  // already used by the locked set so locked rooms keep their numeric
  // identity and unlocked suggestions slot in afterwards.
  let nextRoomNumber = 1;
  const usedKeys = new Set<string>(lockedByUser.values());
  for (const k of usedKeys) {
    const m = /^room-(\d+)$/.exec(k);
    if (m) {
      const n = Number(m[1]);
      if (Number.isFinite(n) && n >= nextRoomNumber) nextRoomNumber = n + 1;
    }
  }
  function freshKey(): string {
    // Skip any externally-assigned keys (e.g. a future "VIP suite"
    // rename) so we don't collide with them.
    let key = `room-${nextRoomNumber}`;
    while (usedKeys.has(key)) {
      nextRoomNumber++;
      key = `room-${nextRoomNumber}`;
    }
    usedKeys.add(key);
    nextRoomNumber++;
    return key;
  }

  const out: RoomAssignment[] = [];
  const matched = new Set<string>();

  // Phase 1: emit locked assignments verbatim.
  for (const p of sorted) {
    const lockedKey = lockedByUser.get(p.freelancerUserId);
    if (lockedKey) {
      out.push({
        freelancerUserId: p.freelancerUserId,
        roomKey: lockedKey,
        locked: true,
      });
      matched.add(p.freelancerUserId);
    }
  }

  // Phase 2: singletons (preference == 'single' OR missing dates).
  // Missing-date people CAN'T be safely paired — we don't know their
  // overlap. Give them their own room and let the producer revisit
  // once dates are set.
  for (const p of sorted) {
    if (matched.has(p.freelancerUserId)) continue;
    if (
      p.roomShare === "single" ||
      !p.checkInDate ||
      !p.checkOutDate
    ) {
      out.push({
        freelancerUserId: p.freelancerUserId,
        roomKey: freshKey(),
        locked: false,
      });
      matched.add(p.freelancerUserId);
    }
  }

  // Phase 3: greedy twin/either pairing.
  for (let i = 0; i < sorted.length; i++) {
    const a = sorted[i];
    if (matched.has(a.freelancerUserId)) continue;
    // Find best partner among the remaining unmatched candidates.
    let bestIdx = -1;
    let bestScore = -1;
    for (let j = i + 1; j < sorted.length; j++) {
      const b = sorted[j];
      if (matched.has(b.freelancerUserId)) continue;
      // b is also a non-single by phase 2's elimination — check share
      // pref defensively in case phase 2 logic changes later.
      if (b.roomShare === "single") continue;
      if (!b.checkInDate || !b.checkOutDate) continue;
      // Both dates exist for a (else phase 2 would have caught it).
      if (
        !rangesOverlap(
          a.checkInDate as string,
          a.checkOutDate as string,
          b.checkInDate,
          b.checkOutDate,
        )
      ) {
        continue;
      }
      const score = genderScore(a.gender, b.gender);
      // Strict > so the *first* (alphabetically earliest) candidate
      // wins ties — keeps output stable across re-renders.
      if (score > bestScore) {
        bestScore = score;
        bestIdx = j;
      }
    }
    if (bestIdx === -1) {
      // No compatible partner — solo (twin with empty bed). Producer
      // can swap a roommate in later.
      out.push({
        freelancerUserId: a.freelancerUserId,
        roomKey: freshKey(),
        locked: false,
      });
      matched.add(a.freelancerUserId);
    } else {
      const b = sorted[bestIdx];
      const key = freshKey();
      out.push({
        freelancerUserId: a.freelancerUserId,
        roomKey: key,
        locked: false,
      });
      out.push({
        freelancerUserId: b.freelancerUserId,
        roomKey: key,
        locked: false,
      });
      matched.add(a.freelancerUserId);
      matched.add(b.freelancerUserId);
    }
  }

  return out;
}
