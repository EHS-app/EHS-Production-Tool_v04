/** Routing solver — assigns cabinets on a screen to processor output
 *  ports. Pure, deterministic. Consumed by:
 *  - PortMappingPanel (interactive editor; producer can override)
 *  - Auto-topology dialog (initial assignment when a screen is added)
 *  - Validation runner (CHAIN_TOO_LONG, PORT_OVERLOAD, ORPHAN_CABINET)
 *  - Patch-sheet CSV exporter
 */

import type {
  LedChainPattern,
  LedPortAssignment,
  LedScreen,
} from "../../led";
import { cellFromIndex, cellIndex, disabledCellSet } from "../../led";

/** Generate the ordered list of enabled cell indexes for a screen,
 *  walked in the requested pattern. The first cell is the chain
 *  start; the engine reads order left-to-right in the array. */
export function walkScreen(
  screen: LedScreen,
  pattern: LedChainPattern,
): number[] {
  const disabled = disabledCellSet(screen);
  const cells: number[] = [];
  const w = screen.panelsWide;
  const h = screen.panelsTall;
  if (pattern === "row" || pattern === "serpentine-row") {
    for (let r = 0; r < h; r++) {
      const leftToRight =
        pattern === "row" ? true : r % 2 === 0;
      for (let i = 0; i < w; i++) {
        const c = leftToRight ? i : w - 1 - i;
        const idx = cellIndex(c, r, w);
        if (!disabled.has(idx)) cells.push(idx);
      }
    }
  } else if (pattern === "column" || pattern === "serpentine-col") {
    for (let c = 0; c < w; c++) {
      const topToBottom = pattern === "column" ? true : c % 2 === 0;
      for (let i = 0; i < h; i++) {
        const r = topToBottom ? i : h - 1 - i;
        const idx = cellIndex(c, r, w);
        if (!disabled.has(idx)) cells.push(idx);
      }
    }
  } else {
    // "custom" — caller supplies the order; we return enabled cells
    // in row-major order as a sensible default seed.
    for (let r = 0; r < h; r++) {
      for (let c = 0; c < w; c++) {
        const idx = cellIndex(c, r, w);
        if (!disabled.has(idx)) cells.push(idx);
      }
    }
  }
  return cells;
}

/** Build a balanced port-assignment for a screen across N ports of
 *  a single processor. Each port gets `ceil(cells/N)` cabinets max;
 *  the last port may be short. Chain pattern controls the walk so
 *  the resulting chains are physically contiguous in cable run. */
export function autoBalancePorts(opts: {
  screen: LedScreen;
  processorId: string;
  portCount: number;
  pattern: LedChainPattern;
  /** Max cabinets per CAT chain — caps each port's slice. When the
   *  cap is exceeded the solver creates additional ports (over
   *  capacity, surfaced by the validator). */
  maxCabinetsPerChain?: number;
}): LedPortAssignment[] {
  const { screen, processorId, portCount, pattern } = opts;
  const cells = walkScreen(screen, pattern);
  if (cells.length === 0 || portCount <= 0) return [];

  const cap =
    typeof opts.maxCabinetsPerChain === "number" &&
    opts.maxCabinetsPerChain > 0
      ? opts.maxCabinetsPerChain
      : Infinity;
  const idealPerPort = Math.ceil(cells.length / portCount);
  const perPort = Math.min(idealPerPort, cap);
  const assignments: LedPortAssignment[] = [];
  for (let p = 0; p < portCount; p++) {
    const slice = cells.slice(p * perPort, (p + 1) * perPort);
    if (slice.length === 0) break;
    assignments.push({
      processorId,
      portIndex: p + 1,
      cells: slice,
      chainStart: slice[0],
      chainPattern: pattern,
    });
  }
  // Spill cabinets onto additional virtual ports if the cap forced
  // shorter chains. The validator will flag PORT_OVERLOAD on these.
  let spillStart = portCount * perPort;
  while (spillStart < cells.length) {
    const slice = cells.slice(spillStart, spillStart + perPort);
    assignments.push({
      processorId,
      portIndex: assignments.length + 1,
      cells: slice,
      chainStart: slice[0],
      chainPattern: pattern,
    });
    spillStart += perPort;
  }
  return assignments;
}

/** Find cells that exist on the screen (enabled) but are NOT covered
 *  by any port assignment — surfaced as ORPHAN_CABINET. */
export function findOrphanCells(
  screen: LedScreen,
  assignments: LedPortAssignment[],
): number[] {
  const disabled = disabledCellSet(screen);
  const owned = new Set<number>();
  for (const a of assignments) for (const c of a.cells) owned.add(c);
  const orphans: number[] = [];
  for (let r = 0; r < screen.panelsTall; r++) {
    for (let c = 0; c < screen.panelsWide; c++) {
      const idx = cellIndex(c, r, screen.panelsWide);
      if (disabled.has(idx)) continue;
      if (!owned.has(idx)) orphans.push(idx);
    }
  }
  return orphans;
}

/** Detect cells assigned to more than one port — DOUBLE_ASSIGNED. */
export function findDoubleAssigned(
  assignments: LedPortAssignment[],
): number[] {
  const seen = new Map<number, number>();
  const dupes = new Set<number>();
  for (const a of assignments) {
    for (const c of a.cells) {
      const n = (seen.get(c) ?? 0) + 1;
      seen.set(c, n);
      if (n > 1) dupes.add(c);
    }
  }
  return [...dupes];
}

/** Human-readable label for a chain — used in patch sheets / tooltips. */
export function chainLabel(a: LedPortAssignment, screen: LedScreen): string {
  const start = cellFromIndex(a.chainStart, screen.panelsWide);
  return `P${a.portIndex} · ${a.cells.length} cab · start ${String.fromCharCode(65 + start.col)}${start.row + 1}`;
}
