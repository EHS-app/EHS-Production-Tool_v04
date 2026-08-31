---
name: Calendar interval semantics
description: Rules for preserving calendar boundaries and local-day display across timezones and DST.
---

Treat every calendar interval as half-open: `[start, end)`. An interval that ends exactly when another starts does not overlap.

**Why:** Inclusive overlap checks created false conflicts at handoff boundaries. Separately, grouping persisted UTC timestamps by string date prefixes caused one local all-day recurrence to appear on adjacent days around timezone offsets.

**How to apply:** Require offset-bearing instants at API boundaries, compare overlaps with `start < rangeEnd && end > rangeStart`, and convert instants through the viewer's timezone before assigning them to calendar dates or editing local times.