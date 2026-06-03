---
name: LED PDF vs on-screen tab parity
description: Why LED numbers diverge between the on-screen LED tab and the LED Project PDF, and how to keep them in sync.
---

# LED Project PDF must share the on-screen tab's metric path

The on-screen LED tab and the LED Project PDF historically diverged on two numbers
because they used different calculation paths.

## Weight
- Tab folds rigging-accessory beam weight into the total (passes the beam catalog to
  `computeScreenMetrics`, which adds `effectiveRigAccessories` = auto-fit beams + manual).
- The PDF used to omit it: it called `computeScreenMetrics(s, panels)` with no beam
  catalog and used raw `enabled * panel.weight`, so beams were silently dropped.

**Rule:** any per-screen aggregate in the PDF must use `m.weightKg` from
`computeScreenMetrics(s, panels, beamCatalog)`, not `enabled * panel.weight`.
The PDF input must carry the beam catalog (`ledBeamsCatalog` from App.tsx).

## Power — Max output / Average output
Headline power is shown as TWO figures in both the tab dashboard and the PDF
(totals tiles + per-screen Technical-summary table):
- **Max output** = peak white nameplate = `enabled * panel.power` (= `m.powerW` from
  `computeScreenMetrics`). Same basis in tab AND PDF now — the old mismatch where the
  PDF used `estimateScreenPower` (brightness derating + ~25% PSU overhead) for the
  single "Power" figure is gone for these display numbers.
- **Average output** = Max × `AVERAGE_POWER_FRACTION` (= 1/3), exported from
  `lib/led/engine/power.ts`. Industry rule of thumb for normal video content. User
  picked 1/3 (2026-06).
- PDF per-screen Amps column is derived from the MAX watts (`maxW/(V·PF)`, V/PF still
  come from `estimateScreenPower`) so each row reconciles W = V·A·PF.

**Still engineered (unchanged):** the tab's Advanced per-screen PowerGauge + the
validation runner (POWER_* rules, breaker checks) keep using `estimateScreenPower`
(derating + overhead) — that's the engineered draw for circuit sizing, a different
question from the headline Max/Avg output figures.

## Auto-fit beams
`suggestAutoBeams` greedily packs straight beams (name has beam/hang/stack + a length
token, excludes 90°/corner/angle) longest-first to the screen width, quantized to mm.
A 5.5m screen with a 0.5m beam in catalog yields 5×1m + 1×0.5m — the 0.5m remainder is
already handled; no special-casing needed.

## Bracket / hanging-bar count
`computeScreenCableBOM` bracket count = total auto-fit beam qty (sum of suggestAutoBeams
qty) when `screen.autoFitBeams` is on AND a beamCatalog is passed, else falls back to
top-row enabled cabinet count. So a 7m screen on 1m bars = 7 brackets, NOT 14 (one per
0.5m cabinet column). All callers (PDF cable summary, App brief builder, LedScreenReportView
CableBracketBomCard) must pass the beam catalog or they silently get the column-count fallback.
