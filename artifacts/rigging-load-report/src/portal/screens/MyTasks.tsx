import { useEffect, useState } from "react";
import { useAuth } from "@clerk/react";
import { PALETTE, type ThemeMode } from "../lib/portalTheme";
import { useT } from "../../lib/i18n/I18nContext";

type Task = {
  id: string;
  projectName: string;
  projectVenue: string;
  title: string;
  status: string;
  priority: string;
  department: string;
  dueDate: string | null;
  description: string;
};

const BASE_URL =
  (typeof import.meta !== "undefined" &&
    (import.meta as { env?: { BASE_URL?: string } }).env?.BASE_URL) ||
  "/";

export function MyTasks({ theme }: { theme: ThemeMode }) {
  const c = PALETTE[theme];
  const { getToken } = useAuth();
  const t = useT();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const token = await getToken();
        const response = await fetch(`${BASE_URL}api/portal/my-tasks`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const body = (await response.json()) as { ok?: boolean; tasks?: Task[]; error?: string };
        if (!response.ok || !body.ok || !Array.isArray(body.tasks)) {
          throw new Error(body.error || t("portal.tasks.loadError"));
        }
        if (!cancelled) setTasks(body.tasks);
      } catch (reason) {
        if (!cancelled) setError(reason instanceof Error ? reason.message : t("portal.tasks.loadError"));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [getToken, t]);

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <header>
        <h1 style={{ margin: 0, fontSize: 26 }}>{t("portal.tasks.title")}</h1>
        <p style={{ color: c.muted, margin: "6px 0 0" }}>{t("portal.tasks.subtitle")}</p>
      </header>
      {loading ? <p style={{ color: c.muted }}>{t("portal.tasks.loading")}</p> : null}
      {error ? <p role="alert" style={{ color: "#ef4444" }}>{error}</p> : null}
      {!loading && !error && tasks.length === 0 ? (
        <div style={{ padding: 24, border: `1px solid ${c.border}`, borderRadius: 14, color: c.muted }}>
          {t("portal.tasks.empty")}
        </div>
      ) : null}
      {tasks.map((task) => (
        <article
          key={task.id}
          style={{ padding: 18, border: `1px solid ${c.border}`, borderRadius: 14, background: c.cardBg, boxShadow: c.shadowSoft }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <div>
              <div style={{ color: c.muted, fontSize: 12, fontWeight: 700 }}>
                {task.projectName}{task.projectVenue ? ` · ${task.projectVenue}` : ""}
              </div>
              <h2 style={{ margin: "5px 0", fontSize: 18 }}>{task.title}</h2>
            </div>
            <span style={{ alignSelf: "flex-start", borderRadius: 999, padding: "5px 10px", background: c.cardBgSubtle, fontSize: 12, fontWeight: 700 }}>
              {task.status}
            </span>
          </div>
          <div style={{ color: c.muted, fontSize: 13, marginTop: 8 }}>
            {task.department} · {task.priority} {t("portal.tasks.priority")}
            {task.dueDate ? ` · ${t("portal.tasks.due")} ${new Date(`${task.dueDate}T00:00:00`).toLocaleDateString()}` : ""}
          </div>
          {task.description ? <p style={{ margin: "12px 0 0", whiteSpace: "pre-wrap", lineHeight: 1.5 }}>{task.description}</p> : null}
        </article>
      ))}
    </div>
  );
}