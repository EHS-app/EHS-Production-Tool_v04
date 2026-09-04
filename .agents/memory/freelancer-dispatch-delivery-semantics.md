---
name: Freelancer dispatch delivery semantics
description: The intentional at-most-once tradeoff for project lifecycle email dispatch claims.
---

Once a freelancer email dispatch is claimed as in flight, normal requests and explicit retries must not reclaim it automatically. Pending deliveries may be claimed normally, and confirmed failures may be retried only through an explicit user action. Sent and in-flight claims remain terminal to request-driven delivery.

**Why:** Gmail delivery cannot be transactionally fenced with the database. A worker delayed beyond a lease can still resume after another worker has resent the message, so automatic lease recovery risks duplicate freelancer notifications. The product prioritizes at-most-once initiation over automatic recovery of ambiguous claims.

**How to apply:** Treat an old in-flight claim as an operational reconciliation case, not a retryable failure. Do not add lease-expiry resend behavior unless the provider supports a real idempotency key or delivery is moved behind a mechanism that can guarantee a single external send.