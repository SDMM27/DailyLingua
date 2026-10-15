/**
 * Checks placement question banks against the authoring rules that can be checked mechanically
 * (src/lib/placement/banks/AUTHORING.md). Usage: `npm run placement:check -- [code...]`; without
 * argument, every language of the registry. Exits with 1 when a bank is missing or invalid.
 */
import { existsSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { LANGUAGE_CODES } from "../src/lib/domain/languages";
import { CEFR_LEVELS } from "../src/lib/schemas/common";
import { checkPlacementBank } from "../src/lib/placement/check-bank";

const codes = process.argv.slice(2).length > 0 ? process.argv.slice(2) : [...LANGUAGE_CODES];
let failed = false;

for (const code of codes) {
  const file = fileURLToPath(new URL(`../src/lib/placement/banks/${code}.ts`, import.meta.url));
  if (!existsSync(file)) {
    console.log(`✗ ${code}: no bank (${file})`);
    failed = true;
    continue;
  }
  const mod = (await import(pathToFileURL(file).href)) as Record<string, unknown>;
  const problems = checkPlacementBank(code, mod[`${code}Bank`]);
  if (problems.length === 0) {
    console.log(`✓ ${code}: ${CEFR_LEVELS.length * 3 * 2} questions`);
  } else {
    failed = true;
    console.log(`✗ ${code}:`);
    for (const problem of problems) console.log(`    ${problem}`);
  }
}

process.exit(failed ? 1 : 0);
