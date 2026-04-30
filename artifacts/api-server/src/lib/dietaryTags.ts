/** Free-text dietary classifier for the producer-side catering
 *  aggregator. The freelancer profile stores `dietary` and `allergies`
 *  as free text — that's intentional, because catering needs are too
 *  varied to constrain to a fixed list, and the chef ultimately reads
 *  the full text anyway. But the producer's catering view also wants
 *  *counts per category* (vegetarian / vegan / halal / gluten-free /
 *  lactose-free), so we classify the free text into a structured tag
 *  set on the server before sending it to the client.
 *
 *  Both English and Norwegian terms are matched because the EHS team
 *  and their freelancers write in both. False negatives are
 *  preferred over false positives — if the chef sees a lower
 *  category count than the actual roster, they'll still see the
 *  unclassified text in the per-person allergens list and the
 *  meal still rolls into the day's `total`. False positives, by
 *  contrast, can cause an under-supply (e.g. a meat-eater wrongly
 *  tagged vegan only gets vegan options).
 *
 *  Categories deliberately do NOT cascade: a vegan dish satisfies a
 *  vegetarian, but the chef plates them differently, so the counts
 *  are separate. Likewise gluten-free does not imply lactose-free. */

/** Canonical category tags. Extending this list requires updating the
 *  client (`CateringView`) too, so keep the type as a discriminated
 *  union — the type-checker will catch any new tag that isn't
 *  rendered. */
export type DietaryTag =
  | "vegetarian"
  | "vegan"
  | "halal"
  | "gluten-free"
  | "lactose-free";

export const DIETARY_TAGS: ReadonlyArray<DietaryTag> = [
  "vegetarian",
  "vegan",
  "halal",
  "gluten-free",
  "lactose-free",
];

/** Lowercase keyword set per tag. Each keyword is checked as a
 *  case-insensitive *substring* match against a normalised version
 *  of the input (lowercase, hyphens and underscores collapsed to
 *  spaces) so we catch variants like "gluten-free" vs "gluten free"
 *  vs "glutenfri". */
const KEYWORDS: Record<DietaryTag, ReadonlyArray<string>> = {
  vegetarian: ["vegetarian", "vegetarianer", "vegetar", "lacto-ovo"],
  vegan: ["vegan", "veganer", "plant based", "plant-based", "plantebasert"],
  halal: ["halal"],
  "gluten-free": [
    "gluten-free",
    "gluten free",
    "glutenfri",
    "gluten fri",
    "celiac",
    "coeliac",
    "cøliaki",
    "cliaki",
    "no gluten",
    "uten gluten",
  ],
  "lactose-free": [
    "lactose-free",
    "lactose free",
    "laktosefri",
    "laktose fri",
    "no lactose",
    "no dairy",
    "dairy free",
    "dairy-free",
    "uten laktose",
    "uten melk",
    "uten meieri",
    "melkefri",
  ],
};

/** Lowercase + collapse separator characters to single spaces, so a
 *  keyword like "gluten free" matches "Gluten-Free" and "gluten_free"
 *  alike. We deliberately do not strip punctuation otherwise — the
 *  comma in "vegan, gluten-free" is harmless because we substring
 *  match. The same normalisation is applied to *both* input and
 *  keywords so a hyphenated keyword like "lacto-ovo" still matches
 *  after the input's hyphens have been collapsed to spaces. */
function normalise(text: string): string {
  return text.toLowerCase().replace(/[-_/]+/g, " ").replace(/\s+/g, " ").trim();
}

/** Words that, when they appear immediately before a category
 *  keyword, *invert* the match. Without this guard, "non-vegan",
 *  "not vegetarian", or "ikke vegetar" would all be misclassified
 *  as positive tags — a meat-eater wrongly tagged vegan would only
 *  get vegan options served. False positives are far more harmful
 *  than false negatives in catering, so we err strongly on the
 *  side of *not* tagging when we see a negator. */
const NEGATORS: ReadonlyArray<string> = [
  "non",
  "not",
  "no",
  "never",
  "ikke",
  "ingen",
  "uten",
];

/** True if the keyword match at `text[index..]` is preceded by a
 *  negator within the previous ~10 characters. We only look at the
 *  immediate left-context to avoid false negatives on long sentences
 *  where the negator is unrelated. */
function isNegated(text: string, index: number): boolean {
  if (index === 0) return false;
  const window = text.slice(Math.max(0, index - 10), index);
  // Match a negator that ends right at the keyword (allowing a single
  // space or hyphen-equivalent space between them post-normalisation).
  for (const neg of NEGATORS) {
    if (window.endsWith(`${neg} `)) return true;
  }
  return false;
}

/** Classify a free-text dietary string into the canonical tag set.
 *  Returns an array (not a Set) so the result is stable, JSON-friendly,
 *  and ordered consistently with `DIETARY_TAGS` for the client.
 *
 *  Negation guard ("non-vegan", "ikke vegetar") prevents inverted
 *  free-text from misclassifying a meat-eater as vegan, which is the
 *  worst-case error for the chef (under-supply of normal meals). */
export function classifyDietary(raw: string | null | undefined): DietaryTag[] {
  if (!raw || typeof raw !== "string") return [];
  const text = normalise(raw);
  if (!text) return [];
  const out: DietaryTag[] = [];
  for (const tag of DIETARY_TAGS) {
    let matched = false;
    for (const kw of KEYWORDS[tag]) {
      const needle = normalise(kw);
      let from = 0;
      while (from < text.length) {
        const idx = text.indexOf(needle, from);
        if (idx < 0) break;
        if (!isNegated(text, idx)) {
          matched = true;
          break;
        }
        from = idx + needle.length;
      }
      if (matched) break;
    }
    if (matched) out.push(tag);
  }
  return out;
}

/** Split a free-text allergens string into individual allergen names.
 *  Splits on common separators (comma, semicolon, slash, " and ", " og "
 *  for Norwegian) and trims each piece. Empty results filtered out.
 *  Used so the catering view can render allergens as discrete chips
 *  per crew member instead of one wall of text — chefs cross-reference
 *  allergens against ingredient lists, so atomicity matters. */
export function splitAllergens(raw: string | null | undefined): string[] {
  if (!raw || typeof raw !== "string") return [];
  return raw
    .split(/,|;|\/| and | og /i)
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .map((s) => s.slice(0, 80));
}
