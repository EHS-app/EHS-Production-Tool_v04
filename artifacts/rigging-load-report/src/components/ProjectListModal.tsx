import { useCallback, useEffect, useRef, useState } from "react";
import { Plus, Search, Trash2 } from "lucide-react";
import { useI18n } from "../lib/i18n/I18nContext";

export type ProjectSummary = {
  id: string;
  name: string;
  venue: string;
  client: string;
  createdAt: string;
  updatedAt: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  onOpen: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
  currentProjectId: string | null;
  getToken: () => Promise<string | null>;
};

export function ProjectListModal({
  open,
  onClose,
  onOpen,
  onNew,
  onDelete,
  currentProjectId,
  getToken,
}: Props) {
  const { t, locale } = useI18n();
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);

  const fetchProjects = useCallback(async () => {
    setLoading(true);
    try {
      const token = await getToken();
      const res = await fetch("/api/projects", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const json = await res.json();
        setProjects(json.projects ?? []);
      }
    } catch {
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    if (open) {
      setQuery("");
      fetchProjects();
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open, fetchProjects]);

  const handleDelete = async (id: string) => {
    if (!confirm(t("projects.deleteConfirm"))) return;
    try {
      const token = await getToken();
      const res = await fetch(`/api/projects/${id}`, {
        method: "DELETE",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) return;
      setProjects((prev) => prev.filter((p) => p.id !== id));
      onDelete(id);
    } catch {
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
                    </span>
                    <span className="proj-row-date">
                      {dateFmt.format(new Date(p.updatedAt))}
                    </span>
                  </button>
                  {!isCurrent ? (
                    <button
                      type="button"
                      className="proj-row-delete"
                      title={t("projects.delete")}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(p.id);
                      }}
                    >
                      <Trash2 size={13} />
                    </button>
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
