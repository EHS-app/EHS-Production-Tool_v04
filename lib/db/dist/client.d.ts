import type { PoolClient } from "pg";
import * as schema from "./schema";
export type { PoolClient };
export declare const pool: import("pg").Pool;
export declare const db: import("drizzle-orm/node-postgres").NodePgDatabase<typeof schema> & {
    $client: import("pg").Pool;
};
//# sourceMappingURL=client.d.ts.map