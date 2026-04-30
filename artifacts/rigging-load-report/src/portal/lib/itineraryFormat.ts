/**
 * Pure formatting helpers for the freelancer Itinerary card.
 *
 * Extracted out of `ItinerarySection.tsx` so they can be unit-tested
 * with the Node test runner (which doesn't transform JSX) and so the
 * rendering component stays a thin wrapper over the layout.
 */

/** Render a date like "Mon, 1 May 2026" (or the locale-equivalent) so
 *  the day-of-week and the date share the same locale. The server's
 *  itinerary response includes a hard-coded English `dayOfWeek`
 *  string, but we deliberately re-derive it here from the ISO date so
 *  a Norwegian (or any other) browser doesn't end up rendering a
 *  mixed-language string like "Mon 1. mai 2026".
 *
 *  `locale` is passed straight through to `toLocaleDateString`; pass
 *  `undefined` (default) to use the browser's preferred locale, or an
 *  explicit BCP-47 tag (e.g. "en-US", "nb-NO") in tests. */
export function formatHumanDate(iso: string, locale?: string): string {
  try {
    const d = new Date(`${iso}T00:00:00Z`);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleDateString(locale, {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    });
  } catch {
    return iso;
  }
}

/** Format a production-phase time-range for the parenthesised suffix
 *  on the Production line, e.g. "(09:00–18:00)" / "(09:00→)" /
 *  "(→ 18:00)". Returns `null` when neither side is set so the
 *  caller can omit the parens entirely instead of rendering "()".
 *
 *  Treats whitespace-only or empty strings as missing (defensive
 *  against stale jsonb edits where a producer cleared a field).
 *
 *  We deliberately avoid locale-specific qualifiers (e.g. "until"
 *  in English or "til" in Norwegian) here because the surrounding
 *  date format is auto-localised by Intl — mixing an English word
 *  into a Norwegian-formatted date row would re-introduce exactly
 *  the kind of mixed-language string we removed when we stopped
 *  rendering the server's hard-coded `dayOfWeek`. The arrow glyph
 *  reads correctly in every locale we care about. */
export function formatPhaseTime(
  fromTime?: string,
  toTime?: string,
): string | null {
  const from = fromTime?.trim();
  const to = toTime?.trim();
  if (from && to) return `${from}\u2013${to}`;
  if (from) return `${from}\u2009\u2192`;
  if (to) return `\u2192\u2009${to}`;
  return null;
}

export type HotelDay = {
  stayingTonight: boolean;
  isCheckIn: boolean;
  isCheckOut: boolean;
  roomKey?: string;
  roommateName?: string | null;
  locked?: boolean;
};

/** Single-line description of the hotel state for one date.
 *
 *  Notes on what we deliberately DON'T render here:
 *  - "(locked)" — that's a producer-side concept (the pairing engine
 *    won't reshuffle a locked room) and would only confuse a
 *    freelancer reading their own itinerary.
 *  - "· check-in today" / "· check-out today" — the day-card header
 *    already shows a coloured chip for both states; duplicating the
 *    label inline is just noise.
 *
 *  On the check-out morning we DO repeat the room number, since the
 *  freelancer probably wants it for an expense report and shouldn't
 *  have to scroll back to yesterday's card to find it. */
export function hotelLineForDay(hotel: HotelDay): string {
  if (hotel.isCheckOut && !hotel.stayingTonight) {
    if (hotel.roomKey) {
      return `Check-out this morning \u00b7 Room ${hotel.roomKey}`;
    }
    return "Check-out this morning";
  }
  if (!hotel.stayingTonight) {
    // Defensive — the rollup shouldn't include a hotel entry for a
    // night the caller isn't staying, but render something instead of
    // a bare empty string just in case.
    return "Not staying tonight";
  }
  const parts: string[] = [];
  if (hotel.roomKey) {
    parts.push(`Room ${hotel.roomKey}`);
  } else {
    parts.push("Room TBD");
  }
  if (hotel.roommateName) {
    parts.push(`with ${hotel.roommateName}`);
  }
  return parts.join(" ");
}
