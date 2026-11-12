/**
 * Runs the data migration public -> app and checks that nothing was lost, on the LOCAL database only.
 *
 *   npm run migration:verify
 *
 * Calls app.migrate_all() then app.verify_migration() (both reserved to service_role), prints the
 * report and exits with 1 when verify_migration returns a row. Refuses any URL that is not
 * 127.0.0.1, localhost or [::1]: running the migration on a hosted project is a decision of the
 * owner, never a side effect of this script.
 *
 * Needs NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (read from .env.local, or from
 * `supabase status -o env` of the local stack).
 */
import { createClient } from "@supabase/supabase-js";

const LOCAL_HOSTS = new Set(["127.0.0.1", "localhost", "[::1]"]);

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error("NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont requis (base locale).");
  process.exit(1);
}

let host: string;
try {
  host = new URL(url).hostname;
} catch {
  console.error("NEXT_PUBLIC_SUPABASE_URL n'est pas une URL valide.");
  process.exit(1);
}
if (!LOCAL_HOSTS.has(host)) {
  console.error(
    `Refus : migration:verify ne s'exécute que sur la base locale (127.0.0.1 ou localhost), pas sur « ${host} ».`,
  );
  process.exit(1);
}

const app = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
  db: { schema: "app" },
});

const migration = await app.rpc("migrate_all");
if (migration.error) {
  console.error("migrate_all a échoué :", migration.error.message);
  process.exit(1);
}
console.log("Reprise (lignes créées par table) :");
console.log(JSON.stringify(migration.data, null, 2));

const verification = await app.rpc("verify_migration");
if (verification.error) {
  console.error("verify_migration a échoué :", verification.error.message);
  process.exit(1);
}
const gaps = (verification.data ?? []) as { user_id: string; check_name: string; expected: string; actual: string }[];
if (gaps.length > 0) {
  console.error(`\n${gaps.length} écart(s) :`);
  console.table(gaps);
  process.exit(1);
}
console.log("\nverify_migration : zéro écart.");
