export function isoDateOnly(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function localDateTime(day: string, time: string): Date | null {
  const dateMatch = day.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const timeMatch = time.match(/^(\d{2}):(\d{2})$/);
  if (!dateMatch || !timeMatch) return null;
  
  const y = Number(dateMatch[1]);
  const m = Number(dateMatch[2]) - 1;
  const d = Number(dateMatch[3]);
  const h = Number(timeMatch[1]);
  const min = Number(timeMatch[2]);
  
  const value = new Date(y, m, d, h, min);
  if (Number.isNaN(value.getTime())) return null;
  
  // Reject spring-forward non-existent times
  if (value.getFullYear() !== y || value.getMonth() !== m || value.getDate() !== d || value.getHours() !== h || value.getMinutes() !== min) {
    if (h === 0 && min === 0) {
      // Keep all-day midnight working: if midnight is skipped by DST, accept the shifted time (e.g., 01:00)
    } else {
      return null;
    }
  }
  
  // Detect ambiguous fall-back local times
  const tBefore = new Date(value.getTime() - 3600000);
  const tAfter = new Date(value.getTime() + 3600000);
  const offsetDiff = tBefore.getTimezoneOffset() - tAfter.getTimezoneOffset();
  
  if (offsetDiff !== 0 && !(h === 0 && min === 0)) {
    const shiftMs = Math.abs(offsetDiff) * 60000;
    const test1 = new Date(value.getTime() - shiftMs);
    const test2 = new Date(value.getTime() + shiftMs);
    if (
      (test1.getFullYear() === y && test1.getMonth() === m && test1.getDate() === d && test1.getHours() === h && test1.getMinutes() === min) ||
      (test2.getFullYear() === y && test2.getMonth() === m && test2.getDate() === d && test2.getHours() === h && test2.getMinutes() === min)
    ) {
      return null;
    }
  }
  
  return value;
}

export function overlapsLocalDay(
  startsAt: string,
  endsAt: string,
  day: string,
): boolean {
  const dayStart = localDateTime(day, "00:00");
  if (!dayStart) return false;
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);
  const starts = new Date(startsAt);
  const ends = new Date(endsAt);
  return starts < dayEnd && ends > dayStart;
}

export function localTimeOnly(value: string): string {
  const instant = new Date(value);
  return `${String(instant.getHours()).padStart(2, "0")}:${String(
    instant.getMinutes(),
  ).padStart(2, "0")}`;
}

export async function responseError(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as { error?: string };
    return body.error || "Could not save availability.";
  } catch {
    return "Could not save availability.";
  }
}

export function daysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

export function buildMonthCells(year: number, month: number) {
  const first = new Date(year, month, 1);
  const startWeekday = (first.getDay() + 6) % 7; // Mon=0
  const cells: { iso: string | null; day: number | null; date?: Date }[] = [];
  for (let i = 0; i < startWeekday; i++) cells.push({ iso: null, day: null });
  const days = daysInMonth(year, month);
  for (let d = 1; d <= days; d++) {
    const dt = new Date(year, month, d);
    cells.push({ iso: isoDateOnly(dt), day: d, date: dt });
  }
  while (cells.length % 7 !== 0) cells.push({ iso: null, day: null });
  return cells;
}

export function getIsoWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}
