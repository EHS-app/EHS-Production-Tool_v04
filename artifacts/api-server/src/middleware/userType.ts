/**
 * Server-side user type gating.
 *
 * Every Clerk user is classified as either "employee" (default) or
 * "freelancer". The classification is the **server-side source of
 * truth** for whether a signed-in user is allowed to reach Production
 * Tool endpoints. Storing it in Clerk's `publicMetadata` keeps it on
 * Clerk's servers — the user cannot tamper with it from the browser.
 *
 * Behaviour:
 *
 *  - On first read, we look at `user.publicMetadata.userType`.
 *
 *  - If unset (existing users created before this feature shipped) we
 *    fall back to a DB check: a row in `freelancer_profiles` means
 *    they signed up via the Frilanser tab, so we infer "freelancer"
 *    and lazily write that back into Clerk so the lookup is correct
 *    on subsequent requests.
 *
 *  - Untagged @ehs.no accounts are trusted staff and become "employee".
 *
 *  - Any other untagged account defaults to "freelancer", never employee.
 *
 *  - Results are cached for 60 seconds per userId to avoid hammering
 *    Clerk on every request from the same active user.
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

const TTL_MS = 60_000;
type CacheEntry = { type: UserType; at: number };
const cache = new Map<string, CacheEntry>();

function hasEhsStaffEmail(user: {
  emailAddresses?: Array<{ emailAddress?: string | null }> | null;
}): boolean {
  return (user.emailAddresses ?? []).some((entry) =>
    entry.emailAddress?.trim().toLowerCase().endsWith("@ehs.no"),
  );
}

function readCache(userId: string): UserType | null {
  const hit = cache.get(userId);
  if (!hit) return null;
  if (Date.now() - hit.at > TTL_MS) {
    cache.delete(userId);
    return null;
  }
  return hit.type;
}

function writeCache(userId: string, type: UserType): void {
  cache.set(userId, { type, at: Date.now() });
}

/** Invalidate a single userId's cached type. Call this any time we
 *  *change* a user's metadata server-side (e.g. tagging on signup,
 *  backfill writes) so the very next request reflects the new value. */
export function invalidateUserTypeCache(userId: string): void {
  cache.delete(userId);
}

/** Persist `userType=freelancer` on the Clerk user. No-op if the
 *  Clerk client isn't configured (dev without a secret key) OR if
 *  the user is already tagged as `userType=employee` — we never
 *  silently downgrade an employee to freelancer, even if a stray
 *  caller (e.g. an admin testing the portal endpoints with an
 *  employee account) hits one of the tag triggers. Failures are
 *  logged but not thrown — the upstream caller (signup, backfill,
 *  lazy lookup) should still succeed even if the write fails. */
export async function tagAsFreelancer(userId: string): Promise<void> {
  if (!clerk) return;
  try {
    // Read-before-write protects employees from accidental
    // self-downgrade. The cost is one extra Clerk call per first
    // write per user, which is negligible — subsequent calls hit the
    // cache via `getUserType` and skip the tag flow entirely.
    const current = await clerk.users.getUser(userId);
    const currentType = (
      current.publicMetadata as Record<string, unknown> | null
    )?.userType;
    if (currentType === "employee") {
      logger.warn(
        { scope: "userType", userId },
        "refusing to tag user as freelancer — already tagged employee",
      );
      writeCache(userId, "employee");
      return;
    }
    if (currentType === "freelancer") {
      // Already correctly tagged; just refresh the cache and skip
      // the redundant write.
      writeCache(userId, "freelancer");
      return;
    }
    await clerk.users.updateUserMetadata(userId, {
      publicMetadata: { userType: "freelancer" },
    });
    writeCache(userId, "freelancer");
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
 * Throws when identity or legacy-profile lookups fail and no cached or
 * explicit classification is available, so authorization uncertainty
 * cannot become employee access. */
export async function getUserType(userId: string): Promise<UserType> {
  const cached = readCache(userId);
  if (cached) return cached;

  // Clerk lookup is the canonical source.
  let clerkLookupFailed = !clerk;
  if (clerk) {
    try {
      const user = await clerk.users.getUser(userId);
      clerkLookupFailed = false;
      const raw = (user.publicMetadata as Record<string, unknown> | null)
        ?.userType;
      if (raw === "freelancer" || raw === "employee") {
        writeCache(userId, raw);
        return raw;
      }
      if (hasEhsStaffEmail(user)) {
        await clerk.users.updateUserMetadata(userId, {
          publicMetadata: {
            ...(user.publicMetadata as Record<string, unknown> | null),
            userType: "employee",
          },
        });
        writeCache(userId, "employee");
        return "employee";
      }
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

  // Legacy inference: any row in freelancer_profiles means this user
  // signed up via the Frilanser tab before we started tagging. Tag
  // them now so the lookup is fast and correct from the next request.
  let dbLookupFailed = false;
  try {
    const rows = await db
      .select({ userId: freelancerProfilesTable.userId })
      .from(freelancerProfilesTable)
      .where(eq(freelancerProfilesTable.userId, userId))
      .limit(1);
    if (rows.length > 0) {
      // Fire-and-forget: don't block the request waiting for Clerk's
      // metadata write; the cache is already populated below.
      void tagAsFreelancer(userId);
      writeCache(userId, "freelancer");
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
  writeCache(userId, "freelancer");
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
