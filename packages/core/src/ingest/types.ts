import type { CardKind, CardState, CefrLevel, DateKey, ExerciseKind, IngestPayload, LanguageCode, OralSentence, ReviewMode, RingTier, SessionFormat, SessionKind, Unit, UnitLessonId } from "@dailylingua/schemas";
import type { RejectedDelivery } from "../offline/types";
import type { SettingChange } from "../game/settings";
import type { TimeZoneChange } from "../game/attribution";
import type { PlanStep } from "../session/plan";
import type { StreakEvent } from "../game/streak";

/**
 * What `packages/data` reads in the database for `planIngest`, restricted to what the batch touches (the sessions,
 * items, cards, corrections, productions and days the events refer to), plus the whole journal of learning days,
 * settings and time zones (the streak is recomputed from it). Instants are ISO 8601 strings, days `YYYY-MM-DD`.
 * Records are keyed by id (days by `YYYY-MM-DD`). Plain JSON: it can be cloned and compared.
 */
export interface IngestState {
  userId: string;
  profile: {
    /** Zone of the profile before this batch: the one SQL uses to compute the server day. */
    timeZone: string;
    createdAt: string;
    /** Writing level per target language (minimum length of a production); absent: B1. */
    writingLevels: Record<string, CefrLevel>;
    answerTolerance: "strict" | "lenient";
    /** Ring tier when `ring.tier` was never set: the duration of the learner's session. */
    defaultRingTier: RingTier;
    /** Language the backs of unit cards are written in: the native language when it is fr or en, else en. */
    explanationLanguage: "fr" | "en";
    /** Languages the learner is enrolled in (active enrollments): the oral workshop only takes sentences of these. */
    enrolledLanguages: string[];
  };
  sessions: Record<string, StateSession>;
  items: Record<string, StateItem>;
  texts: Record<string, StateText>;
  cards: Record<string, StateCard>;
  corrections: Record<string, StateCorrection>;
  productions: Record<string, StateProduction>;
  /**
   * Counters of each day the events touch, by day of the ACTION (`meta.occurredDay` of the XP lines, not the day
   * they are written on). They are derived from `xp_ledger`, `review_log`, `attempt` and `text_read`.
   */
  days: Record<DateKey, StateDay>;
  /** Every `learning_day` row of the user. */
  learningDays: Record<DateKey, StateLearningDay>;
  settingChanges: SettingChange[];
  timezoneChanges: TimeZoneChange[];
  deviceCursors: Record<string, { lastSeq: number; lastDay: DateKey }>;
  /** `streak_state` as stored, or null for an account without one. */
  streak: { timeZoneChangedAt: string | null } | null;
  /** Texts the learner has read (`text_read`). */
  textReads: string[];
  /** Days on which a `catch_up` session was completed. */
  catchUpDays: DateKey[];
  /** `client_event_id` already ingested; the fingerprint, when known, tells a replay from a conflicting reuse. */
  knownEvents: Record<string, string | null>;
  /** `language|kind|front` of the learner's cards, lower-cased, to avoid creating a duplicate. */
  cardFronts: string[];
  /** Results of `rewrite_check`, by the `clientEventId` of the rewrite, computed by the caller before the ingestion. */
  rewriteChecks: Record<string, { fixedErrorIds: string[] }>;
  /** Accepted sentence indices already recorded for the referenced corrections. */
  verifiedSentences?: Record<string, number[]>;
  /** Texts of the last 30 productions of the learner (similarity check). */
  recentProductionTexts: { id: string; text: string }[];
  /** `unit_progress` of the units the batch refers to, by unit id (absent: never touched). */
  unitProgress: Record<string, StateUnitProgress>;
  /**
   * Current content of the units the batch refers to, injected by the caller from `@dailylingua/content` (core never
   * imports content). A unit absent from here is `unknown_unit`.
   */
  units: Record<string, Unit>;
  /** Attempts already recorded on the items of those units (`attempt` rows of kind `unit_*`), any version, chronological. */
  unitAttempts: Record<string, StateUnitAttempt[]>;
  /** Test attempt ids of the batch already recorded (`unit_test.id`, any account): `duplicate_test_attempt`. */
  unitTestIds: string[];
  /**
   * Sentences of the oral workshop the batch refers to, by id (`<unitId>#<lineId>`), injected by the caller from
   * `@dailylingua/content` like `units`. A sentence absent from here is `unknown_sentence`. What was already paid today
   * is in `days[day].counted` (`oral:<activity>:<sentenceId>`) and `days[day].xpByReason`.
   */
  oralSentences: Record<string, OralSentence>;
  /**
   * The role plays the batch names (`roleplay_completed`), by id, injected by the caller from the learner's own rows
   * (`app.roleplay`): a game of another account is absent, hence `unknown_roleplay`. `paid` is true when
   * `roleplay.completed` was already earned for it (`xp_ledger.meta.ref`).
   */
  roleplays: Record<string, StateRoleplay>;
}

