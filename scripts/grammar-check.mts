/**
 * Checks grammar courses against the authoring rules that can be checked mechanically
 * (src/lib/grammar/AUTHORING.md). Usage: `npm run grammar:check -- [code...]`; without argument,
 * every language of the curriculum. Counts the points reviewed by a native speaker or by AI, and
 * lists the drafts.
 * Exits with 1 when a course is missing or invalid.
 */
import { existsSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { checkGrammarCourse } from "../src/lib/grammar/check-course";
import { GRAMMAR_CURRICULUM } from "../src/lib/grammar/curriculum";
import { grammarReviewStatus, type GrammarReviewStatus } from "../src/lib/grammar/policy";
import type { GrammarCourse } from "../src/lib/schemas/grammar";

const codes = process.argv.slice(2).length > 0 ? process.argv.slice(2) : Object.keys(GRAMMAR_CURRICULUM);
let failed = false;

for (const code of codes) {
  const file = fileURLToPath(new URL(`../src/lib/grammar/courses/${code}.ts`, import.meta.url));
  if (!existsSync(file)) {
    console.log(`✗ ${code}: no course (${file})`);
    failed = true;
    continue;
  }
  const mod = (await import(pathToFileURL(file).href)) as Record<string, unknown>;
  const course = mod[`${code}Course`];
  const problems = checkGrammarCourse(code, course);
  if (problems.length === 0) {
    const points = (course as GrammarCourse).points;
    const status = points.map(grammarReviewStatus);
    const count = (s: GrammarReviewStatus) => status.filter((x) => x === s).length;
    const drafts = points.filter((_, i) => status[i] === "draft").map((p) => p.id);
    console.log(
      `✓ ${code}: ${points.length} points, ${count("native")} native-reviewed, ${count("ai")} AI-reviewed, ${drafts.length} drafts${drafts.length ? ` (${drafts.join(", ")})` : ""}`,
    );
  } else {
    failed = true;
    console.log(`✗ ${code}:`);
    for (const problem of problems) console.log(`    ${problem}`);
  }
}

process.exit(failed ? 1 : 0);
