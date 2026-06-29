---
name: LED finishing-row two-panel mix
description: How an LED wall's bottom "finishing" row uses a different real panel, and the width-match invariant that keeps metrics/geometry correct.
---

# LED finishing-row (two-panel mix)

Build-by-size builds an LED wall body from the screen's MAIN inventory panel and
finishes the BOTTOM row with a different, SMALLER real inventory panel so a
target height that isn't a whole multiple of the main cabinet is exact (e.g.
4.5 m from 1.0 m cabinets = 4 full main rows + one 0.5 m finishing row). This
superseded the older "half of the same panel" approach (`lastRowHalf`), which was
geometrically right but mis-reported inventory. `lastRowHalf` is kept only as a
legacy back-compat fraction (= 0.5).

## Width-match invariant (the important rule)
The finishing row tiles the SAME columns as the body, so the finishing panel's
physical width MUST equal the main panel's width (small tolerance). A
width-mismatched finishing panel corrupts both the grid geometry and the
per-cabinet pixel/area/weight/power math.

**Why:** the layout keeps main-panel column geometry while metrics count
finishing cabinets by their own dimensions — a width mismatch makes those two
views disagree and produces a physically invalid wall spec.

**How to apply:** the single chokepoint is the resolver that maps a screen's
finishing key to a panel — it returns null (degrade to a normal full-height row)
when the width doesn't match, so every downstream path (metrics, live render, PNG
+ PDF export) is protected at once. Auto-pick and the manual swap dropdown also
filter candidates to matching width. Keep the height-fraction helper as the
shared source of bottom-row height for all render paths so live/PNG/PDF agree.
