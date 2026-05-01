/** Crew Adequacy meter — Phase C, Slice 3.
 *
 *  The producer fills in the rigging / LED / lighting / stage tabs
 *  with the project's physical scope (hoist points, LED area, fixture
 *  count, etc). This module turns those numbers into a *suggested
 *  range* per crew role and compares it to who's actually on the
 *  roster. The UI surfaces the result as "Suggested 6–8 riggers,
 *  you have 5 → likely short by 1–3" — always a range, never a
 *  single number, because the right crew size depends on judgement
 *  the tool can't capture (talent, weather, venue idiosyncrasies).
 *
 *  All thresholds + ratios live in `DEFAULT_CONFIG` below so a PM
 *  who disagrees with our defaults can tune one place. The rules
 *  themselves come from the user's own field notes (see the Phase C
 *  brief): conservative ratios that lean towards "one too many" for
 *  big shows, on the basis that the cost of being short on a load-in
 *  morning dwarfs an extra day rate. */

/** Inputs the producer assembles from the rest of the app. None of
 *  these are negotiable defaults — the PM either typed them or the
 *  rigging/LED/etc. tabs computed them. */
export type AdequacyMetrics = {
  /** Total rigging hoist points (all motors combined). */
  hoistPoints: number;
  /** LED screen area in m². */
  ledArea: number;
  /** Stage area in m². */
  stageArea: number;
  /** Lighting fixture count (movers + conventionals). */
  fixtureCount: number;
  /** Number of days budgeted for setup (load-in + program). When ≤
   *  config.setupTightDays the rigger / stagehand counts get a
   *  bump to absorb the parallelism crunch. */
  setupDays: number;
  /** Number of independent LED walls (FOH, IMAG, scenic). One
   *  video op per wall — they can't physically multi-cab. */
  ledWallCount: number;
  /** True for ticketed / public-facing shows. Triggers the
   *  dedicated FOH + monitor sound positions. */
  ticketed: boolean;
};

/** Crew role keys the meter cares about. Deliberately narrower than
 *  the call sheet's CREW_ROLES — we only score the roles the user's
 *  rules actually mention. Other roles (Driver, PM, ...) are out of
 *  scope for adequacy. */
export type AdequacyRoleKey =
  | "toprigger"
  | "stagehand"
  | "ld"
  | "videoOp"
  | "fohSound"
  | "monitorSound";

export const ADEQUACY_ROLE_LABELS: Record<AdequacyRoleKey, string> = {
  toprigger: "Topriggers",
  stagehand: "Stagehands",
  // The FOH trio uses the producer's everyday vocabulary so the
  // panel reads as "1 Sound FOH, 1 Lights FOH, 1 AV FOH" — matching
  // how a Norwegian rental-house PM thinks about the call sheet.
  // The bracketed alias keeps the technical role visible for PMs
  // who file freelancers under "LD" or "Video op" on the call sheet.
  ld: "Lights FOH (LD)",
  videoOp: "AV FOH (video op)",
  fohSound: "Sound FOH",
  monitorSound: "Monitor sound",
};

export type AdequacyConfig = {
  hoistPointsPerToprigger: number;
  hoistPointsPerStagehand: number;
  fixturesPerLD: number;
  setupTightDays: number;
  ledTightArea: number;
  stageBigArea: number;
  fixturesBigCount: number;
};

/** Defaults straight from the user's field notes. Keep them here so
 *  there's exactly one place to look when "the meter says 8 riggers
 *  but I always run with 6" comes up in QA. */
export const DEFAULT_ADEQUACY_CONFIG: AdequacyConfig = {
  hoistPointsPerToprigger: 20,
  hoistPointsPerStagehand: 7,
  fixturesPerLD: 60,
  setupTightDays: 1,
  ledTightArea: 30,
  stageBigArea: 80,
  fixturesBigCount: 80,
};

