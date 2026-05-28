import React from "react";
import {
  Activity,
  AlignLeft,
  Bed,
  Briefcase,
  Calendar,
  Coffee,
  MapPin,
  MonitorPlay,
  Speaker,
  Users,
  Zap,
  ArrowUpRight,
} from "lucide-react";
import type { ShellView } from "./AppShell";
import { useT } from "../lib/i18n/I18nContext";

/**
 * Linear v2 dashboard — the new "Oversikt" landing page.
 *
 * Renders project header, KPI strip, crew snapshot, technical systems
 * cards, hotel/catering chips, and an activity feed against real app
 * state. Inline-styled to match the rest of the app and to keep the
 * graduation contained without introducing Tailwind into the main app.
 */

export interface OverviewKpi {
  label: string;
  value: string;
  caption?: string;
  progressValue?: number;
  progressMax?: number;
  progressColor?: string;
  trend?: { label: string; tone: "up" | "down" | "neutral" };
  icon?: React.ComponentType<{ size?: number }>;
}

export interface OverviewCrewRow {
  id: string;
  name: string;
  role: string;
  status: "confirmed" | "pending" | "declined" | "cancelled" | "draft";
  blocks: Array<{ dayLabel: string; timeLabel: string | null }>;
}

export interface OverviewSystemCard {
  id: string;
  title: string;
  subtitle: string;
  icon: "rig" | "led" | "sound" | "lights" | "stage";
  rows: Array<{ label: string; value: string; warn?: boolean }>;
}

export interface OverviewActivityItem {
  id: string;
  title: string;
  body?: string;
  timeLabel: string;
  tone: "success" | "info" | "warning" | "neutral";
}

interface Props {
  projectTitle: string;
  dateLabel: string;
  venueLabel: string;
  metaSlot?: React.ReactNode;
  kpis: OverviewKpi[];
  crewRows: OverviewCrewRow[];
  crewDayHeaders: string[];
  crewSummary: string;
  systems: OverviewSystemCard[];
  hotelSummary?: { headline: string; sub: string; cta?: { label: string; onClick: () => void } } | null;
  cateringSummary?: { headline: string; sub: string; cta?: { label: string; onClick: () => void } } | null;
  activity: OverviewActivityItem[];
  onJump: (view: ShellView) => void;
}

const SYSTEM_ICON: Record<OverviewSystemCard["icon"], React.ComponentType<{ size?: number }>> = {
  rig: Briefcase,
  led: MonitorPlay,
  sound: Speaker,
  lights: Zap,
  stage: AlignLeft,
};

function statusBlockStyle(
  status: OverviewCrewRow["status"],
  empty: boolean,
): React.CSSProperties {
  if (empty) {
    return {
      background: "transparent",
      color: "transparent",
      border: "1px dashed transparent",
    };
  }
  switch (status) {
    case "confirmed":
      // Accepted / confirmed crew read as "locked in" — green pill so
      // the producer can scan the row and instantly see who has said
      // yes vs. who is still pending (amber) vs. declined (red).
      return {
        background: "rgba(22,163,74,0.16)",
        border: "1px solid rgba(22,163,74,0.34)",
        color: "#4ade80",
      };
    case "pending":
      return {
        background: "rgba(245,158,11,0.10)",
        border: "1px dashed rgba(245,158,11,0.32)",
        color: "#fbbf24",
      };
    case "declined":
    case "cancelled":
      return {
        background: "rgba(244,63,94,0.10)",
        border: "1px solid rgba(244,63,94,0.25)",
        color: "#fb7185",
      };
    default:
      return {
        background: "rgba(255,255,255,0.04)",
        border: "1px solid var(--border-color)",
        color: "var(--text-main)",
      };
  }
}

function statusDotColor(s: OverviewCrewRow["status"]) {
  switch (s) {
    case "confirmed":
      return "#22c55e";
    case "pending":
      return "#f59e0b";
    case "declined":
    case "cancelled":
      return "#f43f5e";
    default:
      return "#9999A6";
  }
}

function activityToneStyle(tone: OverviewActivityItem["tone"]): React.CSSProperties {
  switch (tone) {
    case "success":
      return { color: "#10b981", background: "rgba(16,185,129,0.10)" };
    case "warning":
      return { color: "#f59e0b", background: "rgba(245,158,11,0.10)" };
    case "info":
      return { color: "#F88000", background: "rgba(248,128,0,0.10)" };
    default:
      return { color: "var(--text-muted)", background: "rgba(255,255,255,0.04)" };
  }
}

