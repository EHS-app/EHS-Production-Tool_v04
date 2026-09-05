---
name: Clerk freelancer backfill
description: Safety rule for making legacy Clerk freelancer accounts visible in the local Crew Directory.
---

Legacy Clerk freelancers may be backfilled into the local directory only by inserting a basic profile when no row exists. Existing freelancer profiles must never be updated, merged, or re-derived from Clerk during directory synchronization.

**Why:** The local profile contains freelancer-owned operational data such as skills, biography, phone, and city. Clerk identity fields are incomplete for legacy accounts and must not overwrite that data.

**How to apply:** Classify employees with the same verified-primary-`@ehs.no` rule used by authorization. For all other Clerk users, derive a safe basic name, pre-check missing IDs, and retain `ON CONFLICT DO NOTHING` as the race guard. Clerk listing failures must degrade to existing database profiles, while employee-only directory authorization remains unchanged.