/** A single role's recommendation. `min` and `max` are always
 *  integers ≥ 0; equal endpoints (e.g. "1–1 video op per wall") are
 *  legal and rendered without the dash. `shortBy` is the gap below
 *  the lower bound — positive when understaffed, 0 when adequate.
 *  `over` is the surplus above the upper bound — non-zero only when
 *  the producer has booked more than the meter suggests, which we
 *  show as a soft warning ("might be over-crewed"). */
export type AdequacySuggestion = {
  role: AdequacyRoleKey;
  label: string;
  min: number;
  max: number;
  current: number;
  /** max(0, min - current). */
  shortBy: number;
  /** max(0, current - max). */
  over: number;
  /** Human-readable list of which rules fired. UI uses this in the
   *  "why" tooltip so the PM can see why the meter is suggesting
   *  what it is. */
  modifiers: string[];
};

export type AdequacyResult = {
  suggestions: AdequacySuggestion[];
};

/** Add two integer ranges, clamping the result to ≥ 0 on both ends. */
function addRange(
  a: { min: number; max: number },
  b: { min: number; max: number },
): { min: number; max: number } {
  return {
    min: Math.max(0, a.min + b.min),
    max: Math.max(0, a.max + b.max),
  };
}

/** Convert a "X per Y" ratio into an integer range. Floor / ceil
 *  give a one-unit window even on perfect divisions (e.g. 60
 *  fixtures / 60 → [1, 1] not [1, 1]) so the UI always reads as a
 *  range. Returns [0, 0] when the input is 0 (nothing to staff). */
function ratioRange(value: number, per: number): { min: number; max: number } {
  if (value <= 0 || per <= 0) return { min: 0, max: 0 };
  const exact = value / per;
  return { min: Math.floor(exact), max: Math.ceil(exact) };
}

/** Compute the crew-adequacy suggestions. Pure function — feed it
 *  the same inputs and you get the same suggestions, which is what
 *  makes the unit tests trivial.
 *
 *  `currentByRole` is the producer's actual headcount per role. The
 *  caller is responsible for mapping their roster (RosterRow[]) into
 *  this shape — see `countRosterByAdequacyRole` below for the
 *  default mapping the Crew tab uses. */
