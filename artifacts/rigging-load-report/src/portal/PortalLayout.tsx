import { useRef, type ReactNode } from "react";
import { Link } from "wouter";
import { useClerk } from "@clerk/react";
import ehsLogo from "../assets/ehs-logo.png";
import { PALETTE, EHS_ORANGE, PORTAL_FONT, type ThemeMode } from "./lib/portalTheme";
import { useT } from "../lib/i18n/I18nContext";
import type { TranslationKey } from "../lib/i18n/types";

export type PortalNavKey =
  | "hub"
  | "briefs"
  | "gigs"
  | "availability"
  | "earnings"
  | "profile"
  | "help";

/** Three-way theme preference. Mirrors the type used in main.tsx; kept
 *  local so this file has no dependency cycle back into the entry. */
export type PortalThemePref = "light" | "dark" | "system";

type NavItem = {
  key: PortalNavKey;
  labelKey: TranslationKey;
  href: string;
  icon: string;
};

const NAV: NavItem[] = [
  { key: "hub", labelKey: "portal.nav.hub", href: "/portal", icon: "◉" },
  { key: "briefs", labelKey: "portal.nav.briefs", href: "/portal/briefs", icon: "✉" },
  { key: "gigs", labelKey: "portal.nav.gigs", href: "/portal/gigs", icon: "▤" },
  {
    key: "availability",
    labelKey: "portal.nav.availability",
    href: "/portal/availability",
    icon: "◐",
  },
  { key: "earnings", labelKey: "portal.nav.earnings", href: "/portal/earnings", icon: "kr" },
  { key: "profile", labelKey: "portal.nav.profile", href: "/portal/profile", icon: "◆" },
  { key: "help", labelKey: "portal.nav.help", href: "/portal/help", icon: "?" },
];

/**
 * Inline three-way segmented control for the portal header. Keeps
 * styling self-contained (the `index.css` `.theme-seg` rules belong to
 * the Production Tool's chrome) and matches the segmented control on
 * the sign-in screen so the experience is consistent across the
 * employee/freelancer surfaces.
 *
 * ARIA: implements the `radiogroup` keyboard pattern — only the
 * selected option is in the tab order; arrow keys (and Home/End) move
 * focus AND change the selection.
 */
function PortalThemeSeg({
  pref,
  onChange,
  c,
}: {
  pref: PortalThemePref;
  onChange: (next: PortalThemePref) => void;
  /* PALETTE is declared `as const` so its `light` and `dark` entries
     are distinct literal types. We only read a handful of fields off
     `c`, so taking the union keeps the type accurate without forcing
     callers to widen their palette by hand. */
  c: (typeof PALETTE)[keyof typeof PALETTE];
}) {
  const t = useT();
  const options: ReadonlyArray<{
    value: PortalThemePref;
    labelKey: "theme.light" | "theme.dark" | "theme.system";
    ariaKey: "theme.lightAria" | "theme.darkAria" | "theme.systemAria";
    icon: string;
  }> = [
    { value: "light", labelKey: "theme.light", ariaKey: "theme.lightAria", icon: "☀" },
    { value: "dark", labelKey: "theme.dark", ariaKey: "theme.darkAria", icon: "☾" },
    { value: "system", labelKey: "theme.system", ariaKey: "theme.systemAria", icon: "⌬" },
  ];
  const btnRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const selectedIndex = Math.max(
    0,
    options.findIndex((o) => o.value === pref),
  );
  const move = (next: number) => {
    const i = ((next % options.length) + options.length) % options.length;
    onChange(options[i].value);
    btnRefs.current[i]?.focus();
  };
  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    switch (e.key) {
      case "ArrowRight":
      case "ArrowDown":
        e.preventDefault();
        move(selectedIndex + 1);
        break;
      case "ArrowLeft":
      case "ArrowUp":
        e.preventDefault();
        move(selectedIndex - 1);
        break;
      case "Home":
        e.preventDefault();
        move(0);
        break;
      case "End":
        e.preventDefault();
        move(options.length - 1);
        break;
      default:
        break;
    }
  };
  return (
    <div
      role="radiogroup"
      aria-label={t("theme.label")}
      title={t("theme.title")}
      onKeyDown={onKeyDown}
      className="ehs-portal-theme-seg"
      style={{
        display: "inline-flex",
        gap: 2,
        padding: 3,
        background: c.cardBgSubtle,
        border: `1px solid ${c.border}`,
        borderRadius: 8,
        fontFamily: PORTAL_FONT,
      }}
    >
      {options.map((o, i) => {
        const selected = pref === o.value;
        return (
          <button
            key={o.value}
            ref={(el) => {
              btnRefs.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={t(o.ariaKey)}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(o.value)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              padding: "5px 9px",
              fontSize: 12,
              fontWeight: 600,
              borderRadius: 6,
              border: "none",
              cursor: "pointer",
              background: selected ? EHS_ORANGE : "transparent",
              color: selected ? "#0b0b0b" : c.text,
              transition: "background 120ms ease, color 120ms ease",
              fontFamily: PORTAL_FONT,
            }}
          >
            <span aria-hidden>{o.icon}</span>
            <span className="ehs-portal-theme-seg-label">{t(o.labelKey)}</span>
          </button>
        );
      })}
    </div>
  );
}

