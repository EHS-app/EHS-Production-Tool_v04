import { type ReactNode, useMemo } from "react";
import { Link } from "wouter";
import { PALETTE, type ThemeMode } from "../lib/portalTheme";
import { useT } from "../../lib/i18n/I18nContext";
import type { TranslationKey } from "../../lib/i18n/types";

type HelpSection = {
  id: "hub" | "briefs" | "gigs" | "availability" | "earnings" | "profile";
  icon: string;
  shortKey: TranslationKey;
  titleKey: TranslationKey;
  introKey: TranslationKey;
  stepKeys: TranslationKey[];
  tipKey?: TranslationKey;
};

type QuickAction = {
  id: string;
  icon: string;
  titleKey: TranslationKey;
  bodyKey: TranslationKey;
};

/** Static section descriptors. Strings are not stored here — the
 *  component resolves them through `t()` so every label respects the
 *  user's chosen language (Norwegian Bokmål or English). The shape of
 *  the descriptor never depends on the locale: only the steps array
 *  length is "data" the renderer needs. */
const SECTIONS: HelpSection[] = [
  {
    id: "hub",
    icon: "◉",
    shortKey: "portal.help.hub.short",
    titleKey: "portal.help.hub.title",
    introKey: "portal.help.hub.intro",
    stepKeys: [
      "portal.help.hub.step1",
      "portal.help.hub.step2",
      "portal.help.hub.step3",
    ],
    tipKey: "portal.help.hub.tip",
  },
  {
    id: "briefs",
    icon: "✉",
    shortKey: "portal.help.briefs.short",
    titleKey: "portal.help.briefs.title",
    introKey: "portal.help.briefs.intro",
    stepKeys: [
      "portal.help.briefs.step1",
      "portal.help.briefs.step2",
      "portal.help.briefs.step3",
    ],
    tipKey: "portal.help.briefs.tip",
  },
  {
    id: "gigs",
    icon: "▤",
    shortKey: "portal.help.gigs.short",
    titleKey: "portal.help.gigs.title",
    introKey: "portal.help.gigs.intro",
    stepKeys: [
      "portal.help.gigs.step1",
      "portal.help.gigs.step2",
      "portal.help.gigs.step3",
      "portal.help.gigs.step4",
    ],
    tipKey: "portal.help.gigs.tip",
  },
  {
    id: "availability",
    icon: "◐",
    shortKey: "portal.help.availability.short",
    titleKey: "portal.help.availability.title",
    introKey: "portal.help.availability.intro",
    stepKeys: [
      "portal.help.availability.step1",
      "portal.help.availability.step2",
    ],
  },
  {
    id: "earnings",
    icon: "kr",
    shortKey: "portal.help.earnings.short",
    titleKey: "portal.help.earnings.title",
    introKey: "portal.help.earnings.intro",
    stepKeys: [
      "portal.help.earnings.step1",
      "portal.help.earnings.step2",
    ],
  },
  {
    id: "profile",
    icon: "◆",
    shortKey: "portal.help.profile.short",
    titleKey: "portal.help.profile.title",
    introKey: "portal.help.profile.intro",
    stepKeys: [
      "portal.help.profile.step1",
      "portal.help.profile.step2",
    ],
  },
];

const QUICK_ACTIONS: QuickAction[] = [
  {
    id: "calendar",
    icon: "📅",
    titleKey: "portal.help.qa.calendar.title",
    bodyKey: "portal.help.qa.calendar.body",
  },
  {
    id: "callsheet",
    icon: "📄",
    titleKey: "portal.help.qa.callsheet.title",
    bodyKey: "portal.help.qa.callsheet.body",
  },
  {
    id: "conflict",
    icon: "⚠",
    titleKey: "portal.help.qa.conflict.title",
    bodyKey: "portal.help.qa.conflict.body",
  },
  {
    id: "checkin",
    icon: "✓",
    titleKey: "portal.help.qa.checkin.title",
    bodyKey: "portal.help.qa.checkin.body",
  },
  {
    id: "update",
    icon: "🔔",
    titleKey: "portal.help.qa.update.title",
    bodyKey: "portal.help.qa.update.body",
  },
];

