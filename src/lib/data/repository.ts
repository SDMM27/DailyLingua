import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { z } from "zod";
import { availableLanguages } from "@/lib/content/availability";
import { SOURCE_CATALOG } from "@/lib/content/catalog";
import { readContentLicensePolicy } from "@/lib/content/policy";
import { prepareMission, replaceSession, writingFeedbackReviewer } from "@/lib/generation/server";
import { addDays, toDateKey } from "@/lib/domain/dates";
import { dateKeySchema, type DateKey, type Language } from "@/lib/schemas/common";
import {
  contentListItemSchema,
  sourceInfoSchema,
  type ContentListItem,
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
import { placementSummarySchema, type PlacementRecord, type PlacementSummary } from "@/lib/schemas/placement";
import { preferencesSchema, type Preferences } from "@/lib/schemas/preferences";
import {
  vocabularyItemSchema,
  type NewVocabularyInput,
  type ReviewInput,
  type VocabularyItem,
} from "@/lib/schemas/vocabulary";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { UserFacingError } from "./errors";
import { buildMockContents, buildMockSources } from "./mock/contents";
import { buildMockHistory, buildMockStudyDates } from "./mock/history";
import { buildMockMission } from "./mock/mission";
import { MOCK_PREFERENCES } from "./mock/preferences";
import { buildMockVocabulary } from "./mock/vocabulary";
import { createSupabaseRepository } from "./supabase-repository";
import type { WritingFeedbackResult } from "@/lib/schemas/writing-feedback";

/** Outcome of asking for today's mission; internal reasons never leave the server. */
export interface PrepareMissionResult {
  /** pending: another request is writing it, ask again shortly. */
  status: "ready" | "pending" | "failed" | "no-content";
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

  listVocabulary(): Promise<VocabularyItem[]>;
  addVocabulary(input: NewVocabularyInput): Promise<VocabularyItem>;
  /** Grades a review; returns the word with its new review state. */
  reviewVocabulary(input: ReviewInput): Promise<VocabularyItem>;
  setVocabularyStatus(id: string, status: VocabularyItem["status"]): Promise<void>;
  deleteVocabulary(id: string): Promise<void>;

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
   * active sources allowed by the licence policy. Broken links are left out.
   */
  listContents(languages: Language[], perLanguage: number): Promise<ContentListItem[]>;
  /** Sources of the catalogue allowed by the licence policy, with their licence. */
  listSources(): Promise<SourceInfo[]>;
  /** Languages that can be chosen: at least one source allowed by the licence policy. */
  listAvailableLanguages(): Promise<Language[]>;
}

function createMockRepository(): DailyLinguaRepository {
  const today = () => toDateKey(new Date(), MOCK_PREFERENCES.timeZone);
  const readOnly = async (): Promise<never> => {
    throw new UserFacingError("Mode démonstration : rien n’est enregistré.");
  };
  return {
    isDemo: true,
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
    async listVocabulary() {
      return z.array(vocabularyItemSchema).parse(buildMockVocabulary(today()));
    },
    addVocabulary: readOnly,
    reviewVocabulary: readOnly,
    setVocabularyStatus: readOnly,
    deleteVocabulary: readOnly,
    async listPlacementTests() {
      // One completed test, to show the screen as it looks once a level was assessed.
      const language = MOCK_PREFERENCES.goals[0];
      return z.array(placementSummarySchema).parse([
        {
          status: "completed",
          language: language.language,
          variant: "everyday",
          estimatedLevel: language.level,
          confidence: "medium",
          chosenLevel: language.level,
          takenAt: new Date(`${addDays(today(), -12)}T09:00:00Z`).toISOString(),
        },
      ]);
    },
    recordPlacementTest: readOnly,
    sendFeedback: readOnly,
    async listContents(languages, perLanguage) {
      const items = buildMockContents(new Date()).filter((c) => languages.includes(c.language));
      const kept = languages.flatMap((l) => items.filter((c) => c.language === l).slice(0, perLanguage));
      return z.array(contentListItemSchema).parse(kept);
    },
    async listSources() {
      return z.array(sourceInfoSchema).parse(buildMockSources());
    },
    async listAvailableLanguages() {
      return availableLanguages(SOURCE_CATALOG, readContentLicensePolicy());
    },
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
    prepareMission,
    replaceSession,
    reviewWriting: writingFeedbackReviewer(),
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
