import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { z } from "zod";
import { toDateKey } from "@/lib/domain/dates";
import { dateKeySchema, type DateKey } from "@/lib/schemas/common";
import {
  EMPTY_MISSION_PROGRESS,
  missionHistoryEntrySchema,
  missionSchema,
  type Mission,
  type MissionHistoryEntry,
  type MissionProgress,
} from "@/lib/schemas/mission";
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
import { buildMockHistory, buildMockStudyDates } from "./mock/history";
import { buildMockMission } from "./mock/mission";
import { MOCK_PREFERENCES } from "./mock/preferences";
import { buildMockVocabulary } from "./mock/vocabulary";
import { createSupabaseRepository } from "./supabase-repository";

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
  getMissionProgress(mission: Mission): Promise<MissionProgress>;
  setActivityDone(activityId: string, done: boolean): Promise<void>;
  answerQuestion(sessionId: string, questionId: string, selectedIndex: number): Promise<void>;
  /** Saves the text written for the production task of a session (empty text removes it). */
  saveProduction(sessionId: string, body: string): Promise<void>;
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
    setActivityDone: readOnly,
    answerQuestion: readOnly,
    saveProduction: readOnly,
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
  return createSupabaseRepository(supabase, data.user.id);
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
