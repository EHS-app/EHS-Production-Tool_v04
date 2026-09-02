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
  MoreHorizontal
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";

export type GlobalView =
  | "home"
  | "projects"
  | "crew"
  | "calendar"
  | "transport"
  | "tasks"
  | "economy"
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
  { id: "home", label: "Home", icon: Activity },
  { id: "projects", label: "Projects Database", icon: Briefcase },
  { id: "crew", label: "Global Crew Directory", icon: Users },
  { id: "calendar", label: "Master Calendar", icon: Calendar },
  { id: "transport", label: "Transport & Logistics", icon: Truck },
  { id: "tasks", label: "Task Management", icon: CheckSquare },
  { id: "economy", label: "Economy", icon: DollarSign },
];

const NAV_BOTTOM = [
  { id: "settings", label: "System Settings", icon: Settings },
];

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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [themeOpen, setThemeOpen] = useState(false);

  const handleChangeView = (next: GlobalView) => {
    setMobileMenuOpen(false);
    onChangeView(next);
  };

  const activeLabel = [...NAV_ITEMS, ...NAV_BOTTOM].find((i) => i.id === view)?.label || "EHS Hub";

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
          <div className="ehs-shell-workspace-mark" style={{ background: "var(--primary)", color: "#fff" }}>
            EHS
          </div>
          <div className="ehs-shell-workspace-text">
            <div className="ehs-shell-workspace-name">Operations Hub</div>
            <div className="ehs-shell-workspace-sub">Global Production</div>
          </div>
          <ChevronDown size={14} className="ehs-shell-workspace-chevron" />
        </div>

        <nav className="ehs-shell-nav">
          <div style={{ marginTop: 18 }}>
            <div className="ehs-shell-nav-label">HQ</div>
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
                  <span style={{ flex: 1, textAlign: "left" }}>{item.label}</span>
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
                <span style={{ flex: 1, textAlign: "left" }}>{item.label}</span>
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
                title="Settings"
                aria-label="Settings"
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
                <div className="ehs-shell-menu-label">Theme</div>
                {(["light", "dark", "system"] as const).map((opt) => (
                  <DropdownMenuItem
                    key={opt}
                    aria-checked={themePref === opt}
                    className={`ehs-shell-menu-item${themePref === opt ? " is-active" : ""}`}
                    onSelect={() => onChangeTheme(opt)}
                  >
                    {opt.charAt(0).toUpperCase() + opt.slice(1)}
                  </DropdownMenuItem>
                ))}
                <div className="ehs-shell-menu-sep" />
                <DropdownMenuItem
                  className="ehs-shell-menu-item is-danger"
                  onSelect={onSignOut}
                >
                  <LogOut size={12} /> Sign Out
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
            aria-label="Menu"
            aria-expanded={mobileMenuOpen}
          >
            <Menu size={18} />
          </button>
          <div className="ehs-shell-crumbs">
            <span className="ehs-shell-crumb-link">Operations Hub</span>
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
