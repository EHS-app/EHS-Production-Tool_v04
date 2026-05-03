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
 *   3. "Send a brief to a batch of freelancers and watch them
 *      accept / decline." — multi-select tickboxes + a sticky "Send
 *      requests" button at the bottom of the panel. Each ticked
 *      freelancer is added to the producer's Crew Report with a
 *      Requested pill, and the brief flows into their portal under
 *      "Awaiting your decision".
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
 *    green = available, amber = pending brief, red = booked. Booked
 *    rows are visible but not selectable (the checkbox is disabled
 *    with a tooltip) so producers can see them without accidentally
 *    double-booking.
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
  /** Phone copied from the freelancer's profile so the producer can
   *  reach them as soon as the row lands in the call sheet. */
  phone?: string;
  /** Server-classified dietary tags (vegan / halal / etc). */
  dietaryTags?: string[];
  /** Server-split free-text allergens. */
  allergens?: string[];
  status: Status;
};

export type SendRequestsRow = {
  userId: string;
  fullName: string;
  primaryRole: string | null;
  phone?: string;
  dietaryTags?: string[];
  allergens?: string[];
};

type Props = {
  /** Project window. When both are blank the status column degrades
   *  gracefully — every freelancer reads "available" since there is
   *  nothing to compare against. */
  projectStartDate: string;
  projectEndDate: string;
  /** Send brief requests to a batch of freelancers. Implemented by the
   *  parent (App.tsx) so the sidebar stays unaware of the brief-build
   *  / POST plumbing. The parent is expected to add a Requested crew
   *  row for each freelancer, persist the brief, and surface any
   *  network failure back via `sendError` below. */
  onSendRequests: (rows: SendRequestsRow[]) => void | Promise<void>;
  /** Set of Clerk user ids that the producer has already requested for
   *  the current project. Drives the "Already requested" badge on the
   *  card (replaces the checkbox so the producer can't double-request
   *  the same person). */
  requestedUserIds: ReadonlySet<string>;
  /** True while the parent is waiting on the POST /api/portal/briefs
   *  round-trip. Disables the Send button and dims the bar so the
   *  producer can't fire a duplicate request. */
  sending?: boolean;
  /** Last error from a Send requests round-trip, surfaced in the
   *  sticky bottom bar. Cleared when the parent clears the prop. */
  sendError?: string | null;
  /** Compact mode — renders a tight "Available crew" list with just
   *  Name · Role and a quick "+ Add" link per row, no search / chip
   *  filters / status summary. Used inside the Crew & Logistics page
   *  where the producer wants a clean call-sheet feel and reaches for
   *  the full filter UI somewhere else. */
  compact?: boolean;
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
/** Abbreviate a freelancer's full name to "F. Last" for the compact
 *  list — matches the producer reference where the right rail keeps
 *  rows scannable at ~280px wide. Names with no surname fall through
 *  unchanged so we don't accidentally strip a single-token name down
 *  to an initial. */
function shortName(full: string | null | undefined): string {
  const raw = (full || "").trim();
  if (!raw) return "Unnamed";
  const parts = raw.split(/\s+/);
  if (parts.length < 2) return raw;
  const first = parts[0];
  const last = parts[parts.length - 1];
  return `${first.charAt(0).toUpperCase()}. ${last}`;
}

const STATUS_META: Record<Status, { label: string; dot: string; tone: string }> = {
  available: { label: "Available", dot: "#16a34a", tone: "ok" },
  pending: { label: "Pending Brief", dot: "#d97706", tone: "warn" },
  booked: { label: "Booked", dot: "#dc2626", tone: "bad" },
};

export function AvailableCrewSidebar({
  projectStartDate,
  projectEndDate,
  onSendRequests,
  requestedUserIds,
  sending = false,
  sendError = null,
  compact = false,
}: Props) {
  const { getToken, isSignedIn } = useAuth();

  // Filter state. `selectedSkills` is a Set of canonical skill labels
  // — one entry per active chip. We model it as a Set rather than three
  // per-group arrays so the request builder stays simple (one array of
  // `?skill=` params, AND-ed server-side).
  const [selectedSkills, setSelectedSkills] = useState<Set<string>>(
    new Set(),
  );
  const [query, setQuery] = useState("");
  const [rows, setRows] = useState<DirectoryRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Multi-select: the userIds the producer has currently ticked. A
  // booked freelancer can't be ticked (the checkbox is disabled), and
  // an already-requested freelancer doesn't show a checkbox at all
  // (replaced by the "Requested" mark) — so we don't have to worry
  // about validating the ticks at send time.
  const [picks, setPicks] = useState<Set<string>>(new Set());

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
    Array.from(selectedSkills).sort().join("\u0001"),
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
      for (const s of selectedSkills) params.append("skill", s);
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

  function toggleSkill(label: string) {
    setSelectedSkills((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  }

  function clearAll() {
    setSelectedSkills(new Set());
    setQuery("");
  }

  function togglePick(userId: string) {
    setPicks((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  }

  async function handleSend() {
    if (picks.size === 0 || sending) return;
    const selected = rows
      .filter((r) => picks.has(r.userId))
      .map((r) => ({
        userId: r.userId,
        fullName: r.fullName,
        primaryRole: r.primaryRole,
        phone: r.phone,
        dietaryTags: r.dietaryTags,
        allergens: r.allergens,
      }));
    if (selected.length === 0) return;
    // Optimistically clear the picks now — the parent owns the network
    // round-trip and will surface any error in `sendError`. If a send
    // fails the producer can re-tick and try again; we don't keep
    // stale checkmarks around on a failure because that would imply
    // the request "is still selected and ready to send" which
    // misrepresents the actual state.
    setPicks(new Set());
    await onSendRequests(selected);
  }

  // Bucket counts so the producer sees how the filter narrows the pool.
  const counts = useMemo(() => {
    const c = { available: 0, pending: 0, booked: 0 };
    for (const r of rows) c[r.status]++;
    return c;
  }, [rows]);

  if (!isSignedIn) {
    return (
      <aside className={`acs${compact ? " acs-compact" : ""}`}>
        <header className="acs-head">
          <h3>Available crew</h3>
        </header>
        <div className="acs-empty">
          Sign in to the Freelance Portal to see your roster.
        </div>
      </aside>
    );
  }

  if (compact) {
    // Compact mode shows ONLY the freelancers who are truly addable
    // right now: status === "available" (no booked/pending noise) AND
    // not already part of an outgoing request for this project. The
    // list is capped at five rows so the right rail stays scannable.
    // Producers reaching for the full filter UI are expected to open
    // the dedicated directory view.
    const available = rows
      .filter(
        (r) => r.status === "available" && !requestedUserIds.has(r.userId),
      )
      .slice(0, 5);
    return (
      <aside className="acs acs-compact">
        <header className="acs-compact-head">
          <h3>Available crew</h3>
          <span className="acs-compact-count">{available.length}</span>
        </header>
        {loading && rows.length === 0 ? (
          <div className="acs-compact-empty">Loading…</div>
        ) : error ? (
          <div className="acs-compact-empty">{error}</div>
        ) : available.length === 0 ? (
          <div className="acs-compact-empty">
            No free crew for this date.
          </div>
        ) : (
          <ul className="acs-compact-list">
            {available.map((r) => {
              const already = requestedUserIds.has(r.userId);
              const short = shortName(r.fullName);
              return (
                <li key={r.userId} className="acs-compact-row">
                  <div className="acs-compact-row-main">
                    <span className="acs-compact-name">{short}</span>
                    {r.primaryRole ? (
                      <span className="acs-compact-role">
                        {" "}
                        — {r.primaryRole}
                      </span>
                    ) : null}
                  </div>
                  {already ? (
                    <span className="acs-compact-tag">Requested</span>
                  ) : (
                    <button
                      type="button"
                      className="acs-compact-add"
                      disabled={sending}
                      onClick={() =>
                        void onSendRequests([
                          {
                            userId: r.userId,
                            fullName: r.fullName,
                            primaryRole: r.primaryRole,
                            phone: r.phone,
                            dietaryTags: r.dietaryTags,
                            allergens: r.allergens,
                          },
                        ])
                      }
                      title={`Send a brief request to ${r.fullName || "this freelancer"}`}
                    >
                      + Add
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
        {sendError ? (
          <div className="acs-compact-error">{sendError}</div>
        ) : null}
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
              const active = selectedSkills.has(s.label);
              return (
                <button
                  key={s.label}
                  type="button"
                  className={`acs-chip${active ? " is-on" : ""}`}
                  onClick={() => toggleSkill(s.label)}
                  title={s.label}
                >
                  {s.label}
                </button>
              );
            })}
          </div>
        </div>
      ))}

      {selectedSkills.size > 0 || query ? (
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
              isSelected={picks.has(r.userId)}
              isAlreadyRequested={requestedUserIds.has(r.userId)}
              onToggle={() => togglePick(r.userId)}
            />
          ))
        )}
      </div>

      {picks.size > 0 ? (
        <div className="acs-send-bar">
          <span className="acs-send-bar-count">
            {picks.size} selected
            {sendError ? (
              <span className="acs-send-bar-error">· {sendError}</span>
            ) : null}
          </span>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={handleSend}
            disabled={sending}
            title="Send a brief request to every selected freelancer"
          >
            {sending ? "Sending…" : `Send requests (${picks.size})`}
          </button>
        </div>
      ) : null}
    </aside>
  );
}

function FreelancerCard({
  row,
  isSelected,
  isAlreadyRequested,
  onToggle,
}: {
  row: DirectoryRow;
  isSelected: boolean;
  isAlreadyRequested: boolean;
  onToggle: () => void;
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
  const isBooked = row.status === "booked";
  // Disabled means "can't be ticked right now". Booked freelancers are
  // visible but not selectable (no double-bookings); already-requested
  // freelancers don't get a checkbox at all (no double-requests).
  const isDisabled = isBooked || isAlreadyRequested;

  // Click on the card body toggles the pick — easier on tablet than
  // pinpointing the 18px checkbox. We swallow the inner-input click so
  // the toggle doesn't fire twice.
  const handleCardClick = () => {
    if (isDisabled) return;
    onToggle();
  };

  return (
    <article
      className={[
        "acs-card",
        `acs-card-${meta.tone}`,
        isSelected ? "is-selected" : "",
        isAlreadyRequested ? "is-requested" : "",
        isBooked ? "is-disabled" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      onClick={handleCardClick}
      title={
        isAlreadyRequested
          ? "Already part of an outgoing request for this project."
          : isBooked
            ? "This freelancer is already booked on an overlapping gig — pick someone else or follow up off-platform."
            : isSelected
              ? "Click to deselect"
              : "Click to add to the next batch of requests"
      }
    >
      {isAlreadyRequested ? (
        <span className="acs-card-mark">Requested</span>
      ) : (
        <input
          type="checkbox"
          className="acs-card-check"
          checked={isSelected}
          disabled={isBooked}
          onClick={(e) => e.stopPropagation()}
          onChange={onToggle}
          aria-label={`Select ${row.fullName || "freelancer"}`}
        />
      )}
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
    </article>
  );
}
