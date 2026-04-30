/** Pure-logic builder for the venue-memory hint we inject into the
 *  Claude prompt before each drawing analysis.
 *
 *  Lives here (rather than inline in the route) so the function is
 *  free of the DB / SDK / Express imports that the route file pulls
 *  in transitively, and can therefore be unit-tested with `node:test`
 *  without dragging in the whole api-server module graph.
 *
 *  Invariants:
 *  - The input shape is intentionally loose — older saves with
 *    missing fields still load, and unknown fields are ignored.
 *  - We cap the per-category list size so the rendered hint stays
 *    well within the prompt budget even for long-running venues that
 *    have accumulated many corrections.
 *  - Nullish entries inside arrays are dropped before rendering so
 *    a corrupted save can never blow up the prompt-builder. */

export type SavedMemoryShape = {
  lastCorrected?: {
    trusses?: Array<{ name?: unknown; lengthM?: unknown; pointCount?: unknown }>;
    lighting?: Array<{ name?: unknown; qty?: unknown; trussName?: unknown }>;
    ledScreens?: Array<{
      name?: unknown;
      widthM?: unknown;
      heightM?: unknown;
      panelsWide?: unknown;
      panelsTall?: unknown;
    }>;
    stages?: Array<{ name?: unknown; widthM?: unknown; depthM?: unknown }>;
    sound?: Array<{ name?: unknown; qty?: unknown }>;
  };
};

/** Read a category array out of `lastCorrected`, tolerating corrupted
 *  saves where the value is anything other than an array (object,
 *  string, number…). Together with the per-row `filter(Boolean)`
 *  below this guarantees the function never throws even on a
 *  garbage-shaped blob. */
function arr<T>(value: T[] | undefined): T[] {
  return Array.isArray(value) ? value : [];
}

/** Treat blank / whitespace-only names as missing so the "Truss" /
 *  "Fixture" / etc. fallback labels kick in instead of rendering a
 *  hint line with a leading space ("` (10 m, 3 pts)`"). */
function trimmedString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const t = value.trim();
  return t ? t : null;
}

export function buildVenueMemoryHint(raw: unknown): string {
  if (!raw || typeof raw !== "object") return "";
  const memory = raw as SavedMemoryShape;
  const last = memory.lastCorrected;
  if (!last) return "";
  const lines: string[] = [];
  const trusses = arr(last.trusses).filter(Boolean).slice(0, 8);
  if (trusses.length) {
    const items = trusses
      .map((t) => {
        const name = trimmedString(t.name) ?? "Truss";
        const len = Number.isFinite(t.lengthM) ? `${t.lengthM as number} m` : null;
        const pts = Number.isFinite(t.pointCount)
          ? `${t.pointCount as number} pts`
          : null;
        const tail = [len, pts].filter(Boolean).join(", ");
        return tail ? `${name} (${tail})` : name;
      })
      .join("; ");
    lines.push(`- Trusses usually present: ${items}.`);
  }
  const lighting = arr(last.lighting).filter(Boolean).slice(0, 10);
  if (lighting.length) {
    const items = lighting
      .map((f) => {
        const name = trimmedString(f.name) ?? "Fixture";
        const qty = Number.isFinite(f.qty) ? `${f.qty as number}× ` : "";
        const trussLabel = trimmedString(f.trussName);
        const truss = trussLabel ? ` on ${trussLabel}` : "";
        return `${qty}${name}${truss}`;
      })
      .join("; ");
    lines.push(`- Lighting often used: ${items}.`);
  }
  const led = arr(last.ledScreens).filter(Boolean).slice(0, 4);
  if (led.length) {
    const items = led
      .map((s) => {
        const name = trimmedString(s.name) ?? "LED";
        if (Number.isFinite(s.widthM) && Number.isFinite(s.heightM)) {
          return `${name} (${s.widthM as number} × ${s.heightM as number} m)`;
        }
        if (Number.isFinite(s.panelsWide) && Number.isFinite(s.panelsTall)) {
          return `${name} (${s.panelsWide as number} × ${s.panelsTall as number} panels)`;
        }
        return name;
      })
      .join("; ");
    lines.push(`- LED screens typically: ${items}.`);
  }
  const stages = arr(last.stages).filter(Boolean).slice(0, 4);
  if (stages.length) {
    const items = stages
      .map((s) => {
        const name = trimmedString(s.name) ?? "Stage";
        if (Number.isFinite(s.widthM) && Number.isFinite(s.depthM)) {
          return `${name} (${s.widthM as number} × ${s.depthM as number} m)`;
        }
        return name;
      })
      .join("; ");
    lines.push(`- Stages / decks typically: ${items}.`);
  }
  const sound = arr(last.sound).filter(Boolean).slice(0, 6);
  if (sound.length) {
    const items = sound
      .map((s) => {
        const name = trimmedString(s.name) ?? "Sound";
        const qty = Number.isFinite(s.qty) ? `${s.qty as number}× ` : "";
        return `${qty}${name}`;
      })
      .join("; ");
    lines.push(`- Sound often: ${items}.`);
  }
  return lines.join("\n");
}