export function PortalLayout({
  theme,
  pref,
  setPref,
  active,
  userLabel,
  pendingBriefCount,
  children,
}: {
  theme: ThemeMode;
  pref: PortalThemePref;
  setPref: (next: PortalThemePref) => void;
  active: PortalNavKey;
  userLabel: string;
  /** Number of briefs in `pending` state — surfaced as a badge on the
   *  Briefs nav item so the freelancer doesn't miss new project briefings. */
  pendingBriefCount: number;
  children: ReactNode;
}) {
  const c = PALETTE[theme];
  const { signOut } = useClerk();
  const t = useT();

  return (
    <div
      style={{
        minHeight: "100dvh",
        background: c.pageBg,
        color: c.text,
        fontFamily: PORTAL_FONT,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <header
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "14px 20px",
          background: c.cardBg,
          borderBottom: `1px solid ${c.border}`,
          position: "sticky",
          top: 0,
          zIndex: 20,
        }}
      >
        <Link
          href="/portal"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 10,
            textDecoration: "none",
            color: c.text,
          }}
        >
          <img src={ehsLogo} alt="EHS" style={{ height: 30, width: "auto" }} />
          <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.1 }}>
            <span style={{ fontSize: 15, fontWeight: 700, letterSpacing: 0.2 }}>
              {t("portal.header.title")}
            </span>
            <span style={{ fontSize: 11, color: c.muted, fontWeight: 500 }}>
              {t("portal.header.subtitle")}
            </span>
          </div>
        </Link>

        <div style={{ flex: 1 }} />

        <Link
          href="/"
          title={t("portal.header.toolTitle")}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "7px 12px",
            fontSize: 13,
            fontWeight: 600,
            borderRadius: 8,
            color: c.text,
            background: c.cardBgSubtle,
            border: `1px solid ${c.border}`,
            textDecoration: "none",
          }}
        >
          <span aria-hidden>↗</span>
          <span className="ehs-portal-only-desktop">
            {t("portal.header.productionTool")}
          </span>
          <span className="ehs-portal-only-mobile" aria-hidden>
            {t("portal.header.productionToolShort")}
          </span>
        </Link>

        <Link
          href="/portal/help"
          title={t("portal.header.helpTitle")}
          aria-label={t("portal.header.helpAria")}
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 34,
            height: 34,
            fontSize: 15,
            fontWeight: 800,
            borderRadius: 8,
            background: c.cardBgSubtle,
            color: c.text,
            border: `1px solid ${c.border}`,
            textDecoration: "none",
          }}
        >
          ?
        </Link>

        {/* Three-way theme picker (Light / Dark / System). System is
            the install default and follows OS prefers-color-scheme;
            users can pin a concrete preference here. Replaces the old
            single-icon cycle button. */}
        <PortalThemeSeg pref={pref} onChange={setPref} c={c} />

        <button
          type="button"
          onClick={() => {
            try {
              sessionStorage.setItem("ehs-skip-dev-auto-signin", "1");
            } catch {
              /* sessionStorage may be unavailable */
            }
            try {
              localStorage.removeItem("ehs-user-role");
            } catch {
              /* localStorage may be unavailable */
            }
            void signOut();
          }}
          title={t("portal.header.signedInAs", { label: userLabel })}
          className="ehs-portal-only-desktop"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "7px 12px",
            fontSize: 13,
            fontWeight: 600,
            borderRadius: 8,
            cursor: "pointer",
            background: "transparent",
            color: c.text,
            border: `1px solid ${c.border}`,
            fontFamily: PORTAL_FONT,
          }}
        >
          <span style={{ opacity: 0.85, maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {userLabel}
          </span>
          <span aria-hidden>·</span>
          <span>{t("portal.header.signOut")}</span>
        </button>
      </header>

      <div
        style={{
          flex: 1,
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr)",
        }}
        className="ehs-portal-shell"
      >
        <aside
          className="ehs-portal-sidebar"
          style={{
            background: c.cardBg,
            borderRight: `1px solid ${c.border}`,
            padding: "24px 14px",
            display: "none",
            flexDirection: "column",
            gap: 6,
            position: "sticky",
            top: 60,
            alignSelf: "start",
            height: "calc(100dvh - 60px)",
          }}
        >
          {NAV.map((item) => {
            const isActive = active === item.key;
            const showBadge = item.key === "briefs" && pendingBriefCount > 0;
            return (
              <Link
                key={item.key}
                href={item.href}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "11px 14px",
                  borderRadius: 10,
                  textDecoration: "none",
                  fontSize: 14,
                  fontWeight: 600,
                  color: isActive ? "#0b0b0b" : c.text,
                  background: isActive ? c.accent : "transparent",
                  border: `1px solid ${isActive ? c.accent : "transparent"}`,
                  transition: "background 120ms ease",
                }}
              >
                <span
                  style={{
                    fontSize: 15,
                    width: 22,
                    textAlign: "center",
                    opacity: isActive ? 1 : 0.7,
                  }}
                  aria-hidden
                >
                  {item.icon}
                </span>
                <span style={{ flex: 1 }}>{t(item.labelKey)}</span>
                {showBadge ? (
                  <span
                    aria-label={t("portal.header.briefsBadgeAria", {
                      count: pendingBriefCount,
                    })}
                    style={{
                      minWidth: 22,
                      padding: "2px 7px",
                      fontSize: 11,
                      fontWeight: 800,
                      borderRadius: 999,
                      textAlign: "center",
                      background: isActive ? "#0b0b0b" : c.accent,
                      color: isActive ? c.accent : "#0b0b0b",
                    }}
                  >
                    {pendingBriefCount}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </aside>

        <main
          style={{
            padding: "20px 16px 96px",
            maxWidth: 1100,
            width: "100%",
            margin: "0 auto",
            boxSizing: "border-box",
          }}
        >
          {children}
        </main>
      </div>

      <nav
        className="ehs-portal-bottomnav"
        aria-label={t("portal.header.sectionsAria")}
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          display: "flex",
          justifyContent: "space-around",
          background: c.cardBg,
          borderTop: `1px solid ${c.border}`,
          padding: "6px 4px max(6px, env(safe-area-inset-bottom))",
          zIndex: 30,
        }}
      >
        {NAV.map((item) => {
          const isActive = active === item.key;
          const showBadge = item.key === "briefs" && pendingBriefCount > 0;
          return (
            <Link
              key={item.key}
              href={item.href}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 2,
                padding: "6px 6px",
                fontSize: 11,
                fontWeight: 600,
                textDecoration: "none",
                color: isActive ? c.accent : c.muted,
                minWidth: 48,
                position: "relative",
              }}
              data-active={isActive}
            >
              <span style={{ fontSize: 16, position: "relative" }} aria-hidden>
                {item.icon}
                {showBadge ? (
                  <span
                    style={{
                      position: "absolute",
                      top: -4,
                      right: -10,
                      minWidth: 16,
                      height: 16,
                      padding: "0 4px",
                      fontSize: 10,
                      fontWeight: 800,
                      borderRadius: 999,
                      background: c.accent,
                      color: "#0b0b0b",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      lineHeight: 1,
                    }}
                  >
                    {pendingBriefCount}
                  </span>
                ) : null}
              </span>
              <span>{t(item.labelKey)}</span>
            </Link>
          );
        })}
      </nav>

      <style>{`
        @media (min-width: 900px) {
          .ehs-portal-shell { grid-template-columns: 240px minmax(0,1fr) !important; }
          .ehs-portal-sidebar { display: flex !important; }
          .ehs-portal-bottomnav { display: none !important; }
          .ehs-portal-only-mobile { display: none !important; }
        }
        @media (max-width: 899px) {
          .ehs-portal-only-desktop { display: none !important; }
          /* Hide the verbose theme labels on phones; the icons are enough
             alongside the still-visible role tabs to keep the header tidy. */
          .ehs-portal-theme-seg-label { display: none !important; }
        }
      `}</style>
    </div>
  );
}
