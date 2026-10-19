import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { toDateKey } from "@/lib/domain/dates";
import { guestTrialStatus, type GuestTrialStatus } from "@/lib/domain/guest-trial";
import { LANGUAGE_CODES } from "@/lib/domain/languages";
import { applyReview, initialReviewState } from "@/lib/domain/spaced-repetition";
import type { Database } from "@/lib/supabase/database.types";
import { availableLanguages } from "@/lib/content/availability";
import { SOURCE_CATALOG } from "@/lib/content/catalog";
import { readContentLicensePolicy } from "@/lib/content/policy";
import { dateKeySchema, type DateKey, type Language } from "@/lib/schemas/common";
import {
  contentListItemSchema,
  paidSourceSchema,
  sourceInfoSchema,
  type ContentLicensePolicy,
  type ContentListItem,
  type PaidSource,
  type SourceInfo,
} from "@/lib/schemas/content";
import {
  expressionSchema,
  missionHistoryEntrySchema,
  missionProgressSchema,
  missionSchema,
  type Mission,
  type MissionHistoryEntry,
  type MissionProgress,
} from "@/lib/schemas/mission";
import {
  FEEDBACK_RATE_LIMIT_MESSAGE,
  FEEDBACK_RATE_LIMIT_SQLSTATE,
  type FeedbackInput,
} from "@/lib/schemas/feedback";
import { placementSummarySchema, type PlacementRecord, type PlacementSummary } from "@/lib/schemas/placement";
import { preferencesSchema, type Preferences } from "@/lib/schemas/preferences";
import {
  vocabularyItemSchema,
  type NewVocabularyInput,
  type ReviewInput,
  type VocabularyItem,
} from "@/lib/schemas/vocabulary";
import type { GenerateMissionOutcome } from "@/lib/generation/generate-mission";
import type { ReplaceSessionOutcome } from "@/lib/generation/replace-session";
import { generationMetaSchema } from "@/lib/schemas/generation";
import {
  WRITING_FEEDBACK_LIMITS,
  writingFeedbackSchema,
  type WritingFeedback,
  type WritingFeedbackResult,
  type WritingReviewState,
} from "@/lib/schemas/writing-feedback";
import type {
  RequestWritingFeedbackInput,
  WritingFeedbackOutcome,
} from "@/lib/generation/writing-feedback-service";
import { UserFacingError } from "./errors";
import type { DailyLinguaRepository, PrepareMissionResult, ReplaceContentResult } from "./repository";

/** How many past missions the history screen loads. */
const HISTORY_LIMIT = 30;

type Client = SupabaseClient<Database>;

/** A stored review, or undefined when there is none or it no longer matches the contract. */
function storedFeedback(value: unknown): WritingFeedback | undefined {
  if (value === null || value === undefined) return undefined;
  const parsed = writingFeedbackSchema.safeParse(value);
  return parsed.success ? parsed.data : undefined;
}
type VocabularyRow = Database["public"]["Tables"]["vocabulary_items"]["Row"];
type SourceRow = Database["public"]["Tables"]["sources"]["Row"];

/** Columns of a source needed to show it with its licence. */
const SOURCE_COLUMNS =
  "key, name, language, homepage_url, content_type, access, license_kind, license_name, license_url, terms_url, last_fetched_at";

function toSourceInfo(
  row: Pick<
    SourceRow,
    | "key"
    | "name"
    | "language"
    | "homepage_url"
    | "content_type"
    | "access"
    | "license_kind"
    | "license_name"
    | "license_url"
    | "terms_url"
    | "last_fetched_at"
  >,
): SourceInfo {
  return sourceInfoSchema.parse({
    key: row.key,
    name: row.name,
    language: row.language,
    homepage: row.homepage_url,
    contentType: row.content_type,
    access: row.access,
    license: {
      kind: row.license_kind,
      name: row.license_name,
      url: row.license_url ?? undefined,
      termsUrl: row.terms_url,
    },
    lastFetchedAt: row.last_fetched_at,
  });
}

const UNIQUE_VIOLATION = "23505";
/** Raised by record_placement_test when the language is not one of the user's. */
const NO_DATA_FOUND = "P0002";

function toVocabularyItem(row: VocabularyRow): VocabularyItem {
  return vocabularyItemSchema.parse({
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
  });
}

