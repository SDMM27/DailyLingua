import {
  languageCodeSchema, MAX_ANSWER_CHARS, storedWritingFeedbackSchema, type DateKey,
  type LanguageCode, type SessionPacket,
} from "@dailylingua/schemas";
import { z } from "zod";
import { appSchema, type AppClient } from "./client";
import { inChunks, unwrap, unwrapRows } from "./query";

const ERROR_COLUMNS = "id, correction_id, language, prompt, answer, created_day, reworked_day";

const promptSchema = z.strictObject({
  sentence: z.string().min(1).max(1000),
  highlighted: z.string().min(1).max(400),
  explanation: z.string().min(1).max(300),
  explanationLanguage: languageCodeSchema,
  sentenceIndex: z.number().int().nonnegative().nullable(),
  recurring: z.boolean(),
});
const answerSchema = z.strictObject({
  accept: z.array(z.string().min(1).max(MAX_ANSWER_CHARS)).min(1).max(20),
});

type ErrorPrompt = z.infer<typeof promptSchema>;
export interface ErrorOfDayRow extends ErrorPrompt {
  id: string;
  correctionId: string;
  language: LanguageCode;
  createdDay: DateKey;
  reworkedDay: DateKey | null;
  accept: string[];
}

function toErrorRow(row: {
  id: string; correction_id: string; language: string | null; prompt: unknown; answer: unknown;
  created_day: string; reworked_day: string | null;
}): ErrorOfDayRow | null {
  const language = languageCodeSchema.safeParse(row.language);
  const prompt = promptSchema.safeParse(row.prompt);
  const answer = answerSchema.safeParse(row.answer);
  if (!language.success || !prompt.success || !answer.success) return null;
  const at = prompt.data.sentence.indexOf(prompt.data.highlighted);
  if (at < 0 || at !== prompt.data.sentence.lastIndexOf(prompt.data.highlighted)) return null;
  return {
    id: row.id, correctionId: row.correction_id, language: language.data,
    createdDay: row.created_day, reworkedDay: row.reworked_day, ...prompt.data, ...answer.data,
  };
}

/** Only a verified rewrite that changed this passage in place can supply a second answer to the gap. */
export function rewritePassage(item: Pick<ErrorOfDayRow, "sentence" | "highlighted">, rewrite: string): string | null {
  const index = item.sentence.indexOf(item.highlighted);
  if (index < 0) return null;
  const prefix = item.sentence.slice(0, index);
  const suffix = item.sentence.slice(index + item.highlighted.length);
  if (!rewrite.startsWith(prefix) || !rewrite.endsWith(suffix) || prefix.length + suffix.length >= rewrite.length) return null;
  const passage = rewrite.slice(prefix.length, rewrite.length - suffix.length).trim();
  return passage.length > 0 && passage.length <= MAX_ANSWER_CHARS && passage !== item.highlighted ? passage : null;
}

async function withRewriteVariants(client: AppClient, userId: string, items: ErrorOfDayRow[]): Promise<ErrorOfDayRow[]> {
  const correctionIds = items.filter((item) => item.sentenceIndex !== null).map((item) => item.correctionId);
  const rewrites = await inChunks(correctionIds, (ids) => appSchema(client).from("rewrite")
    .select("correction_id, sentence_index, text").eq("user_id", userId).eq("accepted", true)
    .in("correction_id", ids).order("created_at", { ascending: false }).order("id", { ascending: false }));
  return items.map((item) => {
    if (item.sentenceIndex === null) return item;
    const answers = new Set(item.accept);
    for (const rewrite of rewrites) {
      if (answers.size >= 20) break;
      if (rewrite.correction_id !== item.correctionId || rewrite.sentence_index !== item.sentenceIndex) continue;
      const passage = rewritePassage(item, rewrite.text);
      if (passage) answers.add(passage);
    }
    return { ...item, accept: [...answers] };
  });
}

export async function readErrorOfDayRows(
  client: AppClient, userId: string, refs: { itemIds: readonly string[]; correctionIds?: readonly string[] },
): Promise<ErrorOfDayRow[]> {
  const db = appSchema(client);
  const [byId, byCorrection] = await Promise.all([
    inChunks(refs.itemIds, (ids) => db.from("error_item").select(ERROR_COLUMNS).eq("user_id", userId).in("id", ids)),
    inChunks(refs.correctionIds ?? [], (ids) => db.from("error_item").select(ERROR_COLUMNS).eq("user_id", userId).in("correction_id", ids)),
  ]);
  const items = [...new Map([...byId, ...byCorrection].map((row) => [row.id, row])).values()]
    .flatMap((row) => toErrorRow(row) ?? []);
  return withRewriteVariants(client, userId, items);
}

export async function readPendingErrorOfDay(
  client: AppClient, userId: string, language: string, from: DateKey, before: DateKey,
): Promise<ErrorOfDayRow | null> {
  const rows = unwrapRows(await appSchema(client).from("error_item").select(ERROR_COLUMNS)
    .eq("user_id", userId).eq("language", language).is("reworked_day", null)
    .gte("created_day", from).lt("created_day", before).order("created_day", { ascending: false }).limit(7));
  return rows.flatMap((row) => toErrorRow(row) ?? [])[0] ?? null;
}

export async function readErrorHistory(client: AppClient, userId: string, language: string, from: string, before: string, currentId: string) {
  const rows = unwrapRows(await appSchema(client).from("correction")
    .select("created_at, feedback, production!correction_production_fkey!inner(language)")
    .eq("user_id", userId).eq("production.language", language).neq("id", currentId)
    .gte("created_at", from).lte("created_at", before).order("created_at", { ascending: false }).order("id").limit(300));
  return rows.flatMap((row) => {
    const parsed = storedWritingFeedbackSchema.safeParse(row.feedback);
    if (!parsed.success || parsed.data.detectedLanguage !== language) return [];
    return [{ createdAt: row.created_at, corrections: parsed.data.feedback.corrections }];
  });
}

export async function saveErrorOfDay(client: AppClient, input: {
  userId: string; correctionId: string; errorRef: string; language: string; day: DateKey; prompt: ErrorPrompt; answer: string;
}): Promise<ErrorOfDayRow | null> {
  const db = appSchema(client);
  const { userId, correctionId, errorRef, language, day, prompt, answer } = input;
  const response = await db.from("error_item").insert({
    user_id: userId, correction_id: correctionId, error_ref: errorRef, language, created_day: day,
    prompt: promptSchema.parse(prompt), answer: answerSchema.parse({ accept: [answer] }),
  }).select(ERROR_COLUMNS).single();
  if (response.error?.code === "23505") {
    // A retry can run on a new learning day. Return only the original item of this correction.
    return (await readErrorOfDayRows(client, userId, { itemIds: [], correctionIds: [correctionId] }))[0] ?? null;
  }
  const inserted = unwrap(response);
  return inserted && toErrorRow(inserted);
}

export function toPacketError(item: ErrorOfDayRow): NonNullable<SessionPacket["errorOfTheDay"]> {
  return {
    itemId: item.id, correctionId: item.correctionId, sentence: item.sentence, highlighted: item.highlighted,
    explanation: item.explanation, explanationLanguage: item.explanationLanguage, accept: item.accept,
  };
}
