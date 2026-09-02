---
name: Disabled controls can trigger duplicate blur saves
description: Why autosave fields need a synchronous in-flight guard before pending UI disables the focused control.
---

When a blur-triggered save marks its field pending and immediately disables that still-focused control, some browsers can emit another blur and invoke the save handler twice. Use a synchronous per-record in-flight guard before awaiting network work; rendered pending state alone is too late to stop the duplicate.

**Why:** A forced-failure task-title test intercepted the first PATCH, but disabling the textarea triggered a second blur/PATCH that succeeded and made the failed value appear persisted.

**How to apply:** Any form that saves on blur and disables inputs while saving should synchronously reject duplicate submissions for the same record, then restore confirmed state on failure.