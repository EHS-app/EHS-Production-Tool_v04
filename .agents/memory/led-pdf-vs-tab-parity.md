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

## Power (intentional, not a bug)
- Tab headline "Power" stat + dashboard show RAW nameplate: `enabled * panel.power`.
- PDF + the tab's Advanced per-screen gauge use `estimateScreenPower` (brightness
  derating, default +25% PSU overhead). So PDF ≈ tab×1.25 at full brightness, less at
  low brightness. User confirmed (2026-06) to leave both as-is.

**Why:** raw nameplate is the theoretical max; the engine is the engineered estimate.
They answer different questions, so they legitimately differ.

## Auto-fit beams
`suggestAutoBeams` greedily packs straight beams (name has beam/hang/stack + a length
token, excludes 90°/corner/angle) longest-first to the screen width, quantized to mm.
A 5.5m screen with a 0.5m beam in catalog yields 5×1m + 1×0.5m — the 0.5m remainder is
already handled; no special-casing needed.
