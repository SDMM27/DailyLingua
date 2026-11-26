import { oralSentences } from "@dailylingua/content";
import { getRecentOralAttempts, getUnitProgress, listSkillEstimates } from "@dailylingua/data";
import { unitDraftsAllowed } from "@/lib/ingest/ingest-events";
import { explanationLanguageOf } from "@/lib/ingest/build-state";
import { getRequestClient, getSessionProfile } from "@/lib/session";
import { visibleUnitsFor } from "@/lib/units/visibility";
import { currentUnitIdOf, isAtLeastA2, lastAttemptBySentence, selectOralSentences, toPacketSentence, type OralPacket } from "./select-oral";

/** Days of oral attempts that decide which sentence was worked on least recently. */
const RECENT_DAYS = 30;

/**
 * The packet of the oral workshop of a learner in a language (`j5-pr1-atelier-oral.md` §5): 6 sentences to say and 3 to
 * dictate, chosen on the server from what the learner has opened and worked on, or null when the language has no
 * sentence (no workshop). Reads with the learner's own client (RLS); the choice itself is `selectOralSentences`.
 */
export async function buildOralPacket(userId: string, language: string, now: Date = new Date()): Promise<OralPacket | null> {
  const sentences = oralSentences(language, { includeDrafts: unitDraftsAllowed() });
  if (sentences.length === 0) return null;
  const client = await getRequestClient();
  const [profile, progress, estimates, attempts] = await Promise.all([
    getSessionProfile(),
    getUnitProgress(client, userId, language),
    listSkillEstimates(client, language).catch(() => []),
    getRecentOralAttempts(client, userId, language, RECENT_DAYS, now),
  ]);
  const chosen = selectOralSentences({
    sentences,
    startedUnitIds: progress.map((row) => row.unitId),
    currentUnitId: currentUnitIdOf(visibleUnitsFor(language).map((unit) => unit.id), new Set(progress.filter((row) => row.passedAt !== null).map((row) => row.unitId))),
    atLeastA2: isAtLeastA2(estimates),
    lastAttemptAt: lastAttemptBySentence(attempts),
  });
  if (chosen.sentences.length === 0) return null;
  const locale = explanationLanguageOf(profile?.nativeLanguage);
  return {
    language,
    sentences: chosen.sentences.map((sentence) => toPacketSentence(sentence, locale)),
    dictation: chosen.dictation.map((sentence) => toPacketSentence(sentence, locale)),
  };
}
