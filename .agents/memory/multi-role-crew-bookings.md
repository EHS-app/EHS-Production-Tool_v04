---
name: Multi-role crew bookings
description: Identity boundary between separate roster role slots and one freelancer portal recipient.
---

Secondary role bookings for the same person must remain separate local roster rows without copying the linked freelancer recipient identity. True portal-linked multi-role bookings require explicit per-role slot identity across invitations, decisions, gigs, and roster merging.

**Why:** The portal currently treats one freelancer on one brief as one recipient. Reusing that identity on multiple crew rows would collapse rows, misroute accept/decline state, or send duplicate notifications.

**How to apply:** The safe “add role” path creates an independent local booking row. Do not preserve or recreate the portal recipient link for that row until the server and database model role slots explicitly.