---
name: Project collaboration roles
description: Durable authorization rules for shared Production Tool projects.
---

The original project owner remains the Clerk user stored on the project. Any caller positively classified as an EHS employee gets default editor access to project reads and ordinary collaborative writes, even without an explicit membership. An explicit viewer membership remains a read-only override. Only owners may delete projects, change owner/finance settings, or manage members. Freelancer portal access remains limited to explicit brief assignments and freelancer-safe projections.

Creator/manager attribution comes from the project's immutable owner ID resolved through the authoritative Clerk directory, not a parallel local user table.

**Why:** EHS employees need organization-wide collaboration without manual membership setup, while destructive governance controls and freelancer privacy must remain narrowly scoped.

**How to apply:** Employee-wide editor fallbacks are valid only after positive employee authorization. New owner controls must check the creator explicitly, viewer UIs must hide or disable mutations, and portal routes must never inherit employee access without first classifying the caller.