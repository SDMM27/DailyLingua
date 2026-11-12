/**
 * Runs the data migration public -> app and checks that nothing was lost, on the LOCAL database only.
 *
 *   npm run migration:verify
 *
 * Calls app.migrate_user for every profile, one user (one transaction) at a time, then
 * app.verify_migration() (both reserved to service_role), prints the report and exits with 1 when a user
 * failed or verify_migration returns a row. A user who is active in the new app is skipped by the
 * migration and not checked. Refuses any URL that is not 127.0.0.1, localhost or [::1], and any proxy
 * variable: running the migration on a hosted project is a decision of the owner, never a side effect of
 * this script.
 *
 * Needs NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (read from .env.local, or from
 * `supabase status -o env` of the local stack).
 */
import { createClient } from "@supabase/supabase-js";

const LOCAL_HOSTS = new Set(["127.0.0.1", "localhost", "[::1]"]);
const PAGE = 500;

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
// With Node >= 24 and NODE_USE_ENV_PROXY=1 a proxy variable could redirect the "local" request elsewhere.
const proxy = ["HTTP_PROXY", "HTTPS_PROXY", "http_proxy", "https_proxy", "ALL_PROXY", "all_proxy"].find(
  (name) => process.env[name],
);
if (proxy) {
  console.error(`Refus : la variable ${proxy} est définie ; retirez-la pour lancer migration:verify.`);
  process.exit(1);
}

const options = { auth: { persistSession: false, autoRefreshToken: false } };
const publicClient = createClient(url, serviceKey, options);
const app = createClient(url, serviceKey, { ...options, db: { schema: "app" } });

// The users, page by page (a response is capped by PostgREST).
const userIds: string[] = [];
for (let from = 0; ; from += PAGE) {
  const page = await publicClient
    .from("profiles")
    .select("id")
    .order("id")
    .range(from, from + PAGE - 1);
  if (page.error) {
    console.error("Lecture des profils impossible :", page.error.message);
    process.exit(1);
  }
  userIds.push(...page.data.map((row) => row.id));
  if (page.data.length < PAGE) break;
}

const totals: Record<string, number> = {};
const errors: { user_id: string; message: string }[] = [];
let skipped = 0;
for (const id of userIds) {
  const result = await app.rpc("migrate_user", { p_user_id: id });
  if (result.error) {
    errors.push({ user_id: id, message: result.error.message });
    continue;
  }
  const report = result.data as Record<string, number | string>;
  if (report.skipped) {
    skipped += 1;
    continue;
  }
  for (const [key, value] of Object.entries(report)) totals[key] = (totals[key] ?? 0) + Number(value);
}
console.log(`Reprise : ${userIds.length} utilisateur(s), ${skipped} déjà actif(s) dans la nouvelle app (ignorés).`);
console.log("Lignes écrites par table (créées, _updated, _deleted) :");
console.log(JSON.stringify(totals, null, 2));
if (errors.length > 0) {
  console.error(`\n${errors.length} utilisateur(s) en erreur :`);
  console.table(errors);
}

const verification = await app.rpc("verify_migration");
if (verification.error) {
  console.error("verify_migration a échoué :", verification.error.message);
  process.exit(1);
}
const gaps = (verification.data ?? []) as { user_id: string; check_name: string; expected: string; actual: string }[];
if (gaps.length > 0) {
  console.error(`\n${gaps.length} écart(s) :`);
  console.table(gaps);
}
if (errors.length > 0 || gaps.length > 0) process.exit(1);
console.log("\nverify_migration : zéro écart.");
