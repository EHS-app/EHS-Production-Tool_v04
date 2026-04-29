import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

// Resolve which Postgres URL to talk to. Preference order:
//   1. SUPABASE_DATABASE_URL — set by the operator when the app is
//      pointed at Supabase (current default for this project).
//   2. DATABASE_URL — the legacy / Replit-managed Helium Postgres URL.
//
// We accept either so the codebase doesn't care which provider hosts
// the database; the connection itself is just a Postgres URI in both
// cases. Supabase's direct-connection URL ("…supabase.co:5432/postgres")
// works with `pg.Pool` as-is. Supabase requires SSL — node-postgres
// negotiates it automatically when the URL ends with `?sslmode=require`,
// which the Supabase dashboard already includes.
const connectionString =
  process.env.SUPABASE_DATABASE_URL ?? process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "No Postgres connection string found. Set SUPABASE_DATABASE_URL (preferred) or DATABASE_URL.",
  );
}

export const pool = new Pool({ connectionString });
export const db = drizzle(pool, { schema });

export * from "./schema";
