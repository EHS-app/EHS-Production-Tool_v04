import { Router, type IRouter } from "express";
import { and, eq } from "drizzle-orm";
import { createClerkClient } from "@clerk/express";
import { db, projectMembersTable, projectsTable } from "@workspace/db";
import { getProjectAccess, UUID_PATTERN } from "../lib/projectAccess";

const router: IRouter = Router();
const clerk = process.env.CLERK_SECRET_KEY
  ? createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY })
  : null;

type ClerkUser = {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  username?: string | null;
  primaryEmailAddressId?: string | null;
  emailAddresses: Array<{
    id?: string | null;
    emailAddress?: string | null;
    verification?: { status?: string | null } | null;
  }>;
};

function param(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function identity(user: ClerkUser) {
  const primary = user.emailAddresses.find(
    (entry) => entry.id === user.primaryEmailAddressId,
  );
  const email = primary?.emailAddress?.trim().toLowerCase() ?? null;
  const name =
    [user.firstName, user.lastName].filter(Boolean).join(" ").trim() ||
    user.username ||
    email ||
    user.id;
  return { userId: user.id, name: name.slice(0, 200), email };
}

function verifiedEhsIdentity(user: ClerkUser) {
  const primary = user.emailAddresses.find(
    (entry) => entry.id === user.primaryEmailAddressId,
  );
  const result = identity(user);
  return primary?.verification?.status === "verified" &&
    result.email?.endsWith("@ehs.no")
    ? result
    : null;
}

async function ownerProject(projectId: string, userId: string) {
  const [project] = await db
    .select({ ownerId: projectsTable.userId })
    .from(projectsTable)
    .where(eq(projectsTable.id, projectId))
    .limit(1);
  return project?.ownerId === userId ? project : null;
}

router.get("/projects/:projectId/members", async (req, res): Promise<void> => {
  const projectId = param(req.params.projectId);
  const userId = (req as unknown as { _userId: string })._userId;
  if (!UUID_PATTERN.test(projectId)) {
    res.status(404).json({ ok: false, error: "Project not found." });
    return;
  }
  if (!clerk) {
    res.status(503).json({ ok: false, error: "Members are unavailable (Clerk not configured)." });
    return;
  }
  try {
    const currentRole = await getProjectAccess(projectId, userId);
    if (!currentRole) {
      res.status(404).json({ ok: false, error: "Project not found." });
      return;
    }
    const [project] = await db.select({ ownerId: projectsTable.userId }).from(projectsTable)
      .where(eq(projectsTable.id, projectId)).limit(1);
    const memberships = await db.select().from(projectMembersTable)
      .where(eq(projectMembersTable.projectId, projectId));
    const users = await Promise.all([project!.ownerId, ...memberships.map((member) => member.userId)]
      .map((id) => clerk.users.getUser(id)));
    const members = [
      { ...identity(users[0] as ClerkUser), role: "owner", isOwner: true },
      ...memberships.map((member, index) => ({
        ...(identity(users[index + 1] as ClerkUser)),
        role: member.role,
        addedAt: member.addedAt,
        isOwner: false,
      })),
    ];
    res.json({ ok: true, currentRole, members });
  } catch (error) {
    req.log.error(error, "Failed to list project members");
    res.status(500).json({ ok: false, error: "Failed to list project members." });
  }
});

router.post("/projects/:projectId/members", async (req, res): Promise<void> => {
  const projectId = param(req.params.projectId);
  const callerId = (req as unknown as { _userId: string })._userId;
  const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
  const role = req.body?.role;
  if (!UUID_PATTERN.test(projectId)) {
    res.status(404).json({ ok: false, error: "Project not found." });
    return;
  }
  if (!email || email.length > 320 || !["editor", "viewer"].includes(role)) {
    res.status(400).json({ ok: false, error: "Valid employee email and editor or viewer role required." });
    return;
  }
  if (!clerk) {
    res.status(503).json({ ok: false, error: "Members are unavailable (Clerk not configured)." });
    return;
  }
  try {
    const project = await ownerProject(projectId, callerId);
    if (!project) {
      res.status(404).json({ ok: false, error: "Project not found." });
      return;
    }
    const listed = await clerk.users.getUserList({ emailAddress: [email] });
    const matches = (Array.isArray(listed) ? listed : listed.data) as ClerkUser[];
    const user = matches.find((candidate) => identity(candidate).email === email);
    const member = user && verifiedEhsIdentity(user);
    if (!member) {
      res.status(400).json({ ok: false, error: "User must have a verified primary @ehs.no email." });
      return;
    }
    if (member.userId === project.ownerId) {
      res.status(400).json({ ok: false, error: "The project owner is already a member." });
      return;
    }
    const inserted = await db.insert(projectMembersTable)
      .values({ projectId, userId: member.userId, role })
      .onConflictDoNothing()
      .returning();
    if (!inserted[0]) {
      res.status(409).json({ ok: false, error: "User is already a project member." });
      return;
    }
    res.status(201).json({ ok: true, member: { ...member, role, addedAt: inserted[0].addedAt } });
  } catch (error) {
    req.log.error(error, "Failed to add project member");
    res.status(500).json({ ok: false, error: "Failed to add project member." });
  }
});

router.delete("/projects/:projectId/members/:userId", async (req, res): Promise<void> => {
  const projectId = param(req.params.projectId);
  const removeUserId = param(req.params.userId);
  const callerId = (req as unknown as { _userId: string })._userId;
  if (!UUID_PATTERN.test(projectId) || !removeUserId || removeUserId.length > 200) {
    res.status(404).json({ ok: false, error: "Project member not found." });
    return;
  }
  try {
    const project = await ownerProject(projectId, callerId);
    if (!project) {
      res.status(404).json({ ok: false, error: "Project not found." });
      return;
    }
    if (removeUserId === project.ownerId) {
      res.status(400).json({ ok: false, error: "The project owner cannot be removed." });
      return;
    }
    const removed = await db.delete(projectMembersTable).where(and(
      eq(projectMembersTable.projectId, projectId),
      eq(projectMembersTable.userId, removeUserId),
    )).returning({ userId: projectMembersTable.userId });
    if (!removed[0]) {
      res.status(404).json({ ok: false, error: "Project member not found." });
      return;
    }
    res.json({ ok: true });
  } catch (error) {
    req.log.error(error, "Failed to remove project member");
    res.status(500).json({ ok: false, error: "Failed to remove project member." });
  }
});

export default router;