import { Router, type IRouter, type RequestHandler } from "express";
import { randomUUID } from "node:crypto";
import { and, desc, eq, ne, or, sql } from "drizzle-orm";
import {
  clientsTable,
  db,
  deleteOwnedProject,
  PROJECT_BRIEF_PROVENANCE_LOCK,
  projectStatusHistoryTable,
  projectBriefsTable,
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
import { dispatchBriefRequestEmails } from "../lib/briefEmail";
import {
  canTransitionProject,
  classifyProjectTransition,
  completeBriefDispatches,
  deriveLegacyProjectStatus,
  emptyDispatchSummary,
  claimBriefDispatches,
  isActivationTransition,
  isProjectStatus,
  recipientsFromBriefData,
} from "../lib/projectLifecycle";

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

function activeBriefIdIn(data: unknown): string | null | "invalid" {
  if (!data || typeof data !== "object" || Array.isArray(data)) return null;
  const raw = (data as Record<string, unknown>).activeBriefId;
  if (raw === undefined || raw === null || raw === "") return null;
  if (
    typeof raw !== "string" ||
    raw !== raw.trim() ||
    raw.length > 64
  ) {
    return "invalid";
  }
  return raw;
}

async function validActiveBriefProvenance(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  projectId: string,
  projectOwnerId: string,
  data: unknown,
): Promise<boolean> {
  const briefId = activeBriefIdIn(data);
  if (briefId === null) return true;
  if (briefId === "invalid") return false;
  const [brief] = await tx
    .select({
      ownerUserId: projectBriefsTable.ownerUserId,
      projectId: projectBriefsTable.projectId,
    })
    .from(projectBriefsTable)
    .where(eq(projectBriefsTable.id, briefId))
    .limit(1);
  if (
    !brief ||
    brief.ownerUserId !== projectOwnerId ||
    (brief.projectId !== null && brief.projectId !== projectId)
  ) {
    return false;
  }
  const [otherClaim] = await tx
    .select({ id: projectsTable.id })
    .from(projectsTable)
    .where(
      and(
        ne(projectsTable.id, projectId),
        eq(sql<string>`${projectsTable.data}->>'activeBriefId'`, briefId),
      ),
    )
    .limit(1);
  return !otherClaim;
}

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
        status: sql<string>`coalesce(${projectsTable.status}, case when nullif(${projectsTable.data}->>'activeBriefId', '') is not null then 'active' when nullif(${projectsTable.venue}, '') is not null or nullif(${projectsTable.client}, '') is not null then 'planning' else 'draft' end)`,
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
        status: deriveLegacyProjectStatus(row),
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
    const projectId = randomUUID();
    const result = await db.transaction(async (tx) => {
      await tx.execute(PROJECT_BRIEF_PROVENANCE_LOCK);
      if (
        !(await validActiveBriefProvenance(
          tx,
          projectId,
          userId,
          projectData,
        ))
      ) {
        return { kind: "invalid_brief" as const };
      }
      const [created] = await tx
        .insert(projectsTable)
        .values({
          id: projectId,
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
          status: "draft",
          statusUpdatedAt: sql`now()`,
        })
        .returning();
      if (!created) throw new Error("Project insert returned no row.");
      await tx.insert(projectFinanceSettingsTable).values({
        projectId: created.id,
        ...projectFinanceSeed(projectData),
        updatedByUserId: userId,
      });
      return { kind: "created" as const, project: created };
    });
    if (result.kind === "invalid_brief") {
      res.status(400).json({
        ok: false,
        error:
          "The active brief must belong to the project owner and cannot be linked to another project.",
      });
      return;
    }
    const row = result.project;
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
    const result = await db.transaction(async (tx) => {
      await tx.execute(PROJECT_BRIEF_PROVENANCE_LOCK);
      const [project] = await tx
        .select()
        .from(projectsTable)
        .where(eq(projectsTable.id, String(id)))
        .limit(1)
        .for("update");
      if (!project) return { kind: "not_found" as const };
      if (["completed", "archived"].includes(deriveLegacyProjectStatus(project))) {
        return { kind: "terminal" as const };
      }
      if (
        data !== undefined &&
        !(await validActiveBriefProvenance(
          tx,
          String(id),
          project.userId,
          data,
        ))
      ) {
        return { kind: "invalid_brief" as const };
      }
      const [updated] = await tx
        .update(projectsTable)
        .set(updates)
        .where(eq(projectsTable.id, String(id)))
        .returning();
      return updated
        ? { kind: "updated" as const, project: updated }
        : { kind: "not_found" as const };
    });
    if (result.kind === "not_found") {
      res.status(404).json({ ok: false, error: "Project not found." });
      return;
    }
    if (result.kind === "invalid_brief") {
      res.status(400).json({
        ok: false,
        error:
          "The active brief must belong to the project owner and cannot be linked to another project.",
      });
      return;
    }
    if (result.kind === "terminal") {
      res.status(409).json({ ok: false, error: "Completed and archived projects are read-only." });
      return;
    }
    const row = result.project;
    res.json({
      ok: true,
      project: {
        ...projectResponse(row),
        accessRole,
        status: deriveLegacyProjectStatus(row),
      },
    });
  } catch (err) {
    req.log.error(err, "Failed to update project");
    res.status(500).json({ ok: false, error: "Failed to update project." });
  }
});

