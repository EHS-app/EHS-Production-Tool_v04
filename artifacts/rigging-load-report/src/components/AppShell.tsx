import React, { type ReactNode } from "react";
import { Link } from "wouter";
import {
  Activity,
  AlignLeft,
  Bed,
  Bell,
  Briefcase,
  ChevronDown,
  Coffee,
  Command,
  Download,
  LogOut,
  MapPin,
  MonitorPlay,
  MoreHorizontal,
  Plus,
  Search,
  Share2,
  Speaker,
  Users,
  Zap,
  LayoutGrid,
} from "lucide-react";
import type { ThemePreference } from "../main";

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
  | "riggPlan";

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
  children: ReactNode;
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: "Prosjekt",
    items: [
      { id: "oversikt", label: "Oversikt", icon: Activity },
      { id: "rigging", label: "Rigg", icon: Briefcase },
      { id: "lighting", label: "Lys", icon: Zap },
      { id: "led", label: "LED", icon: MonitorPlay },
      { id: "sound", label: "Lyd", icon: Speaker },
      { id: "stage", label: "Scene", icon: AlignLeft },
      { id: "riggPlan", label: "Rigg-plan", icon: LayoutGrid },
    ],
  },
  {
    label: "Logistikk",
    items: [
      { id: "crew", label: "Crew", icon: Users },
      { id: "hotel", label: "Hotell", icon: Bed },
      { id: "catering", label: "Catering", icon: Coffee },
    ],
  },
];

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
  children,
}: AppShellProps) {
  const [overflowOpen, setOverflowOpen] = React.useState(false);
  const [themeOpen, setThemeOpen] = React.useState(false);
  const overflowRef = React.useRef<HTMLDivElement | null>(null);
  const themeRef = React.useRef<HTMLDivElement | null>(null);

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
  const groups = NAV_GROUPS.map((g) => ({
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
      {/* SIDEBAR */}
      <aside className="ehs-shell-aside">
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
            title="Søk i prosjektet (kommer snart)"
            disabled
          >
            <Search size={14} />
            <span>Søk i prosjekt</span>
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
            onClick={() => onChangeView("rigging")}
            title="Legg til nytt system"
            style={{ marginTop: 4 }}
          >
            <Plus size={14} />
            <span>Nytt system</span>
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
                    onClick={() => onChangeView(item.id)}
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
              title="Innstillinger"
              aria-label="Innstillinger"
              aria-haspopup="menu"
              aria-expanded={themeOpen}
            >
              <MoreHorizontal size={14} />
            </button>
            {themeOpen ? (
              <div className="ehs-shell-menu" role="menu">
                <div className="ehs-shell-menu-label">Tema</div>
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
                    {opt === "light" ? "Lys" : opt === "dark" ? "Mørk" : "System"}
                  </button>
                ))}
                <div className="ehs-shell-menu-sep" />
                <Link
                  href="/portal"
                  className="ehs-shell-menu-item"
                  onClick={() => setThemeOpen(false)}
                >
                  Freelance Portal
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
                  <LogOut size={12} /> Logg ut
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
            <button
              type="button"
              className="ehs-shell-crumb-link"
              onClick={() => onChangeView("oversikt")}
            >
              Prosjekter
            </button>
            <span className="ehs-shell-crumb-sep">/</span>
            <span className="ehs-shell-crumb-current" title={projectTitle}>
              {projectTitle || "Uten navn"}
            </span>
            {projectStatus ? (
              <span
                className="ehs-shell-status"
                style={statusToneStyle(projectStatus.tone)}
              >
                {projectStatus.label}
              </span>
            ) : null}
            {savedAt ? (
              <span className="ehs-shell-saved" title="Lagret lokalt i nettleseren">
                <span className="ehs-shell-saved-dot" /> Lagret {savedAt}
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
                  aria-label="Flere handlinger"
                  aria-haspopup="menu"
                  aria-expanded={overflowOpen}
                  title="Flere handlinger"
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
    </div>
  );
}

export { Bell, Download, MapPin, Share2 };
