import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { toDateKey } from "@/lib/domain/dates";
import type { Database } from "@/lib/supabase/database.types";
import { dateKeySchema, type DateKey } from "@/lib/schemas/common";
import {
  missionHistoryEntrySchema,
  missionSchema,
  type Mission,
  type MissionHistoryEntry,
} from "@/lib/schemas/mission";
import { preferencesSchema, type Preferences } from "@/lib/schemas/preferences";
import { vocabularyItemSchema, type VocabularyItem } from "@/lib/schemas/vocabulary";
import type { DailyLinguaRepository } from "./repository";

/** How many past missions the history screen loads. */
const HISTORY_LIMIT = 30;

type Client = SupabaseClient<Database>;

/** Unwraps a Supabase response: a failed query is an error, never an empty result. */
function unwrap<T>(result: { data: T; error: { message: string } | null }, what: string): NonNullable<T> {
  if (result.error) throw new Error(`Supabase (${what}) : ${result.error.message}`);
  if (result.data === null || result.data === undefined) throw new Error(`Supabase (${what}) : aucune donnée`);
  return result.data;
}

/**
 * Read-only repository backed by Supabase. `client` must act as `userId` (anon key + user
 * session), so Row Level Security applies on top of the explicit `user_id` filters below.
 * Every payload is mapped to the domain types and validated with the Zod schemas.
 */
export function createSupabaseRepository(client: Client, userId: string): DailyLinguaRepository {
  async function getPreferences(): Promise<Preferences> {
    const [profile, goals] = await Promise.all([
      client.from("profiles").select("*").eq("id", userId).single(),
      client
        .from("user_languages")
        .select("*")
        .eq("user_id", userId)
        .order("weight", { ascending: false })
        .order("language"),
    ]);
    const p = unwrap(profile, "profil");
    const g = unwrap(goals, "langues");
    if (g.length === 0) {
      throw new Error("Aucune langue configurée pour cet utilisateur (onboarding à venir en phase 3).");
    }
    return preferencesSchema.parse({
      goals: g.map((row) => ({
        language: row.language,
        level: row.level,
        targetLevel: row.target_level,
        focus: row.focus,
        weight: row.weight,
      })),
      dailyMinutes: p.daily_minutes,
      topics: p.topics,
      contentTypes: p.content_types,
      difficulty: p.difficulty,
      generationTime: p.generation_time.slice(0, 5), // "HH:mm:ss" -> "HH:mm"
      timeZone: p.time_zone,
    });
  }

  async function getToday(): Promise<DateKey> {
    const profile = unwrap(
      await client.from("profiles").select("time_zone").eq("id", userId).single(),
      "profil",
    );
    return toDateKey(new Date(), profile.time_zone);
  }

  async function getMission(date: DateKey): Promise<Mission | null> {
    const { data, error } = await client
      .from("missions")
      .select(
        `id, mission_date, budget_minutes,
         mission_sessions (
           position, language, questions, expressions, production,
           contents ( title, content_type, language, url, difficulty, duration_minutes, summary,
                      transcript_available, sources ( name, homepage_url ) ),
           mission_activities ( id, position, kind, title, estimated_minutes )
         )`,
      )
      .eq("user_id", userId)
      .eq("mission_date", date)
      .eq("status", "ready")
      .order("position", { referencedTable: "mission_sessions" })
      .order("position", { referencedTable: "mission_sessions.mission_activities" })
      .maybeSingle();
    if (error) throw new Error(`Supabase (mission) : ${error.message}`);
    if (!data) return null;

    return missionSchema.parse({
      id: data.id,
      date: data.mission_date,
      budgetMinutes: data.budget_minutes,
      sessions: data.mission_sessions.map((s) => {
        const content = s.contents;
        if (!content?.sources) throw new Error(`Supabase (mission) : contenu manquant pour la session ${s.position}`);
        return {
          language: s.language,
          content: {
            title: content.title,
            type: content.content_type,
            language: content.language,
            source: { name: content.sources.name, homepage: content.sources.homepage_url },
            url: content.url,
            difficulty: content.difficulty,
            durationMinutes: content.duration_minutes,
            summary: content.summary,
            transcriptAvailable: content.transcript_available,
          },
          activities: s.mission_activities.map((a) => ({
            id: a.id,
            kind: a.kind,
            title: a.title,
            estimatedMinutes: a.estimated_minutes,
          })),
          // AI-generated exercises live in jsonb: Zod is what guarantees their shape.
          questions: s.questions,
          expressions: s.expressions,
          production: s.production,
        };
      }),
    });
  }

  async function getHistory(): Promise<MissionHistoryEntry[]> {
    const today = await getToday();
    // Past missions on which at least one activity was completed, most recent first.
    const missions = unwrap(
      await client
        .from("mission_stats")
        .select("mission_id, mission_date, budget_minutes, spent_seconds")
        .eq("user_id", userId)
        .eq("status", "ready")
        .gt("completed_activities", 0)
        .lt("mission_date", today)
        .order("mission_date", { ascending: false })
        .limit(HISTORY_LIMIT),
      "historique",
    );
    if (missions.length === 0) return [];

    const sessions = unwrap(
      await client
        .from("mission_sessions")
        .select(
          `mission_id, position, language, question_count,
           contents ( title, content_type, url, sources ( name ) ),
           quiz_answers ( is_correct )`,
        )
        .eq("user_id", userId)
        .in(
          "mission_id",
          missions.map((m) => m.mission_id!),
        )
        .order("position"),
      "sessions passées",
    );

    return z.array(missionHistoryEntrySchema).parse(
      missions.map((m) => ({
        id: m.mission_id,
        date: m.mission_date,
        budgetMinutes: m.budget_minutes,
        completedMinutes: Math.round((m.spent_seconds ?? 0) / 60),
        sessions: sessions
          .filter((s) => s.mission_id === m.mission_id)
          .map((s) => ({
            language: s.language,
            title: s.contents?.title,
            sourceName: s.contents?.sources?.name,
            url: s.contents?.url,
            type: s.contents?.content_type,
            score:
              (s.question_count ?? 0) > 0 && s.quiz_answers.length > 0
                ? { correct: s.quiz_answers.filter((a) => a.is_correct).length, total: s.question_count }
                : null,
          })),
      })),
    );
  }

  async function getStudyDates(): Promise<DateKey[]> {
    const rows = unwrap(
      await client
        .from("mission_stats")
        .select("mission_date")
        .eq("user_id", userId)
        .gt("completed_activities", 0)
        .order("mission_date"),
      "jours étudiés",
    );
    return z.array(dateKeySchema).parse(rows.map((r) => r.mission_date));
  }

  async function listVocabulary(): Promise<VocabularyItem[]> {
    const rows = unwrap(
      await client
        .from("vocabulary_items")
        .select("*")
        .eq("user_id", userId)
        .order("due_on")
        .order("term"),
      "vocabulaire",
    );
    return z.array(vocabularyItemSchema).parse(
      rows.map((row) => ({
        id: row.id,
        language: row.language,
        term: row.term,
        translation: row.translation,
        definition: row.definition ?? undefined,
        example: row.example ?? undefined,
        source: row.source_name ? { name: row.source_name, url: row.source_url ?? undefined } : undefined,
        status: row.status,
        review: {
          box: row.box,
          dueOn: row.due_on,
          lastReviewedOn: row.last_reviewed_on,
          reviewCount: row.review_count,
        },
        addedOn: row.added_on,
      })),
    );
  }

  return { isDemo: false, getPreferences, getMission, getHistory, getStudyDates, listVocabulary };
}
