import { parseCalendarInstant } from "./calendarTime";

export const AVAILABILITY_STATUSES = [
  "available",
  "unavailable",
  "tentative",
] as const;

export type AvailabilityStatus = (typeof AVAILABILITY_STATUSES)[number];

export type AvailabilityWrite = {
  id: string;
  userId: string;
  status: AvailabilityStatus;
  startsAt: Date;
  endsAt: Date;
  timezone: string;
  allDay: boolean;
  privateNote: string;
};

export type AvailabilityRow = AvailabilityWrite & {
  createdAt?: Date;
  updatedAt?: Date;
};

export type BulkReplacement = {
  rangeStart: Date;
  rangeEnd: Date;
  values: AvailabilityWrite[];
};

type ValidationResult =
  | { ok: true; replacement: BulkReplacement }
  | { ok: false; error: string };

export function isValidCalendarTimezone(value: unknown): value is string {
  if (typeof value !== "string" || value.length === 0 || value.length >= 80)
    return false;
  try {
    new Intl.DateTimeFormat("en", { timeZone: value }).format(0);
    return true;
  } catch {
    return false;
  }
}

export function validateBulkAvailabilityReplacement(
  body: unknown,
  userId: string,
  idFactory: () => string,
): ValidationResult {
  if (!body || typeof body !== "object")
    return { ok: false, error: "Provide a valid replacement range." };
  const input = body as Record<string, unknown>;
  const rangeStart = parseCalendarInstant(input.rangeStart);
  const rangeEnd = parseCalendarInstant(input.rangeEnd);
  if (!rangeStart || !rangeEnd || rangeEnd <= rangeStart)
    return {
      ok: false,
      error:
        "rangeStart and rangeEnd must be explicit-offset RFC3339 timestamps with rangeEnd after rangeStart.",
    };
  if (!Array.isArray(input.entries))
    return { ok: false, error: "entries must be an array." };
  if (input.entries.length > 100)
    return {
      ok: false,
      error: "A replacement may contain at most 100 entries.",
    };

  const values: AvailabilityWrite[] = [];
  for (let index = 0; index < input.entries.length; index++) {
    const raw = input.entries[index];
    if (!raw || typeof raw !== "object" || Array.isArray(raw))
      return { ok: false, error: `Entry ${index + 1} must be an object.` };
    const entry = raw as Record<string, unknown>;
    if (
      typeof entry.status !== "string" ||
      !AVAILABILITY_STATUSES.includes(entry.status as AvailabilityStatus)
    )
      return {
        ok: false,
        error: `Entry ${index + 1} has an unsupported status.`,
      };
    const startsAt = parseCalendarInstant(entry.startsAt);
    const endsAt = parseCalendarInstant(entry.endsAt);
    if (!startsAt || !endsAt)
      return {
        ok: false,
        error: `Entry ${index + 1} timestamps must be explicit-offset RFC3339 values.`,
      };
    if (endsAt <= startsAt)
      return {
        ok: false,
        error: `Entry ${index + 1} end time must be after its start time.`,
      };
    if (startsAt < rangeStart || endsAt > rangeEnd)
      return {
        ok: false,
        error: `Entry ${index + 1} must be fully contained in the replacement range.`,
      };
    if (!isValidCalendarTimezone(entry.timezone))
      return {
        ok: false,
        error: `Entry ${index + 1} has an invalid timezone.`,
      };
    if (entry.allDay !== undefined && typeof entry.allDay !== "boolean")
      return {
        ok: false,
        error: `Entry ${index + 1} allDay must be a boolean.`,
      };
    if (
      entry.privateNote !== undefined &&
      typeof entry.privateNote !== "string"
    )
      return {
        ok: false,
        error: `Entry ${index + 1} privateNote must be a string.`,
      };
    values.push({
      id: idFactory(),
      userId,
      status: entry.status as AvailabilityStatus,
      startsAt,
      endsAt,
      timezone: entry.timezone,
      allDay: entry.allDay ?? false,
      privateNote: (entry.privateNote ?? "").slice(0, 2000),
    });
  }

  values.sort(
    (left, right) => left.startsAt.getTime() - right.startsAt.getTime(),
  );
  for (let index = 1; index < values.length; index++) {
    if (values[index].startsAt < values[index - 1].endsAt)
      return {
        ok: false,
        error: "Replacement entries must not overlap.",
      };
  }
  return { ok: true, replacement: { rangeStart, rangeEnd, values } };
}

/** Preserve only the portions outside the half-open replacement range. */
export function splitAvailabilityAroundRange(
  rows: AvailabilityRow[],
  rangeStart: Date,
  rangeEnd: Date,
  idFactory: () => string,
): AvailabilityRow[] {
  return rows.flatMap((row) => {
    const fragments: AvailabilityRow[] = [];
    const metadata = {
      userId: row.userId,
      status: row.status,
      timezone: row.timezone,
      allDay: row.allDay,
      privateNote: row.privateNote,
      ...(row.createdAt ? { createdAt: row.createdAt } : {}),
      ...(row.updatedAt ? { updatedAt: row.updatedAt } : {}),
    };
    if (row.startsAt < rangeStart)
      fragments.push({
        id: idFactory(),
        ...metadata,
        startsAt: row.startsAt,
        endsAt: rangeStart,
      });
    if (row.endsAt > rangeEnd)
      fragments.push({
        id: idFactory(),
        ...metadata,
        startsAt: rangeEnd,
        endsAt: row.endsAt,
      });
    return fragments;
  });
}

export function isSerializationFailure(error: unknown): boolean {
  let current: unknown = error;
  for (let depth = 0; depth < 4 && current; depth++) {
    if (
      typeof current === "object" &&
      "code" in current &&
      (current as { code?: unknown }).code === "40001"
    )
      return true;
    current =
      typeof current === "object" && "cause" in current
        ? (current as { cause?: unknown }).cause
        : null;
  }
  return false;
}
