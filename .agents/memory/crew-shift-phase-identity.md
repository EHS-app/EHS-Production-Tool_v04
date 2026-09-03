---
name: Crew shift phase identity
description: Compatibility rule for independent crew phase selection on calendar days shared by multiple production phases.
---

Crew booking UI state must identify a selection by both calendar date and production phase. Keep same-day Show and Load-out selections independent even when the server contract stores only a flat set of assigned dates.

**Why:** Multiple production phases can occur on the same date. Deriving checkbox state directly from assigned dates makes one date stand in for every phase, so deselecting Load-out can also appear to deselect Show.

**How to apply:** Update only the exact date-and-phase selection the producer touched, then derive the existing assigned-date payload as the unique dates that still have at least one selected phase. Treat legacy date-only rows as fully selected for every phase on each assigned date.