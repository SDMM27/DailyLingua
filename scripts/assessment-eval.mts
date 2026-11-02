/**
 * Calibration of the assessment grading against hand-labelled answers (right in French, right in
 * the studied language, with mistakes, partial, wrong, vague, off topic, injection, texts of known
 * quality): calls the model once per case and compares the verdicts with the expected ones.
 *
 *   npm run assessment:eval
 *   npm run assessment:eval -- --runs 3        (each case 3 times, to see the variance)
 *   npm run assessment:eval -- --model claude-sonnet-5-5
 *   npm run assessment:eval -- --effort low
 *
 * Needs ANTHROPIC_API_KEY (read from .env.local). Costs a few cents at most with Haiku.
 * Exit code 0 when there is no serious error (a wrong answer marked correct, or the opposite; a
 * good text scored as very weak, or the opposite) and at least 85 % of the checks agree.
 */
import { parseArgs } from "node:util";
import { createClaudeAssessmentGrader } from "@/lib/generation/assessment-grading";
import { EVAL_CASES, WRITING_BANDS, buildEvalRequest } from "@/lib/generation/assessment-eval-set";
import { readAssessmentGradingConfig } from "@/lib/generation/config";
import { ASSESSMENT_WRITING_CRITERIA } from "@/lib/schemas/assessment";

const MIN_AGREEMENT = 0.85;

const { values } = parseArgs({
  options: {
    runs: { type: "string", default: "1" },
    model: { type: "string" },
    effort: { type: "string", default: "medium" },
  },
});

const config = readAssessmentGradingConfig();
if (!config.enabled) {
  console.error("ANTHROPIC_API_KEY (ou ANTHROPIC_API_KEY_FALLBACK) est requis (voir .env.example), et ASSESSMENT_GRADING ne doit pas valoir off.");
  process.exit(1);
}
const runs = Math.max(1, Number.parseInt(values.runs ?? "1", 10) || 1);
const model = values.model ?? config.model;
const effort = values.effort === "low" ? "low" : "medium";
const grader = createClaudeAssessmentGrader({ apiKeys: config.apiKeys, model, effort, timeoutMs: 60_000 });

let checks = 0;
let agreements = 0;
const serious: string[] = [];
const disagreements: string[] = [];
const errors: string[] = [];
let inputTokens = 0;
let outputTokens = 0;

console.log(`Modèle : ${model} (effort ${effort}) · ${EVAL_CASES.length} cas × ${runs}\n`);

for (const evalCase of EVAL_CASES) {
  for (let run = 0; run < runs; run++) {
    const label = `${evalCase.id}${runs > 1 ? ` #${run + 1}` : ""}`;
    const expectedCount = Object.keys(evalCase.expected).length + (evalCase.writing ? 1 : 0);
    try {
      const grade = await grader.grade(buildEvalRequest(evalCase));
      inputTokens += grade.usage.inputTokens;
      outputTokens += grade.usage.outputTokens;

      for (const [id, expected] of Object.entries(evalCase.expected)) {
        const got = grade.review.questions[id].verdict;
        checks++;
        const opposite = (expected === "wrong" && got === "correct") || (expected === "correct" && got === "wrong");
        if (got === expected) agreements++;
        else if (opposite) serious.push(`${label} ${id} : attendu ${expected}, obtenu ${got}`);
        else disagreements.push(`${label} ${id} : attendu ${expected}, obtenu ${got}`);
        console.log(`${label.padEnd(26)} ${id.padEnd(14)} attendu ${expected.padEnd(8)} obtenu ${got.padEnd(8)} ${got === expected ? "ok" : opposite ? "GRAVE" : "écart"}`);
      }

      if (evalCase.writing) {
        const band = WRITING_BANDS[evalCase.writing.expected];
        const scores = grade.review.writing?.scores;
        checks++;
        if (!scores) {
          disagreements.push(`${label} écrit : pas de note`);
          console.log(`${label.padEnd(26)} écrit          attendu ${evalCase.writing.expected.padEnd(11)} pas de note écart`);
        } else {
          const mean = ASSESSMENT_WRITING_CRITERIA.reduce((sum, c) => sum + scores[c], 0) / ASSESSMENT_WRITING_CRITERIA.length;
          const inBand = mean >= band.minMean && mean <= band.maxMean && (band.maxAdequacy === undefined || scores.adequacy <= band.maxAdequacy);
          // A good text scored very weak, or a telegraphic / French text scored well.
          const grave =
            (evalCase.writing.expected === "good" && mean <= 2) ||
            ((evalCase.writing.expected === "telegraphic" || evalCase.writing.expected === "french") && mean >= 3.75);
          if (inBand) agreements++;
          else if (grave) serious.push(`${label} écrit : attendu ${evalCase.writing.expected}, moyenne ${mean.toFixed(2)}`);
          else disagreements.push(`${label} écrit : attendu ${evalCase.writing.expected}, moyenne ${mean.toFixed(2)}`);
          const detail = ASSESSMENT_WRITING_CRITERIA.map((c) => scores[c]).join(" ");
          console.log(`${label.padEnd(26)} écrit          attendu ${evalCase.writing.expected.padEnd(11)} ${detail} (moy. ${mean.toFixed(2)}) ${inBand ? "ok" : grave ? "GRAVE" : "écart"}`);
        }
      }
    } catch (error) {
      checks += expectedCount;
      const message = error instanceof Error ? error.message : "erreur";
      errors.push(`${label} : ${message}`);
      console.log(`${label.padEnd(26)} — erreur : ${message}`);
    }
  }
}

const agreement = checks > 0 ? agreements / checks : 0;
console.log(`\nAccord exact : ${agreements}/${checks} (${(agreement * 100).toFixed(0)} %) · erreurs graves : ${serious.length} · erreurs d’appel : ${errors.length}`);
console.log(`Jetons : ${inputTokens} en entrée, ${outputTokens} en sortie.`);
for (const [title, list] of [["Erreurs graves", serious], ["Écarts", disagreements], ["Appels en erreur", errors]] as const) {
  if (list.length > 0) console.log(`\n${title} :\n- ${list.join("\n- ")}`);
}

if (serious.length > 0 || agreement < MIN_AGREEMENT) {
  console.log(`\nÉchec : ${serious.length > 0 ? "erreur(s) grave(s)" : `accord inférieur à ${MIN_AGREEMENT * 100} %`}.`);
  process.exit(1);
}
console.log("\nAccord suffisant, aucune erreur grave.");
