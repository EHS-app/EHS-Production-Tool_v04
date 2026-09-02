---
name: Organization settings governance
description: Durable authorization and snapshot rules for organization defaults, project creation, and payroll.
---

Only explicitly allowlisted administrators may read or change organization settings; a verified company-domain identity alone is not enough.

**Why:** Settings control finance, overtime, rate, branding, and department defaults, so ordinary employees and freelancers must not inherit administrative access from broad employee authentication.

**How to apply:** Keep settings authorization separate from general employee authorization and use an explicit administrator allowlist.

Organization defaults embedded in new or cloned projects are authoritative server-built snapshots. Never merge client-supplied values into those snapshots.

**Why:** Historical project and finance behavior must reflect the defaults in force when the project was created, without allowing callers to forge organization policy.

**How to apply:** On every project-creation path, load current settings server-side, replace any submitted snapshot, and create the initial finance settings atomically.

Approved payroll compensation remains immutable. Organization rates and overtime rules are fallbacks only when trusted assignment or profile terms are absent, and the resolved terms must be snapshotted when approved.

**Why:** Later settings changes must not retroactively alter accepted or approved compensation.

**How to apply:** Resolve trusted assignment terms first, use organization defaults only for missing values, then persist the complete resolved compensation snapshot at approval.