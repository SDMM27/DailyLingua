import type { Language } from "@/lib/schemas/common";
import type { GrammarPoint } from "@/lib/schemas/grammar";
import { readDraftPolicy, type DraftPolicy } from "@/lib/draft-policy";
import { GRAMMAR_COURSES, grammarLanguages } from "./courses";

export type GrammarDraftPolicy = DraftPolicy;

/**
 * GRAMMAR_DRAFTS: "show" or "hide" the draft points, i.e. neither approved by a native
 * speaker (`reviewedOn`) nor reviewed by AI (`aiReview`). Defaults to "hide" in production (`VERCEL_ENV`), "show" elsewhere. A
 * wrong value fails loudly rather than silently showing drafts.
 */
export function readGrammarDraftPolicy(source: Record<string, string | undefined> = process.env): GrammarDraftPolicy {
  return readDraftPolicy("GRAMMAR_DRAFTS", source);
}

export type GrammarReviewStatus = "native" | "ai" | "draft";

/** Native speaker approval wins over the AI review; neither = draft. */
export function grammarReviewStatus(point: GrammarPoint): GrammarReviewStatus {
  if (point.reviewedOn !== null) return "native";
  return point.aiReview ? "ai" : "draft";
}

/** Under "hide", only the drafts are hidden (native and AI-reviewed points stay visible). */
export function isGrammarPointVisible(point: GrammarPoint, policy: GrammarDraftPolicy): boolean {
  return policy === "show" || grammarReviewStatus(point) !== "draft";
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
