import React, { useCallback, useEffect, useState, useMemo } from "react";
import { Search, Plus, FileText, ChevronRight, Trash2 } from "lucide-react";
import { DeleteProjectDialog } from "../DeleteProjectDialog";
import { useT } from "../../lib/i18n/I18nContext";

export type ProjectRow = {
  id: string;
  name: string;
  venue: string;
  client: string;
  easyjob_number: string | null;
  crewCount: number;
  status: 'active' | 'planning' | 'draft';
  createdAt: string;
  updatedAt: string;
  accessRole: string;
};

interface Props {
  getToken: () => Promise<string | null>;
  onOpenProject: (id: string) => void;
  onNewProject: () => void;
  onProjectDeleted?: (id: string) => void;
}

export function ProjectsDatabasePage({ getToken, onOpenProject, onNewProject, onProjectDeleted }: Props) {
  const t = useT();
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const loadProjects = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const token = await getToken();
      const res = await fetch("/api/projects", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error("Failed to load projects");
      const json = await res.json();
      setProjects(json.projects || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    void loadProjects();
  }, [loadProjects]);

  const filtered = useMemo(() => {
    let list = projects;
    if (statusFilter !== "all") {
      list = list.filter(p => p.status === statusFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(p => 
        (p.name || "").toLowerCase().includes(q) ||
        (p.venue || "").toLowerCase().includes(q) ||
        (p.client || "").toLowerCase().includes(q) ||
        (p.easyjob_number && p.easyjob_number.toLowerCase().includes(q))
      );
    }
    return list;
  }, [projects, search, statusFilter]);

  const formatDate = (ds: string) => {
    if (!ds) return "—";
    return new Intl.DateTimeFormat("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric"
    }).format(new Date(ds));
  };

  return (
    <div style={{ padding: "0 16px 40px", maxWidth: 1400, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 16, marginBottom: 24 }}>
        <div style={{ minWidth: 0 }}>
          <h2 style={{ fontSize: "1.5rem", fontWeight: 300, margin: "0 0 8px 0", color: "var(--text-main)" }}>
            Projects Database
          </h2>
          <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", margin: 0 }}>
            Central repository of all production projects.
          </p>
        </div>
        <button className="ehs-primary-btn" onClick={onNewProject}>
          <Plus size={16} /> New Project
        </button>
      </div>

      <div className="ehs-table-container">
        <div className="ehs-table-toolbar">
          <div className="ehs-search-input">
            <Search size={16} color="var(--text-muted)" />
            <input 
              type="text" 
              placeholder="Search name, client, venue, or Easyjob number..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {(["all", "active", "planning", "draft"] as const).map(f => (
              <button
                key={f}
                className={statusFilter === f ? "ehs-primary-btn" : "ehs-ghost-btn"}
                style={{ padding: "6px 12px", fontSize: "12px", borderRadius: 999 }}
                onClick={() => setStatusFilter(f)}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div style={{ padding: 40, textAlign: "center", color: "var(--text-muted)", fontSize: 14 }}>
            Loading database...
          </div>
        ) : error ? (
          <div style={{ padding: 40, textAlign: "center", color: "var(--danger)", fontSize: 14 }}>
            {error}
          </div>
        ) : filtered.length === 0 ? (
          <div className="ehs-empty-state">
            <div className="ehs-empty-state-icon">
              <FileText size={24} />
            </div>
            <h3>No projects found</h3>
            <p>
              {projects.length === 0 
                ? "Your database is empty. Create your first project to get started."
                : "No projects match your current filters."}
            </p>
            {projects.length === 0 && (
              <button className="ehs-primary-btn" onClick={onNewProject}>
                <Plus size={16} /> Create Project
              </button>
            )}
          </div>
        ) : (
          <div className="mobile-table-scroll" style={{ overflowX: "auto" }}>
            <table className="ehs-table">
              <thead>
                <tr>
                  <th>Project Name</th>
                  <th>Client</th>
                  <th>Venue</th>
                  <th>Easyjob Number</th>
                  <th>Crew</th>
                  <th>Status</th>
                  <th>Last Updated</th>
                  <th>Role</th>
                  <th style={{ width: 170 }}></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(p => (
                  <tr key={p.id} className="is-clickable" onClick={() => onOpenProject(p.id)}>
                    <td style={{ fontWeight: 600 }}>{p.name || "Untitled"}</td>
                    <td>{p.client || "—"}</td>
                    <td>{p.venue || "—"}</td>
                    <td>{p.easyjob_number ? <span style={{ fontFamily: "monospace", color: "var(--text-muted)" }}>{p.easyjob_number}</span> : "—"}</td>
                    <td>{p.crewCount} <span style={{ color: "var(--text-muted)", fontSize: 11 }}>pax</span></td>
                    <td>
                      <span className={`ehs-badge ${p.status}`}>{p.status.toUpperCase()}</span>
                    </td>
                    <td style={{ color: "var(--text-muted)", fontSize: 12 }}>{formatDate(p.updatedAt)}</td>
                    <td>
                      <span style={{ textTransform: "capitalize", fontSize: 12, fontWeight: 600, color: "var(--text-muted)" }}>
                        {p.accessRole}
                      </span>
                    </td>
                    <td style={{ textAlign: "right", paddingRight: 16 }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 8 }}>
                        {p.accessRole === "owner" && (
                          <DeleteProjectDialog
                            projectId={p.id}
                            projectName={p.name}
                            projectStatus={p.status}
                            getToken={getToken}
                            onSuccess={async () => {
                              await loadProjects();
                              onProjectDeleted?.(p.id);
                            }}
                            trigger={
                              <button
                                type="button"
                                className="ehs-ghost-btn"
                                style={{ color: "var(--danger)", background: "transparent", border: "1px solid var(--danger)", cursor: "pointer", padding: "5px 8px", borderRadius: 6, whiteSpace: "nowrap" }}
                                onClick={(e) => e.stopPropagation()}
                                title={t("project.delete.title")}
                                aria-label={t("project.delete.title")}
                              >
                                <Trash2 size={14} />
                                <span>{t("project.delete.title")}</span>
                              </button>
                            }
                          />
                        )}
                        <ChevronRight size={16} color="var(--text-muted)" />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
