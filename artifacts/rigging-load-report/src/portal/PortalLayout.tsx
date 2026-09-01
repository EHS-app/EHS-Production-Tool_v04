import React, { useEffect, useRef, type ReactNode } from "react";
import { Link } from "wouter";
import { useClerk } from "@clerk/react";
import {
  Activity,
  Bell,
  Calendar,
  ChevronDown,
  Clock,
  Command,
  HelpCircle,
  Inbox,
  LogOut,
  MessageSquare,
  MoreHorizontal,
  Search,
  TrendingUp,
  User,
  Wallet,
} from "lucide-react";
import ehsLogo from "../assets/ehs-logo.png";
import { PALETTE, PORTAL_FONT, type ThemeMode } from "./lib/portalTheme";
import { useT } from "../lib/i18n/I18nContext";
import type { TranslationKey } from "../lib/i18n/types";
import { FeedbackDialog } from "../components/FeedbackDialog";
import { Toaster } from "../components/ui/sonner";

export type PortalNavKey =
  | "hub"
  | "briefs"
  | "gigs"
  | "availability"
  | "hours"
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
  icon: React.ComponentType<{ size?: number | string; strokeWidth?: number }>;
};

const NAV_WORK: NavItem[] = [
  { key: "hub", labelKey: "portal.nav.hub", href: "/portal", icon: Activity },
  { key: "briefs", labelKey: "portal.nav.briefs", href: "/portal/briefs", icon: Inbox },
  { key: "gigs", labelKey: "portal.nav.gigs", href: "/portal/gigs", icon: Calendar },
  {
    key: "availability",
    labelKey: "portal.nav.availability",
    href: "/portal/availability",
    icon: Clock,
  },
  {
    key: "hours",
    labelKey: "portal.nav.hours",
    href: "/portal/hours",
    icon: TrendingUp,
  },
];

const NAV_ACCOUNT: NavItem[] = [
  { key: "earnings", labelKey: "portal.nav.earnings", href: "/portal/earnings", icon: Wallet },
  { key: "profile", labelKey: "portal.nav.profile", href: "/portal/profile", icon: User },
  { key: "help", labelKey: "portal.nav.help", href: "/portal/help", icon: HelpCircle },
];

const NAV_GROUPS: ReadonlyArray<{ labelKey: TranslationKey; items: NavItem[] }> = [
  { labelKey: "portal.nav.hub", items: NAV_WORK }, // group label rendered separately below
  { labelKey: "portal.nav.profile", items: NAV_ACCOUNT },
];

/** Section headings for the nav groups. Kept inline (not via i18n) so we
 *  don't need to add new translation keys for the chrome refresh; the
 *  existing item labels carry the language-specific text. */