export interface StateRoleplay {
  id: string;
  language: string;
  /** Writing level the game was started at (CEFR): sets the words the learner must have written. */
  level: string;
  status: "active" | "finished" | "abandoned";
  /** The learner's turns, as stored: the server counts their words, not the client. */
  learnerTurns: string[];
  /** Language the review detected, or null. */
  detectedLanguage: string | null;
  paid: boolean;
}

export interface StateUnitProgress {
  /** Version of the unit the progress was last written with. */
  version: string;
  /** Validated steps, `<lesson>:<step>` → instant of the validation. */
  steps: Record<string, string>;
  bestScore: number | null;
  testAttempts: number;
  /** First time the test was passed; never cleared. */
  passedAt: string | null;
  passedVersion: string | null;
}

export interface StateUnitAttempt {
  lesson: UnitLessonId;
  itemId: string;
  try: number;
  correct: boolean;
  occurredAt: string;
  version: string;
}

export interface StateSession {
  /** The server's recall mode for each card handed out with this session. */
  servedCards?: Readonly<Record<string, ReviewMode>>;
  id: string;
  userId: string;
  language: LanguageCode;
  day: DateKey;
  kind: SessionKind;
  format: SessionFormat;
  status: "planned" | "started" | "completed" | "abandoned";
  /** When the packet was served, or null (nothing to compare an event with). */
  servedAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  /** Steps the session requires (the format's, the alternating one included). */
  requiredSteps: PlanStep[];
  wakeCardIds: string[];
  wakeBudgetMinutes: number;
  errorItemId: string | null;
  readingTextId: string | null;
  readingItemIds: string[];
  workshopItemIds: string[];
  /** Words of the momentum passage, or null for the whole text. */
  momentumWords: number | null;
  rewriteSentences: number;
  /** Evidence of each step, as stored in `session_step`. */
  steps: Partial<Record<PlanStep, { validatedAt: string | null; proof: Record<string, unknown> }>>;
}

export interface StateItem {
  id: string;
  language: LanguageCode;
  textId: string | null;
  kind: ExerciseKind;
  /** `mcq`: the id of the right option; other kinds: null. */
  answer: string | null;
  accept: string[];
  listeningOnly: boolean;
  origin: "text" | "error_of_day";
  /** `error_item.id` for an item made from an error. */
  errorItemId: string | null;
  reworkedDay: DateKey | null;
  errorOfDay?: { correctionId: string; createdDay: DateKey; recurring: boolean };
  /** The card a workshop word (or a failed error item) becomes. */
  card: { kind: CardKind; front: string; back: string | null; backLanguage: LanguageCode | null; context: string | null } | null;
}

export interface StateText {
  id: string;
  language: LanguageCode;
  wordCount: number;
  body: string;
  /** Day `reading.*` was last earned on this text, or null. */
  readingEarnedDay: DateKey | null;
  /** Words per minute of the previous pass, else of the first reading, or null. */
  referenceWpm: number | null;
}

