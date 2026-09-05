import { and, eq, inArray, ne, or, sql } from "drizzle-orm";
import { db } from "./client";
import {
  briefAssignmentsTable,
  briefDispatchesTable,
  briefRoomAssignmentsTable,
  calendarHoldsTable,
  gigsTable,
  projectBriefsTable,
  projectExpensesTable,
  projectFinanceSettingsTable,
  projectMembersTable,
  projectMessagesTable,
  projectTasksTable,
  projectsTable,
  timeEntriesTable,
  transportRunsTable,
} from "./schema";

/**
 * A single transaction-scoped lock serializes changes to the legacy
 * projects.data.activeBriefId relationship. It intentionally spans projects:
 * validation must rule out a brief being claimed by a different project.
 */
export const PROJECT_BRIEF_PROVENANCE_LOCK = sql`
  select pg_advisory_xact_lock(1886545254, 134756896)
`;

export type HardDeleteProjectResult =
  | { kind: "deleted" }
  | { kind: "not_found" };

/**
 * Hard-deletes a project and every project-owned dependent record in
 * one transaction. Explicit child removal makes the operation deterministic;
 * database cascades remain a final guard against concurrent child inserts.
 * Authorization must be enforced by the caller before invoking this helper.
 */
export async function hardDeleteProject(
  projectId: string,
): Promise<HardDeleteProjectResult> {
  return db.transaction(async (tx) => {
    await tx.execute(PROJECT_BRIEF_PROVENANCE_LOCK);
    const [project] = await tx
      .select({
        id: projectsTable.id,
        ownerUserId: projectsTable.userId,
        activeBriefId: sql<string | null>`nullif(${projectsTable.data}->>'activeBriefId', '')`,
      })
      .from(projectsTable)
      .where(eq(projectsTable.id, projectId))
      .limit(1)
      .for("update");

    if (!project) return { kind: "not_found" };

    // Editors can attach briefs they own to another user's project. Unlink
    // those records before deletion; project ownership must not authorize
    // deleting a different user's brief, gig, or payroll graph.
    await tx
      .update(projectBriefsTable)
      .set({ projectId: null, updatedAt: new Date() })
      .where(
        and(
          eq(projectBriefsTable.projectId, projectId),
          ne(projectBriefsTable.ownerUserId, project.ownerUserId),
        ),
      );

    const linkedBriefWhere = project.activeBriefId
      ? or(
          and(
            eq(projectBriefsTable.projectId, projectId),
            eq(projectBriefsTable.ownerUserId, project.ownerUserId),
          ),
          and(
            eq(projectBriefsTable.id, project.activeBriefId),
            eq(projectBriefsTable.ownerUserId, project.ownerUserId),
          ),
        )
      : and(
          eq(projectBriefsTable.projectId, projectId),
          eq(projectBriefsTable.ownerUserId, project.ownerUserId),
        );

    const linkedBriefs = await tx
      .select({
        id: projectBriefsTable.id,
        ownerUserId: projectBriefsTable.ownerUserId,
        projectId: projectBriefsTable.projectId,
      })
      .from(projectBriefsTable)
      .where(linkedBriefWhere)
      .for("update");
    const linkedBriefIds = linkedBriefs.map((brief) => brief.id);

    if (linkedBriefIds.length > 0) {
      const linkedGigs = await tx
        .select({ id: gigsTable.id })
        .from(gigsTable)
        .where(inArray(gigsTable.briefId, linkedBriefIds))
        .for("update");
      const linkedGigIds = linkedGigs.map((gig) => gig.id);
      const entryLinkWhere =
        linkedGigIds.length > 0
          ? or(
              inArray(timeEntriesTable.briefId, linkedBriefIds),
              inArray(timeEntriesTable.gigId, linkedGigIds),
            )
          : inArray(timeEntriesTable.briefId, linkedBriefIds);
      await tx.delete(timeEntriesTable).where(entryLinkWhere);
      if (linkedGigIds.length > 0) {
        await tx.delete(gigsTable).where(inArray(gigsTable.id, linkedGigIds));
      }
      await tx
        .delete(briefAssignmentsTable)
        .where(inArray(briefAssignmentsTable.briefId, linkedBriefIds));
      await tx
        .delete(briefDispatchesTable)
        .where(inArray(briefDispatchesTable.briefId, linkedBriefIds));
      await tx
        .delete(briefRoomAssignmentsTable)
        .where(inArray(briefRoomAssignmentsTable.briefId, linkedBriefIds));
      await tx
        .delete(calendarHoldsTable)
        .where(inArray(calendarHoldsTable.briefId, linkedBriefIds));
      await tx
        .update(projectsTable)
        .set({
          data: sql`${projectsTable.data} - 'activeBriefId'`,
          updatedAt: new Date(),
        })
        .where(
          inArray(
            sql<string>`${projectsTable.data}->>'activeBriefId'`,
            linkedBriefIds,
          ),
        );
      await tx
        .delete(projectBriefsTable)
        .where(inArray(projectBriefsTable.id, linkedBriefIds));
    }

    await tx
      .delete(projectExpensesTable)
      .where(eq(projectExpensesTable.projectId, projectId));
    await tx
      .delete(projectFinanceSettingsTable)
      .where(eq(projectFinanceSettingsTable.projectId, projectId));
    await tx
      .delete(projectTasksTable)
      .where(eq(projectTasksTable.projectId, projectId));
    await tx
      .delete(projectMessagesTable)
      .where(eq(projectMessagesTable.projectId, projectId));
    await tx
      .delete(projectMembersTable)
      .where(eq(projectMembersTable.projectId, projectId));
    await tx
      .delete(transportRunsTable)
      .where(eq(transportRunsTable.projectId, projectId));
    await tx
      .update(projectsTable)
      .set({ clonedFromProjectId: null, updatedAt: new Date() })
      .where(eq(projectsTable.clonedFromProjectId, projectId));

    const removed = await tx
      .delete(projectsTable)
      .where(eq(projectsTable.id, projectId))
      .returning({ id: projectsTable.id });
    return removed.length === 1 ? { kind: "deleted" } : { kind: "not_found" };
  });
}