# LED Tab — Build Specification

> **How to use this doc:** Read each section. Whenever you see something that
> is **wrong**, **missing**, or **should work differently**, edit that line
> (or strike it through and write the correct behaviour). Then send it back
> to me and we'll bring the code in line with your version.

---

## 1. Purpose (one paragraph)

The **LED tab** is where the producer designs every LED video wall on the
show. It is the bridge between the **rigging side** (how heavy is it, how
much power does it draw, what brackets does it need) and the **video side**
(how many pixels, which processor, how many output cables, how the cabinets
are physically arranged on stage). It also contains a node-graph
**System Designer** where the producer plans the signal path: processor →
fiber converter → screen → power supplies, with cable-length checks. Output
of this tab feeds the Client Pack PDF, the Show Simulation readiness check,
and the brief that goes out to freelance LED techs.

---

## 2. Top-of-tab dashboard (always visible)

The strip at the very top of the LED tab shows six KPI cards:

1. **Screens** — total LED screens in the show (linked + manual).
2. **Panels** — total enabled cabinets across all screens.
3. **Pixels** — total enabled pixels.
4. **Area** — m² of LED face.
5. **Weight** — kg of LED cabinets only (no rigging beams here — those are
   in the Rigging Report).
6. **Power** — kW peak draw.

Below the KPIs is a **processor capacity banner** that only appears when a
global processor model is selected. It shows three live meters:

- Pixels used vs. processor pixel cap
- Outputs used vs. processor output count
- Canvas width × height vs. processor canvas max

If any meter goes red, the show is over-spec'd on that processor — the
producer must either downsize, split the screen, or upgrade the processor.

---

## 3. Screen list (one card per screen)

Each LED screen is one card. The card has these controls:

### Identification
- **Name** (free text — e.g. "Main IMAG L", "Stage Back Wall").
- **Color** — a swatch used to tint this screen on the pixel-map canvas so
  multiple screens are visually distinguishable.

### Cabinet
- **Panel** dropdown — choose the cabinet model from the LED inventory. The
  dropdown lists everything from the **Rigging Report → "LED Screen"
  category** that carries pixel + physical metadata. Today that is:
  - Uniview UR Pro 0.5×1m (12.3 kg)
  - Uniview UR Pro 0.5×1m + cable (12.575 kg) ← **default for new screens**
  - Uniview UR Pro 0.5×0.5m 90° (8.8 kg)
  - Uniview UR Pro 0.5×0.5m 90° + cable (9.075 kg)
  - **Custom panel…** (synthetic — opens custom-cabinet fields)
- **Panels Wide × Panels Tall** — grid size in cabinets.
- **Custom panel fields** (only when "Custom panel…" is picked) — pixel W/H,
  physical W/H in metres, weight, peak watts.

### Shape (non-rectangular screens)
- **Shape template** dropdown — Rectangle, L-shape, U-shape, T-shape, Plus,
  Stairs, Ribbon, Columns. Picking one stamps a pattern of "disabled cells"
  so the screen renders as that shape.
- **Shape edit mode** button — when active, clicking individual cabinets on
  the pixel-map canvas toggles them ON/OFF. Disabled cabinets are excluded
  from pixel / weight / power / area totals (but the bounding-box width and
  height still come from Panels W × Panels Tall).

### Markers (instructions to the LED crew)
- **+P button** — click then click a cabinet to drop a **power feed marker**
  (red badge "P1", "P2", …). Tells the crew where the TrueOne lands.
- **+S button** — same but a **signal marker** (blue badge "S1", "S2", …).
  Tells the crew where the CAT cable from the processor lands.
- Markers are anchored to (col, row) on the grid, so toggling cells off or
  resizing the grid does NOT make them drift.

### Output / signal
- **Output index** — which numbered processor output this screen takes.
  Used to validate against processor output count.
- **Processors** (per-screen) — optional. Add one or more Novastar models
  attached to THIS screen specifically. When empty, the screen falls back
  to the show-wide processor from LED Settings.

### Bracket
- **Bracket override** — optional one-off bracket name for this screen
  (e.g. swap to a flying bar without changing the inventory).

### Display
- **Name scale** — multiplier for the "Main" / "IMAG" name pill drawn on
  the canvas and PNG export (0.3× – 4×).

