---
name: Freelancer dispatch delivery semantics
description: The intentional at-most-once tradeoff for project lifecycle email dispatch claims.
---

Once a freelancer email dispatch is claimed as in flight, normal requests and explicit retries must not reclaim it automatically. Pending deliveries may be claimed normally. A producer's explicit Share brief action may deliberately resend confirmed sent or failed deliveries, but an in-flight delivery remains untouchable.

**Why:** Gmail delivery cannot be transactionally fenced with the database. A worker delayed beyond a lease can still resume after another worker has resent the message, so automatic lease recovery risks duplicate freelancer notifications. The product prioritizes at-most-once initiation over automatic recovery of ambiguous claims.

**How to apply:** Keep lifecycle-driven delivery idempotent. Treat an old in-flight claim as an operational reconciliation case, not a retryable failure. Only an explicit human resend may reset confirmed terminal outcomes; never add lease-expiry resend behavior without a real provider idempotency fence.

The brief-and-freelancer dispatch identity must be enforced by a database unique index, not a normal index with a “unique” name.

**Why:** PostgreSQL only accepts a column-list `ON CONFLICT` target when a matching unique or exclusion constraint exists; a normal index causes every brief save with recipients to fail.

**How to apply:** Whenever an outbox insert uses `ON CONFLICT (columns)`, keep those exact columns backed by a tested unique index in the schema source of truth.