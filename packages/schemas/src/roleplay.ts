import { z } from "zod";
import { cefrLevelSchema, cefrLevels, isoInstantSchema, languageCodeSchema, type CefrLevel } from "./common";

/**
 * The role play with bounded tasks (`j5-pr3-jeu-de-role.md`): what is stored in `app.roleplay`, what the model answers,
 * and what the routes send back. The scenarios themselves live in `@dailylingua/content`.
 */

export const ROLEPLAY_OBJECTIVES = 3;
/** Turns the learner may play in one game. */
export const MAX_ROLEPLAY_TURNS = 8;
/** Longest learner turn, in characters (typed or transcribed). */
export const MAX_ROLEPLAY_TURN_CHARS = 300;
/** `app.roleplay.turns` holds at most this many entries (the check of the table). */
export const MAX_STORED_ROLEPLAY_TURNS = 20;
/** Learner turns a game needs before `roleplay.completed` can pay (`j5-oral.md` decision 6). */
export const MIN_ROLEPLAY_TURNS_FOR_XP = 3;
/** An `active` game older than this is turned `abandoned` when it is read. */
export const ROLEPLAY_ABANDON_AFTER_MS = 24 * 3_600_000;
/** Corrections and better phrasings the review keeps. */
export const MAX_ROLEPLAY_REVIEW_ITEMS = 3;
/** Longest comment or explanation the review keeps, in characters. */
export const MAX_ROLEPLAY_NOTE_CHARS = 300;

export const roleplayScenarioIdSchema = z.string().regex(/^[a-z0-9-]{3,40}$/);
export const roleplayStatuses = ["active", "finished", "abandoned"] as const;
export const roleplayStatusSchema = z.enum(roleplayStatuses);
export type RoleplayStatus = z.infer<typeof roleplayStatusSchema>;

export const roleplayVias = ["typed", "speech"] as const;
export const roleplayViaSchema = z.enum(roleplayVias);
export type RoleplayVia = z.infer<typeof roleplayViaSchema>;

/** Three flags, one per objective of the scenario. */
export const objectivesMetSchema = z.tuple([z.boolean(), z.boolean(), z.boolean()]);
export type ObjectivesMet = z.infer<typeof objectivesMetSchema>;

/** A line of the conversation, as stored. The AI speaks the target language; `translation` is in the first language. */
export const roleplayTurnSchema = z.discriminatedUnion("role", [
  z.strictObject({
    role: z.literal("learner"),
    text: z.string().min(1).max(MAX_ROLEPLAY_TURN_CHARS),
    via: roleplayViaSchema,
    at: isoInstantSchema,
  }),
  z.strictObject({
    role: z.literal("ai"),
    text: z.string().min(1),
    translation: z.string(),
    at: isoInstantSchema,
  }),
]);
export type RoleplayTurn = z.infer<typeof roleplayTurnSchema>;

const note = z.string().max(MAX_ROLEPLAY_NOTE_CHARS);
const passage = z.string().min(1).max(MAX_ROLEPLAY_TURN_CHARS);

/** The review of a finished game, as stored in `app.roleplay.review` and sent to the client. */
export const roleplayReviewSchema = z.strictObject({
  objectives: z.tuple([
    z.strictObject({ met: z.boolean(), comment: note }),
    z.strictObject({ met: z.boolean(), comment: note }),
    z.strictObject({ met: z.boolean(), comment: note }),
  ]),
  errors: z.array(z.strictObject({ original: passage, corrected: passage, explanation: note })).max(MAX_ROLEPLAY_REVIEW_ITEMS),
  betterPhrasings: z.array(z.strictObject({ original: passage, natural: passage, explanation: note })).max(MAX_ROLEPLAY_REVIEW_ITEMS),
  /** Predominant language of what the learner wrote, an ISO 639 code; null when the model could not tell. */
  detectedLanguage: languageCodeSchema.nullable(),
});
export type RoleplayReview = z.infer<typeof roleplayReviewSchema>;

/** What the learner's client sees of a game. */
export const roleplayGameSchema = z.strictObject({
  id: z.uuid(),
  scenarioId: roleplayScenarioIdSchema,
  language: languageCodeSchema,
  level: cefrLevelSchema,
  status: roleplayStatusSchema,
  turns: z.array(roleplayTurnSchema).max(MAX_STORED_ROLEPLAY_TURNS),
  objectivesMet: objectivesMetSchema,
  /** Turns the learner has played, and the ones left (0 once the game is over: 8 turns or 3 objectives). */
  learnerTurns: z.number().int().min(0).max(MAX_ROLEPLAY_TURNS),
  turnsLeft: z.number().int().min(0).max(MAX_ROLEPLAY_TURNS),
  review: roleplayReviewSchema.nullable(),
  createdAt: isoInstantSchema,
  finishedAt: isoInstantSchema.nullable(),
});
export type RoleplayGame = z.infer<typeof roleplayGameSchema>;

// ---------------------------------------------------------------- model output

/** The model answers with a list of flags: its length is checked in code (a fixed-size array is not a JSON schema keyword it can rely on). */
const flags = z.array(z.boolean()).describe("One boolean per objective, in the order given: true once the learner has achieved it.");

export const roleplayOpeningOutputSchema = z.strictObject({
  reply: z.string().describe("The first thing the character says, in the studied language."),
  replyTranslation: z.string().describe("The same sentence in the learner's first language."),
});
export type RoleplayOpeningOutput = z.infer<typeof roleplayOpeningOutputSchema>;

