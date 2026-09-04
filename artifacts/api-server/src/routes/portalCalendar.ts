import { Router, type IRouter, type RequestHandler } from "express";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { and, eq, gt, gte, lt, lte, ne, or, sql } from "drizzle-orm";
import {
  db,
  calendarAvailabilityRulesTable,
  calendarAvailabilityTable,
  calendarBusyIntervalsTable,
  calendarConnectionsTable,
  calendarHoldsTable,
  calendarOAuthStatesTable,
  calendarSubscriptionsTable,
  calendarSyncJobsTable,
  freelancerProfilesTable,
  gigsTable,
  projectBriefsTable,
} from "@workspace/db";
import { calendarFeed } from "../lib/calendarIcs";
import { open, seal, sameHash, tokenHash } from "../lib/calendarCrypto";
import {
  expandWeeklyRuleOccurrences,
  localDateRangeToInstants,
  parseCalendarInstant,
} from "../lib/calendarTime";
import { logger } from "../lib/logger";
import { getUserType } from "../middleware/userType";

const router: IRouter = Router();
const requireSignedIn: RequestHandler = (req, res, next) => {
  const auth =
    typeof (req as any).auth === "function"
      ? (req as any).auth()
      : ((req as any).auth ?? {});
  if (!auth?.userId)
    return void res.status(401).json({ ok: false, error: "Sign in required." });
  (req as any)._userId = auth.userId;
  next();
};
const uid = (req: any) => req._userId as string;
const sha256 = (value: string) =>
  createHash("sha256").update(value).digest("base64url");
const iso = parseCalendarInstant;
const date = (x: unknown) =>
  typeof x === "string" && /^\d{4}-\d{2}-\d{2}$/.test(x) ? x : null;
const configured = (provider: string) =>
  provider === "google"
    ? Boolean(
        process.env.GOOGLE_CLIENT_ID &&
        process.env.GOOGLE_CLIENT_SECRET &&
        process.env.GOOGLE_REDIRECT_URI,
      )
    : Boolean(
        process.env.MICROSOFT_CLIENT_ID &&
        process.env.MICROSOFT_CLIENT_SECRET &&
        process.env.MICROSOFT_REDIRECT_URI,
      );

async function overlappingAvailability(
  userId: string,
  startsAt: Date,
  endsAt: Date,
  excludeId?: string,
  executor: Pick<typeof db, "select"> = db,
) {
  const conditions = [
    eq(calendarAvailabilityTable.userId, userId),
    lt(calendarAvailabilityTable.startsAt, endsAt),
    gt(calendarAvailabilityTable.endsAt, startsAt),
  ];
  if (excludeId) conditions.push(ne(calendarAvailabilityTable.id, excludeId));
  return executor
    .select({ id: calendarAvailabilityTable.id })
    .from(calendarAvailabilityTable)
    .where(and(...conditions))
    .limit(1);
}
function safeConnection(row: any) {
  return {
    id: row.id,
    provider: row.provider,
    connected: true,
    accountLabel:
      (row.settings as Record<string, unknown>)?.accountLabel ?? null,
    settings: row.settings,
    lastSyncedAt: row.lastSyncedAt,
    lastError: row.lastError,
    configured: row.provider === "ics" || configured(row.provider),
  };
}
async function queueSync(connectionId: string): Promise<void> {
  await db
    .insert(calendarSyncJobsTable)
    .values({ id: randomUUID(), connectionId })
    .onConflictDoUpdate({
      target: calendarSyncJobsTable.connectionId,
      set: { runAfter: sql`now()`, leasedUntil: null, updatedAt: sql`now()` },
    });
}
function range(req: any) {
  const fromDate =
    date(req.query.from) ?? new Date().toISOString().slice(0, 10);
  const toDate = date(req.query.to) ?? fromDate;
  const timezone =
    typeof req.query.timezone === "string" && req.query.timezone.length < 80
      ? req.query.timezone
      : "UTC";
  const bounds = localDateRangeToInstants(fromDate, toDate, timezone);
  return {
    fromDate,
    toDate,
    timezone,
    ...bounds,
    invalid: toDate < fromDate,
  };
}