### Notes
- **Notes** — free-text per screen.

### Card actions
- **Duplicate** — clone this screen.
- **Remove** — delete it.
- **Export PNG** — render this screen's pixel map to a PNG (used by the
  Client Pack PDF).

---

## 4. Pixel-map canvas (the big picture)

Below the screen cards is the **pixel-map canvas** — an SVG diagram of how
the screens are laid out on stage.

- **Auto-flow layout** — by default, screens flow left-to-right with a small
  gap. The producer doesn't position anything.
- **Drag handle (⠿)** — top-left of each screen. Dragging sets explicit
  `posX, posY` and removes that screen from auto-flow.
- **Reset positions** button — clears all `posX, posY` so every screen falls
  back into auto-flow.
- **Cabinet pattern** — each cabinet is rendered in a "Checker" or "Columns"
  pattern (two-tone) so the producer can see the cabinet boundaries even on
  a uniform wall. Pattern + colors come from LED Settings (panelColorDark,
  panelColorLight) and can be overridden per-screen.
- **Flow arrows** — drawn between cabinets to show the signal path inside a
  screen. Three modes:
  - **Linear** — left-to-right across every row, top to bottom.
  - **Serpentine** — left-to-right on row 1, right-to-left on row 2, etc.
  - **Column serpentine** — top-down on column 1, bottom-up on column 2, etc.

---

## 5. Cable & Bracket BOM

A roll-up section showing exactly what cable + bracket inventory the show
needs. Computed from:

- **Signal cables (CAT)** — depends on `outputMode`:
  - **Per-screen** — 1 cable per screen, plus 1 extra for every overflow
    block of pixels above the per-port pixel cap (`portLimit`, default
    650,000).
  - **Per-row** — 1 cable per panel row of every screen.
- **Power cables (TrueOne)** — 1 feed per screen by default, or driven by
  the count of "+P" markers if the producer placed them.
- **Brackets** — looked up from the panel inventory (or `bracketOverride`)
  and counted per cabinet.

The BOM appears both on-screen and in the Client Pack PDF.

---

## 6. Linked screens (read-only — owned by the Rigging Report)

The Rigging Report tab has "LED systems" with "LED rows". Any LED row that
points to a **pixel-carrying** inventory item (a cabinet, not a beam or
Molton) automatically becomes a **linked LED screen** on this tab. Linked
screens:

- Show a "Linked" badge.
- Have grid size driven by the rigging row's quantity (read-only here —
  edit it on the rigging tab).
- Otherwise behave identically to a manual screen — color, shape, markers,
  output, processors, notes are all editable here.

Beams (`Beam 1m hang/stack`, `Beam 0.5m`, `Beam 0.5m 90°`) and Moltons in
the rigging LED rows do **not** become linked screens — they only contribute
weight to the rigging system.

---

## 7. LED System Designer (node-graph)

A separate panel below the screen list — built on **React Flow v12** — where
the producer plans the signal/fiber/power topology of the whole LED system.

### Nodes (4 kinds)
1. **Screen** — represents an LED wall. Either linked to an existing
   LedScreen by ID (pixel count auto-fills) or a manual W×H pixel box.
2. **Processor** — a Novastar processor with output count + max pixels per
   port + max canvas pulled from the catalog.
3. **Fiberbox** — a CVT10-style fiber converter that fans signal out to
   multiple screens.
4. **PSU** — a power supply with amperage rating.

### Edges (3 kinds)
1. **Signal** (CAT) — processor → fiberbox or processor → screen.
2. **Fiber** — processor → fiberbox.
3. **Power** — PSU → screen.

Each edge carries a length in metres entered by the producer.

### Inspector (right side)
Click any node to edit it in the inspector — name, model, output count,
linked screen ID, manual pixel W/H, PSU amperage.

### Calculations the designer runs live
- **Reachability (BFS)** — from each processor it walks the signal+fiber
  graph and lists which screens it actually reaches. Orphans show up.
- **Pixel capacity** — sum of pixels of reachable screens vs. processor cap.
- **CVT10 fan-out** — if a fiberbox has more than 10 signal edges out, it
  goes red ("over fan-out").
- **Cable distance** — signal edge > 90 m = warning; fiber edge > 300 m =
  warning.

