import type { CandidateContent } from "@/lib/schemas/generation";
import { CEFR_LEVELS, type CefrLevel, type ContentType } from "@/lib/schemas/common";
import type { DifficultyMode } from "@/lib/schemas/preferences";

const MS_PER_DAY = 86_400_000;
const MAX_AGE_DAYS = 14;

/** Level the content should have: one below (comfortable), the same (matched) or above (challenge). */
export function targetLevel(level: CefrLevel, mode: DifficultyMode): CefrLevel {
  const offset = mode === "comfortable" ? -1 : mode === "challenge" ? 1 : 0;
  const index = CEFR_LEVELS.indexOf(level) + offset;
  return CEFR_LEVELS[Math.min(CEFR_LEVELS.length - 1, Math.max(0, index))];
}

export interface RankOptions {
  level: CefrLevel;
  difficulty: DifficultyMode;
  contentTypes: ContentType[];
  /** Time available for this language today. */
  minutes: number;
  excludeIds: ReadonlySet<string>;
  now: Date;
  /** Default 5. */
  limit?: number;
}

/**
 * Orders candidates best first. Pure and deterministic, so the same inputs always give the same
 * request. Score (lower is better): level fit weighs most, then type preference, then whether the
 * content fits in the time, then freshness (capped, so an old but well-fitting content still wins).
 */
export function rankCandidates(candidates: CandidateContent[], options: RankOptions): CandidateContent[] {
  const wanted = CEFR_LEVELS.indexOf(targetLevel(options.level, options.difficulty));
  const types = new Set(options.contentTypes);

  function publishedMs(candidate: CandidateContent): number | null {
    return candidate.publishedAt ? new Date(candidate.publishedAt).getTime() : null;
  }

  function ageDays(candidate: CandidateContent): number {
    const published = publishedMs(candidate);
    if (published === null) return MAX_AGE_DAYS;
    return Math.min(MAX_AGE_DAYS, Math.max(0, (options.now.getTime() - published) / MS_PER_DAY));
  }

  function score(candidate: CandidateContent): number {
    return (
      10 * Math.abs(CEFR_LEVELS.indexOf(candidate.difficulty) - wanted) +
      (types.has(candidate.type) ? 0 : 6) +
      (candidate.durationMinutes > options.minutes * 0.6 ? 4 : 0) +
      ageDays(candidate)
    );
  }

  return candidates
    .filter((c) => !options.excludeIds.has(c.id))
    .map((candidate) => ({ candidate, score: score(candidate), published: publishedMs(candidate) ?? -Infinity }))
    .sort((a, b) => {
      if (a.score !== b.score) return a.score - b.score;
      if (a.published !== b.published) return a.published > b.published ? -1 : 1;
      return a.candidate.id < b.candidate.id ? -1 : a.candidate.id > b.candidate.id ? 1 : 0;
    })
    .slice(0, options.limit ?? 5)
    .map((entry) => entry.candidate);
}