function localDateInZone(value: Date, timezone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(value);
  const fields = Object.fromEntries(
    parts.map((part) => [part.type, part.value]),
  );
  return `${fields.year}-${fields.month}-${fields.day}`;
}
function expandRules(rules: any[], fromDate: string, toDate: string): any[] {
  const out: any[] = [];
  for (const rule of rules) {
    try {
      const occurrences = expandWeeklyRuleOccurrences(
        rule,
        fromDate,
        toDate,
        2000 - out.length,
      );
      for (const occurrence of occurrences) {
        out.push({
          id: `${rule.id}:${occurrence.date}`,
          ruleId: rule.id,
          status: rule.status,
          startsAt: occurrence.startsAt,
          endsAt: occurrence.endsAt,
          timezone: rule.timezone,
          privateNote: rule.privateNote,
          virtual: true,
        });
      }
    } catch {
      /* invalid legacy timezone cannot break calendar reads */
    }
  }
  return out;
}

router.get("/portal/calendar", requireSignedIn, async (req, res) => {
  let r: ReturnType<typeof range>;
  try {
    r = range(req);
  } catch {
    return void res
      .status(400)
      .json({ ok: false, error: "Invalid calendar timezone." });
  }
  if (
    r.invalid ||
    r.to.getTime() - r.from.getTime() > 366 * 86400000
  )
    return void res.status(400).json({
      ok: false,
      error: "Calendar range must be between 0 and 366 days.",
    });
  try {
    const [availability, rules, busy, gigs, connections, holds, subscription] =
      await Promise.all([
        db
          .select()
          .from(calendarAvailabilityTable)
          .where(
            and(
              eq(calendarAvailabilityTable.userId, uid(req)),
              lt(calendarAvailabilityTable.startsAt, r.to),
              gt(calendarAvailabilityTable.endsAt, r.from),
            ),
          ),
        db
          .select()
          .from(calendarAvailabilityRulesTable)
          .where(
            and(
              eq(calendarAvailabilityRulesTable.userId, uid(req)),
              gte(calendarAvailabilityRulesTable.until, r.from),
            ),
          ),
        db
          .select({
            id: calendarBusyIntervalsTable.id,
            startsAt: calendarBusyIntervalsTable.startsAt,
            endsAt: calendarBusyIntervalsTable.endsAt,
            provider: calendarConnectionsTable.provider,
          })
          .from(calendarBusyIntervalsTable)
          .innerJoin(
            calendarConnectionsTable,
            eq(
              calendarBusyIntervalsTable.connectionId,
              calendarConnectionsTable.id,
            ),
          )
          .where(
            and(
              eq(calendarConnectionsTable.userId, uid(req)),
              lt(calendarBusyIntervalsTable.startsAt, r.to),
              gt(calendarBusyIntervalsTable.endsAt, r.from),
            ),
          ),
        db
          .select()
          .from(gigsTable)
          .where(
            and(
              eq(gigsTable.freelancerUserId, uid(req)),
              lte(gigsTable.startDate, r.toDate),
              gte(
                sql`COALESCE(${gigsTable.endDate}, ${gigsTable.startDate})`,
                r.fromDate,
              ),
            ),
          ),
        db
          .select()
          .from(calendarConnectionsTable)
          .where(eq(calendarConnectionsTable.userId, uid(req))),
        db
          .select({
            id: calendarHoldsTable.id,
            startsAt: calendarHoldsTable.startsAt,
            endsAt: calendarHoldsTable.endsAt,
            expiresAt: calendarHoldsTable.expiresAt,
          })
          .from(calendarHoldsTable)
          .where(
            and(
              eq(calendarHoldsTable.freelancerUserId, uid(req)),
              gte(calendarHoldsTable.expiresAt, new Date()),
              lt(calendarHoldsTable.startsAt, r.to),
              gt(calendarHoldsTable.endsAt, r.from),
            ),
          ),
        db
          .select()
          .from(calendarSubscriptionsTable)
          .where(eq(calendarSubscriptionsTable.userId, uid(req)))
          .limit(1),
      ]);
    const expanded = expandRules(rules, r.fromDate, r.toDate);
    const aliased = [...availability, ...expanded].map((a: any) => ({
      ...a,
      startAt: a.startsAt,
      endAt: a.endsAt,
      note: a.privateNote,
      allDay:
        typeof a.allDay === "boolean"
          ? a.allDay
          : a.startMinute === 0 && a.endMinute === 1440,
    }));
    res.json({
      ok: true,
      availability: aliased,
      rules,
      busy,
      externalBusy: busy,
      gigs,
      holds,
      connections: connections.map(safeConnection),
      feed: {
        enabled: Boolean(subscription[0]),
        url: subscription[0] ? "/api/portal/calendar/subscription" : null,
      },
      timezone: r.timezone,
    });
  } catch (err) {
    logger.error({ err }, "calendar GET failed");
    res.status(500).json({ ok: false, error: "Could not load calendar." });
  }
});

