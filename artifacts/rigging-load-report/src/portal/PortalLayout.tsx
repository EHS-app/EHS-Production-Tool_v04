import { type ReactNode } from "react";
import { Link } from "wouter";
import { useClerk } from "@clerk/react";
import ehsLogo from "../assets/ehs-logo.png";
import { PALETTE, PORTAL_FONT, type ThemeMode } from "./lib/portalTheme";

export type PortalNavKey =
  | "hub"
  | "gigs"
  | "availability"
  | "earnings"
  | "profile";

type NavItem = {
  key: PortalNavKey;
  label: string;
  href: string;
  icon: string;
};

const NAV: NavItem[] = [
  { key: "hub", label: "Hub", href: "/portal", icon: "◉" },
  { key: "gigs", label: "Gigs", href: "/portal/gigs", icon: "▤" },
  {
    key: "availability",
    label: "Availability",
    href: "/portal/availability",
    icon: "◐",
  },
  { key: "earnings", label: "Earnings", href: "/portal/earnings", icon: "kr" },
  { key: "profile", label: "Profile", href: "/portal/profile", icon: "◆" },
];

export function PortalLayout({
  theme,
  onToggleTheme,
  active,
  userLabel,
  children,
}: {
  theme: ThemeMode;
  onToggleTheme: () => void;
  active: PortalNavKey;
  userLabel: string;
  children: ReactNode;
}) {
  const c = PALETTE[theme];
  const { signOut } = useClerk();

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
              Freelance Portal
            </span>
            <span style={{ fontSize: 11, color: c.muted, fontWeight: 500 }}>
              EHS personal logbook
            </span>
          </div>
        </Link>

        <div style={{ flex: 1 }} />

        <Link
          href="/"
          title="Switch to Production Tool"
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
          <span className="ehs-portal-only-desktop">Production Tool</span>
          <span className="ehs-portal-only-mobile" aria-hidden>
            Tool
          </span>
        </Link>

        <button
          type="button"
          onClick={onToggleTheme}
          title={theme === "dark" ? "Light mode" : "Dark mode"}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "7px 12px",
            fontSize: 13,
            fontWeight: 600,
            borderRadius: 8,
            cursor: "pointer",
            background: c.cardBgSubtle,
            color: c.text,
            border: `1px solid ${c.border}`,
            fontFamily: PORTAL_FONT,
          }}
        >
          <span aria-hidden>{theme === "dark" ? "☀" : "☾"}</span>
        </button>

        <button
          type="button"
          onClick={() => {
            try {
              sessionStorage.setItem("ehs-skip-dev-auto-signin", "1");
            } catch {
              /* sessionStorage may be unavailable */
            }
            void signOut();
          }}
          title={`Signed in as ${userLabel}. Click to sign out.`}
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
          <span>Sign out</span>
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
                <span>{item.label}</span>
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
        aria-label="Portal sections"
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
          return (
            <Link
              key={item.key}
              href={item.href}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 2,
                padding: "6px 8px",
                fontSize: 11,
                fontWeight: 600,
                textDecoration: "none",
                color: isActive ? c.accent : c.muted,
                minWidth: 56,
              }}
              data-active={isActive}
            >
              <span style={{ fontSize: 16 }} aria-hidden>
                {item.icon}
              </span>
              <span>{item.label}</span>
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
        }
      `}</style>
    </div>
  );
}
