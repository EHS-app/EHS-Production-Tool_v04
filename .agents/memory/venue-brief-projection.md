---
name: Venue brief projection
description: Trust and privacy boundary between employee venue/client directories and freelancer portal briefs.
---

Freelancer briefs may include a server-built snapshot of venue name, address, website, rigging, power, logistics, and facilities. They must not trust a client-authored snapshot or expose venue technical contacts, billing data, organization numbers, payment terms, or directory records. A producer-authored plain-text assignment contact is allowed.

**Why:** Assigned freelancers need operational site information, but the employee directories contain commercial and contact data outside their assignment scope. A stored snapshot also keeps the accepted brief stable if the venue directory changes later.

**How to apply:** Derive the snapshot from the selected project/venue on the server when publishing a brief. Sanitize every freelancer brief response through an explicit projection, preserve only the producer-authored scalar contact, and render the trusted venue details in the portal.