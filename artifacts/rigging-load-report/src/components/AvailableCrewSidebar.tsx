/** AvailableCrewSidebar — the "who can I book?" panel that lives next
 *  to the Crew Report table in the Production Tool.
 *
 *  Why it exists
 *  -------------
 *  When the producer is putting a call sheet together they need to
 *  answer three questions, all at once, without leaving the Crew tab:
 *
 *   1. "Who in our roster does Lyd FOH on a DiGiCo SD with a forklift
 *      cert?" — multi-layered AND filter across the four skill groups.
 *   2. "Who is actually free on the show day?" — date-aware status
 *      pulled from gigs (Booked) and brief assignments (Pending Brief).
 *   3. "Add this person to my call sheet right now." — single click
 *      hands name + best-guess department to the parent CrewReportView.
 *
 *  Implementation notes
 *  --------------------
 *  - We hit `GET /api/portal/freelancers` directly with `useEffect` +
 *    `fetch` — no react-query in this artifact yet. A debounced
 *    request fires on every filter change so results feel real-time
 *    without hammering the server while the producer is mid-toggle.
 *  - The chip lists come from `@workspace/skills` (canonical labels
 *    only — no free text), grouped Work Type / Console / Cert. Console
 *    is flattened across its sound/lighting/AV subgroups for now to
 *    keep the chip strip readable; subgroup filters can come later.
 *  - "Status" is computed server-side (privacy-safe — no project
 *    names leak across producers) and surfaced as a coloured dot:
 *    green = available, amber = pending brief, red = booked.
 *  - Phone number is intentionally NOT shown in the directory list;
 *    contact info travels through the brief / gig flow once the
 *    freelancer accepts. */

import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@clerk/react";
import {
  SKILL_LIBRARY,
  type SkillSuggestion,
} from "@workspace/skills";

type Status = "available" | "pending" | "booked";

type DirectoryRow = {
  userId: string;
  fullName: string;
  primaryRole: string | null;
  city: string | null;
  skills: string[];
  languages: string[];
  status: Status;
};

type Props = {
  /** Project window. When both are blank the status column degrades
   *  gracefully — every freelancer reads "available" since there is
   *  nothing to compare against. */
  projectStartDate: string;
  projectEndDate: string;
  /** Pre-fill a fresh crew row with name + best-guess department.
   *  Returning the producer back to the table is the parent's job. */
  onAddToCrew: (input: { name: string; primaryRole: string | null }) => void;
};

/** Build the chip groups once at module load. The library is static so
 *  there is no point re-deriving on every render. We flatten the
 *  Console & Software subgroups (Sound / Lighting / AV) into a single
 *  scrollable strip — the producer can usually find what they want
 *  without an extra dropdown level. */
const CHIP_GROUPS: Array<{ label: string; items: SkillSuggestion[] }> = (() => {
  const work: SkillSuggestion[] = [];
  const consoles: SkillSuggestion[] = [];
  const cert: SkillSuggestion[] = [];
  for (const s of SKILL_LIBRARY) {
    if (s.group === "Work Type") work.push(s);
    else if (s.group === "Console & Software") consoles.push(s);
    else if (s.group === "Certification") cert.push(s);
  }
  return [
    { label: "Work Type", items: work },
    { label: "Console & Software", items: consoles },
    { label: "Certification", items: cert },
  ];
})();

/** Status presentation. Keeping it colocated with the component (and
 *  not in CSS-modules) since these labels and colours are intrinsic
 *  to the sidebar's contract with the producer. */
const STATUS_META: Record<Status, { label: string; dot: string; tone: string }> = {
  available: { label: "Available", dot: "#16a34a", tone: "ok" },
  pending: { label: "Pending Brief", dot: "#d97706", tone: "warn" },
  booked: { label: "Booked", dot: "#dc2626", tone: "bad" },
};