router.post(
  "/portal/calendar/availability",
  requireSignedIn,
  async (req, res) => {
    const b = req.body ?? {};
    const status = ["available", "unavailable", "tentative"].includes(b.status)
      ? b.status
      : null;
    const starts = iso(b.startsAt),
      ends = iso(b.endsAt);
    if (!status || !starts || !ends)
      return void res
        .status(400)
        .json({ ok: false, error: "Provide a valid availability interval." });
    if (ends <= starts)
      return void res
        .status(400)
        .json({ ok: false, error: "End time must be after start time." });
    const timezone =
      typeof b.timezone === "string" && b.timezone.length < 80
        ? b.timezone
        : "UTC";
    const note =
      typeof b.privateNote === "string" ? b.privateNote.slice(0, 2000) : "";
    try {
      if (b.weekday !== undefined) {
        const weekday = Number(b.weekday),
          sm = Number(b.startMinute),
          em = Number(b.endMinute),
          until = iso(b.until);
        if (
          !Number.isInteger(weekday) ||
          weekday < 0 ||
          weekday > 6 ||
          !Number.isInteger(sm) ||
          !Number.isInteger(em) ||
          sm < 0 ||
          em > 1440 ||
          em <= sm ||
          !until ||
          until <= starts ||
          until.getTime() - starts.getTime() > 366 * 86400000
        )
          return void res
            .status(400)
            .json({ ok: false, error: "Invalid bounded weekly rule." });
        const [rule] = await db
          .insert(calendarAvailabilityRulesTable)
          .values({
            id: randomUUID(),
            userId: uid(req),
            status,
            weekday,
            startMinute: sm,
            endMinute: em,
            timezone,
            startsOn: starts,
            until,
            privateNote: note,
          })
          .returning();
        return void res.json({ ok: true, rule });
      }
      const availability = await db.transaction(
        async (tx) => {
          const conflicts = await overlappingAvailability(
            uid(req),
            starts,
            ends,
            undefined,
            tx,
          );
          if (conflicts.length) return null;
          const [created] = await tx
            .insert(calendarAvailabilityTable)
            .values({
              id: randomUUID(),
              userId: uid(req),
              status,
              startsAt: starts,
              endsAt: ends,
              timezone,
              allDay: Boolean(b.allDay),
              privateNote: note,
            })
            .returning();
          return created;
        },
        { isolationLevel: "serializable" },
      );
      if (!availability)
        return void res.status(409).json({
          ok: false,
          error:
            "This time overlaps an existing availability block. Choose a different time range.",
        });
      res.json({ ok: true, availability });
    } catch (err) {
      logger.error({ err }, "availability save failed");
      res
        .status(500)
        .json({ ok: false, error: "Could not save availability." });
    }
  },
);
router.patch(
  "/portal/calendar/availability/:id",
  requireSignedIn,
  async (req, res) => {
    const id = String(req.params.id);
    const b = req.body ?? {};
    const status = ["available", "unavailable", "tentative"].includes(b.status)
      ? b.status
      : null;
    const starts = iso(b.startsAt);
    const ends = iso(b.endsAt);
    if (!status || !starts || !ends)
      return void res.status(400).json({
        ok: false,
        error: "Provide a valid availability interval.",
      });
    if (ends <= starts)
      return void res.status(400).json({
        ok: false,
        error: "End time must be after start time.",
      });

    const timezone =
      typeof b.timezone === "string" && b.timezone.length < 80
        ? b.timezone
        : "UTC";
    const note =
      typeof b.privateNote === "string" ? b.privateNote.slice(0, 2000) : "";

    try {
      const result = await db.transaction(
        async (tx) => {
          const owned = await tx
            .select({ id: calendarAvailabilityTable.id })
            .from(calendarAvailabilityTable)
            .where(
              and(
                eq(calendarAvailabilityTable.id, id),
                eq(calendarAvailabilityTable.userId, uid(req)),
              ),
            )
            .limit(1);
          if (!owned.length) return { kind: "missing" as const };

          const conflicts = await overlappingAvailability(
            uid(req),
            starts,
            ends,
            id,
            tx,
          );
          if (conflicts.length) return { kind: "conflict" as const };

          const [availability] = await tx
            .update(calendarAvailabilityTable)
            .set({
              status,
              startsAt: starts,
              endsAt: ends,
              timezone,
              allDay: Boolean(b.allDay),
              privateNote: note,
              updatedAt: new Date(),
            })
            .where(
              and(
                eq(calendarAvailabilityTable.id, id),
                eq(calendarAvailabilityTable.userId, uid(req)),
              ),
            )
            .returning();
          return { kind: "updated" as const, availability };
        },
        { isolationLevel: "serializable" },
      );
      if (result.kind === "missing")
        return void res
          .status(404)
          .json({ ok: false, error: "Availability not found." });
      if (result.kind === "conflict")
        return void res.status(409).json({
          ok: false,
          error:
            "This time overlaps an existing availability block. Choose a different time range.",
        });
      res.json({ ok: true, availability: result.availability });
    } catch (err) {
      logger.error({ err }, "availability update failed");
      res
        .status(500)
        .json({ ok: false, error: "Could not update availability." });
    }
  },
);
router.post("/portal/calendar/bulk", requireSignedIn, async (req, res) => {
  const entries = Array.isArray(req.body?.entries)
    ? req.body.entries.slice(0, 100)
    : [];
  const values = entries
    .map((b: any) => ({
      id: randomUUID(),
      userId: uid(req),
      status: b.status,
      startsAt: iso(b.startsAt),
      endsAt: iso(b.endsAt),
      timezone: typeof b.timezone === "string" ? b.timezone : "UTC",
      allDay: Boolean(b.allDay),
      privateNote:
        typeof b.privateNote === "string" ? b.privateNote.slice(0, 2000) : "",
    }))
    .filter(
      (x: any) =>
        ["available", "unavailable", "tentative"].includes(x.status) &&
        x.startsAt &&
        x.endsAt &&
        x.endsAt > x.startsAt,
    );
  if (!values.length)
    return void res
      .status(400)
      .json({ ok: false, error: "No valid availability entries." });
  try {
    const created = await db.transaction(
      async (tx) => {
        const inserted = [];
        for (const value of values) {
          const overlapping = await tx
            .select()
            .from(calendarAvailabilityTable)
            .where(
              and(
                eq(calendarAvailabilityTable.userId, uid(req)),
                lt(calendarAvailabilityTable.startsAt, value.endsAt),
                gt(calendarAvailabilityTable.endsAt, value.startsAt),
              ),
            );

          if (overlapping.length) {
            await tx
              .delete(calendarAvailabilityTable)
              .where(
                and(
                  eq(calendarAvailabilityTable.userId, uid(req)),
                  lt(calendarAvailabilityTable.startsAt, value.endsAt),
                  gt(calendarAvailabilityTable.endsAt, value.startsAt),
                ),
              );

            const fragments = overlapping.flatMap((existing) => {
              const preserved = [];
              if (existing.startsAt < value.startsAt) {
                preserved.push({
                  id: randomUUID(),
                  userId: existing.userId,
                  status: existing.status,
                  startsAt: existing.startsAt,
                  endsAt: value.startsAt,
                  timezone: existing.timezone,
                  allDay: existing.allDay,
                  privateNote: existing.privateNote,
                });
              }
              if (existing.endsAt > value.endsAt) {
                preserved.push({
                  id: randomUUID(),
                  userId: existing.userId,
                  status: existing.status,
                  startsAt: value.endsAt,
                  endsAt: existing.endsAt,
                  timezone: existing.timezone,
                  allDay: existing.allDay,
                  privateNote: existing.privateNote,
                });
              }
              return preserved;
            });
            if (fragments.length) {
              await tx.insert(calendarAvailabilityTable).values(fragments);
            }
          }

          const [entry] = await tx
            .insert(calendarAvailabilityTable)
            .values(value as any)
            .returning();
          inserted.push(entry);
        }
        return inserted;
      },
      { isolationLevel: "serializable" },
    );
    res.json({ ok: true, availability: created });
  } catch (err) {
    logger.error({ err }, "bulk availability save failed");
    res
      .status(500)
      .json({ ok: false, error: "Could not update availability." });
  }
});
router.delete(
  "/portal/calendar/availability/:id",
  requireSignedIn,
  async (req, res) => {
    const out = await db
      .delete(calendarAvailabilityTable)
      .where(
        and(
          eq(calendarAvailabilityTable.id, String(req.params.id)),
          eq(calendarAvailabilityTable.userId, uid(req)),
        ),
      )
      .returning();
    if (!out.length) {
      const rules = await db
        .delete(calendarAvailabilityRulesTable)
        .where(
          and(
            eq(calendarAvailabilityRulesTable.id, String(req.params.id)),
            eq(calendarAvailabilityRulesTable.userId, uid(req)),
          ),
        )
        .returning();
      if (!rules.length)
        return void res
          .status(404)
          .json({ ok: false, error: "Availability not found." });
    }
    res.json({ ok: true });
  },
);

