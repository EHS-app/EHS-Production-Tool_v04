---
name: Crew shift phase identity
description: Compatibility rule for independent crew phase selection on calendar days shared by multiple production phases.
---

Crew booking UI state must identify a selection by both calendar date and production phase. Only render/select cells the project schedule explicitly makes available on that date. Store the schedule's exact start/end window under that same date+phase identity; keep row-level call/off only as a legacy summary.

**Why:** Multiple production phases can occur on one date, while other dates may expose only one phase. A rectangular date×phase grid creates impossible assignments, and scalar clock comparisons corrupt overnight windows such as 21:00–03:00.

**How to apply:** Intersect selections with current schedule cells; Full Day and bulk-copy controls operate only on destination phases that exist. Rebuild exact windows from the active schedule, derive assigned dates from selected keys, and summarize using real dated intervals so overnight end times stay intact. For legacy date-only rows, select every scheduled phase on each assigned date—not every possible phase.