### Persistence
Node positions, viewport zoom, and the whole graph save to the
`ledSystem` field on the project (localStorage v2 + cloud auto-save). The
graph survives page reloads and is editable from any device.

---

## 8. LED Settings (gear icon)

Show-wide LED defaults:

- **Port limit** — pixels per processor output cable (default 650,000).
- **Wire path** — Linear / Serpentine / Column serpentine (affects flow
  arrows + cable BOM).
- **Output mode** — Per-screen or Per-row (affects cable BOM count).
- **Panel pattern** — Checker or Columns (affects pixel-map rendering).
- **Show-wide processor** — fallback when a screen has no per-screen
  processor. Drives the capacity banner.
- **Panel colors** (dark + light) — defaults for new screens.

---

## 9. What feeds OUT of the LED tab

- **Show Simulation readiness** — flags screens with no output, processors
  over capacity, missing brackets.
- **Client Pack PDF** — section 6 of the 11-section client deliverable.
  Includes pixel-map PNG, BOM, and System Designer diagram.
- **Brief bridge** — when sending a brief to a freelance LED tech, the
  screens + processors + cable BOM are baked into the share URL.
- **Rigging Report totals** — the panel weight × cabinet count flows back
  into the rigging system weight that the report uses for SWL / motor
  selection.

---

## 10. What feeds IN to the LED tab

- **Rigging Report LED rows** — pixel-carrying cabinets become linked
  screens (see §6).
- **Drawing Analyser (Rigg Plan tab)** — Claude reads PDF/image drawings
  and proposes LED screens (name, panels W×H or width×height in metres).
  On "Apply to reports" they land here as manual screens.
- **Per-venue learning memory** — past corrections to the analyser at the
  same venue make the next analysis smarter.

---

## 11. Persistence + sync

Every field on this tab — screens, settings, processors, markers, disabled
cells, designer graph, positions — is stored on the **project record**:

- **Local** — `localStorage` key `ehs-report-v2` (instant, offline).
- **Cloud** — Postgres `projects` table, debounced 5 s after last edit,
  as a JSONB blob alongside the project metadata.

Switching projects via the Projects modal flushes pending saves first so
nothing is lost.

---

## 12. i18n

Every label, button, and warning on the LED tab has an English and
Norwegian Bokmål translation, keyed under `led.*` and `help.ledHowto.*` in
`lib/i18n/translations/{en,no}.ts`. Currency / dates use locale-aware
formatting (nb-NO / en-GB).

---

## 13. Recent changes (last 2 weeks) — for context

- **LED System Designer (§7)** — newly built. React Flow v12, persists
  node positions on drag-stop only (avoids "node not initialized" crash).
- **Panel weight update (today)** — 0.5×1m bumped 10.8 → 12.3 kg; 0.5×0.5m
  relabelled as 90° and bumped 7.2 → 8.8 kg.
- **"+ cable" variants (today)** — added for both panel sizes (+0.275 kg).
- **Beam inventory (today)** — Beam 1m hang/stack 10 kg, Beam 0.5m 6 kg,
  Beam 0.5m 90° 4.5 kg. Selectable from Rigging Report → LED rows. Do **not**
  appear in the LED tab panel dropdown by design (they aren't cabinets).
- **Default panel (today)** — new screens default to the "+ cable" variant
  so truck weight is realistic from the start.
- **Migration map (today)** — legacy panel keys forward to the new ones so
  saved projects don't fall back to "Custom".

---

## 14. Open questions / things to confirm

> **You — please mark each line YES / NO / CHANGE:**

- [ ] Should beams ever appear under the LED screen card itself (per-screen
      rigging accessories), instead of only on the Rigging Report tab?
- [ ] Should the default new screen really be "0.5×1m + cable" or do you
      want it to default to something else?
- [ ] Should the panel dropdown also include the non-90° flat 0.5×0.5m
      (we removed it — saved projects forward to the 90° variant)?
- [ ] Should the System Designer auto-suggest a topology (processor →
      fiberbox → screens) when you add a screen, or stay fully manual?
- [ ] Anything in §3 (per-screen controls) you never use and want hidden?
- [ ] Anything you wish was there and isn't?

---

*End of spec.*
