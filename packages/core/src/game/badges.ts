/**
 * Badges of real milestones (`j7-social.md` lot 2, catalogue `badges.v1`). Pure: the server hands in the facts it measured
 * and the badges already held, and gets back the new ones. A badge is final: a fact that goes down removes nothing.
 */
export const BADGE_CATALOG_VERSION = "badges.v1";

export const KNOWN_WORD_STABILITY_DAYS = 21;
export const WORD_THRESHOLDS = [100, 250, 500, 1000, 2000, 3000, 5000, 8000] as const;
export const READING_THRESHOLDS = [10, 50, 200] as const;
export const PRACTICE_HOURS_THRESHOLDS = [10, 50, 100, 500] as const;
export const REWRITE_TARGET = 50;
export const SHADOWING_TARGET = 100;

export const BADGE_SKILLS = ["reading", "listening", "writing", "speaking"] as const;
export type BadgeSkill = (typeof BADGE_SKILLS)[number];
/** Levels a skill badge exists for, with the start of their band on the `skill_estimate.level_value` scale. */
export const BADGE_LEVELS = [["A1", 1], ["A2", 2], ["B1", 3], ["B2", 4], ["C1", 5], ["C2", 6]] as const;

/** What was measured for one language. */
export interface LanguageBadgeFacts {
  language: string;
  /** Cards of the language with a stability of 21 days or more. */
  knownWords: number;
  /** Estimated level value per skill (only estimates that come from a test or from practice). */
  skillLevels: Partial<Record<BadgeSkill, number>>;
  /** Lines `reading.understood*`. */
  textsRead: number;
  /** Lines `reading.understood_well` (text understood at 90 % or more). */
  textsReadWell: number;
  /** Lines `dictation.sentence` worth 2 XP (95 % or more). */
  dictationsHigh: number;
  /** Lines `rewrite.sentence*`. */
  rewrites: number;
  /** Lines `shadowing.sentence`. */
  shadowings: number;
  /** Lines `roleplay.completed`. */
  roleplays: number;
}

export interface BadgeFacts {
  languages: readonly LanguageBadgeFacts[];
  /** Verified practice, all languages together: sum of the completed sessions (each capped at 60 minutes). */
  practiceHours: number;
}

export interface BadgeKey {
  badgeId: string;
  language: string | null;
}

export interface BadgeAward extends BadgeKey {
  meta: Record<string, unknown>;
}

const keyOf = (badge: BadgeKey) => `${badge.badgeId}|${badge.language ?? ""}`;

function candidates(facts: BadgeFacts): BadgeAward[] {
  const out: BadgeAward[] = [];
  const add = (badgeId: string, language: string | null, meta: Record<string, unknown> = {}) => out.push({ badgeId, language, meta });
  for (const lang of facts.languages) {
    for (const threshold of WORD_THRESHOLDS) if (lang.knownWords >= threshold) add(`words_${threshold}`, lang.language, { value: lang.knownWords });
    for (const skill of BADGE_SKILLS) {
      const value = lang.skillLevels[skill];
      if (value === undefined) continue;
      for (const [level, from] of BADGE_LEVELS) if (value >= from) add(`level_${skill}_${level.toLowerCase()}`, lang.language, { value });
    }
    if (lang.textsReadWell >= 1) add("reading_first_well", lang.language);
    for (const threshold of READING_THRESHOLDS) if (lang.textsRead >= threshold) add(`reading_${threshold}`, lang.language, { value: lang.textsRead });
    if (lang.dictationsHigh >= 1) add("dictation_first_high", lang.language);
    if (lang.rewrites >= REWRITE_TARGET) add("rewrite_50", lang.language, { value: lang.rewrites });
    if (lang.shadowings >= SHADOWING_TARGET) add("shadowing_100", lang.language, { value: lang.shadowings });
    if (lang.roleplays >= 1) add("roleplay_first", lang.language);
  }
  for (const threshold of PRACTICE_HOURS_THRESHOLDS) if (facts.practiceHours >= threshold) add(`practice_${threshold}h`, null, { value: Math.floor(facts.practiceHours) });
  return out;
}

/** The badges the facts earn that are not held yet. Idempotent: what is already held is never returned again. */
export function awardBadges(facts: BadgeFacts, already: readonly BadgeKey[]): BadgeAward[] {
  const held = new Set(already.map(keyOf));
  return candidates(facts).filter((badge) => !held.has(keyOf(badge)));
}

/** A numeric milestone still to reach: what the learner has and what the next badge asks. */
export interface NextStep {
  family: "words" | "reading" | "rewrite" | "shadowing" | "practice";
  badgeId: string;
  current: number;
  target: number;
}

const nextOf = (value: number, thresholds: readonly number[]) => thresholds.find((threshold) => value < threshold);

/** The next numeric badge of each family for one language (practice hours are all languages). Complete families are left out. */
export function nextSteps(facts: LanguageBadgeFacts, practiceHours: number): NextStep[] {
  const steps: NextStep[] = [];
  const words = nextOf(facts.knownWords, WORD_THRESHOLDS);
  if (words !== undefined) steps.push({ family: "words", badgeId: `words_${words}`, current: facts.knownWords, target: words });
  const reading = nextOf(facts.textsRead, READING_THRESHOLDS);
  if (reading !== undefined) steps.push({ family: "reading", badgeId: `reading_${reading}`, current: facts.textsRead, target: reading });
  if (facts.rewrites < REWRITE_TARGET) steps.push({ family: "rewrite", badgeId: "rewrite_50", current: facts.rewrites, target: REWRITE_TARGET });
  if (facts.shadowings < SHADOWING_TARGET) steps.push({ family: "shadowing", badgeId: "shadowing_100", current: facts.shadowings, target: SHADOWING_TARGET });
  const practice = nextOf(practiceHours, PRACTICE_HOURS_THRESHOLDS);
  if (practice !== undefined) steps.push({ family: "practice", badgeId: `practice_${practice}h`, current: Math.floor(practiceHours), target: practice });
  return steps;
}