/** Unwraps a Supabase response: a failed query is an error, never an empty result. */
function unwrap<T>(result: { data: T; error: { message: string } | null }, what: string): NonNullable<T> {
  if (result.error) throw new Error(`Supabase (${what}) : ${result.error.message}`);
  if (result.data === null || result.data === undefined) throw new Error(`Supabase (${what}) : aucune donnée`);
  return result.data;
}

/** The user's preferences, or null while they have no language yet. Shared with the generation store. */
export async function fetchPreferences(client: Client, userId: string): Promise<Preferences | null> {
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
  // A new account has a profile (created by a trigger) but no language until the first-run screen.
  if (g.length === 0) return null;
  return preferencesSchema.parse({
    goals: g.map((row) => ({
      language: row.language,
      level: row.level,
      targetLevel: row.target_level,
      focus: row.focus,
      purpose: row.purpose,
      weight: row.weight,
      topics: row.topics,
      contentTypes: row.content_types,
    })),
    dailyMinutes: p.daily_minutes,
    difficulty: p.difficulty,
    generationTime: p.generation_time.slice(0, 5), // "HH:mm:ss" -> "HH:mm"
    timeZone: p.time_zone,
  });
}

/**
 * Repository backed by Supabase. `client` must act as `userId` (anon key + user
 * session), so Row Level Security applies on top of the explicit `user_id` filters below.
 * Every payload is mapped to the domain types and validated with the Zod schemas.
 * Calendar days written to the database always come from `getToday()` (the user's time zone).
 */
