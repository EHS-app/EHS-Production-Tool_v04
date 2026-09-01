---
name: Radix menu-to-dialog lifecycle
description: Reliable behavior when a Radix dropdown item opens a controlled dialog.
---

Keep a dialog opened from a Radix dropdown mounted outside the dropdown's
portal/tree. When the item's selection handler prevents the default Radix
selection behavior, explicitly close the controlled menu after opening the
dialog.

**Why:** Preventing the default selection preserves the dialog state transition,
but it also suppresses Radix's automatic menu dismissal. Deferring the dialog
with an animation frame is not a reliable substitute across browsers and input
devices.

**How to apply:** Use a controlled menu and root-level controlled dialog. In the
item's selection handler, prevent the default event, set the dialog open, and
set the menu closed.