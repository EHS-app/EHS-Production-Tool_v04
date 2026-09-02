---
name: Booking history integrity
description: Trust boundaries for accepted brief snapshots, gig joins, and employee-facing freelancer history totals.
---

Acceptance snapshots used for employee-facing booking history must be constructed server-side from the locked producer brief and exact crew assignment. A JSON marker is not proof of provenance; use a server-only database field that defaults to untrusted for legacy rows.

**Why:** The earlier acceptance endpoint allowed the freelancer client to supply snapshot JSON, and freelancer-owned gigs can be edited independently. Trusting either a client marker or a loose brief-level gig match lets a freelancer influence employee-visible role, dates, rate, earnings, or worked-history attribution.

**How to apply:** Only merge a snapshot when authoritative database provenance marks it trusted. Join history to the exact recorded accepted gig ID and verify user and brief ownership. If the exact gig is missing, keep the accepted assignment history with zero logged minutes rather than substituting another gig.