import { Router, type IRouter, type RequestHandler } from "express";
import { eq } from "drizzle-orm";
import { createClerkClient } from "@clerk/express";
import { db, freelancerProfilesTable } from "@workspace/db";
import { logger } from "../lib/logger";

const clerk = process.env.CLERK_SECRET_KEY
  ? createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY })
  : null;

const ADMIN_EMAIL_DOMAIN = "@ehs.no";

function getEmailFromUser(user: {
  primaryEmailAddressId?: string | null;
  emailAddresses?: Array<{
    id?: string | null;
    emailAddress?: string | null;
  }> | null;
}): string | null {
  const list = user.emailAddresses ?? [];
  const primary = list.find(
    (entry) => entry.id === user.primaryEmailAddressId,
  );
  if (typeof primary?.emailAddress === "string") {
    return primary.emailAddress;
  }
  return (
    list.find((entry) => typeof entry.emailAddress === "string")?.emailAddress ??
    null
  );
}

function getVerifiedPrimaryEhsEmail(user: {
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
  const email = primary?.emailAddress?.trim().toLowerCase();
  if (
    primary?.verification?.status !== "verified" ||
    !email?.endsWith(ADMIN_EMAIL_DOMAIN)
  ) {
    return null;
  }
  return email;
}

export const requireAdmin: RequestHandler = async (req, res, next) => {
  if (!clerk) {
    res
      .status(503)
      .json({ ok: false, error: "Admin API unavailable (Clerk not configured)." });
    return;
  }
  const auth =
    typeof (req as unknown as { auth?: unknown }).auth === "function"
      ? (req as unknown as { auth: () => { userId?: string | null } }).auth()
      : ((req as unknown as { auth?: { userId?: string | null } }).auth ?? {});
  const userId = auth?.userId ?? null;
  if (!userId) {
    res.status(401).json({ ok: false, error: "Sign in required." });
    return;
  }
  try {
    const caller = await clerk.users.getUser(userId);
    const email = getVerifiedPrimaryEhsEmail(caller);
    if (!email) {
      res.status(403).json({
        ok: false,
        error:
          "Admin tools require a verified primary EHS email address.",
      });
      return;
    }
    (req as unknown as { _adminEmail: string })._adminEmail = email;
    next();
  } catch (err) {
    logger.warn(
      {
        scope: "admin",
        userId,
        err: err instanceof Error ? err.message : String(err),
      },
      "admin gate: Clerk getUser failed",
    );
    res.status(500).json({ ok: false, error: "Admin auth check failed." });
  }
};

const router: IRouter = Router();

/** Allow an authenticated EHS staff member to repair their own account
 * classification when legacy signup state incorrectly tagged it as a
 * freelancer. The caller cannot name or modify another account here;
 * requireAdmin verifies the signed-in Clerk account has a verified primary
 * @ehs.no email. */
router.post("/admin/claim-employee", requireAdmin, async (req, res) => {
  if (!clerk) {
    res.status(503).json({ ok: false, error: "Clerk not configured." });
    return;
  }
  const auth =
    typeof (req as unknown as { auth?: unknown }).auth === "function"
      ? (req as unknown as { auth: () => { userId?: string | null } }).auth()
      : ((req as unknown as { auth?: { userId?: string | null } }).auth ?? {});
  const userId = auth?.userId ?? null;
  if (!userId) {
    res.status(401).json({ ok: false, error: "Sign in required." });
    return;
  }
  try {
    const user = await clerk.users.getUser(userId);
    await clerk.users.updateUserMetadata(userId, {
      publicMetadata: {
        ...(user.publicMetadata ?? {}),
        userType: "employee",
      },
    });
    await db
      .delete(freelancerProfilesTable)
      .where(eq(freelancerProfilesTable.userId, userId));
    res.json({ ok: true, userType: "employee" });
  } catch (err) {
    logger.error(
      {
        scope: "admin",
        userId,
        err: err instanceof Error ? err.message : String(err),
      },
      "admin: self-service employee classification failed",
    );
    res.status(500).json({ ok: false, error: "Failed to update user type." });
  }
});

/** Set a Clerk user's `publicMetadata.userType` by email. When demoting
 *  to "employee" we also delete any row in `freelancer_profiles` so the
 *  lazy backfill in `getUserType` does not re-tag them on the next
 *  request. Admin-only. */
router.post("/admin/set-user-type", requireAdmin, async (req, res) => {
  if (!clerk) {
    res.status(503).json({ ok: false, error: "Clerk not configured." });
    return;
  }
  const body = (req.body ?? {}) as {
    email?: unknown;
    userType?: unknown;
  };
  const email =
    typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const userType = body.userType === "freelancer" ? "freelancer" : "employee";
  if (!email || !email.includes("@")) {
    res.status(400).json({ ok: false, error: "Valid email required." });
    return;
  }
  try {
    const list = await clerk.users.getUserList({ emailAddress: [email] });
    const users = Array.isArray(list)
      ? list
      : (list as { data?: Array<unknown> }).data || [];
    if (users.length === 0) {
      res.status(404).json({ ok: false, error: "No user found with that email." });
      return;
    }
    const results: Array<{
      userId: string;
      email: string | null;
      previousType: unknown;
      newType: string;
      freelancerProfileDeleted: boolean;
    }> = [];
    for (const u of users as Array<{
      id: string;
      emailAddresses?: Array<{ emailAddress?: string | null }> | null;
      publicMetadata?: Record<string, unknown> | null;
    }>) {
      const previousType = (u.publicMetadata ?? {})?.userType;
      await clerk.users.updateUserMetadata(u.id, {
        publicMetadata: { ...(u.publicMetadata ?? {}), userType },
      });
      let freelancerProfileDeleted = false;
      if (userType === "employee") {
        try {
          const del = await db
            .delete(freelancerProfilesTable)
            .where(eq(freelancerProfilesTable.userId, u.id))
            .returning({ userId: freelancerProfilesTable.userId });
          freelancerProfileDeleted = del.length > 0;
        } catch (err) {
          logger.warn(
            {
              scope: "admin",
              userId: u.id,
              err: err instanceof Error ? err.message : String(err),
            },
            "admin: failed to delete freelancer_profiles row",
          );
        }
      }
      results.push({
        userId: u.id,
        email: getEmailFromUser(u),
        previousType,
        newType: userType,
        freelancerProfileDeleted,
      });
    }
    const adminEmail = (req as unknown as { _adminEmail?: string })._adminEmail;
    logger.info(
      { scope: "admin", adminEmail, email, userType, results },
      "admin: set-user-type completed",
    );
    res.json({ ok: true, results });
  } catch (err) {
    logger.error(
      {
        scope: "admin",
        email,
        err: err instanceof Error ? err.message : String(err),
      },
      "admin: set-user-type failed",
    );
    res.status(500).json({ ok: false, error: "Failed to update user." });
  }
});

/** Delete a Clerk user (and their freelancer_profiles row) by email.
 *  Admin-only. Frees up the email so the person can register fresh. */
router.post("/admin/delete-user", requireAdmin, async (req, res) => {
  if (!clerk) {
    res.status(503).json({ ok: false, error: "Clerk not configured." });
    return;
  }
  const body = (req.body ?? {}) as { email?: unknown };
  const email =
    typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!email || !email.includes("@")) {
    res.status(400).json({ ok: false, error: "Valid email required." });
    return;
  }
  const adminEmail = (req as unknown as { _adminEmail?: string })._adminEmail;
  if (adminEmail && adminEmail.toLowerCase() === email) {
    res
      .status(400)
      .json({ ok: false, error: "Refusing to delete the calling admin account." });
    return;
  }
  try {
    const list = await clerk.users.getUserList({ emailAddress: [email] });
    const users = Array.isArray(list)
      ? list
      : (list as { data?: Array<unknown> }).data || [];
    if (users.length === 0) {
      res.status(404).json({ ok: false, error: "No user found with that email." });
      return;
    }
    const deleted: Array<{ userId: string; email: string | null }> = [];
    for (const u of users as Array<{
      id: string;
      emailAddresses?: Array<{ emailAddress?: string | null }> | null;
    }>) {
      try {
        await db
          .delete(freelancerProfilesTable)
          .where(eq(freelancerProfilesTable.userId, u.id));
      } catch (err) {
        logger.warn(
          {
            scope: "admin",
            userId: u.id,
            err: err instanceof Error ? err.message : String(err),
          },
          "admin: failed to delete freelancer_profiles row during user delete",
        );
      }
      await clerk.users.deleteUser(u.id);
      deleted.push({ userId: u.id, email: getEmailFromUser(u) });
    }
    logger.info(
      { scope: "admin", adminEmail, email, deleted },
      "admin: delete-user completed",
    );
    res.json({ ok: true, deleted });
  } catch (err) {
    logger.error(
      {
        scope: "admin",
        email,
        err: err instanceof Error ? err.message : String(err),
      },
      "admin: delete-user failed",
    );
    res.status(500).json({ ok: false, error: "Failed to delete user." });
  }
});

export default router;
