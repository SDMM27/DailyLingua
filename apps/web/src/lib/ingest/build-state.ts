import {
  PLAN_STEPS,
  addDays,
  learningDay,
  valueToLevel,
  type IngestState,
  type PlanStep,
  type SettingChange,
  type StateCard,
  type StateItem,
  type StateProduction,
  type StateSession,
  type StateText,
  type StateUnitAttempt,
  type StateUnitProgress,
} from "@dailylingua/core";
import type { CardRow, IngestRows, ItemRow, SessionRow, SkillEstimateRow } from "@dailylingua/data";
import {
  cardKindSchema,
  exerciseKindSchema,
  gameSettingKeys,
  languageCodeSchema,
  sessionKindSchema,
  sessionFormatSchema,
  storedSessionPlanSchema,
  type CefrLevel,
  type DateKey,
  type IngestMemo,
  type OralSentence,
  type ReviewMode,
  type StoredSessionPlan,
  type Unit,
  unitLessonIdSchema,
} from "@dailylingua/schemas";
import { getOralSentence, getUnit } from "@dailylingua/content";
import { z } from "zod";
import { cardAcceptList, cardKeyForMode, expectedCardMode } from "./card-keys";
import { ringTierOfMinutes } from "./format";

/**
 * The `IngestState` `planIngest` decides on, built from the rows `readIngestRows` read and the memo
 * (`j2-pr1-lot-w.md` section 5). Pure: no clock, no store, nothing logged: what it had to leave out comes back in
 * `skippedSessions` for the caller to journal.
 */

/** The card an item becomes (a workshop word), as the generator writes it in `text_item.prompt.card`. */
const itemCardSchema = z.object({
  kind: cardKindSchema,
  front: z.string().min(1),
  back: z.string().nullable(),
  backLanguage: languageCodeSchema.nullable(),
  context: z.string().nullable(),
});

const PLAN_STEP_SET: ReadonlySet<string> = new Set(PLAN_STEPS);
const gameSettingKeySet: ReadonlySet<string> = new Set(gameSettingKeys);

export interface BuiltIngestState {
  state: IngestState;
  /** The mode each card of the state is expected to be answered in (`filterReviewModes`). */
  cardModes: Map<string, ReviewMode>;
  /** Sessions of the user whose stored plan could not be read: absent from the state. */
  skippedSessions: string[];
}

/** Descending order of two strings (days and instants sort as text). */
const compareDesc = (a: string, b: string): number => (a === b ? 0 : a < b ? 1 : -1);
const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);
const strings = (value: unknown): string[] => (Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : []);

/** Writing level per language: A0/A1 count as A2 and C2 as C1; the writing estimate, else the mean of the others. */
export function writingLevels(estimates: readonly SkillEstimateRow[]): Record<string, CefrLevel> {
  const byLanguage = new Map<string, { writing: number | null; others: number[] }>();
  for (const estimate of estimates) {
    const entry = byLanguage.get(estimate.language) ?? { writing: null, others: [] };
    if (estimate.skill === "writing") entry.writing = estimate.levelValue;
    else entry.others.push(estimate.levelValue);
    byLanguage.set(estimate.language, entry);
  }
  const levels: Record<string, CefrLevel> = {};
  for (const [language, entry] of byLanguage) {
    const value = entry.writing ?? (entry.others.length > 0 ? entry.others.reduce((a, b) => a + b, 0) / entry.others.length : null);
    if (value === null) continue;
    const level = valueToLevel(value);
    levels[language] = level === "A0" || level === "A1" ? "A2" : level === "C2" ? "C1" : level;
  }
  return levels;
}

function answerTolerance(gameSettings: unknown): "strict" | "lenient" {
  const accents = isRecord(gameSettings) && isRecord(gameSettings.answerTolerance) ? gameSettings.answerTolerance.accents : undefined;
  return accents === "strict" ? "strict" : "lenient";
}

/** A session of another learner: just enough for `planIngest` to answer `foreign_session` (nothing of its plan is read). */
function foreignSession(row: SessionRow): StateSession | null {
  const kind = sessionKindSchema.safeParse(row.kind);
  const format = sessionFormatSchema.safeParse(row.format);
  const language = languageCodeSchema.safeParse(row.language);
  if (!kind.success || !format.success || !language.success) return null;
  return {
    id: row.id,
    userId: row.userId,
    language: language.data,
    day: row.day,
    kind: kind.data,
    format: format.data,
    status: "planned",
    servedAt: null,
    startedAt: null,
    completedAt: null,
    requiredSteps: [],
    wakeCardIds: [],
    wakeBudgetMinutes: 0,
    errorItemId: null,
    readingTextId: null,
    readingItemIds: [],
    workshopItemIds: [],
    momentumWords: null,
    rewriteSentences: 0,
    steps: {},
  };
}

