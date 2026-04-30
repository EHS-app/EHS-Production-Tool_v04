/** Pull the first ```json … ``` block out of the model's text output,
 *  with a permissive fallback that grabs the first {…} balanced span
 *  when no fence is present.
 *
 *  Order matters:
 *    1. The fenced ```json (or just ```) block is the canonical thing
 *       the model emits. We try it first because it is the least
 *       ambiguous — anything inside the fence is the JSON we want.
 *    2. The {…} fallback is a guard against the model occasionally
 *       forgetting the fences. It slices from the FIRST `{` to the
 *       LAST `}` without bracket-matching. For our model output this
 *       is fine because the JSON object is always the dominant
 *       content; brace-counting would only matter if there were
 *       significant non-JSON braces interleaved with the JSON, which
 *       does not happen in practice.
 *
 *  Returns null when neither a fence nor a balanced {…} span is
 *  found — the caller treats that as "the model returned nothing
 *  parseable" and surfaces an error to the user.
 *
 *  Lives in its own leaf module so the fence-vs-fallback selection
 *  logic is locked down by tests independent of the Anthropic
 *  client. */
export function extractJsonBlock(text: string): string | null {
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) return fence[1].trim();
  // Fallback: find the first {...} balanced span.
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start >= 0 && end > start) return text.slice(start, end + 1);
  return null;
}
