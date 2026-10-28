/**
 * Calibration of the writing review against a fixed set of texts (good, fair, very weak, traps):
 * calls the model for each one and checks that the scores follow the expected quality.
 *
 *   npm run feedback:eval
 *   npm run feedback:eval -- --runs 3        (each text 3 times, to see the variance)
 *   npm run feedback:eval -- --model claude-sonnet-5-5
 *   npm run feedback:eval -- --effort low
 *
 * Needs ANTHROPIC_API_KEY (read from .env.local). Costs a few cents at most with Haiku.
 * Exit code 0 when every case is in its band and, per language, good > fair > very weak.
 */
import { parseArgs } from "node:util";
import { readWritingFeedbackConfig } from "@/lib/generation/config";
import { createClaudeWritingReviewer } from "@/lib/generation/writing-feedback";
import { EVAL_CASES, EXPECTED_BANDS, type ExpectedQuality } from "@/lib/generation/writing-feedback-eval-set";
import { WRITING_CRITERIA, type WritingFeedback } from "@/lib/schemas/writing-feedback";

const { values } = parseArgs({
  options: {
    runs: { type: "string", default: "1" },
    model: { type: "string" },
    effort: { type: "string", default: "medium" },
  },
});

const config = readWritingFeedbackConfig();
if (!config.enabled) {
  console.error("ANTHROPIC_API_KEY (ou ANTHROPIC_API_KEY_FALLBACK) est requis (voir .env.example), et WRITING_FEEDBACK ne doit pas valoir off.");
  process.exit(1);
}
const runs = Math.max(1, Number.parseInt(values.runs ?? "1", 10) || 1);
const model = values.model ?? config.model;
const effort = values.effort === "low" ? "low" : "medium";
const reviewer = createClaudeWritingReviewer({ apiKeys: config.apiKeys, model, effort, timeoutMs: 60_000 });

const mean = (feedback: WritingFeedback) =>
  WRITING_CRITERIA.reduce((sum, c) => sum + feedback.scores[c].score, 0) / WRITING_CRITERIA.length;

const failures: string[] = [];
const means = new Map<string, Partial<Record<ExpectedQuality, number[]>>>();
let inputTokens = 0;
let outputTokens = 0;

console.log(`Modèle : ${model} (effort ${effort}) · ${EVAL_CASES.length} textes × ${runs}\n`);
console.log("cas                  attendu    G V R C  moy.  corr.  verdict");

for (const evalCase of EVAL_CASES) {
  for (let run = 0; run < runs; run++) {
    const label = `${evalCase.id}${runs > 1 ? ` #${run + 1}` : ""}`.padEnd(20);
    try {
      const review = await reviewer.review(evalCase.request);
      inputTokens += review.usage.inputTokens;
      outputTokens += review.usage.outputTokens;
      const { feedback } = review;
      const m = mean(feedback);
      const band = EXPECTED_BANDS[evalCase.expected];
      const problems = [
        m < band.minMean || m > band.maxMean ? `moyenne hors [${band.minMean}; ${band.maxMean}]` : null,
        feedback.corrections.length < (evalCase.minCorrections ?? band.minCorrections)
          ? `moins de ${evalCase.minCorrections ?? band.minCorrections} corrections`
          : null,
        feedback.nativeVersion ? null : "pas de version native",
        feedback.corrections.every((c) => c.category) ? null : "correction sans catégorie",
      ].filter(Boolean);
      if (problems.length > 0) failures.push(`${evalCase.id} : ${problems.join(", ")}`);

      if (!evalCase.trap) {
        const byQuality = means.get(evalCase.request.language) ?? {};
        (byQuality[evalCase.expected] ??= []).push(m);
        means.set(evalCase.request.language, byQuality);
      }

      const scores = WRITING_CRITERIA.map((c) => feedback.scores[c].score).join(" ");
      console.log(
        `${label} ${evalCase.expected.padEnd(10)} ${scores}  ${m.toFixed(2)}  ${String(feedback.corrections.length).padStart(5)}  ${problems.length ? "ÉCHEC" : "ok"}`,
      );
    } catch (error) {
      failures.push(`${evalCase.id} : ${error instanceof Error ? error.message : "erreur"}`);
      console.log(`${label} ${evalCase.expected.padEnd(10)} — erreur : ${error instanceof Error ? error.message : error}`);
    }
  }
}

// Per language, the order of the qualities must hold on average.
const avg = (xs: number[] | undefined) => (xs && xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : NaN);
for (const [language, byQuality] of means) {
  const [good, fair, weak] = [avg(byQuality.good), avg(byQuality.fair), avg(byQuality["very-weak"])];
  if (!(good > fair && fair > weak)) {
    failures.push(`${language} : ordre non respecté (bon ${good.toFixed(2)}, moyen ${fair.toFixed(2)}, faible ${weak.toFixed(2)})`);
  }
}

console.log(`\nJetons : ${inputTokens} en entrée, ${outputTokens} en sortie.`);
if (failures.length > 0) {
  console.log(`\n${failures.length} problème(s) :\n- ${failures.join("\n- ")}`);
  process.exit(1);
}
console.log("\nToutes les notes suivent le niveau attendu.");
