import { z } from "zod/v4";
/** Per-venue learning memory for the Drawing Analyzer. We key on a
 *  normalised venue name (lower-cased, whitespace-collapsed) so users
 *  who type "Sentrum  Scene" and "sentrum scene" end up sharing one
 *  memory entry. The original display name is kept on `venueName` so
 *  we can show it back in the UI. `data` is a free-form JSON blob —
 *  the shape is defined by the analyzer client and is intentionally
 *  loose so we can evolve the memory format without DB migrations. */
export declare const venueMemoryTable: import("drizzle-orm/pg-core").PgTableWithColumns<{
    name: "venue_memory";
    schema: undefined;
    columns: {
        id: import("drizzle-orm/pg-core").PgColumn<{
            name: "id";
            tableName: "venue_memory";
            dataType: "number";
            columnType: "PgSerial";
            data: number;
            driverParam: number;
            notNull: true;
            hasDefault: true;
            isPrimaryKey: true;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: undefined;
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {}>;
        userId: import("drizzle-orm/pg-core").PgColumn<{
            name: "user_id";
            tableName: "venue_memory";
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
        venueName: import("drizzle-orm/pg-core").PgColumn<{
            name: "venue_name";
            tableName: "venue_memory";
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
        venueKey: import("drizzle-orm/pg-core").PgColumn<{
            name: "venue_key";
            tableName: "venue_memory";
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
        data: import("drizzle-orm/pg-core").PgColumn<{
            name: "data";
            tableName: "venue_memory";
            dataType: "json";
            columnType: "PgJsonb";
            data: unknown;
            driverParam: unknown;
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
            tableName: "venue_memory";
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
            tableName: "venue_memory";
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
export declare const insertVenueMemorySchema: z.ZodObject<{
    userId: z.ZodString;
    venueName: z.ZodString;
    venueKey: z.ZodString;
    data: z.ZodOptional<z.ZodType<import("drizzle-zod").Json, unknown, z.core.$ZodTypeInternals<import("drizzle-zod").Json, unknown>>>;
}, {
    out: {};
    in: {};
}>;
export type InsertVenueMemory = z.infer<typeof insertVenueMemorySchema>;
export type VenueMemoryRow = typeof venueMemoryTable.$inferSelect;
//# sourceMappingURL=venueMemory.d.ts.map