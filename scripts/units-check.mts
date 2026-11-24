/**
 * Checks the units of `@dailylingua/content` against the invariants of `j4-pr1-architecture.md` §1.3 and
 * prints one line per unit. Usage: `npm run units:check`. Exits with 1 on any violation.
 */
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { GRAMMAR_POINT_IDS, UNITS, checkUnit, grammarIdsFor, isPublished } from "@dailylingua/content";
import { isScriptUnit } from "@dailylingua/schemas";
import { ruAlphabet } from "../src/lib/alphabets/ru";
import { itCurriculum } from "../src/lib/grammar/curricula/it";
import { ruCurriculum } from "../src/lib/grammar/curricula/ru";

// Audio paths are public URLs ("/unit-audio/…"): they resolve against the public folder of the web app.
const PUBLIC_DIR = fileURLToPath(new URL("../apps/web/public", import.meta.url));
let failed = false;

// The copied list of A1 grammar ids must match the legacy curricula.
const curricula = { it: itCurriculum, ru: ruCurriculum };
for (const [language, entries] of Object.entries(curricula)) {
  const legacy = entries.filter((entry) => entry.level === "A1").map((entry) => entry.id).sort();
  const copied = [...(GRAMMAR_POINT_IDS[language] ?? [])].sort();
  if (JSON.stringify(legacy) !== JSON.stringify(copied)) {
    console.log(`✗ ${language}: grammar-points.ts differs from the curriculum (curriculum: ${legacy.join(", ")}; copied: ${copied.join(", ")})`);
    failed = true;
  }
}

// The alphabets writing units are checked against (legacy module, read only): letter -> Latin, by language.
const ruGroupCount = ruAlphabet.groups.length;
const alphabets: Record<string, { letters: { lower: string; latin: string }[] }> = { ru: ruAlphabet };
const letterLatinOf = (language: string): Record<string, string> | undefined => {
  const alphabet = alphabets[language];
  return alphabet ? Object.fromEntries(alphabet.letters.map((letter) => [letter.lower, letter.latin])) : undefined;
};

const units = Object.values(UNITS).sort((a, b) => a.id.localeCompare(b.id));
if (units.length === 0) {
  console.log("✗ no unit in the registry");
  failed = true;
}

// Letters taught by the writing units before `unit` (lower `order`, same language).
const lettersBefore = (language: string, order: number): string[] =>
  units.flatMap((other) => (isScriptUnit(other) && other.language === language && other.order < order ? other.letters.map((letter) => letter.lower) : []));

for (const unit of units) {
  const violations = checkUnit(unit, {
    grammarIds: grammarIdsFor(unit.language),
    audioExists: (path) => existsSync(`${PUBLIC_DIR}${path}`),
    knownLetters: lettersBefore(unit.language, unit.order),
    letterLatin: letterLatinOf(unit.language),
  });
  const content = isScriptUnit(unit)
    ? `${unit.letters.length} letters, ${unit.words.length} words`
    : `${unit.dialogue.glosses.filter((gloss) => gloss.isNew).length} new words`;
  const review = unit.aiReview ? `AI review ${unit.aiReview.reviewedOn} (${unit.aiReview.passes} passes), ${unit.status}` : unit.status;
  const published = isPublished(unit) ? "published" : "not published";
  const summary = `${unit.id} v${unit.version}: ${unit.items.length} items, ${content}, ${review}, ${published}`;
  // A draft may wait for its audio (generated locally with Piper); a published unit may not.
  const blocking = isPublished(unit) ? violations : violations.filter((violation) => violation.code !== "missing_audio");
  const pending = violations.length - blocking.length;
  if (blocking.length === 0) {
    console.log(`✓ ${summary}${pending > 0 ? ` (${pending} audio file(s) to generate before publishing)` : ""}`);
  } else {
    console.log(`✗ ${summary}`);
    for (const violation of blocking) console.log(`    - [${violation.code}] ${violation.message}`);
    failed = true;
  }
}

// The writing units of a language cover its whole alphabet, each letter once.
for (const [language, alphabet] of Object.entries(alphabets)) {
  const scripts = units.filter(isScriptUnit).filter((unit) => unit.language === language);
  if (scripts.length === 0) continue;
  const taught = scripts.flatMap((unit) => unit.letters.map((letter) => letter.lower));
  const expected = alphabet.letters.map((letter) => letter.lower);
  const twice = [...new Set(taught.filter((letter, index) => taught.indexOf(letter) !== index))];
  const outside = taught.filter((letter) => !expected.includes(letter));
  const missing = expected.filter((letter) => !taught.includes(letter));
  const problems = [
    ...(twice.length > 0 ? [`taught twice: ${twice.join(" ")}`] : []),
    ...(outside.length > 0 ? [`not in the alphabet: ${outside.join(" ")}`] : []),
  ];
  // Until every writing unit exists (5 for Russian: one per group of the legacy module) the rest is only reported.
  const complete = scripts.length >= ruGroupCount;
  if (complete && missing.length > 0) problems.push(`missing: ${missing.join(" ")}`);
  if (problems.length > 0) {
    console.log(`✗ ${language} alphabet: ${problems.join("; ")}`);
    failed = true;
  } else {
    console.log(`✓ ${language} alphabet: ${taught.length}/${expected.length} letters taught by ${scripts.length} writing unit(s)${complete ? "" : ` (${missing.length} to come)`}`);
  }
}

process.exit(failed ? 1 : 0);
