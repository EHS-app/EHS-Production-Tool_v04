---
name: Multi-role crew bookings
description: Identity boundary between separate roster role slots and one freelancer portal recipient.
---

Use the producer crew row's stable crewId as the immutable role-slot identity. One freelancer account may hold multiple independently actionable assignments and exact-linked gigs under the same project brief; the account receives one project entry that exposes each role.

**Why:** Account-level identity collapses same-person roles and can overwrite decisions, schedules, hotel data, or gig state. Exact assignment identity keeps role responses independent while still allowing one notification and one project URL.

**How to apply:** Scope response state, first-to-accept competition, gig lifecycle, roster edits, and producer reconciliation to crewId/brief-assignment identity. Aggregate only presentation-level person warnings; never fan persisted role data out by freelancer account.