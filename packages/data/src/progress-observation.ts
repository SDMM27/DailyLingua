import { storedSessionPlanSchema } from "@dailylingua/schemas";
import { appSchema, type AppClient } from "./client";
import type { ProgressPilotLanguage } from "./progress-overview";
import { chunks, fetchAll, inChunks, unwrapRows } from "./query";

export type ObservationScope = {
  userId: string;
  language: ProgressPilotLanguage;
  fromDay: string;
  throughDay: string;
  through: string;
};

const MAX_ATTEMPTS = 10_000;

/** Read only the accepted evidence for one account, one enrolled language and one observation window. */
export async function loadProgressObservation(client: AppClient, scope: ObservationScope) {
  const { userId, language, fromDay, throughDay, through } = scope;
  const db = appSchema(client);
  const [sessionRows, rewardRows] = await Promise.all([
    fetchAll((from, to) => db.from("session").select("id, day, plan")
      .eq("user_id", userId).eq("language", language).eq("kind", "daily")
      .gte("day", fromDay).lte("day", throughDay).lte("created_at", through)
      .order("id").range(from, to), MAX_ATTEMPTS),
    fetchAll((from, to) => db.from("xp_ledger").select("review_log_id, day")
      .eq("user_id", userId).eq("language", language).eq("reason", "review.production")
      .gte("amount", 1).not("review_log_id", "is", null)
      .gte("day", fromDay).lte("day", throughDay).lte("created_at", through)
      .order("id").range(from, to), MAX_ATTEMPTS),
  ]);

  const sessions = sessionRows.flatMap(({ id, day, plan }) => {
    const parsed = storedSessionPlanSchema.safeParse(plan);
    const reading = parsed.success ? parsed.data.reading : undefined;
    return reading?.textId ? [{ id, day, textId: reading.textId, itemIds: reading.itemIds }] : [];
  });
  const rewardDays = new Map(rewardRows.flatMap((row) => row.review_log_id === null ? [] : [[row.review_log_id, row.day] as const]));
  const [items, attempts, reviews] = await Promise.all([
    inChunks(sessions.flatMap((session) => session.itemIds), (ids) => db.from("text_item")
      .select("id, text_id").in("id", ids).eq("step", "reading").eq("kind", "mcq").eq("listening_only", false)),
    fetchAll((from, to) => db.from("attempt")
      .select("id, session_id, exercise_ref, correct, client_event_id")
      .eq("user_id", userId).eq("language", language).eq("step", "reading").eq("exercise_kind", "mcq")
      .gte("received_at", new Date(Date.parse(fromDay) - 86_400_000).toISOString()).lte("received_at", through)
      .order("id").range(from, to), MAX_ATTEMPTS),
    Promise.all(chunks([...rewardDays.keys()]).map(async (ids) =>
      unwrapRows(await db.from("review_log").select("id, card_id, client_event_id")
        .eq("user_id", userId).eq("origin", "fsrs").eq("mode", "production").gte("rating", 3)
        .gte("elapsed_days", 1).lte("created_at", through).in("id", ids)),
    )).then((pages) => pages.flat()),
  ]);
  const cards = await inChunks(reviews.map((review) => review.card_id), (ids) => db.from("card")
    .select("id, front, context, stability, payload").eq("user_id", userId).eq("language", language)
    .eq("kind", "word").eq("source", "reader").is("deleted_at", null).in("id", ids));
  return { sessions, items, attempts, reviews, cards, rewardDays };
}

export function readObservationTexts(client: AppClient, language: ProgressPilotLanguage, ids: readonly string[]) {
  return inChunks(ids, (chunk) => appSchema(client).from("text")
    .select("id, body, level_band, new_words").eq("language", language)
    .in("status", ["published", "retired"]).in("id", chunk));
}

type Evidence = Awaited<ReturnType<typeof loadProgressObservation>>;
type Texts = Awaited<ReturnType<typeof readObservationTexts>>;

/** A fixed first lot per band makes repeated attempts and additional preferred texts irrelevant to the threshold. */
export function observeReading({ sessions, items, attempts }: Evidence, texts: Texts) {
  const textsById = new Map(texts.map((text) => [text.id, text]));
  const textByItem = new Map(items.map((item) => [item.id, item.text_id]));
  const answers = new Map<string, Map<string, boolean>>();
  const seenEvents = new Set<string>();
  for (const attempt of [...attempts].sort((a, b) => a.id - b.id)) {
    const { session_id, exercise_ref, correct, client_event_id } = attempt;
    if (!session_id || !exercise_ref || correct === null || seenEvents.has(client_event_id)) continue;
    seenEvents.add(client_event_id);
    const first = answers.get(session_id) ?? new Map<string, boolean>();
    if (!first.has(exercise_ref)) first.set(exercise_ref, correct);
    answers.set(session_id, first);
  }

  const bands = new Map<string, { day: string; passed: boolean }[]>();
  const seenSupports = new Set<string>();
  let shortSessions = 0;
  let incompleteSupports = 0;
  for (const session of [...sessions].sort((a, b) => a.day.localeCompare(b.day) || a.id.localeCompare(b.id))) {
    const text = textsById.get(session.textId);
    const first = answers.get(session.id);
    if (!text || !first) continue;
    const served = [...new Set(session.itemIds)].filter((id) => textByItem.get(id) === text.id);
    if (!served.some((id) => first.has(id))) continue;
    if (served.length < 3) {
      shortSessions++;
      continue;
    }
    // The text table has no family key. Group identical bodies across publication versions.
    const support = text.body.normalize("NFC").replace(/\s+/g, " ").trim();
    if (!support || seenSupports.has(support)) continue;
    seenSupports.add(support);
    if (!served.every((id) => first.has(id))) {
      incompleteSupports++;
      continue;
    }
    const passed = served.filter((id) => first.get(id)).length * 3 >= served.length * 2;
    const band = bands.get(text.level_band) ?? [];
    band.push({ day: session.day, passed });
    bands.set(text.level_band, band);
  }

  return {
    shortSessions,
    incompleteSupports,
    bands: [...bands].sort(([left], [right]) => left.localeCompare(right)).map(([level, supports]) => {
      const lot = supports.slice(0, 5);
      const days = new Set(lot.map((support) => support.day)).size;
      const passed = lot.filter((support) => support.passed).length;
      return { level, supports: supports.length, lotSize: lot.length, passed, days,
        meetsThreshold: lot.length === 5 && days >= 3 && passed >= 4 };
    }),
  };
}

type VocabularyProof = { lemma: string; definition: string; stability: number | null; days: readonly string[] };

/** An ambiguous lemma is withheld, since the corpus has no shared editorial sense identifier yet. */
export function countProvenLemmas(proofs: readonly VocabularyProof[]): number {
  const lemmas = new Map<string, { definitions: Set<string>; days: Set<string>; stable: boolean }>();
  for (const proof of proofs) {
    const evidence = lemmas.get(proof.lemma) ?? { definitions: new Set<string>(), days: new Set<string>(), stable: false };
    evidence.definitions.add(proof.definition);
    for (const day of proof.days) evidence.days.add(day);
    if (proof.stability !== null && proof.stability >= 21 && proof.days.length > 0) evidence.stable = true;
    lemmas.set(proof.lemma, evidence);
  }
  return [...lemmas.values()].filter(({ definitions, days, stable }) => definitions.size === 1 && days.size >= 2 && stable).length;
}