const GROUP_LABELS: Record<"work" | "account", { no: string; en: string }> = {
  work: { no: "Arbeid", en: "Work" },
  account: { no: "Konto", en: "Account" },
};

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
  // `theme` is intentionally referenced (consumers still pass it) but the
  // chrome now reads CSS variables from `[data-theme]` on <html>, so we
  // don't fork styles by mode here.
  void theme;
  const c = PALETTE.dark; // unused after refactor; kept import for type stability
  void c;

  const { signOut } = useClerk();
  const t = useT();
  const lang = (typeof document !== "undefined"
    ? document.documentElement.lang
    : "no") === "en"
    ? "en"
    : "no";

  const [menuOpen, setMenuOpen] = React.useState(false);
  const [feedbackOpen, setFeedbackOpen] = React.useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const openFeedback = React.useCallback(() => {
    setMenuOpen(false);
    window.requestAnimationFrame(() => setFeedbackOpen(true));
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    const onPointer = (e: MouseEvent) => {
      const t2 = e.target as Node | null;
      if (menuRef.current && t2 && !menuRef.current.contains(t2)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onPointer);
    };
  }, [menuOpen]);

  const allItems = [...NAV_WORK, ...NAV_ACCOUNT];
  const activeItem = allItems.find((i) => i.key === active);
  const activeLabel = activeItem ? t(activeItem.labelKey) : "";
  const userInitial = (userLabel || "?").trim().charAt(0).toUpperCase();

  return (
    <div
      className="ehs-shell"
      style={{ fontFamily: PORTAL_FONT, minHeight: "100dvh" }}
    >
      {/* SIDEBAR — same chrome as production tool */}
      <aside className="ehs-shell-aside ehs-portal-aside">
        <div className="ehs-shell-workspace ehs-shell-workspace--stacked">
          <Link
            href="/portal"
            className="ehs-shell-workspace-mark"
            style={{ textDecoration: "none" }}
            aria-label={t("portal.header.title")}
          >
            <img
              src={ehsLogo}
              alt="EHS"
              className="ehs-shell-workspace-logo"
            />
          </Link>
          <div className="ehs-shell-workspace-text">
            <div className="ehs-shell-workspace-name">
              {t("portal.header.title")}
            </div>
          </div>
          <ChevronDown size={14} className="ehs-shell-workspace-chevron" />
        </div>

        <div style={{ padding: "10px 12px" }}>
          <button
            type="button"
            className="ehs-shell-side-action"
            disabled
            title={t("portal.nav.gigs")}
          >
            <Search size={14} />
            <span>{t("portal.nav.gigs")}</span>
            <span className="ehs-shell-kbd-row">
              <kbd className="ehs-shell-kbd">
                <Command size={10} />
              </kbd>
              <kbd className="ehs-shell-kbd">K</kbd>
            </span>
          </button>
        </div>

        <nav className="ehs-shell-nav">
          {(["work", "account"] as const).map((groupKey, groupIdx) => {
            const items = groupIdx === 0 ? NAV_WORK : NAV_ACCOUNT;
            return (
              <div key={groupKey} style={{ marginTop: 18 }}>
                <div className="ehs-shell-nav-label">
                  {GROUP_LABELS[groupKey][lang]}
                </div>
                {items.map((item) => {
                  const Icon = item.icon;
                  const isActive = item.key === active;
                  const showBadge =
                    item.key === "briefs" && pendingBriefCount > 0;
                  return (
                    <Link
                      key={item.key}
                      href={item.href}
                      className={`ehs-shell-nav-item${isActive ? " is-active" : ""}`}
                    >
                      <Icon size={15} strokeWidth={1.75} />
                      <span style={{ flex: 1, textAlign: "left" }}>
                        {t(item.labelKey)}
                      </span>
                      {showBadge ? (
                        <span
                          className="ehs-shell-nav-badge"
                          aria-label={t("portal.header.briefsBadgeAria", {
                            count: pendingBriefCount,
                          })}
                        >
                          {pendingBriefCount}
                        </span>
                      ) : null}
                    </Link>
                  );
                })}
              </div>
            );
          })}
        </nav>

        <div className="ehs-shell-user">
          <div className="ehs-shell-user-avatar">{userInitial}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="ehs-shell-user-name">{userLabel}</div>
            <div className="ehs-shell-user-role">Freelancer</div>
          </div>
          <div style={{ position: "relative" }} ref={menuRef}>
            <button
              type="button"
              className="ehs-shell-icon-btn"
              onClick={() => setMenuOpen((v) => !v)}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              aria-label={t("portal.header.signOut")}
            >
              <MoreHorizontal size={14} />
            </button>
            {menuOpen ? (
              <div className="ehs-shell-menu" role="menu">
                <div className="ehs-shell-menu-label">
                  {lang === "no" ? "Tema" : "Theme"}
                </div>
                {(["light", "dark", "system"] as const).map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    role="menuitemradio"
                    aria-checked={pref === opt}
                    className={`ehs-shell-menu-item${pref === opt ? " is-active" : ""}`}
                    onClick={() => {
                      setPref(opt);
                      setMenuOpen(false);
                    }}
                  >
                    {opt === "light"
                      ? lang === "no"
                        ? "Lys"
                        : "Light"
                      : opt === "dark"
                      ? lang === "no"
                        ? "Mørk"
                        : "Dark"
                      : "System"}
                  </button>
                ))}
                <div className="ehs-shell-menu-sep" />
                <button
                  type="button"
                  role="menuitem"
                  className="ehs-shell-menu-item"
                  onClick={openFeedback}
                >
                  <MessageSquare size={12} /> {lang === "no" ? "Tilbakemelding" : "Feedback"}
                </button>
                <button
                  type="button"
                  role="menuitem"
                  className="ehs-shell-menu-item is-danger"
                  onClick={() => {
                    setMenuOpen(false);
                    try {
                      sessionStorage.setItem("ehs-skip-dev-auto-signin", "1");
                      sessionStorage.removeItem("ehs-login-intent");
                      sessionStorage.removeItem("ehs-auth-mode");
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
                >
                  <LogOut size={12} /> {t("portal.header.signOut")}
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </aside>

      {/* MAIN */}
      <main className="ehs-shell-main">
        <header className="ehs-shell-topbar">
          <div className="ehs-shell-crumbs">
            <Link href="/portal" className="ehs-shell-crumb-link">
              {t("portal.header.title")}
            </Link>
            <span className="ehs-shell-crumb-sep">/</span>
            <span className="ehs-shell-crumb-current">{activeLabel}</span>
          </div>

          <div className="ehs-shell-topbar-actions">
            <button
              type="button"
              className="ehs-shell-icon-btn"
              aria-label="Notifications"
              title="Notifications"
            >
              <Bell size={14} />
            </button>
            <button
              type="button"
              className="ehs-shell-signout-btn"
              onClick={() => {
                try {
                  sessionStorage.setItem("ehs-skip-dev-auto-signin", "1");
                  sessionStorage.removeItem("ehs-login-intent");
                  sessionStorage.removeItem("ehs-auth-mode");
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
              aria-label={t("portal.header.signOut")}
              title={t("portal.header.signOut")}
            >
              <LogOut size={14} />
              <span className="ehs-shell-signout-label">
                {t("portal.header.signOut")}
              </span>
            </button>
          </div>
        </header>

        <div className="ehs-shell-glow" aria-hidden />
        <div
          className="ehs-shell-content"
          style={{
            padding: "20px 16px 96px",
            maxWidth: 1100,
            width: "100%",
            margin: "0 auto",
            boxSizing: "border-box",
          }}
        >
          {children}
        </div>
      </main>

      {/* MOBILE BOTTOM NAV — kept for phones since the sidebar collapses */}
      <nav
        className="ehs-portal-bottomnav"
        aria-label={t("portal.header.sectionsAria")}
      >
        {allItems.map((item) => {
          const Icon = item.icon;
          const isActive = active === item.key;
          const showBadge = item.key === "briefs" && pendingBriefCount > 0;
          return (
            <Link
              key={item.key}
              href={item.href}
              className="ehs-portal-bottomnav-item"
              data-active={isActive}
            >
              <span style={{ position: "relative", display: "inline-flex" }}>
                <Icon size={22} strokeWidth={isActive ? 2.25 : 1.75} />
                {showBadge ? (
                  <span className="ehs-portal-bottomnav-badge">
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
        @media (max-width: 899px) {
          .ehs-portal-aside { display: none !important; }
          .ehs-portal-only-desktop { display: none !important; }
        }
        @media (min-width: 900px) {
          .ehs-portal-only-mobile { display: none !important; }
          .ehs-portal-bottomnav { display: none !important; }
        }
      `}</style>

      <FeedbackDialog open={feedbackOpen} onOpenChange={setFeedbackOpen} />
      <Toaster theme={pref === "system" ? "dark" : pref} />
    </div>
  );
}
