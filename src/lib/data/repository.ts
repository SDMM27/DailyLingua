import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { z } from "zod";
import { availableLanguages } from "@/lib/content/availability";
import { SOURCE_CATALOG } from "@/lib/content/catalog";
import { LANGUAGE_CODES } from "@/lib/domain/languages";
import { readContentLicensePolicy } from "@/lib/content/policy";
import {
  prepareMission,
  replaceSession,
  reserveGuestMission,
  vocabularyTranslator,
  writingFeedbackReviewer,
} from "@/lib/generation/server";
import { addDays, toDateKey } from "@/lib/domain/dates";
import type { GuestTrialStatus } from "@/lib/domain/guest-trial";
import { dateKeySchema, type ContentType, type DateKey, type Language } from "@/lib/schemas/common";
import {
  contentListItemSchema,
  paidSourceSchema,
  sourceInfoSchema,
  type ContentListItem,
  type PaidSource,
  type SourceInfo,
} from "@/lib/schemas/content";
import {
  EMPTY_MISSION_PROGRESS,
  missionHistoryEntrySchema,
  missionSchema,
  type Mission,
  type MissionHistoryEntry,
  type MissionProgress,
} from "@/lib/schemas/mission";
import type { FeedbackInput } from "@/lib/schemas/feedback";
import { correctionCardSchema, type CorrectionCard, type ReviewCorrectionInput } from "@/lib/schemas/correction-card";
import type { GrammarPracticeResult } from "@/lib/domain/grammar";
import { grammarCardSchema, type GrammarCard, type RecordGrammarPracticeInput } from "@/lib/schemas/grammar";
import { productionEntrySchema, type ProductionEntry } from "@/lib/schemas/production";
import { placementSummarySchema, type PlacementRecord, type PlacementSummary } from "@/lib/schemas/placement";
import { preferencesSchema, type Preferences } from "@/lib/schemas/preferences";
import {
  vocabularyItemSchema,
  vocabularyListSchema,
  type ImportVocabularyInput,
  type ImportVocabularyResult,
  type NewVocabularyInput,
  type NewVocabularyListInput,
  type ReviewInput,
  type TranslateVocabularyInput,
  type UpdateVocabularyListInput,
  type VocabularyItem,
  type VocabularyList,
  type VocabularyTranslationResult,
} from "@/lib/schemas/vocabulary";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { UserFacingError } from "./errors";
import { buildMockContents, buildMockSources } from "./mock/contents";
import { buildMockHistory, buildMockStudyDates } from "./mock/history";
import { buildMockMission } from "./mock/mission";
import { MOCK_PREFERENCES } from "./mock/preferences";
import { buildMockGrammarCards } from "./mock/grammar";
import { buildMockCorrectionCards, buildMockProductions } from "./mock/productions";
import { buildMockVocabulary, buildMockVocabularyLists } from "./mock/vocabulary";
import { createSupabaseRepository } from "./supabase-repository";
import type { WritingFeedbackResult } from "@/lib/schemas/writing-feedback";

/** Outcome of asking for today's mission; internal reasons never leave the server. */
export interface PrepareMissionResult {
  /** pending: another request is writing it, ask again shortly; signup-required: the guest trial is over. */
  status: "ready" | "pending" | "failed" | "no-content" | "signup-required";
}

/** Outcome of replacing the content of a session the user cannot read. */
export interface ReplaceContentResult {
  /** no-content: nothing else readable for that language today; limit: too many replacements today. */
  status: "ready" | "no-content" | "limit";
}

/**
 * Single entry point for app data. Pages and server actions depend on this interface only,
 * so the demo implementation and the Supabase one are interchangeable.
 *
 * Every calendar day is computed in the user's time zone (`getToday`) and passed explicitly
 * to the database, which has no date defaults: the server's own date (UTC) is never used.
 */
export interface DailyLinguaRepository {
  /** Demo data: nothing can be saved. */
  readonly isDemo: boolean;
  /** Signed in without an account (anonymous user, free trial). Always false in the demo. */
  readonly isGuest: boolean;
  /** Where the guest stands in the trial; null for a real account and in the demo. */
  getGuestTrial(): Promise<GuestTrialStatus | null>;
  /** E-mail of the signed-in account, null in the demo. */
  getAccountEmail(): Promise<string | null>;
  /** Today's date in the user's time zone. */
  getToday(): Promise<DateKey>;