export function Help({ theme }: { theme: ThemeMode }) {
  const c = PALETTE[theme];
  const t = useT();

  // Materialise the localised content once per render so each child
  // doesn't have to call t() repeatedly. useMemo is keyed on the t
  // function reference — the I18n context returns a stable function
  // per locale, so this only re-runs when the user actually switches
  // language.
  const sections = useMemo(
    () =>
      SECTIONS.map((s) => ({
        id: s.id,
        icon: s.icon,
        short: t(s.shortKey),
        title: t(s.titleKey),
        intro: t(s.introKey),
        steps: s.stepKeys.map((k) => t(k)),
        tip: s.tipKey ? t(s.tipKey) : undefined,
      })),
    [t],
  );
  const quickActions = useMemo(
    () =>
      QUICK_ACTIONS.map((q) => ({
        id: q.id,
        icon: q.icon,
        title: t(q.titleKey),
        body: t(q.bodyKey),
      })),
    [t],
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <header style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 10,
            fontSize: 13,
            fontWeight: 700,
            color: c.accent,
            letterSpacing: 0.6,
            textTransform: "uppercase",
          }}
        >
          <span aria-hidden>?</span>
          <span>{t("portal.help.kicker")}</span>
        </div>
        <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, color: c.text }}>
          {t("portal.help.title")}
        </h1>
        <p style={{ margin: 0, fontSize: 14, color: c.muted, lineHeight: 1.55 }}>
          {t("portal.help.intro")}
        </p>
      </header>

      <Card theme={theme}>
        <h2
          style={{
            margin: 0,
            marginBottom: 12,
            fontSize: 16,
            fontWeight: 700,
            color: c.text,
          }}
        >
          {t("portal.help.jumpTo")}
        </h2>
        <nav
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
            gap: 8,
          }}
        >
          {sections.map((s) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "10px 12px",
                borderRadius: 10,
                background: c.cardBgSubtle,
                color: c.text,
                textDecoration: "none",
                fontSize: 13,
                fontWeight: 600,
                border: `1px solid ${c.border}`,
              }}
            >
              <span style={{ fontSize: 16, color: c.accent }} aria-hidden>
                {s.icon}
              </span>
              <span style={{ flex: 1 }}>{s.short}</span>
            </a>
          ))}
        </nav>
      </Card>

      <Card theme={theme}>
        <h2
          style={{
            margin: 0,
            marginBottom: 4,
            fontSize: 16,
            fontWeight: 700,
            color: c.text,
          }}
        >
          {t("portal.help.shortcuts.title")}
        </h2>
        <p style={{ margin: 0, marginBottom: 14, fontSize: 13, color: c.muted }}>
          {t("portal.help.shortcuts.intro")}
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {quickActions.map((a) => (
            <div
              key={a.id}
              style={{
                display: "flex",
                gap: 12,
                padding: 12,
                borderRadius: 10,
                background: c.cardBgSubtle,
                border: `1px solid ${c.border}`,
              }}
            >
              <div
                style={{
                  fontSize: 22,
                  lineHeight: 1,
                  width: 36,
                  flexShrink: 0,
                  textAlign: "center",
                }}
                aria-hidden
              >
                {a.icon}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: c.text }}>
                  {a.title}
                </div>
                <div
                  style={{ fontSize: 13, color: c.muted, lineHeight: 1.55 }}
                >
                  {a.body}
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {sections.map((s) => (
        <Card key={s.id} theme={theme}>
          <a
            id={s.id}
            aria-hidden
            style={{
              display: "block",
              position: "relative",
              top: -76,
              visibility: "hidden",
            }}
          />
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              marginBottom: 8,
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: c.accent,
                color: "#0b0b0b",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 18,
                fontWeight: 800,
              }}
              aria-hidden
            >
              {s.icon}
            </div>
            <h2
              style={{
                margin: 0,
                fontSize: 18,
                fontWeight: 800,
                color: c.text,
              }}
            >
              {s.title}
            </h2>
          </div>
          <p
            style={{
              margin: 0,
              marginBottom: 12,
              fontSize: 14,
              color: c.muted,
              lineHeight: 1.6,
            }}
          >
            {s.intro}
          </p>
          <ol
            style={{
              margin: 0,
              paddingLeft: 22,
              display: "flex",
              flexDirection: "column",
              gap: 6,
              color: c.text,
              fontSize: 14,
              lineHeight: 1.55,
            }}
          >
            {s.steps.map((step, i) => (
              <li key={i}>{step}</li>
            ))}
          </ol>
          {s.tip ? (
            <div
              style={{
                marginTop: 12,
                padding: "10px 12px",
                borderRadius: 8,
                background: c.cardBgSubtle,
                border: `1px dashed ${c.border}`,
                fontSize: 13,
                color: c.muted,
                lineHeight: 1.55,
              }}
            >
              <strong style={{ color: c.text, fontWeight: 700 }}>
                {t("portal.help.tipPrefix")}
              </strong>{" "}
              {s.tip}
            </div>
          ) : null}
        </Card>
      ))}

      <Card theme={theme}>
        <h2
          style={{
            margin: 0,
            marginBottom: 8,
            fontSize: 16,
            fontWeight: 700,
            color: c.text,
          }}
        >
          {t("portal.help.stuck.title")}
        </h2>
        <p
          style={{
            margin: 0,
            fontSize: 14,
            color: c.muted,
            lineHeight: 1.6,
          }}
        >
          {t("portal.help.stuck.before")}
          <Link
            href="/portal/profile"
            style={{ color: c.accent, fontWeight: 600 }}
          >
            {t("portal.help.stuck.linkText")}
          </Link>
          {t("portal.help.stuck.after")}
        </p>
      </Card>
    </div>
  );
}

function Card({
  theme,
  children,
}: {
  theme: ThemeMode;
  children: ReactNode;
}) {
  const c = PALETTE[theme];
  return (
    <section
      style={{
        background: c.cardBg,
        border: `1px solid ${c.border}`,
        borderRadius: 14,
        padding: 18,
      }}
    >
      {children}
    </section>
  );
}