router.post("/projects/:id/status", requireSignedIn, async (req, res) => {
  const userId = (req as unknown as { _userId: string })._userId;
  const id = String(req.params.id ?? "");
  const requestedStatus = req.body?.status;
  const reason = req.body?.reason;
  const retryFailedDispatch = req.body?.retryFailedDispatch === true;
  if (!UUID_PATTERN.test(id)) {
    res.status(404).json({ ok: false, error: "Project not found." });
    return;
  }
  if (!isProjectStatus(requestedStatus)) {
    res.status(400).json({
      ok: false,
      error: "status must be one of draft, planning, active, completed, or archived.",
    });
    return;
  }
  if (
    reason !== undefined &&
    (typeof reason !== "string" || reason.trim().length > 1000)
  ) {
    res.status(400).json({ ok: false, error: "reason must be a string of at most 1000 characters." });
    return;
  }
  try {
    const accessRole = await getProjectAccess(id, userId);
    if (!accessRole) {
      res.status(404).json({ ok: false, error: "Project not found." });
      return;
    }
    if (!canTransitionProject(accessRole)) {
      res.status(403).json({ ok: false, error: "Project is read-only." });
      return;
    }
    const result = await db.transaction(async (tx) => {
      const [locked] = await tx
        .select()
        .from(projectsTable)
        .where(eq(projectsTable.id, id))
        .limit(1)
        .for("update");
      if (!locked) return { kind: "not_found" as const };
      if (locked.userId !== userId) {
        const [membership] = await tx
          .select({ role: projectMembersTable.role })
          .from(projectMembersTable)
          .where(and(
            eq(projectMembersTable.projectId, id),
            eq(projectMembersTable.userId, userId),
            eq(projectMembersTable.role, "editor"),
          ))
          .limit(1);
        if (!membership) return { kind: "forbidden" as const };
      }
      const currentStatus = deriveLegacyProjectStatus(locked);
      const transition = classifyProjectTransition(currentStatus, requestedStatus);
      if (transition === "backward" || transition === "skipped") {
        return { kind: "invalid_transition" as const, currentStatus, transition };
      }
      if (transition === "idempotent" && !(requestedStatus === "active" && retryFailedDispatch)) {
        let project = locked;
        if (!isProjectStatus(locked.status)) {
          const [backfilled] = await tx
            .update(projectsTable)
            .set({
              status: currentStatus,
              statusUpdatedAt: locked.updatedAt,
            })
            .where(eq(projectsTable.id, id))
            .returning();
          if (backfilled) project = backfilled;
        }
        return {
          kind: "success" as const,
          project,
          status: currentStatus,
          idempotent: true,
          dispatch: emptyDispatchSummary(),
          email: null,
        };
      }

      let dispatch = emptyDispatchSummary();
      let email: Parameters<typeof dispatchBriefRequestEmails>[0] | null = null;
      if (isActivationTransition(currentStatus, requestedStatus) ||
        (currentStatus === "active" && requestedStatus === "active" && retryFailedDispatch)) {
        const briefId = activeBriefIdIn(locked.data);
        if (!briefId || briefId === "invalid") {
          return { kind: "missing_brief" as const };
        }
        const [brief] = await tx
          .select()
          .from(projectBriefsTable)
          .where(eq(projectBriefsTable.id, briefId))
          .limit(1);
        if (
          !brief ||
          brief.ownerUserId !== locked.userId ||
          (brief.projectId !== null && brief.projectId !== id)
        ) {
          return { kind: "missing_brief" as const };
        }
        const gated = await claimBriefDispatches(
          tx,
          brief.id,
          recipientsFromBriefData(brief.data),
          retryFailedDispatch,
        );
        dispatch = {
          sent: gated.sent,
          alreadySent: gated.alreadySent,
          skipped: gated.skipped,
        };
        if (gated.newRecipientUserIds.length > 0) {
          email = {
            briefId: brief.id,
            ownerUserId: brief.ownerUserId,
            newRecipientUserIds: gated.newRecipientUserIds,
            projectName: brief.projectName,
            venue: brief.venue,
            client: brief.client,
            startDate: brief.startDate,
            endDate: brief.endDate,
          };
        }
      }
      const [updated] = transition === "idempotent"
        ? [locked]
        : await tx
        .update(projectsTable)
        .set({
          status: requestedStatus,
          statusUpdatedAt: sql`now()`,
          updatedAt: sql`now()`,
        })
        .where(eq(projectsTable.id, id))
        .returning();
      if (!updated) return { kind: "not_found" as const };
      if (transition !== "idempotent") {
        await tx.insert(projectStatusHistoryTable).values({
          projectId: id,
          fromStatus: currentStatus,
          toStatus: requestedStatus,
          actorUserId: userId,
          reason: typeof reason === "string" ? reason.trim() || null : null,
        });
      }
      return {
        kind: "success" as const,
        project: updated,
        status: requestedStatus,
        idempotent: transition === "idempotent",
        dispatch,
        email,
      };
    });
    if (result.kind === "not_found") {
      res.status(404).json({ ok: false, error: "Project not found." });
      return;
    }
    if (result.kind === "forbidden") {
      res.status(403).json({ ok: false, error: "Project is read-only." });
      return;
    }
    if (result.kind === "invalid_transition") {
      res.status(409).json({
        ok: false,
        error: result.transition === "backward"
          ? "Project status cannot move backward."
          : "Project status can advance only one stage at a time.",
        status: result.currentStatus,
      });
      return;
    }
    if (result.kind === "missing_brief") {
      res.status(409).json({
        ok: false,
        error: "A valid active brief owned by the project owner is required for activation.",
      });
      return;
    }
    const dispatch = { ...result.dispatch };
    if (result.email) {
      const emailResult = await dispatchBriefRequestEmails(result.email);
      await completeBriefDispatches(result.email.briefId, emailResult.outcomes);
      dispatch.sent = emailResult.sent;
      dispatch.skipped += emailResult.skipped;
    }
    res.json({
      ok: true,
      project: projectResponse(result.project),
      status: result.status,
      idempotent: result.idempotent,
      dispatch,
    });
  } catch (err) {
    req.log.error(err, "Failed to transition project status");
    res.status(500).json({ ok: false, error: "Failed to transition project status." });
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
    const result = await deleteOwnedProject(String(id), userId);
    if (result.kind === "not_found") {
      res.status(404).json({ ok: false, error: "Project not found." });
      return;
    }
    res.status(200).json({ success: true, id: String(id) });
  } catch (err) {
    req.log.error(err, "Failed to delete project");
    res.status(500).json({ error: "Failed to delete project." });
  }
});

export default router;
