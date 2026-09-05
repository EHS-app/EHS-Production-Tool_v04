import { Router, type IRouter } from "express";
import { and, asc, eq, isNotNull, sql } from "drizzle-orm";
import {
  db,
  freelancerProfilesTable,
  projectMembersTable,
  projectsTable,
  projectTasksTable,
} from "@workspace/db";
import { getEmployeeProjectAccess, isProjectWriter, UUID_PATTERN } from "../lib/projectAccess";

const router: IRouter = Router();
const STATUSES = ["Not Started", "Working on it", "Stuck", "Done"] as const;
const PRIORITIES = ["Low", "Medium", "High", "Urgent"] as const;
const DEPARTMENTS = [
  "Rigging",
  "Lights",
  "LED",
  "Sound",
  "Stage",
  "Inspection",
  "Logistics",
] as const;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function optionalEnum<T extends readonly string[]>(
  raw: unknown,
  values: T,
  fallback: T[number],
): T[number] | null {
  const value = raw == null ? fallback : raw;
  return typeof value === "string" && values.includes(value as T[number])
    ? (value as T[number])
    : null;
}

router.get("/tasks", async (req, res): Promise<void> => {
  const userId = (req as unknown as { _userId: string })._userId;
  try {
    const tasks = await db
      .select({
        id: projectTasksTable.id,
        projectId: projectTasksTable.projectId,
        projectName: projectsTable.name,
        title: projectTasksTable.title,
        status: projectTasksTable.status,
        priority: projectTasksTable.priority,
        department: projectTasksTable.department,
        dueDate: projectTasksTable.dueDate,
        assignedTo: projectTasksTable.assignedTo,
        assignedUserId: projectTasksTable.assignedUserId,
        assignedCrewName: freelancerProfilesTable.fullName,
        description: projectTasksTable.description,
        createdAt: projectTasksTable.createdAt,
        updatedAt: projectTasksTable.updatedAt,
        accessRole: sql<"owner" | "editor" | "viewer">`case when ${projectsTable.userId} = ${userId} then 'owner' when ${projectMembersTable.role} in ('editor', 'viewer') then ${projectMembersTable.role} else 'editor' end`,
      })
      .from(projectTasksTable)
      .innerJoin(projectsTable, eq(projectTasksTable.projectId, projectsTable.id))
      .leftJoin(
        projectMembersTable,
        and(
          eq(projectMembersTable.projectId, projectsTable.id),
          eq(projectMembersTable.userId, userId),
        ),
      )
      .leftJoin(
        freelancerProfilesTable,
        eq(projectTasksTable.assignedUserId, freelancerProfilesTable.userId),
      )
      .where(isNotNull(sql`nullif(${projectsTable.data}->>'activeBriefId', '')`))
      .orderBy(asc(projectTasksTable.createdAt));
    res.json({ ok: true, tasks });
  } catch (error) {
    req.log.error({ error }, "Failed to list global tasks");
    res.status(500).json({ ok: false, error: "Failed to list global tasks." });
  }
});

router.post("/tasks", async (req, res): Promise<void> => {
  const userId = (req as unknown as { _userId: string })._userId;
  const body = (req.body ?? {}) as Record<string, unknown>;
  const projectId = typeof body.projectId === "string" ? body.projectId : "";
  const title = typeof body.title === "string" ? body.title.trim().slice(0, 300) : "";
  const status = optionalEnum(body.status, STATUSES, "Not Started");
  const priority = optionalEnum(body.priority, PRIORITIES, "Medium");
  const department = optionalEnum(body.department, DEPARTMENTS, "Logistics");
  const dueDate =
    body.dueDate === null || body.dueDate === ""
      ? null
      : typeof body.dueDate === "string" && DATE_PATTERN.test(body.dueDate)
        ? body.dueDate
        : undefined;
  const assignedUserId =
    body.assignedUserId === null || body.assignedUserId === ""
      ? null
      : typeof body.assignedUserId === "string" && body.assignedUserId.length <= 200
        ? body.assignedUserId
        : undefined;
  if (
    !UUID_PATTERN.test(projectId) ||
    !title ||
    !status ||
    !priority ||
    !department ||
    dueDate === undefined ||
    assignedUserId === undefined
  ) {
    res.status(400).json({ ok: false, error: "Invalid task details." });
    return;
  }
  try {
    const accessRole = await getEmployeeProjectAccess(projectId, userId);
    if (!accessRole) {
      res.status(404).json({ ok: false, error: "Project not found." });
      return;
    }
    if (!isProjectWriter(accessRole)) {
      res.status(403).json({ ok: false, error: "Project is read-only." });
      return;
    }
    const [project] = await db
      .select({ activeBriefId: sql<string | null>`nullif(${projectsTable.data}->>'activeBriefId', '')` })
      .from(projectsTable)
      .where(eq(projectsTable.id, projectId))
      .limit(1);
    if (!project?.activeBriefId) {
      res.status(400).json({ ok: false, error: "Tasks can only be created for active productions." });
      return;
    }
    let assignedTo = "";
    if (assignedUserId) {
      const [crew] = await db
        .select({ fullName: freelancerProfilesTable.fullName })
        .from(freelancerProfilesTable)
        .where(eq(freelancerProfilesTable.userId, assignedUserId))
        .limit(1);
      if (!crew) {
        res.status(400).json({ ok: false, error: "Assignee is not in the Global Crew Directory." });
        return;
      }
      assignedTo = crew.fullName;
    }
    const [task] = await db
      .insert(projectTasksTable)
      .values({
        projectId,
        title,
        status,
        priority,
        department,
        dueDate,
        assignedUserId,
        assignedTo,
        description:
          typeof body.description === "string"
            ? body.description.slice(0, 10_000)
            : "",
      })
      .returning();
    res.status(201).json({ ok: true, task });
  } catch (error) {
    req.log.error({ error }, "Failed to create global task");
    res.status(500).json({ ok: false, error: "Failed to create global task." });
  }
});

export default router;