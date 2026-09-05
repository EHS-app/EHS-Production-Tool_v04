---
name: Project collaboration roles
description: Durable authorization rules for shared Production Tool projects.
---

The original project owner remains the Clerk user stored on the project. Any caller positively classified as an EHS employee gets default editor access to project reads and ordinary collaborative writes, even without an explicit membership. An explicit viewer membership remains a read-only override. Editors may soft-archive and restore projects; archived projects are hidden from ordinary employee views and reject employee mutations until restored. Only owners may change owner/finance settings or manage members on active projects. Permanent deletion is reserved for the verified, explicitly allowlisted EHS admin account. Freelancer portal access remains limited to explicit brief assignments and freelancer-safe projections, including when the linked project is archived.

Creator/manager attribution comes from the project's immutable owner ID resolved through the authoritative Clerk directory, not a parallel local user table.

**Why:** EHS employees need organization-wide collaboration and reversible cleanup without manual membership setup, while irreversible deletion, governance controls, and freelancer privacy must remain narrowly scoped.

**How to apply:** Employee-wide editor fallbacks are valid only after positive employee authorization. Ordinary employee access helpers should exclude archived projects unless a restore/view flow opts in. Permanent deletion must use the admin allowlist gate, owner controls must check the creator explicitly, viewer UIs must hide or disable mutations, and portal routes must never inherit employee access without first classifying the caller or replace explicit freelancer assignment checks with archive visibility.