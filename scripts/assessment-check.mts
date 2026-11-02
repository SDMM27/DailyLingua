/**
 * Checks assessment dossiers against the authoring rules that can be checked mechanically
 * (src/lib/assessment/AUTHORING.md). Usage: `npm run assessment:check -- [code...]`; without
 * argument, every language that has dossiers. Lists the dossiers not reviewed by a native speaker
 * and those without a recording, checks that the recorded files exist under public/, and checks the
 * pilot languages have their 6 levels.
 * Exits with 1 when a dossier is invalid or missing.
 */
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { checkAssessmentDossier } from "../src/lib/assessment/check-dossier";
import { ASSESSMENT_DOSSIERS, assessmentLanguages } from "../src/lib/assessment/dossiers";
import { CEFR_LEVELS, type Language } from "../src/lib/schemas/common";

/** Languages whose six levels must all be written. */
const PILOT_LANGUAGES: Language[] = ["ru", "it"];

const PUBLIC_DIR = fileURLToPath(new URL("../public", import.meta.url));

const args = process.argv.slice(2);
const codes = (args.length > 0 ? args : [...new Set([...PILOT_LANGUAGES, ...assessmentLanguages()])]) as Language[];
let failed = false;

for (const code of codes) {
  const dossiers = ASSESSMENT_DOSSIERS[code] ?? [];
  const problems: string[] = [];
  if (PILOT_LANGUAGES.includes(code)) {
    for (const level of CEFR_LEVELS) {
      if (!dossiers.some((d) => d.level === level)) problems.push(`no dossier for ${level}`);
    }
  }
  for (const dossier of dossiers) {
    for (const problem of checkAssessmentDossier(code, dossier.level, dossier)) problems.push(`${dossier.id}: ${problem}`);
    if (dossier.audio && !existsSync(`${PUBLIC_DIR}${dossier.audio.file}`)) problems.push(`${dossier.id}: audio file missing (public${dossier.audio.file})`);
  }
  if (problems.length === 0) {
    const unreviewed = dossiers.filter((d) => d.reviewedOn === null).map((d) => d.id);
    const silent = dossiers.filter((d) => d.audio === null).map((d) => d.id);
    const list = (ids: string[]) => (ids.length ? ` (${ids.join(", ")})` : "");
    console.log(`✓ ${code}: ${dossiers.length} dossiers, ${unreviewed.length} not reviewed${list(unreviewed)}, ${silent.length} without audio${list(silent)}`);
  } else {
    failed = true;
    console.log(`✗ ${code}:`);
    for (const problem of problems) console.log(`    ${problem}`);
  }
}

process.exit(failed ? 1 : 0);
