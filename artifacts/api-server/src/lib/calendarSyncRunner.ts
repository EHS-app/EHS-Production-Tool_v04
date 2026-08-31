import { and, eq, lte, or, sql } from "drizzle-orm";
import {
  db,
  calendarBusyIntervalsTable,
  calendarConnectionsTable,
  calendarSyncJobsTable,
} from "@workspace/db";
import { open } from "./calendarCrypto";
import { fetchIcs, type BusyRange } from "./calendarSync";
import { logger } from "./logger";

const HORIZON_DAYS = 180;
type TokenSet = {
  access_token?: string;
  refresh_token?: string;
  expires_at?: number;
  accountLabel?: string;
};

function config(provider: string): {
  clientId: string;
  clientSecret: string;
  tokenUrl: string;
} {
  if (provider === "google")
    return {
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      tokenUrl: "https://oauth2.googleapis.com/token",
    };
  return {
    clientId: process.env.MICROSOFT_CLIENT_ID ?? "",
    clientSecret: process.env.MICROSOFT_CLIENT_SECRET ?? "",
    tokenUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/token",
  };
}
async function accessToken(
  provider: string,
  encrypted: string,
): Promise<TokenSet> {
  const tokens = JSON.parse(open(encrypted)) as TokenSet;
  if (tokens.access_token && (tokens.expires_at ?? 0) > Date.now() + 60_000)
    return tokens;
  if (!tokens.refresh_token)
    throw new Error("Calendar authorization has expired; reconnect it.");
  const c = config(provider);
  const body = new URLSearchParams({
    client_id: c.clientId,
    client_secret: c.clientSecret,
    grant_type: "refresh_token",
    refresh_token: tokens.refresh_token,
  });
  const response = await fetch(c.tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    signal: AbortSignal.timeout(12_000),
  });
  if (!response.ok)
    throw new Error("Calendar authorization refresh failed; reconnect it.");
  const refreshed = (await response.json()) as Record<string, unknown>;
  return {
    access_token:
      typeof refreshed.access_token === "string" ? refreshed.access_token : "",
    refresh_token:
      typeof refreshed.refresh_token === "string"
        ? refreshed.refresh_token
        : tokens.refresh_token,
    expires_at:
      Date.now() + Math.max(60, Number(refreshed.expires_in) || 3600) * 1000,
    accountLabel: tokens.accountLabel,
  };
}
async function providerBusy(
  provider: string,
  token: string,
  calendarIds: string[],
): Promise<BusyRange[]> {
  const start = new Date();
  const end = new Date(Date.now() + HORIZON_DAYS * 86400000);
  if (provider === "google") {
    const response = await fetch(
      "https://www.googleapis.com/calendar/v3/freeBusy",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          timeMin: start.toISOString(),
          timeMax: end.toISOString(),
          items: (calendarIds.length ? calendarIds : ["primary"]).map((id) => ({
            id,
          })),
        }),
        signal: AbortSignal.timeout(15_000),
      },
    );
    if (!response.ok)
      throw new Error(`Google free/busy failed (${response.status}).`);
    const data = (await response.json()) as {
      calendars?: Record<string, { busy?: { start: string; end: string }[] }>;
    };
    return Object.entries(data.calendars ?? {})
      .flatMap(([id, c]) =>
        (c.busy ?? []).map((b, i) => ({
          sourceKey: `google:${id}:${b.start}:${b.end}:${i}`,
          startsAt: new Date(b.start),
          endsAt: new Date(b.end),
        })),
      )
      .filter(
        (r) => !Number.isNaN(r.startsAt.getTime()) && r.endsAt > r.startsAt,
      );
  }
  // calendarView addresses the signed-in account directly; unlike
  // getSchedule it does not need a guessed mailbox/calendar identifier.
  let next = `https://graph.microsoft.com/v1.0/me/calendarView?${new URLSearchParams({ startDateTime: start.toISOString(), endDateTime: end.toISOString(), $select: "id,start,end,showAs", $top: "200" })}`;
  const ranges: BusyRange[] = [];
  for (let page = 0; next && page < 10; page++) {
    const response = await fetch(next, {
      headers: {
        Authorization: `Bearer ${token}`,
        Prefer: 'outlook.timezone="UTC"',
      },
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok)
      throw new Error(`Microsoft calendar read failed (${response.status}).`);
    const data = (await response.json()) as {
      value?: {
        id?: string;
        showAs?: string;
        start?: { dateTime?: string };
        end?: { dateTime?: string };
      }[];
      "@odata.nextLink"?: string;
    };
    for (const event of data.value ?? []) {
      if (
        event.showAs === "free" ||
        !event.id ||
        !event.start?.dateTime ||
        !event.end?.dateTime
      )
        continue;
      const startsAt = new Date(`${event.start.dateTime.replace(/Z$/, "")}Z`);
      const endsAt = new Date(`${event.end.dateTime.replace(/Z$/, "")}Z`);
      if (!Number.isNaN(startsAt.getTime()) && endsAt > startsAt)
        ranges.push({
          sourceKey: `microsoft:${event.id}:${startsAt.toISOString()}`,
          startsAt,
          endsAt,
        });
    }
    next = data["@odata.nextLink"] ?? "";
  }
  return ranges;
}
async function replaceBusy(
  connectionId: string,
  ranges: BusyRange[],
): Promise<void> {
  await db.transaction(async (tx) => {
    await tx
      .delete(calendarBusyIntervalsTable)
      .where(eq(calendarBusyIntervalsTable.connectionId, connectionId));
    if (ranges.length)
      await tx.insert(calendarBusyIntervalsTable).values(
        ranges.slice(0, 5000).map((r) => ({
          id: `${connectionId}:${r.sourceKey}`.slice(0, 250),
          connectionId,
          ...r,
        })),
      );
  });
}
async function tick(): Promise<void> {
  const now = new Date();
  const [job] = await db
    .select()
    .from(calendarSyncJobsTable)
    .where(
      and(
        lte(calendarSyncJobsTable.runAfter, now),
        or(
          lte(calendarSyncJobsTable.leasedUntil, now),
          sql`${calendarSyncJobsTable.leasedUntil} IS NULL`,
        ),
      ),
    )
    .limit(1);
  if (!job) return;
  const [claim] = await db
    .update(calendarSyncJobsTable)
    .set({
      // Exceeds the bounded worst-case provider sync (including ten
      // 15-second Microsoft calendarView pages) so another worker cannot
      // reclaim a job that is still legitimately running.
      leasedUntil: new Date(Date.now() + 5 * 60_000),
      updatedAt: sql`now()`,
    })
    .where(
      and(
        eq(calendarSyncJobsTable.id, job.id),
        or(
          lte(calendarSyncJobsTable.leasedUntil, now),
          sql`${calendarSyncJobsTable.leasedUntil} IS NULL`,
        ),
      ),
    )
    .returning();
  if (!claim) return;
  try {
    const [connection] = await db
      .select()
      .from(calendarConnectionsTable)
      .where(eq(calendarConnectionsTable.id, job.connectionId))
      .limit(1);
    if (!connection) {
      await db
        .delete(calendarSyncJobsTable)
        .where(eq(calendarSyncJobsTable.id, job.id));
      return;
    }
    let ranges: BusyRange[];
    let credentials = connection.encryptedCredentials;
    let cursor = connection.syncCursor as Record<string, unknown>;
    if (connection.provider === "ics") {
      const result = await fetchIcs(open(credentials), cursor);
      ranges = result.ranges;
      cursor = result.cursor;
      // A 304 has no ranges; retain existing normalized data.
      if (!result.notModified) await replaceBusy(connection.id, ranges);
    } else {
      const tokens = await accessToken(connection.provider, credentials);
      credentials = (await import("./calendarCrypto")).seal(
        JSON.stringify(tokens),
      );
      // Keep refresh-token rotation even when the subsequent busy request
      // fails, otherwise a rotated token could be irretrievably lost.
      await db
        .update(calendarConnectionsTable)
        .set({ encryptedCredentials: credentials, updatedAt: sql`now()` })
        .where(eq(calendarConnectionsTable.id, connection.id));
      ranges = await providerBusy(
        connection.provider,
        tokens.access_token ?? "",
        Array.isArray(
          (connection.settings as Record<string, unknown>).calendarIds,
        )
          ? (
              (connection.settings as Record<string, unknown>)
                .calendarIds as string[]
            ).slice(0, 20)
          : [],
      );
      await replaceBusy(connection.id, ranges);
    }
    await db
      .update(calendarConnectionsTable)
      .set({
        encryptedCredentials: credentials,
        syncCursor: cursor,
        lastSyncedAt: now,
        lastError: "",
        updatedAt: sql`now()`,
      })
      .where(eq(calendarConnectionsTable.id, connection.id));
    await db
      .update(calendarSyncJobsTable)
      .set({
        runAfter: new Date(Date.now() + 15 * 60_000),
        leasedUntil: null,
        attempts: 0,
        lastError: "",
        updatedAt: sql`now()`,
      })
      .where(eq(calendarSyncJobsTable.id, job.id));
  } catch (err) {
    const attempts = job.attempts + 1;
    const error =
      err instanceof Error
        ? err.message.slice(0, 240)
        : "Calendar sync failed.";
    await db
      .update(calendarSyncJobsTable)
      .set({
        attempts,
        leasedUntil: null,
        lastError: error,
        runAfter: new Date(
          Date.now() + Math.min(3_600_000, 30_000 * 2 ** Math.min(attempts, 6)),
        ),
        updatedAt: sql`now()`,
      })
      .where(eq(calendarSyncJobsTable.id, job.id));
    await db
      .update(calendarConnectionsTable)
      .set({ lastError: error, updatedAt: sql`now()` })
      .where(eq(calendarConnectionsTable.id, job.connectionId));
    logger.warn(
      { connectionId: job.connectionId, attempts },
      "calendar sync failed",
    );
  }
}
export function startCalendarSyncRunner(): void {
  const timer = setInterval(() => void tick().catch(() => undefined), 15_000);
  timer.unref();
  void tick().catch(() => undefined);
}
