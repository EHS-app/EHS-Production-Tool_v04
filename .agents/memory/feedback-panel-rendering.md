---
name: Feedback panel rendering
description: Cross-browser rendering constraint for the feedback form opened from account menus.
---

Render the feedback form as a direct, conditionally mounted, fixed-position
layout child. Do not use Radix Dialog, DialogContent, or portal rendering for
this feature.

**Why:** The portal-based dialog repeatedly failed to open in the user's Mac
browser despite working in automated browser checks and after several menu
lifecycle fixes. Removing the dialog portal eliminates that browser-specific
rendering path.

**How to apply:** Keep feedback-open state in each top-level layout, toggle it
directly from the menu item, and render the shared zero-portal panel at the
bottom of the layout body.