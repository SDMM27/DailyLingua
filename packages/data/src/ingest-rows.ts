import { storedSessionPlanSchema, type DateKey } from "@dailylingua/schemas";
import { appSchema, type AppClient } from "./client";
import { DataError } from "./errors";
import { chunks, distinct, fetchAll, inChunks, unwrap, unwrapRows } from "./query";

/**
 * What `apps/web/src/lib/ingest` needs to decide a batch of events (`j2-pr1-lot-w.md` section 3): typed, camelCase
 * rows, not the `IngestState` of `@dailylingua/core` (this package never imports core). Every function takes a
 * SERVICE client and an explicit `userId`, never read from a request body; the filters below say which rows are
 * deliberately read without a user filter (to let `planIngest` answer `foreign_session` / `unknown_card`).
 */

/** Ids found in the delivered events, collected without trusting their shape (strings only). */
export interface IngestRefs {
  sessionIds: readonly string[];
  cardIds: readonly string[];
  textIds: readonly string[];
  productionIds: readonly string[];
  deviceIds: readonly string[];
  clientEventIds: readonly string[];
}

/** Learning days (included) whose sessions of the user are read: server day - 8 to + 1. */
export interface DayWindow {
  from: DateKey;
  to: DateKey;
}

export interface ProfileRow {
  timeZone: string;
  createdAt: string;
  gameSettings: unknown;
}

export interface EnrollmentRow {
  language: string;
  dailyMinutes: number;
}

export interface SkillEstimateRow {
  language: string;
  skill: string;
  levelValue: number;
}

export interface SessionStepRow {
  step: string;
  validatedAt: string | null;
  proof: unknown;
}

export interface SessionRow {
  id: string;
  userId: string;
  language: string;
  day: DateKey;
  kind: string;
  format: number;
  status: string;
  servedAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  /** `session.plan` as stored: read it with `storedSessionPlanSchema`. */
  plan: unknown;
  steps: SessionStepRow[];
}

export interface ItemRow {
  id: string;
  textId: string;
  step: string;
  kind: string;
  position: number;
  prompt: unknown;
  listeningOnly: boolean;
  /** The answer key (`text_item_key`), or null when the item has none. */
  key: { answer: unknown; accept: unknown } | null;
}

export interface TextRow {
  id: string;
  language: string;
  wordCount: number;
  body: string;
}

export interface CardRow {
  id: string;
  userId: string;
  language: string;
  kind: string;
  state: string;
  stability: number | null;
  difficulty: number | null;
  dueAt: string;
  lastReviewAt: string | null;
  reps: number;
  lapses: number;
  front: string;
  back: string | null;
  backLanguage: string | null;
  context: string | null;
  payload: unknown;
  /** The last `review_log` line of the card (instant and rating), or null. */
  lastReview: { reviewedAt: string; rating: number } | null;
}

export interface LearningDayRow {
  day: DateKey;
  timeZone: string;
  xpVerified: number;
  validated: boolean;
  cause: string;
  firstActivityAt: string | null;
}

export interface SettingChangeRow {
  key: string;
  value: unknown;
  effectiveDay: DateKey;
  changedAt: string;
}

export interface TimeZoneChangeRow {
  effectiveAt: string;
  timeZone: string;
}

export interface DeviceCursorRow {
  deviceId: string;
  lastSeq: number;
  lastDay: DateKey;
}

export interface ProductionRow {
  id: string;
  sessionId: string | null;
  language: string;
  text: string;
  clientEventId: string | null;
  createdAt: string;
}

export interface IngestRows {
  profile: ProfileRow;
  enrollments: EnrollmentRow[];
  skillEstimates: SkillEstimateRow[];
  sessions: SessionRow[];
  items: ItemRow[];
  texts: TextRow[];
  cards: CardRow[];
  learningDays: LearningDayRow[];
  settingChanges: SettingChangeRow[];
  timezoneChanges: TimeZoneChangeRow[];
  deviceCursors: DeviceCursorRow[];
  /** `streak_state.time_zone_changed_at`; `streak` is false for an account without a `streak_state` row. */
  streak: { timeZoneChangedAt: string | null } | null;
  /** Ids of the texts (among the texts read above) the learner has read. */
  textReads: string[];
  /** `client_event_id` already ingested; the fingerprint (null when unknown) tells a replay from a reuse. */
  knownEvents: Record<string, string | null>;
  /** `language|kind|lower(front)` of the learner's cards, in the languages of the sessions read. */
  cardFronts: string[];
  /** The last 30 productions' texts, newest first. */
  recentProductionTexts: string[];
  /** Productions referenced by the events or the memo. */
  productions: ProductionRow[];
  ingestState: { seq: number; memo: unknown };
}

