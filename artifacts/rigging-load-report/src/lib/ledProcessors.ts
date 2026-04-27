/** Curated catalog of LED video processors used to validate that the
 *  current screens-and-panels configuration actually fits on the chosen
 *  hardware. Specs are taken from the manufacturer datasheets — see the
 *  `source` URL on each entry. Capacity numbers are quoted at 60 Hz / 8-bit
 *  (the typical operating point); higher refresh rates and bit depths
 *  reduce capacity.
 *
 *  Processors live in this dedicated file (rather than alongside the
 *  generic LED settings types) so we can add new processors over time
 *  without touching the broader LED logic. */

export type LedProcessor = {
  /** Stable id used in saved settings; never change for an existing model. */
  id: string;
  /** Display name shown in the dropdown. */
  name: string;
  /** Manufacturer (e.g. "Novastar"). */
  brand: string;
  /** Total pixels the processor can drive across all outputs at 60 Hz / 8-bit. */
  totalPixels: number;
  /** Number of physical Gigabit Ethernet output ports. */
  outputs: number;
  /** Max pixels per single Ethernet output at 60 Hz / 8-bit. */
  maxPixelsPerOutput: number;
  /** Max canvas width in pixels (full processor). */
  maxWidthPx: number;
  /** Max canvas height in pixels (full processor). */
  maxHeightPx: number;
  /** Top refresh rate in Hz at low resolutions. */
  maxRefreshHz: number;
  /** Where the spec was sourced — surfaced in the UI tooltip / help text. */
  source: string;
  /** One-line marketing positioning shown under the dropdown. */
  blurb: string;
};

export const LED_PROCESSORS: LedProcessor[] = [
  {
    id: "novastar-mx30",
    name: "Novastar MX30",
    brand: "Novastar",
    totalPixels: 6_500_000,
    outputs: 10,
    maxPixelsPerOutput: 650_000,
    maxWidthPx: 4096,
    maxHeightPx: 4096,
    maxRefreshHz: 240,
    source: "https://www.novastar.tech/products/coex-series/mx30/",
    blurb:
      "COEX 4K controller — 6.5 MP total, 10× Gigabit outputs, up to 240 Hz.",
  },
  {
    id: "novastar-mx40",
    name: "Novastar MX40",
    brand: "Novastar",
    totalPixels: 9_000_000,
    outputs: 20,
    maxPixelsPerOutput: 650_000,
    maxWidthPx: 10_240,
    maxHeightPx: 7680,
    maxRefreshHz: 240,
    source: "https://www.novastar.tech/products/coex-series/mx40/",
    blurb:
      "COEX flagship 4K controller — 9 MP total, 20× Gigabit outputs, up to 240 Hz.",
  },
];

/** Look up a processor by id. Returns `null` for "no processor selected"
 *  (the default — capacity validation is opt-in). */
export function findProcessor(id: string | null | undefined): LedProcessor | null {
  if (!id) return null;
  return LED_PROCESSORS.find((p) => p.id === id) ?? null;
}

export type ProcessorCheckLevel = "ok" | "warn" | "fail";

export type ProcessorCheckIssue = {
  level: "warn" | "fail";
  message: string;
};

export type ProcessorCheckResult = {
  /** Highest severity across all issues — drives the banner colour. */
  level: ProcessorCheckLevel;
  /** Total pixels currently configured across all screens. */
  totalPixels: number;
  /** Total physical outputs currently needed across all screens. */
  outputsNeeded: number;
  /** Largest screen width in pixels, used for the canvas-bounds check. */
  largestWidthPx: number;
  /** Largest screen height in pixels, used for the canvas-bounds check. */
  largestHeightPx: number;
  /** Largest single-screen pixel count, used for per-output checks when
   *  output assignment is per-screen. */
  largestScreenPixels: number;
  /** Pixels-used / total-capacity, in the [0, ∞) range. > 1 means overcap. */
  utilization: number;
  /** Outputs-used / total-outputs, in the [0, ∞) range. */
  outputsUtilization: number;
  /** Issues to surface to the user. Empty when level === "ok". */
  issues: ProcessorCheckIssue[];
};

/** Validate the current LED config against a chosen processor. The caller
 *  passes pre-computed totals (so this stays a pure function — no
 *  computeLedTotals coupling). Returns "ok" with empty issues when
 *  everything fits comfortably, "warn" near the limits, "fail" when the
 *  config is too large for the processor. */
export function validateAgainstProcessor(
  proc: LedProcessor,
  input: {
    totalPixels: number;
    outputsNeeded: number;
    largestWidthPx: number;
    largestHeightPx: number;
    largestScreenPixels: number;
  },
): ProcessorCheckResult {
  const issues: ProcessorCheckIssue[] = [];
  const utilization = input.totalPixels / proc.totalPixels;
  const outputsUtilization = input.outputsNeeded / proc.outputs;

  if (input.totalPixels > proc.totalPixels) {
    issues.push({
      level: "fail",
      message: `Project uses ${formatPixels(input.totalPixels)} but ${proc.name} can only drive ${formatPixels(proc.totalPixels)} total. Pick a larger processor or split across two units.`,
    });
  } else if (utilization > 0.9) {
    issues.push({
      level: "warn",
      message: `Project uses ${Math.round(utilization * 100)}% of ${proc.name} pixel capacity. Leave headroom for higher refresh / bit-depth.`,
    });
  }

  if (input.outputsNeeded > proc.outputs) {
    issues.push({
      level: "fail",
      message: `Project needs ${input.outputsNeeded} Ethernet outputs but ${proc.name} only has ${proc.outputs}.`,
    });
  } else if (outputsUtilization > 0.9) {
    issues.push({
      level: "warn",
      message: `Using ${input.outputsNeeded} of ${proc.outputs} outputs on ${proc.name} (${Math.round(outputsUtilization * 100)}%).`,
    });
  }

  if (input.largestScreenPixels > proc.maxPixelsPerOutput) {
    // Only a hard fail when a single screen, assigned to a single output,
    // exceeds the per-port limit. The caller still has the option to split
    // a big screen across multiple outputs.
    issues.push({
      level: "warn",
      message: `Largest single screen is ${formatPixels(input.largestScreenPixels)} — exceeds ${proc.name}'s ${formatPixels(proc.maxPixelsPerOutput)} per-output limit. Make sure the screen is split across multiple outputs.`,
    });
  }

  if (input.largestWidthPx > proc.maxWidthPx) {
    issues.push({
      level: "fail",
      message: `Largest screen is ${input.largestWidthPx.toLocaleString()} px wide — exceeds ${proc.name}'s ${proc.maxWidthPx.toLocaleString()} px max canvas width.`,
    });
  }
  if (input.largestHeightPx > proc.maxHeightPx) {
    issues.push({
      level: "fail",
      message: `Largest screen is ${input.largestHeightPx.toLocaleString()} px tall — exceeds ${proc.name}'s ${proc.maxHeightPx.toLocaleString()} px max canvas height.`,
    });
  }

  const level: ProcessorCheckLevel = issues.some((i) => i.level === "fail")
    ? "fail"
    : issues.some((i) => i.level === "warn")
      ? "warn"
      : "ok";

  return {
    level,
    totalPixels: input.totalPixels,
    outputsNeeded: input.outputsNeeded,
    largestWidthPx: input.largestWidthPx,
    largestHeightPx: input.largestHeightPx,
    largestScreenPixels: input.largestScreenPixels,
    utilization,
    outputsUtilization,
    issues,
  };
}

function formatPixels(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)} MP`;
  if (n >= 1000) return `${(n / 1000).toFixed(0)} kPx`;
  return `${n} px`;
}
