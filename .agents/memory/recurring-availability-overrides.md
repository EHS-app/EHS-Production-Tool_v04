---
name: Recurring availability overrides
description: Durable semantics for changing or clearing one occurrence of weekly freelancer availability.
---

Changing or clearing a day/range that overlaps weekly availability must create owner-scoped exceptions for the affected rule occurrence dates in the same serializable transaction as concrete interval replacement. A concrete replacement then becomes the visible override; an empty replacement leaves the selected occurrence neutral. Never delete the whole rule or create an unsuppressed one-off entry for a single-occurrence action.

**Why:** A day-level Clear or edit must not unexpectedly remove the entire weekly series, and the virtual occurrence must not reappear after a successful save. Occurrence identity must follow each rule's local calendar date so DST changes do not suppress the wrong week.

**How to apply:** Any bulk/day replacement path must enumerate actual half-open overlaps in the rule timezone, persist exceptions only for the authenticated owner, and project midnight-to-midnight weekly rules as all-day entries.