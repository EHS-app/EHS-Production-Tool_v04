/**
 * One-time backfill: tag every existing freelancer account in Clerk
 * with `publicMetadata.userType="freelancer"`. Idempotent — safe to
 * re-run; users already tagged are skipped without an API call.
 *
 * Usage (from the repo root):
 *
 *   pnpm --filter @workspace/scripts run tag-existing-freelancers
 *
 * Requires DATABASE_URL and CLERK_SECRET_KEY in the environment. In
 * the Replit workspace both are provided automatically.
 *
 * What it does:
 *
 *   1. Selects every `user_id` from `freelancer_profiles`.
 *   2. For each id, fetches the Clerk user and checks
 *      `publicMetadata.userType`.
 *   3. If the metadata is unset or set to something other than
 *      "freelancer", writes the tag. If the user was already tagged,
 *      it's skipped.
 *   4. Prints a one-line summary per user and a final totals line.
 *
 * The runtime middleware (`getUserType` in api-server) ALSO lazily
 * backfills on first request, so this script is optional — but
 * running it once after deploy guarantees every existing freelancer
 * is locked out of the Production Tool from the very next sign-in,
 * even before they hit any endpoint.
 */
import { createClerkClient } from "@clerk/express";
import { db, freelancerProfilesTable } from "@workspace/db";

async function main(): Promise<void> {
  const secret = process.env.CLERK_SECRET_KEY;
  if (!secret) {
    console.error("CLERK_SECRET_KEY is required.");
    process.exit(1);
  }
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is required.");
    process.exit(1);
  }
  const clerk = createClerkClient({ secretKey: secret });

  console.log("Loading freelancer user ids from the database…");
  const rows = await db
    .select({ userId: freelancerProfilesTable.userId })
    .from(freelancerProfilesTable);
  console.log(`Found ${rows.length} freelancer profile(s).`);

  let tagged = 0;
  let alreadyTagged = 0;
  let missing = 0;
  let failed = 0;

  for (const { userId } of rows) {
    try {
      const user = await clerk.users.getUser(userId);
      const current = (user.publicMetadata as Record<string, unknown> | null)
        ?.userType;
      if (current === "freelancer") {
        alreadyTagged += 1;
        console.log(`  skip ${userId} (already tagged)`);
        continue;
      }
      await clerk.users.updateUserMetadata(userId, {
        publicMetadata: { userType: "freelancer" },
      });
      tagged += 1;
      console.log(`  tagged ${userId}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      // 404 means the freelancer_profiles row references a Clerk user
      // that no longer exists (account deleted in Clerk dashboard);
      // counted separately so the operator can audit if needed.
      if (/not.?found|404/i.test(msg)) {
        missing += 1;
        console.log(`  missing ${userId} (no Clerk user)`);
      } else {
        failed += 1;
        console.warn(`  FAILED ${userId}: ${msg}`);
      }
    }
  }

  console.log("");
  console.log("Backfill complete.");
  console.log(`  tagged:         ${tagged}`);
  console.log(`  already tagged: ${alreadyTagged}`);
  console.log(`  missing:        ${missing}`);
  console.log(`  failed:         ${failed}`);
  console.log(`  total:          ${rows.length}`);
  // Exit 0 even with failures so a single Clerk hiccup doesn't make
  // an operator think the whole run was bad — the per-user logs show
  // which ids to retry, and the script is safe to re-run.
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