export function AvailableCrewSidebar({
  projectStartDate,
  projectEndDate,
  onAddToCrew,
}: Props) {
  const { getToken, isSignedIn } = useAuth();

  // Filter state. `selected` is a Set of canonical skill labels — one
  // entry per active chip. We model it as a Set rather than three
  // per-group arrays so the request builder stays simple (one array of
  // `?skill=` params, AND-ed server-side).
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState("");
  const [rows, setRows] = useState<DirectoryRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Re-fetch on filter / date / search change, debounced so a quick
  // chip-toggle storm collapses to a single round-trip. The cleanup
  // both clears the timer AND aborts any in-flight request — we never
  // want a stale response to overwrite a fresher one.
  useEffect(() => {
    if (!isSignedIn) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      void load(controller.signal);
    }, 220);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    isSignedIn,
    query,
    projectStartDate,
    projectEndDate,
    // Sets are reference-stable across renders even when contents
    // change, so we serialise the selection to drive the effect.
    Array.from(selected).sort().join("\u0001"),
  ]);

  // Track the latest request so an aborted-but-already-resolved
  // response can't flash old data into the panel.
  const reqIdRef = useRef(0);

  async function load(signal: AbortSignal) {
    const myReq = ++reqIdRef.current;
    setLoading(true);
    setError(null);
    try {
      const token = await getToken();
      if (signal.aborted) return;
      const baseUrl =
        (typeof import.meta !== "undefined" &&
          (import.meta as { env?: { BASE_URL?: string } }).env?.BASE_URL) ||
        "/";
      const params = new URLSearchParams();
      if (query.trim()) params.set("q", query.trim());
      if (projectStartDate) params.set("startDate", projectStartDate);
      if (projectEndDate) params.set("endDate", projectEndDate);
      for (const s of selected) params.append("skill", s);
      const res = await fetch(
        `${baseUrl}api/portal/freelancers?${params.toString()}`,
        {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          signal,
        },
      );
      if (signal.aborted || myReq !== reqIdRef.current) return;
      if (!res.ok) {
        throw new Error(`Server returned ${res.status}`);
      }
      const body = (await res.json()) as {
        ok?: boolean;
        freelancers?: DirectoryRow[];
        error?: string;
      };
      if (signal.aborted || myReq !== reqIdRef.current) return;
      if (!body.ok || !Array.isArray(body.freelancers)) {
        throw new Error(body.error || "Bad response from server");
      }
      setRows(body.freelancers);
    } catch (e) {
      if (signal.aborted) return;
      if (myReq !== reqIdRef.current) return;
      // Silence the AbortError that comes from the strict-mode double
      // mount — it's not a real failure.
      if (e instanceof DOMException && e.name === "AbortError") return;
      setError(e instanceof Error ? e.message : "Could not load roster.");
      setRows([]);
    } finally {
      if (myReq === reqIdRef.current) setLoading(false);
    }
  }

  function toggle(label: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  }

  function clearAll() {
    setSelected(new Set());
    setQuery("");
  }

  // Bucket counts so the producer sees how the filter narrows the pool.
  const counts = useMemo(() => {
    const c = { available: 0, pending: 0, booked: 0 };
    for (const r of rows) c[r.status]++;
    return c;
  }, [rows]);

  if (!isSignedIn) {
    return (
      <aside className="acs">
        <header className="acs-head">
          <h3>Available Crew</h3>
        </header>
        <div className="acs-empty">
          Sign in to the Freelance Portal to see your roster.
        </div>
      </aside>
    );
  }

  return (
    <aside className="acs">
      <header className="acs-head">
        <h3>Available Crew</h3>
        <p className="acs-sub">
          {projectStartDate ? (
            <>
              Status for{" "}
              <strong>
                {projectStartDate}
                {projectEndDate && projectEndDate !== projectStartDate
                  ? ` → ${projectEndDate}`
                  : ""}
              </strong>
            </>
          ) : (
            <>Set the report date to see who's free that day.</>
          )}
        </p>
      </header>

      <div className="acs-search">
        <input
          className="led-input"
          type="search"
          value={query}
          placeholder="Search name or city…"
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {CHIP_GROUPS.map((group) => (
        <div key={group.label} className="acs-group">
          <div className="acs-group-label">{group.label}</div>
          <div className="acs-chips">
            {group.items.map((s) => {
              const active = selected.has(s.label);
              return (
                <button
                  key={s.label}
                  type="button"
                  className={`acs-chip${active ? " is-on" : ""}`}
                  onClick={() => toggle(s.label)}
                  title={s.label}
                >
                  {s.label}
                </button>
              );
            })}
          </div>
        </div>
      ))}

      {selected.size > 0 || query ? (
        <button
          type="button"
          className="btn btn-soft btn-sm acs-clear"
          onClick={clearAll}
        >
          Clear filters
        </button>
      ) : null}

      <div className="acs-summary">
        <span className="acs-tag acs-tag-ok">
          <strong>{counts.available}</strong> available
        </span>
        <span className="acs-tag acs-tag-warn">
          <strong>{counts.pending}</strong> pending
        </span>
        <span className="acs-tag acs-tag-bad">
          <strong>{counts.booked}</strong> booked
        </span>
      </div>

      <div className="acs-results">
        {loading && rows.length === 0 ? (
          <div className="acs-empty">Loading…</div>
        ) : error ? (
          <div className="acs-error">{error}</div>
        ) : rows.length === 0 ? (
          <div className="acs-empty">
            No matches. Try removing a filter or check that freelancers
            have completed their portal profile.
          </div>
        ) : (
          rows.map((r) => (
            <FreelancerCard
              key={r.userId}
              row={r}
              onAdd={() =>
                onAddToCrew({
                  name: r.fullName,
                  primaryRole: r.primaryRole,
                })
              }
            />
          ))
        )}
      </div>
    </aside>
  );
}