export const roleplayTurnOutputSchema = z.strictObject({
  reply: z.string().describe("The character's answer, in the studied language."),
  replyTranslation: z.string().describe("The same answer in the learner's first language."),
  objectivesMet: flags,
});
export type RoleplayTurnOutput = z.infer<typeof roleplayTurnOutputSchema>;

export const roleplayReviewOutputSchema = z.strictObject({
  objectives: z.array(z.strictObject({
    met: z.boolean(),
    comment: z.string().describe("One short comment in the learner's first language."),
  })).describe("One entry per objective, in the order given."),
  errors: z.array(z.strictObject({
    original: z.string().describe("An exact quotation from one of the learner's turns."),
    corrected: z.string().describe("The same passage, corrected, in the studied language."),
    explanation: z.string().describe("Short explanation in the learner's first language."),
  })),
  betterPhrasings: z.array(z.strictObject({
    original: z.string().describe("An exact quotation from one of the learner's turns."),
    natural: z.string().describe("A more natural way to say it, in the studied language."),
    explanation: z.string().describe("Short explanation in the learner's first language."),
  })),
  detectedLanguage: z.string().describe("Predominant language of the learner's turns, an ISO 639 code, or 'und' for undetermined."),
});
export type RoleplayReviewOutput = z.infer<typeof roleplayReviewOutputSchema>;

// ---------------------------------------------------------------- routes

export const roleplayStartRequestSchema = z.strictObject({
  scenarioId: roleplayScenarioIdSchema,
  language: languageCodeSchema,
});
export type RoleplayStartRequest = z.infer<typeof roleplayStartRequestSchema>;

export const roleplayTurnRequestSchema = z.strictObject({
  text: z.string().trim().min(1).max(MAX_ROLEPLAY_TURN_CHARS),
  via: roleplayViaSchema,
});
export type RoleplayTurnRequest = z.infer<typeof roleplayTurnRequestSchema>;

/** Why a call is refused for quota: the day's game is played (`daily`), or the month's budget is spent (`budget`). */
export const roleplayLimitReasons = ["daily", "budget"] as const;

/**
 * The answer of the routes. `ready` carries the game (and the last reply of the character). The other statuses carry
 * nothing of the learner's text. `active_exists` and `game_over` give the game so the interface can resume it.
 */
export const roleplayResponseSchema = z.discriminatedUnion("status", [
  z.strictObject({
    status: z.literal("state"),
    /** The game in progress (an `active` one older than 24 h is already `abandoned` and not given here). */
    active: roleplayGameSchema.nullable(),
    /** The latest game started in the learner's current learning day, any status, or null. */
    today: roleplayGameSchema.nullable(),
    /** The game most recently finished this learning day, including one started the day before. */
    latestFinished: roleplayGameSchema.nullable(),
    /** XP recorded for latestFinished, or 0 before ingestion or when nothing was earned. */
    xp: z.number().int().nonnegative(),
    /** Level the scenarios are chosen for (the writing level of the language asked). */
    level: cefrLevelSchema,
    /** At most 3 scenarios fit for that level, rotated by learning day. */
    offered: z.array(roleplayScenarioIdSchema).max(3),
    /** A game can be started now: none in progress, none started today, the feature is on. */
    canStart: z.boolean(),
  }),
  z.strictObject({
    status: z.literal("ready"),
    game: roleplayGameSchema,
    reply: z.strictObject({ text: z.string(), translation: z.string() }).nullable(),
  }),
  z.strictObject({ status: z.literal("active_exists"), game: roleplayGameSchema }),
  z.strictObject({ status: z.literal("game_over"), game: roleplayGameSchema }),
  z.strictObject({ status: z.literal("limit"), reason: z.enum(roleplayLimitReasons) }),
  z.strictObject({ status: z.literal("invalid_scenario") }),
  z.strictObject({ status: z.literal("invalid_turn") }),
  z.strictObject({ status: z.literal("not_found") }),
  z.strictObject({ status: z.literal("disabled") }),
  z.strictObject({ status: z.literal("failed") }),
  z.strictObject({ status: z.literal("unavailable") }),
  z.strictObject({ status: z.literal("unauthenticated") }),
  z.strictObject({ status: z.literal("forbidden") }),
]);
export type RoleplayResponse = z.infer<typeof roleplayResponseSchema>;

// ---------------------------------------------------------------- scenarios

/** Longest situation, in characters, per language. */
export const MAX_ROLEPLAY_SITUATION_CHARS = 200;
const l10n = z.strictObject({ fr: z.string().min(1), en: z.string().min(1) });
const levelIndex = (level: CefrLevel) => cefrLevels.indexOf(level);

/**
 * A scenario of the role play: curated, independent of the target language (the AI plays it in the studied language),
 * written in the two languages the interface speaks. Three concrete objectives, each checkable in one reply.
 */
export const roleplayScenarioSchema = z.strictObject({
  id: roleplayScenarioIdSchema,
  minLevel: cefrLevelSchema,
  maxLevel: cefrLevelSchema,
  title: l10n,
  situation: z.strictObject({
    fr: z.string().min(1).max(MAX_ROLEPLAY_SITUATION_CHARS),
    en: z.string().min(1).max(MAX_ROLEPLAY_SITUATION_CHARS),
  }),
  aiRole: l10n,
  learnerRole: l10n,
  objectives: z.tuple([l10n, l10n, l10n]),
}).refine((scenario) => levelIndex(scenario.minLevel) <= levelIndex(scenario.maxLevel), {
  message: "minLevel must not be above maxLevel",
  path: ["maxLevel"],
});
export type RoleplayScenario = z.infer<typeof roleplayScenarioSchema>;
