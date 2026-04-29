import { useEffect, useMemo, useRef, useState } from "react";
import { Route, Switch, useLocation } from "wouter";
import { useUser } from "@clerk/react";
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
  EMPTY_PORTAL_DATA,
} from "./lib/portalStorage";
import type { ThemeMode } from "./lib/portalTheme";

export type PortalProps = {
  theme: ThemeMode;
  onToggleTheme: () => void;
};

export function Portal({ theme, onToggleTheme }: PortalProps) {
  const { user } = useUser();
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
