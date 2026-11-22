import { appSchema, type AppClient } from "./client";
import { unwrap, unwrapRows } from "./query";

export async function listReaderTexts(client: AppClient, languages: string[]) {
  if (languages.length === 0) return [];
  return unwrapRows(await appSchema(client).from("text")
    .select("id, language, title, level_band").eq("status", "published").in("language", languages)
    .order("created_at", { ascending: false }).order("id").limit(50));
}

export async function readReaderText(client: AppClient, id: string) {
  return unwrap(await appSchema(client).from("text")
    .select("id, language, title, level_band, body, new_words")
    .eq("status", "published").eq("id", id).maybeSingle());
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
