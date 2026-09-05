import { createClerkClient } from "@clerk/express";
import { logger } from "./logger";

export type ProjectManager = {
  userId: string;
  name: string;
  email: string | null;
  avatarUrl: string | null;
};

type ClerkUser = {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  username?: string | null;
  imageUrl?: string | null;
  primaryEmailAddressId?: string | null;
  emailAddresses?: Array<{
    id?: string | null;
    emailAddress?: string | null;
    verification?: { status?: string | null } | null;
  }> | null;
};

const clerk = process.env.CLERK_SECRET_KEY
  ? createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY })
  : null;
const CLERK_BATCH_SIZE = 100;

function fallbackManager(userId: string): ProjectManager {
  return { userId, name: "Unknown manager", email: null, avatarUrl: null };
}

function managerFromUser(user: ClerkUser): ProjectManager {
  const emails = user.emailAddresses ?? [];
  const primary = emails.find((email) => email.id === user.primaryEmailAddressId);
  const verifiedPrimary = primary?.verification?.status === "verified"
    ? primary
    : undefined;
  const verifiedEmail = verifiedPrimary ??
    emails.find((email) => email.verification?.status === "verified");
  const email = verifiedEmail?.emailAddress?.trim().toLowerCase() || null;
  const name = [user.firstName, user.lastName].filter(Boolean).join(" ").trim()
    || user.username?.trim()
    || email
    || "Unknown manager";
  return {
    userId: user.id,
    name: name.slice(0, 200),
    email,
    avatarUrl: user.imageUrl?.trim() || null,
  };
}

/**
 * Resolves project owners from the authoritative Clerk directory. Failed
 * directory lookups deliberately produce neutral entries so project reads
 * remain available.
 */
export async function getProjectManagers(
  ownerIds: Iterable<string>,
): Promise<Map<string, ProjectManager>> {
  const ids = [...new Set(ownerIds)].filter(Boolean);
  const managers = new Map(ids.map((id) => [id, fallbackManager(id)]));
  if (!clerk || ids.length === 0) return managers;

  for (let start = 0; start < ids.length; start += CLERK_BATCH_SIZE) {
    const batch = ids.slice(start, start + CLERK_BATCH_SIZE);
    try {
      const result = await clerk.users.getUserList({
        userId: batch,
        limit: batch.length,
      });
      const users = (Array.isArray(result) ? result : result.data) as ClerkUser[];
      for (const user of users) {
        if (managers.has(user.id)) managers.set(user.id, managerFromUser(user));
      }
    } catch (err) {
      logger.warn(
        {
          scope: "projectManagers",
          ownerCount: batch.length,
          err: err instanceof Error ? err.message : String(err),
        },
        "failed to resolve project managers from Clerk",
      );
    }
  }
  return managers;
}