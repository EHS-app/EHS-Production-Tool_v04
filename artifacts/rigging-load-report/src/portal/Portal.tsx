import { useEffect, useMemo, useRef, useState } from "react";
import { Route, Switch, useLocation } from "wouter";
import { useAuth, useUser } from "@clerk/react";
import { PortalLayout, type PortalNavKey } from "./PortalLayout";
import { Hub } from "./screens/Hub";
import { Gigs } from "./screens/Gigs";
import { Availability } from "./screens/Availability";
import { Earnings } from "./screens/Earnings";
import { Profile } from "./screens/Profile";
import { Briefs } from "./screens/Briefs";
import { BriefDetail } from "./screens/BriefDetail";
import { BriefImport } from "./screens/BriefImport";
import { Help } from "./screens/Help";
import {
  loadPortalData,
  savePortalData,
  type PortalData,
  type SharedBrief,
  type BriefDecision,
  EMPTY_PORTAL_DATA,
} from "./lib/portalStorage";
import type { ProjectBrief } from "../lib/projectBrief";
import type { ThemeMode } from "./lib/portalTheme";

export type PortalProps = {
  theme: ThemeMode;
  onToggleTheme: () => void;
};

export function Portal({ theme, onToggleTheme }: PortalProps) {
  const { user } = useUser();
  const { getToken, isSignedIn } = useAuth();
  const userId = user?.id ?? null;

  const [data, setData] = useState<PortalData>(() =>
    loadPortalData(userId),
  );
  // Track which userId the in-memory `data` was loaded for. Persistence is
  // gated on this matching the current userId so that an account switch
  // cannot accidentally overwrite the new user's bucket with the previous
  // user's still-in-memory data before the load effect runs.
  const loadedUserIdRef = useRef<string | null>(userId);

  useEffect(() => {
    setData(loadPortalData(userId));
    loadedUserIdRef.current = userId;
  }, [userId]);

  useEffect(() => {
    if (loadedUserIdRef.current !== userId) return;
    savePortalData(userId, data);
  }, [userId, data]);

  // Pull server-side briefs (those addressed to this freelancer via the
  // producer's Crew Report → Send requests flow) and merge them into
  // the local PortalData. Server is the source of truth for `decision`
  // — if the producer or another device has already recorded a
  // response on a given brief, the server row wins. Legacy
  // share-link briefs that only exist in localStorage are preserved
  // untouched. Re-runs every 60s while the producer might still be
  // pushing new requests; the result is treated as additive so a
  // failed request never wipes the local list.
  useEffect(() => {
    if (!isSignedIn || !userId) return;
    let cancelled = false;
    const baseUrl =
      (typeof import.meta !== "undefined" &&
        (import.meta as { env?: { BASE_URL?: string } }).env?.BASE_URL) ||
      "/";
    const fetchAndMerge = async () => {
      try {
        const token = await getToken();
        if (cancelled) return;
        const res = await fetch(`${baseUrl}api/portal/briefs/mine`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (cancelled || !res.ok) return;
        const json = (await res.json()) as {
          ok?: boolean;
          briefs?: ServerBriefRow[];
        };
        if (cancelled || !json.ok || !Array.isArray(json.briefs)) return;
        const serverShared = json.briefs
          .map(serverRowToSharedBrief)
          .filter((b): b is SharedBrief => b !== null);
        setData((prev) => mergeServerBriefs(prev, serverShared));
      } catch {
        /* swallow — local state is still usable, will retry */
      }
    };
    void fetchAndMerge();
    const t = window.setInterval(fetchAndMerge, 60_000);
    return () => {
      cancelled = true;
      window.clearInterval(t);
    };
  }, [isSignedIn, userId, getToken]);

  const [location] = useLocation();
  const active: PortalNavKey = useMemo(() => {
    const path = location.replace(/\/+$/, "");
    if (path.endsWith("/gigs")) return "gigs";
    if (path.endsWith("/availability")) return "availability";
    if (path.endsWith("/earnings")) return "earnings";
    if (path.endsWith("/profile")) return "profile";
    if (path.endsWith("/help")) return "help";
    if (path.includes("/brief")) return "briefs";
    return "hub";
  }, [location]);

  const pendingBriefCount = useMemo(
    () => data.briefs.filter((b) => b.decision === "pending").length,
    [data.briefs],
  );

  // Pre-fill profile name from Clerk on first load if empty.
  useEffect(() => {
    if (!user) return;
    setData((prev) => {
      if (prev.profile.fullName) return prev;
      const fromClerk =
        user.fullName ??
        [user.firstName, user.lastName].filter(Boolean).join(" ") ??
        "";
      if (!fromClerk) return prev;
      return { ...prev, profile: { ...prev.profile, fullName: fromClerk } };
    });
  }, [user]);

  return (
    <PortalLayout
      theme={theme}
      onToggleTheme={onToggleTheme}
      active={active}
      pendingBriefCount={pendingBriefCount}
      userLabel={
        user?.primaryEmailAddress?.emailAddress ??
        user?.username ??
        user?.firstName ??
        "Account"
      }
    >
      <Switch>
        <Route path="/portal/gigs">
          <Gigs theme={theme} data={data} setData={setData} />
        </Route>
        <Route path="/portal/availability">
          <Availability theme={theme} data={data} setData={setData} />
        </Route>
        <Route path="/portal/earnings">
          <Earnings theme={theme} data={data} />
        </Route>
        <Route path="/portal/profile">
          <Profile theme={theme} data={data} setData={setData} />
        </Route>
        <Route path="/portal/help">
          <Help theme={theme} />
        </Route>
        <Route path="/portal/brief/import">
          <BriefImport theme={theme} setData={setData} />
        </Route>
        <Route path="/portal/briefs">
          <Briefs theme={theme} data={data} />
        </Route>
        <Route path="/portal/briefs/:id">
          {(params) => (
            <BriefDetail
              theme={theme}
              briefId={params.id}
              data={data}
              setData={setData}
            />
          )}
        </Route>
        <Route>
          <Hub theme={theme} data={data} />
        </Route>
      </Switch>
    </PortalLayout>
  );
}

export const __portal_default_data = EMPTY_PORTAL_DATA;

/** Shape of a row returned by `GET /api/portal/briefs/mine`. The brief
 *  jsonb field is loosely typed because the producer is the source of
 *  truth for it — we only assert the fields the portal reads. */
type ServerBriefRow = {
  assignmentId: string;
  briefId: string;
  crewId: string | null;
  decision: BriefDecision;
  decidedAt: string | null;
  acceptedSnapshot: unknown;
  acceptedGigId: string | null;
  receivedAt: string;
  brief: unknown;
};

/** Convert a server row into the SharedBrief shape the portal already
 *  uses everywhere. We rewrite `briefId` and `recipientCrewId` on the
 *  inner brief so the rest of the portal (BriefDetail "my assignment"
 *  lookup, /respond POST, gigFromBrief) doesn't have to be aware that
 *  the brief came from the server vs. a legacy share-link. */
function serverRowToSharedBrief(row: ServerBriefRow): SharedBrief | null {
  if (!row || typeof row !== "object") return null;
  if (typeof row.briefId !== "string" || !row.briefId) return null;
  if (!row.brief || typeof row.brief !== "object") return null;
  const innerBrief = row.brief as Partial<ProjectBrief> & Record<string, unknown>;
  const recipientCrewId =
    typeof row.crewId === "string" && row.crewId
      ? row.crewId
      : ((innerBrief.recipientCrewId as string | null | undefined) ?? null);
  const merged: ProjectBrief = {
    ...(innerBrief as ProjectBrief),
    briefId: row.briefId,
    recipientCrewId,
  };
  const receivedAt = (() => {
    const t = Date.parse(row.receivedAt);
    return Number.isFinite(t) ? t : Date.now();
  })();
  return {
    briefId: row.briefId,
    receivedAt,
    decision: row.decision,
    acceptedGigId: row.acceptedGigId ?? undefined,
    acceptedSnapshot:
      row.acceptedSnapshot && typeof row.acceptedSnapshot === "object"
        ? (row.acceptedSnapshot as SharedBrief["acceptedSnapshot"])
        : undefined,
    brief: merged,
  };
}

/** Merge server-originated briefs into the local PortalData. Server
 *  rows win on conflict (the producer-side accept/decline polling
 *  uses the same database — the device that has the freshest state
 *  is the one with the most recent server fetch). Local-only briefs
 *  (legacy share-links) are preserved. The merged list is sorted by
 *  receivedAt desc so the Briefs screen ordering stays sensible. */
function mergeServerBriefs(
  prev: PortalData,
  server: SharedBrief[],
): PortalData {
  const byId = new Map<string, SharedBrief>();
  for (const b of prev.briefs) byId.set(b.briefId, b);
  for (const s of server) {
    const local = byId.get(s.briefId);
    if (!local) {
      byId.set(s.briefId, s);
    } else {
      // Preserve any local-only fields the server doesn't track yet
      // (none today, but defensive for forward compatibility).
      byId.set(s.briefId, { ...local, ...s });
    }
  }
  const merged = Array.from(byId.values()).sort(
    (a, b) => b.receivedAt - a.receivedAt,
  );
  return { ...prev, briefs: merged };
}
