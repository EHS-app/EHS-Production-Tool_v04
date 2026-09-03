export function resolveProjectName(
  projectName: string | null | undefined,
  legacyVenue: string | null | undefined,
): string {
  return projectName ?? legacyVenue ?? "";
}

export function projectIdentityPayload(
  projectName: string,
  venue: string,
  venueId: string | null | undefined,
): {
  name: string;
  venue: string;
  venue_id: string | null;
} {
  return {
    name: projectName,
    venue,
    venue_id: venueId || null,
  };
}