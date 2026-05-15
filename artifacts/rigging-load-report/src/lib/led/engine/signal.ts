/** Signal-chain validation helpers. Pure, deterministic. */

import type { LedPortAssignment, LedScreen } from "../../led";
import { cellFromIndex } from "../../led";

/** Default for any Uniview UR Pro family cabinet — 16 cabs max per
 *  CAT chain per the receiving-card spec. Producer can override
 *  per-screen via `screen.maxCabinetsPerDataChain`. */
export const DEFAULT_MAX_CABINETS_PER_DATA_CHAIN = 16;

export type ChainCheck = {
  ok: boolean;
  /** Cabinets currently on this chain. */
  length: number;
  /** Cap applied in the check (per-screen override or default). */
  cap: number;
  /** True if `length > cap`. */
  overCap: boolean;
  /** True if any two consecutive cabinets are more than 1 cell apart
   *  (i.e. the chain skips physically). Skips don't fail by themselves
   *  but warn so the producer double-checks the cable route. */
  hasSkips: boolean;
};

/** Validate a single port's chain. */
export function checkChain(
  assignment: LedPortAssignment,
  screen: LedScreen,
  maxPerChain: number = DEFAULT_MAX_CABINETS_PER_DATA_CHAIN,
): ChainCheck {
  const cap =
    typeof screen.maxCabinetsPerDataChain === "number" &&
    screen.maxCabinetsPerDataChain > 0
      ? screen.maxCabinetsPerDataChain
      : maxPerChain;
  const length = assignment.cells.length;
  let hasSkips = false;
  for (let i = 1; i < assignment.cells.length; i++) {
    const a = cellFromIndex(assignment.cells[i - 1]!, screen.panelsWide);
    const b = cellFromIndex(assignment.cells[i]!, screen.panelsWide);
    const dc = Math.abs(a.col - b.col);
    const dr = Math.abs(a.row - b.row);
    // A non-skip step is exactly one cell N/S/E/W. Diagonals + jumps
    // count as skips and trigger a visual warning on the patch sheet.
    if (!((dc === 1 && dr === 0) || (dc === 0 && dr === 1))) {
      hasSkips = true;
      break;
    }
  }
  return {
    ok: length <= cap,
    length,
    cap,
    overCap: length > cap,
    hasSkips,
  };
}

/** Aggregate all chains on a screen for the dashboard / validator. */
export function checkAllChains(
  assignments: LedPortAssignment[],
  screen: LedScreen,
  maxPerChain: number = DEFAULT_MAX_CABINETS_PER_DATA_CHAIN,
): {
  total: number;
  overCap: number;
  withSkips: number;
} {
  let overCap = 0;
  let withSkips = 0;
  for (const a of assignments) {
    const c = checkChain(a, screen, maxPerChain);
    if (c.overCap) overCap += 1;
    if (c.hasSkips) withSkips += 1;
  }
  return { total: assignments.length, overCap, withSkips };
}
