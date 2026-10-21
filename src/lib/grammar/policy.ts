import type { Language } from "@/lib/schemas/common";
import type { GrammarPoint } from "@/lib/schemas/grammar";
import { GRAMMAR_COURSES, grammarLanguages } from "./courses";

export type GrammarDraftPolicy = "show" | "hide";

/**
 * GRAMMAR_DRAFTS: "show" or "hide" the points no native speaker has approved yet
 * (`reviewedOn === null`). Defaults to "hide" in production (`VERCEL_ENV`), "show" elsewhere. A
 * wrong value fails loudly rather than silently showing drafts.
 */
export function readGrammarDraftPolicy(source: Record<string, string | undefined> = process.env): GrammarDraftPolicy {
  const raw = source.GRAMMAR_DRAFTS?.trim();
  if (!raw) return source.VERCEL_ENV === "production" ? "hide" : "show";
  if (raw === "show" || raw === "hide") return raw;
  throw new Error(`GRAMMAR_DRAFTS invalide : « ${raw} » (valeurs : show, hide).`);
}

export function isGrammarPointVisible(point: GrammarPoint, policy: GrammarDraftPolicy): boolean {
  return policy === "show" || point.reviewedOn !== null;
}

/** The points of a language the learner may see, in teaching order. */
export function visibleGrammarPoints(language: Language, policy: GrammarDraftPolicy): GrammarPoint[] {
  return (GRAMMAR_COURSES[language]?.points ?? []).filter((p) => isGrammarPointVisible(p, policy));
}

/** A visible point with the language of its course, or undefined (unknown id, or a draft hidden by the policy). */
export function findVisibleGrammarPoint(
  id: string,
  policy: GrammarDraftPolicy,
): { language: Language; point: GrammarPoint } | undefined {
  for (const language of grammarLanguages()) {
    const point = GRAMMAR_COURSES[language]?.points.find((p) => p.id === id);
    if (point) return isGrammarPointVisible(point, policy) ? { language, point } : undefined;
  }
  return undefined;
}
