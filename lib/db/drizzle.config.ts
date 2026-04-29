import { defineConfig } from "drizzle-kit";
import path from "path";

// Mirror the resolution order in `src/index.ts`: prefer the dedicated
// Supabase URL, fall back to the generic / Replit-managed DATABASE_URL.
// This way `drizzle-kit push` runs against whichever database the app
// is currently pointed at without needing two separate config files.
const connectionString =
  process.env.SUPABASE_DATABASE_URL ?? process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "No Postgres connection string found. Set SUPABASE_DATABASE_URL (preferred) or DATABASE_URL.",
  );
}

export default defineConfig({
  schema: path.join(__dirname, "./src/schema/index.ts"),
  dialect: "postgresql",
  dbCredentials: {
    url: connectionString,
  },
});
