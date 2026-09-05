---
name: Project deletion integrity
description: Hard-delete policy, concurrency rules, and the foreign-owned brief boundary.
---

Only the verified, explicitly allowlisted EHS administrator may permanently hard-delete a project. When authorized, deletion removes the complete graph owned by the project creator, including posted expenses, reconciled revenue, approved or locked payroll entries, invoiced or paid gigs, holds, and owned briefs. Deletion must remain one serialized transaction.

**Why:** Irreversible removal is intentionally narrower than organization-wide employee editing and archiving. Once the admin authorizes deletion, the product policy favors reliable, complete removal over preserving the project's financial and payroll history; a partial delete previously hung on foreign-key restrictions.

**How to apply:** Enforce the admin allowlist before entering the deletion transaction. Delete creator-owned descendants in dependency order, unlink clone and legacy active-brief references, remove direct project children, then delete the project row last. Keep database cascades as concurrency safety nets.

An editor-owned brief attached to another user's project is outside the deleted project's graph. Unlink that brief instead of deleting its gigs, assignments, or payroll records; the brief-to-project foreign key must therefore remain `SET NULL`.

**Why:** Editors can create project-bound briefs under their own identity, so unconditional brief cascades create cross-user data loss even when an administrator initiates deletion.

**How to apply:** Scope brief graph deletion to the project's creator, preserve shared resources, and invalidate pending client autosaves before clearing the deleted project from UI state.