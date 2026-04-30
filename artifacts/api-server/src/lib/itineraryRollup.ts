/**
 * Pure composer that turns a brief + the caller's own gig + their hotel
 * row into a per-day itinerary the freelancer portal can render and
 * (later) export to .ics.
 *
 * Kept side-effect-free and DB-free so it can be unit-tested in
 * isolation and so the route handler stays a thin glue layer.
 *
 * Note: this is intentionally caller-scoped. It must never expose
 * other crew members' details. The single exception is the room-mate's
 * display name, which is opt-in (only set if the OTHER occupant of the
 * caller's room is also accepted on this brief — and we only return
 * their name, not their phone/email/etc).
 */

export type ItineraryPhaseKey = "setup" | "rehearsal" | "show" | "downrig";

const PHASE_LABELS: Record<ItineraryPhaseKey, string> = {
  setup: "Setup",
  rehearsal: "Rehearsal",
  show: "Show",
  downrig: "Downrig",
};

const PHASE_KEYS: ItineraryPhaseKey[] = [
  "setup",
  "rehearsal",
  "show",
  "downrig",
];

/** Day-of-week labels keyed by JS getUTCDay() (Sun=0). Short form
 *  matches the rest of the freelancer portal's date pills. */
const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

export type ItineraryScheduleSegment = {
  from: string;
  to: string;
  fromTime?: string;
  toTime?: string;
};

export type ItinerarySchedule = Partial<
  Record<ItineraryPhaseKey, ItineraryScheduleSegment[]>
>;

export type ItineraryDay = {
  /** ISO YYYY-MM-DD. */
  date: string;
  /** Short day-of-week label, e.g. "Mon". */
  dayOfWeek: string;
  /** True if the caller is on assignment this day. */
  working: boolean;
  /** Caller's call time on a working day (free-text from the brief
   *  assignment — usually "09:00", "08:30", etc). */
  callTime?: string;
  offTime?: string;
  /** Schedule phases active on this date — derived from the brief's
   *  schedule.from/to spans, regardless of whether the caller is
   *  personally working that day (they may want to know when load-in
   *  starts even if they don't fly in until rehearsal day). */
  phases: Array<{
    phaseKey: ItineraryPhaseKey;
    phaseLabel: string;
    fromTime?: string;
    toTime?: string;
  }>;
  /** Hotel info for this date. Omitted entirely (not just empty)
   *  when the caller is not staying at a hotel for this trip. */
  hotel?: {
    /** True iff the caller is sleeping in the hotel that night
     *  (i.e. checkIn <= date < checkOut). */
    stayingTonight: boolean;
    /** True iff date === checkIn. The freelancer probably arrives
     *  this day. */
    isCheckIn: boolean;
    /** True iff date === checkOut. The freelancer leaves this day
     *  in the morning — they're NOT also stayingTonight. */
    isCheckOut: boolean;
    /** Stable per-room key from `brief_room_assignments`. */
    roomKey?: string;
    /** Display name of the OTHER occupant of the caller's room, if
     *  any. Null for solo room or if no other accepted person is
     *  assigned to the same roomKey yet. */
    roommateName?: string | null;
    /** Producer pinned this room — won't be re-shuffled by the
     *  pairing engine on next reload. */
    locked?: boolean;
  };
  /** Venue label — duplicated on each day so the .ics export can
   *  stamp it on every VEVENT without threading the brief through. */
  venue: string;
};

export type RollupInput = {
  brief: {
    project: {
      venue: string;
      date: string;
      endDate?: string | null;
      schedule?: ItinerarySchedule;
    };
  };
  /** Caller's own brief assignment, used for callTime/offTime. */
  callerAssignment: { callTime?: string; offTime?: string } | null;
  /** Working dates from the caller's accepted gig (YYYY-MM-DD). */
  callerWorkingDates: string[];
  /** Caller's hotel state. Null if they don't have a gig on this
   *  brief, or if hotelRequired=false / dates not set. */
  callerHotel: {
    checkInDate: string;
    checkOutDate: string;
    roomKey: string | null;
    roomLocked: boolean;
    /** Resolved by the route handler before calling rollup. */
    roommateName: string | null;
  } | null;
};

/** Inclusive iso-date iterator. start <= d <= end. Operates in UTC
 *  to avoid timezone drift on month/DST boundaries. */
function* iterateDates(startIso: string, endIso: string): Generator<string> {
  if (!startIso || !endIso) return;
  if (startIso > endIso) return;
  const cur = new Date(`${startIso}T00:00:00Z`);
  const end = new Date(`${endIso}T00:00:00Z`);
  // Hard ceiling: 365 days. Pure paranoia against a malformed brief
  // creating a year-long loop. Real briefs are days, not months.
  let safety = 0;
  while (cur.getTime() <= end.getTime() && safety < 365) {
    yield cur.toISOString().slice(0, 10);
    cur.setUTCDate(cur.getUTCDate() + 1);
    safety += 1;
  }
}

