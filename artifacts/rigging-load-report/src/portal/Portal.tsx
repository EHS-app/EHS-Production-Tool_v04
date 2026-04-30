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
  type Gig,
  type GigStatus,
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

  // Pull server-side gigs (created when the freelancer accepts a brief
  // and any future server-authored bookings) into the local store.
  // Server gigs are merged additively so a fresh device picks up the
  // freelancer's bookings, but local edits in flight (status changes,
  // show-day check-in timestamps) are preserved by keeping the local
  // copy whenever a row already exists under the same id. Same 60-second
  // poll cadence as briefs.
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
        const res = await fetch(`${baseUrl}api/portal/gigs`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (cancelled || !res.ok) return;
        const json = (await res.json()) as {
          ok?: boolean;
          gigs?: ServerGigRow[];
        };
        if (cancelled || !json.ok || !Array.isArray(json.gigs)) return;
        const serverGigs = json.gigs
          .filter((g) => g.freelancerUserId === userId)
          .map(serverRowToGig)
          .filter((g): g is Gig => g !== null);
        setData((prev) => mergeServerGigs(prev, serverGigs, prev.briefs));
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

/** How long after a local accept/decline the portal protects the
 *  freelancer's choice from being overwritten by the server snapshot.
 *  Sized comfortably wider than the 15-second sync window plus one
 *  60-second poll cycle, so a slow ack or a transient 5xx never
 *  visibly downgrades a fresh decision back to "pending" while the
 *  retry loop is still in flight. */
const FRESH_DECISION_WINDOW_MS = 60_000;

/** Merge server-originated briefs into the local PortalData. Server
 *  rows win on conflict — *except* for the freelancer's own decision
 *  fields when the local copy was set within the freshness window
 *  (see `FRESH_DECISION_WINDOW_MS`). That carve-out lets a freelancer
 *  hit Accept and trust the UI to stay on Accepted even if the
 *  /respond POST is still in flight (or briefly failed and is being
 *  retried). Once the window expires the server is the source of
 *  truth again — so a stale "accepted" that never actually synced
 *  will eventually revert back to "pending" rather than getting
 *  silently stuck. Local-only briefs (legacy share-links) are
 *  preserved untouched. The merged list is sorted by receivedAt desc
 *  so the Briefs screen ordering stays sensible. */
/** Shape of a row returned by `GET /api/portal/gigs`. The endpoint
 *  returns gigs the caller can see in either role (their own gigs or
 *  gigs from briefs they own). The portal only consumes its own. */
type ServerGigRow = {
  id: string;
  freelancerUserId: string;
  briefId: string | null;
  projectName: string;
  client: string;
  venue: string;
  role: string;
  startDate: string | null;
  endDate: string | null;
  hours: string | number;
  rate: string | number;
  flatFee: string | number;
  notes: string;
  status: string;
  checkIn: { onTheWayAt?: number; arrivedAt?: number } | null;
  createdAt: string;
};

const VALID_GIG_STATUSES: ReadonlySet<string> = new Set([
  "invited",
  "confirmed",
  "done",
  "invoiced",
  "paid",
]);

/** Convert a server gig row into the local Gig shape. Coerces the
 *  numeric() string columns into numbers, normalises the status, and
 *  parses the ISO timestamp into the epoch-ms `createdAt` the local
 *  store uses. Returns null for rows that fail validation so a single
 *  bad row never poisons the merge. */
function serverRowToGig(row: ServerGigRow): Gig | null {
  if (!row || typeof row !== "object") return null;
  if (typeof row.id !== "string" || !row.id) return null;
  const toNum = (v: unknown): number => {
    const n = typeof v === "number" ? v : Number(v);
    return Number.isFinite(n) ? n : 0;
  };
  const status: GigStatus = VALID_GIG_STATUSES.has(row.status)
    ? (row.status as GigStatus)
    : "confirmed";
  const createdAt = (() => {
    const t = Date.parse(row.createdAt ?? "");
    return Number.isFinite(t) ? t : Date.now();
  })();
  const checkIn =
    row.checkIn &&
    typeof row.checkIn === "object" &&
    (typeof row.checkIn.onTheWayAt === "number" ||
      typeof row.checkIn.arrivedAt === "number")
      ? row.checkIn
      : undefined;
  return {
    id: row.id,
    projectName: row.projectName ?? "",
    client: row.client ?? "",
    venue: row.venue ?? "",
    role: row.role ?? "",
    startDate: row.startDate ?? "",
    endDate: row.endDate ?? row.startDate ?? "",
    hours: toNum(row.hours),
    rate: toNum(row.rate),
    flatFee: toNum(row.flatFee),
    notes: row.notes ?? "",
    status,
    createdAt,
    briefId: row.briefId ?? undefined,
    checkIn,
  };
}

/** Merge server-originated gigs into the local PortalData. Three cases:
 *
 *  1. **Server gig that already exists locally** — the local copy wins
 *     on every field. The freelancer may be mid-edit (status change,
 *     show-day check-in, hours/rate tweak) and the local Gigs screen
 *     doesn't yet push those edits to the server, so a server poll
 *     must never overwrite them.
 *  2. **Server-only gig** — added in place (a fresh device, or another
 *     device created the gig since this one last polled).
 *  3. **Brief-linked local gig that's missing from the server** — this
 *     means the server has authoritatively *removed* the booking
 *     (winner reversed their accept; producer cancelled the brief).
 *     We drop it locally too, otherwise stale "confirmed" gigs would
 *     linger forever in the freelancer's calendar / Gigs screen.
 *
 *     The exception: if the owning brief was decided locally within
 *     the freshness window, the corresponding /respond POST may still
 *     be in flight — removing the gig under us would cause it to
 *     vanish-then-reappear once the server catches up. So we keep
 *     brief-linked local gigs whose SharedBrief carries a fresh
 *     `decidedLocallyAt`.
 *
 *     Local-only gigs (no `briefId` — manual logbook entries) are
 *     never removed by this merge regardless. */
function mergeServerGigs(
  prev: PortalData,
  server: Gig[],
  briefs: SharedBrief[] | undefined,
): PortalData {
  const now = Date.now();
  const serverIds = new Set<string>();
  for (const s of server) serverIds.add(s.id);
  const freshBriefIds = new Set<string>();
  // Older persisted PortalData payloads (pre-Slice-2) may have no
  // `briefs` array at all — this hook still has to be safe to call
  // before the migration runs, otherwise the freelancer sees a blank
  // crash on first load.
  const briefsList = Array.isArray(briefs) ? briefs : [];
  for (const b of briefsList) {
    if (
      typeof b.decidedLocallyAt === "number" &&
      now - b.decidedLocallyAt < FRESH_DECISION_WINDOW_MS
    ) {
      freshBriefIds.add(b.briefId);
    }
  }
  const kept: Gig[] = [];
  let changed = false;
  for (const g of prev.gigs) {
    // Local-only gigs (no brief link): keep unconditionally.
    if (!g.briefId) {
      kept.push(g);
      continue;
    }
    // Server still has it: keep our local copy (preserves in-flight edits).
    if (serverIds.has(g.id)) {
      kept.push(g);
      continue;
    }
    // Server doesn't have it. If the owning brief was decided locally
    // within the freshness window, our /respond POST is probably still
    // landing — keep the gig until the next poll proves otherwise.
    if (freshBriefIds.has(g.briefId)) {
      kept.push(g);
      continue;
    }
    // Otherwise: server is authoritative. Drop the orphan.
    changed = true;
  }
  // Add any server-only gigs.
  const localIds = new Set<string>();
  for (const g of kept) localIds.add(g.id);
  for (const s of server) {
    if (localIds.has(s.id)) continue;
    kept.push(s);
    changed = true;
  }
  if (!changed) return prev;
  kept.sort((a, b) => b.createdAt - a.createdAt);
  return { ...prev, gigs: kept };
}

function mergeServerBriefs(
  prev: PortalData,
  server: SharedBrief[],
): PortalData {
  const now = Date.now();
  const byId = new Map<string, SharedBrief>();
  for (const b of prev.briefs) byId.set(b.briefId, b);
  for (const s of server) {
    const local = byId.get(s.briefId);
    if (!local) {
      byId.set(s.briefId, s);
      continue;
    }
    // Default: server wins on every field, but `decidedLocallyAt`
    // (a transient client-only marker the server doesn't know about)
    // is preserved.
    let merged: SharedBrief = {
      ...local,
      ...s,
      decidedLocallyAt: local.decidedLocallyAt,
    };
    const fresh =
      typeof local.decidedLocallyAt === "number" &&
      now - local.decidedLocallyAt < FRESH_DECISION_WINDOW_MS;
    if (fresh && local.decision !== s.decision) {
      // Within the freshness window the local decision wins. We also
      // keep the locally-staged acceptedGigId / acceptedSnapshot so
      // the BriefDetail buttons don't flicker back to "pending" while
      // the /respond POST is in flight or being retried.
      merged = {
        ...merged,
        decision: local.decision,
        acceptedGigId: local.acceptedGigId,
        acceptedSnapshot: local.acceptedSnapshot,
      };
    }
    byId.set(s.briefId, merged);
  }
  const merged = Array.from(byId.values()).sort(
    (a, b) => b.receivedAt - a.receivedAt,
  );
  return { ...prev, briefs: merged };
}
