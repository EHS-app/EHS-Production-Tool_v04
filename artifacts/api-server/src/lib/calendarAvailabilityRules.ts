import {
  dateInTimeZone,
  expandWeeklyRuleOccurrences,
  overlapsHalfOpen,
} from "./calendarTime";

export type WeeklyAvailabilityRule = {
  id: string;
  userId: string;
  weekday: number;
  startMinute: number;
  endMinute: number;
  timezone: string;
  startsOn: Date;
  until: Date;
};

export type RuleOccurrence = {
  ruleId: string;
  userId: string;
  occurrenceDate: string;
  startsAt: Date;
  endsAt: Date;
};

export function isAllDayWeeklyRule(
  rule: Pick<WeeklyAvailabilityRule, "startMinute" | "endMinute">,
): boolean {
  return rule.startMinute === 0 && rule.endMinute === 1440;
}

/**
 * Finds only the weekly occurrences that actually overlap a half-open instant
 * range. Local dates are derived in each rule's timezone, preserving DST.
 */
export function ruleOccurrencesOverlappingRange(
  rules: WeeklyAvailabilityRule[],
  rangeStart: Date,
  rangeEnd: Date,
): RuleOccurrence[] {
  const occurrences: RuleOccurrence[] = [];
  const lastInstantInRange = new Date(rangeEnd.getTime() - 1);
  for (const rule of rules) {
    try {
      const fromDate = dateInTimeZone(rangeStart, rule.timezone);
      const toDate = dateInTimeZone(lastInstantInRange, rule.timezone);
      for (const occurrence of expandWeeklyRuleOccurrences(
        rule,
        fromDate,
        toDate,
      )) {
        if (
          overlapsHalfOpen(
            occurrence.startsAt,
            occurrence.endsAt,
            rangeStart,
            rangeEnd,
          )
        )
          occurrences.push({
            ruleId: rule.id,
            userId: rule.userId,
            occurrenceDate: occurrence.date,
            startsAt: occurrence.startsAt,
            endsAt: occurrence.endsAt,
          });
      }
    } catch {
      // A legacy bad timezone must not make a bulk write unsafe.
    }
  }
  return occurrences;
}

export function ruleOccurrenceExceptionKey(
  ruleId: string,
  occurrenceDate: string,
): string {
  return `${ruleId}:${occurrenceDate}`;
}
