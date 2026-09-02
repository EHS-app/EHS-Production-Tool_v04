import React from "react";
import { Activity, Briefcase, Calendar, CheckSquare, DollarSign, Truck, Users } from "lucide-react";
import type { GlobalView } from "./GlobalShell";

export interface DashboardStats {
  activeProjects: number;
  planningProjects: number;
  totalFreelancers: number;
  unassignedTasks: number;
}

interface Props {
  stats: DashboardStats;
  onNavigate: (view: GlobalView) => void;
}

export function HomeDashboard({ stats, onNavigate }: Props) {
  return (
    <div style={{ padding: "0 16px 40px", maxWidth: 1200, margin: "0 auto" }}>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: "1.5rem", fontWeight: 300, margin: "0 0 8px 0", color: "var(--text-main)" }}>
          Operations Overview
        </h2>
        <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", margin: 0 }}>
          High-level snapshot of global EHS production activity.
        </p>
      </div>

      <div className="dashboard" style={{ marginBottom: 32 }}>
        <div className="dash-item">
          <span>Active Projects</span>
          <strong>{stats.activeProjects}</strong>
        </div>
        <div className="dash-item">
          <span>In Planning</span>
          <strong>{stats.planningProjects}</strong>
        </div>
        <div className="dash-item">
          <span>Crew Profiles</span>
          <strong>{stats.totalFreelancers}</strong>
        </div>
        <div className="dash-item">
          <span>Global Tasks</span>
          <strong style={{ fontSize: "0.85rem" }}>Phase 2</strong>
        </div>
      </div>

      <h3 style={{ fontSize: "0.8rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.5px", color: "var(--text-muted)", marginBottom: 16 }}>
        Quick Navigation
      </h3>

      <div className="system-mini-grid">
        <button className="system-mini" onClick={() => onNavigate("projects")}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 32, height: 32, borderRadius: 8, background: "var(--primary-soft)", color: "var(--primary)" }}>
              <Briefcase size={16} />
            </div>
            <div>
              <div className="mini-name">Projects Database</div>
              <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginTop: 2 }}>Manage all productions</div>
            </div>
          </div>
        </button>

        <button className="system-mini" onClick={() => onNavigate("crew")}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 32, height: 32, borderRadius: 8, background: "rgba(16, 185, 129, 0.12)", color: "#10b981" }}>
              <Users size={16} />
            </div>
            <div>
              <div className="mini-name">Crew Directory</div>
              <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginTop: 2 }}>Global freelancer pool</div>
            </div>
          </div>
        </button>

        <button className="system-mini" onClick={() => onNavigate("calendar")}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 32, height: 32, borderRadius: 8, background: "rgba(59, 130, 246, 0.12)", color: "#3b82f6" }}>
              <Calendar size={16} />
            </div>
            <div>
              <div className="mini-name">Master Calendar</div>
              <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginTop: 2 }}>Resource scheduling</div>
            </div>
          </div>
        </button>

        <button className="system-mini" onClick={() => onNavigate("transport")}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 32, height: 32, borderRadius: 8, background: "rgba(245, 158, 11, 0.12)", color: "#f59e0b" }}>
              <Truck size={16} />
            </div>
            <div>
              <div className="mini-name">Logistics</div>
              <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginTop: 2 }}>Fleet and transport</div>
            </div>
          </div>
        </button>

        <button className="system-mini" onClick={() => onNavigate("tasks")}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 32, height: 32, borderRadius: 8, background: "rgba(236, 72, 153, 0.12)", color: "#ec4899" }}>
              <CheckSquare size={16} />
            </div>
            <div>
              <div className="mini-name">Tasks</div>
              <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginTop: 2 }}>Production checklists</div>
            </div>
          </div>
        </button>

        <button className="system-mini" onClick={() => onNavigate("economy")}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 32, height: 32, borderRadius: 8, background: "rgba(139, 92, 246, 0.12)", color: "#8b5cf6" }}>
              <DollarSign size={16} />
            </div>
            <div>
              <div className="mini-name">Economy</div>
              <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginTop: 2 }}>Budgets and billing</div>
            </div>
          </div>
        </button>
      </div>
    </div>
  );
}
