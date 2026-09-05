import { Router, type IRouter } from "express";
import { and, asc, desc, eq, gt, lt, or } from "drizzle-orm";
import { createClerkClient } from "@clerk/express";
import { db, projectMessagesTable } from "@workspace/db";
import {
  getEmployeeProjectAccess,
  isProjectWriter,
  UUID_PATTERN,
} from "../lib/projectAccess";

const router: IRouter = Router();
const clerk = process.env.CLERK_SECRET_KEY
  ? createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY })
  : null;

function param(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

router.get("/projects/:projectId/messages", async (req, res): Promise<void> => {
  const projectId = param(req.params.projectId);
  const userId = (req as unknown as { _userId: string })._userId;
  if (!UUID_PATTERN.test(projectId)) {
    res.status(404).json({ ok: false, error: "Project not found." });
    return;
  }
  const rawLimit = param(req.query.limit as string | string[] | undefined);
  const limit = rawLimit ? Number(rawLimit) : 50;
  const before = param(req.query.before as string | string[] | undefined);
  const after = param(req.query.after as string | string[] | undefined);
  if (!Number.isInteger(limit) || limit < 1 || limit > 100 || (before && after)) {
    res.status(400).json({ ok: false, error: "Invalid message pagination." });
    return;
  }
  try {
    if (!(await getEmployeeProjectAccess(projectId, userId))) {
      res.status(404).json({ ok: false, error: "Project not found." });
      return;
    }
    let cursor: { createdAt: Date; id: string } | undefined;
    const cursorId = before || after;
    if (cursorId) {
      if (!UUID_PATTERN.test(cursorId)) {
        res.status(400).json({ ok: false, error: "Invalid message cursor." });
        return;
      }
      [cursor] = await db
        .select({ createdAt: projectMessagesTable.createdAt, id: projectMessagesTable.id })
        .from(projectMessagesTable)
        .where(
          and(
            eq(projectMessagesTable.projectId, projectId),
            eq(projectMessagesTable.id, cursorId),
          ),
        )
        .limit(1);
      if (!cursor) {
        res.status(400).json({ ok: false, error: "Invalid message cursor." });
        return;
      }
    }
    const older = Boolean(before) || !after;
    const predicate = cursor
      ? older
        ? or(
            lt(projectMessagesTable.createdAt, cursor.createdAt),
            and(eq(projectMessagesTable.createdAt, cursor.createdAt), lt(projectMessagesTable.id, cursor.id)),
          )
        : or(
            gt(projectMessagesTable.createdAt, cursor.createdAt),
            and(eq(projectMessagesTable.createdAt, cursor.createdAt), gt(projectMessagesTable.id, cursor.id)),
          )
      : undefined;
    const rows = await db
      .select()
      .from(projectMessagesTable)
      .where(
        predicate
          ? and(eq(projectMessagesTable.projectId, projectId), predicate)
          : eq(projectMessagesTable.projectId, projectId),
      )
      .orderBy(
        older ? desc(projectMessagesTable.createdAt) : asc(projectMessagesTable.createdAt),
        older ? desc(projectMessagesTable.id) : asc(projectMessagesTable.id),
      )
      .limit(limit + 1);
    const hasMore = rows.length > limit;
    const page = hasMore ? rows.slice(0, limit) : rows;
    // Older pages are fetched newest-first for an efficient cursor scan, but
    // every response is chronologically stable for clients.
    const messages = older ? page.reverse() : page;
    res.json({ ok: true, messages, hasMore });
  } catch (error) {
    req.log.error(error, "Failed to list project messages");
    res.status(500).json({ ok: false, error: "Failed to list project messages." });
  }
});

router.post("/projects/:projectId/messages", async (req, res): Promise<void> => {
  const projectId = param(req.params.projectId);
  const userId = (req as unknown as { _userId: string })._userId;
  const body = typeof req.body?.body === "string" ? req.body.body.trim() : "";
  if (!UUID_PATTERN.test(projectId)) {
    res.status(404).json({ ok: false, error: "Project not found." });
    return;
  }
  if (!body || body.length > 4000) {
    res.status(400).json({ ok: false, error: "Message body must be 1–4000 characters." });
    return;
  }
  if (!clerk) {
    res.status(503).json({ ok: false, error: "Chat is unavailable (Clerk not configured)." });
    return;
  }
  try {
    const role = await getEmployeeProjectAccess(projectId, userId);
    if (!role) {
      res.status(404).json({ ok: false, error: "Project not found." });
      return;
    }
    if (!isProjectWriter(role)) {
      res.status(403).json({ ok: false, error: "Project is read-only." });
      return;
    }
    const user = await clerk.users.getUser(userId);
    const primary = user.emailAddresses.find((email) => email.id === user.primaryEmailAddressId);
    const email = primary?.emailAddress?.trim().toLowerCase();
    if (!email || primary?.verification?.status !== "verified") {
      res.status(403).json({ ok: false, error: "A verified primary email is required." });
      return;
    }
    const name = [user.firstName, user.lastName].filter(Boolean).join(" ").trim()
      || user.username
      || email;
    const [message] = await db
      .insert(projectMessagesTable)
      .values({ projectId, authorUserId: userId, authorName: name.slice(0, 200), authorEmail: email, body })
      .returning();
    res.status(201).json({ ok: true, message });
  } catch (error) {
    req.log.error(error, "Failed to create project message");
    res.status(500).json({ ok: false, error: "Failed to create project message." });
  }
});

export default router;