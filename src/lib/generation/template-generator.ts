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
        : `En ${language}, écris ce que tu dirais à quelqu’un pour lui raconter « ${title} » et donner ton avis, puis dis-le à voix haute.`,
      hints_fr: writing
        ? [
            "Commence par l’idée principale en une phrase.",
            "Ajoute un détail ou un exemple qui t’a marqué.",
            "Termine par ton avis, avec un connecteur de ton niveau.",
          ]
        : [
            "Écris comme tu parlerais : des phrases courtes, faciles à dire.",
            "Commence par ce qui t’a le plus surpris, puis donne ton avis.",
            "Garde des mots et des tournures que tu sais prononcer.",
          ],
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