export function createSupabaseRepository(
  client: Client,
  userId: string,
  options: {
    contentPolicy?: ContentLicensePolicy;
    /** The user is a guest (anonymous account): the trial limit applies. */
    isGuest?: boolean;
    /**
     * Reserves a guest mission against the global cap on guests (service role, server only); false
     * when the cap is reached. Absent: no cap.
     */
    reserveGuestMission?: (userId: string, date: DateKey) => Promise<boolean>;
    /** Writes the mission of a day (service role, server only). Absent: preparing is not configured. */
    prepareMission?: (userId: string, date: DateKey) => Promise<GenerateMissionOutcome>;
    /** Swaps the content of a session for another readable one (service role, server only). Absent: not configured. */
    replaceSession?: (userId: string, sessionId: string) => Promise<ReplaceSessionOutcome>;
    /** Reviews a written production (service role, server only). Absent: reviews are off. */
    reviewWriting?: ((input: RequestWritingFeedbackInput) => Promise<WritingFeedbackOutcome>) | null;
  } = {},
): DailyLinguaRepository {
  const contentPolicy = options.contentPolicy ?? readContentLicensePolicy();

  const getPreferences = () => fetchPreferences(client, userId);

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
        `id, mission_date, budget_minutes, generation_meta,
         mission_sessions (
           id, position, language, questions, expressions, production,
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

    // The seed's missions have an empty trace: no source is shown for them.
    const meta = data.generation_meta as { source?: unknown } | null;
    const exerciseSource = generationMetaSchema.shape.source.safeParse(meta?.source);

    return missionSchema.parse({
      id: data.id,
      date: data.mission_date,
      budgetMinutes: data.budget_minutes,
      exerciseSource: exerciseSource.success ? exerciseSource.data : undefined,
      sessions: data.mission_sessions.map((s) => {
        const content = s.contents;
        if (!content?.sources) throw new Error(`Supabase (mission) : contenu manquant pour la session ${s.position}`);
        return {
          id: s.id,
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

  /** Days on which the guest got a mission, or null for a full account. */
  async function getGuestMissionDates(): Promise<DateKey[] | null> {
    if (!options.isGuest) return null;
    const { data, error } = await client
      .from("missions")
      .select("mission_date")
      .eq("user_id", userId)
      .eq("status", "ready");
    if (error) throw new Error(`Supabase (essai) : ${error.message}`);
    return data.map((row) => row.mission_date);
  }

  async function getGuestTrial(): Promise<GuestTrialStatus | null> {
    const dates = await getGuestMissionDates();
    return dates && guestTrialStatus(dates, await getToday());
  }

  async function prepareTodayMission(): Promise<PrepareMissionResult> {
    if (!options.prepareMission) {
      throw new UserFacingError("La préparation des missions n’est pas configurée sur ce serveur.");
    }
    // The trial limits are checked before the model is called.
    const today = await getToday();
    const guestDates = await getGuestMissionDates();
    if (guestDates) {
      if (!guestTrialStatus(guestDates, today).canStartToday) return { status: "signup-required" };
      // A mission already there stays reachable; only a new one counts against the global cap.
      const reserved =
        guestDates.includes(today) || !options.reserveGuestMission || (await options.reserveGuestMission(userId, today));
      if (!reserved) {
        throw new UserFacingError(
          "Trop de missions d’essai aujourd’hui. Réessaie demain, ou crée un compte pour continuer.",
        );
      }
    }
    const outcome = await options.prepareMission(userId, today);
    switch (outcome.status) {
      case "ready":
      case "pending":
      case "failed":
      case "no-content":
        return { status: outcome.status };
      case "no-preferences":
        throw new UserFacingError("Choisis d’abord tes langues.");
    }
  }

  async function replaceInaccessibleContent(sessionId: string): Promise<ReplaceContentResult> {
    if (!options.replaceSession) {
      throw new UserFacingError("Le remplacement de contenu n’est pas configuré sur ce serveur.");
    }
    // Read through RLS: this proves the session is the user’s before the service role acts on it.
    const { data: session, error: readError } = await client
      .from("mission_sessions")
      .select("content_id, missions!inner ( mission_date )")
      .eq("id", sessionId)
      .eq("user_id", userId)
      .maybeSingle();
    if (readError) throw new Error(`Supabase (session) : ${readError.message}`);
    if (!session) throw new UserFacingError("Cette session est introuvable.");
    // Only today's mission: the daily limit is per mission, so past ones would make it unbounded.
    if (session.missions.mission_date !== (await getToday())) {
      throw new UserFacingError("Seul le contenu de la mission du jour peut être remplacé.");
    }
    // Recorded first and kept whatever the outcome: the content is not proposed again, and the
    // rows tell the editor which contents cannot be read.
    const { error } = await client
      .from("content_refusals")
      .upsert(
        { user_id: userId, content_id: session.content_id, reason: "no_access" },
        { onConflict: "user_id,content_id", ignoreDuplicates: true },
      );
    if (error) throw new Error(`Supabase (contenu refusé) : ${error.message}`);

    const outcome = await options.replaceSession(userId, sessionId);
    switch (outcome.status) {
      case "ready":
      case "no-content":
      case "limit":
        return { status: outcome.status };
      case "in-progress":
        throw new UserFacingError("Un remplacement de ce contenu est déjà en cours.");
      case "not-found":
        throw new UserFacingError("Cette session est introuvable.");
      case "failed":
        throw new UserFacingError("Impossible de remplacer ce contenu pour le moment. Réessaie dans un instant.");
    }
  }

  async function getHistory(): Promise<MissionHistoryEntry[]> {
    const today = await getToday();
    // Missions (today's included) on which at least one activity was completed, most recent first.
    const missions = unwrap(
      await client
        .from("mission_stats")
        .select("mission_id, mission_date, budget_minutes, completed_minutes")
        .eq("user_id", userId)
        .eq("status", "ready")
        .gt("completed_activities", 0)
        .lte("mission_date", today)
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
           quiz_answers ( is_correct ),
           production_entries ( body ),
           writing_feedback ( feedback )`,
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
        // Estimated minutes of completed activities, like the mission screen (not measured time).
        completedMinutes: m.completed_minutes ?? 0,
        sessions: sessions
          .filter((s) => s.mission_id === m.mission_id)
          .map((s) => ({
            language: s.language,
            title: s.contents?.title,
            sourceName: s.contents?.sources?.name,
            url: s.contents?.url,
            type: s.contents?.content_type,
            writing: s.production_entries[0]?.body || undefined,
            feedback: storedFeedback(s.writing_feedback[0]?.feedback),
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
    return rows.map(toVocabularyItem);
  }

  async function getAccountEmail(): Promise<string | null> {
    const { data } = await client.auth.getUser();
    return data.user?.email ?? null;
  }

  async function savePreferences(preferences: Preferences): Promise<void> {
    const { error } = await client.rpc("save_preferences", {
      p_daily_minutes: preferences.dailyMinutes,
      // Topics and formats travel per language; the profile's own columns are left as they are.
      p_topics: null,
      p_content_types: null,
      p_difficulty: preferences.difficulty,
      p_generation_time: preferences.generationTime,
      p_time_zone: preferences.timeZone,
      p_goals: preferences.goals.map((g) => ({
        language: g.language,
        level: g.level,
        target_level: g.targetLevel,
        focus: g.focus,
        purpose: g.purpose,
        weight: g.weight,
        topics: g.topics,
        content_types: g.contentTypes,
      })),
    });
    if (error) throw new Error(`Supabase (préférences) : ${error.message}`);
  }

  async function getMissionProgress(mission: Mission): Promise<MissionProgress> {
    const activityIds = mission.sessions.flatMap((s) => s.activities.map((a) => a.id));
    const sessionIds = mission.sessions.map((s) => s.id);
    const terms = mission.sessions.flatMap((s) => s.expressions.map((e) => e.text));

    const [done, answers, words, entries, reviews] = await Promise.all([
      client
        .from("activity_progress")
        .select("activity_id")
        .eq("user_id", userId)
        .in("activity_id", activityIds)
        .not("completed_at", "is", null),
      client
        .from("quiz_answers")
        .select("session_id, question_id, selected_index")
        .eq("user_id", userId)
        .in("session_id", sessionIds),
      client.from("vocabulary_items").select("language, term").eq("user_id", userId).in("term", terms),
      client.from("production_entries").select("session_id, body").eq("user_id", userId).in("session_id", sessionIds),
      client
        .from("writing_feedback")
        .select("session_id, attempts, body, feedback")
        .eq("user_id", userId)
        .in("session_id", sessionIds),
    ]);

    const answersBySession: Record<string, Record<string, number>> = {};
    for (const a of unwrap(answers, "réponses")) {
      (answersBySession[a.session_id] ??= {})[a.question_id] = a.selected_index;
    }
    const wordKey = (language: string, term: string) => `${language}|${term}`;
    const known = new Set(unwrap(words, "mots enregistrés").map((w) => wordKey(w.language, w.term)));

    return missionProgressSchema.parse({
      completedActivityIds: unwrap(done, "progression").map((p) => p.activity_id),
      answers: answersBySession,
      drafts: Object.fromEntries(unwrap(entries, "textes écrits").map((e) => [e.session_id, e.body])),
      writingReviews: Object.fromEntries(
        unwrap(reviews, "corrections").map((r): [string, WritingReviewState] => {
          const feedback = storedFeedback(r.feedback) ?? null;
          return [
            r.session_id,
            {
              feedback,
              reviewedText: feedback ? r.body : null,
              attemptsLeft: Math.max(0, WRITING_FEEDBACK_LIMITS.attemptsPerSession - r.attempts),
            },
          ];
        }),
      ),
      savedExpressionIds: mission.sessions.flatMap((s) =>
        s.expressions.filter((e) => known.has(wordKey(s.language, e.text))).map((e) => e.id),
      ),
    });
  }

  async function setActivityDone(activityId: string, done: boolean): Promise<void> {
    // started_at / completed_at of the mission follow from this row (database trigger).
    const { error } = await client.from("activity_progress").upsert(
      { activity_id: activityId, user_id: userId, completed_at: done ? new Date().toISOString() : null },
      { onConflict: "activity_id" },
    );
    if (error) throw new Error(`Supabase (activité) : ${error.message}`);
  }

  async function answerQuestion(sessionId: string, questionId: string, selectedIndex: number): Promise<void> {
    // The first answer counts: a repeated request is ignored. Correctness is graded by the database.
    const { error } = await client
      .from("quiz_answers")
      .upsert(
        { session_id: sessionId, user_id: userId, question_id: questionId, selected_index: selectedIndex },
        { onConflict: "session_id,question_id", ignoreDuplicates: true },
      );
    if (error) throw new Error(`Supabase (réponse) : ${error.message}`);
  }

  async function saveProduction(sessionId: string, body: string): Promise<void> {
    // No text left: nothing to keep.
    const { error } = body.trim()
      ? await client.from("production_entries").upsert({ session_id: sessionId, user_id: userId, body }, { onConflict: "session_id" })
      : await client.from("production_entries").delete().eq("session_id", sessionId).eq("user_id", userId);
    if (error) throw new Error(`Supabase (production écrite) : ${error.message}`);
  }

  /**
   * Finishes the written production and asks for its review. The text is saved and the writing
   * step ticked first, so that a failed or slow review never leaves the task undone.
   */
  async function requestWritingFeedback(sessionId: string, body: string): Promise<WritingFeedbackResult> {
    await saveProduction(sessionId, body);
    const activities = unwrap(
      await client
        .from("mission_activities")
        .select("id")
        .eq("session_id", sessionId)
        .eq("user_id", userId)
        .eq("kind", "writing"),
      "étape d’écriture",
    );
    await Promise.all(activities.map((a) => setActivityDone(a.id, true)));

    if (!options.reviewWriting) return { status: "unavailable", attemptsLeft: 0 };
    let outcome: WritingFeedbackOutcome;
    try {
      outcome = await options.reviewWriting({ userId, sessionId, body, today: await getToday() });
    } catch (error) {
      console.error(error);
      return { status: "unavailable", attemptsLeft: 0 };
    }
    switch (outcome.status) {
      case "not-found":
        throw new UserFacingError("Cette session est introuvable.");
      case "not-writing":
        throw new UserFacingError("Seule la production écrite peut être corrigée.");
      case "expired":
        throw new UserFacingError("La correction n’est possible que le jour de la mission.");
      default:
        return outcome;
    }
  }

  /** Review state and "added" day of a new word, all derived from the user's today. */
  function initialDates(today: DateKey) {
    const review = initialReviewState(today);
    return { box: review.box, due_on: review.dueOn, review_count: review.reviewCount, added_on: today };
  }

  async function saveExpression(sessionId: string, expressionId: string): Promise<void> {
    const { data, error } = await client
      .from("mission_sessions")
      .select("language, expressions, content_id, contents ( url, sources ( name ) )")
      .eq("id", sessionId)
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw new Error(`Supabase (expression) : ${error.message}`);
    if (!data) throw new UserFacingError("Cette session n’existe plus.");

    const expression = z.array(expressionSchema).parse(data.expressions).find((e) => e.id === expressionId);
    if (!expression) throw new UserFacingError("Cette expression n’existe plus.");

    const today = await getToday();
    const sourceName = data.contents?.sources?.name;
    const { error: insertError } = await client.from("vocabulary_items").insert({
      user_id: userId,
      language: data.language,
      term: expression.text,
      translation: expression.translation,
      definition: expression.note ?? null,
      example: expression.example,
      source_name: sourceName ?? null,
      source_url: sourceName ? (data.contents?.url ?? null) : null,
      content_id: data.content_id,
      ...initialDates(today),
    });
    // Already in the vocabulary: nothing to do.
    if (insertError && insertError.code !== UNIQUE_VIOLATION) {
      throw new Error(`Supabase (expression) : ${insertError.message}`);
    }
  }

  async function addVocabulary(input: NewVocabularyInput): Promise<VocabularyItem> {
    const today = await getToday();
    const { data, error } = await client
      .from("vocabulary_items")
      .insert({
        user_id: userId,
        language: input.language,
        term: input.term,
        translation: input.translation,
        definition: input.definition ?? null,
        example: input.example ?? null,
        source_name: input.sourceName ?? null,
        ...initialDates(today),
      })
      .select("*")
      .single();
    if (error?.code === UNIQUE_VIOLATION) throw new UserFacingError("Ce mot est déjà dans ta liste.");
    return toVocabularyItem(unwrap({ data, error }, "ajout du mot"));
  }

  async function reviewVocabulary(input: ReviewInput): Promise<VocabularyItem> {
    const { data: row, error } = await client
      .from("vocabulary_items")
      .select("*")
      .eq("id", input.id)
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw new Error(`Supabase (révision) : ${error.message}`);
    if (!row) throw new UserFacingError("Ce mot n’existe plus.");

    const item = toVocabularyItem(row);
    const today = await getToday();
    const next = applyReview(item.review, input.grade, today);
    const { data: applied, error: rpcError } = await client.rpc("record_vocabulary_review", {
      p_item_id: item.id,
      p_grade: input.grade,
      p_reviewed_on: today,
      p_box_after: next.box,
      p_due_on_after: next.dueOn,
      p_expected_review_count: input.expectedReviewCount,
    });
    if (rpcError) throw new Error(`Supabase (révision) : ${rpcError.message}`);
    if (!applied) throw new UserFacingError("Ce mot a déjà été révisé ailleurs. Recharge la page.");
    return { ...item, review: next };
  }

  async function setVocabularyStatus(id: string, status: VocabularyItem["status"]): Promise<void> {
    const { data, error } = await client
      .from("vocabulary_items")
      .update({ status })
      .eq("id", id)
      .eq("user_id", userId)
      .select("id");
    if (error) throw new Error(`Supabase (statut du mot) : ${error.message}`);
    if (data.length === 0) throw new UserFacingError("Ce mot n’existe plus.");
  }

  async function deleteVocabulary(id: string): Promise<void> {
    const { error } = await client.from("vocabulary_items").delete().eq("id", id).eq("user_id", userId);
    if (error) throw new Error(`Supabase (suppression du mot) : ${error.message}`);
  }

  async function sendFeedback(input: FeedbackInput): Promise<void> {
    const { error } = await client.from("feedback").insert({
      user_id: userId,
      category: input.category,
      message: input.message,
      page: input.page ?? null,
      app_version: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? null,
    });
    if (error?.code === FEEDBACK_RATE_LIMIT_SQLSTATE) throw new UserFacingError(FEEDBACK_RATE_LIMIT_MESSAGE);
    if (error) throw new Error(`Supabase (retour) : ${error.message}`);
  }

  async function listPlacementTests(): Promise<PlacementSummary[]> {
    // Newest first: the first row met for a language is its latest test.
    const rows = unwrap(
      await client
        .from("placement_tests")
        .select("language, status, estimated_level, confidence, chosen_level, taken_at")
        .eq("user_id", userId)
        .order("taken_at", { ascending: false }),
      "tests de niveau",
    );
    const studied = unwrap(await client.from("user_languages").select("language").eq("user_id", userId), "langues");
    const languages = new Set(studied.map((l) => l.language));
    const latest = new Map<string, (typeof rows)[number]>();
    for (const row of rows) if (languages.has(row.language) && !latest.has(row.language)) latest.set(row.language, row);
    return [...latest.values()].map((row) =>
      placementSummarySchema.parse({
        status: row.status,
        language: row.language,
        estimatedLevel: row.estimated_level ?? undefined,
        confidence: row.confidence ?? undefined,
        chosenLevel: row.chosen_level ?? undefined,
        takenAt: row.taken_at,
      }),
    );
  }

  async function recordPlacementTest(record: PlacementRecord): Promise<void> {
    const { error } = await client.rpc(
      "record_placement_test",
      record.status === "completed"
        ? {
            p_language: record.language,
            p_status: record.status,
            p_start_level: record.startLevel,
            p_estimated_level: record.estimatedLevel,
            p_confidence: record.confidence,
            p_chosen_level: record.chosenLevel,
            p_answers: record.answers,
            p_bank_version: record.bankVersion,
          }
        : { p_language: record.language, p_status: record.status },
    );
    if (error?.code === NO_DATA_FOUND) throw new UserFacingError("Cette langue ne fait pas partie de tes langues.");
    if (error) throw new Error(`Supabase (test de niveau) : ${error.message}`);
  }

  async function listContents(languages: Language[], perLanguage: number): Promise<ContentListItem[]> {
    const lists = await Promise.all(
      languages.map(async (language) => {
        let query = client
          .from("contents")
          .select(
            `id, language, content_type, title, url, difficulty, duration_minutes, summary, author, published_at,
             sources!inner ( ${SOURCE_COLUMNS} )`,
          )
          .eq("language", language)
          .neq("url_status", "broken")
          // Only feed sources still in the catalogue: the demo seed's hand-made rows are not shown.
          .eq("sources.active", true)
          .not("sources.key", "is", null);
        if (contentPolicy === "commercial") query = query.eq("sources.commercial_use", true);
        const { data, error } = await query
          .order("published_at", { ascending: false, nullsFirst: false })
          .limit(perLanguage);
        if (error) throw new Error(`Supabase (contenus) : ${error.message}`);
        return data;
      }),
    );
    return lists.flat().map((row) => {
      const source = toSourceInfo(row.sources);
      return contentListItemSchema.parse({
        id: row.id,
        language: row.language,
        type: row.content_type,
        title: row.title,
        url: row.url,
        difficulty: row.difficulty,
        durationMinutes: row.duration_minutes,
        summary: row.summary,
        author: row.author ?? undefined,
        publishedAt: row.published_at,
        source: { name: source.name, homepage: source.homepage, access: source.access, license: source.license },
      });
    });
  }

  async function listSources(): Promise<SourceInfo[]> {
    let query = client.from("sources").select(SOURCE_COLUMNS).eq("active", true).not("key", "is", null);
    if (contentPolicy === "commercial") query = query.eq("commercial_use", true);
    const { data, error } = await query.order("language").order("name");
    if (error) throw new Error(`Supabase (sources) : ${error.message}`);
    return data.map(toSourceInfo);
  }

  async function listPaidSources(): Promise<PaidSource[]> {
    const preferences = await getPreferences();
    const languages = preferences?.goals.map((g) => g.language) ?? [];
    if (languages.length === 0) return [];
    let query = client
      .from("sources")
      .select("id, name, homepage_url, language, access")
      .eq("active", true)
      .not("key", "is", null)
      .in("access", ["metered", "paywalled"])
      .in("language", languages);
    if (contentPolicy === "commercial") query = query.eq("commercial_use", true);
    const [sources, declared] = await Promise.all([
      query,
      client.from("user_source_access").select("source_id").eq("user_id", userId),
    ]);
    const rows = unwrap(sources, "sources payantes");
    const declaredIds = new Set(unwrap(declared, "sources déclarées").map((r) => r.source_id));
    const paid = rows.map((row) =>
      paidSourceSchema.parse({
        id: row.id,
        name: row.name,
        homepage: row.homepage_url,
        language: row.language,
        access: row.access,
        declared: declaredIds.has(row.id),
      }),
    );
    return paid.sort(
      (a, b) => LANGUAGE_CODES.indexOf(a.language) - LANGUAGE_CODES.indexOf(b.language) || a.name.localeCompare(b.name),
    );
  }

  async function setSourceAccess(sourceId: string, hasAccess: boolean): Promise<void> {
    // Only an active paid source can be declared: free ones are readable by everyone.
    const { data: source, error: lookupError } = await client
      .from("sources")
      .select("id")
      .eq("id", sourceId)
      .eq("active", true)
      .in("access", ["metered", "paywalled"])
      .maybeSingle();
    if (lookupError) throw new Error(`Supabase (source) : ${lookupError.message}`);
    if (!source) throw new UserFacingError("Cette source n’existe pas ou n’est pas payante.");
    if (hasAccess) {
      const { error } = await client.from("user_source_access").insert({ user_id: userId, source_id: sourceId });
      if (error && error.code !== UNIQUE_VIOLATION) throw new Error(`Supabase (accès à la source) : ${error.message}`);
      return;
    }
    const { error } = await client
      .from("user_source_access")
      .delete()
      .eq("user_id", userId)
      .eq("source_id", sourceId);
    if (error) throw new Error(`Supabase (accès à la source) : ${error.message}`);
  }

  return {
    isDemo: false,
    isGuest: Boolean(options.isGuest),
    getGuestTrial,
    getAccountEmail,
    getToday,
    getPreferences,
    savePreferences,
    getMission,
    getMissionProgress,
    prepareTodayMission,
    replaceInaccessibleContent,
    setActivityDone,
    answerQuestion,
    saveProduction,
    canReviewWriting: Boolean(options.reviewWriting),
    requestWritingFeedback,
    saveExpression,
    getHistory,
    getStudyDates,
    listVocabulary,
    addVocabulary,
    reviewVocabulary,
    setVocabularyStatus,
    deleteVocabulary,
    listPlacementTests,
    recordPlacementTest,
    sendFeedback,
    listContents,
    listSources,
    listPaidSources,
    setSourceAccess,
    // From the catalogue, not the database: a language is offered even before the first ingestion.
    listAvailableLanguages: async () => availableLanguages(SOURCE_CATALOG, contentPolicy),
  };
}
