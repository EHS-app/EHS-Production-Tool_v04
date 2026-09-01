import { createClerkClient } from "@clerk/express";
import {
  db,
  feedbackReportsTable,
  type FeedbackReport,
} from "@workspace/db";
import { desc, eq } from "drizzle-orm";
import { Router, type IRouter, type RequestHandler } from "express";
import { getUserType } from "../middleware/userType";
import { requireAdmin } from "./admin";

const router: IRouter = Router();

const clerk = process.env.CLERK_SECRET_KEY
  ? createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY })
  : null;

const feedbackTypes = new Set(["bug", "feature_request"]);
const feedbackStatuses = new Set(["open", "in_progress", "resolved"]);

type AuthenticatedRequest = {
  _userId?: string;
};

const requireSignedIn: RequestHandler = (req, res, next) => {
  const auth =
    typeof (req as unknown as { auth?: unknown }).auth === "function"
      ? (req as unknown as { auth: () => { userId?: string | null } }).auth()
      : ((req as unknown as { auth?: { userId?: string | null } }).auth ?? {});
  const userId = auth?.userId ?? null;
  if (!userId) {
    res.status(401).json({ ok: false, error: "Sign in required." });
    return;
  }
  (req as AuthenticatedRequest)._userId = userId;
  next();
};

function getVerifiedPrimaryEmail(user: {
  primaryEmailAddressId?: string | null;
  emailAddresses?: Array<{
    id?: string | null;
    emailAddress?: string | null;
    verification?: { status?: string | null } | null;
  }> | null;
}): string | null {
  if (!user.primaryEmailAddressId) return null;
  const primary = (user.emailAddresses ?? []).find(
    (entry) => entry.id === user.primaryEmailAddressId,
  );
  if (primary?.verification?.status !== "verified") return null;
  return primary.emailAddress?.trim().toLowerCase() || null;
}

function serializeFeedback(report: FeedbackReport) {
  return {
    ...report,
    createdAt: report.createdAt.toISOString(),
  };
}

function isSafePageUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

router.post(
  "/feedback",
  requireSignedIn,
  async (req, res): Promise<void> => {
    const userId = (req as AuthenticatedRequest)._userId!;
    const body = req.body as Record<string, unknown>;
    const type = typeof body.type === "string" ? body.type : "";
    const title = typeof body.title === "string" ? body.title.trim() : "";
    const description =
      typeof body.description === "string" ? body.description.trim() : "";
    const pageUrl =
      typeof body.pageUrl === "string" ? body.pageUrl.trim() : null;

    if (!feedbackTypes.has(type)) {
      res.status(400).json({ ok: false, error: "Invalid feedback type." });
      return;
    }
    if (!title || title.length > 255) {
      res.status(400).json({
        ok: false,
        error: "Title is required and must be at most 255 characters.",
      });
      return;
    }
    if (!description || description.length > 10_000) {
      res.status(400).json({
        ok: false,
        error: "Description is required and must be at most 10,000 characters.",
      });
      return;
    }
    if (pageUrl && pageUrl.length > 512) {
      res
        .status(400)
        .json({ ok: false, error: "Page URL must be at most 512 characters." });
      return;
    }
    if (pageUrl && !isSafePageUrl(pageUrl)) {
      res.status(400).json({
        ok: false,
        error: "Page URL must be a valid HTTP or HTTPS URL.",
      });
      return;
    }
    if (!clerk) {
      res.status(503).json({ ok: false, error: "Identity service unavailable." });
      return;
    }

    try {
      const [user, userRole] = await Promise.all([
        clerk.users.getUser(userId),
        getUserType(userId),
      ]);
      const userEmail = getVerifiedPrimaryEmail(user);
      const [created] = await db
        .insert(feedbackReportsTable)
        .values({
          userId,
          userEmail,
          userRole,
          type,
          title,
          description,
          pageUrl,
          userAgent: req.get("user-agent") ?? null,
          status: "open",
        })
        .returning();

      res.status(201).json(serializeFeedback(created));
    } catch (error) {
      req.log.error(
        {
          userId,
          err: error instanceof Error ? error.message : String(error),
        },
        "Failed to create feedback report",
      );
      res.status(500).json({ ok: false, error: "Unable to submit feedback." });
    }
  },
);

router.get(
  "/admin/feedback",
  requireAdmin,
  async (_req, res): Promise<void> => {
    const reports = await db
      .select()
      .from(feedbackReportsTable)
      .orderBy(desc(feedbackReportsTable.createdAt));
    res.json(reports.map(serializeFeedback));
  },
);

router.patch(
  "/admin/feedback/:id",
  requireAdmin,
  async (req, res): Promise<void> => {
    const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const id = Number.parseInt(rawId, 10);
    const body = req.body as Record<string, unknown>;
    const status = typeof body.status === "string" ? body.status : "";

    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ ok: false, error: "Invalid feedback id." });
      return;
    }
    if (!feedbackStatuses.has(status)) {
      res.status(400).json({ ok: false, error: "Invalid feedback status." });
      return;
    }

    const [updated] = await db
      .update(feedbackReportsTable)
      .set({ status })
      .where(eq(feedbackReportsTable.id, id))
      .returning();

    if (!updated) {
      res.status(404).json({ ok: false, error: "Feedback report not found." });
      return;
    }
    res.json(serializeFeedback(updated));
  },
);

export default router;