const SESSION_COLUMNS = "id, user_id, language, day, kind, format, status, served_at, started_at, completed_at, plan";
const CARD_COLUMNS = "id, user_id, language, kind, state, stability, difficulty, due_at, last_review_at, reps, lapses, front, back, back_language, context, payload";

type SessionColumns = {
  id: string;
  user_id: string;
  language: string;
  day: string;
  kind: string;
  format: number;
  status: string;
  served_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  plan: unknown;
};

export function toSessionRow(row: SessionColumns, steps: SessionStepRow[] = []): SessionRow {
  return {
    id: row.id,
    userId: row.user_id,
    language: row.language,
    day: row.day,
    kind: row.kind,
    format: row.format,
    status: row.status,
    servedAt: row.served_at,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    plan: row.plan,
    steps,
  };
}

type CardColumns = {
  id: string;
  user_id: string;
  language: string;
  kind: string;
  state: string;
  stability: number | null;
  difficulty: number | null;
  due_at: string;
  last_review_at: string | null;
  reps: number;
  lapses: number;
  front: string;
  back: string | null;
  back_language: string | null;
  context: string | null;
  payload: unknown;
};

export function toCardRow(row: CardColumns, lastReview: CardRow["lastReview"] = null): CardRow {
  return {
    id: row.id,
    userId: row.user_id,
    language: row.language,
    kind: row.kind,
    state: row.state,
    stability: row.stability === null ? null : Number(row.stability),
    difficulty: row.difficulty === null ? null : Number(row.difficulty),
    dueAt: row.due_at,
    lastReviewAt: row.last_review_at,
    reps: row.reps,
    lapses: row.lapses,
    front: row.front,
    back: row.back,
    backLanguage: row.back_language,
    context: row.context,
    payload: row.payload,
    lastReview,
  };
}

/** The profile row and the active enrollments of a user: what the session route needs first. */
export async function readProfileAndEnrollments(client: AppClient, userId: string): Promise<{ profile: ProfileRow; enrollments: EnrollmentRow[] }> {
  const db = appSchema(client);
  const [profile, enrollments] = await Promise.all([
    db.from("profile").select("time_zone, created_at, game_settings").eq("user_id", userId).maybeSingle(),
    db.from("enrollment").select("language, daily_minutes").eq("user_id", userId).eq("active", true).order("position").order("language"),
  ]);
  const profileRow = unwrap(profile);
  if (!profileRow) throw new DataError("not_found");
  return {
    profile: { timeZone: profileRow.time_zone, createdAt: profileRow.created_at, gameSettings: profileRow.game_settings },
    enrollments: unwrapRows(enrollments).map((row) => ({ language: row.language, dailyMinutes: row.daily_minutes })),
  };
}

/** `session_step` rows grouped by session. */
async function readSteps(client: AppClient, sessionIds: readonly string[], userId: string): Promise<Map<string, SessionStepRow[]>> {
  const rows = await inChunks(sessionIds, (chunk) =>
    appSchema(client).from("session_step").select("session_id, step, validated_at, proof").eq("user_id", userId).in("session_id", chunk),
  );
  const bySession = new Map<string, SessionStepRow[]>();
  for (const row of rows) {
    const list = bySession.get(row.session_id) ?? [];
    list.push({ step: row.step, validatedAt: row.validated_at, proof: row.proof });
    bySession.set(row.session_id, list);
  }
  return bySession;
}

/**
 * The sessions the batch refers to (WITHOUT a user filter: a session of another learner must reach `planIngest`
 * as a foreign one) and the user's own sessions of the window, with their steps (steps are read for the user's
 * sessions only: a foreign session needs none).
 */
async function readSessions(client: AppClient, userId: string, refs: IngestRefs, window: DayWindow): Promise<SessionRow[]> {
  const db = appSchema(client);
  const [referenced, windowed] = await Promise.all([
    inChunks(refs.sessionIds, (chunk) => db.from("session").select(SESSION_COLUMNS).in("id", chunk)),
    fetchAll((from, to) => db.from("session").select(SESSION_COLUMNS).eq("user_id", userId).gte("day", window.from).lte("day", window.to).order("id").range(from, to)),
  ]);
  const byId = new Map<string, SessionColumns>();
  for (const row of [...referenced, ...windowed]) byId.set(row.id, row);
  const own = [...byId.values()].filter((row) => row.user_id === userId);
  const steps = await readSteps(client, own.map((row) => row.id), userId);
  return [...byId.values()].map((row) => toSessionRow(row, steps.get(row.id) ?? [])).sort((a, b) => (a.id < b.id ? -1 : 1));
}

