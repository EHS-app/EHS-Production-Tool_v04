/** Pull a "<w>m × <h>m" pair out of a notes string. We only match
 *  numbers that are explicitly suffixed with "m" (so pixel counts
 *  like "768 x 1152 pixel" and panel counts like "16 x 9 panels" are
 *  excluded). Returns nulls when no usable pair is found, leaving
 *  the caller free to fall back to whatever the model already gave.
 *
 *  Two regex passes:
 *    1. Both-labelled form ("7.5m × 4.5m") — preferred, matched first
 *       because it is unambiguous.
 *    2. Trailing-label fallback ("5 × 3 m") — less common but the
 *       drawings table sometimes drops the inner unit.
 *
 *  Norwegian / European drawings frequently use comma as the decimal
 *  mark ("7,5m × 4,5m"). We normalise digit-comma-digit to digit-dot-
 *  digit before matching so both forms are accepted.
 *
 *  Zero and negative dimensions are rejected at the parse step so a
 *  stray "0m × 5m" doesn't flow downstream and render a 0-wide screen.
 *
 *  Both regex passes use a `\b` word-boundary after the trailing "m"
 *  so that adjacent unit suffixes ("mm", "miles", "m2") are NOT
 *  silently treated as metres. The first "m" in the both-labelled
 *  form intentionally has no `\b` so no-space inputs like "7.5mx4.5m"
 *  still parse — this is a real format produced by some drawings
 *  tables.
 *
 *  Known limitations (intentionally not handled):
 *    - US-style thousand separators ("1,200m") get reinterpreted as
 *      decimals ("1.2m") because comma-normalisation is unconditional.
 *      The analyser targets Norwegian drawings where comma is the
 *      decimal mark, not a thousand separator, so this is acceptable.
 *    - Leading-decimal forms (".5m × .3m") are rejected because the
 *      digit pattern requires `\d+` before the decimal point.
 *    - The unicode superscript-2 ("4.5m²") still parses, because `²`
 *      is a non-word char so `\b` matches; this is a minor edge case
 *      we can address if it shows up in real notes.
 *
 *  Lives in its own leaf module so the regex behaviour is
 *  independently unit-testable — the match / no-match boundaries are
 *  subtle and easy to regress by accident. */
export function parseMetresFromNotes(
  notes: string,
): { widthM: number | null; heightM: number | null } {
  if (!notes) return { widthM: null, heightM: null };
  // European / Norwegian drawings often use comma as the decimal mark
  // (e.g. "7,5m x 4,5m"). Normalise commas-between-digits to dots
  // before matching so we accept either form.
  const text = notes.replace(/(\d),(\d)/g, "$1.$2");
  const parsePair = (match: RegExpMatchArray | null) => {
    if (!match) return null;
    const w = Number(match[1]);
    const h = Number(match[2]);
    if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) {
      return null;
    }
    return { widthM: w, heightM: h };
  };
  // Both numbers labelled (e.g. "7.5m x 4.5m"): preferred form.
  // The trailing `\b` rejects adjacent unit suffixes like "mm",
  // "miles" or "m2" that would otherwise be silently swallowed.
  const both = parsePair(
    text.match(/(\d+(?:\.\d+)?)\s*m\s*[x×]\s*(\d+(?:\.\d+)?)\s*m\b/i),
  );
  if (both) return both;
  // Single trailing label (e.g. "5 x 3 m" or "5x3m"). Less common, still valid.
  const trailing = parsePair(
    text.match(/(\d+(?:\.\d+)?)\s*[x×]\s*(\d+(?:\.\d+)?)\s*m\b/i),
  );
  if (trailing) return trailing;
  return { widthM: null, heightM: null };
}
