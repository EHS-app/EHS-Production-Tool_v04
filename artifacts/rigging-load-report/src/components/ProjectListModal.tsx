import { useCallback, useEffect, useRef, useState } from "react";
import { Archive, ArchiveRestore, Plus, Search, Trash2 } from "lucide-react";
import { useI18n } from "../lib/i18n/I18nContext";
import { toast } from "sonner";
import { DeleteProjectDialog } from "./DeleteProjectDialog";
import {
  normalizeProjectStatus,
  type ProjectStatus,
} from "../lib/projectStatus";

export type ProjectSummary = {
  id: string;
  name: string;
  venue: string;
  client: string;
  createdAt: string;
  updatedAt: string;
  accessRole: "owner" | "editor" | "viewer";
  archivedAt?: string | null;
  isArchived?: boolean;
  status: ProjectStatus;
  created_by?: string;
  manager?: {
    userId: string;
    name: string;
    email: string | null;
    avatarUrl: string | null;
  };
};

type Props = {
  open: boolean;
  onClose: () => void;
  onOpen: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
  currentProjectId: string | null;
  getToken: () => Promise<string | null>;
  canPermanentlyDelete: boolean;
};

export function ProjectListModal({
  open,
  onClose,
  onOpen,
  onNew,
  onDelete,
  currentProjectId,
  getToken,
  canPermanentlyDelete,
}: Props) {
  const { t, locale } = useI18n();
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [archiveBusyId, setArchiveBusyId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const fetchProjects = useCallback(async () => {
    setLoading(true);
    try {
      const token = await getToken();
      const res = await fetch(
        `/api/projects${showArchived ? "?includeArchived=true" : ""}`,
        {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        },
      );
      if (res.ok) {
        const json = await res.json();
        setProjects(json.projects ?? []);
      }
    } catch {
    } finally {
      setLoading(false);
    }
  }, [getToken, showArchived]);

  useEffect(() => {
    if (open) {
      setQuery("");
      fetchProjects();
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open, fetchProjects]);

  const handleArchive = async (project: ProjectSummary) => {
    if (archiveBusyId) return;
    setArchiveBusyId(project.id);
    try {
      const token = await getToken();
      const action = project.isArchived ? "unarchive" : "archive";
      const res = await fetch(`/api/projects/${project.id}/${action}`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.project) {
        throw new Error(json?.error || t("projects.archiveError"));
      }
      if (!showArchived && !project.isArchived) {
        setProjects((current) => current.filter((item) => item.id !== project.id));
      } else {
        setProjects((current) =>
          current.map((item) =>
            item.id === project.id ? { ...item, ...json.project } : item,
          ),
        );
      }
      toast.success(
        project.isArchived
          ? t("projects.unarchiveSuccess")
          : t("projects.archiveSuccess"),
      );
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : t("projects.archiveError"),
      );
    } finally {
      setArchiveBusyId(null);
    }
  };

  if (!open) return null;

  const q = query.trim().toLowerCase();
  const filtered = q
    ? projects.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.venue.toLowerCase().includes(q) ||
          p.client.toLowerCase().includes(q),
      )
    : projects;

  const dateFmt = new Intl.DateTimeFormat(locale === "no" ? "nb-NO" : "en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="cmd-backdrop" onClick={onClose} role="presentation">
      <div
        className="cmd-dialog proj-dialog"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={t("projects.title")}
      >
        <div className="proj-header">
          <div>
            <h3 className="proj-title">{t("projects.title")}</h3>
            <p className="proj-subtitle">{t("projects.subtitle")}</p>
          </div>
          <button
            type="button"
            className="proj-new-btn"
            onClick={() => {
              onNew();
              onClose();
            }}
          >
            <Plus size={14} />
            {t("projects.new")}
          </button>
        </div>

        <div className="cmd-input-wrap">
          <Search size={16} className="cmd-input-icon" />
          <input
            ref={inputRef}
            className="cmd-input"
            type="text"
            placeholder={t("projects.search")}
            aria-label={t("projects.search")}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") onClose();
            }}
            autoComplete="off"
            spellCheck={false}
          />
          <kbd className="cmd-esc">Esc</kbd>
        </div>
        <label
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            margin: "0 0 12px",
            fontSize: 12,
            color: "var(--text-muted)",
            cursor: "pointer",
          }}
        >
          <input
            type="checkbox"
            checked={showArchived}
            onChange={(event) => setShowArchived(event.target.checked)}
          />
          {t("projects.showArchived")}
        </label>

        <div className="proj-list">
          {loading ? (
            <div className="cmd-empty">{t("projects.loading")}</div>
          ) : filtered.length === 0 ? (
            <div className="cmd-empty">
              {projects.length === 0 ? (
                <>
                  <div>{t("projects.noProjects")}</div>
                  <div style={{ fontSize: 12, marginTop: 4, opacity: 0.7 }}>
                    {t("projects.noProjectsSub")}
                  </div>
                </>
              ) : (
                t("shell.searchNoResults")
              )}
            </div>
          ) : (
            filtered.map((p) => {
              const isCurrent = p.id === currentProjectId;
              return (
                <div
                  key={p.id}
                  className={`proj-row${isCurrent ? " is-current" : ""}`}
                >
                  <button
                    type="button"
                    className="proj-row-main"
                    onClick={() => {
                      if (!isCurrent) onOpen(p.id);
                      onClose();
                    }}
                  >
                    <span className="proj-row-name">
                      {p.name || p.venue || t("projects.untitled")}
                    </span>
                    <span className="proj-row-meta">
                      {p.venue && p.name !== p.venue ? (
                        <span className="proj-row-venue">{p.venue}</span>
                      ) : null}
                      {p.client ? (
                        <span className="proj-row-client">{p.client}</span>
                      ) : null}
                      {p.manager ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }} title={p.manager.email || undefined}>
                          {p.manager.avatarUrl ? (
                            <img src={p.manager.avatarUrl} alt={p.manager.name} style={{ width: 14, height: 14, borderRadius: '50%', objectFit: 'cover' }} />
                          ) : (
                            <span style={{ width: 14, height: 14, borderRadius: '50%', background: 'var(--border-color)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, color: 'var(--text-main)', fontWeight: 600 }}>
                              {p.manager.name.charAt(0).toUpperCase()}
                            </span>
                          )}
                          <span>Created by: {p.manager.name}</span>
                        </span>
                      ) : null}
                    </span>
                    <span className="proj-row-date">
                      {p.isArchived ? `${t("projects.archived")} · ` : ""}
                      {p.accessRole !== "owner" ? `${p.accessRole} · ` : ""}
                      {dateFmt.format(new Date(p.updatedAt))}
                    </span>
                  </button>
                  {!isCurrent && p.accessRole !== "viewer" ? (
                    <button
                      type="button"
                      className="proj-row-delete"
                      disabled={archiveBusyId === p.id}
                      title={
                        p.isArchived
                          ? t("projects.unarchive")
                          : t("projects.archive")
                      }
                      onClick={(event) => {
                        event.stopPropagation();
                        void handleArchive(p);
                      }}
                    >
                      {p.isArchived ? (
                        <ArchiveRestore size={13} />
                      ) : (
                        <Archive size={13} />
                      )}
                    </button>
                  ) : null}
                  {!isCurrent && canPermanentlyDelete ? (
                    <DeleteProjectDialog
                      projectId={p.id}
                      projectName={p.name}
                      projectStatus={normalizeProjectStatus(p.status)}
                      getToken={getToken}
                      onSuccess={() => {
                        setProjects((current) =>
                          current.filter((project) => project.id !== p.id),
                        );
                        onDelete(p.id);
                      }}
                      trigger={
                        <button
                          type="button"
                          className="proj-row-delete"
                          title={t("projects.permanentDelete")}
                          onClick={(event) => event.stopPropagation()}
                        >
                          <Trash2 size={13} />
                        </button>
                      }
                    />
                  ) : null}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
