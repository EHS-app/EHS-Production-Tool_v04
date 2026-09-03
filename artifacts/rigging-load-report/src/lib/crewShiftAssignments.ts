export const CREW_SHIFT_PHASE_KEYS = [
  "setup",
  "rehearsal",
  "show",
  "downrig",
] as const;

export type CrewShiftPhaseKey = (typeof CREW_SHIFT_PHASE_KEYS)[number];

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