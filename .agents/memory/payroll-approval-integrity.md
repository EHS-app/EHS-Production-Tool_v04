---
name: Payroll approval integrity
description: Durable trust boundary for producer-approved freelancer compensation and assignments.
---

Once a producer approves a freelancer timecard, all downstream labor totals and exports must use the compensation terms captured at approval rather than mutable gig fields. Producer-assigned gigs must not let freelancers change compensation, dates, project linkage, or deletion.

**Why:** Approved and locked payroll evidence must remain stable. Recomputing labor from editable gig records would let later portal changes alter project costs or erase the underlying time entries.

**How to apply:** Any new gig-editing, timecard, payroll, Economy, or export flow must preserve this boundary. Safe freelancer updates may cover operational state such as check-in or notes, but producer-owned assignment and pay terms require producer control.