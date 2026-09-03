import { useMemo } from "react";
import { Link } from "wouter";
import { PALETTE, type ThemeMode } from "../lib/portalTheme";
import type { PortalData, SharedBrief, BriefDecision } from "../lib/portalStorage";
import { formatCrewDayRate } from "../../lib/crew";
import { useI18n, useT } from "../../lib/i18n/I18nContext";
import type { TranslationKey } from "../../lib/i18n/types";

/** BCP-47 mapping for `Intl` formatting. Mirrors the helper in Hub.tsx —
 *  kept inline rather than shared because the portal screens otherwise
 *  have no shared util module and a one-line helper is cheaper to
 *  duplicate than to factor out. */
function intlLocale(locale: string): string {
  return locale === "no" ? "nb-NO" : "en-GB";
}

function formatDate(iso: string, locale: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(intlLocale(locale), {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "2-digit",
  });
}

function formatRelative(
  ts: number,
  t: (key: TranslationKey, vars?: Record<string, string | number>) => string,
  locale: string,
): string {
  const diff = Date.now() - ts;
  const min = Math.round(diff / 60_000);
  if (min < 1) return t("portal.briefs.relative.justNow");
  if (min < 60) return t("portal.briefs.relative.minutesAgo", { n: min });
  const hr = Math.round(min / 60);
  if (hr < 24) return t("portal.briefs.relative.hoursAgo", { n: hr });
  const day = Math.round(hr / 24);
  if (day < 7) return t("portal.briefs.relative.daysAgo", { n: day });
  return new Date(ts).toLocaleDateString(intlLocale(locale), {
    day: "2-digit",
    month: "short",
  });
}

const DECISION_KEY: Record<BriefDecision, TranslationKey> = {
  pending: "portal.briefs.decision.new",
  accepted: "portal.briefs.decision.accepted",
  declined: "portal.briefs.decision.declined",
  too_late: "portal.briefs.decision.filled",
};

function decisionPillColors(d: BriefDecision): { bg: string; fg: string } {
  switch (d) {
    case "pending":
      return { bg: "rgba(248,128,0,0.18)", fg: "#f88000" };
    case "accepted":
      return { bg: "rgba(22,163,74,0.18)", fg: "#16a34a" };
    case "declined":
      return { bg: "rgba(100,116,139,0.18)", fg: "#475569" };
    case "too_late":
      // Slot was filled by a sibling candidate before this freelancer
      // could accept. Same red palette as a hard error so the briefs
      // list immediately reads "this one's gone".
      return { bg: "rgba(220,38,38,0.14)", fg: "#b91c1c" };
  }
}

export function Briefs({
  theme,
  data,
}: {
  theme: ThemeMode;
  data: PortalData;
}) {
  const c = PALETTE[theme];
  const t = useT();
  const { locale } = useI18n();

  const sorted = useMemo(
    () => [...data.briefs].sort((a, b) => b.receivedAt - a.receivedAt),
    [data.briefs],
  );
  const pending = sorted.filter((b) => b.decision === "pending");
  const others = sorted.filter((b) => b.decision !== "pending");

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>
            {t("portal.briefs.title")}
          </h1>
          <div style={{ fontSize: 13, color: c.muted, marginTop: 2 }}>
            {t("portal.briefs.subtitle")}
          </div>
        </div>
        {pending.length > 0 ? (
          <span
            style={{
              fontSize: 12,
              fontWeight: 700,
              padding: "6px 10px",
              borderRadius: 999,
              background: "rgba(248,128,0,0.15)",
              color: c.accent,
            }}
          >
            {t("portal.briefs.newBadge", { count: pending.length })}
          </span>
        ) : null}
      </header>

      {sorted.length === 0 ? (
        <EmptyState theme={theme} />
      ) : (
        <>
          {pending.length > 0 ? (
            <Section theme={theme} title={t("portal.briefs.section.awaiting")}>
              {pending.map((b) => (
                <BriefRow
                  key={b.briefId}
                  theme={theme}
                  brief={b}
                  locale={locale}
                />
              ))}
            </Section>
          ) : null}
          {others.length > 0 ? (
            <Section theme={theme} title={t("portal.briefs.section.history")}>
              {others.map((b) => (
                <BriefRow
                  key={b.briefId}
                  theme={theme}
                  brief={b}
                  locale={locale}
                />
              ))}
            </Section>
          ) : null}
        </>
      )}
    </div>
  );
}

