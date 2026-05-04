import React, { type ReactNode } from "react";
import { Link } from "wouter";
import {
  Activity,
  AlignLeft,
  Bed,
  Bell,
  Briefcase,
  ChevronDown,
  ClipboardCheck,
  Coffee,
  Command,
  Download,
  LogOut,
  MapPin,
  Menu,
  MonitorPlay,
  MoreHorizontal,
  Plus,
  Search,
  Share2,
  Speaker,
  Users,
  Zap,
  HelpCircle,
  LayoutGrid,
} from "lucide-react";
import type { ThemePreference } from "../main";
import { useT, type Translator } from "../lib/i18n/I18nContext";
import { CommandPalette } from "./CommandPalette";

/**
 * Linear v2 — Tactical Command Center shell.
 *
 * Wraps every authenticated dashboard view in a sidebar + topbar chrome
 * matching the approved mockup at
 * `artifacts/mockup-sandbox/src/components/mockups/ehs-redesign/Linear.tsx`.
 *
 * Visual fidelity:
 *  - Sidebar background `#1C1C24`, surfaces `#25252F`, borders white/8
 *  - Active nav row: bg `rgba(123,91,255,0.12)`, text `#7B5BFF`
 *  - Topbar: 64px, sticky, breadcrumb + status pill + actions
 *
 * The component intentionally uses inline styles to match the rest of
 * the app (no Tailwind in main app) and to be self-contained.
 */

export type ShellView =
  | "oversikt"
  | "rigging"
  | "lighting"
  | "led"
  | "stage"
  | "sound"
  | "crew"
  | "hotel"
  | "catering"
  | "riggPlan"
  | "inspection";

type NavItem = {
  id: ShellView;
  label: string;
  icon: React.ComponentType<{ size?: number | string; strokeWidth?: number }>;
  badge?: number | null;
  hidden?: boolean;
};

type NavGroup = {
  label: string;
  items: NavItem[];
};

export type ShellAction = {
  id: string;
  label: string;
  icon?: React.ComponentType<{ size?: number | string }>;
  onClick: () => void;
  variant?: "primary" | "secondary" | "ghost";
  title?: string;
};

interface AppShellProps {
  view: ShellView;
  onChangeView: (next: ShellView) => void;
  workspaceLabel: string;
  workspaceSublabel?: string;
  workspaceLogoSrc?: string;
  projectTitle: string;
  projectStatus?: { label: string; tone: "success" | "warning" | "danger" | "neutral" };
  badges: Partial<Record<ShellView, number>>;
  showCatering: boolean;
  showHotel: boolean;
  savedAt: string;
  primaryActions?: ShellAction[];
  secondaryActions?: ShellAction[];
  overflowActions?: ShellAction[];
  themePref: ThemePreference;
  onChangeTheme: (next: ThemePreference) => void;
  userInitial: string;
  userName: string;
  userRole: string;
  userEmail?: string;
  onSignOut: () => void;
  onHelp?: () => void;
  onOpenProjects?: () => void;
  cloudSavedAt?: string;
  children: ReactNode;
}

function buildNavGroups(t: Translator): NavGroup[] {
  return [
    {
      label: t("shell.nav.project"),
      items: [
        { id: "oversikt", label: t("shell.nav.overview"), icon: Activity },
        { id: "rigging", label: t("shell.nav.rigging"), icon: Briefcase },
        { id: "lighting", label: t("shell.nav.lighting"), icon: Zap },
        { id: "led", label: t("shell.nav.led"), icon: MonitorPlay },
        { id: "sound", label: t("shell.nav.sound"), icon: Speaker },
        { id: "stage", label: t("shell.nav.stage"), icon: AlignLeft },
        { id: "riggPlan", label: t("shell.nav.riggPlan"), icon: LayoutGrid },
        { id: "inspection", label: t("shell.nav.inspection"), icon: ClipboardCheck },
      ],
    },
    {
      label: t("shell.nav.logistics"),
      items: [
        { id: "crew", label: t("shell.nav.crew"), icon: Users },
        { id: "hotel", label: t("shell.nav.hotel"), icon: Bed },
        { id: "catering", label: t("shell.nav.catering"), icon: Coffee },
      ],
    },
  ];
}

