import { useEffect, useMemo, useState } from "react";

/** Server response shape for `GET /api/portal/briefs/:id/catering`.
 *  Mirrors what `portalBriefs.ts` returns. Kept inline (not in
 *  `lib/`) so this view is self-contained — it's the only consumer. */
type CateringResponse = {
  ok?: boolean;
  brief?: {
    id: string;
    projectName: string;
    venue: string;
  };
  days?: Array<{
    date: string;
    total: number;
    byCategory: Record<DietaryTag, number>;
    allergenRoster: Array<{
      userId: string;
      name: string;
      role: string;
      allergens: string[];
    }>;
  }>;
  categories?: ReadonlyArray<DietaryTag>;
  missing?: {
    profileless: Array<{ name: string; userId: string }>;
  };
  error?: string;
};

/** Must match the canonical tag list in `dietaryTags.ts` server-side.
 *  TypeScript will catch any drift here against the response shape. */
type DietaryTag =
  | "vegetarian"
  | "vegan"
  | "halal"
  | "gluten-free"
  | "lactose-free";

const CATEGORY_LABEL: Record<DietaryTag, string> = {
  vegetarian: "Vegetarian",
  vegan: "Vegan",
  halal: "Halal",
  "gluten-free": "Gluten-free",
  "lactose-free": "Lactose-free",
};

/** UTC-stable date formatter. We get YYYY-MM-DD strings from the
 *  server and want to render them as e.g. "Mon 18 May" without
 *  shifting them into the browser's local timezone (which would
 *  display the wrong day for crew west of UTC). */
function fmtDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    timeZone: "UTC",
  });
}

type Props = {
  briefId: string;
  /** Async token resolver from Clerk's `useAuth`. Threaded in from
   *  App.tsx so this component stays decoupled from the auth lib. */
  getToken: () => Promise<string | null>;
};

/** Producer's per-brief catering aggregation view. Polls the server
 *  every 60 s while mounted so meal counts stay fresh as freelancers
 *  accept briefs or edit their assigned working days, without needing
 *  a manual refresh. The endpoint is owner-only — surfaces a clean
 *  error banner if the producer somehow lands here without owning the
 *  brief (shouldn't happen via the UI, but defensive). */
