/**
 * Server-side user type gating.
 *
 * Every Clerk user is classified as either "employee" or
 * "freelancer". The classification is the **server-side source of
 * truth** for whether a signed-in user is allowed to reach Production
 * Tool endpoints. Storing it in Clerk's `publicMetadata` keeps it on
 * Clerk's servers — the user cannot tamper with it from the browser.
 *
 * Behaviour:
 *
 *  - A user is an employee only when their Clerk primary email is
 *    verified and ends with @ehs.no.
 *
 *  - Every other account is a freelancer, regardless of stale metadata.
 *
 *  - We keep Clerk `publicMetadata.userType` synchronized with that
 *    classification for routing consistency across browser sessions.
 *
 * Employee authorization is deliberately not cached: every protected
 * request revalidates the current primary email and verification status.
 *
 * The middleware `requireEmployee` is mounted on Production Tool
 * routers (projects, drawing analyser, venue memory, storage,
 * inspection extract). Freelancers hitting any of those endpoints get
 * a 403 — even if they tampered with the frontend.
 */
import type { RequestHandler } from "express";
import { eq } from "drizzle-orm";
import { createClerkClient } from "@clerk/express";
import { db, freelancerProfilesTable } from "@workspace/db";
import { logger } from "../lib/logger";

export type UserType = "employee" | "freelancer";

const clerk = process.env.CLERK_SECRET_KEY
  ? createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY })
  : null;

if (!clerk) {
  logger.warn(
    { scope: "userType" },
    "CLERK_SECRET_KEY missing — employee authorization will be denied.",
  );
}

type ClerkEmailLike = {
  id?: string | null;
  emailAddress?: string | null;
  verification?: { status?: string | null } | null;
};

export function hasVerifiedPrimaryEhsEmail(user: {
  primaryEmailAddressId?: string | null;
  emailAddresses?: ClerkEmailLike[] | null;
}): boolean {
  if (!user.primaryEmailAddressId) return false;
  const primary = (user.emailAddresses ?? []).find(
    (entry) => entry.id === user.primaryEmailAddressId,
  );
  return (
    primary?.verification?.status === "verified" &&
    primary.emailAddress?.trim().toLowerCase().endsWith("@ehs.no") === true
  );
}

/** Persist the email-derived role on the Clerk user. A verified primary
 *  @ehs.no address cannot be downgraded by a portal tag trigger, while a
 *  stale employee tag on any other account is corrected to freelancer.
 *  Failures are logged but not thrown so portal/profile operations remain
 *  available under the server's safe freelancer fallback. */
export async function tagAsFreelancer(userId: string): Promise<void> {
  if (!clerk) return;
  try {
    const current = await clerk.users.getUser(userId);
    if (hasVerifiedPrimaryEhsEmail(current)) {
      if (
        (current.publicMetadata as Record<string, unknown> | null)?.userType !==
        "employee"
      ) {
        await clerk.users.updateUserMetadata(userId, {
          publicMetadata: {
            ...(current.publicMetadata as Record<string, unknown> | null),
            userType: "employee",
          },
        });
      }
      return;
    }
    const currentType = (
      current.publicMetadata as Record<string, unknown> | null
    )?.userType;
    if (currentType === "freelancer") {
      // Already correctly tagged; skip the redundant write.
      return;
    }
    await clerk.users.updateUserMetadata(userId, {
      publicMetadata: {
        ...(current.publicMetadata as Record<string, unknown> | null),
        userType: "freelancer",
      },
    });
  } catch (err) {
    logger.warn(
      {
        scope: "userType",
        userId,
        err: err instanceof Error ? err.message : String(err),
      },
      "failed to tag user as freelancer",
    );
  }
}

/** Resolve a user's type with fallback inference for legacy accounts.
 * Throws when identity or legacy-profile lookups fail, so authorization
 * uncertainty cannot become employee access. */
export async function getUserType(userId: string): Promise<UserType> {
  // Clerk lookup is the canonical source.
  let clerkLookupFailed = !clerk;
  if (clerk) {
    try {
      const user = await clerk.users.getUser(userId);
      clerkLookupFailed = false;
      const eligibleEmployee = hasVerifiedPrimaryEhsEmail(user);
      const expectedType: UserType = eligibleEmployee
        ? "employee"
        : "freelancer";
      const raw = (user.publicMetadata as Record<string, unknown> | null)
        ?.userType;
      if (raw !== expectedType) {
        await clerk.users.updateUserMetadata(userId, {
          publicMetadata: {
            ...(user.publicMetadata as Record<string, unknown> | null),
            userType: expectedType,
          },
        });
      }
      if (eligibleEmployee) {
        return "employee";
      }
      return "freelancer";
    } catch (err) {
      logger.warn(
        {
          scope: "userType",
          userId,
          err: err instanceof Error ? err.message : String(err),
        },
        "Clerk getUser failed — falling back to DB inference",
      );
    }
  }

  // If Clerk is temporarily unavailable, a legacy profile can still prove
  // freelancer status. It can never be used to infer employee access.
  let dbLookupFailed = false;
  try {
    const rows = await db
      .select({ userId: freelancerProfilesTable.userId })
      .from(freelancerProfilesTable)
      .where(eq(freelancerProfilesTable.userId, userId))
      .limit(1);
    if (rows.length > 0) {
      // Fire-and-forget: the current request is already safely classified
      // as freelancer, and the metadata write only improves consistency.
      void tagAsFreelancer(userId);
      return "freelancer";
    }
  } catch (err) {
    dbLookupFailed = true;
    logger.warn(
      {
        scope: "userType",
        userId,
        err: err instanceof Error ? err.message : String(err),
      },
      "DB userType inference failed",
    );
  }

  // An unclassified user is an employee only when both identity and legacy
  // profile lookups completed successfully. Authorization uncertainty must
  // never become employee access.
  if (clerkLookupFailed || dbLookupFailed) {
    throw new Error("Unable to resolve user type safely.");
  }
  // External accounts need positive employee metadata to enter the
  // Production Tool. Persist the safe freelancer default so subsequent
  // browser sessions and server requests agree immediately.
  await tagAsFreelancer(userId);
  return "freelancer";
}

/** Middleware: 401 if not signed in, 403 if the signed-in user is a
 *  freelancer. Mounted on every Production Tool router so the
 *  Production Tool surface is unreachable to freelancers even if they
 *  bypass the frontend redirect. */
export const requireEmployee: RequestHandler = async (req, res, next) => {
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
    const type = await getUserType(userId);
    if (type === "freelancer") {
      res.status(403).json({
        ok: false,
        error: "This area is restricted to EHS employees.",
        userType: "freelancer",
      });
      return;
    }
  } catch (err) {
    logger.error(
      {
        scope: "userType",
        userId,
        err: err instanceof Error ? err.message : String(err),
      },
      "requireEmployee middleware threw — denying access",
    );
    res.status(503).json({
      ok: false,
      error: "Employee authorization is temporarily unavailable.",
    });
    return;
  }
  (req as unknown as { _userId: string })._userId = userId;
  next();
};
