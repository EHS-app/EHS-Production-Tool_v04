---
name: Project deletion integrity
description: Non-obvious rules separating deletable planning data from preserved financial history under concurrent writes.
---

Project deletion must serialize against brief-link changes, approvals, holds, and project autosaves before removing any graph. Ambiguous legacy brief ownership is retained rather than guessed.

**Why:** A check-then-delete implementation allowed concurrent approvals or legacy brief claims to appear after inspection, and a pending client autosave could recreate a successfully deleted project.

**How to apply:** Keep provenance writes and deletion under one shared transaction policy, lock all linked time rows before deciding, remove temporary holds atomically, and invalidate client save work before clearing state.

Only posted expenses, positive reconciled revenue, approved/payroll-snapshotted time, and invoiced/paid gigs are deletion blockers. Planning budgets, contract estimates, and zero values produced by historical defaults are not immutable financial history.

**Why:** Newly created projects inherited zero/default finance values and became undeletable even though no actual transaction or reconciliation had occurred.

**How to apply:** Preserve null as “not reconciled,” and do not infer protected financial history from initialized estimates or zero-value defaults.