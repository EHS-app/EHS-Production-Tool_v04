---
name: Ephemeral team broadcasts
description: Cross-instance delivery and lifecycle rules for transient employee alerts on autoscaled API processes.
---

Transient team alerts must cross autoscaled API instances through PostgreSQL `NOTIFY`, with each process forwarding notifications to its authenticated employee SSE clients. A process-local event emitter alone is not sufficient.

**Why:** Employee browsers can be connected to different API instances. The alerts are intentionally ephemeral and do not need replay, but database and response resources must remain bounded during normal disconnects, network failures, and slow clients.

**How to apply:** Keep one dedicated `LISTEN` connection only while a process has subscribers. Unlisten and release it after the last subscriber leaves, destroy it on connection errors, guard reconnects against stale generations, and close an SSE stream immediately on backpressure. Bearer tokens belong in authenticated streaming `fetch` headers, never query parameters.