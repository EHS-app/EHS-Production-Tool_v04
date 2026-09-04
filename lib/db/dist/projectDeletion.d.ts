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
};
/**
 * Hard-deletes an owned project and every project-owned dependent record in
 * one transaction. Explicit child removal makes the operation deterministic;
 * database cascades remain a final guard against concurrent child inserts.
 */
export declare function deleteOwnedProject(projectId: string, ownerUserId: string): Promise<DeleteOwnedProjectResult>;
//# sourceMappingURL=projectDeletion.d.ts.map