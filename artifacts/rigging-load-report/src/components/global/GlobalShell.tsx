import React, { useState } from "react";
import {
  Activity,
  Briefcase,
  Users,
  Calendar,
  Truck,
  CheckSquare,
  DollarSign,
  Settings,
  ChevronDown,
  LogOut,
  Menu,
  MoreHorizontal,
  MapPin,
  Building2
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import ehsLogo from "../../assets/ehs-logo.png";
import { useT } from "../../lib/i18n/I18nContext";

export type GlobalView =
  | "home"
  | "projects"
  | "crew"
  | "calendar"
  | "transport"
  | "tasks"
  | "economy"
  | "venues"
  | "clients"
  | "settings";

interface GlobalShellProps {
  view: GlobalView;
  onChangeView: (next: GlobalView) => void;
  userInitial: string;
  userName: string;
  userRole: string;
  themePref: "light" | "dark" | "system";
  onChangeTheme: (next: "light" | "dark" | "system") => void;
  onSignOut: () => void;
  children: React.ReactNode;
}

const NAV_ITEMS = [
  { id: "home", key: "global.nav.home", icon: Activity },
  { id: "projects", key: "global.nav.projects", icon: Briefcase },
  { id: "clients", key: "global.nav.clients", icon: Building2 },
  { id: "venues", key: "global.nav.venues", icon: MapPin },
  { id: "crew", key: "global.nav.crew", icon: Users },
  { id: "calendar", key: "global.nav.calendar", icon: Calendar },
  { id: "transport", key: "global.nav.transport", icon: Truck },
  { id: "tasks", key: "global.nav.tasks", icon: CheckSquare },
  { id: "economy", key: "global.nav.economy", icon: DollarSign },
] as const;

const NAV_BOTTOM = [
  { id: "settings", key: "global.nav.settings", icon: Settings },
] as const;

export function GlobalShell({
  view,
  onChangeView,
  userInitial,
  userName,
  userRole,
  themePref,
  onChangeTheme,
  onSignOut,
  children,
}: GlobalShellProps) {
  const t = useT();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [themeOpen, setThemeOpen] = useState(false);

  const handleChangeView = (next: GlobalView) => {
    setMobileMenuOpen(false);
    onChangeView(next);
  };

  const activeItem = [...NAV_ITEMS, ...NAV_BOTTOM].find((item) => item.id === view);
  const activeLabel = activeItem ? t(activeItem.key) : "EHS Hub";

  return (
    <div className="ehs-shell">
      {mobileMenuOpen ? (
        <div
          className="ehs-shell-backdrop"
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden
        />
      ) : null}
      <aside className={`ehs-shell-aside${mobileMenuOpen ? " is-open" : ""}`}>
        <div className="ehs-shell-workspace ehs-shell-workspace--stacked">
          <div className="ehs-shell-workspace-mark">
            <img
              src={ehsLogo}
              alt="EHS Lyd, Lys, Bilder"
              className="ehs-shell-workspace-logo"
            />
          </div>
          <div className="ehs-shell-workspace-text">
            <div className="ehs-shell-workspace-name">{t("global.workspace.productionTool")}</div>
          </div>
          <ChevronDown size={14} className="ehs-shell-workspace-chevron" />
        </div>

        <nav className="ehs-shell-nav">
          <div style={{ marginTop: 18 }}>
            <div className="ehs-shell-nav-label">{t("global.nav.hq")}</div>
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const active = item.id === view;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleChangeView(item.id as GlobalView)}
                  className={`ehs-shell-nav-item${active ? " is-active" : ""}`}
                >
                  <Icon size={15} strokeWidth={1.75} />
                  <span style={{ flex: 1, textAlign: "left" }}>{t(item.key)}</span>
                </button>
              );
            })}
          </div>
        </nav>

        <div style={{ padding: "0 12px", marginTop: "auto", marginBottom: 4 }}>
          {NAV_BOTTOM.map((item) => {
            const Icon = item.icon;
            const active = item.id === view;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleChangeView(item.id as GlobalView)}
                className={`ehs-shell-nav-item${active ? " is-active" : ""}`}
                style={{ background: active ? "" : "none", border: "none", cursor: "pointer", width: "100%" }}
              >
                <Icon size={15} strokeWidth={1.75} />
                  <span style={{ flex: 1, textAlign: "left" }}>{t(item.key)}</span>
              </button>
            );
          })}
        </div>

        <div className="ehs-shell-user">
          <div className="ehs-shell-user-avatar">{userInitial.toUpperCase()}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="ehs-shell-user-name">{userName}</div>
            <div className="ehs-shell-user-role">{userRole}</div>
          </div>
          <DropdownMenu open={themeOpen} onOpenChange={setThemeOpen}>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="ehs-shell-icon-btn"
                title={t("global.menu.settings")}
                aria-label={t("global.menu.settings")}
              >
                <MoreHorizontal size={14} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="ehs-shell-menu"
              side="top"
              align="end"
              sideOffset={6}
            >
                <div className="ehs-shell-menu-label">{t("global.menu.theme")}</div>
                {(["light", "dark", "system"] as const).map((opt) => (
                  <DropdownMenuItem
                    key={opt}
                    aria-checked={themePref === opt}
                    className={`ehs-shell-menu-item${themePref === opt ? " is-active" : ""}`}
                    onSelect={() => onChangeTheme(opt)}
                  >
                    {t(`global.menu.theme.${opt}`)}
                  </DropdownMenuItem>
                ))}
                <div className="ehs-shell-menu-sep" />
                <DropdownMenuItem
                  className="ehs-shell-menu-item is-danger"
                  onSelect={onSignOut}
                >
                  <LogOut size={12} /> {t("global.menu.signOut")}
                </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      <main className="ehs-shell-main">
        <header className="ehs-shell-topbar">
          <button
            type="button"
            className="ehs-shell-mobile-menu-btn"
            onClick={() => setMobileMenuOpen((v) => !v)}
            aria-label={t("global.menu.open")}
            aria-expanded={mobileMenuOpen}
          >
            <Menu size={18} />
          </button>
          <div className="ehs-shell-crumbs">
            <span className="ehs-shell-crumb-link">{t("global.breadcrumb.operationsHub")}</span>
            <span className="ehs-shell-crumb-sep">/</span>
            <span className="ehs-shell-crumb-current">{activeLabel}</span>
          </div>
        </header>

        <div className="ehs-shell-glow" aria-hidden />
        <div className="ehs-shell-content">
          {children}
        </div>
      </main>
    </div>
  );
}