function statusToneStyle(tone: "success" | "warning" | "danger" | "neutral"): React.CSSProperties {
  switch (tone) {
    case "success":
      return {
        background: "rgba(16,185,129,0.12)",
        color: "#34d399",
        border: "1px solid rgba(16,185,129,0.25)",
      };
    case "warning":
      return {
        background: "rgba(245,158,11,0.12)",
        color: "#fbbf24",
        border: "1px solid rgba(245,158,11,0.25)",
      };
    case "danger":
      return {
        background: "rgba(244,63,94,0.12)",
        color: "#fb7185",
        border: "1px solid rgba(244,63,94,0.25)",
      };
    default:
      return {
        background: "rgba(255,255,255,0.05)",
        color: "var(--text-muted)",
        border: "1px solid var(--border-color)",
      };
  }
}

function actionVariantStyle(variant: ShellAction["variant"]): React.CSSProperties {
  switch (variant) {
    case "primary":
      return {
        background: "var(--primary)",
        color: "#fff",
        border: "1px solid var(--primary)",
        boxShadow: "0 0 14px rgba(123,91,255,0.28)",
      };
    case "secondary":
      return {
        background: "rgba(255,255,255,0.04)",
        color: "var(--text-main)",
        border: "1px solid var(--border-color)",
      };
    default:
      return {
        background: "transparent",
        color: "var(--text-muted)",
        border: "1px solid transparent",
      };
  }
}

