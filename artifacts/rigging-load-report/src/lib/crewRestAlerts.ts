import { shiftWindowsWithLegacyFallback } from "./crewShiftAssignments.ts";

export type AssignmentWindowSource = {
  assignedDates: ReadonlyArray<string>;
  callTime: string;
  offTime: string;
  assignedShiftTimes: Record<string, { startTime: string; endTime: string }>;
  assignedShiftWindows: Record<
    string,
    Array<{ startTime: string; endTime: string }>
  >;
  shiftResponses: Record<string, "accepted" | "declined">;
};

export type NormalizedAssignmentWindow = {
  assignmentKey: string;
  date: string;
  startTime: string;
  endTime: string;
  startMinute: number;
  endMinute: number;
};

export type CrewWorkAlert =
  | {
      kind: "turnaround";
      date: string;
      restMinutes: number;
      previousEnd: NormalizedAssignmentWindow;
      nextStart: NormalizedAssignmentWindow;
    }
  | { kind: "daily-hours"; date: string; workedMinutes: number };

const MINUTES_PER_DAY = 24 * 60;

function timeMinutes(value: string): number | null {
  if (!/^\d{2}:\d{2}$/.test(value)) return null;
  const [hour, minute] = value.split(":").map(Number);
  return hour >= 0 && hour < 24 && minute >= 0 && minute < 60
    ? hour * 60 + minute
    : null;
}

function utcDay(date: string): number | null {
  const value = Date.parse(`${date}T00:00:00Z`);
  return Number.isFinite(value) ? Math.floor(value / 86_400_000) : null;
}

function dateAtDay(day: number): string {
  return new Date(day * 86_400_000).toISOString().slice(0, 10);
}

/** Returns valid, non-declined windows on an absolute minute timeline.
 * Overnight windows end on the following calendar date. */
export function normalizeAssignmentWindows(
  row: AssignmentWindowSource,
): NormalizedAssignmentWindow[] {
  const mapped = shiftWindowsWithLegacyFallback(
    row.assignedShiftWindows,
    row.assignedShiftTimes,
  );
  const datesWithStructuredWindows = new Set(
    Object.entries(mapped)
      .filter(([, windows]) => windows.length > 0)
      .map(([key]) => key.split("::")[0])
      .filter((date): date is string => Boolean(date)),
  );
  const output: NormalizedAssignmentWindow[] = [];
  for (const [key, windows] of Object.entries(mapped)) {
    const [date] = key.split("::");
    const day = utcDay(date ?? "");
    if (day == null) continue;
    for (const [index, window] of windows.entries()) {
      if (row.shiftResponses[`${key}::${index}`] === "declined") continue;
      const start = timeMinutes(window.startTime);
      const end = timeMinutes(window.endTime);
      if (start == null || end == null) continue;
      output.push({
        assignmentKey: key,
        date: date!,
        startTime: window.startTime,
        endTime: window.endTime,
        startMinute: day * MINUTES_PER_DAY + start,
        endMinute: day * MINUTES_PER_DAY + end + (end <= start ? MINUTES_PER_DAY : 0),
      });
    }
  }

  // Older rows only have a per-day call/off pair. Match the timeline's
  // fallback behaviour: use it only if that day has no structured window.
  for (const date of row.assignedDates) {
    if (datesWithStructuredWindows.has(date)) continue;
    if (row.shiftResponses[`${date}::day::0`] === "declined") continue;
    const day = utcDay(date);
    const start = timeMinutes(row.callTime);
    const end = timeMinutes(row.offTime);
    if (day == null || start == null || end == null) continue;
    output.push({
      assignmentKey: `${date}::day`,
      date,
      startTime: row.callTime,
      endTime: row.offTime,
      startMinute: day * MINUTES_PER_DAY + start,
      endMinute: day * MINUTES_PER_DAY + end + (end <= start ? MINUTES_PER_DAY : 0),
    });
  }
  return output.sort((a, b) => a.startMinute - b.startMinute || a.endMinute - b.endMinute);
}

function mergedWorkBlocks(
  rows: ReadonlyArray<AssignmentWindowSource>,
): NormalizedAssignmentWindow[] {
  const windows = rows
    .flatMap((row) => normalizeAssignmentWindows(row))
    .sort((a, b) => a.startMinute - b.startMinute || a.endMinute - b.endMinute);
  const merged: NormalizedAssignmentWindow[] = [];
  for (const window of windows) {
    const previous = merged[merged.length - 1];
    if (!previous || window.startMinute > previous.endMinute) {
      merged.push({ ...window });
      continue;
    }
    if (window.endMinute > previous.endMinute) {
      previous.endMinute = window.endMinute;
      previous.endTime = window.endTime;
    }
  }
  return merged;
}

/** Finds sub-11-hour turnarounds and calendar-day totals over 12 hours.
 * Overlapping windows across multiple role rows are unioned so one person's
 * hours are never double-counted. Same-day split-call gaps are not treated as
 * overnight turnaround violations. */
export function crewWorkAlertsForSources(
  rows: ReadonlyArray<AssignmentWindowSource>,
): CrewWorkAlert[] {
  const windows = mergedWorkBlocks(rows);
  const alerts: CrewWorkAlert[] = [];
  let previous: NormalizedAssignmentWindow | null = null;
  for (const next of windows) {
    if (!previous) {
      previous = next;
      continue;
    }
    const restMinutes = next.startMinute - previous.endMinute;
    const previousStartDay = Math.floor(previous.startMinute / MINUTES_PER_DAY);
    const nextStartDay = Math.floor(next.startMinute / MINUTES_PER_DAY);
    if (nextStartDay > previousStartDay && restMinutes < 11 * 60) {
      alerts.push({
        kind: "turnaround",
        date: dateAtDay(nextStartDay),
        restMinutes,
        previousEnd: previous,
        nextStart: next,
      });
    }
    // Several windows can overlap. The relevant preceding finish for a
    // later call is the latest finish seen so far, not merely the window
    // that happened to start immediately before it.
    if (next.endMinute > previous.endMinute) previous = next;
  }

  const dailyMinutes = new Map<number, number>();
  for (const window of windows) {
    let cursor = window.startMinute;
    while (cursor < window.endMinute) {
      const day = Math.floor(cursor / MINUTES_PER_DAY);
      const nextDay = (day + 1) * MINUTES_PER_DAY;
      const portion = Math.min(window.endMinute, nextDay) - cursor;
      dailyMinutes.set(day, (dailyMinutes.get(day) ?? 0) + portion);
      cursor += portion;
    }
  }
  for (const [day, workedMinutes] of dailyMinutes) {
    if (workedMinutes > 12 * 60) {
      alerts.push({ kind: "daily-hours", date: dateAtDay(day), workedMinutes });
    }
  }
  return alerts;
}

export function crewWorkAlerts(
  row: AssignmentWindowSource,
): CrewWorkAlert[] {
  return crewWorkAlertsForSources([row]);
}

export function formatWorkHours(minutes: number): string {
  const sign = minutes < 0 ? "−" : "";
  const absolute = Math.abs(minutes);
  return `${sign}${Math.floor(absolute / 60)}h ${absolute % 60}m`;
}