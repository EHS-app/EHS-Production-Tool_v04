import { execFileSync } from "node:child_process";
import { mkdirSync, readdirSync, statSync, unlinkSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const RETAIN = 10;
const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const BACKUPS_DIR = join(REPO_ROOT, "backups");

function pad(n: number): string {
  return n.toString().padStart(2, "0");
}

function timestamp(): string {
  const d = new Date();
  return (
    `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}` +
    `-${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}`
  );
}

function pruneOldBackups(): void {
  const entries = readdirSync(BACKUPS_DIR)
    .filter((f) => /^db-\d{4}-\d{2}-\d{2}-\d{6}\.sql\.gz$/.test(f))
    .map((f) => ({ f, t: statSync(join(BACKUPS_DIR, f)).mtimeMs }))
    .sort((a, b) => b.t - a.t);
  for (const { f } of entries.slice(RETAIN)) {
    unlinkSync(join(BACKUPS_DIR, f));
    console.log(`pruned old backup: ${f}`);
  }
}

function main(): void {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL is not set");
    process.exit(1);
  }
  mkdirSync(BACKUPS_DIR, { recursive: true });

  const outFile = join(BACKUPS_DIR, `db-${timestamp()}.sql.gz`);
  console.log(`creating backup: ${outFile}`);

  execFileSync(
    "sh",
    [
      "-c",
      `pg_dump --no-owner --no-privileges --clean --if-exists "$DATABASE_URL" | gzip -9 > "${outFile}"`,
    ],
    { stdio: "inherit", env: { ...process.env, DATABASE_URL: url } },
  );

  const sizeMb = (statSync(outFile).size / 1024 / 1024).toFixed(2);
  console.log(`backup complete: ${outFile} (${sizeMb} MB)`);

  pruneOldBackups();
}

main();
