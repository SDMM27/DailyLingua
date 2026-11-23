import { appSchema, type AppClient } from "./client";
import { fetchAll, unwrap, unwrapRows } from "./query";

export async function listReaderTexts(client: AppClient, languages: string[]) {
  if (languages.length === 0) return [];
  return unwrapRows(await appSchema(client).from("text")
    .select("id, language, title, level_band").eq("status", "published").in("language", languages)
    .order("created_at", { ascending: false }).order("id").limit(50));
}

export async function readReaderText(client: AppClient, id: string) {
  const result = await appSchema(client).from("text")
    .select("id, language, title, level_band, body, new_words, audio_path")
    .eq("status", "published").eq("id", id).maybeSingle();
  return unwrap(result);
}

/** Exact written forms from the learner's RLS-scoped vocabulary, without archived or overdue reviews. */
export async function readReaderVocabulary(client: AppClient, language: string, now: Date): Promise<string[]> {
  const db = appSchema(client);
  const rows = await fetchAll((from, to) => db.from("card").select("front").eq("language", language)
    .eq("kind", "word").is("deleted_at", null)
    .or(`state.eq.known,and(state.eq.review,reps.gte.2,due_at.gt.${now.toISOString()})`)
    .order("id").range(from, to));
  return rows.map(({ front }) => front);
}

/** The service writes only the card assembled from the published text and validated learner. */
export async function saveReaderCard(client: AppClient, card: {
  id: string; userId: string; language: string; front: string; back: string; backLanguage: string;
  context: string; textId: string; from: number;
}) {
  unwrap(await appSchema(client).from("card").upsert({
    id: card.id, user_id: card.userId, language: card.language, kind: "word",
    front: card.front, back: card.back, back_language: card.backLanguage, context: card.context,
    source: "reader", state: "new", due_at: new Date().toISOString(),
    payload: { textId: card.textId, from: card.from },
  }, { onConflict: "id", ignoreDuplicates: true }));
}