export function computeCrewAdequacy(
  metrics: AdequacyMetrics,
  currentByRole: Record<AdequacyRoleKey, number>,
  configOverride?: Partial<AdequacyConfig>,
): AdequacyResult {
  const cfg = { ...DEFAULT_ADEQUACY_CONFIG, ...configOverride };
  const tightSetup = metrics.setupDays > 0 && metrics.setupDays <= cfg.setupTightDays;

  // "Any production scope" means there's *something* to crew — any
  // rigging, lighting, LED, stage, ticketed audience or video wall.
  // The three FOH positions (Sound FOH, Lights FOH = LD, AV FOH =
  // video op) are baseline 1 each whenever any of these is true,
  // matching the producer's standard rule of thumb: "almost every
  // show needs 1 of each FOH". For an empty/blank project the
  // baseline drops to 0 so the panel doesn't shout three "short by 1"
  // warnings on the day a new project is created.
  const anyScope =
    metrics.hoistPoints > 0 ||
    metrics.fixtureCount > 0 ||
    metrics.ledArea > 0 ||
    metrics.stageArea > 0 ||
    metrics.ledWallCount > 0 ||
    metrics.ticketed;

  const out: AdequacySuggestion[] = [];

  // ── Topriggers ────────────────────────────────────────────────
  {
    let range = ratioRange(metrics.hoistPoints, cfg.hoistPointsPerToprigger);
    const mods: string[] = [];
    if (tightSetup && metrics.hoistPoints > 0) {
      range = addRange(range, { min: 1, max: 1 });
      mods.push("Tight setup window (≤1 day): +1 toprigger.");
    }
    out.push(buildSuggestion("toprigger", range, currentByRole.toprigger, mods));
  }

  // ── Stagehands ────────────────────────────────────────────────
  {
    let range = ratioRange(metrics.hoistPoints, cfg.hoistPointsPerStagehand);
    const mods: string[] = [];
    if (tightSetup && metrics.hoistPoints > 0) {
      range = addRange(range, { min: 2, max: 2 });
      mods.push("Tight setup window (≤1 day): +2 stagehands.");
    }
    if (metrics.ledArea > cfg.ledTightArea) {
      range = addRange(range, { min: 1, max: 1 });
      mods.push(`LED area > ${cfg.ledTightArea} m²: +1 stagehand.`);
    }
    if (metrics.stageArea > cfg.stageBigArea) {
      // "1–2 stagehands when stage total > 80 m²" — encoded as a
      // range so the upper bound captures the user's intent without
      // forcing the PM to a single number.
      range = addRange(range, { min: 1, max: 2 });
      mods.push(`Stage area > ${cfg.stageBigArea} m²: +1–2 stagehands.`);
    }
    if (metrics.fixtureCount > cfg.fixturesBigCount) {
      range = addRange(range, { min: 1, max: 1 });
      mods.push(`Lighting fixtures > ${cfg.fixturesBigCount}: +1 stagehand.`);
    }
    out.push(buildSuggestion("stagehand", range, currentByRole.stagehand, mods));
  }

  // ── Lighting designers / "Lights FOH" (1 baseline + 1 per 60 fixtures) ─
  //
  // Producer rule: "almost every show needs 1 Lights FOH". We
  // baseline at 1 whenever there's any production scope (so a
  // small corporate AV gig with no rig still gets the LD line
  // suggested), then layer the fixture ratio on top so big rigs
  // bump the upper bound. The fixture ratio doesn't add to the
  // baseline — it lifts `max` to capture "at 120 fixtures you
  // probably want 2".
  {
    const ratio = ratioRange(metrics.fixtureCount, cfg.fixturesPerLD);
    const baseline = anyScope ? { min: 1, max: 1 } : { min: 0, max: 0 };
    // Combine: baseline floor + ratio. Ratio never lowers the floor;
    // it only widens the window for big rigs.
    const range = {
      min: Math.max(baseline.min, ratio.min),
      max: Math.max(baseline.max, ratio.max),
    };
    const mods: string[] = [];
    if (anyScope) mods.push("Almost every show needs 1 Lights FOH.");
    if (metrics.fixtureCount > 0) {
      mods.push(
        `~1 LD per ${cfg.fixturesPerLD} fixtures (${metrics.fixtureCount} fixtures here).`,
      );
    }
    out.push(buildSuggestion("ld", range, currentByRole.ld, mods));
  }

  // ── Video ops / "AV FOH" (1 baseline + 1 per extra LED wall) ─
  //
  // Same baseline-1 logic as Lights FOH: producer says "almost
  // every show needs 1 AV FOH". When there are multiple LED walls
  // each needs its own op (they can't physically multi-cab), so
  // the count scales with `ledWallCount` — but we ensure the
  // floor is at least 1 for any show with scope.
  {
    const wallRange = {
      min: Math.max(0, Math.floor(metrics.ledWallCount)),
      max: Math.max(0, Math.ceil(metrics.ledWallCount)),
    };
    const baseline = anyScope ? { min: 1, max: 1 } : { min: 0, max: 0 };
    const range = {
      min: Math.max(baseline.min, wallRange.min),
      max: Math.max(baseline.max, wallRange.max),
    };
    const mods: string[] = [];
    if (anyScope) mods.push("Almost every show needs 1 AV FOH.");
    if (metrics.ledWallCount > 0) {
      mods.push(`1 video op per LED wall (${metrics.ledWallCount} walls).`);
    }
    out.push(buildSuggestion("videoOp", range, currentByRole.videoOp, mods));
  }

  // ── FOH sound (1 baseline whenever there's any scope) ─────────
  //
  // Producer rule: "almost every show needs 1 Sound FOH".
  // Previously this was ticketed-only, which under-counted on
  // corporate / private gigs that still need an A1. Baseline 1
  // whenever there's any scope; the `ticketed` flag no longer
  // adds anything here (it still adds a Monitor engineer below).
  {
    const range = anyScope ? { min: 1, max: 1 } : { min: 0, max: 0 };
    const mods: string[] = [];
    if (anyScope) mods.push("Almost every show needs 1 Sound FOH.");
    out.push(buildSuggestion("fohSound", range, currentByRole.fohSound, mods));
  }
  {
    const range = metrics.ticketed
      ? { min: 1, max: 1 }
      : { min: 0, max: 0 };
    const mods = metrics.ticketed
      ? ["Ticketed show: needs a dedicated monitor engineer."]
      : [];
    out.push(
      buildSuggestion("monitorSound", range, currentByRole.monitorSound, mods),
    );
  }

  return { suggestions: out };
}