function ownSession(row: SessionRow, plan: StoredSessionPlan): StateSession | null {
  const kind = sessionKindSchema.safeParse(row.kind);
  const format = sessionFormatSchema.safeParse(row.format);
  const language = languageCodeSchema.safeParse(row.language);
  const status = z.enum(["planned", "started", "completed", "abandoned"]).safeParse(row.status);
  if (!kind.success || !format.success || !language.success || !status.success) return null;
  const steps: StateSession["steps"] = {};
  for (const step of row.steps) {
    if (!PLAN_STEP_SET.has(step.step)) continue;
    steps[step.step as PlanStep] = { validatedAt: step.validatedAt, proof: isRecord(step.proof) ? step.proof : {} };
  }
  return {
    id: row.id,
    userId: row.userId,
    language: language.data,
    day: row.day,
    kind: kind.data,
    format: format.data,
    status: status.data,
    servedAt: row.servedAt,
    startedAt: row.startedAt,
    completedAt: row.completedAt,
    requiredSteps: plan.requiredSteps,
    servedCards: plan.servedCards,
    wakeCardIds: plan.wake.cardIds,
    wakeBudgetMinutes: plan.wake.budgetMinutes,
    errorItemId: plan.wake.errorItemId,
    readingTextId: plan.reading.textId,
    readingItemIds: plan.reading.itemIds,
    workshopItemIds: plan.workshop.itemIds,
    momentumWords: plan.momentumWords,
    rewriteSentences: plan.rewriteSentences,
    steps,
  };
}

function stateItem(row: ItemRow, language: string): StateItem | null {
  const kind = exerciseKindSchema.safeParse(row.kind);
  const lang = languageCodeSchema.safeParse(language);
  if (!kind.success || !lang.success) return null;
  const key = row.key;
  const keyAnswer = key && typeof key.answer === "string" ? key.answer : null;
  const keyAccept = key ? strings(key.accept) : [];
  const card = isRecord(row.prompt) ? itemCardSchema.safeParse(row.prompt.card) : null;
  return {
    id: row.id,
    language: lang.data,
    textId: row.textId,
    kind: kind.data,
    // `mcq`: the id of the right option; the other kinds are graded against the written forms (the canonical answer is one).
    answer: kind.data === "mcq" ? keyAnswer : null,
    accept: kind.data === "mcq" ? [] : [...new Set([...(keyAnswer === null ? [] : [keyAnswer]), ...keyAccept])],
    listeningOnly: row.listeningOnly,
    origin: "text",
    errorItemId: null,
    reworkedDay: null,
    card: card?.success ? card.data : null,
  };
}

function stateCard(row: CardRow, timeZone: string, served: { mode: ReviewMode | undefined; servedAt: string | null }): { card: StateCard; mode: ReviewMode } | null {
  const kind = cardKindSchema.safeParse(row.kind);
  const language = languageCodeSchema.safeParse(row.language);
  const state = z.enum(["new", "learning", "review", "relearning", "suspended", "known"]).safeParse(row.state);
  if (!kind.success || !language.success || !state.success) return null;
  const mode = expectedCardMode(row, served.mode);
  const key = cardKeyForMode(row, mode);
  return {
    mode,
    card: {
      id: row.id,
      userId: row.userId,
      language: language.data,
      kind: kind.data,
      state: state.data,
      stability: row.stability,
      difficulty: row.difficulty,
      dueAt: row.dueAt,
      lastReviewAt: row.lastReviewAt,
      reps: row.reps,
      lapses: row.lapses,
      lastReview: row.lastReview ? { day: learningDay(new Date(row.lastReview.reviewedAt), timeZone), rating: row.lastReview.rating } : null,
      optionId: key.optionId,
      accept: key.accept,
      productionAccept: cardAcceptList(row),
      servedAt: served.servedAt,
    },
  };
}

/** The explanation language of unit cards: the native language when it is fr or en, else en. */
export function explanationLanguageOf(nativeLanguage: string | undefined): "fr" | "en" {
  return nativeLanguage === "fr" ? "fr" : "en";
}

/**
 * The unit part of the state: the current content of the units the events name (from `@dailylingua/content`, every
 * status: `planIngest` refuses the unpublished ones unless drafts are allowed), their stored progress and the attempts
 * on their items. A unit the registry does not know is left out (`unknown_unit`).
 */
