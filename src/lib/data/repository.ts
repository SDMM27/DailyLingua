import "server-only";
import { cache } from "react";
import { z } from "zod";
import { toDateKey } from "@/lib/domain/dates";
import { dateKeySchema, type DateKey } from "@/lib/schemas/common";
import {
  missionHistoryEntrySchema,
  missionSchema,
  type Mission,
  type MissionHistoryEntry,
} from "@/lib/schemas/mission";
import { preferencesSchema, type Preferences } from "@/lib/schemas/preferences";
import { vocabularyItemSchema, type VocabularyItem } from "@/lib/schemas/vocabulary";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { buildMockHistory, buildMockStudyDates } from "./mock/history";
import { buildMockMission } from "./mock/mission";
import { MOCK_PREFERENCES } from "./mock/preferences";
import { buildMockVocabulary } from "./mock/vocabulary";
import { createSupabaseRepository } from "./supabase-repository";

/**
 * Single entry point for reading app data. Pages depend on this interface only,
 * so the demo implementation and the Supabase one are interchangeable.
 */
export interface DailyLinguaRepository {
  readonly isDemo: boolean;
  getPreferences(): Promise<Preferences>;
  getMission(date: DateKey): Promise<Mission | null>;
  getHistory(): Promise<MissionHistoryEntry[]>;
  getStudyDates(): Promise<DateKey[]>;
  listVocabulary(): Promise<VocabularyItem[]>;
}

function createMockRepository(): DailyLinguaRepository {
  const today = () => toDateKey(new Date(), MOCK_PREFERENCES.timeZone);
  return {
    isDemo: true,
    async getPreferences() {
      return preferencesSchema.parse(MOCK_PREFERENCES);
    },
    async getMission(date) {
      // The demo only has a mission for the current day.
      return date === today() ? missionSchema.parse(buildMockMission(date)) : null;
    },
    async getHistory() {
      return z.array(missionHistoryEntrySchema).parse(buildMockHistory(today()));
    },
    async getStudyDates() {
      return z.array(dateKeySchema).parse(buildMockStudyDates(today()));
    },
    async listVocabulary() {
      return z.array(vocabularyItemSchema).parse(buildMockVocabulary(today()));
    },
  };
}

/**
 * The repository for the current request: Supabase for a signed-in user, demo data otherwise
 * (Supabase not configured, no session, or Supabase unreachable). Memoised per request.
 */
export const getRepository = cache(async (): Promise<DailyLinguaRepository> => {
  const supabase = await createSupabaseServerClient();
  if (supabase) {
    // getUser() validates the token with Supabase Auth; it resolves to null without a session.
    const { data } = await supabase.auth.getUser();
    if (data.user) return createSupabaseRepository(supabase, data.user.id);
  }
  return createMockRepository();
});

/** Today's date key in the user's time zone. Call after `connection()` so it isn't prerendered. */
export async function getToday(): Promise<DateKey> {
  const prefs = await (await getRepository()).getPreferences();
  return toDateKey(new Date(), prefs.timeZone);
}
