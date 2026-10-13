import { languageInfo } from "@/lib/domain/languages";
import type { ExerciseGenerator, SessionRequest, WireSession } from "@/lib/schemas/generation";

function templateSession(request: SessionRequest): WireSession {
  const title = request.candidates[0].title;
  const language = languageInfo(request.language).nameFr.toLowerCase();
  const writing = request.productionMode === "writing";
  return {
    language: request.language,
    candidateIndex: 0,
    // No model, so no translation and no fair questions: better none than invented ones.
    questions: [],
    expressions: [],
    production: {
      prompt: writing
        ? `En ${language}, résume en quelques phrases ce que tu as compris de « ${title} », puis donne ton avis.`
        : `En ${language}, raconte à voix haute ce que tu as compris de « ${title} », puis donne ton avis.`,
      hints: writing
        ? [
            "Commence par l’idée principale en une phrase.",
            "Ajoute un détail ou un exemple qui t’a marqué.",
            "Termine par ton avis, avec un connecteur de ton niveau.",
          ]
        : [
            "Prépare trois mots-clés, pas des phrases entières.",
            "Parle sans t’arrêter, même si tu cherches un mot.",
            "Réécoute-toi si possible et note ce qui a manqué.",
          ],
      targetLength: writing ? "80–120 mots" : "2 minutes",
    },
  };
}

/** Deterministic fallback: a production task from the first candidate, nothing else. */
export function createTemplateGenerator(): ExerciseGenerator {
  return {
    name: "template",
    async generate(request) {
      return {
        source: "template",
        model: "template",
        promptVersion: null,
        sessions: request.sessions.map(templateSession),
        usage: null,
      };
    },
  };
}
