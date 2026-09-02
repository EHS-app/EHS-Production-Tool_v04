export declare const PROJECT_DELETE_FINANCIAL_CONFLICT = "This project cannot be deleted because it has approved or payroll-locked time or financial records. Those records must be preserved.";
/**
 * A single transaction-scoped lock serializes changes to the legacy
 * projects.data.activeBriefId relationship. It intentionally spans projects:
 * validation must rule out a brief being claimed by a different project.
 */
export declare const PROJECT_BRIEF_PROVENANCE_LOCK: import("drizzle-orm").SQL<unknown>;
export type DeleteOwnedProjectResult = {
    kind: "deleted";
} | {
    kind: "not_found";
} | {
    kind: "financial_conflict";
};
/**
 * Deletes an owned project as one transaction.
 *
 * Brief payroll is protected before any destructive work. A brief graph is
 * removed only when its provenance points exactly at this project, it belongs
 * to the project owner, and no other project's authoritative activeBriefId
 * points at it. Ambiguous/foreign brief graphs are deliberately retained.
 */
export declare function deleteOwnedProject(projectId: string, ownerUserId: string): Promise<DeleteOwnedProjectResult>;
//# sourceMappingURL=projectDeletion.d.ts.map