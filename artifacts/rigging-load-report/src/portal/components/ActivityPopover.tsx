import React from "react";
import { createPortal } from "react-dom";
import { Link } from "wouter";
import { Bell, CalendarDays, Inbox } from "lucide-react";
import { useT } from "../../lib/i18n/I18nContext";
import type { ThemeMode } from "../lib/portalTheme";
import type { PortalData } from "../lib/portalStorage";

type Position = {
  top: number;
  right: number;
  width: string;
};

function startOfToday(): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today.getTime();
}

function formatDate(value: string): string {
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(document.documentElement.lang || "no", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

export function ActivityPopover({
  theme,
  data,
}: {
  theme: ThemeMode;
  data: PortalData;
}) {
  const t = useT();
  const [open, setOpen] = React.useState(false);
  const [position, setPosition] = React.useState<Position>({
    top: 56,
    right: 8,
    width: "calc(100vw - 16px)",
  });
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const popoverRef = React.useRef<HTMLDivElement>(null);

  const upcomingGigs = React.useMemo(() => {
    const today = startOfToday();
    return data.gigs
      .filter(
        (gig) =>
          Boolean(gig.startDate) &&
          new Date(`${gig.startDate}T00:00:00`).getTime() >= today &&
          (gig.status === "invited" || gig.status === "confirmed"),
      )
      .sort((a, b) => a.startDate.localeCompare(b.startDate))
      .slice(0, 3);
  }, [data.gigs]);

  const recentAssignments = React.useMemo(() => {
    const recentCutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
    return data.briefs
      .filter(
        (brief) =>
          brief.decision === "pending" || brief.receivedAt >= recentCutoff,
      )
      .sort((a, b) => b.receivedAt - a.receivedAt)
      .slice(0, 3);
  }, [data.briefs]);

  const hasActivity = upcomingGigs.length > 0 || recentAssignments.length > 0;

  const updatePosition = React.useCallback(() => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const mobile = window.innerWidth < 640;
    setPosition({
      top: rect.bottom + 8,
      right: mobile ? 8 : Math.max(16, window.innerWidth - rect.right),
      width: mobile ? "calc(100vw - 16px)" : "320px",
    });
  }, []);

  React.useEffect(() => {
    if (!open) return;
    updatePosition();
    const closeOnOutside = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node;
      if (
        triggerRef.current?.contains(target) ||
        popoverRef.current?.contains(target)
      ) {
        return;
      }
      setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    document.addEventListener("mousedown", closeOnOutside);
    document.addEventListener("touchstart", closeOnOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
      document.removeEventListener("mousedown", closeOnOutside);
      document.removeEventListener("touchstart", closeOnOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open, updatePosition]);

  const panel =
    open && typeof document !== "undefined"
      ? createPortal(
          <div
            ref={popoverRef}
            role="dialog"
            aria-label={t("portal.activity.title")}
            className="fixed right-2 sm:right-4 z-50 mt-2 w-[calc(100vw-16px)] max-w-sm sm:w-80 rounded-xl bg-white border-slate-200 text-slate-800 shadow-2xl dark:bg-slate-900 dark:border-slate-800 dark:text-slate-200"
            style={{
              position: "fixed",
              top: position.top,
              right: position.right,
              zIndex: 1000,
              width: position.width,
              maxWidth: 384,
              maxHeight: "min(620px, calc(100dvh - 80px))",
              overflowY: "auto",
              borderRadius: 14,
              border: `1px solid ${theme === "dark" ? "#1e293b" : "#e2e8f0"}`,
              background: theme === "dark" ? "#0f172a" : "#ffffff",
              color: theme === "dark" ? "#e2e8f0" : "#1e293b",
              boxShadow:
                theme === "dark"
                  ? "0 24px 60px rgba(0,0,0,0.55)"
                  : "0 20px 48px rgba(15,23,42,0.18)",
            }}
          >
            <div style={{ padding: "16px 16px 10px", fontWeight: 800 }}>
              {t("portal.activity.title")}
            </div>

            {!hasActivity ? (
              <div
                style={{
                  padding: "28px 16px",
                  textAlign: "center",
                  color: theme === "dark" ? "#94a3b8" : "#64748b",
                  fontSize: 13,
                }}
              >
                {t("portal.activity.empty")}
              </div>
            ) : (
              <>
                {upcomingGigs.length > 0 ? (
                  <ActivitySection
                    title={t("portal.activity.upcoming")}
                    icon={<CalendarDays size={15} />}
                    theme={theme}
                  >
                    {upcomingGigs.map((gig) => (
                      <ActivityRow
                        key={gig.id}
                        title={gig.projectName || t("portal.activity.shift")}
                        meta={[
                          formatDate(gig.startDate),
                          gig.client,
                          gig.venue,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                        theme={theme}
                      />
                    ))}
                  </ActivitySection>
                ) : null}

                {recentAssignments.length > 0 ? (
                  <ActivitySection
                    title={t("portal.activity.recent")}
                    icon={<Inbox size={15} />}
                    theme={theme}
                  >
                    {recentAssignments.map((assignment) => (
                      <ActivityRow
                        key={assignment.briefId}
                        title={
                          assignment.brief.project.venue ||
                          assignment.brief.project.client ||
                          t("portal.activity.assignment")
                        }
                        meta={`${t(
                          `portal.activity.status.${assignment.decision}`,
                        )} · ${formatDate(
                          new Date(assignment.receivedAt)
                            .toISOString()
                            .slice(0, 10),
                        )}`}
                        theme={theme}
                      />
                    ))}
                  </ActivitySection>
                ) : null}
              </>
            )}

            <Link
              href="/portal/gigs"
              onClick={() => setOpen(false)}
              style={{
                display: "block",
                padding: "12px 16px",
                borderTop: `1px solid ${
                  theme === "dark" ? "#1e293b" : "#e2e8f0"
                }`,
                color: theme === "dark" ? "#fb923c" : "#c2410c",
                fontSize: 13,
                fontWeight: 800,
                textAlign: "center",
                textDecoration: "none",
              }}
            >
              {t("portal.activity.viewAll")}
            </Link>
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className="ehs-shell-icon-btn ehs-portal-mobile-utility"
        onClick={() => setOpen((value) => !value)}
        aria-label={t("portal.activity.bellAria")}
        aria-expanded={open}
        title={t("portal.activity.bellAria")}
        style={{ position: "relative" }}
      >
        <Bell size={14} />
        {hasActivity ? (
          <span
            aria-hidden
            style={{
              position: "absolute",
              top: 4,
              right: 4,
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: "#f97316",
              boxShadow: `0 0 0 2px ${theme === "dark" ? "#0f172a" : "#ffffff"}`,
            }}
          />
        ) : null}
      </button>
      {panel}
    </>
  );
}

function ActivitySection({
  title,
  icon,
  theme,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  theme: ThemeMode;
  children: React.ReactNode;
}) {
  return (
    <section
      style={{
        padding: "10px 16px 12px",
        borderTop: `1px solid ${theme === "dark" ? "#1e293b" : "#e2e8f0"}`,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 7,
          marginBottom: 5,
          color: theme === "dark" ? "#cbd5e1" : "#475569",
          fontSize: 11,
          fontWeight: 800,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
        }}
      >
        {icon}
        {title}
      </div>
      {children}
    </section>
  );
}

function ActivityRow({
  title,
  meta,
  theme,
}: {
  title: string;
  meta: string;
  theme: ThemeMode;
}) {
  return (
    <div style={{ padding: "7px 0" }}>
      <div style={{ fontSize: 13, fontWeight: 750 }}>{title}</div>
      <div
        style={{
          marginTop: 2,
          color: theme === "dark" ? "#94a3b8" : "#64748b",
          fontSize: 12,
          lineHeight: 1.4,
        }}
      >
        {meta}
      </div>
    </div>
  );
}