function FreelancerCard({
  row,
  onAdd,
}: {
  row: DirectoryRow;
  onAdd: () => void;
}) {
  // Pull up to three certifications (in the order the freelancer
  // entered them) so the producer can scan rigging-relevant tickets at
  // a glance: "Forklift G4 (NO)", "IPAF 3a/3b", etc.
  const certs = useMemo(() => {
    const certSet = new Set(
      SKILL_LIBRARY.filter((s) => s.group === "Certification").map(
        (s) => s.label,
      ),
    );
    return row.skills.filter((s) => certSet.has(s)).slice(0, 3);
  }, [row.skills]);
  const meta = STATUS_META[row.status];
  // We deliberately do NOT hard-disable the "booked" state. Producers
  // need an override path for legitimate scenarios (hold options,
  // last-minute swaps, deliberate double-bookings the producer is
  // already negotiating off-platform). Instead we surface a confirm
  // prompt so the click is intentional.
  const handleAdd = () => {
    if (row.status === "booked") {
      const ok = window.confirm(
        `${row.fullName || "This freelancer"} appears to be booked on another gig that overlaps your project window. Add to the call sheet anyway?`,
      );
      if (!ok) return;
    }
    onAdd();
  };
  return (
    <article className={`acs-card acs-card-${meta.tone}`}>
      <div className="acs-card-head">
        <div className="acs-card-name">{row.fullName || "Unnamed"}</div>
        <span
          className={`acs-status acs-status-${meta.tone}`}
          title={meta.label}
        >
          <span
            className="acs-status-dot"
            style={{ background: meta.dot }}
            aria-hidden
          />
          {meta.label}
        </span>
      </div>
      <div className="acs-card-meta">
        {row.primaryRole ? <span>{row.primaryRole}</span> : null}
        {row.city ? <span>· {row.city}</span> : null}
      </div>
      {certs.length > 0 ? (
        <div className="acs-card-certs">
          {certs.map((c) => (
            <span key={c} className="acs-cert">
              {c}
            </span>
          ))}
        </div>
      ) : null}
      <div className="acs-card-actions">
        <button
          type="button"
          className="btn btn-primary btn-sm"
          onClick={handleAdd}
          title={
            row.status === "booked"
              ? "Already booked — click to override and add anyway."
              : "Add to crew call sheet"
          }
        >
          + Add to crew
        </button>
      </div>
    </article>
  );
}
