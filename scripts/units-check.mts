/**
 * Checks the units of `@dailylingua/content` against the invariants of `j4-pr1-architecture.md` §1.3 and
 * prints one line per unit. Usage: `npm run units:check`. Exits with 1 on any violation.
 */
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { GRAMMAR_POINT_IDS, UNITS, checkUnit, grammarIdsFor, isPublished } from "@dailylingua/content";
import { itCurriculum } from "../src/lib/grammar/curricula/it";
import { ruCurriculum } from "../src/lib/grammar/curricula/ru";

const AUDIO_DIR = fileURLToPath(new URL("../apps/web/public/unit-audio/", import.meta.url));
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

const units = Object.values(UNITS).sort((a, b) => a.id.localeCompare(b.id));
if (units.length === 0) {
  console.log("✗ no unit in the registry");
  failed = true;
}

for (const unit of units) {
  const violations = checkUnit(unit, {
    grammarIds: grammarIdsFor(unit.language),
    audioExists: (path) => existsSync(`${AUDIO_DIR}${path}`),
  });
  const newWords = unit.dialogue.glosses.filter((gloss) => gloss.isNew).length;
  const review = unit.aiReview ? `AI review ${unit.aiReview.reviewedOn} (${unit.aiReview.passes} passes), ${unit.status}` : unit.status;
  const published = isPublished(unit) ? "published" : "not published";
  const summary = `${unit.id} v${unit.version}: ${unit.items.length} items, ${newWords} new words, ${review}, ${published}`;
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

process.exit(failed ? 1 : 0);
