/** Declarative LED validation rules.
 *
 *  One rule = one row in the Validation Drawer. Adding a rule is
 *  intentionally O(append-here) — no UI rewiring needed.
 *
 *  All rules are pure and operate on a `LedValidationCtx` snapshot,
 *  built once per render by `runValidation()`. The snapshot caches
 *  derived data (panel resolution, power estimates, chain checks) so
 *  individual rules stay O(1).
 */

import type {
  LedPanel,
  LedScreen,
  LedSettings,
} from "../../led";
import { computeScreenMetrics } from "../../led";
import type { PowerEstimate } from "../engine/power";
import { isCircuitOverloaded, ampsPerChain } from "../engine/power";
import {
  checkAllChains,
  DEFAULT_MAX_CABINETS_PER_DATA_CHAIN,
} from "../engine/signal";
import { findDoubleAssigned, findOrphanCells } from "../engine/routing";

export type LedRuleLevel = "info" | "warn" | "error";
export type LedRuleScope = "screen" | "processor" | "system" | "show";

export type LedViolation = {
  ruleId: string;
  level: LedRuleLevel;
  scope: LedRuleScope;
  /** Optional id of the entity the violation pins to (screen.id, etc.). */
  entityId?: string;
  message: string;
  /** Optional hint surfaced as a "Fix it" suggestion. */
  hint?: string;
};

export type LedValidationCtx = {
  screens: LedScreen[];
  panels: LedPanel[];
  settings: LedSettings;
  powerByScreen: Map<string, PowerEstimate>;
  /** Show-wide default breaker rating in amps — used when a screen
   *  doesn't declare its own voltage region. EU-230 → 16 A, US/JP → 20 A. */
  breakerAmps: number;
};

/** Per-screen breaker rating — honours `screen.voltageRegion` overrides
 *  so a mixed-region show (e.g. EU mains feeding a JP-100 box from a
 *  step-down) gets validated against the correct chain capacity. */
function breakerForScreen(
  ctx: LedValidationCtx,
  screen: LedScreen,
): number {
  const region = screen.voltageRegion ?? ctx.settings.defaultVoltageRegion;
  if (region === "US-120" || region === "US-208" || region === "JP-100") {
    return 20;
  }
  if (region === "EU-230") return 16;
  return ctx.breakerAmps;
}

export type LedRule = {
  id: string;
  level: LedRuleLevel;
  scope: LedRuleScope;
  /** Pure check — pushes violations into the array. Receives the ctx
   *  so it can read derived data once instead of recomputing. */
  evaluate: (ctx: LedValidationCtx, out: LedViolation[]) => void;
};

/** Format a power-chain over-load message — extracted so EN/NO can
 *  be wired in later via i18n without touching every rule. */
function powerChainMsg(screen: LedScreen, ap: number, cap: number): string {
  return `${screen.name || "Screen"} — chain pulls ${ap.toFixed(1)} A; breaker safe limit is ${(cap * 0.8).toFixed(1)} A (80% of ${cap} A).`;
}

