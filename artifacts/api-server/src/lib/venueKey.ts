/** Normalise a venue name into a stable lookup key for the per-venue
 *  learning-memory loop. The same producer uploading "Sentrum  Scene",
 *  "Sentrum Scene" and "sentrum scene" should hit the same memory
 *  entry — otherwise the learning loop starts from scratch every time
 *  they retype the venue field.
 *
 *  Lives in its own leaf module so both `routes/rigplanAnalyze.ts` and
 *  `routes/venueMemory.ts` can import it without taking on each
 *  other's transitive dependencies. */
export function venueKeyFor(venueName: string): string {
  return venueName.trim().toLowerCase().replace(/\s+/g, " ");
}