/** Ids of the items and the text a stored plan names (an unreadable plan names nothing). */
function planRefs(plan: unknown): { itemIds: string[]; textId: string | null } {
  const parsed = storedSessionPlanSchema.safeParse(plan);
  if (!parsed.success) return { itemIds: [], textId: null };
  return { itemIds: [...parsed.data.reading.itemIds, ...parsed.data.workshop.itemIds], textId: parsed.data.reading.textId };
}

export async function readItems(client: AppClient, itemIds: readonly string[]): Promise<ItemRow[]> {
  const db = appSchema(client);
  const [items, keys] = await Promise.all([
    inChunks(itemIds, (chunk) => db.from("text_item").select("id, text_id, step, kind, position, prompt, listening_only").in("id", chunk)),
    inChunks(itemIds, (chunk) => db.from("text_item_key").select("item_id, answer, accept").in("item_id", chunk)),
  ]);
  const keyById = new Map(keys.map((key) => [key.item_id, { answer: key.answer, accept: key.accept }]));
  return items
    .map((item) => ({
      id: item.id,
      textId: item.text_id,
      step: item.step,
      kind: item.kind,
      position: item.position,
      prompt: item.prompt,
      listeningOnly: item.listening_only,
      key: keyById.get(item.id) ?? null,
    }))
    .sort((a, b) => a.position - b.position || (a.id < b.id ? -1 : 1));
}

export async function readTexts(client: AppClient, textIds: readonly string[]): Promise<TextRow[]> {
  const rows = await inChunks(textIds, (chunk) => appSchema(client).from("text").select("id, language, word_count, body").in("id", chunk));
  return rows.map((row) => ({ id: row.id, language: row.language, wordCount: row.word_count, body: row.body }));
}

/** The last review of each card of the user, from `review_log` (newest first, paged until every card has one). */
async function readLastReviews(client: AppClient, userId: string, cardIds: readonly string[]): Promise<Map<string, { reviewedAt: string; rating: number }>> {
  const wanted = new Set(cardIds);
  const found = new Map<string, { reviewedAt: string; rating: number }>();
  if (wanted.size === 0) return found;
  for (const chunk of chunks([...wanted])) {
    for (let from = 0; ; from += 1000) {
      const rows = unwrapRows(
        await appSchema(client)
          .from("review_log")
          .select("card_id, rating, reviewed_at")
          .eq("user_id", userId)
          .in("card_id", chunk)
          .order("reviewed_at", { ascending: false })
          .order("id", { ascending: false })
          .range(from, from + 999),
      );
      for (const row of rows) if (!found.has(row.card_id)) found.set(row.card_id, { reviewedAt: row.reviewed_at, rating: row.rating });
      // Every card of the chunk has a last review (or there is nothing more to read): stop.
      if (rows.length < 1000 || chunk.every((id) => found.has(id))) break;
    }
  }
  return found;
}

/** Ingested events: the ledger (with fingerprint), then, without one, the events that left a row of their own. */
async function readKnownEvents(client: AppClient, userId: string, clientEventIds: readonly string[]): Promise<Record<string, string | null>> {
  const db = appSchema(client);
  const ledger = await inChunks(clientEventIds, (chunk) => db.from("ingest_event").select("client_event_id, fingerprint").eq("user_id", userId).in("client_event_id", chunk));
  const known: Record<string, string | null> = {};
  for (const row of ledger) known[row.client_event_id] = row.fingerprint;
  const tables = ["attempt", "review_log", "production", "rewrite", "ui_event"] as const;
  const others = await Promise.all(
    tables.map((table) => inChunks(clientEventIds, (chunk) => db.from(table).select("client_event_id").eq("user_id", userId).in("client_event_id", chunk))),
  );
  for (const rows of others) for (const row of rows) if (row.client_event_id !== null && !Object.hasOwn(known, row.client_event_id)) known[row.client_event_id] = null;
  return known;
}

/**
 * Reads, in grouped queries (no query per event), everything `planIngest` needs for these refs. `window` bounds the
 * user's own sessions; the learning days, setting and time zone journals are read whole.
 */