function buildSuggestion(
  role: AdequacyRoleKey,
  range: { min: number; max: number },
  current: number,
  modifiers: string[],
): AdequacySuggestion {
  return {
    role,
    label: ADEQUACY_ROLE_LABELS[role],
    min: range.min,
    max: range.max,
    current,
    shortBy: Math.max(0, range.min - current),
    over: Math.max(0, current - range.max),
    modifiers,
  };
}

/** Map a roster row's free-text `role` string onto the adequacy
 *  role key, or null if the role is out of scope (Driver, PM, ...).
 *  The mapping mirrors the call sheet's `CREW_ROLES` plus a few
 *  sensible synonyms so a freelancer profile filed under "Stage" or
 *  "Topp Rigger" still classifies. Case-insensitive. */
export function mapRoleToAdequacyKey(role: string): AdequacyRoleKey | null {
  const r = role.trim().toLowerCase();
  if (!r) return null;
  // Topriggers — call sheet has a single "Rigging" department; we
  // treat the whole department as toprigger candidates because the
  // producer's stagehand count comes from the dedicated "Stage Hand"
  // / "Stage" rows (not from "Rigging").
  if (r === "rigging" || r.includes("toprig") || r.includes("topp rig")) {
    return "toprigger";
  }
  if (r.includes("stage hand") || r === "stage" || r === "stagehand") {
    return "stagehand";
  }
  // LD: the call sheet has "Lighting" and "Lighting FOH"; either
  // counts as an LD for adequacy purposes (a ticketed lighting FOH
  // op IS the show LD on most Norwegian touring crews).
  if (r === "lighting" || r === "lighting foh" || r.includes("ld")) {
    return "ld";
  }
  if (r === "video / led" || r.includes("video") || r.includes("led op")) {
    return "videoOp";
  }
  if (r === "av foh" || r === "sound foh" || r === "foh") {
    return "fohSound";
  }
  if (r === "monitor" || r.includes("monitor")) {
    return "monitorSound";
  }
  // "Sound" without further qualification → assume FOH on a non-
  // ticketed show, but for ticketed shows the producer is expected
  // to have split the rows; we still classify as FOH so the meter
  // doesn't double-count one row across both positions.
  if (r === "sound" || r === "system tech") return "fohSound";
  return null;
}

/** Default mapping from the merged roster (RosterRow.role strings)
 *  to the per-role headcount the adequacy meter consumes. Out-of-
 *  scope roles are dropped. */
export function countRosterByAdequacyRole(
  roles: ReadonlyArray<string>,
): Record<AdequacyRoleKey, number> {
  const out: Record<AdequacyRoleKey, number> = {
    toprigger: 0,
    stagehand: 0,
    ld: 0,
    videoOp: 0,
    fohSound: 0,
    monitorSound: 0,
  };
  for (const r of roles) {
    const key = mapRoleToAdequacyKey(r);
    if (key) out[key] += 1;
  }
  return out;
}
