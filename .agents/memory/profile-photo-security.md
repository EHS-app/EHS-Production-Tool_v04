---
name: Profile photo ownership and route gates
description: Durable security and routing rules learned while adding user-managed profile images.
---

Private object references must be bound to the authenticated user when the
upload URL is issued. A later profile update may attach a non-empty object path
only when that ownership record matches; general profile updates must not offer
an alternate path around this check.

**Why:** An opaque object path is hard to guess but is not proof of ownership.
Syntax-only validation would let a user who learned another valid path expose
that object through an authenticated inline-image endpoint.

**How to apply:** For future user-owned uploads, record issuer and object path
before returning the presigned URL, validate the pair when attaching it to a
record, and keep bytes in object storage rather than the relational database.

Role middleware must be mounted on the exact URL namespace it protects rather
than placed before a child router in an unscoped middleware chain.

**Why:** Express executes unscoped middleware before it knows whether the child
router has a matching route, so an employee gate can accidentally reject later
freelancer/shared routes.

**How to apply:** Scope role checks to their route prefixes and test a user
whose persisted role has already changed, not only a newly overridden session.