import React, { useState } from "react";
import {
  Activity,
  Users,
  Calendar,
  Truck,
  CheckSquare,
  DollarSign,
  FolderKanban,
  Settings,
  ChevronDown,
  LogOut,
  Menu,
  MoreHorizontal,
  MapPin,
  Building2,
  HelpCircle,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import ehsLogo from "../../assets/ehs-logo.png";
import { useI18n } from "../../lib/i18n/I18nContext";
import { LanguageSelector } from "../LanguageSelector";

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
  onHelp: () => void;
  children: React.ReactNode;
}

const NAV_GROUPS = [
  {
    key: "global.group.operations",
    emoji: "🚧",
    items: [
      { id: "home", key: "global.nav.home", icon: Activity },
      { id: "projects", key: "global.nav.projects", icon: FolderKanban },
      { id: "calendar", key: "global.nav.calendar", icon: Calendar },
      { id: "crew", key: "global.nav.crew", icon: Users },
      { id: "transport", key: "global.nav.transport", icon: Truck },
      { id: "tasks", key: "global.nav.tasks", icon: CheckSquare },
      { id: "economy", key: "global.nav.economy", icon: DollarSign },
    ]
  },
  {
    key: "global.group.directories",
    emoji: "🗂️",
    items: [
      { id: "venues", key: "global.nav.venues", icon: MapPin },
      { id: "clients", key: "global.nav.clients", icon: Building2 },
    ]
  },
  {
    key: "global.group.system",
    emoji: "⚙️",
    items: [
      { id: "settings", key: "global.nav.settings", icon: Settings },
    ]
  }
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
  onHelp,
  children,
}: GlobalShellProps) {
  const { t, locale, setLocale } = useI18n();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [themeOpen, setThemeOpen] = useState(false);

  const handleChangeView = (next: GlobalView) => {
    setMobileMenuOpen(false);
    onChangeView(next);
  };

  const allItems: Array<{
    id: GlobalView;
    key: Parameters<typeof t>[0];
  }> = [];
  NAV_GROUPS.forEach((group) => {
    group.items.forEach((item) => {
      allItems.push(item);
    });
  });
  const activeItem = allItems.find((item) => item.id === view);
  const activeLabel = activeItem
    ? t(activeItem.key)
    : view === "projects"
      ? t("global.nav.projects")
      : "EHS Hub";

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
          {NAV_GROUPS.map((group) => (
            <div key={group.key} style={{ marginTop: group.key === "global.group.operations" ? 18 : 32 }}>
              <div className="ehs-shell-nav-label">
                {group.emoji} {t(group.key)}
              </div>
              {group.items.map((item) => {
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
          ))}
        </nav>

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
              collisionPadding={16}
            >
                <div className="ehs-shell-menu-label">{t("global.menu.theme")}</div>
                {(["light", "dark", "system"] as const).map((opt) => (
                  <DropdownMenuItem
                    key={opt}
                    aria-checked={themePref === opt}
                    className={`ehs-shell-menu-item${themePref === opt ? " is-active" : ""}`}
                    onSelect={(e) => { e.preventDefault(); onChangeTheme(opt); }}
                  >
                    {t(`global.menu.theme.${opt}`)}
                  </DropdownMenuItem>
                ))}
                <div className="ehs-shell-menu-sep" />
                <div className="ehs-shell-menu-label">{t("language.label")}</div>
                {(["en", "no"] as const).map((lang) => (
                  <DropdownMenuItem
                    key={lang}
                    aria-checked={locale === lang}
                    className={`ehs-shell-menu-item${locale === lang ? " is-active" : ""}`}
                    onSelect={(e) => { e.preventDefault(); setLocale(lang); }}
                  >
                    {t(`language.${lang === "en" ? "english" : "norwegian"}`)}
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
          <div className="ehs-shell-topbar-actions">
            <button
              type="button"
              className="ehs-shell-action ehs-shell-help-action"
              onClick={onHelp}
              title={t("header.helpTitle")}
              aria-label={t("header.help")}
            >
              <HelpCircle size={14} />
              <span>{t("header.help")}</span>
            </button>
            <LanguageSelector />
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
