/**
 * A single transaction-scoped lock serializes changes to the legacy
 * projects.data.activeBriefId relationship. It intentionally spans projects:
 * validation must rule out a brief being claimed by a different project.
 */
export declare const PROJECT_BRIEF_PROVENANCE_LOCK: import("drizzle-orm").SQL<unknown>;
export type HardDeleteProjectResult = {
    kind: "deleted";
} | {
    kind: "not_found";
};
/**
 * Hard-deletes a project and every project-owned dependent record in
 * one transaction. Explicit child removal makes the operation deterministic;
 * database cascades remain a final guard against concurrent child inserts.
 * Authorization must be enforced by the caller before invoking this helper.
 */
export declare function hardDeleteProject(projectId: string): Promise<HardDeleteProjectResult>;
//# sourceMappingURL=projectDeletion.d.ts.map