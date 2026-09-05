---
name: Project collaboration roles
description: Durable authorization rules for shared Production Tool projects.
---

The original project owner remains the Clerk user stored on the project. Any caller positively classified as an EHS employee gets default viewer access to project reads, including linked project briefs, even without an explicit membership. Explicit owner/editor memberships still control writes; only owners may manage members or delete projects. Freelancer portal access remains limited to explicit brief assignments and freelancer-safe projections.

Creator/manager attribution comes from the project's immutable owner ID resolved through the authoritative Clerk directory, not a parallel local user table.

**Why:** EHS employees need organization-wide operational visibility, while project mutation authority and freelancer privacy must remain narrowly scoped.

**How to apply:** Employee-wide read fallbacks are valid only after positive employee authorization. New writes must continue to require explicit owner/editor access, viewer UIs must hide or disable mutations, and portal routes must never inherit employee access without first classifying the caller.