async function subscription(userId: string) {
  const token = randomBytes(32).toString("base64url");
  await db
    .insert(calendarSubscriptionsTable)
    .values({
      userId,
      tokenHash: tokenHash(token),
      encryptedToken: seal(token),
    })
    .onConflictDoUpdate({
      target: calendarSubscriptionsTable.userId,
      set: {
        tokenHash: tokenHash(token),
        encryptedToken: seal(token),
        rotatedAt: sql`now()`,
      },
    });
  return token;
}
router.get(
  "/portal/calendar/subscription",
  requireSignedIn,
  async (req, res) => {
    const rows = await db
      .select()
      .from(calendarSubscriptionsTable)
      .where(eq(calendarSubscriptionsTable.userId, uid(req)))
      .limit(1);
    const token = rows[0]
      ? open(rows[0].encryptedToken)
      : await subscription(uid(req));
    const url = `/api/portal/calendar/feed/${token}.ics`;
    res.json({
      ok: true,
      url,
      feed: { enabled: true, url, updatedAt: rows[0]?.rotatedAt ?? new Date() },
    });
  },
);
router.post(
  "/portal/calendar/subscription/rotate",
  requireSignedIn,
  async (req, res) => {
    const url = `/api/portal/calendar/feed/${await subscription(uid(req))}.ics`;
    res.json({
      ok: true,
      url,
      feed: { enabled: true, url, updatedAt: new Date() },
    });
  },
);
async function renderFeed(userId: string) {
  const [gigs, holds] = await Promise.all([
    db
      .select()
      .from(gigsTable)
      .where(eq(gigsTable.freelancerUserId, userId)),
    db
      .select()
      .from(calendarHoldsTable)
      .where(
        and(
          eq(calendarHoldsTable.freelancerUserId, userId),
          gt(calendarHoldsTable.expiresAt, new Date()),
        ),
      ),
  ]);
  const gigEvents = gigs.flatMap((g) => {
    const dates = g.assignedDates.length
      ? g.assignedDates
      : g.startDate
        ? [g.startDate]
        : [];
    return dates.map((day, i) => ({
      uid: `gig-${g.id}-${day}@ehs`,
      start: new Date(`${day}T00:00:00Z`),
      end: new Date(new Date(`${day}T00:00:00Z`).getTime() + 86400000),
      summary: g.projectName || "Booked gig",
      allDay: true,
      description: [
        g.venue,
        g.checkInDate && `Hotel check-in ${g.checkInDate}`,
        g.checkOutDate && `Hotel check-out ${g.checkOutDate}`,
      ]
        .filter(Boolean)
        .join("\\n"),
    }));
  });
  const holdEvents = holds.map((hold) => ({
    uid: `hold-${hold.id}@ehs`,
    start: hold.startsAt,
    end: hold.endsAt,
    summary: "Tentative EHS hold",
    allDay: false,
  }));
  return calendarFeed([...gigEvents, ...holdEvents]);
}
router.get("/portal/calendar/feed/:token.ics", async (req, res) => {
  const token = String(req.params.token ?? "");
  if (!/^[A-Za-z0-9_-]{20,}$/.test(token)) return void res.status(404).end();
  const rows = await db
    .select()
    .from(calendarSubscriptionsTable)
    .where(eq(calendarSubscriptionsTable.tokenHash, tokenHash(token)))
    .limit(1);
  if (!rows[0] || !sameHash(rows[0].tokenHash, tokenHash(token)))
    return void res.status(404).end();
  res
    .type("text/calendar")
    .set("Cache-Control", "no-store")
    .send(await renderFeed(rows[0].userId));
});
router.get("/portal/calendar/download.ics", requireSignedIn, async (req, res) =>
  res
    .type("text/calendar")
    .attachment("ehs-calendar.ics")
    .send(await renderFeed(uid(req))),
);

