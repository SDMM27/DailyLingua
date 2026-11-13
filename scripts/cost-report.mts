/**
 * Spend on the model API for one month, by purpose and by model, from the `app.ai_call` log.
 * Read-only: it calls `app.ai_spend` (a read) and writes nothing.
 *
 *   npm run cost:report                      (current month, UTC)
 *   npm run cost:report -- --month 2026-11
 *
 * Needs NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (read from .env.local): `ai_spend` is
 * reserved to the service role. Does nothing without them. Exit code 0 when the report is printed,
 * 1 otherwise.
 */
import { parseArgs } from "node:util";
import { createClient } from "@supabase/supabase-js";

const { values } = parseArgs({ options: { month: { type: "string" } } });

function exit(message: string): never {
  console.error(message);
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) exit("NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont requis (voir .env.example).");

const month = values.month ?? new Date().toISOString().slice(0, 7);
const match = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(month);
if (!match) exit(`--month invalide : « ${month} » (attendu : AAAA-MM).`);
const year = Number(match[1]);
const monthIndex = Number(match[2]) - 1;
const from = new Date(Date.UTC(year, monthIndex, 1));
const to = new Date(Date.UTC(year, monthIndex + 1, 1));

interface SpendRow {
  purpose: string;
  model: string;
  calls: number | string;
  input_tokens: number | string;
  output_tokens: number | string;
  cost_usd: number | string;
}

const client = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
const { data, error } = await client
  .schema("app")
  .rpc("ai_spend", { p_from: from.toISOString(), p_to: to.toISOString() });
if (error) exit(`Lecture impossible (${error.code ?? "erreur"}).`);

const rows = ((data ?? []) as SpendRow[]).map((row) => ({
  purpose: row.purpose,
  model: row.model,
  calls: Number(row.calls),
  input: Number(row.input_tokens),
  output: Number(row.output_tokens),
  cost: Number(row.cost_usd),
}));

const total = rows.reduce(
  (sum, row) => ({
    calls: sum.calls + row.calls,
    input: sum.input + row.input,
    output: sum.output + row.output,
    cost: sum.cost + row.cost,
  }),
  { calls: 0, input: 0, output: 0, cost: 0 },
);

console.log(`Dépense API, ${month} (UTC)`);
if (rows.length === 0) {
  console.log("Aucun appel ce mois-ci.");
} else {
  console.table(
    [...rows, { purpose: "TOTAL", model: "", ...total }].map((row) => ({
      objet: row.purpose,
      modèle: row.model,
      appels: row.calls,
      "tokens entrée": row.input,
      "tokens sortie": row.output,
      "coût ($)": row.cost.toFixed(4),
    })),
  );
}