export function CateringView({ briefId, getToken }: Props) {
  const [data, setData] = useState<CateringResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!briefId) return;
    let cancelled = false;
    const baseUrl =
      (typeof import.meta !== "undefined" &&
        (import.meta as { env?: { BASE_URL?: string } }).env?.BASE_URL) ||
      "/";
    const fetchOnce = async () => {
      try {
        const token = await getToken();
        if (cancelled) return;
        const res = await fetch(
          `${baseUrl}api/portal/briefs/${briefId}/catering`,
          {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          },
        );
        if (cancelled) return;
        if (!res.ok) {
          const msg =
            res.status === 403
              ? "You don't own this brief."
              : res.status === 404
                ? "Brief not found."
                : "Could not load catering data.";
          setError(msg);
          setLoading(false);
          return;
        }
        const json = (await res.json()) as CateringResponse;
        if (cancelled) return;
        if (!json.ok) {
          setError(json.error ?? "Could not load catering data.");
          setLoading(false);
          return;
        }
        setData(json);
        setError(null);
        setLoading(false);
      } catch {
        if (cancelled) return;
        // Transient network error — keep showing the previous data
        // (if any) and let the next poll recover. Surface a quiet
        // banner so the producer knows the count might be stale.
        setError("Connection lost — showing last known counts.");
        setLoading(false);
      }
    };
    void fetchOnce();
    const t = window.setInterval(fetchOnce, 60_000);
    return () => {
      cancelled = true;
      window.clearInterval(t);
    };
  }, [briefId, getToken]);

  // Project-wide totals — sum across days, plus unique-people counts
  // so the producer can sanity-check their roster size separately.
  const summary = useMemo(() => {
    if (!data?.days) return null;
    const dayCount = data.days.length;
    let mealsServed = 0;
    const peoplePerCat: Record<DietaryTag, Set<string>> = {
      vegetarian: new Set(),
      vegan: new Set(),
      halal: new Set(),
      "gluten-free": new Set(),
      "lactose-free": new Set(),
    };
    for (const d of data.days) {
      mealsServed += d.total;
      // We don't have per-person tags on a day directly here, but
      // `byCategory` already counts them per day. For the project
      // total we sum over days — same number a chef would order.
    }
    // Per-category meal totals (sum of daily counts, NOT unique
    // headcount — a vegan present on 5 days is 5 vegan meals, which
    // is what the kitchen actually plates).
    const mealsByCat: Record<DietaryTag, number> = {
      vegetarian: 0,
      vegan: 0,
      halal: 0,
      "gluten-free": 0,
      "lactose-free": 0,
    };
    for (const d of data.days) {
      for (const k of Object.keys(d.byCategory) as DietaryTag[]) {
        mealsByCat[k] += d.byCategory[k] ?? 0;
      }
    }
    return { dayCount, mealsServed, mealsByCat, peoplePerCat };
  }, [data]);

  if (loading && !data) {
    return (
      <div className="led-report">
        <header className="led-report-header">
          <h2>Catering</h2>
        </header>
        <div className="led-empty">Loading…</div>
      </div>
    );
  }

  return (
    <div className="led-report">
      <header className="led-report-header">
        <div>
          <h2>Catering</h2>
          <p className="led-report-sub">
            Per day, per venue: total meals plus dietary-category counts
            and the full allergen roster with names. Updates live as
            crew accept briefs and edit their assigned working days.
          </p>
        </div>
        {summary && (
          <div className="led-report-meta">
            <span className="badge">
              <strong>{summary.dayCount}</strong> day
              {summary.dayCount === 1 ? "" : "s"}
            </span>
            <span className="badge">
              <strong>{summary.mealsServed}</strong> meals total
            </span>
          </div>
        )}
      </header>

      {error && (
        <div
          style={{
            margin: "0 0 12px 0",
            padding: "8px 12px",
            border: "1px solid #d97706",
            background: "#78350f22",
            color: "#fbbf24",
            borderRadius: 6,
            fontSize: 13,
          }}
        >
          {error}
        </div>
      )}

      {/* Project-wide category totals at a glance */}
      {summary && summary.dayCount > 0 && (
        <div className="led-dashboard">
          {(Object.keys(summary.mealsByCat) as DietaryTag[]).map((k) => (
            <div className="led-stat" key={k}>
              <div className="led-stat-label">{CATEGORY_LABEL[k]}</div>
              <div className="led-stat-value">{summary.mealsByCat[k]}</div>
              <div className="led-stat-sub">meals across run</div>
            </div>
          ))}
        </div>
      )}

      {/* Profileless nudge banner — chef can't know what these people
          eat until they fill in their portal profile. Producer sees
          who they are by name (or fallback) so they can chase. */}
      {data?.missing?.profileless && data.missing.profileless.length > 0 && (
        <section className="led-card" style={{ marginBottom: 16 }}>
          <div className="led-card-head">
            <h3>Missing dietary info</h3>
          </div>
          <p
            style={{
              fontSize: 13,
              color: "var(--muted, #94a3b8)",
              marginBottom: 8,
            }}
          >
            These crew members haven't filled in their portal profile
            yet, so they're counted in the meal total but not in any
            category breakdown. Send them a quick reminder.
          </p>
          <ul style={{ margin: 0, paddingLeft: 20 }}>
            {data.missing.profileless.map((p) => (
              <li key={p.userId} style={{ fontSize: 13 }}>
                {p.name}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Per-day cards — the bulk of the view. Empty state when the
          brief has no confirmed gigs with assigned working days yet. */}
      {!data?.days || data.days.length === 0 ? (
        <div className="led-empty">
          No confirmed crew with assigned working days yet — counts
          will appear here as freelancers accept the brief.
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gap: 12,
            gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
          }}
        >
          {data.days.map((day) => (
            <DayCard key={day.date} day={day} />
          ))}
        </div>
      )}
    </div>
  );
}

function DayCard({
  day,
}: {
  day: NonNullable<CateringResponse["days"]>[number];
}) {
  const tagsWithCounts = (Object.keys(day.byCategory) as DietaryTag[])
    .map((k) => ({ tag: k, count: day.byCategory[k] }))
    .filter((x) => x.count > 0);

  return (
    <section className="led-card">
      <div className="led-card-head">
        <h3 style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
          <span>{fmtDate(day.date)}</span>
          <span style={{ fontSize: 12, color: "var(--muted, #94a3b8)" }}>
            {day.date}
          </span>
        </h3>
        <span className="badge">
          <strong>{day.total}</strong> meal{day.total === 1 ? "" : "s"}
        </span>
      </div>

      {tagsWithCounts.length > 0 && (
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 6,
            marginBottom: 8,
          }}
        >
          {tagsWithCounts.map(({ tag, count }) => (
            <span
              key={tag}
              style={{
                fontSize: 12,
                padding: "3px 8px",
                borderRadius: 999,
                border: "1px solid var(--accent, #fbbf24)",
                color: "var(--accent, #fbbf24)",
                fontWeight: 600,
              }}
            >
              {CATEGORY_LABEL[tag]} · {count}
            </span>
          ))}
        </div>
      )}

      {day.allergenRoster.length === 0 ? (
        <p
          style={{
            fontSize: 12,
            color: "var(--muted, #94a3b8)",
            margin: "8px 0 0 0",
          }}
        >
          No allergens reported for this day's crew.
        </p>
      ) : (
        <div style={{ marginTop: 8 }}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: 0.4,
              color: "var(--muted, #94a3b8)",
              marginBottom: 4,
            }}
          >
            Allergens
          </div>
          <ul
            style={{
              listStyle: "none",
              margin: 0,
              padding: 0,
              display: "grid",
              gap: 4,
            }}
          >
            {day.allergenRoster.map((p) => (
              <li
                key={p.userId}
                style={{ fontSize: 13, lineHeight: 1.35 }}
              >
                <strong>{p.name}</strong>
                {p.role ? (
                  <span style={{ color: "var(--muted, #94a3b8)" }}>
                    {" "}
                    · {p.role}
                  </span>
                ) : null}
                <span style={{ color: "var(--muted, #94a3b8)" }}> — </span>
                <span>{p.allergens.join(", ")}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
