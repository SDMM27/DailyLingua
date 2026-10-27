import { sourceTraits, type SourceTraits } from "@/lib/content/source-traits";
import { coveragePenalty, coverageTarget, lexicalCoverage, type FrequencyRanks } from "@/lib/domain/frequency";
import type { CandidateContent } from "@/lib/schemas/generation";
import { CEFR_LEVELS, type CefrLevel, type ContentType, type Language } from "@/lib/schemas/common";
import type { DifficultyMode } from "@/lib/schemas/preferences";

const MS_PER_DAY = 86_400_000;
const MAX_AGE_DAYS = 14;
/** Points off a source made for learners (explained in French or English, or for children), at A1–A2. */
const LEARNER_SOURCE_BONUS = 3;

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
  /**
   * Word frequencies of the language: at A1–A2, the vocabulary of the title and teaser is part of
   * the score. Absent, or at B1 and above, nothing changes.
   */
  frequency?: { language: Language; ranks: FrequencyRanks };
  /** Traits of a source from its key; default: the catalogue. */
  traitsOf?: (sourceKey: string | null | undefined) => SourceTraits;
}

/** A source made for learners: explained in French or English, or for children. */
function isLearnerSource({ instructionLanguage, audience }: SourceTraits): boolean {
  return instructionLanguage === "fr" || instructionLanguage === "en" || audience === "children";
}

/**
 * Orders candidates best first. Pure and deterministic, so the same inputs always give the same
 * request. Score (lower is better): level fit weighs most, then type preference, then whether the
 * content fits in the time, then freshness (capped, so an old but well-fitting content still wins).
 * At A1–A2 two more terms, both under one CEFR level (10 points) so the level keeps priority: up to
 * 6 points when the words of the title and teaser are less frequent than the target, and a bonus
 * for sources made for learners.
 */
export function rankCandidates(candidates: CandidateContent[], options: RankOptions): CandidateContent[] {
  const wanted = CEFR_LEVELS.indexOf(targetLevel(options.level, options.difficulty));
  const types = new Set(options.contentTypes);
  const target = options.frequency ? coverageTarget(options.frequency.language, options.level) : null;
  const traitsOf = options.traitsOf ?? sourceTraits;

  function publishedMs(candidate: CandidateContent): number | null {
    return candidate.publishedAt ? new Date(candidate.publishedAt).getTime() : null;
  }

  function ageDays(candidate: CandidateContent): number {
    const published = publishedMs(candidate);
    if (published === null) return MAX_AGE_DAYS;
    return Math.min(MAX_AGE_DAYS, Math.max(0, (options.now.getTime() - published) / MS_PER_DAY));
  }

  /** Vocabulary terms of the score (A1–A2 only). */
  function learnerFit(candidate: CandidateContent): number {
    if (!options.frequency || !target) return 0;
    const coverage = lexicalCoverage(options.frequency.language, `${candidate.title}. ${candidate.summary}`, options.frequency.ranks, target.top);
    return coveragePenalty(coverage, target) - (isLearnerSource(traitsOf(candidate.sourceKey)) ? LEARNER_SOURCE_BONUS : 0);
  }

  function score(candidate: CandidateContent): number {
    return (
      learnerFit(candidate) +
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