export const LED_RULES: LedRule[] = [
  // ─────────────────────────────────────────────── POWER ───────────
  {
    id: "POWER_CHAIN_OVERLOAD",
    level: "error",
    scope: "screen",
    evaluate(ctx, out) {
      for (const s of ctx.screens) {
        const est = ctx.powerByScreen.get(s.id);
        if (!est) continue;
        // Without an explicit `maxCabinetsPerPowerChain`, the per-chain
        // amperage is unknown — `ampsPerChain` would fall back to the
        // total draw and erroneously flag every reasonably-sized screen
        // as overloaded. Honour the user's intent: don't fire this
        // rule unless they have actually declared a chain size, and
        // then check the per-chain figure against the breaker.
        if (est.chainsRequired === null) continue;
        // Per-screen breaker: respects `screen.voltageRegion` overrides
        // for mixed-region shows.
        const breakerAmps = breakerForScreen(ctx, s);
        if (isCircuitOverloaded(est, breakerAmps)) {
          out.push({
            ruleId: "POWER_CHAIN_OVERLOAD",
            level: "error",
            scope: "screen",
            entityId: s.id,
            message: powerChainMsg(s, ampsPerChain(est), breakerAmps),
            hint: "Split this screen onto more power chains or move to a higher-amp circuit.",
          });
        }
      }
    },
  },
  {
    id: "POWER_MISSING_REGION",
    level: "info",
    scope: "show",
    evaluate(ctx, out) {
      const any = ctx.screens.some((s) => s.voltageRegion);
      if (!any && !ctx.settings.defaultVoltageRegion) {
        out.push({
          ruleId: "POWER_MISSING_REGION",
          level: "info",
          scope: "show",
          message:
            "No voltage region set. Power calculations assume EU 230 V — set the show region in LED Settings if you're not in Europe.",
        });
      }
    },
  },
  // ─────────────────────────────────────────────── DATA ────────────
  {
    id: "DATA_CHAIN_TOO_LONG",
    level: "error",
    scope: "screen",
    evaluate(ctx, out) {
      for (const s of ctx.screens) {
        const assignments = s.processorPortAssignments ?? [];
        if (assignments.length === 0) continue;
        const r = checkAllChains(
          assignments,
          s,
          DEFAULT_MAX_CABINETS_PER_DATA_CHAIN,
        );
        if (r.overCap > 0) {
          out.push({
            ruleId: "DATA_CHAIN_TOO_LONG",
            level: "error",
            scope: "screen",
            entityId: s.id,
            message: `${s.name || "Screen"} — ${r.overCap} CAT chain(s) over cabinet cap.`,
            hint: "Add another processor port or lower cabinets-per-chain.",
          });
        }
      }
    },
  },
  {
    id: "ORPHAN_CABINET",
    level: "warn",
    scope: "screen",
    evaluate(ctx, out) {
      for (const s of ctx.screens) {
        const assignments = s.processorPortAssignments ?? [];
        if (assignments.length === 0) continue;
        const orphans = findOrphanCells(s, assignments);
        if (orphans.length > 0) {
          out.push({
            ruleId: "ORPHAN_CABINET",
            level: "warn",
            scope: "screen",
            entityId: s.id,
            message: `${s.name || "Screen"} — ${orphans.length} cabinet(s) not assigned to any port.`,
            hint: "Run Auto-balance, or assign them manually in Port Mapping.",
          });
        }
      }
    },
  },
  {
    id: "DOUBLE_ASSIGNED_CABINET",
    level: "error",
    scope: "screen",
    evaluate(ctx, out) {
      for (const s of ctx.screens) {
        const assignments = s.processorPortAssignments ?? [];
        if (assignments.length === 0) continue;
        const dupes = findDoubleAssigned(assignments);
        if (dupes.length > 0) {
          out.push({
            ruleId: "DOUBLE_ASSIGNED_CABINET",
            level: "error",
            scope: "screen",
            entityId: s.id,
            message: `${s.name || "Screen"} — ${dupes.length} cabinet(s) assigned to multiple ports.`,
            hint: "Each cabinet must belong to exactly one port.",
          });
        }
      }
    },
  },
  // ─────────────────────────────────────────────── REDUNDANCY ──────
  {
    id: "MISSING_BACKUP",
    level: "warn",
    scope: "screen",
    evaluate(ctx, out) {
      for (const s of ctx.screens) {
        if (!s.backupSignalEnabled) continue;
        const assignments = s.processorPortAssignments ?? [];
        const missing = assignments.filter(
          (a) => typeof a.backupPortIndex !== "number",
        );
        if (missing.length > 0) {
          out.push({
            ruleId: "MISSING_BACKUP",
            level: "warn",
            scope: "screen",
            entityId: s.id,
            message: `${s.name || "Screen"} — backup signal is enabled but ${missing.length} port(s) have no backup assigned.`,
          });
        }
      }
    },
  },
  // ─────────────────────────────────────────────── BROADCAST ───────
  {
    id: "BROADCAST_SCAN_MISMATCH",
    level: "warn",
    scope: "screen",
    evaluate(ctx, out) {
      for (const s of ctx.screens) {
        if (!s.cameraSafeMode) continue;
        if (!s.refreshRateHz || s.refreshRateHz < 3000) {
          out.push({
            ruleId: "BROADCAST_SCAN_MISMATCH",
            level: "warn",
            scope: "screen",
            entityId: s.id,
            message: `${s.name || "Screen"} — camera-safe mode is on but refresh rate ${s.refreshRateHz ?? "(unset)"} Hz is below the recommended 3840 Hz.`,
            hint: "Set refresh to 3840 Hz or higher for camera-safe operation.",
          });
        }
      }
    },
  },
  // ─────────────────────────────────────────────── CAPACITY ────────
  {
    id: "PROCESSOR_PIXEL_OVERCAP",
    level: "warn",
    scope: "screen",
    evaluate(ctx, out) {
      for (const s of ctx.screens) {
        const m = computeScreenMetrics(s, ctx.panels);
        const procs = s.processors ?? [];
        if (procs.length === 0 || m.pixels === 0) continue;
        // computeScreenProcessorCapacity already exists; keep this
        // rule light — full capacity check stays in the existing
        // ProcessorBanner so we don't double-report.
        void procs;
      }
    },
  },
];

export function evaluateAll(ctx: LedValidationCtx): LedViolation[] {
  const out: LedViolation[] = [];
  for (const rule of LED_RULES) rule.evaluate(ctx, out);
  return out;
}