router.get(
  "/portal/calendar/connections",
  requireSignedIn,
  async (req, res) => {
    const rows = await db
      .select()
      .from(calendarConnectionsTable)
      .where(eq(calendarConnectionsTable.userId, uid(req)));
    res.json({
      ok: true,
      connections: rows.map(safeConnection),
      providers: ["google", "microsoft"].map((provider) => ({
        provider,
        configured: configured(provider),
      })),
    });
  },
);
router.post(
  "/portal/calendar/connections/:provider/start",
  requireSignedIn,
  async (req, res) => {
    const provider = String(req.params.provider);
    if (!["google", "microsoft"].includes(provider) || !configured(provider))
      return void res.json({
        ok: false,
        configured: false,
        error: "This calendar provider is not configured.",
      });
    const state = randomBytes(32).toString("base64url");
    const verifier = randomBytes(48).toString("base64url");
    await db
      .delete(calendarOAuthStatesTable)
      .where(lte(calendarOAuthStatesTable.expiresAt, new Date()));
    await db.insert(calendarOAuthStatesTable).values({
      stateHash: tokenHash(state),
      userId: uid(req),
      provider,
      encryptedVerifier: seal(verifier),
      expiresAt: new Date(Date.now() + 10 * 60_000),
    });
    const challenge = sha256(verifier);
    const auth =
      provider === "google"
        ? `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(process.env.GOOGLE_CLIENT_ID!)}&redirect_uri=${encodeURIComponent(process.env.GOOGLE_REDIRECT_URI!)}&response_type=code&scope=${encodeURIComponent("https://www.googleapis.com/auth/calendar.freebusy https://www.googleapis.com/auth/calendar.calendarlist.readonly")}&access_type=offline&prompt=consent&code_challenge_method=S256&code_challenge=${encodeURIComponent(challenge)}&state=${encodeURIComponent(state)}`
        : `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=${encodeURIComponent(process.env.MICROSOFT_CLIENT_ID!)}&redirect_uri=${encodeURIComponent(process.env.MICROSOFT_REDIRECT_URI!)}&response_type=code&scope=${encodeURIComponent("offline_access Calendars.Read")}&code_challenge_method=S256&code_challenge=${encodeURIComponent(challenge)}&state=${encodeURIComponent(state)}`;
    res.json({ ok: true, configured: true, url: auth });
  },
);
router.get(
  "/portal/calendar/connections/:provider/callback",
  requireSignedIn,
  async (req, res) => {
    try {
      const provider = String(req.params.provider);
      const rawState = String(req.query.state ?? "");
      const [state] = await db.transaction(async (tx) => {
        const rows = await tx
          .select()
          .from(calendarOAuthStatesTable)
          .where(
            and(
              eq(calendarOAuthStatesTable.stateHash, tokenHash(rawState)),
              eq(calendarOAuthStatesTable.provider, provider),
              gte(calendarOAuthStatesTable.expiresAt, new Date()),
            ),
          )
          .for("update")
          .limit(1);
        if (!rows[0]) return [];
        await tx
          .delete(calendarOAuthStatesTable)
          .where(eq(calendarOAuthStatesTable.stateHash, rows[0].stateHash));
        return rows;
      });
      if (
        !configured(provider) ||
        !state ||
        state.userId !== uid(req) ||
        typeof req.query.code !== "string"
      )
        throw Error("bad");
      const tokenUrl =
        provider === "google"
          ? "https://oauth2.googleapis.com/token"
          : "https://login.microsoftonline.com/common/oauth2/v2.0/token";
      const fields = new URLSearchParams({
        client_id:
          provider === "google"
            ? process.env.GOOGLE_CLIENT_ID!
            : process.env.MICROSOFT_CLIENT_ID!,
        client_secret:
          provider === "google"
            ? process.env.GOOGLE_CLIENT_SECRET!
            : process.env.MICROSOFT_CLIENT_SECRET!,
        code: req.query.code,
        code_verifier: open(state.encryptedVerifier),
        redirect_uri:
          provider === "google"
            ? process.env.GOOGLE_REDIRECT_URI!
            : process.env.MICROSOFT_REDIRECT_URI!,
        grant_type: "authorization_code",
      });
      const tokenResponse = await fetch(tokenUrl, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: fields,
        signal: AbortSignal.timeout(12000),
      });
      if (!tokenResponse.ok) throw Error("exchange");
      const tokens = (await tokenResponse.json()) as Record<string, unknown>;
      if (typeof tokens.access_token !== "string") throw Error("token");
      const credential = {
        access_token: tokens.access_token,
        refresh_token:
          typeof tokens.refresh_token === "string"
            ? tokens.refresh_token
            : undefined,
        expires_at:
          Date.now() + Math.max(60, Number(tokens.expires_in) || 3600) * 1000,
      };
      const [connection] = await db
        .insert(calendarConnectionsTable)
        .values({
          id: randomUUID(),
          userId: state.userId,
          provider,
          encryptedCredentials: seal(JSON.stringify(credential)),
        })
        .onConflictDoUpdate({
          target: [
            calendarConnectionsTable.userId,
            calendarConnectionsTable.provider,
          ],
          set: {
            encryptedCredentials: seal(JSON.stringify(credential)),
            lastError: "",
            updatedAt: sql`now()`,
          },
        })
        .returning();
      await queueSync(connection.id);
      res.redirect(303, "/portal/availability?calendar=connected");
    } catch {
      res
        .status(400)
        .send("Calendar connection could not be completed. Please try again.");
    }
  },
);
router.post(
  "/portal/calendar/connections/ics",
  requireSignedIn,
  async (req, res) => {
    const url = typeof req.body?.url === "string" ? req.body.url : "";
    try {
      const u = new URL(url);
      if (u.protocol !== "https:" || u.username || u.password) throw Error();
      const [row] = await db
        .insert(calendarConnectionsTable)
        .values({
          id: randomUUID(),
          userId: uid(req),
          provider: "ics",
          encryptedCredentials: seal(url),
        })
        .onConflictDoUpdate({
          target: [
            calendarConnectionsTable.userId,
            calendarConnectionsTable.provider,
          ],
          set: { encryptedCredentials: seal(url), updatedAt: sql`now()` },
        })
        .returning();
      await queueSync(row.id);
      res.json({ ok: true, connection: safeConnection(row) });
    } catch {
      res
        .status(400)
        .json({ ok: false, error: "A valid HTTPS calendar URL is required." });
    }
  },
);
router.patch(
  "/portal/calendar/connections/:id",
  requireSignedIn,
  async (req, res) => {
    const settings =
      req.body?.settings && typeof req.body.settings === "object"
        ? req.body.settings
        : {};
    const out = await db
      .update(calendarConnectionsTable)
      .set({ settings, updatedAt: sql`now()` })
      .where(
        and(
          eq(calendarConnectionsTable.id, String(req.params.id)),
          eq(calendarConnectionsTable.userId, uid(req)),
        ),
      )
      .returning();
    if (!out.length)
      return void res
        .status(404)
        .json({ ok: false, error: "Connection not found." });
    res.json({ ok: true, connection: safeConnection(out[0]) });
  },
);
router.delete(
  "/portal/calendar/connections/:id",
  requireSignedIn,
  async (req, res) => {
    await db
      .delete(calendarConnectionsTable)
      .where(
        and(
          eq(calendarConnectionsTable.id, String(req.params.id)),
          eq(calendarConnectionsTable.userId, uid(req)),
        ),
      );
    res.json({ ok: true });
  },
);
router.post(
  "/portal/calendar/connections/:id/sync",
  requireSignedIn,
  async (req, res) => {
    const id = String(req.params.id);
    const row = await db
      .select({ id: calendarConnectionsTable.id })
      .from(calendarConnectionsTable)
      .where(
        and(
          eq(calendarConnectionsTable.id, id),
          eq(calendarConnectionsTable.userId, uid(req)),
        ),
      )
      .limit(1);
    if (!row[0])
      return void res
        .status(404)
        .json({ ok: false, error: "Connection not found." });
    await db
      .insert(calendarSyncJobsTable)
      .values({ id: randomUUID(), connectionId: id })
      .onConflictDoUpdate({
        target: calendarSyncJobsTable.connectionId,
        set: { runAfter: sql`now()`, leasedUntil: null, updatedAt: sql`now()` },
      });
    res.status(202).json({ ok: true, queued: true });
  },
);
router.post("/portal/calendar/holds", requireSignedIn, async (req, res) => {
  const b = req.body ?? {},
    starts = iso(b.startsAt),
    ends = iso(b.endsAt),
    expires = iso(b.expiresAt);
  if ((await getUserType(uid(req))) !== "employee")
    return void res
      .status(403)
      .json({ ok: false, error: "Only producers can create holds." });
  if (
    typeof b.freelancerUserId !== "string" ||
    typeof b.briefId !== "string" ||
    !b.briefId ||
    b.freelancerUserId === uid(req) ||
    !starts ||
    !ends ||
    !expires ||
    ends <= starts ||
    expires <= new Date() ||
    expires.getTime() > Math.min(Date.now() + 48 * 60 * 60 * 1000, starts.getTime())
  )
    return void res.status(400).json({ ok: false, error: "Invalid hold." });
  const [[brief], [freelancer]] = await Promise.all([
    db
      .select({
        ownerUserId: projectBriefsTable.ownerUserId,
        startDate: projectBriefsTable.startDate,
        endDate: projectBriefsTable.endDate,
      })
      .from(projectBriefsTable)
      .where(eq(projectBriefsTable.id, b.briefId))
      .limit(1),
    db
      .select({ userId: freelancerProfilesTable.userId })
      .from(freelancerProfilesTable)
      .where(eq(freelancerProfilesTable.userId, b.freelancerUserId))
      .limit(1),
  ]);
  if (!brief || brief.ownerUserId !== uid(req))
    return void res
      .status(403)
      .json({ ok: false, error: "You do not own this brief." });
  if (!freelancer)
    return void res
      .status(404)
      .json({ ok: false, error: "Freelancer not found." });
  const timezone =
    typeof b.timezone === "string" && b.timezone.length < 80
      ? b.timezone
      : "UTC";
  try {
    const holdStartDate = localDateInZone(starts, timezone);
    const holdEndDate = localDateInZone(
      new Date(ends.getTime() - 1),
      timezone,
    );
    if (
      !brief.startDate ||
      holdStartDate !== brief.startDate ||
      holdEndDate !== (brief.endDate ?? brief.startDate)
    ) {
      return void res.status(400).json({
        ok: false,
        error: "Hold dates must match the brief window.",
      });
    }
  } catch {
    return void res
      .status(400)
      .json({ ok: false, error: "Invalid hold timezone." });
  }
  const [hold] = await db
    .insert(calendarHoldsTable)
    .values({
      id: randomUUID(),
      freelancerUserId: b.freelancerUserId,
      ownerUserId: uid(req),
      briefId: b.briefId,
      startsAt: starts,
      endsAt: ends,
      expiresAt: expires,
    })
    .returning();
  res.json({ ok: true, hold });
});
router.delete(
  "/portal/calendar/holds/:id",
  requireSignedIn,
  async (req, res) => {
    const out = await db
      .delete(calendarHoldsTable)
      .where(
        and(
          eq(calendarHoldsTable.id, String(req.params.id)),
          eq(calendarHoldsTable.ownerUserId, uid(req)),
        ),
      )
      .returning();
    if (!out.length)
      return void res.status(404).json({ ok: false, error: "Hold not found." });
    res.json({ ok: true });
  },
);
export default router;
