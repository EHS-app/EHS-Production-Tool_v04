import { z } from "zod/v4";
/** Producer-locked hotel room assignments for a brief.
 *
 *  This table stores ONLY the producer's manual locks — the pairing
 *  engine in `roomPairing.ts` runs at request time and fills in the
 *  unlocked majority. Two reasons we keep it lock-only rather than
 *  storing every assignment:
 *
 *  1. The full assignment is a deterministic function of (crew set,
 *     prefs, dates, locks). If we stored it, every prefs/date edit
 *     would force a re-write of every row, with stale rows leaking
 *     in if a freelancer got dropped from the brief mid-edit. The
 *     lock-only model avoids that drift entirely — locks are the
 *     producer's intent, suggestions are recomputed.
 *
 *  2. It keeps the producer-intent surface tiny and auditable. A
 *     single row per locked person tells you "the producer chose to
 *     freeze this assignment" — nothing more, nothing less.
 *
 *  Composite PK on (briefId, freelancerUserId): a freelancer can be
 *  in at most one room per brief, but obviously the same freelancer
 *  can have locked rooms across multiple briefs. The PK column
 *  types are both `text` to match `project_briefs.id` and the Clerk
 *  user id strings used everywhere else in the schema. */
export declare const briefRoomAssignmentsTable: import("drizzle-orm/pg-core").PgTableWithColumns<{
    name: "brief_room_assignments";
    schema: undefined;
    columns: {
        briefId: import("drizzle-orm/pg-core").PgColumn<{
            name: "brief_id";
            tableName: "brief_room_assignments";
            dataType: "string";
            columnType: "PgText";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {}>;
        freelancerUserId: import("drizzle-orm/pg-core").PgColumn<{
            name: "freelancer_user_id";
            tableName: "brief_room_assignments";
            dataType: "string";
            columnType: "PgText";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {}>;
        roomKey: import("drizzle-orm/pg-core").PgColumn<{
            name: "room_key";
            tableName: "brief_room_assignments";
            dataType: "string";
            columnType: "PgText";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {}>;
        locked: import("drizzle-orm/pg-core").PgColumn<{
            name: "locked";
            tableName: "brief_room_assignments";
            dataType: "boolean";
            columnType: "PgBoolean";
            data: boolean;
            driverParam: boolean;
            notNull: true;
            hasDefault: true;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: undefined;
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {}>;
        createdAt: import("drizzle-orm/pg-core").PgColumn<{
            name: "created_at";
            tableName: "brief_room_assignments";
            dataType: "date";
            columnType: "PgTimestamp";
            data: Date;
            driverParam: string;
            notNull: true;
            hasDefault: true;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: undefined;
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {}>;
        updatedAt: import("drizzle-orm/pg-core").PgColumn<{
            name: "updated_at";
            tableName: "brief_room_assignments";
            dataType: "date";
            columnType: "PgTimestamp";
            data: Date;
            driverParam: string;
            notNull: true;
            hasDefault: true;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: undefined;
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {}>;
    };
    dialect: "pg";
}>;
export declare const insertBriefRoomAssignmentSchema: z.ZodObject<{
    briefId: z.ZodString;
    freelancerUserId: z.ZodString;
    roomKey: z.ZodString;
    locked: z.ZodOptional<z.ZodBoolean>;
}, {
    out: {};
    in: {};
}>;
export type InsertBriefRoomAssignment = z.infer<typeof insertBriefRoomAssignmentSchema>;
export type BriefRoomAssignmentRow = typeof briefRoomAssignmentsTable.$inferSelect;
//# sourceMappingURL=briefRoomAssignments.d.ts.map