import { and, eq, inArray, ne, or, sql } from "drizzle-orm";
import { db } from "./client";
import {
  calendarHoldsTable,
  gigsTable,
  projectBriefsTable,
  projectExpensesTable,
  projectFinanceSettingsTable,
  projectsTable,
  timeEntriesTable,
} from "./schema";

export const PROJECT_DELETE_FINANCIAL_CONFLICT =
  "This project cannot be deleted because it has approved or payroll-locked time or financial records. Those records must be preserved.";

/**
 * A single transaction-scoped lock serializes changes to the legacy
 * projects.data.activeBriefId relationship. It intentionally spans projects:
 * validation must rule out a brief being claimed by a different project.
 */
export const PROJECT_BRIEF_PROVENANCE_LOCK = sql`
  select pg_advisory_xact_lock(1886545254, 134756896)
`;

export type DeleteOwnedProjectResult =
  | { kind: "deleted" }
  | { kind: "not_found" }
  | { kind: "financial_conflict" };

/**
 * Deletes an owned project as one transaction.
 *
 * Brief payroll is protected before any destructive work. A brief graph is
 * removed only when its provenance points exactly at this project, it belongs
 * to the project owner, and no other project's authoritative activeBriefId
 * points at it. Ambiguous/foreign brief graphs are deliberately retained.
 */
export async function deleteOwnedProject(
  projectId: string,
  ownerUserId: string,
): Promise<DeleteOwnedProjectResult> {
  return db.transaction(async (tx) => {
    await tx.execute(PROJECT_BRIEF_PROVENANCE_LOCK);
    const [project] = await tx
      .select({
        id: projectsTable.id,
        activeBriefId: sql<string | null>`nullif(${projectsTable.data}->>'activeBriefId', '')`,
      })
      .from(projectsTable)
      .where(
        and(
          eq(projectsTable.id, projectId),
          eq(projectsTable.userId, ownerUserId),
        ),
      )
      .limit(1)
      .for("update");

    if (!project) return { kind: "not_found" };

    // Expenses are posted actuals, and EasyJob revenue is explicitly a
    // reconciled value. Neither may disappear through the project's cascade.
    // Lock both rows before deciding so a finance write cannot race deletion.
    const finance = await tx
      .select({
        easyjobRevenueMinor: projectFinanceSettingsTable.easyjobRevenueMinor,
      })
      .from(projectFinanceSettingsTable)
      .where(eq(projectFinanceSettingsTable.projectId, projectId))
      .limit(1)
      .for("update");
    const recordedExpense = await tx
      .select({ id: projectExpensesTable.id })
      .from(projectExpensesTable)
      .where(eq(projectExpensesTable.projectId, projectId))
      .limit(1)
      .for("update");
    if (
      recordedExpense.length > 0 ||
      (finance[0]?.easyjobRevenueMinor ?? 0) > 0
    ) {
      return { kind: "financial_conflict" };
    }

    const linkedBriefWhere = project.activeBriefId
      ? or(
          eq(projectBriefsTable.projectId, projectId),
          eq(projectBriefsTable.id, project.activeBriefId),
        )
      : eq(projectBriefsTable.projectId, projectId);

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
        .select({ id: gigsTable.id, status: gigsTable.status })
        .from(gigsTable)
        .where(inArray(gigsTable.briefId, linkedBriefIds))
        .for("update");

      if (
        linkedGigs.some(
          (gig) => gig.status === "invoiced" || gig.status === "paid",
        )
      ) {
        return { kind: "financial_conflict" };
      }

      const linkedGigIds = linkedGigs.map((gig) => gig.id);
      const entryLinkWhere =
        linkedGigIds.length > 0
          ? or(
              inArray(timeEntriesTable.briefId, linkedBriefIds),
              inArray(timeEntriesTable.gigId, linkedGigIds),
            )
          : inArray(timeEntriesTable.briefId, linkedBriefIds);
      // The producer approval path transitions an entry atomically. Lock every
      // linked row (not just rows that look protected) before evaluating it:
      // a submitted row cannot become approved between this check and graph
      // removal. The approval endpoint's atomic UPDATE takes only the entry
      // row lock; this parent-to-child order therefore cannot invert locks.
      const linkedEntries = await tx
        .select({
          id: timeEntriesTable.id,
          status: timeEntriesTable.status,
          approvedRateMinor: timeEntriesTable.approvedRateMinor,
          approvedFlatFeeMinor: timeEntriesTable.approvedFlatFeeMinor,
          approvedOvertimeMultiplierBasisPoints:
            timeEntriesTable.approvedOvertimeMultiplierBasisPoints,
        })
        .from(timeEntriesTable)
        .where(entryLinkWhere)
        .for("update");
      if (
        linkedEntries.some(
          (entry) =>
            entry.status === "approved" ||
            entry.status === "locked" ||
            entry.approvedRateMinor != null ||
            entry.approvedFlatFeeMinor != null ||
            entry.approvedOvertimeMultiplierBasisPoints != null,
        )
      ) {
        return { kind: "financial_conflict" };
      }

      const externallyReferenced = await tx
        .select({
          activeBriefId: sql<string>`${projectsTable.data}->>'activeBriefId'`,
        })
        .from(projectsTable)
        .where(
          and(
            ne(projectsTable.id, projectId),
            inArray(
              sql<string>`${projectsTable.data}->>'activeBriefId'`,
              linkedBriefIds,
            ),
          ),
        );
      const externalIds = new Set(
        externallyReferenced.map((row) => row.activeBriefId),
      );
      const safeBriefIds = linkedBriefs
        .filter(
          (brief) =>
            brief.ownerUserId === ownerUserId &&
            !externalIds.has(brief.id) &&
            (brief.projectId === projectId ||
              (brief.id === project.activeBriefId &&
                (brief.projectId === null ||
                  brief.projectId === projectId))),
        )
        .map((brief) => brief.id);

      if (safeBriefIds.length > 0) {
        // time_entries cascade from gigs; assignments and room locks cascade
        // from briefs. The explicit gig removal prevents detached gig history.
        await tx.delete(gigsTable).where(inArray(gigsTable.briefId, safeBriefIds));
        // Also remove short-lived calendar reservations explicitly; the FK is
        // a second line of defense for a hold created concurrently.
        await tx
          .delete(calendarHoldsTable)
          .where(inArray(calendarHoldsTable.briefId, safeBriefIds));
        await tx
          .delete(projectBriefsTable)
          .where(inArray(projectBriefsTable.id, safeBriefIds));
      }
    }

    const removed = await tx
      .delete(projectsTable)
      .where(
        and(
          eq(projectsTable.id, projectId),
          eq(projectsTable.userId, ownerUserId),
        ),
      )
      .returning({ id: projectsTable.id });
    return removed.length === 1 ? { kind: "deleted" } : { kind: "not_found" };
  });
}