export async function readIngestRows(client: AppClient, userId: string, refs: IngestRefs, window: DayWindow): Promise<IngestRows> {
  const db = appSchema(client);
  const { profile, enrollments } = await readProfileAndEnrollments(client, userId);

  const sessions = await readSessions(client, userId, refs, window);
  const own = sessions.filter((session) => session.userId === userId);
  const plans = own.map((session) => planRefs(session.plan));
  const itemIds = distinct(plans.flatMap((plan) => plan.itemIds));
  const textIds = distinct([...plans.flatMap((plan) => (plan.textId ? [plan.textId] : [])), ...refs.textIds]);
  const languages = distinct(sessions.map((session) => session.language));

  const [
    skills,
    items,
    texts,
    cardRows,
    learningDays,
    settingChanges,
    timezoneChanges,
    deviceCursors,
    streak,
    knownEvents,
    cardFronts,
    recentProductions,
    productions,
    ingestState,
  ] = await Promise.all([
    db.from("skill_estimate").select("language, skill, level_value").eq("user_id", userId),
    readItems(client, itemIds),
    readTexts(client, textIds),
    // WITHOUT a user filter: a card of another learner must reach `planIngest` as `unknown_card`. A deleted card does not exist.
    inChunks(refs.cardIds, (chunk) => db.from("card").select(CARD_COLUMNS).is("deleted_at", null).in("id", chunk)),
    fetchAll((from, to) => db.from("learning_day").select("day, time_zone, xp_verified, validated, cause, first_activity_at").eq("user_id", userId).order("day").range(from, to)),
    fetchAll((from, to) => db.from("setting_change").select("key, value, effective_day, changed_at").eq("user_id", userId).order("id").range(from, to)),
    fetchAll((from, to) => db.from("timezone_change").select("effective_at, time_zone").eq("user_id", userId).order("id").range(from, to)),
    inChunks(refs.deviceIds, (chunk) => db.from("device_cursor").select("device_id, last_seq, last_day").eq("user_id", userId).in("device_id", chunk)),
    db.from("streak_state").select("time_zone_changed_at").eq("user_id", userId).maybeSingle(),
    readKnownEvents(client, userId, refs.clientEventIds),
    languages.length === 0
      ? Promise.resolve([] as { language: string; kind: string; front: string }[])
      : fetchAll((from, to) => db.from("card").select("language, kind, front").eq("user_id", userId).is("deleted_at", null).in("language", languages).order("id").range(from, to)),
    db.from("production").select("text").eq("user_id", userId).order("created_at", { ascending: false }).order("id", { ascending: false }).limit(30),
    inChunks(refs.productionIds, (chunk) => db.from("production").select("id, session_id, language, text, client_event_id, created_at").eq("user_id", userId).in("id", chunk)),
    db.from("ingest_state").select("seq, memo").eq("user_id", userId).maybeSingle(),
  ]);

  const ownCardIds = cardRows.filter((row) => row.user_id === userId).map((row) => row.id);
  const [lastReviews, reads] = await Promise.all([
    readLastReviews(client, userId, ownCardIds),
    inChunks(texts.map((text) => text.id), (chunk) => db.from("text_read").select("text_id").eq("user_id", userId).in("text_id", chunk)),
  ]);

  const streakRow = unwrap(streak);
  const stateRow = unwrap(ingestState);
  return {
    profile,
    enrollments,
    skillEstimates: unwrapRows(skills).map((row) => ({ language: row.language, skill: row.skill, levelValue: Number(row.level_value) })),
    sessions,
    items,
    texts,
    cards: cardRows.map((row) => toCardRow(row, lastReviews.get(row.id) ?? null)),
    learningDays: learningDays.map((row) => ({ day: row.day, timeZone: row.time_zone, xpVerified: row.xp_verified, validated: row.validated, cause: row.cause, firstActivityAt: row.first_activity_at })),
    settingChanges: settingChanges.map((row) => ({ key: row.key, value: row.value, effectiveDay: row.effective_day, changedAt: row.changed_at })),
    timezoneChanges: timezoneChanges.map((row) => ({ effectiveAt: row.effective_at, timeZone: row.time_zone })),
    deviceCursors: deviceCursors.map((row) => ({ deviceId: row.device_id, lastSeq: Number(row.last_seq), lastDay: row.last_day ?? "1970-01-01" })),
    streak: streakRow ? { timeZoneChangedAt: streakRow.time_zone_changed_at } : null,
    textReads: reads.map((row) => row.text_id),
    knownEvents,
    cardFronts: cardFronts.map((row) => `${row.language}|${row.kind}|${row.front.toLowerCase()}`),
    recentProductionTexts: unwrapRows(recentProductions).map((row) => row.text),
    productions: productions.map((row) => ({ id: row.id, sessionId: row.session_id, language: row.language, text: row.text, clientEventId: row.client_event_id, createdAt: row.created_at })),
    ingestState: { seq: stateRow ? Number(stateRow.seq) : 0, memo: stateRow ? stateRow.memo : {} },
  };
}
