/**
 * Monthly refonte report from an aggregate-only RPC. Use a local Supabase stack
 * or a copy served on loopback. No provider call or database write.
 */
import { parseArgs } from "node:util";
import { createClient } from "@supabase/supabase-js";
import { addDays, formatDriftReport } from "@dailylingua/core";
import type { AppDatabase } from "@dailylingua/data";
import { driftReportSchema } from "@dailylingua/schemas";
import { z } from "zod";

const { values } = parseArgs({ options: { month: { type: "string" }, drift: { type: "boolean" }, from: { type: "string" }, through: { type: "string" }, help: { type: "boolean" } } });
if (values.help) {
  console.log("npm run metrics:report -- [--month AAAA-MM] [--drift [--from AAAA-MM-JJ] [--through AAAA-MM-JJ]]");
  process.exit(0);
}

function exit(message: string): never {
  console.error(message);
  process.exit(1);
}

const month = values.month ?? new Date().toISOString().slice(0, 7);
if (!/^(?!0000)\d{4}-(0[1-9]|1[0-2])$/.test(month)) exit("Mois invalide. Format attendu AAAA-MM.");
const url = z.url({ protocol: /^https?$/ }).safeParse(process.env.NEXT_PUBLIC_SUPABASE_URL?.trim());
const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
if (!url.success || !key) exit("NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont requis.");
if (!["localhost", "127.0.0.1", "[::1]"].includes(new URL(url.data).hostname)) exit("Le rapport doit être exécuté sur une base locale ou une copie accessible en local.");

const ratio = z.object({ count: z.number().int().nonnegative(), total: z.number().int().nonnegative() });
const reportSchema = z.object({
  j1: ratio,
  j7: ratio,
  sessions: ratio,
  recall: ratio,
  rewrites: ratio,
  activeLearners: z.number().int().nonnegative(),
  costUsd: z.number().nonnegative(),
});

const client = createClient<AppDatabase>(url.data, key, { auth: { persistSession: false, autoRefreshToken: false } });
const { data, error } = await client.schema("app").rpc("metrics_report", { p_month: `${month}-01` });
if (error) exit(`Lecture impossible (${error.code || "erreur"}).`);
const result = reportSchema.safeParse(data);
if (!result.success) exit("Le rapport SQL a renvoyé des données illisibles.");
const stats = result.data;
const percent = new Intl.NumberFormat("fr", { style: "percent", maximumFractionDigits: 1 });
const usd = new Intl.NumberFormat("fr", { style: "currency", currency: "USD", maximumFractionDigits: 4 });

console.log(`Indicateurs de la refonte — ${month}`);
const rows = [
  ["Rétention J1", stats.j1],
  ["Rétention J7 à J9", stats.j7],
  ["Séances terminées", stats.sessions],
  ["Rappels FSRS réussis à partir de J+1", stats.recall],
  ["Corrections suivies d’une réécriture réussie", stats.rewrites],
] as const;
console.table(rows.map(([label, { count, total }]) => {
  return { indicateur: label, résultat: total > 0 ? percent.format(count / total) : "—", effectif: `${count} / ${total}` };
}));
console.log(`Apprenants actifs : ${stats.activeLearners}`);
console.log(`Coût IA total : ${usd.format(stats.costUsd)}`);
console.log(`Coût par apprenant actif : ${stats.activeLearners ? usd.format(stats.costUsd / stats.activeLearners) : "—"}`);

if (values.drift) {
  // Window of the drift section: the 28 days up to today (UTC) unless given.
  const day = /^\d{4}-\d{2}-\d{2}$/;
  const through = values.through ?? new Date().toISOString().slice(0, 10);
  const from = values.from ?? addDays(through, -27);
  if (!day.test(through) || !day.test(from) || from > through) exit("Fenêtre invalide. Format attendu AAAA-MM-JJ, --from avant --through.");
  const drift = await client.schema("app").rpc("drift_report", { p_from: from, p_through: through });
  if (drift.error) exit(`Lecture des dérives impossible (${drift.error.code || "erreur"}).`);
  const parsed = driftReportSchema.safeParse(drift.data);
  if (!parsed.success) exit("Le rapport des dérives a renvoyé des données illisibles.");
  console.log("");
  for (const line of formatDriftReport(parsed.data)) console.log(line);
}
