/** Single entry-point for the validation pipeline. Components consume
 *  this through `useLedValidation()` (memoised) — the function itself
 *  is pure so it can be called from CSV exporters / Show Simulation
 *  without a React tree. */

import type {
  LedPanel,
  LedScreen,
  LedSettings,
  LedVoltageRegion,
} from "../../led";
import { resolveScreenPanel } from "../../led";
import { estimateScreenPower, type PowerEstimate } from "../engine/power";
import { evaluateAll, type LedViolation } from "./rules";

const DEFAULT_BREAKER_EU = 16;
const DEFAULT_BREAKER_US = 20;

function defaultBreakerFor(region: LedVoltageRegion | undefined): number {
  if (region === "US-120" || region === "US-208") return DEFAULT_BREAKER_US;
  if (region === "JP-100") return DEFAULT_BREAKER_US;
  return DEFAULT_BREAKER_EU;
}

export type LedValidationReport = {
  violations: LedViolation[];
  errors: number;
  warnings: number;
  infos: number;
  /** Power estimate per screen — exposed so the inspector can render
   *  the gauge without redoing the calculation. */
  powerByScreen: Map<string, PowerEstimate>;
};

export function runValidation(
  screens: LedScreen[],
  panels: LedPanel[],
  settings: LedSettings,
): LedValidationReport {
  const powerByScreen = new Map<string, PowerEstimate>();
  for (const s of screens) {
    const panel = resolveScreenPanel(s, panels);
    powerByScreen.set(s.id, estimateScreenPower(s, panel, settings));
  }
  const breakerAmps = defaultBreakerFor(settings.defaultVoltageRegion);
  const violations = evaluateAll({
    screens,
    panels,
    settings,
    powerByScreen,
    breakerAmps,
  });
  let errors = 0;
  let warnings = 0;
  let infos = 0;
  for (const v of violations) {
    if (v.level === "error") errors += 1;
    else if (v.level === "warn") warnings += 1;
    else infos += 1;
  }
  return { violations, errors, warnings, infos, powerByScreen };
}