  /** Null until the user has chosen their languages (first run: see `requirePreferences`). */
  getPreferences(): Promise<Preferences | null>;
  savePreferences(preferences: Preferences): Promise<void>;

  getMission(date: DateKey): Promise<Mission | null>;
  /**
   * Writes today's mission if it does not exist yet (idempotent; today is the user's, computed
   * server side). Can take several seconds: it calls the language model.
   */
  prepareTodayMission(): Promise<PrepareMissionResult>;
  /**
   * « Je n’ai pas accès »: remembers that the user cannot read the content of this session (it is
   * never proposed to them again, even when nothing can replace it) and swaps it for another
   * readable content. The progress of that session is erased. Can take several seconds.
   */
  replaceInaccessibleContent(sessionId: string): Promise<ReplaceContentResult>;
  getMissionProgress(mission: Mission): Promise<MissionProgress>;
  setActivityDone(activityId: string, done: boolean): Promise<void>;
  answerQuestion(sessionId: string, questionId: string, selectedIndex: number): Promise<void>;
  /** Saves the text written for the production task of a session (empty text removes it). */
  saveProduction(sessionId: string, body: string): Promise<void>;
  /** Whether written productions can be reviewed by the language model here. */
  readonly canReviewWriting: boolean;
  /**
   * Saves the text, ticks the writing step, then asks the language model for a review. A failed
   * or slow review comes back as `unavailable`: the step stays done.
   */
  requestWritingFeedback(sessionId: string, body: string): Promise<WritingFeedbackResult>;
  /** Adds an expression of the mission to the vocabulary. Idempotent. */
  saveExpression(sessionId: string, expressionId: string): Promise<void>;

  getHistory(): Promise<MissionHistoryEntry[]>;
  getStudyDates(): Promise<DateKey[]>;
  /**
   * Written productions of past missions (today included), newest first, at most 300: those with
   * a saved text or a review. `body` is the reviewed text when there is a review, the draft otherwise.
   */
  listProductions(): Promise<ProductionEntry[]>;

  listCorrectionCards(): Promise<CorrectionCard[]>;
  /**
   * Keeps one correction of a session's review as a review card. Idempotent; refused when the
   * correction does not exist.
   */
  addCorrectionCard(sessionId: string, correctionIndex: number): Promise<void>;
  /** Grades a review; returns the card with its new review state. */
  reviewCorrectionCard(input: ReviewCorrectionInput): Promise<CorrectionCard>;
  deleteCorrectionCard(id: string): Promise<void>;

  /** Grammar points practised successfully, as review cards (due date order). */
  listGrammarCards(): Promise<GrammarCard[]>;
  /**
   * Records one run through the exercises of a point: creates the card (score of 60 % or more),
   * reviews it when it is due, otherwise records nothing. Refused when the point does not exist
   * or is hidden, or when the card changed since the page was loaded (`expectedReviewCount`).
   */
  recordGrammarPractice(input: RecordGrammarPracticeInput): Promise<GrammarPracticeResult>;
  deleteGrammarCard(id: string): Promise<void>;

  listVocabulary(): Promise<VocabularyItem[]>;
  addVocabulary(input: NewVocabularyInput): Promise<VocabularyItem>;
  /** Grades a review; returns the word with its new review state. */
  reviewVocabulary(input: ReviewInput): Promise<VocabularyItem>;
  setVocabularyStatus(id: string, status: VocabularyItem["status"]): Promise<void>;
  deleteVocabulary(id: string): Promise<void>;