function EmptyState({ theme }: { theme: ThemeMode }) {
  const c = PALETTE[theme];
  const t = useT();
  return (
    <section
      style={{
        background: c.cardBg,
        border: `1px solid ${c.border}`,
        borderRadius: 14,
        padding: 24,
        boxShadow: c.shadowSoft,
        textAlign: "center",
      }}
    >
      <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 6 }}>
        {t("portal.briefs.empty.title")}
      </div>
      <div style={{ fontSize: 14, color: c.muted, lineHeight: 1.5 }}>
        {t("portal.briefs.empty.body")}
      </div>
    </section>
  );
}

function Section({
  theme,
  title,
  children,
}: {
  theme: ThemeMode;
  title: string;
  children: React.ReactNode;
}) {
  const c = PALETTE[theme];
  return (
    <section>
      <h2
        style={{
          margin: "0 0 8px",
          fontSize: 12,
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: 0.6,
          color: c.muted,
        }}
      >
        {title}
      </h2>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {children}
      </div>
    </section>
  );
}

function BriefRow({
  theme,
  brief,
  locale,
}: {
  theme: ThemeMode;
  brief: SharedBrief;
  locale: string;
}) {
  const c = PALETTE[theme];
  const t = useT();
  const colors = decisionPillColors(brief.decision);
  const pillLabel = t(DECISION_KEY[brief.decision]);
  const myAssignment = brief.brief.assignments.find(
    (a) => a.crewId === brief.brief.recipientCrewId,
  );
  return (
    <Link
      href={`/portal/briefs/${brief.briefId}`}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        padding: "12px 14px",
        background: c.cardBg,
        border: `1px solid ${c.border}`,
        borderRadius: 12,
        textDecoration: "none",
        color: c.text,
        boxShadow: c.shadowSoft,
      }}
    >
      <div style={{ minWidth: 0 }}>
        <div
          style={{
            fontSize: 15,
            fontWeight: 800,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {brief.brief.project.projectName ||
            brief.brief.project.venue ||
            t("portal.briefs.untitledShow")}
        </div>
        <div
          style={{
            fontSize: 12,
            color: c.muted,
            marginTop: 2,
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
          }}
        >
          {brief.brief.project.client ? (
            <>
              <span style={{ color: c.text, fontWeight: 700 }}>
                {brief.brief.project.client}
              </span>
              <span aria-hidden>·</span>
            </>
          ) : null}
          <span>
            {brief.brief.project.endDate &&
            brief.brief.project.endDate !== brief.brief.project.date
              ? `${formatDate(brief.brief.project.date, locale)} → ${formatDate(brief.brief.project.endDate, locale)}`
              : formatDate(brief.brief.project.date, locale)}
          </span>
          {myAssignment ? (
            <>
              <span aria-hidden>·</span>
              <span style={{ color: c.text, fontWeight: 600 }}>
                {myAssignment.role}
              </span>
              {myAssignment.callTime ? (
                <>
                  <span aria-hidden>·</span>
                  <span>
                    {t("portal.briefs.callPrefix", {
                      time: myAssignment.callTime,
                    })}
                  </span>
                </>
              ) : null}
              {myAssignment.dayRate > 0 ? (
                <>
                  <span aria-hidden>·</span>
                  <span style={{ color: c.text, fontWeight: 600 }}>
                    {formatCrewDayRate(myAssignment.dayRate)}
                  </span>
                </>
              ) : null}
            </>
          ) : (
            <>
              <span aria-hidden>·</span>
              <span>{t("portal.briefs.genericBriefing")}</span>
            </>
          )}
          <span aria-hidden>·</span>
          <span>{formatRelative(brief.receivedAt, t, locale)}</span>
        </div>
      </div>
      <span
        style={{
          fontSize: 11,
          fontWeight: 700,
          padding: "4px 10px",
          borderRadius: 999,
          background: colors.bg,
          color: colors.fg,
          flexShrink: 0,
        }}
      >
        {pillLabel}
      </span>
    </Link>
  );
}
