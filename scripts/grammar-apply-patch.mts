/**
 * Applies the ChatGPT review of a grammar course (docs/reviews/grammar/<code>/chatgpt-patch.json):
 * patches the course, tags approved points with `aiReview`, bumps the course version, then
 * validates the result. Usage:
 * `npm run grammar:apply -- <code> --model "<model>" [--date YYYY-MM-DD] [--rubric x0-chatgpt-2026-11-10] [--dry-run]`.
 * Exits with 1 on id problems, failed patches or an invalid course.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { applyGrammarPatch, grammarPatchFileSchema } from "../src/lib/grammar/apply-patch";
import { checkGrammarCourse } from "../src/lib/grammar/check-course";
import { GRAMMAR_CURRICULUM } from "../src/lib/grammar/curriculum";

const DEFAULT_RUBRIC = "x0-chatgpt-2026-11-10";
const USAGE =
  'Usage: npm run grammar:apply -- <code> --model "<model>" [--date YYYY-MM-DD] [--rubric <rubric>] [--dry-run]';

function fail(message: string): never {
  console.error(`✗ ${message}`);
  process.exit(1);
}

const args = process.argv.slice(2);
let code: string | undefined;
let model: string | undefined;
let date: string | undefined;
let rubric = DEFAULT_RUBRIC;
let dryRun = false;
for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  if (arg === "--dry-run") dryRun = true;
  else if (arg === "--model") model = args[++i];
  else if (arg === "--date") date = args[++i];
  else if (arg === "--rubric") rubric = args[++i] ?? "";
  else if (arg.startsWith("--")) fail(`Unknown option ${arg}\n${USAGE}`);
  else if (code === undefined) code = arg;
  else fail(`Unexpected argument ${arg}\n${USAGE}`);
}
if (!code || !model) fail(USAGE);
if (!rubric) fail(`--rubric needs a value\n${USAGE}`);
date ??= new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris" }).format(new Date());
if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) fail(`Invalid date "${date}" (expected YYYY-MM-DD)`);

const curriculum = GRAMMAR_CURRICULUM[code];
if (!curriculum) fail(`No curriculum for "${code}"`);
const courseFile = fileURLToPath(new URL(`../src/lib/grammar/courses/${code}.ts`, import.meta.url));
const patchFile = fileURLToPath(new URL(`../docs/reviews/grammar/${code}/chatgpt-patch.json`, import.meta.url));
if (!existsSync(courseFile)) fail(`No course: ${courseFile}`);
if (!existsSync(patchFile)) fail(`No patch file: ${patchFile}`);

const parsed = grammarPatchFileSchema.safeParse(JSON.parse(readFileSync(patchFile, "utf8")));
if (!parsed.success) fail(`Invalid patch file:\n${parsed.error.issues.map((i) => `  ${i.path.join(".")}: ${i.message}`).join("\n")}`);
if (parsed.data.language !== code) fail(`Patch file is for "${parsed.data.language}", not "${code}"`);

const source = readFileSync(courseFile, "utf8").replace(/\r\n/g, "\n");
const result = applyGrammarPatch(source, parsed.data, { pointIds: curriculum.map((p) => p.id), date, model, rubric });

const truncate = (text: string) => {
  const flat = text.replace(/\s+/g, " ");
  return flat.length > 80 ? `${flat.slice(0, 80)}…` : flat;
};
console.log(`${code}: ${result.applied.length} patches applied, ${result.failed.length} failed`);
for (const { patch, reason } of result.failed) console.log(`  ✗ ${patch.id} [${reason}] ${truncate(patch.find)}`);
console.log(`  approved (${result.approved.length}): ${result.approved.join(", ")}`);
console.log(`  drafts (${result.drafts.length}): ${result.drafts.join(", ")}`);
for (const problem of result.problems) console.log(`  ✗ ${problem}`);

let failed = result.problems.length > 0 || result.failed.length > 0;

if (dryRun) {
  console.log("Dry run: nothing written.");
} else {
  writeFileSync(courseFile, result.text, "utf8");
  console.log(`Written: ${courseFile}`);
  const mod = (await import(`${pathToFileURL(courseFile).href}?t=${Date.now()}`)) as Record<string, unknown>;
  const problems = checkGrammarCourse(code, mod[`${code}Course`]);
  if (problems.length === 0) console.log(`✓ ${code}: course valid`);
  else {
    failed = true;
    console.log(`✗ ${code}: course invalid`);
    for (const problem of problems) console.log(`    ${problem}`);
  }
}

process.exit(failed ? 1 : 0);