export function OverviewView({
  projectTitle,
  dateLabel,
  venueLabel,
  metaSlot,
  kpis,
  crewRows,
  crewDayHeaders,
  crewSummary,
  systems,
  hotelSummary,
  cateringSummary,
  activity,
  onJump,
}: Props) {
  const t = useT();
  return (
    <div className="ehs-overview">
      {/* Title */}
      <header className="ehs-overview-head">
        <h1 className="ehs-overview-title">{projectTitle || t("shell.breadcrumb.untitled")}</h1>
        <div className="ehs-overview-meta">
          {dateLabel ? (
            <span className="ehs-overview-meta-item">
              <Calendar size={13} />
              <span>{dateLabel}</span>
            </span>
          ) : null}
          {venueLabel ? (
            <span className="ehs-overview-meta-item">
              <MapPin size={13} />
              <span>{venueLabel}</span>
            </span>
          ) : null}
        </div>
        {metaSlot ? <div className="ehs-overview-meta-slot">{metaSlot}</div> : null}
      </header>

      {/* KPI strip */}
      <div className="ehs-overview-kpis">
        {kpis.map((k) => {
          const pct =
            k.progressValue != null && k.progressMax && k.progressMax > 0
              ? Math.min(100, Math.max(0, (k.progressValue / k.progressMax) * 100))
              : null;
          const Icon = k.icon;
          return (
            <div key={k.label} className="ehs-card ehs-overview-kpi">
              <div className="ehs-overview-kpi-head">
                <span>{k.label}</span>
                {Icon ? <Icon size={13} /> : null}
              </div>
              <div className="ehs-overview-kpi-value">
                {k.value}
                {k.caption ? <span className="ehs-overview-kpi-caption">{k.caption}</span> : null}
              </div>
              <div className="ehs-overview-kpi-track">
                <div
                  className="ehs-overview-kpi-fill"
                  style={{
                    width: pct != null ? `${pct}%` : "0%",
                    background: k.progressColor ?? "var(--primary)",
                  }}
                />
              </div>
              {k.trend ? (
                <div
                  className="ehs-overview-kpi-trend"
                  style={{
                    color:
                      k.trend.tone === "up"
                        ? "#10b981"
                        : k.trend.tone === "down"
                        ? "#f43f5e"
                        : "var(--text-muted)",
                  }}
                >
                  {k.trend.label}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      <div className="ehs-overview-grid">
        {/* LEFT: crew + systems */}
        <div className="ehs-overview-col-main">
          <section>
            <div className="ehs-overview-section-head">
              <h2 className="ehs-overview-section-title">
                <Users size={14} style={{ color: "var(--primary)" }} /> {t("overview.crewSchedule")}
              </h2>
              <button
                type="button"
                className="ehs-overview-section-action"
                onClick={() => onJump("crew")}
              >
                {t("overview.viewFullSchedule")} <ArrowUpRight size={12} />
              </button>
            </div>
            <div className="ehs-card ehs-overview-crew">
              {crewRows.length === 0 ? (
                <div className="ehs-overview-empty">
                  {t("overview.noCrew")}{" "}
                  <button
                    type="button"
                    className="ehs-overview-link"
                    onClick={() => onJump("crew")}
                  >
                    {t("overview.addCrew")}
                  </button>
                </div>
              ) : (
                <div className="ehs-overview-crew-scroll">
                  <table className="ehs-overview-crew-table">
                    <thead>
                      <tr>
                        <th style={{ width: "30%" }}>{t("overview.nameRole")}</th>
                        {crewDayHeaders.map((h) => (
                          <th key={h}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {crewRows.map((row) => (
                        <tr key={row.id}>
                          <td>
                            <div className="ehs-overview-crew-name-row">
                              <span
                                className="ehs-overview-crew-dot"
                                style={{ background: statusDotColor(row.status) }}
                                aria-hidden
                              />
                              <div style={{ minWidth: 0 }}>
                                <div className="ehs-overview-crew-name">{row.name || t("shell.breadcrumb.untitled")}</div>
                                <div className="ehs-overview-crew-role">{row.role || "—"}</div>
                              </div>
                            </div>
                          </td>
                          {row.blocks.map((b, i) => {
                            const empty = !b.timeLabel;
                            return (
                              <td key={i}>
                                <div
                                  className="ehs-overview-crew-cell"
                                  style={statusBlockStyle(row.status, empty)}
                                >
                                  {empty ? "—" : b.timeLabel}
                                </div>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <div className="ehs-overview-crew-foot">
                <div className="ehs-overview-crew-legend">
                  <span><span className="ehs-overview-crew-dot" style={{ background: "#22c55e" }} /> {t("overview.legend.confirmed")}</span>
                  <span><span className="ehs-overview-crew-dot" style={{ background: "#f59e0b" }} /> {t("overview.legend.pending")}</span>
                  <span><span className="ehs-overview-crew-dot" style={{ background: "#f43f5e" }} /> {t("overview.legend.cancelled")}</span>
                </div>
                <div className="ehs-overview-crew-summary">{crewSummary}</div>
              </div>
            </div>
          </section>

          <section style={{ marginTop: 32 }}>
            <div className="ehs-overview-section-head">
              <h2 className="ehs-overview-section-title">
                <Activity size={14} style={{ color: "var(--primary)" }} /> {t("overview.technicalSystems")}
              </h2>
              <button
                type="button"
                className="ehs-overview-section-action"
                onClick={() => onJump("rigging")}
              >
                {t("overview.openRigReport")} <ArrowUpRight size={12} />
              </button>
            </div>
            {systems.length === 0 ? (
              <div className="ehs-card ehs-overview-empty" style={{ padding: 24 }}>
                {t("overview.noSystems")}{" "}
                <button
                  type="button"
                  className="ehs-overview-link"
                  onClick={() => onJump("rigging")}
                >
                  {t("overview.buildFirstSystem")}
                </button>
              </div>
            ) : (
              <div className="ehs-overview-systems">
                {systems.map((s) => {
                  const Icon = SYSTEM_ICON[s.icon];
                  return (
                    <div key={s.id} className="ehs-card ehs-overview-system">
                      <div className="ehs-overview-system-head">
                        <span className="ehs-overview-system-icon">
                          <Icon size={14} />
                        </span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div className="ehs-overview-system-title">{s.title}</div>
                          <div className="ehs-overview-system-sub">{s.subtitle}</div>
                        </div>
                      </div>
                      <div className="ehs-overview-system-rows">
                        {s.rows.map((r) => (
                          <div key={r.label} className="ehs-overview-system-row">
                            <span>{r.label}</span>
                            <span style={{ color: r.warn ? "#fb7185" : "var(--text-main)", fontWeight: 600 }}>
                              {r.value}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>

        {/* RIGHT: logistics + activity */}
        <aside className="ehs-overview-col-side">
          <section>
            <div className="ehs-overview-section-head">
              <h2 className="ehs-overview-section-title">{t("overview.logistics")}</h2>
            </div>
            <div className="ehs-overview-logistics">
              {hotelSummary ? (
                <div className="ehs-card ehs-overview-logistics-card">
                  <div className="ehs-overview-system-head">
                    <span className="ehs-overview-system-icon">
                      <Bed size={14} />
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="ehs-overview-system-title">{hotelSummary.headline}</div>
                      <div className="ehs-overview-system-sub">{hotelSummary.sub}</div>
                    </div>
                  </div>
                  {hotelSummary.cta ? (
                    <button
                      type="button"
                      className="ehs-overview-link"
                      style={{ marginTop: 10 }}
                      onClick={hotelSummary.cta.onClick}
                    >
                      {hotelSummary.cta.label} <ArrowUpRight size={11} />
                    </button>
                  ) : null}
                </div>
              ) : (
                <div className="ehs-card ehs-overview-logistics-card ehs-overview-empty-soft">
                  <div className="ehs-overview-system-head">
                    <span className="ehs-overview-system-icon">
                      <Bed size={14} />
                    </span>
                    <div style={{ flex: 1 }}>
                      <div className="ehs-overview-system-title">{t("overview.hotel")}</div>
                      <div className="ehs-overview-system-sub">{t("overview.shareBriefHotel")}</div>
                    </div>
                  </div>
                </div>
              )}
              {cateringSummary ? (
                <div className="ehs-card ehs-overview-logistics-card">
                  <div className="ehs-overview-system-head">
                    <span className="ehs-overview-system-icon">
                      <Coffee size={14} />
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="ehs-overview-system-title">{cateringSummary.headline}</div>
                      <div className="ehs-overview-system-sub">{cateringSummary.sub}</div>
                    </div>
                  </div>
                  {cateringSummary.cta ? (
                    <button
                      type="button"
                      className="ehs-overview-link"
                      style={{ marginTop: 10 }}
                      onClick={cateringSummary.cta.onClick}
                    >
                      {cateringSummary.cta.label} <ArrowUpRight size={11} />
                    </button>
                  ) : null}
                </div>
              ) : (
                <div className="ehs-card ehs-overview-logistics-card ehs-overview-empty-soft">
                  <div className="ehs-overview-system-head">
                    <span className="ehs-overview-system-icon">
                      <Coffee size={14} />
                    </span>
                    <div style={{ flex: 1 }}>
                      <div className="ehs-overview-system-title">{t("overview.catering")}</div>
                      <div className="ehs-overview-system-sub">{t("overview.shareBriefCatering")}</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </section>

          <section style={{ marginTop: 32 }}>
            <div className="ehs-overview-section-head">
              <h2 className="ehs-overview-section-title">{t("overview.activityTitle")}</h2>
            </div>
            <div className="ehs-card ehs-overview-activity">
              {activity.length === 0 ? (
                <div className="ehs-overview-empty">{t("overview.noActivity")}</div>
              ) : (
                activity.map((a) => (
                  <div key={a.id} className="ehs-overview-activity-row">
                    <span className="ehs-overview-activity-icon" style={activityToneStyle(a.tone)}>
                      <Activity size={11} />
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="ehs-overview-activity-title">{a.title}</div>
                      {a.body ? <div className="ehs-overview-activity-body">{a.body}</div> : null}
                    </div>
                    <div className="ehs-overview-activity-time">{a.timeLabel}</div>
                  </div>
                ))
              )}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
