export const CREW_SHIFT_PHASE_KEYS = [
  "setup",
  "rehearsal",
  "show",
  "downrig",
] as const;

export type CrewShiftPhaseKey = (typeof CREW_SHIFT_PHASE_KEYS)[number];

export type CrewShiftTime = {
  startTime: string;
  endTime: string;
  timeTbd?: boolean;
};

export type CrewShiftTimeMap = Record<string, CrewShiftTime>;

export function crewShiftAssignmentKey(
  dateKey: string,
  phaseName: CrewShiftPhaseKey,
): string {
  return `${dateKey}::${phaseName}`;
}

export function setCrewShiftPhaseSelection(
  current: ReadonlySet<string>,
  dateKey: string,
  phaseName: CrewShiftPhaseKey,
  checked: boolean,
): Set<string> {
  const next = new Set(current);
  const exactKey = crewShiftAssignmentKey(dateKey, phaseName);
  if (checked) next.add(exactKey);
  else next.delete(exactKey);
  return next;
}

export function assignedDatesFromShiftPhases(
  selections: ReadonlySet<string>,
): string[] {
  const dates = new Set<string>();
  for (const selection of selections) {
    const separatorIndex = selection.indexOf("::");
    if (separatorIndex <= 0) continue;
    dates.add(selection.slice(0, separatorIndex));
  }
  return [...dates].sort();
}

const VALID_TIME = /^\d{2}:\d{2}$/;

function minutesFromTime(value: string): number | null {
  if (!VALID_TIME.test(value)) return null;
  const [hours, minutes] = value.split(":").map(Number);
  if (
    !Number.isInteger(hours) ||
    !Number.isInteger(minutes) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    return null;
  }
  return hours * 60 + minutes;
}

function dayIndex(dateKey: string): number | null {
  const timestamp = Date.parse(`${dateKey}T00:00:00Z`);
  return Number.isFinite(timestamp)
    ? Math.floor(timestamp / 86_400_000)
    : null;
}

export function scheduledShiftKeys(
  phaseDays: Partial<Record<CrewShiftPhaseKey, ReadonlyArray<string>>>,
): string[] {
  const keys: string[] = [];
  for (const phaseName of CREW_SHIFT_PHASE_KEYS) {
    for (const dateKey of phaseDays[phaseName] ?? []) {
      keys.push(crewShiftAssignmentKey(dateKey, phaseName));
    }
  }
  return [...new Set(keys)].sort();
}

export function filterShiftSelectionsToSchedule(
  selections: Iterable<string>,
  scheduledKeys: ReadonlySet<string>,
): Set<string> {
  return new Set([...selections].filter((key) => scheduledKeys.has(key)));
}

export function shiftTimesForSelections(
  selections: Iterable<string>,
  scheduledTimes: Readonly<CrewShiftTimeMap>,
): CrewShiftTimeMap {
  const result: CrewShiftTimeMap = {};
  for (const key of selections) {
    const time = scheduledTimes[key];
    if (!time) continue;
    result[key] = { ...time };
  }
  return result;
}

export function summarizeShiftTimes(
  selections: Iterable<string>,
  shiftTimes: Readonly<CrewShiftTimeMap>,
  defaults: CrewShiftTime,
): CrewShiftTime {
  let earliest:
    | { absoluteMinutes: number; displayTime: string }
    | undefined;
  let latest:
    | { absoluteMinutes: number; displayTime: string }
    | undefined;

  for (const key of selections) {
    const [dateKey] = key.split("::");
    const time = shiftTimes[key];
    const date = dayIndex(dateKey);
    const start = time ? minutesFromTime(time.startTime) : null;
    const end = time ? minutesFromTime(time.endTime) : null;
    if (date == null || start == null || end == null || !time) continue;

    const startAbsolute = date * 1440 + start;
    const endAbsolute = date * 1440 + end + (end <= start ? 1440 : 0);
    if (!earliest || startAbsolute < earliest.absoluteMinutes) {
      earliest = {
        absoluteMinutes: startAbsolute,
        displayTime: time.startTime,
      };
    }
    if (!latest || endAbsolute > latest.absoluteMinutes) {
      latest = {
        absoluteMinutes: endAbsolute,
        displayTime: time.endTime,
      };
    }
  }

  return {
    startTime: earliest?.displayTime || defaults.startTime,
    endTime: latest?.displayTime || defaults.endTime,
  };
}