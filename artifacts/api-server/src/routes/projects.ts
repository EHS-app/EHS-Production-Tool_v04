import { Router, type IRouter, type RequestHandler } from "express";
import { and, desc, eq, or, sql } from "drizzle-orm";
import { db, projectMembersTable, projectsTable } from "@workspace/db";
import {
  getProjectAccess,
  isProjectWriter,
  UUID_PATTERN,
} from "../lib/projectAccess";

const router: IRouter = Router();

const requireSignedIn: RequestHandler = (req, res, next) => {
  const auth =
    typeof (req as unknown as { auth?: unknown }).auth === "function"
      ? ((req as unknown as { auth: () => { userId?: string | null } }).auth())
      : ((req as unknown as { auth?: { userId?: string | null } }).auth ?? {});
  if (!auth || !auth.userId) {
    res.status(401).json({ ok: false, error: "Sign in required." });
    return;
  }
  (req as unknown as { _userId: string })._userId = auth.userId;
  next();
};

const MAX_DATA_BYTES = 2 * 1024 * 1024;

router.get("/projects", requireSignedIn, async (req, res) => {
  const userId = (req as unknown as { _userId: string })._userId;
  try {
    const rows = await db
      .select({
        id: projectsTable.id,
        name: projectsTable.name,
        venue: projectsTable.venue,
        client: projectsTable.client,
        easyjob_number: projectsTable.easyjobNumber,
        crewCount: sql<number>`case when jsonb_typeof(${projectsTable.data}->'crew') = 'array' then jsonb_array_length(${projectsTable.data}->'crew') else 0 end`,
        status: sql<"active" | "planning" | "draft">`case when nullif(${projectsTable.data}->>'activeBriefId', '') is not null then 'active' when nullif(${projectsTable.venue}, '') is not null or nullif(${projectsTable.client}, '') is not null then 'planning' else 'draft' end`,
        createdAt: projectsTable.createdAt,
        updatedAt: projectsTable.updatedAt,
        accessRole: sql<"owner" | "editor" | "viewer">`case when ${projectsTable.userId} = ${userId} then 'owner' else ${projectMembersTable.role} end`,
      })
      .from(projectsTable)
      .leftJoin(
        projectMembersTable,
        and(
          eq(projectMembersTable.projectId, projectsTable.id),
          eq(projectMembersTable.userId, userId),
        ),
      )
      .where(
        or(
          eq(projectsTable.userId, userId),
          eq(projectMembersTable.userId, userId),
        ),
      )
      .orderBy(desc(projectsTable.updatedAt));
    res.json({ ok: true, projects: rows });
  } catch (err) {
    req.log.error(err, "Failed to list projects");
    res.status(500).json({ ok: false, error: "Failed to list projects." });
  }
});

router.get("/projects/:id", requireSignedIn, async (req, res) => {
  const userId = (req as unknown as { _userId: string })._userId;
  const { id } = req.params;
  if (!UUID_PATTERN.test(String(id))) {
    res.status(404).json({ ok: false, error: "Project not found." });
    return;
  }
  try {
    const accessRole = await getProjectAccess(String(id), userId);
    if (!accessRole) {
      res.status(404).json({ ok: false, error: "Project not found." });
      return;
    }
    const [row] = await db
      .select()
      .from(projectsTable)
      .where(eq(projectsTable.id, String(id)))
      .limit(1);
    if (!row) {
      res.status(404).json({ ok: false, error: "Project not found." });
      return;
    }
    res.json({
      ok: true,
      project: {
        ...row,
        easyjob_number: row.easyjobNumber,
        accessRole,
      },
    });
  } catch (err) {
    req.log.error(err, "Failed to load project");
    res.status(500).json({ ok: false, error: "Failed to load project." });
  }
});

router.post("/projects", requireSignedIn, async (req, res) => {
  const userId = (req as unknown as { _userId: string })._userId;
  const { name, venue, client, easyjob_number, data } = req.body ?? {};
  if (data && JSON.stringify(data).length > MAX_DATA_BYTES) {
    res.status(413).json({ ok: false, error: "Project data too large." });
    return;
  }
  try {
    const [row] = await db
      .insert(projectsTable)
      .values({
        userId,
        name: typeof name === "string" ? name.slice(0, 200) : "Untitled",
        venue: typeof venue === "string" ? venue.slice(0, 200) : "",
        client: typeof client === "string" ? client.slice(0, 200) : "",
        easyjobNumber:
          typeof easyjob_number === "string"
            ? easyjob_number.trim().slice(0, 100) || null
            : null,
        data: data ?? {},
      })
      .returning();
    res.json({
      ok: true,
      project: row
        ? { ...row, easyjob_number: row.easyjobNumber }
        : row,
    });
  } catch (err) {
    req.log.error(err, "Failed to create project");
    res.status(500).json({ ok: false, error: "Failed to create project." });
  }
});

router.patch("/projects/:id", requireSignedIn, async (req, res) => {
  const userId = (req as unknown as { _userId: string })._userId;
  const { id } = req.params;
  const { name, venue, client, easyjob_number, data } = req.body ?? {};
  if (!UUID_PATTERN.test(String(id))) {
    res.status(404).json({ ok: false, error: "Project not found." });
    return;
  }
  if (data && JSON.stringify(data).length > MAX_DATA_BYTES) {
    res.status(413).json({ ok: false, error: "Project data too large." });
    return;
  }

  const updates: Record<string, unknown> = {
    updatedAt: sql`now()`,
  };
  if (typeof name === "string") updates.name = name.slice(0, 200);
  if (typeof venue === "string") updates.venue = venue.slice(0, 200);
  if (typeof client === "string") updates.client = client.slice(0, 200);
  if (easyjob_number === null) updates.easyjobNumber = null;
  if (typeof easyjob_number === "string") {
    updates.easyjobNumber = easyjob_number.trim().slice(0, 100) || null;
  }
  if (data !== undefined) updates.data = data;

  try {
    const accessRole = await getProjectAccess(String(id), userId);
    if (!accessRole) {
      res.status(404).json({ ok: false, error: "Project not found." });
      return;
    }
    if (!isProjectWriter(accessRole)) {
      res.status(403).json({ ok: false, error: "Project is read-only." });
      return;
    }
    const [row] = await db
      .update(projectsTable)
      .set(updates)
      .where(eq(projectsTable.id, String(id)))
      .returning({
        id: projectsTable.id,
        name: projectsTable.name,
        venue: projectsTable.venue,
        client: projectsTable.client,
        easyjob_number: projectsTable.easyjobNumber,
        updatedAt: projectsTable.updatedAt,
      });
    if (!row) {
      res.status(404).json({ ok: false, error: "Project not found." });
      return;
    }
    res.json({ ok: true, project: row });
  } catch (err) {
    req.log.error(err, "Failed to update project");
    res.status(500).json({ ok: false, error: "Failed to update project." });
  }
});

router.delete("/projects/:id", requireSignedIn, async (req, res) => {
  const userId = (req as unknown as { _userId: string })._userId;
  const { id } = req.params;
  if (!UUID_PATTERN.test(String(id))) {
    res.status(404).json({ ok: false, error: "Project not found." });
    return;
  }
  try {
    const result = await db
      .delete(projectsTable)
      .where(and(eq(projectsTable.id, String(id)), eq(projectsTable.userId, userId)));
    if (result.rowCount === 0) {
      res.status(404).json({ ok: false, error: "Project not found." });
      return;
    }
    res.json({ ok: true });
  } catch (err) {
    req.log.error(err, "Failed to delete project");
    res.status(500).json({ ok: false, error: "Failed to delete project." });
  }
});

export default router;
