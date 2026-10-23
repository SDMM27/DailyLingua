import type { CefrLevel } from "@/lib/schemas/common";

/**
 * Where a learner stands in a language, for what the app puts forward (phase K). `beginner` is
 * an A1 learner who cannot read the script yet; the others follow the CEFR level.
 */
export type PathStage = "beginner" | "basics" | "core" | "advanced";

/** The study modules the home page can put forward, beside the daily mission. */
export type PathModule = "alphabet" | "grammar" | "vocabulary" | "errors";

export interface LearningPath {
  /** Every module, most useful first: the order of their cards on the home page. */
  modules: readonly PathModule[];
  /**
   * Modules that get an invitation on the home page even with nothing to review (« Apprendre à
   * lire… », « Des fiches de ton niveau t’attendent »). The others show only when something is due.
   */
  invites: readonly PathModule[];
}

/**
 * The level → modules table. It changes what is put forward, not what exists: every module stays
 * reachable at every level.
 * - beginner: learn to read first, then the first structures.
 * - basics (A1–A2): grammar lessons and vocabulary.
 * - core (B1–B2): corrections of one's own texts first, then nuance grammar.
 * - advanced (C1–C2): vocabulary (register, collocations) and corrections; grammar is a reference,
 *   reviewed when due but no longer offered as lessons.
 */
export const LEARNING_PATHS: Record<PathStage, LearningPath> = {
  beginner: { modules: ["alphabet", "grammar", "vocabulary", "errors"], invites: ["alphabet", "grammar"] },
  basics: { modules: ["grammar", "vocabulary", "errors", "alphabet"], invites: ["grammar"] },
  core: { modules: ["errors", "grammar", "vocabulary", "alphabet"], invites: ["grammar"] },
  advanced: { modules: ["vocabulary", "errors", "grammar", "alphabet"], invites: [] },
};

/**
 * The stage of a learner in one language. `learningScript` is true when the language has an
 * alphabet module the learner has not completed (no card for some group); it only matters at A1.
 */
export function pathStage(level: CefrLevel, { learningScript }: { learningScript: boolean }): PathStage {
  switch (level) {
    case "A1":
      return learningScript ? "beginner" : "basics";
    case "A2":
      return "basics";
    case "B1":
    case "B2":
      return "core";
    case "C1":
    case "C2":
      return "advanced";
  }
}

/** Whether the home page invites a learner at this stage to a module with nothing due. */
export function pathInvites(stage: PathStage, module: PathModule): boolean {
  return LEARNING_PATHS[stage].invites.includes(module);
}
