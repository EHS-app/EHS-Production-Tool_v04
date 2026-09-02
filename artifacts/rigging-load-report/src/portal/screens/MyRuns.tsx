import { useEffect, useState } from "react";
import { useAuth } from "@clerk/react";
import { MapPin, Truck } from "lucide-react";
import { PALETTE, type ThemeMode } from "../lib/portalTheme";

type Run = {
  id: string;
  projectName: string;
  title: string;
  origin: string;
  destination: string;
  departureAt: string;
  loadInAt: string | null;
  loadOutAt: string | null;
  status: string;
  cargoNotes: string;
  vehicleName: string;
  vehicleLicensePlate: string;
};

const BASE_URL =
  (typeof import.meta !== "undefined" &&
    (import.meta as { env?: { BASE_URL?: string } }).env?.BASE_URL) ||
  "/";

function formatDate(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleString(undefined, {
    weekday: "short",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function MyRuns({ theme }: { theme: ThemeMode }) {
  const c = PALETTE[theme];
  const { getToken } = useAuth();
  const [runs, setRuns] = useState<Run[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const token = await getToken();
        const response = await fetch(`${BASE_URL}api/portal/my-runs`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const body = (await response.json()) as { ok?: boolean; runs?: Run[]; error?: string };
        if (!response.ok || !body.ok || !Array.isArray(body.runs)) {
          throw new Error(body.error || "Could not load your transport runs.");
        }
        if (!cancelled) setRuns(body.runs);
      } catch (reason) {
        if (!cancelled) {
          setError(reason instanceof Error ? reason.message : "Could not load your transport runs.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [getToken]);

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <header>
        <h1 style={{ margin: 0, fontSize: 26 }}>My Runs</h1>
        <p style={{ color: c.muted, margin: "6px 0 0" }}>Transport runs assigned to you</p>
      </header>
      {loading ? <p style={{ color: c.muted }}>Loading transport runs…</p> : null}
      {error ? <p role="alert" style={{ color: "#ef4444" }}>{error}</p> : null}
      {!loading && !error && runs.length === 0 ? (
        <div style={{ padding: 24, border: `1px solid ${c.border}`, borderRadius: 14, color: c.muted }}>
          No transport runs are assigned to you.
        </div>
      ) : null}
      {runs.map((run) => (
        <article
          key={run.id}
          style={{ padding: 18, border: `1px solid ${c.border}`, borderRadius: 14, background: c.cardBg, boxShadow: c.shadowSoft }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <div>
              <div style={{ color: c.muted, fontSize: 12, fontWeight: 700 }}>{run.projectName}</div>
              <h2 style={{ margin: "4px 0", fontSize: 18 }}>{run.title}</h2>
              <div style={{ color: c.muted, fontSize: 13 }}>{formatDate(run.departureAt)}</div>
            </div>
            <span style={{ alignSelf: "flex-start", borderRadius: 999, padding: "5px 10px", background: c.cardBgSubtle, fontSize: 12, fontWeight: 700 }}>
              {run.status.replaceAll("_", " ")}
            </span>
          </div>
          <div style={{ display: "grid", gap: 8, marginTop: 14, fontSize: 14 }}>
            <div><MapPin size={15} style={{ display: "inline", marginRight: 7 }} />{run.origin || "Origin TBC"} → {run.destination || "Destination TBC"}</div>
            <div><Truck size={15} style={{ display: "inline", marginRight: 7 }} />{run.vehicleName} · {run.vehicleLicensePlate}</div>
            <div style={{ color: c.muted }}>Load in: {formatDate(run.loadInAt)} · Load out: {formatDate(run.loadOutAt)}</div>
            {run.cargoNotes ? <div style={{ color: c.muted, whiteSpace: "pre-wrap" }}>{run.cargoNotes}</div> : null}
          </div>
        </article>
      ))}
    </div>
  );
}