  listVocabularyLists(): Promise<VocabularyList[]>;
  /** Refuses a name the user already uses (UserFacingError). */
  createVocabularyList(input: NewVocabularyListInput): Promise<VocabularyList>;
  /** Renames, describes, pauses or reactivates a list; returns it as saved. */
  updateVocabularyList(input: UpdateVocabularyListInput): Promise<VocabularyList>;
  /** Deletes the list and its words. */
  deleteVocabularyList(id: string): Promise<void>;
  /**
   * Adds many words at once, to an existing list, to a new one (`newListName`, created only when at
   * least one word is added) or to none. Words the user already has in that language (case and
   * spacing ignored) are skipped, not overwritten, and returned in `skipped`.
   */
  importVocabulary(input: ImportVocabularyInput): Promise<ImportVocabularyResult>;
  /** Whether imported words can be translated by the language model here. */
  readonly canTranslateVocabulary: boolean;
  /**
   * Suggests French translations; nothing is saved. `guest`: guests cannot use it; `limit`: the
   * day's quota is used up; `unavailable`: off, or the model failed.
   */
  suggestTranslations(input: TranslateVocabularyInput): Promise<VocabularyTranslationResult>;

  /** Latest placement test (completed or skipped) of each of the user's languages that has one. */
  listPlacementTests(): Promise<PlacementSummary[]>;
  /**
   * Stores a test. A completed one also sets the current level of its language to the chosen
   * level, atomically.
   */
  recordPlacementTest(record: PlacementRecord): Promise<void>;

  /** Sends a feedback to the editor (write-only: the user cannot read it back). */
  sendFeedback(input: FeedbackInput): Promise<void>;

  /**
   * Latest authentic contents of `languages` (at most `perLanguage` each, newest first), from the
   * active sources allowed by the licence policy. Broken links are left out. `types` keeps only
   * those content types (all of them when absent).
   */
  listContents(languages: Language[], perLanguage: number, options?: { types?: ContentType[] }): Promise<ContentListItem[]>;
  /** Sources of the catalogue allowed by the licence policy, with their licence. */
  listSources(): Promise<SourceInfo[]>;
  /** Languages that can be chosen: at least one source allowed by the licence policy. */
  listAvailableLanguages(): Promise<Language[]>;
  /**
   * Paid (metered / paywalled) active sources in the user's languages, with whether the user
   * declared they can read each. Language registry order, then name.
   */
  listPaidSources(): Promise<PaidSource[]>;
  /**
   * Declares (or withdraws) the user's access to a paid source; their missions may then use its
   * contents. Idempotent. Refuses a source that is not an active paid one. Nothing about the
   * subscription itself is stored.
   */
  setSourceAccess(sourceId: string, hasAccess: boolean): Promise<void>;
}