function unitState(unitIds: readonly string[], rows: IngestRows): Pick<IngestState, "units" | "unitProgress" | "unitAttempts" | "unitTestIds"> {
  const units: Record<string, Unit> = {};
  for (const id of unitIds) {
    const unit = getUnit(id);
    if (unit) units[id] = unit;
  }
  const unitProgress: Record<string, StateUnitProgress> = {};
  for (const row of rows.unitProgress ?? []) {
    if (!units[row.unitId]) continue;
    unitProgress[row.unitId] = { version: row.version, steps: { ...row.steps }, bestScore: row.bestScore, testAttempts: row.testAttempts, passedAt: row.passedAt, passedVersion: row.passedVersion };
  }
  const unitAttempts: Record<string, StateUnitAttempt[]> = {};
  for (const row of rows.unitAttempts ?? []) {
    const lesson = unitLessonIdSchema.safeParse(row.lesson);
    if (!units[row.unitId] || !lesson.success) continue;
    (unitAttempts[row.unitId] ??= []).push({ lesson: lesson.data, itemId: row.itemId, try: row.try, correct: row.correct, occurredAt: row.occurredAt, version: row.unitVersion });
  }
  return { units, unitProgress, unitAttempts, unitTestIds: [...(rows.unitTestIds ?? [])] };
}

/**
 * The oral sentences the events name, from `@dailylingua/content` (core never imports it). Only the ones the server
 * serves: published, or any status with drafts allowed. A sentence left out is `unknown_sentence`.
 */
function oralSentencesOf(sentenceIds: readonly string[], allowDrafts: boolean): Record<string, OralSentence> {
  const sentences: Record<string, OralSentence> = {};
  for (const id of sentenceIds) {
    const sentence = getOralSentence(id, { includeDrafts: allowDrafts });
    if (sentence) sentences[id] = sentence;
  }
  return sentences;
}

