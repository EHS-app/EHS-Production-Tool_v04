---
name: Project collaboration roles
description: Durable authorization rules for shared Production Tool projects.
---

The original project owner remains the Clerk user stored on the project. Explicit memberships extend access without replacing or weakening that ownership relation. Owners and editors may update project data, tasks, and chat; viewers are read-only; only owners may manage members or delete projects.

**Why:** Existing projects were created under a single-owner security model. Keeping that owner authoritative preserves backward compatibility while allowing controlled collaboration without making every employee equivalent to the owner.

**How to apply:** Any new project-scoped route or UI must resolve owner-or-member access, enforce role-specific writes on the server, hide or disable disallowed mutations in the client, and return not-found for users with no project access.