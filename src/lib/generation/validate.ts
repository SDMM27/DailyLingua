import {
  comprehensionQuestionSchema,
  expressionSchema,
  productionTaskSchema,
  type ComprehensionQuestion,
  type ExerciseSource,
  type Expression,
  type ProductionTask,
} from "@/lib/schemas/mission";
import type { Language } from "@/lib/schemas/common";
import {
  GENERATION_LIMITS,
  type CandidateContent,
  type GenerationRequest,
  type GenerationResult,
  type SessionRequest,
  type WireSession,
} from "@/lib/schemas/generation";
import { GenerationError } from "./errors";

export interface ValidatedSession {
  language: Language;
  content: CandidateContent;
  questions: ComprehensionQuestion[];
  expressions: Expression[];
  production: ProductionTask;
}

const L = GENERATION_LIMITS;

function invalid(message: string): GenerationError {
  return new GenerationError("invalid_output", message);
}

/** Whether every string is non-empty (already trimmed) and short enough to display. */
function usable(...texts: string[]): boolean {
  return texts.every((t) => t.length > 0 && t.length <= L.longText);
}

/**
 * Checks what the model returned for one language and maps it to the mission shapes. The model is
 * never trusted: unusable questions and expressions are dropped one by one (a partly good session
 * is better than none), the production mode comes from the request, ids are assigned here, and the
 * domain schemas have the last word. Throws `GenerationError("invalid_output")` when the session
 * cannot be used at all.
 */
export function validateGeneratedSession(
  wire: WireSession,
  request: SessionRequest,
  source: ExerciseSource,
): ValidatedSession {
  const { language } = request;
  if (wire.language !== language) {
    throw invalid(`langue inattendue : ${wire.language} (attendu : ${language})`);
  }
  const content = Number.isInteger(wire.candidateIndex) ? request.candidates[wire.candidateIndex] : undefined;
  if (!content) throw invalid(`candidateIndex hors limites : ${wire.candidateIndex}`);

  const questions: ComprehensionQuestion[] = [];
  for (const q of wire.questions) {
    if (questions.length >= L.questions.max) break;
    const prompt = q.prompt.trim();
    const explanation = q.explanation.trim();
    const options = q.options.map((o) => o.trim());
    const distinct = new Set(options.map((o) => o.toLowerCase()));
    if (!usable(prompt, explanation, ...options)) continue;
    if (options.length < L.options.min || options.length > L.options.max) continue;
    if (distinct.size !== options.length) continue;
    if (!Number.isInteger(q.answerIndex) || q.answerIndex < 0 || q.answerIndex >= options.length) continue;
    questions.push(
      comprehensionQuestionSchema.parse({
        id: `${language}-q${questions.length + 1}`,
        prompt,
        options,
        answerIndex: q.answerIndex,
        explanation,
      }),
    );
  }

  const expressions: Expression[] = [];
  const seen = new Set<string>();
  for (const e of wire.expressions) {
    if (expressions.length >= L.expressions.max) break;
    const text = e.text.trim();
    const translation = e.translation.trim();
    const example = e.example.trim();
    const note = e.note.trim();
    if (!usable(text, translation, example) || note.length > L.longText) continue;
    if (seen.has(text.toLowerCase())) continue;
    seen.add(text.toLowerCase());
    expressions.push(
      expressionSchema.parse({
        id: `${language}-e${expressions.length + 1}`,
        text,
        translation,
        example,
        note: note || undefined,
      }),
    );
  }
  if (source === "ai" && expressions.length === 0) throw invalid(`aucune expression exploitable (${language})`);

  const prompt = wire.production.prompt.trim();
  if (!usable(prompt)) throw invalid(`consigne de production inexploitable (${language})`);
  const hints = wire.production.hints
    .map((h) => h.trim())
    .filter((h) => usable(h))
    .slice(0, L.hints.max);
  const targetLength = wire.production.targetLength.trim();
  const production = productionTaskSchema.parse({
    mode: request.productionMode,
    prompt,
    hints,
    targetLength: targetLength && targetLength.length <= L.shortText ? targetLength : undefined,
  });

  return { language, content, questions, expressions, production };
}

/** One validated session per requested language, in request order. */
export function validateGeneratedMission(result: GenerationResult, request: GenerationRequest): ValidatedSession[] {
  const byLanguage = new Map<Language, WireSession>();
  for (const wire of result.sessions) {
    if (byLanguage.has(wire.language)) throw invalid(`langue en double : ${wire.language}`);
    byLanguage.set(wire.language, wire);
  }
  return request.sessions.map((session) => {
    const wire = byLanguage.get(session.language);
    if (!wire) throw invalid(`session manquante : ${session.language}`);
    return validateGeneratedSession(wire, session, result.source);
  });
}
