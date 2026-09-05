---
name: Calendar interval semantics
description: Rules for preserving calendar boundaries and local-day display across timezones and DST.
---

Treat every calendar interval as half-open: `[start, end)`. An interval that ends exactly when another starts does not overlap.

**Why:** Inclusive overlap checks created false conflicts at handoff boundaries. Separately, grouping persisted UTC timestamps by string date prefixes caused one local all-day recurrence to appear on adjacent days around timezone offsets.

**How to apply:** Require offset-bearing instants at API boundaries, compare overlaps with `start < rangeEnd && end > rangeStart`, and convert instants through the viewer's timezone before assigning them to calendar dates or editing local times.

Bulk availability changes must replace every overlapping manual availability state inside the selected interval while preserving any portions before or after that interval. A calendar date may expose multiple non-overlapping manual blocks with different statuses; render them all chronologically instead of collapsing the day to one status. Synced busy time, holds, and gigs remain separate visible signals rather than hiding manual blocks.

**Why:** Appending month-wide availability created conflicting layers, while collapsing a split shift hid valid partial-day information. Deleting whole spanning intervals would fix the month while silently erasing availability outside it.

**How to apply:** Split overlapping stored intervals at the bulk range boundaries, remove the covered portions, and insert the replacement state atomically. Deduplicate a concrete override from its virtual recurrence, then render every remaining daily block in chronological order.