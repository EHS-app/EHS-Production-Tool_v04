import { Router, type IRouter, type RequestHandler } from "express";
import { and, desc, eq, or, sql } from "drizzle-orm";
import {
  clientsTable,
  db,
  projectMembersTable,
  projectFinanceSettingsTable,
  projectsTable,
  venuesTable,
} from "@workspace/db";
import {
  getProjectAccess,
  isProjectWriter,
  UUID_PATTERN,
} from "../lib/projectAccess";
import {
  getOrganizationSettings,
  organizationDefaultsSnapshot,
} from "../lib/organizationSettings";
import {
  projectDataWithOrganizationDefaults,
  projectFinanceSeed,
} from "../lib/projectDefaults";

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

function linkedId(value: unknown): string | null | undefined | "invalid" {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  return typeof value === "string" && UUID_PATTERN.test(value) ? value : "invalid";
}

async function resolveLinks(
  userId: string,
  venueId: string | null | undefined,
  clientId: string | null | undefined,
  clonedFromProjectId: string | null | undefined,
): Promise<
  | { venueId: string | null | undefined; venueName?: string; clientId: string | null | undefined; clientName?: string; clonedFromProjectId: string | null | undefined }
  | null
> {
  let venueName: string | undefined;
  let clientName: string | undefined;
  if (venueId) {
    const [venue] = await db.select({ name: venuesTable.name }).from(venuesTable).where(eq(venuesTable.id, venueId)).limit(1);
    if (!venue) return null;
    venueName = venue.name;
  }
  if (clientId) {
    const [client] = await db.select({ name: clientsTable.companyName }).from(clientsTable).where(eq(clientsTable.id, clientId)).limit(1);
    if (!client) return null;
    clientName = client.name;
  }
  if (clonedFromProjectId) {
    if (!(await getProjectAccess(clonedFromProjectId, userId))) return null;
  }
  return { venueId, venueName, clientId, clientName, clonedFromProjectId };
}

function projectResponse<T extends {
  easyjobNumber?: string | null;
  venueId?: string | null;
  clientId?: string | null;
  clonedFromProjectId?: string | null;
}>(row: T): T & {
  easyjob_number: string | null | undefined;
  venue_id: string | null | undefined;
  client_id: string | null | undefined;
  cloned_from_project_id: string | null | undefined;
} {
  return {
    ...row,
    easyjob_number: row.easyjobNumber,
    venue_id: row.venueId,
    client_id: row.clientId,
    cloned_from_project_id: row.clonedFromProjectId,
  };
}

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
        venue_id: projectsTable.venueId,
        client_id: projectsTable.clientId,
        cloned_from_project_id: projectsTable.clonedFromProjectId,
        reportDate: sql<unknown>`${projectsTable.data}->>'reportDate'`,
        reportEndDate: sql<unknown>`${projectsTable.data}->>'reportEndDate'`,
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
    const normaliseDate = (raw: unknown): string | null => {
      if (typeof raw !== "string") return null;
      const value = raw.trim();
      const match = value.match(
        /^(\d{4})-(\d{2})-(\d{2})(?:T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?(?:Z|[+-]\d{2}:\d{2}))?$/,
      );
      if (!match) return null;
      const year = Number(match[1]);
      const month = Number(match[2]);
      const day = Number(match[3]);
      const parsed = new Date(Date.UTC(year, month - 1, day));
      const validDay =
        parsed.getUTCFullYear() === year &&
        parsed.getUTCMonth() === month - 1 &&
        parsed.getUTCDate() === day;
      const validTimestamp = !value.includes("T") || !Number.isNaN(Date.parse(value));
      return validDay && validTimestamp
        ? `${match[1]}-${match[2]}-${match[3]}`
        : null;
    };
    res.json({
      ok: true,
      projects: rows.map(({ reportDate, reportEndDate, ...row }) => ({
        ...row,
        startDate: normaliseDate(reportDate),
        endDate: normaliseDate(reportEndDate),
      })),
    });
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
        ...projectResponse(row),
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
  const {
    name, venue, client, easyjob_number, data,
    venue_id, client_id, cloned_from_project_id,
  } = req.body ?? {};
  if (data && JSON.stringify(data).length > MAX_DATA_BYTES) {
    res.status(413).json({ ok: false, error: "Project data too large." });
    return;
  }
  const venueId = linkedId(venue_id);
  const clientId = linkedId(client_id);
  const clonedFromProjectId = linkedId(cloned_from_project_id);
  if (venueId === "invalid" || clientId === "invalid" || clonedFromProjectId === "invalid") {
    res.status(400).json({ ok: false, error: "Linked ids must be valid UUIDs or null." });
    return;
  }
  try {
    const links = await resolveLinks(userId, venueId, clientId, clonedFromProjectId);
    if (!links) {
      res.status(400).json({ ok: false, error: "A linked venue, client, or source project does not exist." });
      return;
    }
    const organization = await getOrganizationSettings();
    const projectData = projectDataWithOrganizationDefaults(
      data,
      organizationDefaultsSnapshot(organization),
    );
    const row = await db.transaction(async (tx) => {
      const [created] = await tx
        .insert(projectsTable)
        .values({
          userId,
          name: typeof name === "string" ? name.slice(0, 200) : "Untitled",
          venue: links.venueName ?? (typeof venue === "string" ? venue.slice(0, 200) : ""),
          client: links.clientName ?? (typeof client === "string" ? client.slice(0, 200) : ""),
          venueId: links.venueId,
          clientId: links.clientId,
          clonedFromProjectId: links.clonedFromProjectId,
          easyjobNumber:
            typeof easyjob_number === "string"
              ? easyjob_number.trim().slice(0, 100) || null
              : null,
          data: projectData,
        })
        .returning();
      if (!created) throw new Error("Project insert returned no row.");
      await tx.insert(projectFinanceSettingsTable).values({
        projectId: created.id,
        ...projectFinanceSeed(projectData),
        updatedByUserId: userId,
      });
      return created;
    });
    res.json({
      ok: true,
      project: row
        ? projectResponse(row)
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
  const {
    name, venue, client, easyjob_number, data,
    venue_id, client_id, cloned_from_project_id,
  } = req.body ?? {};
  if (!UUID_PATTERN.test(String(id))) {
    res.status(404).json({ ok: false, error: "Project not found." });
    return;
  }
  if (data && JSON.stringify(data).length > MAX_DATA_BYTES) {
    res.status(413).json({ ok: false, error: "Project data too large." });
    return;
  }
  const venueId = linkedId(venue_id);
  const clientId = linkedId(client_id);
  const clonedFromProjectId = linkedId(cloned_from_project_id);
  if (venueId === "invalid" || clientId === "invalid" || clonedFromProjectId === "invalid") {
    res.status(400).json({ ok: false, error: "Linked ids must be valid UUIDs or null." });
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
    const links = await resolveLinks(userId, venueId, clientId, clonedFromProjectId);
    if (!links) {
      res.status(400).json({ ok: false, error: "A linked venue, client, or source project does not exist." });
      return;
    }
    if (venueId !== undefined) {
      updates.venueId = venueId;
      if (links.venueName !== undefined) updates.venue = links.venueName;
    }
    if (clientId !== undefined) {
      updates.clientId = clientId;
      if (links.clientName !== undefined) updates.client = links.clientName;
    }
    if (clonedFromProjectId !== undefined) updates.clonedFromProjectId = clonedFromProjectId;
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
        venue_id: projectsTable.venueId,
        client_id: projectsTable.clientId,
        cloned_from_project_id: projectsTable.clonedFromProjectId,
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
