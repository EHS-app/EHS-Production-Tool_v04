---
name: Alert dialog runtime layout
description: Runtime CSS failure that can place critical dialogs below the visible page.
---

Critical alert dialogs must be verified by computed browser styles, not by their utility-class strings alone. In this app, an alert dialog rendered with `position: static`, transparent background, and no width or padding despite carrying fixed-position utility classes.

**Why:** The project-delete dialog flowed near the bottom of a long document, putting its confirmation controls below the viewport and making deletion appear nonfunctional.

**How to apply:** For destructive or blocking dialogs, confirm the live content is fixed and centered with a bounded viewport height, scrolling, visible background, padding, and sufficient stacking. Use explicit component-level geometry when those utilities are absent at runtime.