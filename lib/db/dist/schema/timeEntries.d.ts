import { z } from "zod/v4";
/** One row per freelancer per working day on a gig.
 *
 *  Workflow:
 *   draft        — created (auto from assigned days, or manually) but the
 *                  freelancer hasn't logged actual times yet.
 *   submitted    — freelancer has filled start/end and pushed for approval.
 *   approved     — producer signed off. Counts toward payroll.
 *   rejected     — producer pushed back; freelancer can re-submit.
 *   locked       — payroll has been exported. Edits require a correction
 *                  (which would be a new row, leaving this one immutable).
 *
 *  Times are stored as minutes-since-midnight (0–1439) instead of timestamps
 *  so we don't get tangled in tz issues; `workDate` is the authoritative
 *  day. Overnight shifts (end < start) are interpreted as "next day".
 */
export declare const timeEntriesTable: import("drizzle-orm/pg-core").PgTableWithColumns<{
    name: "time_entries";
    schema: undefined;
    columns: {
        id: import("drizzle-orm/pg-core").PgColumn<{
            name: "id";
            tableName: "time_entries";
            dataType: "string";
            columnType: "PgText";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            isPrimaryKey: true;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {}>;
        gigId: import("drizzle-orm/pg-core").PgColumn<{
            name: "gig_id";
            tableName: "time_entries";
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
        briefId: import("drizzle-orm/pg-core").PgColumn<{
            name: "brief_id";
            tableName: "time_entries";
            dataType: "string";
            columnType: "PgText";
            data: string;
            driverParam: string;
            notNull: false;
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
            tableName: "time_entries";
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
        workDate: import("drizzle-orm/pg-core").PgColumn<{
            name: "work_date";
            tableName: "time_entries";
            dataType: "string";
            columnType: "PgDateString";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: undefined;
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {}>;
        startMinute: import("drizzle-orm/pg-core").PgColumn<{
            name: "start_minute";
            tableName: "time_entries";
            dataType: "number";
            columnType: "PgInteger";
            data: number;
            driverParam: string | number;
            notNull: false;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: undefined;
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {}>;
        endMinute: import("drizzle-orm/pg-core").PgColumn<{
            name: "end_minute";
            tableName: "time_entries";
            dataType: "number";
            columnType: "PgInteger";
            data: number;
            driverParam: string | number;
            notNull: false;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: undefined;
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {}>;
        breakMinutes: import("drizzle-orm/pg-core").PgColumn<{
            name: "break_minutes";
            tableName: "time_entries";
            dataType: "number";
            columnType: "PgInteger";
            data: number;
            driverParam: string | number;
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
        notes: import("drizzle-orm/pg-core").PgColumn<{
            name: "notes";
            tableName: "time_entries";
            dataType: "string";
            columnType: "PgText";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: true;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {}>;
        status: import("drizzle-orm/pg-core").PgColumn<{
            name: "status";
            tableName: "time_entries";
            dataType: "string";
            columnType: "PgText";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: true;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {}>;
        decidedByUserId: import("drizzle-orm/pg-core").PgColumn<{
            name: "decided_by_user_id";
            tableName: "time_entries";
            dataType: "string";
            columnType: "PgText";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {}>;
        decidedAt: import("drizzle-orm/pg-core").PgColumn<{
            name: "decided_at";
            tableName: "time_entries";
            dataType: "date";
            columnType: "PgTimestamp";
            data: Date;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: undefined;
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {}>;
        rejectionReason: import("drizzle-orm/pg-core").PgColumn<{
            name: "rejection_reason";
            tableName: "time_entries";
            dataType: "string";
            columnType: "PgText";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: true;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {}>;
        createdAt: import("drizzle-orm/pg-core").PgColumn<{
            name: "created_at";
            tableName: "time_entries";
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
            tableName: "time_entries";
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
export declare const insertTimeEntrySchema: z.ZodObject<{
    id: z.ZodString;
    freelancerUserId: z.ZodString;
    briefId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    notes: z.ZodOptional<z.ZodString>;
    status: z.ZodOptional<z.ZodString>;
    gigId: z.ZodString;
    workDate: z.ZodString;
    startMinute: z.ZodOptional<z.ZodNullable<z.ZodInt>>;
    endMinute: z.ZodOptional<z.ZodNullable<z.ZodInt>>;
    breakMinutes: z.ZodOptional<z.ZodInt>;
    decidedByUserId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    decidedAt: z.ZodOptional<z.ZodNullable<z.ZodDate>>;
    rejectionReason: z.ZodOptional<z.ZodString>;
}, {
    out: {};
    in: {};
}>;
export type InsertTimeEntry = z.infer<typeof insertTimeEntrySchema>;
export type TimeEntryRow = typeof timeEntriesTable.$inferSelect;
/** Canonical status values — kept in TypeScript (not a pg enum) so we can
 *  grow the set without a migration. The API validates against this. */
export declare const TIME_ENTRY_STATUSES: readonly ["draft", "submitted", "approved", "rejected", "locked"];
export type TimeEntryStatus = (typeof TIME_ENTRY_STATUSES)[number];
//# sourceMappingURL=timeEntries.d.ts.map