import "server-only";

import { addDays, chooseErrorOfDay, learningDay, localTime, normalizeAnswer, RECURRING_ERROR_DAYS } from "@dailylingua/core";
import { readErrorHistory, readErrorOfDayRows, saveErrorOfDay, toPacketError, type AppClient, type CorrectionRow } from "@dailylingua/data";
import { languageCodeSchema, MAX_ANSWER_CHARS, type SessionPacket } from "@dailylingua/schemas";

export async function recordErrorOfTheDay(client: AppClient, input: {
  userId: string;
  correction: CorrectionRow;
  context: { text: string; language: string; timeZone: string };
}): Promise<SessionPacket["errorOfTheDay"]> {
  const { userId, correction, context: { text, language, timeZone } } = input;
  const { stored } = correction;
  if (stored.detectedLanguage !== language || stored.feedback.corrections.length === 0) return null;
  const locale = languageCodeSchema.safeParse(correction.explanationLanguage);
  if (!locale.success) return null;
  const recorded = (await readErrorOfDayRows(client, userId, { itemIds: [], correctionIds: [correction.id] }))[0];
  if (recorded) return toPacketError(recorded);

  const segments = Array.from(new Intl.Segmenter(language, { granularity: "sentence" }).segment(text), ({ segment }) => segment.trim());
  const candidates = stored.feedback.corrections.flatMap((error, rank) => {
    const correctedNormalized = normalizeAnswer(language, error.corrected);
    if (!correctedNormalized || correctedNormalized === normalizeAnswer(language, error.original) || error.corrected.length > MAX_ANSWER_CHARS) return [];
    const matching = segments.filter((segment) => segment.includes(error.original));
    const sentence = matching[0];
    if (matching.length !== 1 || !sentence || sentence.length > 1000 || sentence.indexOf(error.original) !== sentence.lastIndexOf(error.original)) return [];
    const index = stored.sentences.findIndex((item) => item.text === sentence && item.errors.some((known) =>
      known.original === error.original && known.corrected === error.corrected && known.category === error.category));
    const storedError = index >= 0 ? stored.sentences[index]?.errors.find((known) =>
      known.original === error.original && known.corrected === error.corrected && known.category === error.category) : null;
    return [{
      id: storedError?.id ?? `feedback-${rank}`, category: error.category, correctedNormalized,
      sentence, sentenceIndex: index < 0 ? null : index, error,
    }];
  });
  if (candidates.length === 0) return null;
  const day = learningDay(new Date(correction.createdAt), timeZone);
  const from = localTime(addDays(day, -RECURRING_ERROR_DAYS), "04:00", timeZone).toISOString();
  const history = await readErrorHistory(client, userId, language, from, correction.createdAt, correction.id);
  const seen = history.flatMap((past) => past.corrections.map((error) => ({
    day: learningDay(new Date(past.createdAt), timeZone),
    category: error.category,
    correctedNormalized: normalizeAnswer(language, error.corrected),
  })));
  const picked = chooseErrorOfDay(candidates, seen, day);
  const candidate = candidates.find((entry) => entry.id === picked?.id);
  if (!candidate) return null;
  const recurring = seen.some((error) => error.category === candidate.category && error.correctedNormalized === candidate.correctedNormalized);
  const saved = await saveErrorOfDay(client, {
    userId, correctionId: correction.id, errorRef: candidate.id, language, day, answer: candidate.error.corrected,
    prompt: {
      sentence: candidate.sentence, highlighted: candidate.error.original, explanation: candidate.error.explanation,
      explanationLanguage: locale.data, sentenceIndex: candidate.sentenceIndex, recurring,
    },
  });
  return saved ? toPacketError(saved) : null;
}
