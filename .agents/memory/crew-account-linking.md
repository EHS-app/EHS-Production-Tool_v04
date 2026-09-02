---
name: Crew account linking
description: Identity-safety rules for connecting producer crew rows to freelancer portal accounts.
---

Never infer a freelancer account from typed display text. A crew row becomes linked only through explicit selection of a structured directory candidate, and portal requests must address the stored Clerk user ID rather than a name or email.

**Why:** Names are mutable and non-unique. Allowing text matching, duplicate local links, or local deletion after sending can route a brief incorrectly or orphan the server assignment from its producer-facing row.

**How to apply:** Keep manual names unlinked; clear the complete identity/profile bundle when an unsent linked name is edited; prevent duplicate links; and lock identity-removing actions after a request creates a server correlation.