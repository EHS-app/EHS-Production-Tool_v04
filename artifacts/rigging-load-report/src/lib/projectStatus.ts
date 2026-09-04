export const PROJECT_STATUS_ORDER = [
  "draft",
  "planning",
  "active",
  "completed",
  "archived",
] as const;

export type ProjectStatus = (typeof PROJECT_STATUS_ORDER)[number];

export type ProjectStatusTone =
  | "success"
  | "warning"
  | "danger"
  | "neutral";

export const PROJECT_STATUS_META: Record<
  ProjectStatus,
  { label: string; color: string; background: string; tone: ProjectStatusTone }
> = {
  draft: {
    label: "Draft",
    color: "#94a3b8",
    background: "rgba(148,163,184,0.12)",
    tone: "neutral",
  },
  planning: {
    label: "Planning",
    color: "#fbbf24",
    background: "rgba(245,158,11,0.12)",
    tone: "warning",
  },
  active: {
    label: "Active",
    color: "#34d399",
    background: "rgba(16,185,129,0.12)",
    tone: "success",
  },
  completed: {
    label: "Completed",
    color: "#60a5fa",
    background: "rgba(59,130,246,0.12)",
    tone: "neutral",
  },
  archived: {
    label: "Archived",
    color: "#a78bfa",
    background: "rgba(139,92,246,0.12)",
    tone: "neutral",
  },
};

export function isProjectStatus(value: unknown): value is ProjectStatus {
  return (
    typeof value === "string" &&
    (PROJECT_STATUS_ORDER as readonly string[]).includes(value)
  );
}

export function normalizeProjectStatus(
  value: unknown,
  fallback: ProjectStatus = "draft",
): ProjectStatus {
  return isProjectStatus(value) ? value : fallback;
}

/** The canonical lifecycle only moves forward, one stage at a time. */
export function getNextProjectStatus(
  status: ProjectStatus,
): ProjectStatus | null {
  const next = PROJECT_STATUS_ORDER.indexOf(status) + 1;
  return next < PROJECT_STATUS_ORDER.length
    ? PROJECT_STATUS_ORDER[next]
    : null;
}

export function canTransitionProjectStatus(
  from: ProjectStatus,
  to: ProjectStatus,
): boolean {
  return getNextProjectStatus(from) === to;
}
