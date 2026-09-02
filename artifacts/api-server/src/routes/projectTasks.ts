import { Router, type IRouter } from "express";
import { and, asc, eq, sql } from "drizzle-orm";
import { db, projectsTable, projectTasksTable } from "@workspace/db";

const router: IRouter = Router();

const TASK_STATUSES = [
  "Not Started",
  "Working on it",
  "Stuck",
  "Done",
] as const;
const TASK_PRIORITIES = ["Low", "Medium", "High", "Urgent"] as const;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function userIdFor(req: unknown): string {
  return (req as { _userId: string })._userId;
}

function param(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

async function ownsProject(projectId: string, userId: string): Promise<boolean> {
  const [project] = await db
    .select({ id: projectsTable.id })
    .from(projectsTable)
    .where(and(eq(projectsTable.id, projectId), eq(projectsTable.userId, userId)))
    .limit(1);
  return Boolean(project);
}

router.get("/projects/:projectId/tasks", async (req, res): Promise<void> => {
  const projectId = param(req.params.projectId);
  const userId = userIdFor(req);
  if (!UUID_PATTERN.test(projectId)) {
    res.status(404).json({ ok: false, error: "Project not found." });
    return;
  }
  try {
    if (!(await ownsProject(projectId, userId))) {
      res.status(404).json({ ok: false, error: "Project not found." });
      return;
    }
    const tasks = await db
      .select()
      .from(projectTasksTable)
      .where(eq(projectTasksTable.projectId, projectId))
      .orderBy(asc(projectTasksTable.createdAt));
    res.json({ ok: true, tasks });
  } catch (error) {
    req.log.error(error, "Failed to list project tasks");
    res.status(500).json({ ok: false, error: "Failed to list project tasks." });
  }
});

router.post("/projects/:projectId/tasks", async (req, res): Promise<void> => {
  const projectId = param(req.params.projectId);
  const userId = userIdFor(req);
  if (!UUID_PATTERN.test(projectId)) {
    res.status(404).json({ ok: false, error: "Project not found." });
    return;
  }
  const title = typeof req.body?.title === "string" ? req.body.title.trim() : "";
  if (!title) {
    res.status(400).json({ ok: false, error: "Task title is required." });
    return;
  }
  try {
    if (!(await ownsProject(projectId, userId))) {
      res.status(404).json({ ok: false, error: "Project not found." });
      return;
    }
    const [task] = await db
      .insert(projectTasksTable)
      .values({ projectId, title: title.slice(0, 300) })
      .returning();
    res.status(201).json({ ok: true, task });
  } catch (error) {
    req.log.error(error, "Failed to create project task");
    res.status(500).json({ ok: false, error: "Failed to create project task." });
  }
});

router.patch("/projects/tasks/:id", async (req, res): Promise<void> => {
  const id = param(req.params.id);
  const userId = userIdFor(req);
  if (!UUID_PATTERN.test(id)) {
    res.status(404).json({ ok: false, error: "Task not found." });
    return;
  }
  const [ownedTask] = await db
    .select({ id: projectTasksTable.id })
    .from(projectTasksTable)
    .innerJoin(projectsTable, eq(projectTasksTable.projectId, projectsTable.id))
    .where(and(eq(projectTasksTable.id, id), eq(projectsTable.userId, userId)))
    .limit(1);
  if (!ownedTask) {
    res.status(404).json({ ok: false, error: "Task not found." });
    return;
  }

  const updates: Record<string, unknown> = { updatedAt: sql`now()` };
  if (req.body?.title !== undefined) {
    const title =
      typeof req.body.title === "string" ? req.body.title.trim() : "";
    if (!title) {
      res.status(400).json({ ok: false, error: "Task title is required." });
      return;
    }
    updates.title = title.slice(0, 300);
  }
  if (req.body?.status !== undefined) {
    if (!TASK_STATUSES.includes(req.body.status)) {
      res.status(400).json({ ok: false, error: "Invalid task status." });
      return;
    }
    updates.status = req.body.status;
  }
  if (req.body?.priority !== undefined) {
    if (!TASK_PRIORITIES.includes(req.body.priority)) {
      res.status(400).json({ ok: false, error: "Invalid task priority." });
      return;
    }
    updates.priority = req.body.priority;
  }
  if (req.body?.dueDate !== undefined) {
    if (
      req.body.dueDate !== null &&
      (typeof req.body.dueDate !== "string" ||
        !DATE_PATTERN.test(req.body.dueDate))
    ) {
      res.status(400).json({ ok: false, error: "Invalid due date." });
      return;
    }
    updates.dueDate = req.body.dueDate;
  }
  if (req.body?.assignedTo !== undefined) {
    if (typeof req.body.assignedTo !== "string") {
      res.status(400).json({ ok: false, error: "Invalid assignee." });
      return;
    }
    updates.assignedTo = req.body.assignedTo.trim().slice(0, 200);
  }
  if (req.body?.description !== undefined) {
    if (typeof req.body.description !== "string") {
      res.status(400).json({ ok: false, error: "Invalid description." });
      return;
    }
    updates.description = req.body.description.slice(0, 10_000);
  }

  try {
    const [task] = await db
      .update(projectTasksTable)
      .set(updates)
      .where(eq(projectTasksTable.id, id))
      .returning();
    res.json({ ok: true, task });
  } catch (error) {
    req.log.error(error, "Failed to update project task");
    res.status(500).json({ ok: false, error: "Failed to update project task." });
  }
});

router.delete("/projects/tasks/:id", async (req, res): Promise<void> => {
  const id = param(req.params.id);
  const userId = userIdFor(req);
  if (!UUID_PATTERN.test(id)) {
    res.status(404).json({ ok: false, error: "Task not found." });
    return;
  }
  try {
    const [ownedTask] = await db
      .select({ id: projectTasksTable.id })
      .from(projectTasksTable)
      .innerJoin(projectsTable, eq(projectTasksTable.projectId, projectsTable.id))
      .where(and(eq(projectTasksTable.id, id), eq(projectsTable.userId, userId)))
      .limit(1);
    if (!ownedTask) {
      res.status(404).json({ ok: false, error: "Task not found." });
      return;
    }
    await db.delete(projectTasksTable).where(eq(projectTasksTable.id, id));
    res.json({ ok: true });
  } catch (error) {
    req.log.error(error, "Failed to delete project task");
    res.status(500).json({ ok: false, error: "Failed to delete project task." });
  }
});

export default router;