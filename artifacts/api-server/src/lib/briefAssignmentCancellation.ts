export function removeCancelledAssignmentFromBriefData(
  data: unknown,
  crewId: string,
  freelancerUserId: string,
): { data: Record<string, unknown>; removed: boolean } {
  const source =
    data && typeof data === "object" && !Array.isArray(data)
      ? (data as Record<string, unknown>)
      : {};
  if (!Array.isArray(source.assignments)) {
    return { data: { ...source }, removed: false };
  }
  let removed = false;
  const assignments = source.assignments.filter((value) => {
    if (!value || typeof value !== "object" || Array.isArray(value)) return true;
    const row = value as Record<string, unknown>;
    const matches =
      row.crewId === crewId && row.freelancerUserId === freelancerUserId;
    if (matches) removed = true;
    return !matches;
  });
  return {
    data: {
      ...source,
      assignments,
      ...(source.recipientCrewId === crewId
        ? { recipientCrewId: null }
        : {}),
    },
    removed,
  };
}

export function canCancelBriefAssignment(
  assignment: { decision: string; acceptedGigId?: string | null },
): boolean {
  return assignment.decision === "pending" && !assignment.acceptedGigId;
}