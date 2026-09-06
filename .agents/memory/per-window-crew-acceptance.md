---
name: Per-window crew acceptance
description: Durable contract for mixed freelancer acceptance across dates, phases, and split-call windows.
---

Freelancer responses are authoritative per assignment slot. Exact slots use `YYYY-MM-DD::phase::windowIndex`; assignments without granular phase data use the legacy `YYYY-MM-DD::day::0` fallback when dates exist.

**Why:** A single project-level decision cannot represent mixed availability or one accepted and one declined split call. The top-level decision still protects legacy behavior and first-to-accept booking semantics, but it must be derived from the complete current slot map whenever one is submitted.

**How to apply:** Client and server must derive the same slot set from split windows, single timings, then phase-only entries. Require complete maps, treat any accepted slot as top-level accepted, limit gig dates to dates with accepted slots, filter declined timeline windows individually, and preserve old whole-project behavior for rows with no map.