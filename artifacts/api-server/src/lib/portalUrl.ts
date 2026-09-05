const PORTAL_BASE_URL = "https://app.ehs.no";

export function buildPortalBriefUrl(briefId: string): string {
  const url = new URL("/", PORTAL_BASE_URL);
  url.searchParams.set("view", "portal");
  url.searchParams.set("brief", briefId);
  return url.toString();
}