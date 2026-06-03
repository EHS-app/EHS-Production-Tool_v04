/** Touring-grade power engine for LED screens.
 *
 *  Pure, deterministic, no React. Consumed by:
 *  - The Advanced screen inspector (live amperage gauge per screen)
 *  - The validation runner (POWER_* rules)
 *  - The Patch-sheet / Power-distro CSV exporters
 *
 *  All formulas are intentionally explicit so the producer can audit
 *  them against the actual cabinet datasheet on site. No hidden fudge
 *  factors — every coefficient comes from the screen / settings inputs.
 */

import type {
  LedPanel,
  LedScreen,
  LedSettings,
  LedVoltageRegion,
} from "../../led";
import { enabledPanelCount } from "../../led";

/** Mains voltage by region. Producer can override per-screen via
 *  `LedScreen.voltageRegion`; otherwise we fall through to the
 *  show-wide default on `LedSettings`. */
export const VOLTAGE_BY_REGION: Record<LedVoltageRegion, number> = {
  "EU-230": 230,
  "US-120": 120,
  "US-208": 208,
  "JP-100": 100,
};

/** Industry-standard headroom on a circuit breaker — most touring
 *  electricians load to 80 % of rated amperage and call it good.
 *  Anything above this triggers the AMPERAGE_OVER_CIRCUIT warning. */
export const CIRCUIT_LOAD_CEILING = 0.8;

/** Average real-content power as a fraction of peak (all-white) draw.
 *  LED datasheets quote average consumption at roughly one third of
 *  the max — typical for normal video content. "Max output" is the
 *  peak white nameplate; "Average output" = max × this fraction. */
export const AVERAGE_POWER_FRACTION = 1 / 3;

/** Brightness floor — even at 0 nits a panel still draws ~30 % of
 *  its rated power for receiving cards, fans, processor I/O. Above
 *  the floor the draw scales linearly with brightness up to the
 *  nominal calibration point. */
const BRIGHTNESS_FLOOR = 0.3;
const NOMINAL_BRIGHTNESS_NITS = 5000;

export type PowerEstimate = {
  /** Per-cabinet effective wattage at the chosen brightness, including
   *  PSU overhead. Multiply by enabled-cabinet count for screen total. */
  wattsPerCabinet: number;
  /** Sum across every enabled cabinet on the screen. */
  totalWatts: number;
  /** Pulled amps at the configured region's mains voltage. */
  amps: number;
  /** Voltage applied in the calculation — surfaced so the UI can label
   *  the gauge ("120 V US"). */
  voltage: number;
  /** Power factor applied. Touring LED typically presents ~0.95 PF
   *  with the PSUs we see; the producer can override per-screen. */
  powerFactor: number;
  /** Overhead percentage applied (PSU losses + safety margin). */
  overheadPct: number;
  /** Cabinets actually fed by mains (enabled count). */
  enabledCabinets: number;
  /** Cabinets per power chain — pulled from `screen.maxCabinetsPerPowerChain`,
   *  falling back to `panel.maxCabinetsPerPowerChain` if we ever populate
   *  that on the panel catalog. `null` means "unknown / unlimited". */
  cabinetsPerChain: number | null;
  /** Chains required at the chosen cabinets-per-chain. `null` matches
   *  `cabinetsPerChain === null`. */
  chainsRequired: number | null;
};

/** Compute the per-screen power load. Returns zeros for empty screens
 *  rather than NaN so the UI can render the gauge unconditionally. */
export function estimateScreenPower(
  screen: LedScreen,
  panel: LedPanel,
  settings: LedSettings,
): PowerEstimate {
  const region: LedVoltageRegion =
    screen.voltageRegion ?? settings.defaultVoltageRegion ?? "EU-230";
  const voltage = VOLTAGE_BY_REGION[region];
  const powerFactor =
    screen.powerFactor ?? settings.defaultPowerFactor ?? 0.95;
  const overheadPct =
    screen.powerOverheadPct ?? settings.defaultPsuOverheadPct ?? 25;

  // Brightness scaling. `brightnessNits === undefined` is treated as
  // nominal so legacy screens (no brightness picked yet) report the
  // catalog-rated power — same number they'd have shown before this
  // engine landed.
  const targetNits =
    screen.brightnessNits ?? settings.defaultBrightnessNits ?? NOMINAL_BRIGHTNESS_NITS;
  const ratio = Math.max(0, targetNits / NOMINAL_BRIGHTNESS_NITS);
  const brightnessFactor = BRIGHTNESS_FLOOR + (1 - BRIGHTNESS_FLOOR) * Math.min(1, ratio);

  const wattsPerCabinet =
    panel.power * brightnessFactor * (1 + overheadPct / 100);
  const enabledCabinets = enabledPanelCount(screen);
  const totalWatts = wattsPerCabinet * enabledCabinets;

  const amps =
    voltage > 0 && powerFactor > 0 ? totalWatts / (voltage * powerFactor) : 0;

  const cabinetsPerChain =
    typeof screen.maxCabinetsPerPowerChain === "number" &&
    screen.maxCabinetsPerPowerChain > 0
      ? screen.maxCabinetsPerPowerChain
      : null;
  const chainsRequired =
    cabinetsPerChain !== null && cabinetsPerChain > 0
      ? Math.ceil(enabledCabinets / cabinetsPerChain)
      : null;

  return {
    wattsPerCabinet,
    totalWatts,
    amps,
    voltage,
    powerFactor,
    overheadPct,
    enabledCabinets,
    cabinetsPerChain,
    chainsRequired,
  };
}

/** Per-chain amperage on a balanced power distro. The producer
 *  declares the breaker rating (default 16 A in EU, 20 A in US), this
 *  helper tells them whether their chain count is sufficient. */
export function ampsPerChain(estimate: PowerEstimate): number {
  if (
    estimate.chainsRequired === null ||
    estimate.chainsRequired === 0
  ) {
    return estimate.amps;
  }
  return estimate.amps / estimate.chainsRequired;
}

/** Whether a single chain's amperage exceeds the breaker rating at
 *  the standard 80 % de-rate. */
export function isCircuitOverloaded(
  estimate: PowerEstimate,
  breakerAmps: number,
): boolean {
  if (breakerAmps <= 0) return false;
  return ampsPerChain(estimate) > breakerAmps * CIRCUIT_LOAD_CEILING;
}
