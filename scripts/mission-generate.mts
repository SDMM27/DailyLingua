/**
 * Writes the mission of one user, like the app does when they open an empty mission screen.
 *
 *   npm run mission:generate -- --email moi@example.com
 *   npm run mission:generate -- --email moi@example.com --date 2026-10-14
 *   npm run mission:generate -- --email moi@example.com --template   (no model call)
 *   npm run mission:generate -- --email moi@example.com --replace    (local database only)
 *
 * Needs NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (read from .env.local), and
 * ANTHROPIC_API_KEY unless --template or MISSION_GENERATOR=template.
 * Exit code 0 when the mission is ready, 1 otherwise.
 */
import { parseArgs } from "node:util";
import { createClient } from "@supabase/supabase-js";
import { readContentLicensePolicy } from "@/lib/content/policy";
import { toDateKey } from "@/lib/domain/dates";
import { createClaudeGenerator } from "@/lib/generation/claude-generator";
import { readGenerationConfig } from "@/lib/generation/config";
import { generateMission } from "@/lib/generation/generate-mission";
import { createSupabaseMissionStore } from "@/lib/generation/supabase-store";
import { createTemplateGenerator } from "@/lib/generation/template-generator";
import { dateKeySchema } from "@/lib/schemas/common";
import type { Database } from "@/lib/supabase/database.types";

const { values } = parseArgs({
  options: {
    email: { type: "string" },
    date: { type: "string" },
    template: { type: "boolean", default: false },
    replace: { type: "boolean", default: false },
  },
});

function exit(message: string): never {
  console.error(message);
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) exit("NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont requis (voir .env.example).");
if (!values.email) exit("--email <adresse> est requis.");
const email = values.email.trim().toLowerCase();

const dateArg = values.date === undefined ? undefined : dateKeySchema.safeParse(values.date);
if (dateArg && !dateArg.success) exit("--date doit être au format AAAA-MM-JJ.");

if (values.replace && !["127.0.0.1", "localhost"].includes(new URL(url).hostname)) {
  exit("--replace supprime la mission du jour et la progression associée : réservé à la base locale (127.0.0.1 / localhost).");
}

const client = createClient<Database>(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

async function findUserId(address: string): Promise<string | null> {
  for (let page = 1; ; page++) {
    const { data, error } = await client.auth.admin.listUsers({ page, perPage: 200 });
    if (error) exit(`Supabase (utilisateurs) : ${error.message}`);
    const user = data.users.find((u) => u.email?.toLowerCase() === address);
    if (user) return user.id;
    if (data.users.length < 200) return null;
  }
}

const userId = await findUserId(email);
if (!userId) exit(`Aucun compte pour ${email}.`);

const { data: profile, error: profileError } = await client
  .from("profiles")
  .select("time_zone")
  .eq("id", userId)
  .single();
if (profileError) exit(`Supabase (profil) : ${profileError.message}`);
const date = dateArg?.success ? dateArg.data : toDateKey(new Date(), profile.time_zone);

if (values.replace) {
  const { error } = await client.from("missions").delete().eq("user_id", userId).eq("mission_date", date);
  if (error) exit(`Supabase (suppression) : ${error.message}`);
  console.log(`Mission du ${date} supprimée.`);
}

const config = values.template ? ({ provider: "template" } as const) : readGenerationConfig();
const generator =
  config.provider === "claude"
    ? createClaudeGenerator({ apiKey: config.apiKey, model: config.model })
    : createTemplateGenerator();
const store = createSupabaseMissionStore(client, { policy: readContentLicensePolicy() });

console.log(`Mission du ${date} pour ${email} (générateur : ${generator.name})…`);
const outcome = await generateMission({ userId, date, store, generator, log: console.warn });
console.log("Résultat :", outcome);
if (outcome.status !== "ready") process.exit(1);

const { data: mission, error } = await client
  .from("missions")
  .select("generation_meta, mission_sessions ( position, language, contents ( title, sources ( name ) ) )")
  .eq("id", outcome.missionId)
  .order("position", { referencedTable: "mission_sessions" })
  .single();
if (error) exit(`Supabase (mission) : ${error.message}`);

const meta = mission.generation_meta as Record<string, unknown>;
console.log("\nTrace de génération :");
console.table([
  {
    source: meta.source,
    modèle: meta.model,
    "tokens entrée": meta.inputTokens,
    "tokens sortie": meta.outputTokens,
    "durée (ms)": meta.durationMs,
    "repli (raison)": meta.fallbackReason,
  },
]);
console.log("Contenus choisis :");
for (const s of mission.mission_sessions) {
  console.log(`  [${s.language}] ${s.contents?.title ?? "?"} (${s.contents?.sources?.name ?? "?"})`);
}
process.exitCode = 0;