export function AppShell({
  view,
  onChangeView,
  workspaceLabel,
  workspaceLogoSrc,
  workspaceSublabel,
  projectTitle,
  projectStatus,
  badges,
  showCatering,
  showHotel,
  savedAt,
  primaryActions = [],
  secondaryActions = [],
  overflowActions = [],
  themePref,
  onChangeTheme,
  userInitial,
  userName,
  userRole,
  userEmail,
  onSignOut,
  onHelp,
  onOpenProjects,
  cloudSavedAt,
  children,
}: AppShellProps) {
  const t = useT();
  const [overflowOpen, setOverflowOpen] = React.useState(false);
  const [themeOpen, setThemeOpen] = React.useState(false);
  const [cmdOpen, setCmdOpen] = React.useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const overflowRef = React.useRef<HTMLDivElement | null>(null);
  const themeRef = React.useRef<HTMLDivElement | null>(null);
  const mobileMenuBtnRef = React.useRef<HTMLButtonElement | null>(null);
  const wasMobileMenuOpenRef = React.useRef(false);

  // Auto-close the mobile drawer when the user picks a nav item.
  const handleChangeView = React.useCallback(
    (next: ShellView) => {
      setMobileMenuOpen(false);
      onChangeView(next);
    },
    [onChangeView],
  );

  // Close the drawer on Escape so keyboard users aren't trapped.
  React.useEffect(() => {
    if (!mobileMenuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileMenuOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [mobileMenuOpen]);

  // When the drawer closes, return focus to the hamburger button so
  // keyboard users land back on the trigger they came from instead of
  // somewhere off-screen.
  React.useEffect(() => {
    if (wasMobileMenuOpenRef.current && !mobileMenuOpen) {
      mobileMenuBtnRef.current?.focus();
    }
    wasMobileMenuOpenRef.current = mobileMenuOpen;
  }, [mobileMenuOpen]);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setCmdOpen((v) => !v);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const allActions: ShellAction[] = [
    ...primaryActions,
    ...secondaryActions,
    ...overflowActions,
  ];

  // Accessibility: close any open menu on Escape, and close it when the
  // user clicks outside the trigger/menu container. Producers don't
  // expect a menu to stay docked when they navigate elsewhere.
  React.useEffect(() => {
    if (!overflowOpen && !themeOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOverflowOpen(false);
        setThemeOpen(false);
      }
    };
    const onPointer = (e: MouseEvent) => {
      const t = e.target as Node | null;
      if (overflowOpen && overflowRef.current && t && !overflowRef.current.contains(t)) {
        setOverflowOpen(false);
      }
      if (themeOpen && themeRef.current && t && !themeRef.current.contains(t)) {
        setThemeOpen(false);
      }
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onPointer);
    };
  }, [overflowOpen, themeOpen]);

  // Hide Catering / Hotel rows when no server brief exists yet.
  const groups = buildNavGroups(t).map((g) => ({
    ...g,
    items: g.items
      .map((it) => ({
        ...it,
        hidden:
          (it.id === "catering" && !showCatering) ||
          (it.id === "hotel" && !showHotel),
        badge: badges[it.id] ?? null,
      }))
      .filter((it) => !it.hidden),
  }));

  return (
    <div className="ehs-shell">
      {/* Mobile drawer backdrop — only renders when the drawer is open
          AND the viewport is narrow (the .ehs-shell-backdrop class is
          display:none above 900px so this is harmless on desktop). */}
      {mobileMenuOpen ? (
        <div
          className="ehs-shell-backdrop"
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden
        />
      ) : null}
      {/* SIDEBAR */}
      <aside className={`ehs-shell-aside${mobileMenuOpen ? " is-open" : ""}`}>
        <div
          className={`ehs-shell-workspace${workspaceLogoSrc ? " ehs-shell-workspace--stacked" : ""}`}
        >
          <div className="ehs-shell-workspace-mark">
            {workspaceLogoSrc ? (
              <img
                src={workspaceLogoSrc}
                alt={workspaceLabel}
                className="ehs-shell-workspace-logo"
              />
            ) : (
              workspaceLabel.charAt(0).toUpperCase()
            )}
          </div>
          <div className="ehs-shell-workspace-text">
            <div className="ehs-shell-workspace-name">{workspaceLabel}</div>
            {workspaceSublabel ? (
              <div className="ehs-shell-workspace-sub">{workspaceSublabel}</div>
            ) : null}
          </div>
          <ChevronDown
            size={14}
            className="ehs-shell-workspace-chevron"
          />
        </div>

        <div style={{ padding: "10px 12px" }}>
          <button
            type="button"
            className="ehs-shell-side-action"
            title={t("shell.searchTitle")}
            onClick={() => setCmdOpen(true)}
          >
            <Search size={14} />
            <span>{t("shell.search")}</span>
            <span className="ehs-shell-kbd-row">
              <kbd className="ehs-shell-kbd">
                <Command size={10} />
              </kbd>
              <kbd className="ehs-shell-kbd">K</kbd>
            </span>
          </button>
          <button
            type="button"
            className="ehs-shell-side-action"
            onClick={() => handleChangeView("rigging")}
            title={t("shell.newSystemTitle")}
            style={{ marginTop: 4 }}
          >
            <Plus size={14} />
            <span>{t("shell.newSystem")}</span>
            <span className="ehs-shell-kbd-row">
              <kbd className="ehs-shell-kbd">N</kbd>
            </span>
          </button>
        </div>

        <nav className="ehs-shell-nav">
          {groups.map((group) => (
            <div key={group.label} style={{ marginTop: 18 }}>
              <div className="ehs-shell-nav-label">{group.label}</div>
              {group.items.map((item) => {
                const Icon = item.icon;
                const active = item.id === view;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleChangeView(item.id)}
                    className={`ehs-shell-nav-item${active ? " is-active" : ""}`}
                  >
                    <Icon size={15} strokeWidth={1.75} />
                    <span style={{ flex: 1, textAlign: "left" }}>{item.label}</span>
                    {item.badge != null && item.badge > 0 ? (
                      <span className="ehs-shell-nav-badge">{item.badge}</span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        <div style={{ padding: "0 12px", marginTop: "auto", marginBottom: 4 }}>
          <button
            type="button"
            className="ehs-shell-nav-item"
            style={{ background: "none", border: "none", cursor: "pointer", width: "100%", textDecoration: "none" }}
            onClick={onHelp}
          >
            <HelpCircle size={15} strokeWidth={1.75} />
            <span style={{ flex: 1, textAlign: "left" }}>{t("shell.help")}</span>
          </button>
        </div>

        <div className="ehs-shell-user">
          <div className="ehs-shell-user-avatar">{userInitial.toUpperCase()}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="ehs-shell-user-name">{userName}</div>
            <div className="ehs-shell-user-role">{userRole}</div>
          </div>
          <div style={{ position: "relative" }} ref={themeRef}>
            <button
              type="button"
              className="ehs-shell-icon-btn"
              onClick={() => setThemeOpen((v) => !v)}
              title={t("shell.settings")}
              aria-label={t("shell.settings")}
              aria-haspopup="menu"
              aria-expanded={themeOpen}
            >
              <MoreHorizontal size={14} />
            </button>
            {themeOpen ? (
              <div className="ehs-shell-menu" role="menu">
                <div className="ehs-shell-menu-label">{t("theme.label")}</div>
                {(["light", "dark", "system"] as const).map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    role="menuitemradio"
                    aria-checked={themePref === opt}
                    className={`ehs-shell-menu-item${themePref === opt ? " is-active" : ""}`}
                    onClick={() => {
                      onChangeTheme(opt);
                      setThemeOpen(false);
                    }}
                  >
                    {opt === "light" ? t("theme.light") : opt === "dark" ? t("theme.dark") : t("theme.system")}
                  </button>
                ))}
                <div className="ehs-shell-menu-sep" />
                <Link
                  href="/portal"
                  className="ehs-shell-menu-item"
                  onClick={() => setThemeOpen(false)}
                >
                  {t("shell.portalLink")}
                </Link>
                {userEmail ? (
                  <div className="ehs-shell-menu-meta" title={userEmail}>
                    {userEmail}
                  </div>
                ) : null}
                <button
                  type="button"
                  role="menuitem"
                  className="ehs-shell-menu-item is-danger"
                  onClick={() => {
                    setThemeOpen(false);
                    onSignOut();
                  }}
                >
                  <LogOut size={12} /> {t("shell.signOut")}
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </aside>

      {/* MAIN */}
      <main className="ehs-shell-main">
        <header className="ehs-shell-topbar">
          <button
            ref={mobileMenuBtnRef}
            type="button"
            className="ehs-shell-mobile-menu-btn"
            onClick={() => setMobileMenuOpen((v) => !v)}
            aria-label={t("shell.nav.project")}
            aria-expanded={mobileMenuOpen}
          >
            <Menu size={18} />
          </button>
          <div className="ehs-shell-crumbs">
            <button
              type="button"
              className="ehs-shell-crumb-link"
              onClick={() => onOpenProjects ? onOpenProjects() : onChangeView("oversikt")}
            >
              {t("shell.breadcrumb.projects")}
            </button>
            <span className="ehs-shell-crumb-sep">/</span>
            <span className="ehs-shell-crumb-current" title={projectTitle}>
              {projectTitle || t("shell.breadcrumb.untitled")}
            </span>
            {projectStatus ? (
              <span
                className="ehs-shell-status"
                style={statusToneStyle(projectStatus.tone)}
              >
                {projectStatus.label}
              </span>
            ) : null}
            {cloudSavedAt ? (
              <span className="ehs-shell-saved ehs-shell-saved--cloud" title={t("shell.savedCloud", { time: cloudSavedAt })}>
                <span className="ehs-shell-saved-dot ehs-shell-saved-dot--cloud" /> {t("shell.savedCloud", { time: cloudSavedAt })}
              </span>
            ) : savedAt ? (
              <span className="ehs-shell-saved" title={t("shell.savedTitle")}>
                <span className="ehs-shell-saved-dot" /> {t("shell.saved", { time: savedAt })}
              </span>
            ) : null}
          </div>

          <div className="ehs-shell-topbar-actions">
            {secondaryActions.map((a) => {
              const Icon = a.icon;
              return (
                <button
                  key={a.id}
                  type="button"
                  className="ehs-shell-action"
                  style={actionVariantStyle(a.variant ?? "secondary")}
                  onClick={a.onClick}
                  title={a.title ?? a.label}
                >
                  {Icon ? <Icon size={13} /> : null}
                  <span>{a.label}</span>
                </button>
              );
            })}
            {primaryActions.map((a) => {
              const Icon = a.icon;
              return (
                <button
                  key={a.id}
                  type="button"
                  className="ehs-shell-action"
                  style={actionVariantStyle(a.variant ?? "primary")}
                  onClick={a.onClick}
                  title={a.title ?? a.label}
                >
                  {Icon ? <Icon size={13} /> : null}
                  <span>{a.label}</span>
                </button>
              );
            })}
            {overflowActions.length > 0 ? (
              <div style={{ position: "relative" }} ref={overflowRef}>
                <button
                  type="button"
                  className="ehs-shell-icon-btn"
                  onClick={() => setOverflowOpen((v) => !v)}
                  aria-label={t("shell.moreActions")}
                  aria-haspopup="menu"
                  aria-expanded={overflowOpen}
                  title={t("shell.moreActions")}
                >
                  <MoreHorizontal size={14} />
                </button>
                {overflowOpen ? (
                  <div
                    className="ehs-shell-menu"
                    role="menu"
                    style={{ right: 0, left: "auto" }}
                  >
                    {overflowActions.map((a) => {
                      const Icon = a.icon;
                      return (
                        <button
                          key={a.id}
                          type="button"
                          role="menuitem"
                          className="ehs-shell-menu-item"
                          onClick={() => {
                            setOverflowOpen(false);
                            a.onClick();
                          }}
                          title={a.title ?? a.label}
                        >
                          {Icon ? <Icon size={12} /> : null}
                          <span>{a.label}</span>
                        </button>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        </header>

        <div className="ehs-shell-glow" aria-hidden />
        <div className="ehs-shell-content">{children}</div>
      </main>

      <CommandPalette
        open={cmdOpen}
        onClose={() => setCmdOpen(false)}
        onNavigate={(v) => handleChangeView(v)}
        actions={allActions}
        showHotel={showHotel}
        showCatering={showCatering}
      />
    </div>
  );
}

export { Bell, Download, MapPin, Share2 };
