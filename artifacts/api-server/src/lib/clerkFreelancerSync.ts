import { createClerkClient } from "@clerk/express";
import { db, freelancerProfilesTable } from "@workspace/db";
import { inArray } from "drizzle-orm";
import { hasVerifiedPrimaryEhsEmail } from "../middleware/userType";

type ClerkDirectoryUser = {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  username?: string | null;
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

function clean(value: string | null | undefined): string {
  return typeof value === "string" ? value.trim() : "";
}

export function legacyFreelancerIdentity(user: ClerkDirectoryUser): {
  fullName: string;
  email: string;
} {
  const primaryEmail =
    user.emailAddresses?.find(
      (entry) => entry.id === user.primaryEmailAddressId,
    )?.emailAddress ?? user.emailAddresses?.[0]?.emailAddress;
  const email = clean(primaryEmail);
  const explicitName = [clean(user.firstName), clean(user.lastName)]
    .filter(Boolean)
    .join(" ");
  const emailPrefix = clean(email.split("@")[0]);
  const fullName =
    explicitName ||
    clean(user.username) ||
    emailPrefix ||
    `Freelancer ${user.id.slice(-6)}`;

  return { fullName, email };
}

/**
 * Backfill Clerk freelancers that have never saved a local portal profile.
 * Existing rows are excluded before insertion and protected again by
 * ON CONFLICT DO NOTHING; this function has no update path.
 */
export async function syncMissingClerkFreelancerProfiles(): Promise<number> {
  if (!clerk) return 0;

  const limit = 100;
  let offset = 0;
  let insertedCount = 0;

  while (true) {
    const page = await clerk.users.getUserList({ limit, offset });
    const freelancers = (page.data as ClerkDirectoryUser[]).filter(
      (user) => !hasVerifiedPrimaryEhsEmail(user),
    );

    if (freelancers.length > 0) {
      const userIds = freelancers.map((user) => user.id);
      const existing = await db
        .select({ userId: freelancerProfilesTable.userId })
        .from(freelancerProfilesTable)
        .where(inArray(freelancerProfilesTable.userId, userIds));
      const existingIds = new Set(existing.map((row) => row.userId));
      const missing = freelancers.filter((user) => !existingIds.has(user.id));

      if (missing.length > 0) {
        const inserted = await db
          .insert(freelancerProfilesTable)
          .values(
            missing.map((user) => ({
              userId: user.id,
              ...legacyFreelancerIdentity(user),
            })),
          )
          .onConflictDoNothing({ target: freelancerProfilesTable.userId })
          .returning({ userId: freelancerProfilesTable.userId });
        insertedCount += inserted.length;
      }
    }

    const received = page.data.length;
    offset += received;
    if (
      received === 0 ||
      received < limit ||
      (typeof page.totalCount === "number" && offset >= page.totalCount)
    ) {
      break;
    }
  }

  return insertedCount;
}