function createMockRepository(): DailyLinguaRepository {
  const today = () => toDateKey(new Date(), MOCK_PREFERENCES.timeZone);
  const readOnly = async (): Promise<never> => {
    throw new UserFacingError("Mode démonstration : rien n’est enregistré.");
  };
  return {
    isDemo: true,
    isGuest: false,
    async getGuestTrial() {
      return null;
    },
    async getAccountEmail() {
      return null;
    },
    async getToday() {
      return today();
    },
    async getPreferences() {
      return preferencesSchema.parse(MOCK_PREFERENCES);
    },
    savePreferences: readOnly,
    async getMission(date) {
      // The demo only has a mission for the current day.
      return date === today() ? missionSchema.parse(buildMockMission(date)) : null;
    },
    async getMissionProgress() {
      return EMPTY_MISSION_PROGRESS;
    },
    async prepareTodayMission() {
      return { status: "ready" }; // the demo always has its mission
    },
    replaceInaccessibleContent: readOnly,
    setActivityDone: readOnly,
    answerQuestion: readOnly,
    saveProduction: readOnly,
    canReviewWriting: false,
    requestWritingFeedback: readOnly,
    saveExpression: readOnly,
    async getHistory() {
      return z.array(missionHistoryEntrySchema).parse(buildMockHistory(today()));
    },
    async getStudyDates() {
      return z.array(dateKeySchema).parse(buildMockStudyDates(today()));
    },
    async listProductions() {
      return z.array(productionEntrySchema).parse(buildMockProductions(today()));
    },
    async listCorrectionCards() {
      return z.array(correctionCardSchema).parse(buildMockCorrectionCards(today()));
    },
    addCorrectionCard: readOnly,
    reviewCorrectionCard: readOnly,
    deleteCorrectionCard: readOnly,
    async listGrammarCards() {
      return z.array(grammarCardSchema).parse(buildMockGrammarCards(today()));
    },
    recordGrammarPractice: readOnly,
    deleteGrammarCard: readOnly,
    async listVocabulary() {
      return z.array(vocabularyItemSchema).parse(buildMockVocabulary(today()));
    },
    addVocabulary: readOnly,
    reviewVocabulary: readOnly,
    setVocabularyStatus: readOnly,
    deleteVocabulary: readOnly,
    async listVocabularyLists() {
      return z.array(vocabularyListSchema).parse(buildMockVocabularyLists());
    },
    createVocabularyList: readOnly,
    updateVocabularyList: readOnly,
    deleteVocabularyList: readOnly,
    importVocabulary: readOnly,
    canTranslateVocabulary: false,
    async suggestTranslations() {
      return { status: "unavailable" };
    },
    async listPlacementTests() {
      // One completed test, to show the screen as it looks once a level was assessed.
      const language = MOCK_PREFERENCES.goals[0];
      return z.array(placementSummarySchema).parse([
        {
          status: "completed",
          language: language.language,
          estimatedLevel: language.level,
          confidence: "medium",
          chosenLevel: language.level,
          takenAt: new Date(`${addDays(today(), -12)}T09:00:00Z`).toISOString(),
        },
      ]);
    },
    recordPlacementTest: readOnly,
    sendFeedback: readOnly,
    async listContents(languages, perLanguage, options) {
      const types = options?.types;
      const items = buildMockContents(new Date()).filter(
        (c) => languages.includes(c.language) && (!types || types.includes(c.type)),
      );
      const kept = languages.flatMap((l) => items.filter((c) => c.language === l).slice(0, perLanguage));
      return z.array(contentListItemSchema).parse(kept);
    },
    async listSources() {
      return z.array(sourceInfoSchema).parse(buildMockSources());
    },
    async listAvailableLanguages() {
      return availableLanguages(SOURCE_CATALOG, readContentLicensePolicy());
    },
    async listPaidSources() {
      const policy = readContentLicensePolicy();
      const languages = MOCK_PREFERENCES.goals.map((g) => g.language);
      const paid = SOURCE_CATALOG.filter(
        (s) =>
          s.access !== undefined &&
          s.access !== "free" &&
          languages.includes(s.language) &&
          (policy === "all" || s.license.commercialUse),
      ).map((s) => ({ id: s.key, name: s.name, homepage: s.homepageUrl, language: s.language, access: s.access, declared: false }));
      paid.sort((a, b) => LANGUAGE_CODES.indexOf(a.language) - LANGUAGE_CODES.indexOf(b.language) || a.name.localeCompare(b.name));
      return z.array(paidSourceSchema).parse(paid);
    },
    setSourceAccess: readOnly,
  };
}

/**
 * The repository for the current request.
 *  - Supabase not configured: demo data (what runs on Vercel until the hosted project exists).
 *  - Supabase configured and signed in: the user's data.
 *  - Supabase configured and signed out: redirect to the sign-in screen. There is no demo
 *    for visitors of a real deployment: the proxy already redirects, this is the second line.
 * Memoised per request.
 */
export const getRepository = cache(async (): Promise<DailyLinguaRepository> => {
  if (!getSupabaseEnv()) return createMockRepository();
  const supabase = await createSupabaseServerClient();
  if (!supabase) return createMockRepository();
  // getUser() validates the token with Supabase Auth; it resolves to null without a session.
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/connexion");
  return createSupabaseRepository(supabase, data.user.id, {
    isGuest: data.user.is_anonymous === true,
    reserveGuestMission,
    prepareMission,
    replaceSession,
    reviewWriting: writingFeedbackReviewer(),
    translateVocabulary: vocabularyTranslator(),
  });
});

/** The preferences, or a redirect to the first-run screen while the user has no language yet. */
export async function requirePreferences(): Promise<Preferences> {
  const preferences = await (await getRepository()).getPreferences();
  if (!preferences) redirect("/bienvenue");
  return preferences;
}

/** Today's date key in the user's time zone. Call after `connection()` so it isn't prerendered. */
export async function getToday(): Promise<DateKey> {
  return (await getRepository()).getToday();
}
