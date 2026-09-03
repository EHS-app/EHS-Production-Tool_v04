---
name: Project deletion integrity
description: Hard-delete policy, concurrency rules, and the foreign-owned brief boundary.
---

Project owners may permanently hard-delete the complete graph they own, including posted expenses, reconciled revenue, approved or locked payroll entries, invoiced or paid gigs, holds, and owned briefs. Deletion must remain one serialized transaction.

**Why:** The product policy explicitly favors reliable, complete project removal over preserving the owner's financial and payroll history; a partial delete previously hung on foreign-key restrictions.

**How to apply:** Delete owned descendants in dependency order, unlink clone and legacy active-brief references, remove direct project children, then delete the owned project row last. Keep database cascades as concurrency safety nets.

An editor-owned brief attached to another user's project is outside the project owner's hard-delete authority. Unlink that brief instead of deleting its gigs, assignments, or payroll records; the brief-to-project foreign key must therefore remain `SET NULL`.

**Why:** Editors can create project-bound briefs under their own identity, so unconditional brief cascades create cross-user data loss.

**How to apply:** Scope brief graph deletion to the target project owner, preserve shared resources, and invalidate pending client autosaves before clearing the deleted project from UI state.