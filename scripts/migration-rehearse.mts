/**
 * Rehearsal of the public -> app migration on a LOCAL database (milestone 8, steps R0 and R1).
 *
 *   npm run migration:rehearse -- [--db-url postgresql://...] [--apply] [--report file.md]
 *
 * Runs scripts/migration-rehearse.sql through psql: snapshot of public, migrate_all twice, verify_migration
 * after each pass, check that the second pass creates nothing and that public is byte-for-byte unchanged.
 * Dry run by default: everything happens in one transaction that is rolled back. `--apply` commits it (for a
 * throwaway copy only). Exits with 1 when a check fails.
 *
 * The database is DATABASE_URL or --db-url, default the local Supabase stack (127.0.0.1:54322). Refuses any
 * host that is not 127.0.0.1, localhost or [::1], and the libpq variables that could redirect the
 * connection: running this on the hosted project is a decision of the owner, never a side effect.
 */
import { spawnSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { checkLocalDatabaseUrl, formatRehearsalReport, parseRehearsalOutput } from "./migration-rehearse-lib.js";

const { values } = parseArgs({
  options: {
    "db-url": { type: "string" },
    apply: { type: "boolean", default: false },
    report: { type: "string" },
    help: { type: "boolean", default: false },
  },
});
if (values.help) {
  console.log("npm run migration:rehearse -- [--db-url postgresql://...] [--apply] [--report fichier.md]");
  process.exit(0);
}

const url = values["db-url"] ?? process.env.DATABASE_URL ?? "postgresql://postgres:postgres@127.0.0.1:54322/postgres";
const refusal = checkLocalDatabaseUrl(url, process.env);
if (refusal) {
  console.error(`Refus : ${refusal}`);
  process.exit(1);
}

const sql = fileURLToPath(new URL("./migration-rehearse.sql", import.meta.url));
const run = spawnSync("psql", ["-X", "-v", `apply=${values.apply ? 1 : 0}`, "-d", url, "-f", sql], { encoding: "utf8" });
if (run.error || run.status !== 0) {
  console.error("psql a échoué :", run.error?.message ?? run.stderr.trim());
  process.exit(1);
}

const checks = parseRehearsalOutput(run.stdout);
const report = formatRehearsalReport(checks, { apply: values.apply, host: new URL(url).host, at: new Date() });
console.log(report);
if (values.report) writeFileSync(values.report, report);
process.exit(checks.length > 0 && checks.every((check) => check.ok) ? 0 : 1);
