---
name: Project name and venue identity
description: Compatibility rule for keeping project titles separate from physical venue names and venue-directory links.
---

Treat the project title, physical venue name, and venue-directory identifier as three distinct values in editor state, saved project records, briefs, and accepted gigs.

**Why:** The original editor used one venue value as both project identity and location. Once the form is separated, reusing that value downstream silently overwrites either the title or the venue and makes project lists, calendars, and freelancer records disagree.

**How to apply:** Save the project title to the project-name field, the location to the venue field, and the directory link to the venue identifier. For legacy records or briefs with no project-name field, use the old venue value only as a display fallback for the project title; do not collapse newly saved fields.