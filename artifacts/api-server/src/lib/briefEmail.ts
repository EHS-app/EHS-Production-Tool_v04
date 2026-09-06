import { inArray } from "drizzle-orm";
import { createClerkClient } from "@clerk/express";
import { db, freelancerProfilesTable } from "@workspace/db";
import { logger } from "./logger";
import { sendGmail } from "./gmail";
import { buildPortalBriefUrl } from "./portalUrl";

const clerk = process.env.CLERK_SECRET_KEY
  ? createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY })
  : null;

async function lookupProducerName(userId: string): Promise<string> {
  if (!clerk) return "produsent";
  try {
    const user = await clerk.users.getUser(userId);
    const name = [user.firstName ?? "", user.lastName ?? ""]
      .join(" ")
      .trim();
    if (name) return name;
    const primary = user.emailAddresses?.find(
      (e) => e.id === user.primaryEmailAddressId,
    )?.emailAddress;
    return primary ?? "produsent";
  } catch (err) {
    logger.warn(
      { userId, err: err instanceof Error ? err.message : String(err) },
      "could not resolve producer name from Clerk",
    );
    return "produsent";
  }
}

function formatDateRange(
  startDate: string | null,
  endDate: string | null,
): string {
  if (!startDate) return "";
  if (!endDate || endDate === startDate) return startDate;
  return `${startDate} – ${endDate}`;
}

function buildBody(args: {
  recipientName: string;
  producerName: string;
  projectName: string;
  venue: string;
  client: string;
  dateRange: string;
  projectBrief: string;
  link: string;
}): string {
  const greeting = args.recipientName ? `Hei ${args.recipientName},` : "Hei,";
  const detailLines: string[] = [];
  if (args.projectName) detailLines.push(`Prosjekt: ${args.projectName}`);
  if (args.venue && args.venue !== args.projectName) {
    detailLines.push(`Venue: ${args.venue}`);
  }
  if (args.client) detailLines.push(`Kunde: ${args.client}`);
  if (args.dateRange) detailLines.push(`Dato: ${args.dateRange}`);
  if (args.projectBrief.trim()) {
    detailLines.push("", "Prosjektbrief:", args.projectBrief);
  }
  const lines = [
    greeting,
    "",
    `Du har fått en ny forespørsel fra ${args.producerName}.`,
    ...(detailLines.length > 0 ? ["", ...detailLines] : []),
    "",
    "Åpne forespørselen i portalen for å takke ja eller nei:",
    args.link,
    "",
    "Vennlig hilsen,",
    "EHS Freelance Portal",
  ];
  return lines.join("\n");
}

export async function dispatchBriefRequestEmails(args: {
  briefId: string;
  ownerUserId: string;
  newRecipientUserIds: string[];
  projectName: string;
  venue: string;
  client: string;
  startDate: string | null;
  endDate: string | null;
  projectBrief?: string;
}): Promise<{ sent: number; skipped: number; outcomes: { freelancerUserId: string; sent: boolean }[] }> {
  if (args.newRecipientUserIds.length === 0) return { sent: 0, skipped: 0, outcomes: [] };
  try {
    const link = buildPortalBriefUrl(args.briefId);
    const producerName = await lookupProducerName(args.ownerUserId);
    const subject = `Ny forespørsel fra ${producerName}`;
    const dateRange = formatDateRange(args.startDate, args.endDate);

    const profiles = await db
      .select({
        userId: freelancerProfilesTable.userId,
        email: freelancerProfilesTable.email,
        fullName: freelancerProfilesTable.fullName,
      })
      .from(freelancerProfilesTable)
      .where(
        inArray(freelancerProfilesTable.userId, args.newRecipientUserIds),
      );

    const profileIds = new Set(profiles.map((p) => p.userId));
    let sent = 0;
    let skipped = args.newRecipientUserIds.length - profileIds.size;
    const outcomes: { freelancerUserId: string; sent: boolean }[] = [];
    for (const uid of args.newRecipientUserIds) {
      if (!profileIds.has(uid)) {
        outcomes.push({ freelancerUserId: uid, sent: false });
        logger.info(
          { briefId: args.briefId, freelancerUserId: uid },
          "brief email skipped: no freelancer profile",
        );
      }
    }

    for (const p of profiles) {
      const to = (p.email ?? "").trim();
      if (!to) {
        skipped += 1;
        outcomes.push({ freelancerUserId: p.userId, sent: false });
        logger.info(
          { briefId: args.briefId, freelancerUserId: p.userId },
          "brief email skipped: no email on freelancer profile",
        );
        continue;
      }
      const recipientName = (p.fullName ?? "").trim();
      const body = buildBody({
        recipientName,
        producerName,
        projectName: args.projectName,
        venue: args.venue,
        client: args.client,
        dateRange,
        projectBrief: args.projectBrief ?? "",
        link,
      });
      const result = await sendGmail({
        to,
        toName: recipientName || undefined,
        subject,
        textBody: body,
      });
      if (result.ok) {
        sent += 1;
        outcomes.push({ freelancerUserId: p.userId, sent: true });
        logger.info(
          {
            briefId: args.briefId,
            freelancerUserId: p.userId,
            messageId: result.id,
          },
          "brief request email sent",
        );
      } else {
        skipped += 1;
        outcomes.push({ freelancerUserId: p.userId, sent: false });
        // Intentionally do NOT log the recipient address — userId is
        // enough to correlate with the freelancer profile, and avoids
        // dropping PII into the log stream.
        logger.warn(
          {
            briefId: args.briefId,
            freelancerUserId: p.userId,
            error: result.error,
          },
          "brief request email failed",
        );
      }
    }
    return { sent, skipped, outcomes };
  } catch (err) {
    logger.error(
      {
        briefId: args.briefId,
        err: err instanceof Error ? err.message : String(err),
      },
      "dispatchBriefRequestEmails failed",
    );
    return { sent: 0, skipped: args.newRecipientUserIds.length, outcomes: args.newRecipientUserIds.map((freelancerUserId) => ({ freelancerUserId, sent: false })) };
  }
}
