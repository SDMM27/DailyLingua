import { readFile } from "node:fs/promises";
import { calibratePlacementItems, placementCoverage, placementObservations, PLACEMENT_THRESHOLDS } from "@dailylingua/core";
import { itBank, ruBank } from "@dailylingua/content/placement";
import { placementResultRowSchema } from "@dailylingua/schemas";
import { z } from "zod";

const [file, ...extra] = process.argv.slice(2);
const usage = "npm run --silent placement:calibrate -- <export.json>";
if (file === "--help" && extra.length === 0) {
  console.log(usage);
  process.exit(0);
}
if (!file || extra.length > 0) {
  console.error(usage);
  process.exit(1);
}

let input: unknown;
try {
  input = JSON.parse(await readFile(file, "utf8"));
} catch {
  console.error("Impossible de lire le fichier JSON.");
  process.exit(1);
}

// Either a bare array of rows or an object holding them in `rows` (output of `supabase db query`).
const rows = z.array(placementResultRowSchema).safeParse(
  typeof input === "object" && input !== null && !Array.isArray(input) && "rows" in input ? input.rows : input,
);
if (!rows.success) {
  console.error("Export invalide : attendu un tableau de lignes assessment_result (user_id, language, kind, taken_at, payload).");
  for (const issue of rows.error.issues) {
    const [index, ...fields] = issue.path;
    console.error(`${index === undefined ? "Racine" : `Ligne ${String(index)}`} : format invalide (${fields.map(String).join(".") || "valeur"})`);
  }
  process.exit(1);
}

const report = [ruBank, itBank].map((bank) => {
  const { observations, testsUsed, testsIgnored } = placementObservations(
    bank,
    rows.data.filter((row) => row.language === bank.language),
  );
  const calibration = calibratePlacementItems(bank.items, observations);
  return {
    language: bank.language,
    bankVersion: bank.version,
    coverage: placementCoverage(bank.items),
    testsUsed,
    testsIgnored,
    status: calibration.status,
    adaptive: calibration.adaptive,
    cells: calibration.cells,
    items: calibration.items.map(({ id, n, accounts, pCorrect, wilson95, calibrated }) => ({
      id, n, accounts, pCorrect, wilson95, calibrated,
    })),
  };
});
console.log(JSON.stringify({ version: 1, thresholds: PLACEMENT_THRESHOLDS, languages: report }, null, 2));