export function buildIngestState(input: {
  userId: string;
  rows: IngestRows;
  memo: IngestMemo | null;
  serverDay?: DateKey;
  feedbackTarget?: { productionId: string; deferred?: boolean };
  /** Units the events name (`extractRefs`): only these are injected. */
  unitIds?: readonly string[];
  /** Sentences of the oral workshop the events name (`extractSentenceIds`): only these are injected. */
  sentenceIds?: readonly string[];
  /** Unpublished units and their sentences are served (`UNIT_DRAFTS=show`, never in production). */
  allowDrafts?: boolean;
}): BuiltIngestState {
  const { userId, rows, memo, serverDay, feedbackTarget } = input;
  const timeZone = rows.profile.timeZone;
  const skippedSessions: string[] = [];

  // Sessions and their plans ------------------------------------------------------------------------------------
  const sessions: Record<string, StateSession> = {};
  const plans = new Map<string, StoredSessionPlan>();
  for (const row of rows.sessions) {
    if (row.userId !== userId) {
      const foreign = foreignSession(row);
      if (foreign) sessions[row.id] = foreign;
      continue;
    }
    const plan = storedSessionPlanSchema.safeParse(row.plan);
    const session = plan.success ? ownSession(row, plan.data) : null;
    if (!plan.success || !session) {
      skippedSessions.push(row.id);
      continue;
    }
    plans.set(row.id, plan.data);
    sessions[row.id] = session;
  }

  // Items and texts ------------------------------------------------------------------------------------------------
  const itemLanguage = new Map<string, string>();
  for (const [sessionId, plan] of plans) {
    const language = (sessions[sessionId] as StateSession).language;
    for (const id of [...plan.reading.itemIds, ...plan.workshop.itemIds]) itemLanguage.set(id, language);
  }
  const items: Record<string, StateItem> = {};
  for (const row of rows.items) {
    const language = itemLanguage.get(row.id) ?? rows.texts.find((text) => text.id === row.textId)?.language;
    const item = language ? stateItem(row, language) : null;
    if (item) items[row.id] = item;
  }
  for (const row of rows.errorItems ?? []) {
    const corrected = row.accept[0];
    if (!corrected) continue;
    items[row.id] = {
      id: row.id, language: row.language, textId: null, kind: "cloze", answer: null, accept: row.accept,
      listeningOnly: false, origin: "error_of_day", errorItemId: row.id, reworkedDay: row.reworkedDay,
      errorOfDay: { correctionId: row.correctionId, createdDay: row.createdDay, recurring: row.recurring },
      card: {
        kind: "correction", front: row.sentence, back: `${corrected}\n${row.explanation}`,
        backLanguage: row.explanationLanguage, context: row.highlighted,
      },
    };
  }
  const texts: Record<string, StateText> = {};
  for (const row of rows.texts) {
    const language = languageCodeSchema.safeParse(row.language);
    if (!language.success) continue;
    const known = memo?.texts[row.id];
    texts[row.id] = { id: row.id, language: language.data, wordCount: row.wordCount, body: row.body, readingEarnedDay: known?.readingEarnedDay ?? null, referenceWpm: known?.referenceWpm ?? null };
  }

  // Cards: the key is the mode served (the most recent session of the window that holds the card), else the default --
  const sessionsByRecency = [...plans.entries()]
    .map(([id, plan]) => ({ id, plan, row: rows.sessions.find((row) => row.id === id) as SessionRow }))
    .sort((a, b) => compareDesc(a.row.day, b.row.day) || compareDesc(a.row.servedAt ?? "", b.row.servedAt ?? "") || compareDesc(a.id, b.id));
  const cards: Record<string, StateCard> = {};
  const cardModes = new Map<string, ReviewMode>();
  for (const row of rows.cards) {
    const holder = sessionsByRecency.find((entry) => Object.hasOwn(entry.plan.servedCards, row.id));
    const built = stateCard(row, timeZone, { mode: holder?.plan.servedCards[row.id], servedAt: holder?.row.servedAt ?? null });
    if (!built) continue;
    cards[row.id] = built.card;
    cardModes.set(row.id, built.mode);
  }

  // Journals ----------------------------------------------------------------------------------------------------------
  const learningDays: IngestState["learningDays"] = {};
  for (const row of rows.learningDays) learningDays[row.day] = { day: row.day, timeZone: row.timeZone, xpVerified: row.xpVerified, validated: row.validated, cause: row.cause, firstActivityAt: row.firstActivityAt };
  const settingChanges: SettingChange[] = [];
  for (const row of rows.settingChanges) {
    if (gameSettingKeySet.has(row.key)) settingChanges.push({ key: row.key as SettingChange["key"], value: row.value, effectiveDay: row.effectiveDay, changedAt: row.changedAt });
  }
  const deviceCursors: IngestState["deviceCursors"] = {};
  for (const row of rows.deviceCursors) deviceCursors[row.deviceId] = { lastSeq: row.lastSeq, lastDay: row.lastDay };

  // Explicit feedback loads the production even if the bounded memo has already evicted it.
  const productions: Record<string, StateProduction> = {};
  const correctedIds = new Set(rows.corrections?.map((correction) => correction.productionId));
  for (const row of rows.productions) {
    const language = languageCodeSchema.safeParse(row.language);
    if (!language.success) continue;
    const remembered = memo?.productions[row.id];
    const target = feedbackTarget?.productionId === row.id;
    const storedDay = remembered?.day ?? learningDay(new Date(row.createdAt), timeZone);
    const creditExpired = serverDay !== undefined && storedDay < addDays(serverDay, -3);
    const hasCorrection = correctedIds.has(row.id);
    productions[row.id] = {
      id: row.id,
      sessionId: row.sessionId,
      language: language.data,
      text: row.text,
      day: storedDay,
      late: remembered?.late ?? creditExpired,
      settled: remembered?.settled ?? !target,
      creditExpired: creditExpired || !remembered,
      correctionDeferred: !hasCorrection && ((target && feedbackTarget?.deferred === true) || remembered?.correctionDeferred === true),
      ...(row.initialSimilarity === undefined ? {} : { initialSimilarity: row.initialSimilarity }),
      clientEventId: row.clientEventId ?? "",
    };
  }
  const corrections: IngestState["corrections"] = {};
  for (const row of rows.corrections ?? []) {
    const production = productions[row.productionId];
    if (!production) continue;
    corrections[row.id] = {
      id: row.id,
      productionId: row.productionId,
      sessionId: production.sessionId,
      language: production.language,
      detectedLanguage: row.stored.detectedLanguage ?? "und",
      nativeVersion: row.stored.feedback.nativeVersion,
      sentences: row.stored.sentences,
    };
  }

  const firstEnrollment = rows.enrollments[0];
  const state: IngestState = {
    userId,
    profile: {
      timeZone,
      createdAt: rows.profile.createdAt,
      writingLevels: writingLevels(rows.skillEstimates),
      answerTolerance: answerTolerance(rows.profile.gameSettings),
      defaultRingTier: ringTierOfMinutes(firstEnrollment?.dailyMinutes),
      explanationLanguage: explanationLanguageOf(rows.profile.nativeLanguage),
      enrolledLanguages: rows.enrollments.map((enrollment) => enrollment.language),
    },
    sessions,
    items,
    texts,
    cards,
    corrections,
    productions,
    days: structuredClone(memo?.days ?? {}),
    learningDays,
    settingChanges,
    timezoneChanges: rows.timezoneChanges,
    deviceCursors,
    streak: rows.streak,
    textReads: rows.textReads,
    catchUpDays: [...(memo?.catchUpDays ?? [])],
    knownEvents: { ...rows.knownEvents },
    cardFronts: rows.cardFronts,
    rewriteChecks: {},
    recentProductionTexts: rows.recentProductionTexts,
    ...unitState(input.unitIds ?? [], rows),
    oralSentences: oralSentencesOf(input.sentenceIds ?? [], input.allowDrafts === true),
  };
  return { state, cardModes, skippedSessions };
}
