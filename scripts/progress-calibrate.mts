import { readFile } from "node:fs/promises";
import { calibrateReading } from "@dailylingua/core";
import { readingCalibrationSampleSchema } from "@dailylingua/schemas";

const [file, ...extra] = process.argv.slice(2);
const usage = "npm run --silent progress:calibrate -- <paires.json>";
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

const sample = readingCalibrationSampleSchema.safeParse(input);
if (!sample.success) {
  console.error("Paires de calibrage invalides. Vérifie le format décrit dans la fiche du jalon 6.");
  for (const issue of sample.error.issues) {
    const [index, ...fields] = issue.path;
    const location = index === undefined ? "Racine" : `Entrée ${index}`;
    const problem = issue.code === "custom" ? issue.message : `Format invalide (${fields.join(".") || "valeur"})`;
    console.error(`${location} : ${problem}`);
  }
  process.exit(1);
}
console.log(JSON.stringify({ version: 1, reading: calibrateReading(sample.data) }, null, 2));