export interface StateCard {
  /** Written answers are also needed if an earlier packet served this card in production mode. */
  productionAccept?: readonly string[];
  id: string;
  userId: string;
  language: LanguageCode;
  kind: CardKind;
  state: CardState;
  stability: number | null;
  difficulty: number | null;
  dueAt: string;
  lastReviewAt: string | null;
  reps: number;
  lapses: number;
  /** Day and rating of the last review, or null. */
  lastReview: { day: DateKey; rating: number } | null;
  /** The key to grade a review with. */
  optionId: string | null;
  accept: string[];
  /** When a packet that holds the card was served, or null. */
  servedAt: string | null;
}

export interface StateCorrection {
  id: string;
  productionId: string;
  sessionId: string | null;
  language: LanguageCode;
  detectedLanguage: string | null;
  /** The native version of the whole text, already given. */
  nativeVersion: string;
  sentences: { text: string; nativeText: string | null; errors: { id: string; original: string; corrected: string }[] }[];
}

export interface StateProduction {
  id: string;
  sessionId: string | null;
  language: LanguageCode;
  text: string;
  /** Learning day of the submission. */
  day: DateKey;
  late: boolean;
  /** `production.corrected` was settled (paid or refused with a reason). */
  settled: boolean;
  /** Older productions can still get feedback but the original submission cannot earn XP. */
  creditExpired?: boolean;
  correctionDeferred: boolean;
  initialSimilarity?: number;
  /** Time spent speaking: set for a spoken production only. */
  speakingMs?: number;
  feedbackEligible?: boolean;
  /** `client_event_id` of the submission, to name the production in reports. */
  clientEventId: string;
}

export interface StateDay {
  /** XP already counted, by rule. */
  xpByReason: Record<string, number>;
  reviewSuccesses: number;
  newCards: number;
  readingTexts: number;
  /** Rewards already paid, by rule paid by count. */
  rewards: Record<string, number>;
  /** Focus XP by session id, or by `unit:<unitId>:<lesson>` for the items of a unit lesson. */
  focusBySession: Record<string, number>;
  rewardsByCorrection: Record<string, number>;
  /** `review:<cardId>`, `focus1:<itemId>`, `focus2:<itemId>`, `focusWrong:<itemId>`, `reading:<textId>`, `rewrite:<correctionId>:<n>`, `errorItem:<id>`, `oral:<activity>:<sentenceId>`. */
  counted: string[];
}

export interface StateLearningDay {
  day: DateKey;
  timeZone: string;
  xpVerified: number;
  validated: boolean;
  cause: string;
  firstActivityAt: string | null;
}

/** A raw event as delivered: validated by `planIngest` against the strict schemas. */
export interface RawEvent {
  clientEventId: string;
  kind: string;
  payload: unknown;
  occurredAt: string;
}

export interface ZeroedXp {
  clientEventId: string;
  reason: string;
}

export interface IngestReport {
  accepted: number;
  /** Events already ingested: nothing is written for them. */
  duplicates: string[];
  /** Right answers that earned nothing, with the reason (`attempt.result.xpReason`, `xp_zeroed`). */
  zeroed: ZeroedXp[];
  /** Events received late (72 hours to 7 days): XP written on the reception day, out of ring and streak. */
  late: number;
  /** XP written for them. */
  lateXp: number;
  /** Events whose device clock went back by more than 2 minutes. */
  clockRollbacks: number;
  /** XP written by this batch, by rule. */
  xpByRule: Record<string, number>;
  /** Facts of the streak recomputed for the days from 3 days ago on. */
  streakEvents: StreakEvent[];
}

export interface PlanIngestResult {
  payload: IngestPayload;
  rejected: RejectedDelivery[];
  report: IngestReport;
  /**
   * The state once the payload is applied (the input is not modified). The caller does not need it: it lets tests
   * and callers chain batches without reading the database again.
   */
  nextState: IngestState;
}
