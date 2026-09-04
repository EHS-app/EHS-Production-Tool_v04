const RFC3339_WITH_OFFSET =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:\d{2})$/;

export function parseCalendarInstant(value: unknown): Date | null {
  if (typeof value !== "string") return null;
  const match = RFC3339_WITH_OFFSET.exec(value);
  if (!match) return null;
  const [, year, month, day, hour, minute, second = "0"] = match;
  const yearNumber = Number(year);
  const monthNumber = Number(month);
  const dayNumber = Number(day);
  const leapYear =
    yearNumber % 4 === 0 &&
    (yearNumber % 100 !== 0 || yearNumber % 400 === 0);
  const daysInMonth = [
    0,
    31,
    leapYear ? 29 : 28,
    31,
    30,
    31,
    30,
    31,
    31,
    30,
    31,
    30,
    31,
  ][monthNumber] ?? 0;
  if (
    dayNumber < 1 ||
    dayNumber > daysInMonth ||
    Number(hour) > 23 ||
    Number(minute) > 59 ||
    Number(second) > 59
  )
    return null;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? null : new Date(parsed);
}

export function overlapsHalfOpen(
  leftStart: Date,
  leftEnd: Date,
  rightStart: Date,
  rightEnd: Date,
): boolean {
  return leftStart < rightEnd && leftEnd > rightStart;
}

export function dateInTimeZone(value: Date, timezone: string): string {
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

export function localInstant(
  day: Date,
  minute: number,
  timezone: string,
): Date {
  const wanted = Date.UTC(
    day.getUTCFullYear(),
    day.getUTCMonth(),
    day.getUTCDate(),
    Math.floor(minute / 60),
    minute % 60,
  );
  let guess = wanted;
  for (let i = 0; i < 3; i++) {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).formatToParts(new Date(guess));
    const fields = Object.fromEntries(
      parts.map((part) => [part.type, part.value]),
    );
    const shown = Date.UTC(
      Number(fields.year),
      Number(fields.month) - 1,
      Number(fields.day),
      Number(fields.hour),
      Number(fields.minute),
    );
    guess += wanted - shown;
  }
  return new Date(guess);
}

export function localDateRangeToInstants(
  fromDate: string,
  toDate: string,
  timezone: string,
): { from: Date; to: Date } {
  const fromDay = new Date(`${fromDate}T00:00:00.000Z`);
  const afterToDay = new Date(`${toDate}T00:00:00.000Z`);
  afterToDay.setUTCDate(afterToDay.getUTCDate() + 1);
  return {
    from: localInstant(fromDay, 0, timezone),
    to: localInstant(afterToDay, 0, timezone),
  };
}

export function weeklyRuleMatchesDateRange(
  rule: {
    weekday: number;
    startMinute: number;
    endMinute: number;
    timezone: string;
    startsOn: Date;
    until: Date;
  },
  fromDate: string,
  toDate: string,
): { matches: boolean; fullDay: boolean } {
  const ruleStartDate = dateInTimeZone(rule.startsOn, rule.timezone);
  const ruleEndDate = dateInTimeZone(rule.until, rule.timezone);
  const from = new Date(`${fromDate}T00:00:00.000Z`);
  const to = new Date(`${toDate}T00:00:00.000Z`);
  for (
    let day = from;
    day <= to;
    day = new Date(day.getTime() + 86_400_000)
  ) {
    const label = day.toISOString().slice(0, 10);
    if (
      label >= ruleStartDate &&
      label <= ruleEndDate &&
      day.getUTCDay() === rule.weekday
    ) {
      return {
        matches: true,
        fullDay:
          fromDate === toDate &&
          rule.startMinute === 0 &&
          rule.endMinute === 1440,
      };
    }
  }
  return { matches: false, fullDay: false };
}

export function expandWeeklyRuleOccurrences(
  rule: {
    weekday: number;
    startMinute: number;
    endMinute: number;
    timezone: string;
    startsOn: Date;
    until: Date;
  },
  fromDate: string,
  toDate: string,
  maxOccurrences = 2000,
): Array<{ date: string; startsAt: Date; endsAt: Date }> {
  const ruleStartDate = dateInTimeZone(rule.startsOn, rule.timezone);
  const ruleEndDate = dateInTimeZone(rule.until, rule.timezone);
  const from = new Date(`${fromDate}T00:00:00.000Z`);
  const to = new Date(`${toDate}T00:00:00.000Z`);
  const occurrences: Array<{
    date: string;
    startsAt: Date;
    endsAt: Date;
  }> = [];
  for (
    let day = from;
    day <= to && occurrences.length < maxOccurrences;
    day = new Date(day.getTime() + 86_400_000)
  ) {
    const label = day.toISOString().slice(0, 10);
    if (
      label < ruleStartDate ||
      label > ruleEndDate ||
      day.getUTCDay() !== rule.weekday
    ) {
      continue;
    }
    occurrences.push({
      date: label,
      startsAt: localInstant(day, rule.startMinute, rule.timezone),
      endsAt: localInstant(day, rule.endMinute, rule.timezone),
    });
  }
  return occurrences;
}