function isIsoDate(s: unknown): s is string {
  return typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);
}

function dayOfWeekFor(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  return DOW[d.getUTCDay()] ?? "";
}

/**
 * Build the per-day itinerary for the caller.
 *
 * Day range = the union of:
 *   - caller's working dates,
 *   - caller's hotel checkIn..checkOut (inclusive on both ends so the
 *     check-out morning is shown as its own card),
 *   - the brief's project.date..project.endDate (so the freelancer
 *     sees travel days that bracket the show).
 *
 * Empty input → empty array; callers should not assume at least one
 * day comes back.
 */
export function rollupItinerary(input: RollupInput): ItineraryDay[] {
  const { brief, callerAssignment, callerWorkingDates, callerHotel } = input;

  // Collect candidate boundary dates and pick min/max. Filter to ISO
  // shape so a malformed entry can't widen the range to "1970-01-01".
  const boundaries: string[] = [];
  if (isIsoDate(brief.project.date)) boundaries.push(brief.project.date);
  if (isIsoDate(brief.project.endDate)) boundaries.push(brief.project.endDate!);
  for (const d of callerWorkingDates) {
    if (isIsoDate(d)) boundaries.push(d);
  }
  if (callerHotel) {
    if (isIsoDate(callerHotel.checkInDate))
      boundaries.push(callerHotel.checkInDate);
    if (isIsoDate(callerHotel.checkOutDate))
      boundaries.push(callerHotel.checkOutDate);
  }
  if (boundaries.length === 0) return [];
  boundaries.sort();
  const start = boundaries[0]!;
  const end = boundaries[boundaries.length - 1]!;

  const workingSet = new Set(callerWorkingDates.filter(isIsoDate));
  const venue = brief.project.venue || "";
  const schedule = brief.project.schedule ?? {};

  const days: ItineraryDay[] = [];
  for (const iso of iterateDates(start, end)) {
    const working = workingSet.has(iso);

    // Phase segments active on this date. A segment is active when
    // seg.from <= iso <= seg.to. ISO date strings sort lexically so
    // string comparisons are correct without parsing.
    const phases: ItineraryDay["phases"] = [];
    for (const key of PHASE_KEYS) {
      // Defensive: schedule comes from a jsonb column edited by
      // producers — a malformed brief that stored `setup: {}` (or
      // even `setup: null`) instead of an array would otherwise
      // throw on iteration and 500 the freelancer's itinerary call.
      const raw = schedule[key];
      const segs = Array.isArray(raw) ? raw : [];
      for (const seg of segs) {
        if (!isIsoDate(seg.from) || !isIsoDate(seg.to)) continue;
        if (seg.from <= iso && iso <= seg.to) {
          phases.push({
            phaseKey: key,
            phaseLabel: PHASE_LABELS[key],
            fromTime: seg.fromTime,
            toTime: seg.toTime,
          });
          // Don't break — the same phase can in theory have two
          // overlapping segments (rare but legal in the schema), and
          // we want both shown so the freelancer sees both call
          // windows.
        }
      }
    }

    let hotel: ItineraryDay["hotel"] | undefined;
    if (
      callerHotel &&
      isIsoDate(callerHotel.checkInDate) &&
      isIsoDate(callerHotel.checkOutDate) &&
      callerHotel.checkInDate <= iso &&
      iso <= callerHotel.checkOutDate
    ) {
      const isCheckIn = iso === callerHotel.checkInDate;
      const isCheckOut = iso === callerHotel.checkOutDate;
      // checkOut date is the morning AFTER the last hotel night, so
      // they're not staying that night.
      const stayingTonight = !isCheckOut;
      hotel = {
        stayingTonight,
        isCheckIn,
        isCheckOut,
        ...(callerHotel.roomKey ? { roomKey: callerHotel.roomKey } : {}),
        roommateName: callerHotel.roommateName,
        locked: callerHotel.roomLocked,
      };
    }

    const day: ItineraryDay = {
      date: iso,
      dayOfWeek: dayOfWeekFor(iso),
      working,
      phases,
      venue,
    };
    if (working && callerAssignment) {
      if (callerAssignment.callTime) day.callTime = callerAssignment.callTime;
      if (callerAssignment.offTime) day.offTime = callerAssignment.offTime;
    }
    if (hotel) day.hotel = hotel;
    days.push(day);
  }
  return days;
}
